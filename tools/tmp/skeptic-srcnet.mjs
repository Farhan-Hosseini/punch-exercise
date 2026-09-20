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
let id = 0; const pend = new Map(); const urls = []; const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Network.requestWillBeSent') urls.push(m.params.request.url)
  else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)
for (const mode of ['mobile', 'machine', 'animation', 'ds']) { await js(`window.showcase.mode('${mode}'); 1`); await sleep(2500) }
await js(`document.querySelector('#openCase')?.click(); 1`); await sleep(2500)
await js(`const c=document.querySelector('#case'); if(c) c.scrollTop = c.scrollHeight; 1`); await sleep(2000)
const srcHits = urls.filter((u) => u.includes('/assets/howto/src/'))
const figHits = urls.filter((u) => u.includes('/assets/figma/'))
const howto = urls.filter((u) => u.includes('/assets/howto/'))
console.log(JSON.stringify({ totalRequests: urls.length, srcHits, figHits, howtoRequested: [...new Set(howto.map(u => u.split('/').pop()))], glyphsPresent: await js('typeof window.GLYPHS === "object" && Object.keys(window.GLYPHS||{}).length'), errors: errs.slice(0, 5) }, null, 1))
ws.close(); chrome.kill()
