import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => {
  const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) return 'THREW: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text)
  return r.result?.result?.value
}
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

const KEY = await js(`Object.keys(localStorage).join(',')`)
const probe = `JSON.stringify({
  mode: document.body.dataset.mode,
  dsHidden: document.getElementById('dsStage') ? document.getElementById('dsStage').hidden : 'no-el',
  dsVisible: (()=>{const e=document.getElementById('dsStage'); if(!e) return 'no-el'; const b=e.getBoundingClientRect(); return Math.round(b.width)+'x'+Math.round(b.height)})(),
  phoneStageHidden: document.querySelector('.phone-stage').hidden,
  pressed: [...document.querySelectorAll('.mode')].map(b=>b.dataset.mode+'='+b.getAttribute('aria-pressed')).join(' '),
  customSub: document.getElementById('customSub').textContent.slice(0,40),
  saved: (()=>{try{return JSON.parse(localStorage.getItem(Object.keys(localStorage)[0])||'{}').mode}catch{return 'err'}})()
})`
const out = []
const step = async (label, expr) => { const r = await js(expr + '; 1'); await sleep(1800); out.push({ label, threw: r !== 1 ? r : null, ...JSON.parse(await js(probe)) }) }

out.push({ label: 'initial (no storage)', ...JSON.parse(await js(probe)) })
await step(`showcase.mode('system')`, `window.showcase.mode('system')`)
await step(`showcase.mode('ds')  <-- the claim`, `window.showcase.mode('ds')`)
await step(`click the Design system BUTTON`, `document.querySelector('.mode[data-mode="system"]').click()`)
await step(`showcase.mode('') from system`, `window.showcase.mode('')`)
await step(`back to machine via button`, `document.querySelector('.mode[data-mode="machine"]').click()`)
await step(`showcase.mode('ds') while on machine`, `window.showcase.mode('ds')`)
await step(`showcase.mode(undefined)`, `window.showcase.mode()`)
await step(`showcase.mode('SYSTEM') (case)`, `window.showcase.mode('SYSTEM')`)
console.log('storageKey =', KEY)
console.log(out.map(o => `${String(o.label).padEnd(38)} body=${String(o.mode).padEnd(10)} dsHidden=${String(o.dsHidden).padEnd(6)} dsBox=${String(o.dsVisible).padEnd(12)} phoneHidden=${String(o.phoneStageHidden).padEnd(6)} saved=${o.saved} | ${o.pressed}`).join('\n'))
console.log('errors:', errs.slice(0, 5))
ws.close(); chrome.kill()
