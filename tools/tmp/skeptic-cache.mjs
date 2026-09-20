import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9400 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1440,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
let t
for (let i=0;i<90&&!t;i++){ try{ t=(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page') }catch{ await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r, { once: true }))
let id=0; const pend=new Map(); const reqs=new Map(); const errs=[]
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Network.requestWillBeSent') reqs.set(m.params.requestId, { url: m.params.request.url, type: m.params.type, bytes: 0, status: 0 })
  else if (m.method === 'Network.responseReceived') { const r = reqs.get(m.params.requestId); if (r) { r.status = m.params.response.status; r.type = m.params.type; r.cc = m.params.response.headers['cache-control'] || m.params.response.headers['Cache-Control'] || '' } }
  else if (m.method === 'Network.loadingFinished') { const r = reqs.get(m.params.requestId); if (r) r.bytes = m.params.encodedDataLength }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(4000)
await js('localStorage.clear(); 1')
reqs.clear()
await send('Network.clearBrowserCache')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(7000)
const all=[...reqs.values()].filter(r=>r.url.startsWith('http'))
const bucket=r=>{const p=new URL(r.url).pathname; if(p.startsWith('/assets/'))return 'assets/*'; if(p.startsWith('/fonts/'))return 'fonts/*'; if(p.startsWith('/parts/'))return 'parts/*'; return 'root (js/css/html)'}
const agg={}
for(const r of all){const b=bucket(r); agg[b]=agg[b]||{n:0,bytes:0}; agg[b].n++; agg[b].bytes+=r.bytes}
const loadEnd = await js('JSON.stringify({dcl:Math.round(performance.timing.domContentLoadedEventEnd-performance.timing.navigationStart), load:Math.round(performance.timing.loadEventEnd-performance.timing.navigationStart), entries:performance.getEntriesByType("resource").length})')
console.log('TOTAL requests:', all.length, ' total encoded bytes:', all.reduce((a,r)=>a+r.bytes,0))
console.log('BY BUCKET:', JSON.stringify(agg,null,1))
console.log('TIMING:', loadEnd)
console.log('statuses:', JSON.stringify(all.reduce((a,r)=>{a[r.status]=(a[r.status]||0)+1;return a},{})))
console.log('sample cache-control seen:', [...new Set(all.map(r=>r.cc))].slice(0,5))
console.log('TOP 10 by bytes:'); [...all].sort((a,b)=>b.bytes-a.bytes).slice(0,10).forEach(r=>console.log('  ',r.bytes, new URL(r.url).pathname))
console.log('errors:', errs.slice(0,5))
ws.close(); chrome.kill()
