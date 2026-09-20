import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9200 + Math.floor(Math.random()*90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'in'+port)}`,'--window-size=1440,900','about:blank'],{stdio:'ignore'})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<150&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map(); const req=new Map(); const t0={v:0}
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);return}
 const p=m.params
 if(m.method==='Network.requestWillBeSent'){ if(p.type==='Document'&&!t0.v)t0.v=p.timestamp; req.set(p.requestId,{url:p.request.url,type:p.type,enc:0,init:p.initiator,ts:p.timestamp}) }
 else if(m.method==='Network.responseReceived'){const r=req.get(p.requestId); if(r) r.type=p.type}
 else if(m.method==='Network.loadingFinished'){const r=req.get(p.requestId); if(r) r.enc=p.encodedDataLength}})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Network.setCacheDisabled',{cacheDisabled:true})
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(4000)
await js('localStorage.clear(); sessionStorage.clear(); 1'); req.clear(); t0.v=0
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(9000)
const rows=[...req.values()].filter(r=>r.type==='Image').sort((a,b)=>b.enc-a.enc)
const line=r=>{const i=r.init||{}; const f=i.stack?.callFrames?.[0]
  return String(r.enc).padStart(7)+'  +'+((r.ts-t0.v)*1000).toFixed(0).padStart(5)+'ms  '+String(i.type).padEnd(8)+'  '
   +(f?(f.url.replace('http://localhost:5770/','')+':'+(f.lineNumber+1)+' '+(f.functionName||'')):(i.url?i.url.replace('http://localhost:5770/',''):'-'))
   +'   '+r.url.replace('http://localhost:5770/','')}
console.log(rows.map(line).join('\n'))
const byInit={}; for(const r of rows){const i=r.init||{}; const f=i.stack?.callFrames?.[0]; const k=i.type+' '+(f?f.url.replace('http://localhost:5770/','')+':'+(f.lineNumber+1):(i.url||'-')); byInit[k]=byInit[k]||{n:0,b:0}; byInit[k].n++; byInit[k].b+=r.enc}
console.log('\n=== image bytes by initiator ===')
console.log(Object.entries(byInit).sort((a,b)=>b[1].b-a[1].b).map(([k,v])=>String(v.b).padStart(8)+'  n='+String(v.n).padStart(3)+'  '+k).join('\n'))
await writeFile('tools/tmp/skep/init.json', JSON.stringify(rows.map(r=>({b:r.enc,u:r.url,init:r.init})),null,1))
ws.close(); chrome.kill()
