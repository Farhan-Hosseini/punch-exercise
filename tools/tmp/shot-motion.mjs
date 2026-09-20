// node tools/tmp/shot-screen.mjs <mscreen> <out.png> [setup js]
import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const [screen, out, setup] = process.argv.slice(2)
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'shot' + port)}`, '--window-size=1200,2600', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 80 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pending = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } })
const send = (method, params = {}) => new Promise((r) => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 2600, deviceScaleFactor: 1, mobile: false })

await send('Page.navigate', { url: 'http://localhost:5770/' })
await sleep(2600)
await js(`localStorage.clear(); document.getElementById('loader').classList.add('is-done'); document.querySelector('.topbar').style.visibility='hidden'; 1`)
await js(`window.showcase.mode('machine'); window.showcase.mscreen('${screen}'); window.showcase.zoom(58); 1`)
if (setup) await js(setup)
await sleep(1600)
const clip = await js(`(() => { const m = document.querySelector('.mscreen[data-mscreen="${screen}"]'); const b = m.getBoundingClientRect(); return { x: Math.max(0, b.left), y: b.top + scrollY, width: b.width, height: b.height, scale: 1 } })()`)
const shot = await send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: true })
await writeFile(out, Buffer.from(shot.result.data, 'base64'))
console.log('wrote', out, Math.round(clip.width) + 'x' + Math.round(clip.height))
ws.close(); chrome.kill()
