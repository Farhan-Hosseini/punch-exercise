import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9070 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sc' + port)}`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' })
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
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js("window.showcase.mode('machine'); 1"); await sleep(2500)
console.log(await js(`JSON.stringify((() => {
  // the Customise panel's own machine screen list, with the labels the visitor sees
  const btns = [...document.querySelectorAll('[data-mscreen], .mscreen, .pagebar [data-screen]')].map(b => ({ key: b.dataset.mscreen || b.dataset.screen, label: b.textContent.trim() }))
  const groups = [...document.querySelectorAll('.pagenav [data-group], .pagebar [data-group]')].map(b => ({ g: b.dataset.group, label: b.textContent.trim() }))
  const secs = {}
  for (const p of window.PSec.pages('machine')) { const k = typeof p === 'string' ? p : p.key; secs[k] = window.showcase.sections('machine', k).map(s => s.label) }
  const phoneSecs = {}
  for (const p of window.PSec.pages('phone')) { const k = typeof p === 'string' ? p : p.key; phoneSecs[k] = window.showcase.sections('phone', k).map(s => s.label) }
  return { screenButtons: btns, groups, machineSections: secs, phoneSections: phoneSecs }
})())`, null, 1))
ws.close(); chrome.kill()
