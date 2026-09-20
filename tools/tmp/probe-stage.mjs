import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = Number(process.argv[2] || 1440)
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'ps' + port)}`, `--window-size=${W},1000`, 'about:blank'], { stdio: 'ignore' })
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
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)
await js("window.showcase.mode('animation'); 1"); await sleep(2500)
console.log(await js(`JSON.stringify((() => {
  const r = (s) => { const el = typeof s === 'string' ? document.querySelector(s) : s; if (!el) return null; const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { sel: typeof s === 'string' ? s : el.className, w: Math.round(b.width), l: Math.round(b.left), display: cs.display, maxWidth: cs.maxWidth, padL: cs.paddingLeft, padR: cs.paddingRight } }
  const stage = document.querySelector('.phone-stage')
  const chain = []
  let el = document.getElementById('animExtra')
  while (el && el !== document.documentElement) { chain.push(r(el)); el = el.parentElement }
  return { viewport: innerWidth, stage: r(stage), chain, header: r('.topbar') || r('header') }
})())`, null, 1))
ws.close(); chrome.kill()
