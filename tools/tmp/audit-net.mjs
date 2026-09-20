// Cold-load transfer audit: per tab, sum encodedDataLength by type.
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const MODE = process.argv[2] || 'mobile'   // mobile | machine | animation | ds | case | initial
const W = Number(process.argv[3] || 1600)
const port = 9400 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'an' + port)}`, `--window-size=${W},1000`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
const req = new Map()   // requestId -> {url, type, enc, status, fromCache}
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  const p = m.params
  if (m.method === 'Network.requestWillBeSent') req.set(p.requestId, { url: p.request.url, type: p.type, enc: 0, status: 0 })
  else if (m.method === 'Network.responseReceived') { const r = req.get(p.requestId); if (r) { r.type = p.type; r.status = p.response.status; r.mime = p.response.mimeType; r.fromCache = p.response.fromDiskCache } }
  else if (m.method === 'Network.loadingFinished') { const r = req.get(p.requestId); if (r) r.enc = p.encodedDataLength }
  else if (m.method === 'Network.dataReceived') { const r = req.get(p.requestId); if (r) r.chunks = (r.chunks || 0) + p.encodedDataLength }
  else if (m.method === 'Network.loadingFailed') { const r = req.get(p.requestId); if (r) { r.failed = p.errorText; r.canceled = p.canceled } }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text)
  else if (m.method === 'Runtime.consoleAPICalled' && p.type === 'error') errs.push(p.args.map(a => a.value || a.description).join(' '))
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value

await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Network.setCacheDisabled', { cacheDisabled: true })
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 1000, deviceScaleFactor: 1, mobile: false })
// warm nav to clear storage, then the real cold measurement
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); sessionStorage.clear(); 1')
req.clear(); errs.length = 0
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(7000)
const initial = [...req.values()].map(r => ({ ...r }))
if (MODE !== 'initial') {
  if (MODE === 'case') { await js(`document.getElementById('openCase').click(); 1`); await sleep(3000); await js(`(async()=>{const c=document.getElementById('case');const s=c.querySelector('.case-scroll')||c;for(let y=0;y<s.scrollHeight;y+=600){s.scrollTop=y;await new Promise(r=>setTimeout(r,120))}return s.scrollHeight})()`); await sleep(3000) }
  else { await js(`window.showcase.mode('${MODE}'); 1`); await sleep(6000) }
}
const all = [...req.values()]
const initialIds = new Set(initial.map(r => r.url))
const sum = (rows) => rows.reduce((a, r) => a + (r.enc || 0), 0)
const byType = (rows) => { const o = {}; for (const r of rows) { const k = r.type || 'Other'; o[k] = (o[k] || 0) + (r.enc || 0) } return o }
const out = {
  mode: MODE, viewport: W,
  initial: { count: initial.length, bytes: sum(initial), byType: byType(initial) },
  total: { count: all.length, bytes: sum(all), byType: byType(all) },
  top: all.slice().sort((a, b) => b.enc - a.enc).slice(0, 20).map(r => ({ b: r.enc, u: r.url.replace('http://localhost:5770/', ''), t: r.type })),
  notOk: all.filter(r => (r.status && r.status >= 400) || r.failed).map(r => ({ u: r.url.replace('http://localhost:5770/', ''), s: r.status, f: r.failed, c: r.canceled })),
  errors: errs.slice(0, 10),
}
await writeFile(`tools/tmp/net-${MODE}.json`, JSON.stringify({ ...out, allUrls: all.map(r => ({ u: r.url.replace('http://localhost:5770/', ''), b: r.enc, t: r.type, s: r.status })) }, null, 1))
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'an' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
