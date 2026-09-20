import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1440,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []; const resp = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
  else if (m.method === 'Network.responseReceived') {
    const r = m.params.response
    const h = {}; for (const k in r.headers) h[k.toLowerCase()] = r.headers[k]
    resp.push({ url: r.url, status: r.status, ct: h['content-type'] || '(NONE)', mime: r.mimeType, type: m.params.type })
  }
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
resp.length = 0
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
for (const mode of ['mobile','machine','animation','ds']) { await js(`window.showcase.mode('${mode}'); 1`); await sleep(2500) }
await js(`document.querySelector('#openCase')?.click(); 1`); await sleep(3000)
// report
const byCt = {}
for (const r of resp) { const k = (r.ct.split(';')[0] || '(NONE)').trim(); (byCt[k] ||= []).push(r) }
const missing = resp.filter((r) => r.ct === '(NONE)')
const generic = resp.filter((r) => /^(text\/plain|application\/octet-stream)/i.test(r.ct))
// mismatch: browser-computed mimeType differs from declared
const mismatch = resp.filter((r) => r.ct !== '(NONE)' && r.mime && !r.ct.toLowerCase().startsWith(r.mime.toLowerCase()))
console.log(JSON.stringify({
  totalResponses: resp.length,
  contentTypeHistogram: Object.fromEntries(Object.entries(byCt).map(([k,v]) => [k, v.length])),
  responsesWithNoContentType: missing.map(r => r.url).slice(0,20),
  responsesWithSniffableGenericType: generic.map(r => `${r.ct}  ${r.url}`).slice(0,20),
  declaredVsSniffedMismatch: mismatch.map(r => `declared=${r.ct} sniffed=${r.mime} ${r.url}`).slice(0,20),
  consoleErrors: errs.slice(0,10),
  crossOriginResponses: [...new Set(resp.filter(r => !r.url.startsWith('http://localhost:5770') && !r.url.startsWith('data:') && !r.url.startsWith('blob:')).map(r => r.url))].slice(0,20)
}, null, 1))
ws.close(); chrome.kill()
