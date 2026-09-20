import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9820 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'hf' + port)}`, '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' })
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
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js("window.showcase.mode('machine'); 1"); await sleep(1200)
if (process.argv[2]) { await js("document.getElementById('openCustom').click(); 1"); await sleep(600); await js(`document.querySelector('.face-tile[data-typeface="${process.argv[2]}"]').click(); 1`); await sleep(800); await js("document.getElementById('closeCustom').click(); 1"); await sleep(400) }
await js("window.showcase.mscreen('default'); 1"); await sleep(2500)
console.log(await js(`JSON.stringify((() => {
  const scr = document.querySelector('.mscreen[data-mscreen="default"]'); const k = 3840 / scr.getBoundingClientRect().height; const top = scr.getBoundingClientRect().top
  const g = (sel) => { const el = scr.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round((r.top - top) * k), bottom: Math.round((r.bottom - top) * k), h: Math.round(r.height * k) } }
  const cs = getComputedStyle(scr.querySelector('.mdf'))
  const lis = [...scr.querySelectorAll('.mdf-hw-cards li')].map((li) => { const r = li.getBoundingClientRect(); const b = li.querySelector('b'), sm = li.querySelector('span, small, p'); return { bottom: Math.round((r.bottom - top) * k), h: Math.round(r.height * k), scrollH: Math.round(li.scrollHeight * k), bSize: b && getComputedStyle(b).fontSize, smSize: sm && getComputedStyle(sm).fontSize, smTag: sm && sm.tagName } })
  return { lis, cards: g('.mdf-how [data-sv]:not([hidden])'), cardList: g('.mdf-hw-cards'), how: g('.mdf-how'), best: g('.mdf-best'), welcome: g('.mdf-welcome'), topad: g('.mdf-topad'), strip: g('.ms-ad'), header: g('.ms-brand'), padBottom: cs.paddingBottom, gap: cs.gap, adH: getComputedStyle(scr).getPropertyValue('--ms-ad-h') }
})())`, null, 1))
ws.close(); chrome.kill()
