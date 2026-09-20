import { spawn } from 'node:child_process'
import { writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'rg' + port)}`, '--window-size=1600,900', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const reqs = []; const fails = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Network.responseReceived') reqs.push(`${m.params.response.status} ${m.params.response.url}`)
  else if (m.method === 'Network.loadingFailed') fails.push(m.params.errorText)
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Page.navigate', { url: 'http://localhost:5770/assets/howto/src/wide.html' }); await sleep(5000)
const info = await js(`JSON.stringify({
  title: document.title,
  imgs: [...document.images].map(i => ({ src: i.getAttribute('src'), ok: i.naturalWidth > 0, w: i.naturalWidth })),
  sceneBox: (() => { const s = document.querySelector('.scene'); if (!s) return null; const b = s.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) } })(),
  qrCells: document.querySelectorAll('.pqr-frame *').length,
  nodes: document.querySelectorAll('.scene *').length
})`)
console.log(info)
console.log('FAILS', JSON.stringify(fails))
console.log('REQS', JSON.stringify(reqs, null, 1))
await mkdir('build/skeptic2', { recursive: true })
const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 800, height: 500, scale: 1 } })
await writeFile('build/skeptic2/wide.png', Buffer.from(shot.result.data, 'base64'))
console.log('shot written')
ws.close(); chrome.kill()
