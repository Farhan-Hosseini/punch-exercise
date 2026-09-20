import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1440,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x)=>x.type==='page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r)=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map(); const errs=[]; const net=[]
ws.addEventListener('message',(e)=>{const m=JSON.parse(e.data)
  if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}
  else if(m.method==='Runtime.exceptionThrown')errs.push(String(m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text).slice(0,160))
  else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errs.push(m.params.args.map(a=>a.value||a.description).join(' ').slice(0,160))
  else if(m.method==='Network.responseReceived'){const s=m.params.response.status; if(s>=400) net.push(s+' '+m.params.response.url)}
  else if(m.method==='Network.loadingFailed') net.push('FAIL '+(m.params.errorText||''))
})
const send=(m,p={})=>new Promise((r)=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async(e)=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(3500)
await js('localStorage.clear(); 1')
net.length=0; errs.length=0
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(6000)
const phase={}
phase.load={net:[...net],errs:[...errs]}
for(const mode of ['mobile','machine','animation','ds']){
  net.length=0;errs.length=0
  await js(`window.showcase.mode('${mode}'); 1`); await sleep(3000)
  await js(`scrollTo(0, document.body.scrollHeight); 1`); await sleep(1500)
  phase[mode]={net:[...net],errs:[...errs]}
}
// hash route on a fresh load
net.length=0;errs.length=0
await send('Page.navigate',{url:'http://localhost:5770/#case'}); await sleep(6000)
phase.hashCase={net:[...net],errs:[...errs],caseOpen:await js(`(()=>{const c=document.getElementById('case');return c?getComputedStyle(c).display+'/'+(c.classList.contains('open')||c.hasAttribute('open')||c.getAttribute('aria-hidden')):'no #case'})()`),url:await js('location.href')}
// embed query
net.length=0;errs.length=0
await send('Page.navigate',{url:'http://localhost:5770/?embed=machine'}); await sleep(6000)
phase.embed={net:[...net],errs:[...errs],hasMachine:await js(`!!document.querySelector('.machine, #machine, [data-mode="machine"]')`)}
console.log(JSON.stringify(phase,null,1))
ws.close(); chrome.kill()
