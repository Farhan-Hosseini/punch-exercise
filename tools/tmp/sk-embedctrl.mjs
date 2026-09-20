import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const OPEN = process.argv[2] === 'open'
const W = 1440, H = 1000
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk' + port)}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return { ERR: r.result.exceptionDetails.exception?.description }; return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable'); await send('Performance.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
const metric = async (n) => { const ms = (await send('Performance.getMetrics')).result.metrics; const m = {}; for (const x of ms) m[x.name] = x.value; return m[n] }
if (OPEN) {
  await js(`document.getElementById('openCase').click(); 1`); await sleep(9000)
  await js(`document.getElementById('closeCase').click(); 1`); await sleep(3000)
}
// count rAF ticks in the TOP page too, same window, both runs
await js(`window.__topRaf = 0; (() => { const o = requestAnimationFrame; window.requestAnimationFrame = (cb) => { window.__topRaf++; return o(cb) } })(); 1`)
const a = await metric('TaskDuration'), sa = await metric('ScriptDuration'), la = await metric('LayoutDuration')
await sleep(8000)
const b = await metric('TaskDuration'), sb = await metric('ScriptDuration'), lb = await metric('LayoutDuration')
const r3 = (x) => Math.round(x * 1000) / 1000
console.log(JSON.stringify({ mode: OPEN ? 'case opened then closed' : 'CONTROL: case never opened',
  taskSec8s: r3(b - a), scriptSec8s: r3(sb - sa), layoutSec8s: r3(lb - la),
  topRaf8s: await js('window.__topRaf'),
  nodes: (await send('Memory.getDOMCounters')).result.nodes }, null, 1))
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'sk' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
