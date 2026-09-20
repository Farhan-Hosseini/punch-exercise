import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1440,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i=0;i<120 && !t;i++){ try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map()
let reqs = new Map(); let order = []
ws.addEventListener('message',(e)=>{
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (m.method==='Network.requestWillBeSent'){ const p=m.params; reqs.set(p.requestId,{url:p.request.url,method:p.request.method,headers:p.request.headers,type:p.type,t:p.timestamp}); order.push(p.requestId) }
  if (m.method==='Network.responseReceived'){ const r=reqs.get(m.params.requestId); if(r){ r.status=m.params.response.status; r.fromDiskCache=m.params.response.fromDiskCache; r.fromPrefetch=m.params.response.fromPrefetchCache; r.respHeaders=m.params.response.headers; r.mime=m.params.response.mimeType } }
  if (m.method==='Network.loadingFinished'){ const r=reqs.get(m.params.requestId); if(r){ r.enc=m.params.encodedDataLength } }
  if (m.method==='Network.loadingFailed'){ const r=reqs.get(m.params.requestId); if(r){ r.failed=m.params.errorText } }
})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async(e)=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')

function report(label){
  const rows = order.map(i=>reqs.get(i)).filter(r=>/manifest\.json/.test(r.url))
  console.log(`\n--- ${label} --- (${rows.length} manifest requests)`)
  for (const r of rows) console.log([
    r.url.replace('http://localhost:5770/',''),
    'status='+r.status,
    'enc='+r.enc,
    'disk='+r.fromDiskCache,
    'req-cache-control='+JSON.stringify(r.headers['Cache-Control']||r.headers['cache-control']||null),
    'req-pragma='+JSON.stringify(r.headers['Pragma']||r.headers['pragma']||null),
    'resp-cc='+JSON.stringify((r.respHeaders||{})['cache-control']||(r.respHeaders||{})['Cache-Control']||null),
    'resp-etag='+JSON.stringify((r.respHeaders||{})['etag']||(r.respHeaders||{})['ETag']||null),
    'resp-lm='+JSON.stringify((r.respHeaders||{})['last-modified']||null),
    'resp-ce='+JSON.stringify((r.respHeaders||{})['content-encoding']||null),
  ].join('  '))
  const total = order.map(i=>reqs.get(i)).reduce((a,r)=>a+(r.enc||0),0)
  console.log('TOTAL encoded bytes all requests:', total, ' / requests:', order.length)
}

// COLD
await send('Network.clearBrowserCache'); await send('Network.clearBrowserCookies')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(6000)
await js('localStorage.clear(); 1')
reqs=new Map(); order=[]
await send('Network.clearBrowserCache')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(7000)
report('COLD load (cache cleared), default tab')
const modes = await js(`(()=>{ try { return JSON.stringify({mode: document.documentElement.dataset.mode||null, dsExists: !!document.querySelector('[data-ds-photos]'), reelLoaded: true }) } catch(e){ return 'ERR '+e.message } })()`)
console.log('state:', modes)

// WARM: navigate again WITHOUT clearing cache
reqs=new Map(); order=[]
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(7000)
report('WARM reload (cache kept)')

ws.close(); chrome.kill()
