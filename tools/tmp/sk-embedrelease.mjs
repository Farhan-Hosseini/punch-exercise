import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = 1440, H = 1000
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk' + port)}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return { ERR: r.result.exceptionDetails.text + ' ' + (r.result.exceptionDetails.exception?.description||'') }; return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable'); await send('HeapProfiler.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); sessionStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

async function sample(label) {
  await send('HeapProfiler.collectGarbage'); await sleep(600)
  const dc = (await send('Memory.getDOMCounters')).result
  const heap = await js('performance.memory ? Math.round(performance.memory.usedJSHeapSize/1048576*10)/10 : null')
  const frames = (await send('Page.getFrameTree')).result.frameTree.childFrames?.length || 0
  const info = await js(`JSON.stringify({
    srcs: [...document.querySelectorAll('#case iframe[data-embed]')].map(f=>f.getAttribute('src')),
    docs: [...document.querySelectorAll('#case iframe[data-embed]')].map(f=>{try{return f.contentDocument? f.contentDocument.querySelectorAll('*').length : -1}catch(e){return -2}}),
    caseHidden: document.getElementById('case').hidden,
    caseOpen: document.getElementById('case').classList.contains('is-open'),
    total: document.querySelectorAll('*').length
  })`)
  return { label, nodes: dc.nodes, listeners: dc.jsEventListeners, docs: dc.documents, heapMB: heap, topFrames: frames, ...JSON.parse(info) }
}
const out = []
out.push(await sample('at rest (mobile)'))
await js(`document.getElementById('openCase').click(); 1`); await sleep(9000)
out.push(await sample('case open +9s'))
await js(`document.getElementById('closeCase').click(); 1`); await sleep(3000)
out.push(await sample('after closeCase +3s'))
await sleep(10000)
out.push(await sample('after closeCase +13s'))
console.log(JSON.stringify(out, null, 1))
console.log('ERRORS', JSON.stringify(errs.slice(0,6)))
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'sk' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
