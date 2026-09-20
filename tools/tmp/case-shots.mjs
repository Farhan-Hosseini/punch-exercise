// The case study's phone stills and the countdown still, taken again from the live app: the shipped ones predate
// the Ice Rink's removal and the spacing pass. node tools/tmp/case-shots.mjs
import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9740 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'cs' + port)}`, '--window-size=1440,1200', 'about:blank'], { stdio: 'ignore' })
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
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js("window.showcase.mode('mobile'); 1"); await sleep(1500)
// the phone at actual size, so one CSS pixel is one point and the shot at 2x is 880 x 1912
await js("document.getElementById('openCustom').click(); 1"); await sleep(600)
await js("document.getElementById('phoneActual').click(); 1"); await sleep(800)
await js("document.getElementById('closeCustom').click(); 1"); await sleep(500)
const rect = async (sel) => JSON.parse(await js(`JSON.stringify((() => { const r = document.querySelector('${sel}').getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height } })())`))
for (const page of ['scan', 'hit', 'feed', 'punch']) {
  await js(`window.punchApp.go('${page}', { player: 'me' }); window.scrollTo(0, 0); 1`); await sleep(2200)
  const r = await rect('#mApp')
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { ...r, scale: 2 }, captureBeyondViewport: true })
  const png = `build/anim/screen-${page}.png`
  await writeFile(png, Buffer.from(shot.result.data, 'base64'))
  execFileSync('python', ['-c', `from PIL import Image; im = Image.open(r'${png}').convert('RGB'); print('${page}', im.size); im.save(r'showcase/assets/case/screen-${page}.webp', 'WEBP', quality=88, method=6)`], { stdio: 'inherit' })
}
// the countdown on the machine at half size: 540 x 1920
await js("window.showcase.mode('machine'); window.showcase.mscreen('countdown'); 1"); await sleep(3000)
const m = await rect('.mscreen[data-mscreen="countdown"]')
const k = 540 / m.width
const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90, clip: { ...m, scale: k }, captureBeyondViewport: true })
await writeFile('showcase/assets/case/glass-countdown.jpg', Buffer.from(shot.result.data, 'base64'))
console.log('countdown', Math.round(m.width * k), 'x', Math.round(m.height * k))
ws.close(); chrome.kill()
