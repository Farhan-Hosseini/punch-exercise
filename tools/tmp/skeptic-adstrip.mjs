import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9400 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1440,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
let t; for (let i=0;i<90&&!t;i++){ try { t=(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r, { once: true }))
let id=0; const pend=new Map(); const errs=[]
ws.addEventListener('message',e=>{ const m=JSON.parse(e.data)
  if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}
  else if(m.method==='Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text)
  else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error') errs.push(m.params.args.map(a=>a.value||a.description).join(' ')) })
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(5500)
await js(`window.showcase.mode('machine'); 1`); await sleep(2500)
console.log(await js(`JSON.stringify((()=>{
  const ads=[...document.querySelectorAll('#machine .ms-ad')]
  const vis=ads.filter(a=>{const b=a.getBoundingClientRect();const cs=getComputedStyle(a);return b.width>0&&b.height>0&&cs.display!=='none'&&cs.visibility!=='hidden'})
  const screens=[...document.querySelectorAll('#machine .mscreen')].length
  const one=ads[0]&&ads[0].getBoundingClientRect()
  return { mscreens: screens, adStripsInDOM: ads.length, adStripsWithBox: vis.length,
           firstAdBox: one?{w:Math.round(one.width),h:Math.round(one.height)}:null,
           holeComments: document.documentElement.innerHTML.split('<!-- missing').length-1 }
})())`, 1))
console.log('page errors:', JSON.stringify(errs.slice(0,6)))
ws.close(); chrome.kill()
