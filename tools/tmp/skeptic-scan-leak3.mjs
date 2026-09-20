import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk3' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
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
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map(a => a.value || a.description).join(' '))
})
let closed = false
ws.addEventListener('close', () => { closed = true })
const send = (m, p = {}) => new Promise((r, j) => {
  if (closed) return j(new Error('ws closed before ' + m))
  const n = ++id; pend.set(n, r)
  const to = setTimeout(() => { pend.delete(n); j(new Error('timeout ' + m)) }, 20000)
  const wrap = (v) => { clearTimeout(to); r(v) }
  pend.set(n, wrap)
  ws.send(JSON.stringify({ id: n, method: m, params: p }))
})
const js = async (e) => {
  const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) return { __err: JSON.stringify(r.result.exceptionDetails).slice(0, 300) }
  return r.result?.result?.value
}
await send('Runtime.enable'); await send('Page.enable'); await send('DOM.enable'); await send('DOMDebugger.enable'); await send('HeapProfiler.enable'); await send('Performance.enable')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js(`window.showcase.mode('mobile'); 1`); await sleep(2500)

async function listenerCount() {
  const obj = await send('Runtime.evaluate', { expression: 'document' })
  const oid = obj.result.result.objectId
  const r = await send('DOMDebugger.getEventListeners', { objectId: oid })
  const n = (r.result.listeners || []).filter((l) => l.type === 'visibilitychange').length
  await send('Runtime.releaseObject', { objectId: oid })
  return n
}
async function snap() {
  await send('HeapProfiler.collectGarbage'); await sleep(400)
  await send('HeapProfiler.collectGarbage'); await sleep(500)
  const m = (await send('Performance.getMetrics')).result.metrics
  const g = (n) => m.find((x) => x.name === n)?.value
  return { nodes: g('Nodes'), jsListeners: g('JSEventListeners'), heapMB: +(g('JSHeapUsedSize') / 1048576).toFixed(2), vis: await listenerCount() }
}
// cost of one visibilitychange dispatch, median of 21
const cost = () => js(`(() => { const t=[]; for(let i=0;i<21;i++){ const a=performance.now(); document.dispatchEvent(new Event('visibilitychange')); t.push(performance.now()-a) } t.sort((x,y)=>x-y); return +t[10].toFixed(3) })()`)

const out = { series: [] }
try {
out.series.push({ trips: 0, ...(await snap()), visCostMs: await cost() })
for (const chunk of [25, 50, 75]) {
  for (let i = 0; i < chunk; i++) { await js(`window.punchApp.go('scan'); 1`); await sleep(190); await js(`window.punchApp.go('default'); 1`); await sleep(190) }
  await sleep(1200)
  const s = await snap()
  out.series.push({ trips: out.series[out.series.length - 1].trips + chunk, ...s, visCostMs: await cost() })
}
// still working after 150 visits?
await js(`window.punchApp.go('scan'); 1`); await sleep(1000)
out.stillWorks = await js(`(() => { const p=document.querySelector('.m-page[data-page="scan"]'); const r=p.querySelector('.psr-rail'); return JSON.stringify({ cards: p.querySelectorAll('[data-played]').length, railSlOn: r? r.dataset.slOn : null, scanBtn: !!document.getElementById('mScanBtn'), rendered: (p.querySelector('[data-sec="recent"]')||{}).childElementCount }) })()`)
} catch (err) { out.fatal = String(err && err.message || err) }
out.errors = errs.slice(0, 8)
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill()
