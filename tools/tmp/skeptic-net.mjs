import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const reqs = []; const failed = []; const status = new Map()
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Network.requestWillBeSent') reqs.push(m.params.request.url)
  else if (m.method === 'Network.responseReceived') status.set(m.params.response.url, m.params.response.status)
  else if (m.method === 'Network.loadingFailed') failed.push(m.params.errorText)
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
reqs.length = 0
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
for (const mode of ['mobile', 'machine', 'animation', 'ds']) { await js(`window.showcase.mode('${mode}'); 1`); await sleep(2500) }
await js(`document.getElementById('openCase')?.click(); 1`); await sleep(3000)
const u = [...new Set(reqs)].map(x => x.replace('http://localhost:5770/', '/')).filter(x => x.startsWith('/'))
const pick = (p) => u.filter(x => x.startsWith(p)).sort()
console.log(JSON.stringify({
  concat_css: pick('/sections.css').concat(pick('/mscreens.css'), pick('/mpages.css')).map(x => x + ' -> ' + status.get('http://localhost:5770' + x)),
  sections_dir: pick('/sections/'),
  mscreens_dir: pick('/mscreens/'),
  mpages_dir: pick('/mpages/'),
  parts_dir: pick('/parts/'),
  failed: failed.slice(0, 10),
  total_requests: u.length,
}, null, 1))
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'sk' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
