import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const URL_ = process.argv[2]
const port = 9700 + Math.floor(Math.random()*80)
const prof = join(tmpdir(),'zz'+port)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${prof}`,'--window-size=1440,1000','about:blank'],{stdio:'ignore'})
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<90&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const pend=new Map();const errs=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)} else if(m.method==='Runtime.exceptionThrown')errs.push(String(m.params.exceptionDetails?.exception?.description||'').slice(0,140))})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable');await send('Page.enable')
await send('Page.navigate',{url:URL_}); await sleep(9000)
const probe=`JSON.stringify((()=>{const c=document.getElementById('case');const b=c.getBoundingClientRect();return{url:location.href,hidden:c.hidden,cls:c.className,display:getComputedStyle(c).display,w:Math.round(b.width),h:Math.round(b.height),loaderDone:document.getElementById('loader')?.classList.contains('is-done')}})())`
console.log(URL_,'=>',await js(probe),'errs:',errs.slice(0,3))
ws.close();chrome.kill()
await sleep(600)
