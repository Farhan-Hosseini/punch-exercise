import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9600 + Math.floor(Math.random()*90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sh'+port)}`,'--window-size=1440,1000','about:blank'],{stdio:'ignore'})
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<90&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const pend=new Map()
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable');await send('Page.enable')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(3000); await js('localStorage.clear();1')
const probe = `JSON.stringify((()=>{const c=document.getElementById('case');const b=c.getBoundingClientRect();return{hidden:c.hidden,cls:c.className,display:getComputedStyle(c).display,opacity:getComputedStyle(c).opacity,vis:getComputedStyle(c).visibility,w:Math.round(b.width),h:Math.round(b.height),loaderDone:document.getElementById('loader')?.classList.contains('is-done')}})())`
await send('Page.navigate',{url:'http://localhost:5770/#case'})
for (const w of [4000,3000,3000,5000]) { await sleep(w); console.log('after', w, await js(probe)) }
// control: click the button
console.log('click openCase ->', await js(`document.getElementById('openCase').click(); 1`))
await sleep(1200); console.log('after click', await js(probe))
ws.close();chrome.kill()
