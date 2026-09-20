import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = 1440, H = 1000
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk' + port)}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return { ERR: r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text }; return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable'); await send('HeapProfiler.enable'); await send('Performance.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
const metric = async (n) => { const ms = (await send('Performance.getMetrics')).result.metrics; const m = {}; for (const x of ms) m[x.name] = x.value; return m[n] }
const domc = async () => { await send('HeapProfiler.collectGarbage'); await sleep(500); const d = (await send('Memory.getDOMCounters')).result; return { nodes: d.nodes, listeners: d.jsEventListeners } }

const res = {}
res.rest = await domc()
// open, close, three times over -- is the cost bounded?
for (let i = 1; i <= 3; i++) {
  await js(`document.getElementById('openCase').click(); 1`); await sleep(i === 1 ? 9000 : 2500)
  await js(`document.getElementById('closeCase').click(); 1`); await sleep(2500)
  res['cycle' + i] = await domc()
}
// instrument the two retained embeds while the case is CLOSED
await js(`(() => {
  window.__probe = []
  document.querySelectorAll('#case iframe[data-embed]').forEach((f, i) => {
    const w = f.contentWindow
    const st = { i, raf: 0, to: 0, iv: 0, url: w.location.search, hidden: w.document.hidden, vis: w.document.visibilityState }
    window.__probe.push(st)
    const oraf = w.requestAnimationFrame.bind(w); w.requestAnimationFrame = (cb) => { st.raf++; return oraf(cb) }
    const oto = w.setTimeout.bind(w); w.setTimeout = (cb, d, ...a) => { st.to++; return oto(cb, d, ...a) }
    const oiv = w.setInterval.bind(w); w.setInterval = (cb, d, ...a) => { st.iv++; return oiv(cb, d, ...a) }
  })
  return window.__probe.length
})()`)
const task0 = await metric('TaskDuration')
await sleep(8000)
const task1 = await metric('TaskDuration')
res.whileClosed = { probes: JSON.parse(await js('JSON.stringify(window.__probe)')), taskSecondsOver8s: Math.round((task1 - task0) * 1000) / 1000 }
// control: same 8s with NO case ever opened is measured in a separate run; here also report live timers still armed
res.embedLive = JSON.parse(await js(`JSON.stringify([...document.querySelectorAll('#case iframe[data-embed]')].map(f => ({
  src: f.getAttribute('src'),
  readyClass: f.classList.contains('is-ready'),
  rendered: !!(f.getBoundingClientRect().width || f.getBoundingClientRect().height),
  innerNodes: f.contentDocument ? f.contentDocument.querySelectorAll('*').length : -1,
  innerVideos: f.contentDocument ? f.contentDocument.querySelectorAll('video').length : -1,
  innerPlaying: f.contentDocument ? [...f.contentDocument.querySelectorAll('video')].filter(v=>!v.paused).length : -1
})))`))
res.caseDisplay = await js(`getComputedStyle(document.getElementById('case')).display + ' hidden=' + document.getElementById('case').hidden`)
console.log(JSON.stringify(res, null, 1))
ws.close(); chrome.kill()
