// Round 3 (severity): does the leaked state self-correct? Switch B away and back; then tap B's own phone.
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'skf3' + port)}`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
for (let i = 0; i < 120; i++) { try { await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break } catch { await sleep(150) } }
async function newTab(url) {
  const t = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json()
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  let id = 0; const pend = new Map()
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
  const send = (method, params = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method, params })) })
  const js = async (x) => (await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true })).result?.result?.value
  await send('Runtime.enable'); await send('Page.enable')
  return { ws, send, js, front: async () => { try { await fetch(`http://127.0.0.1:${port}/json/activate/${t.id}`) } catch {} } }
}
const U = 'http://localhost:5770/'
const A = await newTab(U); const B = await newTab(U)
await sleep(4500)
for (const T of [A, B]) { await T.front(); await T.js('try{localStorage.clear()}catch(e){}; 1'); await T.send('Page.navigate', { url: U }); await sleep(3000) }
for (const T of [A, B]) { await T.front(); await T.js(`window.showcase.mode('animation'); 1`); await sleep(5000) }
await B.front()
const R = `JSON.stringify({ phone: window.punchApp.page, glass: (()=>{try{return document.getElementById('linkedFrame').contentDocument.getElementById('machine').dataset.mscreen}catch(e){return 'UNREADABLE'}})() })`
const show = async (l) => console.log(l.padEnd(26) + ' B -> ' + await B.js(R))
await show('baseline')
await A.js(`window.punchApp.go('hit'); 1`); await sleep(2600)
await show('after A drives to hit')
await B.js(`window.showcase.mode('mobile'); 1`); await sleep(1800)
await B.js(`window.showcase.mode('animation'); 1`); await sleep(2500)
await show('B left+returned to Anim')
await B.js(`window.punchApp.go('ranks'); 1`); await sleep(2200)
await show('B taps its own nav')
B.ws.close(); A.ws.close(); chrome.kill()
