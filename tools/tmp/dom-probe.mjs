import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9160 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'dp' + port)}`, '--window-size=1600,1100', 'about:blank'], { stdio: 'ignore' })
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
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1100, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js("window.showcase.mode('machine'); window.showcase.mscreen('default'); 1"); await sleep(2500)
console.log(await js(`JSON.stringify((() => {
  const el = document.querySelector('.mscreen[data-mscreen="default"] [data-sec="how"]')
  const chain = []
  let n = el
  while (n && n !== document.body) { const r = n.getBoundingClientRect(); chain.push({ tag: n.tagName, cls: String(n.className).slice(0, 60), id: n.id, w: Math.round(r.width), h: Math.round(r.height) }); n = n.parentElement }
  const cands = ['#screen', '.glass', '.mstage', '.machine-screen', '.mscreens', '.mscreen:not([hidden])'].map(s => { const e = document.querySelector(s); return e ? { sel: s, w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) } : { sel: s, missing: true } })
  return { found: !!el, chain, cands, fit: getComputedStyle(document.documentElement).getPropertyValue('--fit') }
})())`, null, 1))
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'dp' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
