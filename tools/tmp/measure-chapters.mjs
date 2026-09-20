import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9100 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'mc' + port)}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' })
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
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)
await js("document.getElementById('openCase').click(); 1"); await sleep(4500)
console.log(await js(`JSON.stringify((() => {
  const out = {}
  for (const id of ['case-problem','case-machine','case-phone','case-motion','case-ds','case-system','case-notes','case-ai']) {
    const el = document.getElementById(id)
    if (!el) { out[id] = null; continue }
    const words = (el.innerText || '').trim().split(/\s+/).filter(Boolean).length
    out[id] = { h: Math.round(el.getBoundingClientRect().height), vh: +(el.getBoundingClientRect().height / innerHeight).toFixed(2), words }
  }
  const sc = document.getElementById('caseScroll')
  out._total = { h: sc.scrollHeight, vh: +(sc.scrollHeight / innerHeight).toFixed(1) }
  return out
})())`, null, 1))
ws.close(); chrome.kill()
