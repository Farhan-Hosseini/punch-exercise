import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9400 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'se' + port)}`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return { __err: r.result.exceptionDetails.text + ' ' + (r.result.exceptionDetails.exception?.description||'') }; return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })

const MEASURE = `(() => {
  const res = performance.getEntriesByType('resource')
  const tot = res.reduce((a,r)=>a+(r.transferSize||0),0)
  const dec = res.reduce((a,r)=>a+(r.decodedBodySize||0),0)
  const cached = res.filter(r=>(r.transferSize||0)===0 && (r.decodedBodySize||0)>0)
  const big = res.map(r=>({u:r.name.split('/').slice(-1)[0].split('?')[0], t:Math.round((r.transferSize||0)/1024), d:Math.round((r.decodedBodySize||0)/1024)})).sort((a,b)=>b.t-a.t).slice(0,10)
  return { url: location.href, els: document.querySelectorAll('*').length,
    dsStage: (document.querySelector('#dsStage')?.querySelectorAll('*').length)||0,
    mApp: (document.querySelector('#mApp')?.querySelectorAll('*').length)||0,
    caseEl: (document.querySelector('#case')?.querySelectorAll('*').length)||0,
    scripts: document.querySelectorAll('script[src]').length,
    resources: res.length, transferKB: Math.round(tot/1024), decodedKB: Math.round(dec/1024),
    cachedCount: cached.length, cachedDecodedKB: Math.round(cached.reduce((a,r)=>a+r.decodedBodySize,0)/1024),
    top: big }
})()`

// --- PASS A: cold, direct navigation to the embed url (what the reporter did)
await send('Network.enable'); await send('Network.clearBrowserCache')
await send('Page.navigate', { url: 'http://localhost:5770/?embed=machine' }); await sleep(7000)
const A = await js(`JSON.stringify(${MEASURE})`)
console.log('A cold direct embed:', A)

// --- PASS B: the real flow. cold cache, load the shell, switch to animation, read the IFRAME's own timing
await send('Network.clearBrowserCache')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(2000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(7000)
const parent = await js(`JSON.stringify(${MEASURE})`)
console.log('B parent shell:', parent)
await js(`window.showcase.mode('animation'); 1`); await sleep(8000)
const B = await js(`JSON.stringify((() => { const f = document.getElementById('linkedFrame'); if(!f) return {no:'frame'}; if(!f.contentWindow) return {no:'cw'}; const w=f.contentWindow; const d=w.document; const res=w.performance.getEntriesByType('resource');
  const tot=res.reduce((a,r)=>a+(r.transferSize||0),0); const dec=res.reduce((a,r)=>a+(r.decodedBodySize||0),0);
  const big=res.map(r=>({u:r.name.split('/').slice(-1)[0].split('?')[0],t:Math.round((r.transferSize||0)/1024),d:Math.round((r.decodedBodySize||0)/1024)})).sort((a,b)=>b.t-a.t).slice(0,8);
  return { src:f.getAttribute('src'), els:d.querySelectorAll('*').length, resources:res.length, transferKB:Math.round(tot/1024), decodedKB:Math.round(dec/1024), zeroTransfer:res.filter(r=>(r.transferSize||0)===0&&(r.decodedBodySize||0)>0).length, top:big, nav: Math.round(w.performance.getEntriesByType('navigation')[0]?.transferSize/1024) } })())`)
console.log('B iframe (after parent warmed cache):', B)
const totals = await js(`JSON.stringify((()=>{ const f=document.getElementById('linkedFrame'); const p=performance.getEntriesByType('resource').reduce((a,r)=>a+(r.transferSize||0),0); const i=f&&f.contentWindow?f.contentWindow.performance.getEntriesByType('resource').reduce((a,r)=>a+(r.transferSize||0),0):0; return { parentKB:Math.round(p/1024), iframeKB:Math.round(i/1024) } })())`)
console.log('B totals:', totals)
console.log('errors:', JSON.stringify(errs.slice(0,6)))
ws.close(); chrome.kill()
