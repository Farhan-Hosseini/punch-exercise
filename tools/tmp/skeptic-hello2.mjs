import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9413
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1600,1000','about:blank'],{stdio:'ignore'})
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
let t
for(let i=0;i<90&&!t;i++){try{t=(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const pend=new Map();const errs=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}else if(m.method==='Runtime.exceptionThrown')errs.push(m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text)})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable');await send('Page.enable')
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(4000)
await js('localStorage.clear();1')
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(5500)
const out={}
// put the phone on ranks and the shell in animation mode, then RELOAD: the real cold-boot case
await js(`window.showcase.mode('mobile');1`);await sleep(600)
await js(`window.punchApp.go('ranks');1`);await sleep(1000)
await js(`window.showcase.mode('animation');1`);await sleep(4000)
out.beforeReload=await js(`(()=>{try{return document.getElementById('linkedFrame').contentDocument.querySelector('.machine')?.dataset.mscreen}catch(e){return 'X'}})()`)
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(9000)
out.mode=await js(`document.documentElement.dataset.mode||[...document.querySelectorAll('.mode')].find(b=>b.getAttribute('aria-current'))?.dataset.mode`)
out.phonePageAfterReload=await js(`(()=>{const p=[...document.querySelectorAll('.pagebar [data-page]')].find(b=>b.getAttribute('aria-current'));return p?p.dataset.page:'?'})()`)
out.glassAfterReload=await js(`(()=>{try{const f=document.getElementById('linkedFrame');return (f.getAttribute('src')||'(nosrc)')+' -> '+(f.contentDocument?.querySelector('.machine')?.dataset.mscreen||'(none)')}catch(e){return 'X:'+e.message}})()`)
out.glassVisiblyReady=await js(`document.getElementById('linkedFrame')?.classList.contains('is-ready')`)
out.errors=errs.slice(0,6)
console.log(JSON.stringify(out,null,1))
ws.close();chrome.kill()
