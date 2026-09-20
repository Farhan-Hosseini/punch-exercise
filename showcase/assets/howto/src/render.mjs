// Renders the "How to use the QR code" illustrations from the HTML scenes in this folder.
//   node showcase/assets/howto/src/render.mjs            phones, then every scene
//   node showcase/assets/howto/src/render.mjs phones     only re-capture the phone screens (phone-*.png)
//   node showcase/assets/howto/src/render.mjs scenes     only re-render the scenes from the captured phones
//   node showcase/assets/howto/src/render.mjs scenes step-3   one scene, both looks
// Needs the showcase server on http://localhost:5770 (node tools/serve-showcase.mjs from punch-exercise).
// Scenes are drawn at CSS size (784 x 380, 360 x 360) and captured at device scale 2 on a transparent page, so the
// PNGs are 1568 x 760 and 720 x 720 with clear air around the drawing, like the image they replace.
import { spawn } from 'node:child_process'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, '..')
const BASE = process.env.SHOWCASE || 'http://localhost:5770'
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const [what = 'all', only] = process.argv.slice(2)
const LOOKS = ['dark', 'light']
const SCENES = [
  { name: 'wide', w: 784, h: 380, out: (a) => `howto-wide-${a}.png` },
  { name: 'step-1', w: 360, h: 360, out: (a) => `step-1-${a}.png` },
  { name: 'step-2', w: 360, h: 360, out: (a) => `step-2-${a}.png` },
  { name: 'step-3', w: 360, h: 360, out: (a) => `step-3-${a}.png` },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function browser(W, H) {
  const port = 9800 + Math.floor(Math.random() * 150)
  const profile = join(tmpdir(), 'howto-' + port)
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' })
  let target
  for (let i = 0; i < 80 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page') } catch { await sleep(150) }
  }
  if (!target) { chrome.kill(); throw new Error('no page target') }
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  let id = 0
  const pending = new Map()
  const logs = []
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
    if (m.method === 'Runtime.exceptionThrown') logs.push('EXCEPTION: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text))
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') logs.push('console.error: ' + m.params.args.map((a) => a.value ?? a.description).join(' '))
  })
  const send = (method, params = {}) => new Promise((r) => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })) })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval failed')
    return r.result?.result?.value
  }
  await send('Runtime.enable')
  await send('Page.enable')
  const close = async () => { ws.close(); chrome.kill(); await sleep(300); await rm(profile, { recursive: true, force: true }).catch(() => {}) }
  return { send, evaluate, logs, close }
}
const waitFor = async (b, expr, ms = 15000) => {
  const t = Date.now()
  while (Date.now() - t < ms) { if (await b.evaluate(expr).catch(() => false)) return true; await sleep(100) }
  throw new Error('timed out waiting for ' + expr)
}
const shot = async (b, file, clip) => {
  const r = await b.send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) })
  await writeFile(file, Buffer.from(r.result.data, 'base64'))
  console.log('wrote', file)
}

// 1. The phone: the real Mobile app scan page, its screen only, in each look and in three moments of the scan.
async function phones() {
  const b = await browser(1600, 1000)
  await b.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
  await b.send('Page.navigate', { url: BASE + '/' })
  await waitFor(b, `!!(window.punchApp && window.showcase && document.querySelector('#device .device-screen'))`)
  await sleep(3500) // the loader and the reveal
  for (const a of LOOKS) {
    await b.evaluate(`window.showcase.mode('mobile'); window.showcase.theme('arena'); window.showcase.appearance('${a}'); window.punchApp.go('scan'); 1`)
    await sleep(1200)
    const box = await b.evaluate(`(() => { const r = document.querySelector('#device .device-screen').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height } })()`)
    // scale so the capture is about 2x the phone's native 440 px width
    const clip = { ...box, scale: 880 / box.width }
    await shot(b, join(HERE, `phone-${a}-wait.png`), clip)
    await b.evaluate(`(() => { const e = document.querySelector('#mScanBtn'); const r = e.getBoundingClientRect(); window.__pt = { x: r.x + r.width / 2, y: r.y + r.height / 2 }; return 1 })()`)
    const pt = await b.evaluate('window.__pt')
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await b.send('Input.dispatchMouseEvent', { type, x: pt.x, y: pt.y, button: 'left', clickCount: 1 })
    await sleep(320)
    await shot(b, join(HERE, `phone-${a}-reading.png`), clip)
    await sleep(1000)
    await shot(b, join(HERE, `phone-${a}-found.png`), clip)
    await sleep(2500)
  }
  if (b.logs.length) console.log(b.logs.join('\n'))
  await b.close()
}

// 2. The scenes, each in both looks, on a transparent page.
async function scenes() {
  for (const s of SCENES) {
    if (only && s.name !== only) continue
    for (const a of LOOKS) {
      const b = await browser(s.w, s.h)
      await b.send('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: 2, mobile: false })
      await b.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
      // a still: the tile's scan line rests mid-code instead of catching a random frame
      await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
      await b.send('Page.navigate', { url: `${BASE}/assets/howto/src/${s.name}.html?a=${a}` })
      await waitFor(b, 'window.__howtoReady === true')
      await sleep(250)
      await shot(b, join(OUT, s.out(a)))
      if (b.logs.length) console.log(b.logs.join('\n'))
      await b.close()
    }
  }
}

await mkdir(OUT, { recursive: true })
if (what === 'all' || what === 'phones') await phones()
if (what === 'all' || what === 'scenes') await scenes()
