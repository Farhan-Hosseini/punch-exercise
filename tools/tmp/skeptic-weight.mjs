import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = Number(process.argv[2] || 1600)
const WAIT = Number(process.argv[3] || 8000)
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference','--force-color-profile=srgb',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,`--window-size=${W},1000`,'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
const req = new Map()   // requestId -> {url, type}
const fin = []          // {url, type, bytes}
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (m.method === 'Network.requestWillBeSent') req.set(m.params.requestId, { url: m.params.request.url, type: m.params.type, from: m.params.initiator?.type })
  if (m.method === 'Network.loadingFinished') { const r = req.get(m.params.requestId); if (r) fin.push({ ...r, bytes: m.params.encodedDataLength }) }
  if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; const to = setTimeout(() => { if (pend.has(n)) { pend.delete(n); r({ timeout: true }) } }, 15000); pend.set(n, (v) => { clearTimeout(to); r(v) }); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 1000, deviceScaleFactor: 1, mobile: false })
// warm nav to clear storage, then the real cold load
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js('try{localStorage.clear()}catch(e){}; try{sessionStorage.clear()}catch(e){}; 1')
await send('Network.clearBrowserCache'); await send('Network.setCacheDisabled', { cacheDisabled: true })
req.clear(); fin.length = 0; errs.length = 0
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(WAIT)

const total = fin.reduce((a, b) => a + b.bytes, 0)
const lib = fin.filter((f) => f.url.includes('/assets/photos/lib/'))
const libJpg = lib.filter((f) => /\.jpg(\?|$)/.test(f.url))
const libMan = lib.filter((f) => f.url.includes('manifest.json'))
const byBucket = {}
for (const f of fin) {
  const m = f.url.replace('http://localhost:5770/', '')
  const key = m.startsWith('assets/') ? m.split('/').slice(0, 3).join('/') : (m.split('?')[0] || 'index')
  const b = key.replace(/\/[^/]*\.(jpg|png|mp4|webm|json|woff2?|svg)$/i, '')
  byBucket[b] = (byBucket[b] || 0) + f.bytes
}
const top = Object.entries(byBucket).sort((a, b) => b[1] - a[1]).slice(0, 14)

const state = JSON.parse(await js(`JSON.stringify((()=>{
  const sh = document.documentElement.dataset
  const imgs = [...document.querySelectorAll('img')].filter(i=>i.currentSrc.includes('/photos/lib/'))
  const vh = innerHeight, vw = innerWidth
  return {
    mode: (window.showcase && window.showcase.mode && window.showcase.mode()) || document.body.dataset.mode || 'n/a',
    bodyData: JSON.stringify(document.body.dataset),
    page: (document.querySelector('.m-page.is-on')||{}).dataset && document.querySelector('.m-page.is-on').dataset.page,
    loaderGone: !document.querySelector('.loader, #loader') || !!(document.querySelector('.loader, #loader')||{}).hidden || getComputedStyle(document.querySelector('.loader, #loader')||document.body).opacity,
    imgs: imgs.map(i=>{
      const b=i.getBoundingClientRect()
      const cs=getComputedStyle(i)
      return { src:i.currentSrc.split('/').pop(), nat:i.naturalWidth+'x'+i.naturalHeight, disp:Math.round(b.width)+'x'+Math.round(b.height),
        onscreen: b.width>0&&b.height>0&&b.bottom>0&&b.top<vh&&b.right>0&&b.left<vw, vis: cs.visibility!=='hidden'&&cs.display!=='none', complete:i.complete }
    })
  }
})())`))
console.log(JSON.stringify({
  viewport: W, waitMs: WAIT,
  totalRequests: fin.length, totalBytes: total,
  libJpgCount: libJpg.length, libJpgBytes: libJpg.reduce((a,b)=>a+b.bytes,0),
  manifestCount: libMan.length, manifestBytes: libMan.reduce((a,b)=>a+b.bytes,0),
  libShareOfTotal: (100*(libJpg.reduce((a,b)=>a+b.bytes,0)+libMan.reduce((a,b)=>a+b.bytes,0))/total).toFixed(1)+'%',
  topBuckets: top,
  libFiles: libJpg.map(f=>({ f: f.url.split('/').pop(), bytes: f.bytes })).sort((a,b)=>b.bytes-a.bytes),
  state, errors: errs.slice(0,6)
}, null, 1))
ws.close(); chrome.kill()
