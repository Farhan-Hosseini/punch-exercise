import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', '--force-prefers-reduced-motion=no-preference', '--js-flags=--expose-gc', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
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
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => {
  const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400))
  return r.result?.result?.value
}
await send('Runtime.enable'); await send('Page.enable'); await send('DOM.enable'); await send('DOMDebugger.enable'); await send('HeapProfiler.enable'); await send('Performance.enable')

await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

await js(`window.showcase.mode('mobile'); 1`); await sleep(2500)

// instrument: count punchSlider calls and how many actually built a slider
await js(`(() => {
  window.__sl = { calls: 0, built: 0, live: 0 }
  const orig = window.punchSlider
  window.punchSlider = (el, o) => {
    window.__sl.calls++
    const r = orig(el, o)
    if (r) { window.__sl.built++; window.__sl.live++ }
    return r
  }
  return 1
})()`)

const docNode = (await send('DOM.getDocument', { depth: 0 })).result.root.nodeId
async function listenerCounts() {
  const obj = await send('Runtime.evaluate', { expression: 'document' })
  const oid = obj.result.result.objectId
  const r = await send('DOMDebugger.getEventListeners', { objectId: oid })
  const c = {}
  for (const l of r.result.listeners || []) c[l.type] = (c[l.type] || 0) + 1
  await send('Runtime.releaseObject', { objectId: oid })
  return c
}
async function metrics() {
  await send('HeapProfiler.collectGarbage'); await sleep(400)
  await send('HeapProfiler.collectGarbage'); await sleep(400)
  const m = (await send('Performance.getMetrics')).result.metrics
  const g = (n) => m.find((x) => x.name === n)?.value
  return { nodes: g('Nodes'), listeners: g('JSEventListeners'), docs: g('Documents') }
}

const out = { errors: [] }

// does scan's rail actually qualify for a slider? measure it
await js(`window.punchApp.go('scan'); 1`); await sleep(1200)
out.railGeom = JSON.parse(await js(`JSON.stringify((() => {
  const p = document.querySelector('.m-page[data-page="scan"]')
  const rs = [...p.querySelectorAll('.psr-rail, .hs-rail')]
  return { pageOn: p.classList.contains('is-on'), n: rs.length, rails: rs.map(r => ({ cls: r.className, sw: r.scrollWidth, cw: r.clientWidth, slOn: r.dataset.slOn || null })) }
})())`))
out.sheetRails = JSON.parse(await js(`JSON.stringify([...document.querySelectorAll('#mSheet .hs-rail')].map(r => ({ sw: r.scrollWidth, cw: r.clientWidth, slOn: r.dataset.slOn || null, vis: !!r.offsetParent })))`))
out.slAfterFirstScan = JSON.parse(await js('JSON.stringify(window.__sl)'))
await js(`window.punchApp.go('default'); 1`); await sleep(900)

const base = { listeners: await listenerCounts(), metrics: await metrics(), sl: JSON.parse(await js('JSON.stringify(window.__sl)')) }
out.baseline = base

const N = Number(process.argv[2] || 10)
for (let i = 0; i < N; i++) {
  await js(`window.punchApp.go('scan'); 1`); await sleep(450)
  await js(`window.punchApp.go('default'); 1`); await sleep(450)
}
await sleep(1500)
const after = { listeners: await listenerCounts(), metrics: await metrics(), sl: JSON.parse(await js('JSON.stringify(window.__sl)')) }
out.afterNTrips = { N, ...after }
out.delta = {
  visibilitychange: (after.listeners.visibilitychange || 0) - (base.listeners.visibilitychange || 0),
  nodes: after.metrics.nodes - base.metrics.nodes,
  jsListeners: after.metrics.listeners - base.metrics.listeners,
  sliderCalls: after.sl.calls - base.sl.calls,
  slidersBuilt: after.sl.built - base.sl.built,
}

// control: the same number of round trips to a page that is NOT scan
await js(`window.punchApp.go('feed'); window.punchApp.go('default'); 1`); await sleep(1200)
const cb = { listeners: await listenerCounts(), metrics: await metrics() }
for (let i = 0; i < N; i++) {
  await js(`window.punchApp.go('feed'); 1`); await sleep(450)
  await js(`window.punchApp.go('default'); 1`); await sleep(450)
}
await sleep(1500)
const ca = { listeners: await listenerCounts(), metrics: await metrics() }
out.controlFeed = { visibilitychange: (ca.listeners.visibilitychange || 0) - (cb.listeners.visibilitychange || 0), nodes: ca.metrics.nodes - cb.metrics.nodes, jsListeners: ca.metrics.listeners - cb.metrics.listeners }

// are the dead sliders still reacting? count is-auto/is-held churn is hard; instead count detached rails still holding state
out.detachedRails = await js(`(() => { let n = 0; document.querySelectorAll('[data-sl-on]').forEach(() => n++); return n })()`)
out.errors = errs.slice(0, 10)
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill()
