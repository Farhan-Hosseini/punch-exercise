// Measure network cost by phase, split by frame, with cache behaviour visible.
// argv[2] = 'nostore' (as served) | 'cached' (rewrite cache-control to a Netlify-like value)
import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const MODE = process.argv[2] || 'nostore'
const port = 9400 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk' + port)}`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
const send = (m, p = {}, sid) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p, sessionId: sid })) })
const reqs = new Map(); const served = new Set(); const errs = []; const fetchErrs = []
let phase = 'initial'
ws.addEventListener('message', async (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  const p = m.params || {}
  if (m.method === 'Network.requestWillBeSent') reqs.set(p.requestId, { url: p.request.url, frame: p.frameId, type: p.type, phase, bytes: 0, cached: false })
  else if (m.method === 'Network.requestServedFromCache') { served.add(p.requestId); const r = reqs.get(p.requestId); if (r) r.cached = 'memory' }
  else if (m.method === 'Network.responseReceived') { const r = reqs.get(p.requestId); if (r) { r.status = p.response.status; r.mime = p.response.mimeType; if (p.response.fromDiskCache) r.cached = 'disk'; r.type = p.type } }
  else if (m.method === 'Network.loadingFinished') { const r = reqs.get(p.requestId); if (r) r.bytes = p.encodedDataLength || 0 }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(String(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text).slice(0, 180))
  else if (m.method === 'Fetch.requestPaused') {
    const sid = m.sessionId
    const hs = (p.responseHeaders || []).filter((h) => h.name.toLowerCase() !== 'cache-control')
    hs.push({ name: 'cache-control', value: 'public, max-age=600' })
    const r = await send('Fetch.continueResponse', { requestId: p.requestId, responseCode: p.responseStatusCode || 200, responseHeaders: hs }, sid)
    if (r.error) { fetchErrs.push(JSON.stringify(r.error).slice(0, 160)); try { await send('Fetch.continueRequest', { requestId: p.requestId }, sid) } catch {} }
  }
})
// auto-attach so iframes are measured too
await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true })
ws.addEventListener('message', async (e) => {
  const m = JSON.parse(e.data)
  if (m.method === 'Target.attachedToTarget') {
    const sid = m.params.sessionId
    await send('Network.enable', {}, sid)
    if (MODE === 'cached') await send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Response' }] }, sid)
  }
})
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Network.setCacheDisabled', { cacheDisabled: false })
if (MODE === 'cached') await send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Response' }] })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await send('Runtime.evaluate', { expression: 'localStorage.clear(); 1' })
reqs.clear(); served.clear()
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6500)
const snap = () => { const a = [...reqs.values()]; return { n: a.length, mb: +(a.reduce((s, r) => s + r.bytes, 0) / 1048576).toFixed(2) } }
const out = { mode: MODE, initial: snap() }
phase = 'animation'
await send('Runtime.evaluate', { expression: "window.showcase.mode('animation'); 1" }); await sleep(6000)
out.afterAnimation = snap()
phase = 'case'
await send('Runtime.evaluate', { expression: "document.getElementById('openCase').click(); 1" }); await sleep(3000)
await send('Runtime.evaluate', { expression: "(()=>{const s=document.getElementById('caseScroll')||document.scrollingElement;s.scrollTop=s.scrollHeight;return s.scrollHeight})()" }); await sleep(5000)
await send('Runtime.evaluate', { expression: "(()=>{const s=document.getElementById('caseScroll')||document.scrollingElement;s.scrollTop=s.scrollHeight;return s.scrollTop})()" }); await sleep(4000)
out.afterCase = snap()
const all = [...reqs.values()]
out.byPhase = {}
for (const ph of ['initial', 'animation', 'case']) {
  const a = all.filter((r) => r.phase === ph)
  out.byPhase[ph] = { n: a.length, mb: +(a.reduce((s, r) => s + r.bytes, 0) / 1048576).toFixed(2), cachedHits: a.filter((r) => r.cached).length, cachedMb: +(a.filter((r) => r.cached).reduce((s, r) => s + r.bytes, 0) / 1048576).toFixed(2) }
}
// duplicates: same URL fetched more than once
const byUrl = new Map()
for (const r of all) { const k = r.url.split('#')[0]; byUrl.set(k, (byUrl.get(k) || []).concat(r)) }
out.uniqueUrls = byUrl.size
out.uniqueMb = +([...byUrl.values()].reduce((s, v) => s + (v[0].bytes || 0), 0) / 1048576).toFixed(2)
out.dupRequests = all.length - byUrl.size
out.dupMb = +(all.reduce((s, r) => s + r.bytes, 0) / 1048576 - out.uniqueMb).toFixed(2)
out.embedDocs = all.filter((r) => /embed=machine/.test(r.url)).map((r) => ({ url: r.url, phase: r.phase, bytes: r.bytes, cached: r.cached }))
out.topDupes = [...byUrl.entries()].filter(([, v]) => v.length > 1).sort((a, b) => (b[1].length - 1) * b[1][0].bytes - (a[1].length - 1) * a[1][0].bytes).slice(0, 12).map(([u, v]) => ({ url: u.replace('http://localhost:5770/', ''), times: v.length, eachKb: Math.round(v[0].bytes / 1024), cached: v.map((x) => x.cached || 'net').join(',') }))
out.errors = errs.slice(0, 6); out.fetchErrors = fetchErrs.slice(0, 4); out.fetchErrCount = fetchErrs.length
await writeFile(`tools/tmp/skeptic-net-${MODE}.json`, JSON.stringify({ ...out}, null, 1))
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill()
