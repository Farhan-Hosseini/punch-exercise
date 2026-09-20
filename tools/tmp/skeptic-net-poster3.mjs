import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sn'+port)}`,'--window-size=1440,1000','about:blank'], { stdio: 'ignore' })
const sleep = ms => new Promise(r => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const reqs = new Map(); let recording = false; let t0 = 0
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (!recording) return
  if (m.method === 'Network.requestWillBeSent') { if (!t0) t0 = m.params.timestamp; reqs.set(m.params.requestId, { url: m.params.request.url, start: (m.params.timestamp - t0) * 1000, prio: m.params.request.initialPriority, bytes: 0, end: null }) }
  if (m.method === 'Network.loadingFinished') { const r = reqs.get(m.params.requestId); if (r) { r.bytes = m.params.encodedDataLength; r.end = (m.params.timestamp - t0) * 1000 } }
})
const send = (m, p = {}) => new Promise(r => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async e => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Network.setCacheDisabled', { cacheDisabled: true })
await send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 1.6*1024*1024/8, uploadThroughput: 750*1024/8 })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js('localStorage.clear(); 1')
recording = true
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(45000)
const vis = new Set(JSON.parse(await js(`JSON.stringify([...document.images].filter(i => i.offsetParent !== null && i.getBoundingClientRect().width > 4 && i.currentSrc).map(i => i.currentSrc))`)))
const all = [...reqs.values()].filter(r => r.url.startsWith('http'))
const susp = all.filter(r => /poster|screen-hit/.test(r.url))
const firstSusp = Math.min(...susp.map(r => r.start))
const visLate = all.filter(r => vis.has(r.url) && r.end != null && r.end > firstSusp).sort((a,b)=>a.end-b.end)
console.log('total bytes recorded:', all.reduce((a,r)=>a+r.bytes,0), 'reqs:', all.length, 'unfinished:', all.filter(r=>r.end==null).length)
console.log('first suspect starts at ms:', Math.round(firstSusp))
console.log('VISIBLE images that finish AFTER the first poster started:', visLate.length)
for (const r of visLate.slice(0,20)) console.log('  ', Math.round(r.start), '->', Math.round(r.end), r.prio, String(r.bytes).padStart(7), r.url.replace('http://localhost:5770',''))
console.log('last visible image ends at:', Math.round(Math.max(...all.filter(r=>vis.has(r.url)&&r.end!=null).map(r=>r.end))))
console.log('all requests end at:', Math.round(Math.max(...all.filter(r=>r.end!=null).map(r=>r.end))))
ws.close(); chrome.kill()
