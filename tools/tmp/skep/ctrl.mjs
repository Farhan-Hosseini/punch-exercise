// Negative control: same cold load, but hidden .m-page / .mscreen stacks get display:none
// injected at document-start, so Chrome's lazy loader can actually defer their images.
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const MODE = process.argv[2] || 'ctrl'
const port = 9900 + Math.floor(Math.random()*90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'ct'+port)}`,'--window-size=1440,900','about:blank'],{stdio:'ignore'})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<150&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map(); const req=new Map()
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);return}
 const p=m.params
 if(m.method==='Network.requestWillBeSent') req.set(p.requestId,{url:p.request.url,type:p.type,enc:0})
 else if(m.method==='Network.responseReceived'){const r=req.get(p.requestId); if(r) r.type=p.type}
 else if(m.method==='Network.loadingFinished'){const r=req.get(p.requestId); if(r) r.enc=p.encodedDataLength}})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Network.setCacheDisabled',{cacheDisabled:true})
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
if (MODE==='ctrl') await send('Page.addScriptToEvaluateOnNewDocument',{source:`
 const s=document.createElement('style');
 s.textContent='.m-page:not(.is-on){display:none !important} .mscreen:not(.is-on){display:none !important} #case,#brief,#help{display:none !important}';
 (document.head||document.documentElement).appendChild(s);
 new MutationObserver(()=>{if(document.head&&!s.isConnected)document.head.appendChild(s)}).observe(document.documentElement,{childList:true,subtree:true});
`})
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(4000)
await js('localStorage.clear(); sessionStorage.clear(); 1')
req.clear()
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(9000)
const rows=[...req.values()]
const byType={}; for(const r of rows){const k=r.type||'Other'; byType[k]=byType[k]||{n:0,b:0}; byType[k].n++; byType[k].b+=r.enc||0}
const probe = await js(`(()=>{const off=[...document.querySelectorAll('.m-page:not(.is-on)')];
 const im=off.flatMap(p=>[...p.querySelectorAll('img')]);
 return JSON.stringify({offPages:off.length, offDisplay:off[0]?getComputedStyle(off[0]).display:'-',
  offVis:off[0]?getComputedStyle(off[0]).visibility:'-', imgsInOffPages:im.length,
  lazyInOff:im.filter(i=>i.loading==='lazy').length,
  loadedLazyInOff:im.filter(i=>i.loading==='lazy'&&i.complete&&i.naturalWidth>0).length,
  styleTagPresent: !!document.querySelector('style')&&[...document.querySelectorAll('style')].some(s=>s.textContent.includes('m-page:not(.is-on)'))})})()`)
console.log(MODE, JSON.stringify({count:rows.length,bytes:rows.reduce((s,r)=>s+(r.enc||0),0),images:byType.Image},null,1), probe)
ws.close(); chrome.kill()
