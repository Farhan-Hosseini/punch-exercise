import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9600 + Math.floor(Math.random()*90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sb'+port)}`,'--window-size=1440,1000','about:blank'],{stdio:'ignore'})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<90&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const pend=new Map()
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable');await send('Page.enable')
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(8000)
console.log(await js(`JSON.stringify((()=>{
 const nav=performance.getEntriesByType('navigation')[0]
 const load=nav?nav.loadEventEnd:performance.timing.loadEventEnd-performance.timing.navigationStart
 const r=performance.getEntriesByType('resource')
 const before=r.filter(e=>e.startTime<load)
 const after=r.filter(e=>e.startTime>=load)
 const img=r.filter(e=>e.initiatorType==='img')
 return {loadEventMs:Math.round(load), totalResources:r.length,
  startedBeforeLoad:before.length, startedAfterLoad:after.length,
  imgTotal:img.length, imgAfterLoad:img.filter(e=>e.startTime>=load).length,
  lazyImgsInDom:document.querySelectorAll('img[loading=lazy]').length,
  imgsInDom:document.querySelectorAll('img').length}
})())`,))
ws.close();chrome.kill()
