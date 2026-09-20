import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9600 + Math.floor(Math.random()*90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'ski'+port)}`,'--window-size=1440,1000','about:blank'],{stdio:'ignore'})
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<120&&!t;i++){ try{ t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page') }catch{ await sleep(150) } }
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map(); const reqs=new Map(); const order=[]
ws.addEventListener('message',e=>{ const m=JSON.parse(e.data)
  if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);return}
  if(m.method==='Network.requestWillBeSent'){const p=m.params;reqs.set(p.requestId,{url:p.request.url,type:p.type,init:p.initiator});order.push(p.requestId)}
  if(m.method==='Network.responseReceived'){const r=reqs.get(m.params.requestId);if(r){r.mime=m.params.response.mimeType;r.status=m.params.response.status}}
  if(m.method==='Network.loadingFinished'){const r=reqs.get(m.params.requestId);if(r)r.enc=m.params.encodedDataLength}
})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable'); await send('Network.clearBrowserCache')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(8000)
console.log('=== manifest requests with initiator stack top frames ===')
for(const i of order){ const r=reqs.get(i); if(!/manifest\.json/.test(r.url)) continue
  const frames=(r.init?.stack?.callFrames||[]).slice(0,3).map(f=>`${f.url.replace('http://localhost:5770/','')}:${f.lineNumber+1}:${f.columnNumber+1} ${f.functionName||'(top)'}`)
  console.log(r.url.replace('http://localhost:5770/',''), '| enc='+r.enc, '| initiator='+(r.init?.type), '|', frames.join('  <-  ') || r.init?.url)
}
const by={}
for(const i of order){ const r=reqs.get(i); const k=(r.mime||r.type||'?'); by[k]=by[k]||{n:0,b:0}; by[k].n++; by[k].b+=(r.enc||0) }
console.log('\n=== total page weight by mime (dev server, NO compression) ===')
for(const [k,v] of Object.entries(by).sort((a,b)=>b[1].b-a[1].b)) console.log(String(v.b).padStart(9), 'B', String(v.n).padStart(3), 'req ', k)
console.log('GRAND TOTAL', order.map(i=>reqs.get(i).enc||0).reduce((a,b)=>a+b,0), 'B in', order.length, 'requests')
ws.close(); chrome.kill()
