import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map(a => a.value || a.description).join(' '))
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)
await js(`window.showcase.mode('mobile'); 1`); await sleep(1200)
const R = {}
// flip to android, reload to confirm persistence, then Reset everything
await js(`document.querySelector('.dev-tile[data-device="android"]').click(); 1`); await sleep(800)
R.a_attr = await js(`document.getElementById('device').dataset.device`)
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)
await js(`window.showcase.mode('mobile'); 1`); await sleep(1200)
R.afterReload_attr = await js(`document.getElementById('device').dataset.device`)
R.afterReload_state = await js(`window.punchApp.state.device`)
// pay flow on android: go to topup and open the wallet sheet, exercise pay.js device()
await js(`window.punchApp.go('topup'); 1`); await sleep(1200)
R.payPage = await js(`window.punchApp.page`)
R.payErrsSoFar = errs.length
// Reset everything
R.resetClicked = await js(`(()=>{const b=document.getElementById('resetCustom'); if(!b) return 'missing'; b.click(); return 'ok'})()`)
await sleep(1600)
R.afterReset_attr = await js(`document.getElementById('device').dataset.device`)
R.afterReset_state = await js(`window.punchApp.state.device`)
R.afterReset_clock = await js(`document.querySelector('[data-clock]').textContent`)
R.afterReset_typeofDevice = await js(`typeof window.punchApp.device`)
console.log(JSON.stringify({ ...R, errors: errs.slice(0, 10) }, null, 1))
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'sk' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
