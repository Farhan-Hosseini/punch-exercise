// Samples the Arrow logo's width inside the page every 40 ms for one cycle and a half after go('punch'), so the pulse
// is read without a screenshot in the way. node tools/tmp/probe-punch-pulse.mjs
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = 1440
const port = 9750 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'pp' + port)}`, `--window-size=${W},1100`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 1100, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js("window.showcase.mode('mobile'); 1"); await sleep(1800)
const trace = JSON.parse(await js(`new Promise((done) => {
  const p = document.getElementById('mPunch'), f0 = p.querySelector('.pp-bc-fist')
  const ev = []
  for (const k of ['animationstart', 'animationiteration', 'animationend', 'animationcancel']) f0.addEventListener(k, (e) => ev.push({ k, name: e.animationName, at: Math.round(performance.now() - t0) }))
  const t0 = performance.now()
  window.punchApp.go('punch', { flow: true })
  const rows = []
  const iv = setInterval(() => {
    const f = p.querySelector('.pp-bc-fist'), d = p.querySelector('.pp-bc-disc')
    const fr = f.getBoundingClientRect(), dr = d.getBoundingClientRect()
    rows.push({ t: Math.round(performance.now() - t0), w: Math.round(fr.width * 100) / 100, dx: Math.round(((fr.left + fr.width / 2) - (dr.left + dr.width / 2)) * 100) / 100, dy: Math.round(((fr.top + fr.height / 2) - (dr.top + dr.height / 2)) * 100) / 100, same: f === f0, live: p.classList.contains('is-live'), state: p.dataset.state })
  }, 40)
  setTimeout(() => { clearInterval(iv); done(JSON.stringify({ rows, ev })) }, 4300)
})`))
console.log('events', JSON.stringify(trace.ev))
console.log('t(ms)  width  dx  dy  same live state')
for (const r of trace.rows.filter((_, i) => i % 2 === 0)) console.log(String(r.t).padStart(5), String(r.w).padStart(7), String(r.dx).padStart(5), String(r.dy).padStart(5), r.same, r.live, r.state)
const ws_ = trace.rows.map((r) => r.w)
console.log('min', Math.min(...ws_), 'max', Math.max(...ws_), 'ratio', (Math.max(...ws_) / Math.min(...ws_)).toFixed(3), 'centred', trace.rows.every((r) => Math.abs(r.dx) <= 1 && Math.abs(r.dy) <= 1), 'same element', trace.rows.every((r) => r.same))
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'pp' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
