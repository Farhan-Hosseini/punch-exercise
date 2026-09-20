// Measure Chrome's DEFAULT referrer policy (no Referrer-Policy header is sent by the dev server).
// localhost:5770 -> 127.0.0.1:5770 is a genuine cross-origin hop served by the SAME running server.
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9711
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--no-first-run','--hide-scrollbars','--disable-gpu','--force-color-profile=srgb',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sr'+Date.now())}`,'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const sent = []; const srvHdrs = {}
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Network.requestWillBeSentExtraInfo') sent.push(m.params.headers)
  else if (m.method === 'Network.responseReceived' && m.params.response.url.endsWith(':5770/')) Object.assign(srvHdrs, m.params.response.headers)
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Page.navigate', { url: 'http://localhost:5770/?embed=machine&secret=LEAKME' }); await sleep(4500)
sent.length = 0
// cross-origin subresource request, exactly like a click through to figma.com would be
await js(`fetch('http://127.0.0.1:5770/styles.css', { mode: 'no-cors' }).then(()=>1).catch(()=>1)`)
await sleep(1500)
const refs = sent.map((h) => { const o = {}; for (const k in h) o[k.toLowerCase()] = h[k]; return o }).filter((h) => (h[':authority'] || h.host || '').includes('127.0.0.1:5770') || (h.referer || '').includes('localhost:5770'))
const dl = {}; for (const k in srvHdrs) dl[k.toLowerCase()] = srvHdrs[k]
console.log(JSON.stringify({
  chromeVersion: await js('navigator.userAgent'),
  pageUrl: await js('location.href'),
  crossOriginRequestHeaders: refs.map(h => ({ host: h[':authority'] || h.host, referer: h.referer ?? '(no Referer header sent)' })),
  devServerSecurityHeadersOnIndex: {
    'x-content-type-options': dl['x-content-type-options'] || '(absent)',
    'referrer-policy': dl['referrer-policy'] || '(absent)',
    'permissions-policy': dl['permissions-policy'] || '(absent)',
    'strict-transport-security': dl['strict-transport-security'] || '(absent)',
    'content-security-policy': dl['content-security-policy'] || '(absent)'
  }
}, null, 1))
ws.close(); chrome.kill()
