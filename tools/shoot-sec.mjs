// Render every design of one psec section (the machine screens and the phone pages), cropped to the section.
// node tools/shoot-sec.mjs <machine|phone> <page> <sec> [outDir] [light]
// Needs the showcase server on http://localhost:5770.
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const [surface, page, sec] = process.argv.slice(2)
if (!sec) { console.error('usage: node tools/shoot-sec.mjs <machine|phone> <page> <sec> [outDir] [light]'); process.exit(1) }
const outDir = process.argv[5] || join('build', 'secs', `${surface}-${page}-${sec}`)
const look = process.argv[6] === 'light' ? 'light' : 'dark'
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const port = 9800 + Math.floor(Math.random() * 1000)
const profile = join(tmpdir(), 'shoot-sec-' + port)
await mkdir(outDir, { recursive: true })
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=1440,1200', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let target
for (let i = 0; i < 80 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page') } catch { await sleep(150) } }
if (!target) { chrome.kill(); throw new Error('Chrome did not start') }
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pending = new Map(); const errors = []
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)
})
const send = (method, params = {}) => new Promise((r) => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })) })
const js = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description); return r.result?.result?.value }

await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
await send('Page.navigate', { url: 'http://localhost:5770/' })
await sleep(2600)
await js(`localStorage.clear(); document.getElementById('loader').classList.add('is-done'); document.querySelector('.topbar').style.visibility = 'hidden'; 1`)
if (surface === 'machine') await js(`window.showcase.mode('machine'); window.showcase.appearance('${look}'); window.showcase.zoom(64); window.showcase.mscreen('${page}'); 1`)
else await js(`window.showcase.mode('mobile'); window.showcase.appearance('${look}'); window.punchApp.go('${page}'); 1`)
await sleep(1400)
const names = await js(`window.showcase.sections('${surface}', '${page}').find(s => s.key === '${sec}').names`)
console.log(`${surface}/${page}/${sec}: ${names.join(', ')}`)

const probe = `(() => {
  const root = ${surface === 'machine' ? `document.querySelector('.mscreen[data-mscreen="${page}"]')` : `document.querySelector('.m-page[data-page="${page}"]')`}
  const el = root.querySelector('[data-sec="${sec}"]')
  const b = el.getBoundingClientRect()
  return { clip: { x: Math.max(0, b.left - 24), y: b.top + scrollY - 24, width: Math.min(1440, b.width + 48), height: b.height + 48 } }
})()`

for (let i = 0; i < names.length; i++) {
  await js(`window.showcase.sec('${surface}', '${page}', '${sec}', ${i}); 1`)
  await sleep(600)
  await js(`(() => { const r = ${surface === 'machine' ? `document.querySelector('.mscreen[data-mscreen="${page}"]')` : `document.querySelector('.m-page[data-page="${page}"]')`}; const e = r.querySelector('[data-sec="${sec}"]'); e.scrollIntoView({ block: 'center', behavior: 'instant' }); return 1 })()`)
  await sleep(400)
  const { clip } = await js(probe)
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 }, captureBeyondViewport: true })
  const file = join(outDir, `${String.fromCharCode(97 + i)}-${names[i].replace(/\W+/g, '-').toLowerCase()}.png`)
  await writeFile(file, Buffer.from(shot.result.data, 'base64'))
  console.log(' ', names[i], Math.round(clip.width) + 'x' + Math.round(clip.height))
}
if (errors.length) console.log('page errors:', errors.slice(0, 4))
console.log('screenshots in', outDir)
ws.close(); chrome.kill()
