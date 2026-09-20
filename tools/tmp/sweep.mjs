// one-off: open every tab and every page of the showcase and report console errors and failed requests.
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sweep' + port)}`, '--window-size=1440,1100', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 80 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pending = new Map(); const errs = []; const failed = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  if (m.method === 'Runtime.exceptionThrown') errs.push('EXCEPTION ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text))
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push('console.error ' + m.params.args.map((a) => a.value ?? a.description).join(' '))
  if (m.method === 'Network.loadingFailed') failed.push(m.params.errorText)
  if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) failed.push(m.params.response.status + ' ' + m.params.response.url)
})
const send = (method, params = {}) => new Promise((r) => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' })
await sleep(4000)
await js(`localStorage.clear(); 1`)
await send('Page.navigate', { url: 'http://localhost:5770/' })
await sleep(4500)

const pages = await js(`window.punchApp ? [...document.querySelectorAll('.pagebar [data-page]')].map(b => b.dataset.page) : []`)
const screens = await js(`[...document.querySelectorAll('.mpagebar [data-mscreen]')].map(b => b.dataset.mscreen)`)
console.log('phone pages', pages.join(','))
console.log('machine screens', screens.join(','))
for (const p of pages) { await js(`window.showcase.mode('mobile'); window.punchApp.go('${p}'); 1`); await sleep(900) }
for (const s of screens) { await js(`window.showcase.mode('machine'); window.showcase.mscreen('${s}'); 1`); await sleep(900) }
for (const m of ['animation', 'system']) { await js(`window.showcase.mode('${m}'); 1`); await sleep(1800) }
await js(`document.getElementById('openCase')?.click(); 1`); await sleep(2500)
await js(`document.querySelector('.case-close, [data-close-case]')?.click(); 1`); await sleep(800)
await js(`document.getElementById('openBrief')?.click(); 1`); await sleep(2000)
console.log('errors', errs.length)
for (const e of [...new Set(errs)].slice(0, 20)) console.log('  ' + e)
console.log('failed requests', failed.length)
for (const f of [...new Set(failed)].slice(0, 20)) console.log('  ' + f)
ws.close(); chrome.kill()
