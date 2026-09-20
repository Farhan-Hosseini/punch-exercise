// Drags a slider track with real mouse events (Input.dispatchMouseEvent) and reports where it lands, with a shot
// before and after. node tools/tmp/drag-rail.mjs <page> "<track selector>" <out-prefix> [jsb64=<setup>] [shot=<selector>]
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const [PAGE, SEL, OUT, ...rest] = process.argv.slice(2)
const opt = (k) => (rest.find((r) => r.startsWith(k + '=')) || '').split('=')[1]
const W = 1440
const port = 9750 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'dr' + port)}`, `--window-size=${W},1100`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 300 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description?.split('\n')[0]) })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 1100, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js("window.showcase.mode('mobile'); 1"); await sleep(1800)
await js(`window.punchApp.go('${PAGE}'); 1`); await sleep(1800)
if (opt('jsb64')) { await js(Buffer.from(opt('jsb64'), 'base64').toString('utf8')); await sleep(1500) }
const q = SEL.replace(/'/g, "\\'")
const shotSel = (opt('shot') || SEL).replace(/'/g, "\\'")
async function shoot(name) {
  const b = JSON.parse(await js(`JSON.stringify((() => { const el = document.querySelector('${shotSel}'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.max(0, Math.round(r.left) - 8), y: Math.max(0, Math.round(r.top + scrollY) - 8), width: Math.round(r.width) + 16, height: Math.round(r.height) + 16 } })())`) || 'null')
  if (!b) { console.log('shot target not found:', shotSel); return }
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...b, scale: 2 } })
  if (shot.result) await writeFile(`${OUT}-${name}.png`, Buffer.from(shot.result.data, 'base64'))
}
const state = () => js(`JSON.stringify((() => {
  const tr = document.querySelector('${q}')
  if (!tr) return null
  const padL = parseFloat(getComputedStyle(tr).scrollPaddingLeft) || 0
  const max = tr.scrollWidth - tr.clientWidth
  const edges = [...tr.children].map((c) => Math.min(max, Math.max(0, c.offsetLeft - padL)))
  const at = [...tr.children].findIndex((c) => c.classList.contains('is-at'))
  const cs = getComputedStyle(tr)
  return { scrollLeft: Math.round(tr.scrollLeft), edges, at, snap: cs.scrollSnapType, scrollPadding: cs.scrollPadding, margin: cs.margin, padding: cs.padding, free: tr.classList.contains('is-free'), dragging: tr.classList.contains('is-dragging'), cursor: cs.cursor, slOn: tr.dataset.slOn || null, hasTrack: tr.hasAttribute('data-sl-track') }
})())`)
await js(`document.querySelector('${q}').scrollIntoView({ block: 'center' }); 1`); await sleep(600)
const before = JSON.parse(await state() || 'null')
if (!before) { console.log('track not found:', SEL); ws.close(); chrome.kill(); process.exit(1) }
await shoot('before')
const r = JSON.parse(await js(`JSON.stringify(document.querySelector('${q}').getBoundingClientRect())`))
const x0 = r.left + r.width * 0.7, y = r.top + r.height / 2
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x0, y, button: 'left', clickCount: 1 })
let mid = null
for (let i = 1; i <= 12; i++) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x0 - i * 18, y, button: 'left', buttons: 1 })
  await sleep(16)
  if (i === 6) mid = JSON.parse(await state())
}
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x0 - 12 * 18, y, button: 'left', clickCount: 1 })
await sleep(1400)
const after = JSON.parse(await state())
await shoot('after')
const landed = after.edges.some((e) => Math.abs(e - after.scrollLeft) <= 1)
console.log(JSON.stringify({ before, mid, after, moved: after.scrollLeft !== before.scrollLeft, landedOnCardEdge: landed }, null, 1))
console.log('errors', errs)
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'dr' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
