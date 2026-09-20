// Evaluate one expression on the machine's Scan screen and print its value (JSON).
// node tools/tmp/scan-eval.mjs <base64 of a JS expression> [appearance=light]
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const [b64, ...rest] = process.argv.slice(2)
const opt = (k) => (rest.find((r) => r.startsWith(k + '=')) || '').split('=')[1]
const W = 1440
const port = 9740 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'se' + port)}`, `--window-size=${W},1100`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).split('\n')[0]) })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) console.log('exception:', r.result.exceptionDetails.exception?.description); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 1100, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js(`window.showcase.mode('machine'); 1`); await sleep(1800)
await js(`window.showcase.mscreen('scan'); 1`); await sleep(2000)
if (opt('appearance')) { await js(`window.showcase.appearance('${opt('appearance')}'); 1`); await sleep(800) }
const v = await js(Buffer.from(b64, 'base64').toString('utf8'))
console.log(typeof v === 'string' ? v : JSON.stringify(v))
if (errs.length) console.log('errors:', errs.slice(0, 4).join(' | '))
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'se' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
