import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'; import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random()*90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sz'+port)}`,'--window-size=1600,1000','about:blank'],{stdio:'ignore'})
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms)); let t
for(let i=0;i<120&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const pend=new Map(); ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}})
const send=(m,p={})=>new Promise(r=>{const n=++id;const to=setTimeout(()=>{if(pend.has(n)){pend.delete(n);r({timeout:1})}},20000);pend.set(n,v=>{clearTimeout(to);r(v)});ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable');await send('Page.enable');await send('Network.enable')
await send('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false})
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(6000)
await js('try{localStorage.clear()}catch(e){};1'); await send('Network.clearBrowserCache'); await send('Network.setCacheDisabled',{cacheDisabled:true})
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(9000)
console.log(await js(`JSON.stringify((()=>{
 const fetched = new Set(performance.getEntriesByType('resource').map(r=>r.name.split('/').pop()))
 const want=['dubai-night-1.jpg','mall-night-1.jpg','arcade-neon-1.jpg','dubai-night-2.jpg']
 const inDom = want.map(w=>({f:w, imgEls:[...document.images].filter(i=>i.getAttribute('src')&&i.getAttribute('src').endsWith(w)).length, fetched:fetched.has(w), natural:(()=>{const i=[...document.images].find(x=>x.getAttribute('src')&&x.getAttribute('src').endsWith(w));return i?i.naturalWidth+'x'+i.naturalHeight:'-'})()}))
 const manifests = performance.getEntriesByType('resource').filter(r=>r.name.includes('photos/lib/manifest.json')).map(r=>({start:Math.round(r.startTime),size:r.transferSize,init:r.initiatorType}))
 return { venueImages: inDom, manifestFetches: manifests }
})())`, null, 1))
ws.close(); chrome.kill()
