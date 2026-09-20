import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk' + port)}`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).slice(0, 200))
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map(a => a.value || a.description).join(' ').slice(0, 200))
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return { __err: r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text }; return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
// time the glass from src -> load, without the hover warming
const timing = await js(`(async () => {
  const f = document.getElementById('linkedFrame')
  if (f.getAttribute('src')) return { note: 'already warmed', src: f.getAttribute('src') }
  const t0 = performance.now()
  const done = new Promise((r) => f.addEventListener('load', () => r(performance.now() - t0), { once: true }))
  f.setAttribute('src', './?embed=machine')
  const ms = await done
  return { loadMs: Math.round(ms) }
})()`)
await sleep(4000)
const inner = await js(`(() => {
  const w = document.getElementById('linkedFrame').contentWindow
  const d = w.document
  const nav = w.performance.getEntriesByType('navigation')[0] || {}
  const res = w.performance.getEntriesByType('resource')
  const scripts = res.filter((r) => r.initiatorType === 'script' || r.name.indexOf('.js') > 0)
  const sum = (a) => Math.round(a.reduce((s, r) => s + r.duration, 0))
  return {
    globals: { punchApp: typeof w.punchApp, designSystem: typeof w.designSystem, PSec: typeof w.PSec, showcase: typeof w.showcase, PunchFormat: typeof w.PunchFormat },
    embedFlag: d.documentElement.dataset.embed,
    domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
    loadEvent: Math.round(nav.loadEventEnd || 0),
    resources: res.length,
    scriptCount: scripts.length,
    scriptTotalMs: sum(scripts),
    // is the phone / ds machinery actually in the DOM and hidden?
    phoneStage: (() => { const e = d.querySelector('.phone-stage'); if (!e) return null; const c = getComputedStyle(e); const b = e.getBoundingClientRect(); return { display: c.display, visibility: c.visibility, w: Math.round(b.width), h: Math.round(b.height) } })(),
    dsStage: (() => { const e = d.querySelector('.ds-stage'); if (!e) return null; const c = getComputedStyle(e); const b = e.getBoundingClientRect(); return { display: c.display, w: Math.round(b.width), h: Math.round(b.height) } })(),
    mPages: d.querySelectorAll('.m-page').length,
    innerFrames: [...d.querySelectorAll('iframe')].map((f) => f.getAttribute('src') || '(none)'),
    machineVisible: (() => { const e = d.getElementById('machine'); if (!e) return null; const b = e.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) } })(),
    lsKeys: (() => { try { return Object.keys(w.localStorage).length } catch { return 'blocked' } })(),
  }
})()`)
// how long the embedded document's scripts block the main thread, measured inside the frame
const heap = await js(`(async () => { const m = await (performance.measureUserAgentSpecificMemory ? performance.measureUserAgentSpecificMemory() : Promise.resolve(null)); return m ? Math.round(m.bytes/1048576) : (performance.memory ? Math.round(performance.memory.usedJSHeapSize/1048576) : null) })()`)
console.log(JSON.stringify({ timing, inner, heapMB: heap, errors: errs.slice(0, 8) }, null, 1))
ws.close(); chrome.kill()
