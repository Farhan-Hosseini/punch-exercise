import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'rl' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
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
const raw = (e) => send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })
const js = async (e) => {
  const r = await raw(e)
  if (r.result?.exceptionDetails) throw new Error('EVAL FAIL: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text) + '  <<' + e.slice(0, 120) + '>>')
  return r.result?.result?.value
}
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Emulation.setEmulatedMedia', { media: 'screen', features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)

console.log('reducedMotion matches =', await js(`matchMedia('(prefers-reduced-motion: reduce)').matches`))
console.log('document.hidden =', await js('document.hidden'))

const INSTRUMENT = [
  'window.__spy = { on: false, n: 0, tags: {} };',
  'window.__origRAF = window.requestAnimationFrame.bind(window);',
  'window.requestAnimationFrame = function (cb) {',
  '  var s = window.__spy;',
  '  if (s.on) {',
  '    var tag = "?";',
  '    try { throw new Error("t") } catch (err) { var L = String(err.stack||"").split(String.fromCharCode(10)); tag = String(L[2]||L[1]||"").trim().replace(/^at /, "").slice(0,100) }',
  '    s.n++; s.tags[tag] = (s.tags[tag]||0)+1;',
  '  }',
  '  return window.__origRAF(cb);',
  '};',
  'typeof window.__spy',
].join('\n')

async function metrics() {
  const r = await send('Performance.getMetrics')
  const m = {}
  for (const x of r.result.metrics) m[x.name] = x.value
  return m
}
async function cost(label, secs = 12) {
  const a = await metrics(); const wa = Date.now()
  await sleep(secs * 1000)
  const b = await metrics(); const wb = Date.now()
  const wall = (wb - wa) / 1000
  const d = (k) => +(b[k] - a[k]).toFixed(3)
  const vis = await js(`JSON.stringify({ mode: document.body.dataset.mode, mscreen: (document.getElementById('machine')||{dataset:{}}).dataset.mscreen, stageHidden: document.getElementById('stage').hidden })`)
  console.log('\n--- ' + label + ' --- ' + vis)
  console.log('  wall ' + wall.toFixed(1) + 's  Script ' + d('ScriptDuration') + 's  Layout ' + d('LayoutDuration') + 's  Recalc ' + d('RecalcStyleDuration') + 's  Task ' + d('TaskDuration') + 's  => ' + ((d('TaskDuration') / wall) * 100).toFixed(1) + '% of one core')
  console.log('  LayoutCount ' + d('LayoutCount') + '  RecalcStyleCount ' + d('RecalcStyleCount') + '  Nodes ' + d('Nodes') + '  JSEventListeners ' + d('JSEventListeners') + '  JSHeap +' + Math.round(d('JSHeapUsedSize') / 1024) + 'KB')
}
await send('Performance.enable')

await js(`window.showcase.mode('machine'); 1`); await sleep(400)
await js(`window.showcase.mscreen('default', { from: 'bar' }); 1`); await sleep(800)
await js(`window.showcase.mode('mobile'); 1`); await sleep(1500)
await cost('CONTROL: mobile tab, default mscreen (clean)')

await js(`window.showcase.mode('machine'); 1`); await sleep(400)
await js(`window.showcase.mscreen('loading', { from: 'bar' }); 1`); await sleep(1500)
await js(`window.showcase.mode('mobile'); 1`); await sleep(1500)
await cost('LEAKED: mobile tab, loading left running')

await js(`window.showcase.mode('machine'); 1`); await sleep(400)
await js(`window.showcase.mscreen('countdown', { from: 'bar' }); 1`); await sleep(1500)
await js(`window.showcase.mode('mobile'); 1`); await sleep(1500)
await cost('LEAKED: mobile tab, countdown left running')

// long soak on loading: prove it never gives up + check for growth
await js(`window.showcase.mode('machine'); 1`); await sleep(400)
await js(`window.showcase.mscreen('loading', { from: 'bar' }); 1`); await sleep(1500)
await js(`window.showcase.mode('mobile'); 1`); await sleep(1000)
const samples = []
for (let i = 0; i < 6; i++) {
  await sleep(10000)
  samples.push(await js(`(function(){var e=document.querySelector('.mld'); return e.style.getPropertyValue('--p')+'|'+e.dataset.phase+'|'+e.dataset.step+'|'+(document.querySelector('[data-mld-status]')||{textContent:''}).textContent})()`))
}
console.log('\nloading --p|phase|step|status sampled every 10s for 60s while on the Mobile tab:')
samples.forEach((s, i) => console.log('  t+' + ((i + 1) * 10) + 's  ' + s))
await cost('LEAKED: after 60s soak, loading still on mobile tab')

// background the tab: does rAF stop?
await send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 })
console.log('\nerrors:', JSON.stringify(errs.slice(0, 6)))
ws.close(); chrome.kill()
