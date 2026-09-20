import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = Number(process.argv[2] || 1440), SEL = process.argv[3], OUT = process.argv[4], SCALE = Number(process.argv[5] || 0.5)
const port = 9200 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sc' + port)}`, `--window-size=${W},1000`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description?.split('\n')[0]) })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)
await js("document.getElementById('openCase').click(); 1")
await sleep(4000)
console.log('case open:', await js("!document.getElementById('case').hidden"))
// reveal-on-scroll: settle every rise so the still is the section at rest
await js("document.querySelectorAll('[data-rise],[data-scale-in]').forEach(el => el.classList.add('is-in')); 1"); await sleep(1200)
// the case study scrolls inside its own overlay, so the section is brought into a tall viewport and shot as it sits
const H = Number(process.argv[6] || 2000)
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false }); await sleep(1200)
await js(`document.querySelectorAll('[data-rise],[data-scale-in]').forEach(el => el.classList.add('is-in')); document.querySelector('${SEL}').scrollIntoView({ block: 'start' }); 1`); await sleep(1500)
const b = JSON.parse(await js(`JSON.stringify((() => { const el = document.querySelector('${SEL}'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.max(0, Math.round(r.left)), y: Math.max(0, Math.round(r.top)), width: Math.round(r.width), height: Math.round(r.height) } })())`) || 'null')
if (!b) { console.log('selector not found:', SEL, 'errors', errs); ws.close(); chrome.kill(); process.exit(1) }
console.log('box', JSON.stringify(b))
const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: b.x, y: b.y, width: b.width, height: Math.max(1, Math.min(b.height, H - b.y)), scale: SCALE } })
if (!shot.result) { console.log('capture failed:', JSON.stringify(shot).slice(0, 300)); ws.close(); chrome.kill(); process.exit(1) }
await writeFile(OUT, Buffer.from(shot.result.data, 'base64'))
console.log('wrote', OUT, b.width + 'x' + b.height, 'errors', errs.slice(0, 4))
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'sc' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
