import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk2' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
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
  if (r.result?.exceptionDetails) return { __err: JSON.stringify(r.result.exceptionDetails).slice(0, 300) }
  return r.result?.result?.value
}
await send('Runtime.enable'); await send('Page.enable'); await send('DOM.enable'); await send('DOMDebugger.enable'); await send('HeapProfiler.enable'); await send('Performance.enable')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js(`window.showcase.mode('mobile'); 1`); await sleep(2500)

async function listeners() {
  const obj = await send('Runtime.evaluate', { expression: 'document' })
  const oid = obj.result.result.objectId
  const r = await send('DOMDebugger.getEventListeners', { objectId: oid })
  const c = {}
  for (const l of r.result.listeners || []) c[l.type] = (c[l.type] || 0) + 1
  await send('Runtime.releaseObject', { objectId: oid })
  return c
}
async function snap() {
  await send('HeapProfiler.collectGarbage'); await sleep(400)
  await send('HeapProfiler.collectGarbage'); await sleep(500)
  const m = (await send('Performance.getMetrics')).result.metrics
  const g = (n) => m.find((x) => x.name === n)?.value
  const l = await listeners()
  return { nodes: g('Nodes'), jsListeners: g('JSEventListeners'), heapMB: +(g('JSHeapUsedSize') / 1048576).toFixed(2), vis: l.visibilitychange || 0 }
}
const out = {}

// A) does a design swap in Customise, with Scan ON SCREEN, leak too?
await js(`window.punchApp.go('scan'); 1`); await sleep(1000)
const a0 = await snap()
for (let i = 0; i < 10; i++) { await js(`window.PSec.set('phone','scan','recent', ${i % 5}); 1`); await sleep(280) }
await sleep(800)
const a1 = await snap()
out.A_customiseSwapsOnScan = { before: a0, after: a1, dVis: a1.vis - a0.vis, dNodes: a1.nodes - a0.nodes, dListeners: a1.jsListeners - a0.jsListeners }

// B) does a design swap while Scan is HIDDEN leak? (scrollWidth should be 0 -> no slider)
await js(`window.PSec.set('phone','scan','recent',0); window.punchApp.go('default'); 1`); await sleep(1000)
out.hiddenGeom = await js(`(() => { const p = document.querySelector('.m-page[data-page="scan"]'); const r = p.querySelector('.psr-rail'); return JSON.stringify({ pageOn: p.classList.contains('is-on'), disp: getComputedStyle(p).display, sw: r ? r.scrollWidth : null, cw: r ? r.clientWidth : null }) })()`)
const b0 = await snap()
for (let i = 0; i < 10; i++) { await js(`window.PSec.set('phone','scan','recent', ${i % 5}); 1`); await sleep(280) }
await sleep(800)
const b1 = await snap()
out.B_customiseSwapsOffScan = { dVis: b1.vis - b0.vis, dNodes: b1.nodes - b0.nodes, dListeners: b1.jsListeners - b0.jsListeners }

// C) 40 Scan round trips: how far does it actually go?
await js(`window.PSec.set('phone','scan','recent',0); 1`); await sleep(400)
const c0 = await snap()
for (let i = 0; i < 40; i++) { await js(`window.punchApp.go('scan'); 1`); await sleep(230); await js(`window.punchApp.go('default'); 1`); await sleep(230) }
await sleep(1500)
const c1 = await snap()
out.C_40trips = { before: c0, after: c1, dVis: c1.vis - c0.vis, dNodes: c1.nodes - c0.nodes, dListeners: c1.jsListeners - c0.jsListeners, dHeapMB: +(c1.heapMB - c0.heapMB).toFixed(2) }

// D) do the dead sliders actually run work on visibilitychange? count state() invocations
out.D_probe = await js(`(() => {
  let hits = 0
  const before = document.querySelectorAll('.psr-rail[data-sl-on]').length
  // count how many elements get their is-auto/is-held class touched by a visibilitychange
  const seen = new Set()
  const mo = new MutationObserver((recs) => { recs.forEach(r => { hits++; seen.add(r.target) }) })
  // observe the whole document plus any detached rail we can still reach is impossible; observe document instead
  mo.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class'] })
  document.dispatchEvent(new Event('visibilitychange'))
  const r = { attachedRails: before, classMutationsOnAttached: hits }
  mo.disconnect()
  return JSON.stringify(r)
})()`)

// E) does switching showcase modes away and back leak?
const e0 = await snap()
for (let i = 0; i < 5; i++) { await js(`window.showcase.mode('machine'); 1`); await sleep(700); await js(`window.showcase.mode('mobile'); 1`); await sleep(900) }
await sleep(1200)
const e1 = await snap()
out.E_modeSwitch = { dVis: e1.vis - e0.vis, dNodes: e1.nodes - e0.nodes, dListeners: e1.jsListeners - e0.jsListeners }

out.errors = errs.slice(0, 8)
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill()
