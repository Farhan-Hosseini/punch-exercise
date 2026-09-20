// One screenshot of one selector on one tab, with the page in a chosen state.
// node tools/tmp/shot-tab.mjs <mode> <selector> <out.png> [scale] [mscreen|page=<key>] [face=<typeface>] [width]
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const [mode, SEL, OUT, scaleArg, ...rest] = process.argv.slice(2)
const SCALE = Number(scaleArg || 1)
const opt = (k) => (rest.find((r) => r.startsWith(k + '=')) || '').split('=')[1]
const W = Number(rest.find((r) => /^\d+$/.test(r)) || 1440)
const port = 9660 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'st' + port)}`, `--window-size=${W},1100`, 'about:blank'], { stdio: 'ignore' })
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
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 1100, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js(`window.showcase.mode('${mode}'); 1`); await sleep(1800)
if (opt('face')) {
  await js("document.getElementById('openCustom').click(); 1"); await sleep(600)
  await js(`document.querySelector('.face-tile[data-typeface="${opt('face')}"]').click(); 1`); await sleep(800)
  await js("document.getElementById('closeCustom').click(); 1"); await sleep(500)
}
if (opt('mscreen')) { await js(`window.showcase.mscreen('${opt('mscreen')}'); 1`); await sleep(2500) }
if (opt('page')) { await js(`window.punchApp.go('${opt('page')}'); 1`); await sleep(1800) }
// jsb64=<base64 of an expression> runs it in the page before the shot, for states no route reaches
if (opt('jsb64')) { await js(Buffer.from(opt('jsb64'), 'base64').toString('utf8')); await sleep(Number(opt('wait') || 1500)) }
const b = JSON.parse(await js(`JSON.stringify((() => { const el = document.querySelector('${SEL.replace(/'/g, "\\'")}'); if (!el) return null; el.scrollIntoView({ block: 'start' }); const r = el.getBoundingClientRect(); return { x: Math.max(0, Math.round(r.left) - 8), y: Math.max(0, Math.round(r.top + scrollY) - 8), width: Math.round(r.width) + 16, height: Math.round(r.height) + 16 } })())`) || 'null')
if (!b) { console.log('not found:', SEL); ws.close(); chrome.kill(); process.exit(1) }
await sleep(opt('wait') ? 80 : 600)
const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...b, scale: SCALE } })
if (!shot.result) { console.log('capture failed', JSON.stringify(shot).slice(0, 200)); ws.close(); chrome.kill(); process.exit(1) }
await writeFile(OUT, Buffer.from(shot.result.data, 'base64'))
console.log('wrote', OUT, b.width + 'x' + b.height)
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'st' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
