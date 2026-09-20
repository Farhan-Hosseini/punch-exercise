// Where the handset's own bezel sits inside #device: the recorder captures #device, and the capture showed a band of
// page above the phone, so this measures the offset to cut.
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'db' + port)}`, '--window-size=1440,1200', 'about:blank'], { stdio: 'ignore' })
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
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
console.log(await js(`JSON.stringify((() => {
  const d = document.getElementById('device'); const dr = d.getBoundingClientRect()
  const row = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { tag: el.tagName, id: el.id, cls: String(el.className).slice(0, 40), top: +(r.top - dr.top).toFixed(1), left: +(r.left - dr.left).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), radius: cs.borderRadius, bg: cs.backgroundColor } }
  return { device: { w: dr.width, h: dr.height, zoom: getComputedStyle(d).zoom }, kids: [...d.children].map(row), grand: [...d.children].flatMap((c) => [...c.children].slice(0, 4).map(row)) }
})())`, null, 1))
ws.close(); chrome.kill()
