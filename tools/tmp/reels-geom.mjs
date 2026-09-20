// the live Reels design on the New record screen, in glass pixels, to repair the Figma variant
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9260 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'rl' + port)}`, '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' })
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
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js("window.showcase.mode('machine'); 1"); await sleep(1800)
await js("document.getElementById('openCustom').click(); 1"); await sleep(800)
await js("document.getElementById('actualMachine').click(); 1"); await sleep(1500)
await js("document.getElementById('closeCustom').click(); 1"); await sleep(500)
await js("window.showcase.mscreen('record'); 1"); await sleep(1500)
await js("window.showcase.sec('machine','record','score',0); 1"); await sleep(1200)
console.log(await js(`JSON.stringify((() => {
  const scr = document.querySelector('.mscreen[data-mscreen="record"]')
  const sec = scr.querySelector('[data-sec="score"]')
  const k = scr.getBoundingClientRect().height / 3840
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); const s = sec.getBoundingClientRect(); return { cls: el.className, x: +((r.left - s.left) / k).toFixed(1), y: +((r.top - s.top) / k).toFixed(1), w: +(r.width / k).toFixed(1), h: +(r.height / k).toFixed(1), overflow: getComputedStyle(el).overflow } }
  const out = { section: box(sec), scale: k }
  for (const sel of ['.rs-kick', '.rs-reelbox', '.rs-facts', '.rs-decs-row']) out[sel] = box(sec.querySelector(sel))
  out.tiles = [...sec.querySelectorAll('.rs-tile')].map(box)
  out.activeDesign = sec.querySelector('[data-sv]:not([hidden])') ? sec.querySelector('[data-sv]:not([hidden])').dataset.sv : null
  return out
})())`, null, 1))
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'rl' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
