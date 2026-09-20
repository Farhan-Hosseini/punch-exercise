// Re-shoot the case study's phone stills: the device screen at 2x, 880 x 1912.
// node tools/tmp/shot-case.mjs [page,page,...]
import { spawn } from 'node:child_process'
import { writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PAGES = (process.argv[2] || 'scan,punch,hit,feed').split(',')
const OUT = 'C:/Claude Database/punch-exercise/showcase/assets/case'
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'case' + port)}`, '--window-size=1440,1200', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 80 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pending = new Map(); const errs = []
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text) })
const send = (method, params = {}) => new Promise((r) => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'prefers-color-scheme', value: 'dark' }] })
await send('Page.navigate', { url: 'http://localhost:5770/' })
await sleep(3000)
await js(`localStorage.clear(); document.getElementById('loader').classList.add('is-done'); window.showcase.mode('mobile'); window.punchApp.credits = 2; 1`)
await sleep(1600)
await mkdir(OUT, { recursive: true })
for (const page of PAGES) {
  await js(`window.punchApp.go('${page}'); 1`)
  await sleep(2200)
  const box = await js(`(() => { const d = document.querySelector('.device-screen'); const r = d.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: Math.round(r.width), height: Math.round(r.height) } })()`)
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { ...box, scale: 2 }, captureBeyondViewport: true })
  const file = join(OUT, `screen-${page}.png`)
  await writeFile(file, Buffer.from(shot.result.data, 'base64'))
  console.log(page, box.width + 'x' + box.height, '->', file)
}
if (errs.length) console.log('errors:', [...new Set(errs)].slice(0, 5))
ws.close(); chrome.kill()
