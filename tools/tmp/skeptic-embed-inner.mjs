import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk' + port)}`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' })
const bail = setTimeout(() => { console.log('{"timeout":true}'); try { chrome.kill() } catch {} process.exit(1) }, 150000)
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
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return { __err: String(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text).slice(0, 200) }; return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
const out = {}
// A. the embed as its own top-level document
await send('Page.navigate', { url: 'http://localhost:5770/?embed=machine&follow=0' }); await sleep(6000)
out.embedTop = await js(`JSON.stringify((() => {
  const w = window, d = document
  const res = performance.getEntriesByType('resource')
  const jsres = res.filter((r) => r.name.indexOf('.js') > 0)
  const nav = performance.getEntriesByType('navigation')[0] || {}
  return {
    globals: { punchApp: typeof w.punchApp, designSystem: typeof w.designSystem, PSec: typeof w.PSec, showcase: typeof w.showcase, PunchFormat: typeof w.PunchFormat },
    embedFlag: d.documentElement.dataset.embed,
    jsFiles: jsres.length,
    jsBytes: jsres.reduce((s, r) => s + (r.decodedBodySize || 0), 0),
    jsWallMs: Math.round(jsres.reduce((s, r) => s + r.duration, 0)),
    resources: res.length,
    domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
    loadEnd: Math.round(nav.loadEventEnd || 0),
    mPages: d.querySelectorAll('.m-page').length,
    phoneStage: (() => { const e = d.querySelector('.phone-stage'); if (!e) return null; const c = getComputedStyle(e); const b = e.getBoundingClientRect(); return { display: c.display, vis: c.visibility, w: Math.round(b.width), h: Math.round(b.height) } })(),
    dsStage: (() => { const e = d.querySelector('.ds-stage'); if (!e) return null; const c = getComputedStyle(e); const b = e.getBoundingClientRect(); return { display: c.display, w: Math.round(b.width), h: Math.round(b.height) } })(),
    innerFrames: [...d.querySelectorAll('iframe')].map((f) => f.getAttribute('src') || '(none)'),
    machine: (() => { const e = d.getElementById('machine'); if (!e) return null; const b = e.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) } })(),
    lsKeys: (() => { try { return Object.keys(localStorage) } catch { return 'blocked' } })(),
  }
})())`)
// B. the parent page, glass timed from src to load
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
out.glassLoadMs = await js(`(async () => {
  const f = document.getElementById('linkedFrame')
  if (f.getAttribute('src')) return 'already warmed'
  const t0 = performance.now()
  const p = new Promise((r) => f.addEventListener('load', () => r(Math.round(performance.now() - t0)), { once: true }))
  f.setAttribute('src', './?embed=machine')
  return await p
})()`)
await sleep(3000)
out.parentLsAfterGlass = await js(`JSON.stringify(Object.keys(localStorage))`)
out.errors = errs.slice(0, 8)
console.log(JSON.stringify(out, null, 1))
clearTimeout(bail); ws.close(); chrome.kill(); process.exit(0)
