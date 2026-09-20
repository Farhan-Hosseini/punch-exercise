import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9300 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'cc'+port)}`,'--window-size=1440,900','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const reqs = []
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Network.requestWillBeSent') reqs.push(m.params.request.url) })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; const to = setTimeout(() => { if (pend.has(n)) { pend.delete(n); r({ result: { result: { value: '<TIMEOUT>' } } }) } }, 20000); pend.set(n, (v) => { clearTimeout(to); r(v) }); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3000)
await js('localStorage.clear(); 1')
reqs.length = 0
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
// visit every surface + the case study
for (const mode of ['mobile','machine','animation','ds']) { await js(`window.showcase && window.showcase.mode('${mode}'); 1`); await sleep(1800) }
await js("document.getElementById('openCase').click(); 1"); await sleep(3500)
const H = Number(await js("document.getElementById('caseScroll').scrollHeight")) || 0
for (let y = 0; y < H; y += 700) { await js(`document.getElementById('caseScroll').scrollTo(0,${y}); 1`); await sleep(45) }
await sleep(1200)
const parts = reqs.filter(u => u.includes('/parts/'))
console.log('requests to /parts/ during a full session:', JSON.stringify(parts))
console.log('case-run/case-state ever requested:', reqs.some(u=>u.includes('case-run')||u.includes('case-state')))
console.log('total requests:', reqs.length)
ws.close(); chrome.kill(); process.exit(0)
