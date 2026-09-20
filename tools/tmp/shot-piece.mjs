import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = Number(process.argv[2] || 1440), SEL = process.argv[3], OUT = process.argv[4], SCALE = Number(process.argv[5] || 1)
const port = 9800 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sp' + port)}`, `--window-size=${W},1000`, 'about:blank'], { stdio: 'ignore' })
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
await js("window.showcase.mode('animation'); 1"); await sleep(3000)
// the clip is preload=none: load and seek it so the still is the reveal, not a black frame
await js(`(async () => { const v = document.querySelector('${SEL} video'); if (!v) return 0; v.setAttribute('preload','auto'); v.load(); await new Promise(r => { if (v.readyState > 1) return r(); v.addEventListener('loadeddata', r, { once: true }); setTimeout(r, 8000) }); v.currentTime = 9.6; await new Promise(r => { v.addEventListener('seeked', r, { once: true }); setTimeout(r, 4000) }); return v.readyState })()`)
await sleep(800)
const b = JSON.parse(await js(`JSON.stringify((() => { const r = document.querySelector('${SEL}').getBoundingClientRect(); return { x: Math.round(r.left + scrollX) - 12, y: Math.round(r.top + scrollY) - 12, width: Math.round(r.width) + 24, height: Math.round(r.height) + 24 } })())`))
const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...b, scale: SCALE } })
await writeFile(OUT, Buffer.from(shot.result.data, 'base64'))
console.log('wrote', OUT, b.width + 'x' + b.height, '@', SCALE)
ws.close(); chrome.kill()
