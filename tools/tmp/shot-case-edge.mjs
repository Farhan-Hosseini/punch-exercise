// One shot of the seam at a section's top or bottom edge, inside the case study's own scroller.
// node tools/tmp/shot-case-edge.mjs <width> "<selector>" <out.png> <top|bottom> [before px] [after px] [scale]
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = Number(process.argv[2] || 1440), SEL = process.argv[3], OUT = process.argv[4], EDGE = process.argv[5] || 'top'
const BEFORE = Number(process.argv[6] || 500), AFTER = Number(process.argv[7] || 700), SCALE = Number(process.argv[8] || 0.5)
const H = BEFORE + AFTER
const port = 9300 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'se' + port)}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description?.split('\n')[0]) })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)
await js("document.getElementById('openCase').click(); 1"); await sleep(4000)
await js("document.querySelectorAll('[data-rise],[data-scale-in]').forEach(el => el.classList.add('is-in')); 1"); await sleep(1200)
// the edge is put BEFORE px below the top of the scroller, so both neighbours are in the frame
const info = await js(`JSON.stringify((() => { const sc = document.getElementById('caseScroll'), el = document.querySelector('${SEL}'); if (!el) return null; const r = el.getBoundingClientRect(), s = sc.getBoundingClientRect(); const edge = ('${EDGE}' === 'top' ? r.top : r.bottom) - s.top + sc.scrollTop; sc.scrollTo(0, Math.max(0, edge - ${BEFORE})); return { edge: Math.round(edge), scrollTop: sc.scrollTop, scrollerTop: Math.round(s.top) } })())`)
if (!info) { console.log('selector not found:', SEL); ws.close(); chrome.kill(); process.exit(1) }
await sleep(1500)
const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: W, height: H, scale: SCALE } })
if (!shot.result) { console.log('capture failed:', JSON.stringify(shot).slice(0, 300)); ws.close(); chrome.kill(); process.exit(1) }
await writeFile(OUT, Buffer.from(shot.result.data, 'base64'))
console.log('wrote', OUT, info, 'errors', errs.slice(0, 4))
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'se' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)
// the throwaway profile is ~57 MB; left behind, a day of shots fills the disk
await sleep(600); await rm(join(tmpdir(), 'se' + port), { recursive: true, force: true }).catch(() => {})
