// Drive headless Chrome over CDP: open a URL, run steps, save screenshots.
// node tools/shoot.mjs <url> <outDir> <width> <height> <plan.json>
// plan: [{ "wait": ms } | { "eval": "js" } | { "shot": "name", "full": bool }]
import { spawn } from 'node:child_process'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const [url, outDir, W = '1440', H = '900', planFile] = process.argv.slice(2)
const plan = JSON.parse(await readFile(planFile, 'utf8'))
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const port = 9400 + Math.floor(Math.random() * 400)
const profile = join(tmpdir(), 'shoot-' + port)
await mkdir(outDir, { recursive: true })

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${W},${H}`, 'about:blank',
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let target
for (let i = 0; i < 60 && !target; i++) {
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
  if (m.method === 'Runtime.consoleAPICalled') logs.push(m.params.type + ': ' + m.params.args.map((a) => a.value ?? a.description).join(' '))
  if (m.method === 'Runtime.exceptionThrown') logs.push('EXCEPTION: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text))
})
const send = (method, params = {}) => new Promise((r) => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })) })

await send('Runtime.enable')
await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: +W < 600 })
// REDUCED_MOTION=1 renders as a visitor who asked for less motion
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: process.env.REDUCED_MOTION === '1' ? 'reduce' : 'no-preference' }] })
await send('Page.navigate', { url })

for (const step of plan) {
  if (step.wait) await sleep(step.wait)
  if (step.eval) {
    const r = await send('Runtime.evaluate', { expression: step.eval, awaitPromise: true, returnByValue: true })
    const v = r.result?.result?.value
    if (v !== undefined) console.log('eval:', typeof v === 'string' ? v : JSON.stringify(v))
    if (r.result?.exceptionDetails) console.log('eval error:', r.result.exceptionDetails.exception?.description)
  }
  if (step.click) {
    // a real, hit-tested mouse click at the centre of the selector
    const r = await send('Runtime.evaluate', { expression: `(() => { const e = document.querySelector(${JSON.stringify(step.click)}); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } })()`, returnByValue: true })
    const pt = r.result?.result?.value
    if (!pt) console.log('click: no element', step.click)
    else {
      for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: pt.x, y: pt.y, button: 'left', clickCount: 1 })
      console.log('click', step.click)
    }
  }
  if (step.key) {
    for (let i = 0; i < (step.times || 1); i++) {
      const map = { Tab: 9, Enter: 13, Escape: 27, ArrowRight: 39 }
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: step.key, code: step.key, windowsVirtualKeyCode: map[step.key] })
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: step.key, code: step.key, windowsVirtualKeyCode: map[step.key] })
    }
  }
  if (step.shot) {
    const params = { format: 'png' }
    if (step.clip) params.clip = { ...step.clip, scale: step.scale || 1 }
    if (step.full) {
      const m = await send('Page.getLayoutMetrics')
      const cs = m.result.cssContentSize
      params.clip = { x: 0, y: 0, width: cs.width, height: Math.min(cs.height, 16000), scale: step.scale || 1 }
      params.captureBeyondViewport = true
    }
    const r = await send('Page.captureScreenshot', params)
    await writeFile(join(outDir, step.shot + '.png'), Buffer.from(r.result.data, 'base64'))
    console.log('shot', step.shot)
  }
}
if (logs.length) console.log('console:\n  ' + logs.join('\n  '))
ws.close()
chrome.kill()
await sleep(300)
await rm(profile, { recursive: true, force: true }).catch(() => {})
