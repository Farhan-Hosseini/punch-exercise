import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'; import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random()*90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sn'+port)}`,'--window-size=390,844','about:blank'],{stdio:'ignore'})
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<90&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const pend=new Map()
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable');await send('Page.enable')
for (const [w,h] of [[390,844],[768,1024]]) {
  await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<768})
  await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(5500)
  console.log(w, await js(`(()=>{const b=document.getElementById('openBrief');const cs=getComputedStyle(b);const r=b.getBoundingClientRect();window.showcase.brief(true);return JSON.stringify({display:cs.display,vis:cs.visibility,w:Math.round(r.width),h:Math.round(r.height)})})()`))
  await sleep(900)
  console.log('  after showcase.brief(true):', await js(`(()=>{const br=document.getElementById('brief');return JSON.stringify({open:br.classList.contains('is-open'),chars:br.innerText.length})})()`))
}
ws.close();chrome.kill()
