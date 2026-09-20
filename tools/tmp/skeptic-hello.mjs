import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9411
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1600,1000','about:blank'],{stdio:'ignore'})
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
let t
for(let i=0;i<90&&!t;i++){try{t=(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const pend=new Map();const errs=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data)
 if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}
 else if(m.method==='Runtime.exceptionThrown')errs.push(m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text)})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>{const r=await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true});if(r.result?.exceptionDetails)return {__err:r.result.exceptionDetails.exception?.description||r.result.exceptionDetails.text};return r.result?.result?.value}
await send('Runtime.enable');await send('Page.enable')
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(5500)
const out={}
// 1. spy on the punch-flow channel from the top document (a separate BroadcastChannel object does receive)
await js(`window.__log=[];window.__spy=new BroadcastChannel('punch-flow');window.__spy.onmessage=(e)=>window.__log.push({t:Math.round(performance.now()),d:e.data});1`)
// 2. drive the phone somewhere non-default BEFORE the glass exists
await js(`window.showcase.mode('mobile');1`);await sleep(800)
await js(`window.punchApp.go('ranks');1`);await sleep(1200)
out.afterGo_log=await js(`JSON.stringify(window.__log.map(x=>x.d.type+':'+(x.d.key||'')))`)
out.frameSrcBeforeAnim=await js(`document.getElementById('linkedFrame').getAttribute('src')`)
// 3. now open the animation tab: the glass boots LATE, long after the phone announced
await js(`window.showcase.mode('animation');1`);await sleep(7000)
out.frameSrcAfterAnim=await js(`document.getElementById('linkedFrame').getAttribute('src')`)
out.linkedGlassScreen=await js(`(()=>{try{const d=document.getElementById('linkedFrame').contentDocument;return d.querySelector('.machine')?.dataset.mscreen||'(no .machine)'}catch(e){return 'X:'+e.message}})()`)
out.phonePage=await js(`(()=>{const p=[...document.querySelectorAll('.pagebar [data-page]')].find(b=>b.getAttribute('aria-current'));return p?p.dataset.page:'?'})()`)
out.log_afterAnim=await js(`JSON.stringify(window.__log.map(x=>x.d.type+':'+(x.d.key||'')))`)
out.helloCount=await js(`window.__log.filter(x=>x.d&&x.d.type==='hello').length`)
// 4. drive the phone around with the glass up; still no hello anywhere
for(const p of ['scan','connect','feed','profile','default']){await js(`window.punchApp.go('${p}');1`);await sleep(700)}
await sleep(1500)
out.helloCount_afterDriving=await js(`window.__log.filter(x=>x.d&&x.d.type==='hello').length`)
out.totalMsgs=await js(`window.__log.length`)
out.kinds=await js(`JSON.stringify([...new Set(window.__log.map(x=>x.d&&x.d.type))])`)
// 5. is the listener itself alive? post hello from the top and see if the phone answers
await js(`window.__log.length=0;window.__spy.postMessage({type:'hello'});1`);await sleep(600)
out.replyToHello=await js(`JSON.stringify(window.__log.map(x=>x.d))`)
// 6. the claimed gap: a second follower that is NOT #linkedFrame, booted late
await js(`window.punchApp.go('ranks');1`);await sleep(1200)
await js(`(()=>{const f=document.createElement('iframe');f.id='probeFrame';f.style.cssText='position:fixed;left:-9999px;width:270px;height:960px';f.src='./?embed=machine';document.body.appendChild(f);return 1})()`)
await sleep(7000)
out.probeFrameScreen=await js(`(()=>{try{return document.getElementById('probeFrame').contentDocument.querySelector('.machine')?.dataset.mscreen||'(none)'}catch(e){return 'X:'+e.message}})()`)
out.phonePage2=await js(`(()=>{const p=[...document.querySelectorAll('.pagebar [data-page]')].find(b=>b.getAttribute('aria-current'));return p?p.dataset.page:'?'})()`)
// would a hello have rescued it?
await js(`window.__spy.postMessage({type:'hello'});1`);await sleep(900)
out.probeFrameScreen_afterHello=await js(`(()=>{try{return document.getElementById('probeFrame').contentDocument.querySelector('.machine')?.dataset.mscreen||'(none)'}catch(e){return 'X:'+e.message}})()`)
out.errors=errs.slice(0,6)
console.log(JSON.stringify(out,null,1))
ws.close();chrome.kill()
