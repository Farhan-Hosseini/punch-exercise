import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const KBPS = Number(process.argv[2] || 0)   // 0 = unthrottled
const RTT  = Number(process.argv[3] || 0)
const port = 9100 + Math.floor(Math.random()*90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'th'+port)}`,'--window-size=1440,900','about:blank'],{stdio:'ignore'})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<150&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map(); const req=new Map(); let nav0=0
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);return}
 const p=m.params
 if(m.method==='Network.requestWillBeSent'){ if(p.type==='Document'&&!nav0)nav0=p.timestamp; req.set(p.requestId,{url:p.request.url,type:p.type,enc:0}) }
 else if(m.method==='Network.responseReceived'){const r=req.get(p.requestId); if(r) r.type=p.type}
 else if(m.method==='Network.loadingFinished'){const r=req.get(p.requestId); if(r){r.enc=p.encodedDataLength; r.done=(p.timestamp-nav0)*1000}}})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Network.setCacheDisabled',{cacheDisabled:true})
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(4000)
await js('localStorage.clear(); sessionStorage.clear(); 1'); req.clear(); nav0=0
if (KBPS) await send('Network.emulateNetworkConditions',{offline:false, latency:RTT, downloadThroughput:KBPS*1024/8, uploadThroughput:KBPS*1024/8})
const wall = Date.now()
await send('Page.navigate',{url:'http://localhost:5770/'})
let loaderMs=null
for(let i=0;i<600;i++){ const v=await js(`!!document.getElementById('loader')?.classList.contains('is-done')`); if(v){loaderMs=Date.now()-wall; break} await sleep(100) }
await sleep(KBPS?40000:9000)
const rows=[...req.values()]
const total=rows.reduce((s,r)=>s+(r.enc||0),0)
const atLoader = loaderMs==null?null:rows.filter(r=>r.done!=null&&r.done<=loaderMs).reduce((s,r)=>s+r.enc,0)
const last = Math.max(...rows.map(r=>r.done||0))
console.log(JSON.stringify({ throttle: KBPS?KBPS+'kbps/'+RTT+'ms':'none', requests:rows.length, totalBytes:total,
  loaderDoneMs: loaderMs, bytesByLoaderDone: atLoader, lastResourceMs: Math.round(last),
  stillPending: rows.filter(r=>r.done==null).length,
  key: Object.fromEntries(['/','styles.css','mpages.css','mscreens.css','format.js','mobile.js','ds.js','app.js','pagenav.js','fonts/big-shoulders-display-latin-900-normal.woff2']
    .map(k=>[k, Math.round(rows.find(r=>r.url.replace('http://localhost:5770/','')===k)?.done||-1)])) }, null, 1))
ws.close(); chrome.kill()
