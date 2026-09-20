import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
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
await js(`window.showcase.mode('mobile'); 1`); await sleep(1500)

const R = {}
R.typeofDevice = await js(`typeof window.punchApp.device`)
R.stringHead = await js(`String(window.punchApp.device).slice(0,40)`)
R.stateDevice = await js(`window.punchApp.state.device`)
R.descriptor = await js(`JSON.stringify(Object.keys(Object.getOwnPropertyDescriptor(window.punchApp,'device')))`)
R.getterPresent = await js(`typeof Object.getOwnPropertyDescriptor(window.punchApp,'device').get`)
R.equalsIphone = await js(`window.punchApp.device === 'iphone'`)
R.truthyAlways = await js(`!!window.punchApp.device`)

// flip to android via the real UI control, then re-read
R.tileClick = await js(`(()=>{const b=document.querySelector('.dev-tile[data-device="android"]'); if(!b) return 'no tile'; b.click(); return 'clicked'})()`)
await sleep(900)
R.afterAndroid_dataAttr = await js(`document.getElementById('device').dataset.device`)
R.afterAndroid_state = await js(`window.punchApp.state.device`)
R.afterAndroid_device = await js(`typeof window.punchApp.device`)
R.clock = await js(`document.querySelector('[data-clock]').textContent`)
R.paySheetDevice = await js(`(()=>{try{return window.PunchPay? 'pay module present':'n/a'}catch(e){return 'err'}})()`)

// does Reset everything restore the phone to iphone?
R.resetBtnExists = await js(`!!document.querySelector('[data-reset-all], #resetAll')`)
R.resetSearch = await js(`JSON.stringify([...document.querySelectorAll('button')].map(b=>b.id+'|'+(b.textContent||'').trim().slice(0,30)).filter(s=>/reset|back to how/i.test(s)))`)
console.log(JSON.stringify({ ...R, errors: errs.slice(0, 10) }, null, 1))
ws.close(); chrome.kill()
