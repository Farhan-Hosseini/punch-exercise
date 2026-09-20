import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'; import { join } from 'node:path'
const port = 9413
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1440,1000','about:blank'],{stdio:'ignore'})
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<90&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const pend=new Map()
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable');await send('Page.enable')
const PAY = encodeURIComponent('javascript:window.__pwn=1')
const out={}
for (const u of [
  `http://localhost:5770/?url=${PAY}&photographer=${PAY}#${PAY}`,
  `http://localhost:5770/?embed=machine&url=${PAY}`,
]) {
  await send('Page.navigate',{url:u}); await sleep(5000)
  await js(`window.showcase&&window.showcase.mode('ds');1`); await sleep(2000)
  await js(`(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=800){scrollTo(0,y);await new Promise(r=>setTimeout(r,50))}return 1})()`); await sleep(2500)
  out[u.slice(22,60)] = JSON.parse(await js(`JSON.stringify({
    js: document.querySelectorAll('a[href^="javascript:"]').length,
    data: document.querySelectorAll('a[href^="data:"]').length,
    credits: document.querySelectorAll('[data-ds-photos] a,[data-ds-videos] a').length,
    pwn: !!window.__pwn
  })`))
}
// can the dev server be written to? try a POST of a poisoned manifest
let post='n/a'
try{ const r=await fetch('http://localhost:5770/assets/photos/lib/manifest.json',{method:'PUT',body:'[]'}); post=`PUT -> ${r.status}` }catch(e){ post='PUT threw '+e.message }
const g = await fetch('http://localhost:5770/assets/photos/lib/manifest.json'); const txt = await g.text()
console.log(JSON.stringify({out, post, manifestStillClean: !/javascript:/i.test(txt), manifestBytes: txt.length},null,1))
ws.close();chrome.kill()
