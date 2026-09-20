// Loads the showcase, drives every mode + the case overlay, and reports every request that did not return 200.
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-color-profile=srgb',
  '--force-prefers-reduced-motion=no-preference',
  `--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'na'+port)}`,'--window-size=1440,1000','about:blank'],{stdio:'ignore'})
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
let t
for(let i=0;i<90&&!t;i++){ try{ t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page') }catch{ await sleep(150) } }
const ws=new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map(); const bad=[]; const errs=[]; const origins=new Set(); let total=0
ws.addEventListener('message',(e)=>{ const m=JSON.parse(e.data)
  if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);return}
  if(m.method==='Network.responseReceived'){ total++; const r=m.params.response
    try{origins.add(new URL(r.url).origin)}catch{}
    if(r.status>=400) bad.push(r.status+' '+r.url.replace('http://localhost:5770','')) }
  else if(m.method==='Network.loadingFailed'){ bad.push('FAILED '+(m.params.errorText||'')+' '+m.params.type) }
  else if(m.method==='Runtime.exceptionThrown') errs.push('EXC '+(m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text||'').slice(0,200))
  else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error') errs.push('ERR '+m.params.args.map(a=>a.value||a.description).join(' ').slice(0,200))
})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async(e)=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(4000)
await js('try{localStorage.clear()}catch(e){};1')
bad.length=0; errs.length=0; total=0
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(6000)
for(const mode of ['mobile','machine','animation','ds']){ await js(`try{window.showcase.mode('${mode}')}catch(e){};1`); await sleep(2500) }
await js(`try{document.getElementById('openCase').click()}catch(e){};1`); await sleep(3000)
await js(`try{const c=document.getElementById('case');c.scrollTo(0,c.scrollHeight)}catch(e){};1`); await sleep(2500)
console.log(JSON.stringify({ totalResponses: total, origins: [...origins], failedCount: bad.length, failed: [...new Set(bad)].slice(0,30), errorCount: errs.length, errors: [...new Set(errs)].slice(0,8) },null,1))
ws.close(); chrome.kill()
