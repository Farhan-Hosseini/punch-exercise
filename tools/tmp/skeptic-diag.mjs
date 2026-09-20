import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9414
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1600,1000','about:blank'],{stdio:'ignore'})
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
let t
for(let i=0;i<90&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const pend=new Map();const errs=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}
 else if(m.method==='Runtime.exceptionThrown')errs.push(String(m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text).slice(0,200))})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable');await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false})
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(8000)
for (const label of ['t=8s']) {
  console.log(label, await js(`JSON.stringify({mode:document.documentElement.dataset.mode,loader:!!document.getElementById('loader'),loaderDisp:document.getElementById('loader')?getComputedStyle(document.getElementById('loader')).display:'gone',inert:document.body.hasAttribute('inert'),stages:[...document.querySelectorAll('main')].map(m=>m.id+':'+(m.hasAttribute('hidden')?'hidden':'shown')),docH:document.documentElement.scrollHeight})`))
}
await js(`window.showcase.mode('ds');1`);await sleep(3000)
console.log('after mode(ds):', await js(`JSON.stringify({mode:document.documentElement.dataset.mode,stages:[...document.querySelectorAll('main')].map(m=>m.id+':'+(m.hasAttribute('hidden')?'hidden':'shown')),docH:document.documentElement.scrollHeight})`))
console.log('errors:',errs.slice(0,6))
ws.close();chrome.kill()
