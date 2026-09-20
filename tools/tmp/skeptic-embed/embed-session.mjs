import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'ss' + port)}`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
let bytes = 0, reqs = 0
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
  else if (m.method === 'Network.loadingFinished') { bytes += m.params.encodedDataLength || 0; reqs++ }
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(2000)
await js('localStorage.clear(); 1')
await send('Network.clearBrowserCache')
bytes = 0; reqs = 0
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(8000)
const mark = async (label) => {
  const h = await send('Runtime.evaluate', { expression: '1', returnByValue: true })
  const frames = await js(`JSON.stringify([...document.querySelectorAll('iframe')].map(f=>({src:f.getAttribute('src')||'', cls:f.className||f.getAttributeNames().filter(n=>n.startsWith('data-')).join(',')})))`)
  console.log(label, '| net MB', (bytes/1048576).toFixed(2), '| reqs', reqs, '| iframes-with-src', JSON.parse(frames).filter(f=>f.src).length, '| total iframes', JSON.parse(frames).length)
  return JSON.parse(frames)
}
await mark('after shell load        ')
// hover the Animation tab (warm)
await js(`(()=>{const b=[...document.querySelectorAll('button,a')].find(x=>/anim/i.test(x.textContent||'')||/anim/i.test(x.dataset.mode||'')); if(b) b.dispatchEvent(new PointerEvent('pointerenter',{bubbles:true})); return b?b.textContent.trim():'none'})()`).then(v=>console.log('hovered:', v))
await sleep(4000)
await mark('after hovering Animation ')
await js(`window.showcase.mode('animation'); 1`); await sleep(7000)
await mark('after Animation tab      ')
await js(`window.showcase.mode('ds'); 1`); await sleep(3000)
// scroll the whole DS
await js(`(async()=>{const h=document.documentElement.scrollHeight; for(let y=0;y<h;y+=700){scrollTo(0,y); await new Promise(r=>setTimeout(r,120))} scrollTo(0,0); return h})()`)
await sleep(9000)
const dsFrames = await mark('after DS tab scrolled    ')
await js(`(()=>{const b=document.getElementById('openCase'); if(b) b.click(); return !!b})()`)
await sleep(8000)
await js(`(async()=>{const d=document.getElementById('case'); const sc=d.querySelector('.cs-scroll')||d; const h=sc.scrollHeight; for(let y=0;y<h;y+=800){sc.scrollTop=y; await new Promise(r=>setTimeout(r,90))} return h})()`)
await sleep(6000)
const all = await mark('after case study scrolled')
const heap = await js(`JSON.stringify({heapMB: Math.round((performance.memory?.usedJSHeapSize||0)/1048576), els: document.querySelectorAll('*').length, frameEls: [...document.querySelectorAll('iframe')].map(f=>{try{return f.contentDocument?f.contentDocument.querySelectorAll('*').length:0}catch(e){return -1}})})`)
console.log('heap/dom:', heap)
console.log('live frame srcs:', JSON.stringify(all.filter(f=>f.src).map(f=>f.src)))
console.log('errors:', JSON.stringify(errs.slice(0,6)))
ws.close(); chrome.kill()
