// renders an SVG file to PNG through headless Chrome, at the SVG's own size times a scale
import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const [src, out, scaleArg] = process.argv.slice(2)
const scale = Number(scaleArg || 0.6)
const svg = await readFile(src, 'utf8')
const vb = /viewBox="([^"]+)"/.exec(svg)[1].split(/\s+/).map(Number)
const W = Math.round(vb[2] * scale), H = Math.round(vb[3] * scale)
const port = 9480 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'rs' + port)}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
const url = process.argv[5] || ('http://localhost:5770/' + src.replace(/^.*showcase[\/]/, ''))
const html = `<!doctype html><html><body style="margin:0;background:#0b0a09"><img src="${url}" style="width:${W}px;height:${H}px;display:block"></body></html>`
await writeFile('showcase/assets/case/_svgtest.html', html)
await send('Page.navigate', { url: 'http://localhost:5770/assets/case/_svgtest.html' }); await sleep(3500)
const shot = await send('Page.captureScreenshot', { format: 'png' })
await writeFile(out, Buffer.from(shot.result.data, 'base64'))
console.log('wrote', out, W + 'x' + H)
ws.close(); chrome.kill()
