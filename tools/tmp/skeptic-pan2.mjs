import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'; import { join } from 'node:path'
const port = 9537
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1440,1000','about:blank'], { stdio:'ignore' })
const sleep = ms => new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<120&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map()
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(6000)

await js(`window.showcase.mode('mobile'); window.punchApp.go('checkout'); 1`); await sleep(1300)
await js(`document.querySelector('#payMethods [data-method="card"]').click(); 1`); await sleep(900)
// set values the way an autofill does: assign + fire input, so the formatter runs once
await js(`(()=>{const set=(id,v)=>{const f=document.getElementById(id);f.value=v;f.dispatchEvent(new Event('input',{bubbles:true}))};set('payCardNo','5555555555554444');set('payCardExp','1230');set('payCardCvc','737');return 1})()`)
await sleep(500)
const filled = JSON.parse(await js(`JSON.stringify({no:payCardNo.value,exp:payCardExp.value,cvc:payCardCvc.value})`))

// ABANDON: never press Pay, just walk away via the nav, the way a visitor who changed their mind does
await js(`window.punchApp.go('feed'); 1`); await sleep(1500)
const pageEl = await js(`(()=>{const el=document.getElementById('payCardNo').closest('[id]'); let p=document.getElementById('payCardNo'); while(p&&!p.matches('.m-page,[data-page]'))p=p.parentElement; return p?(p.id||p.className):'?'})()`)
const abandoned = JSON.parse(await js(`JSON.stringify((()=>{
  let p=document.getElementById('payCardNo'); while(p&&!p.matches('.m-page,[data-page]'))p=p.parentElement
  return { page:window.punchApp.page, no:payCardNo.value, exp:payCardExp.value, cvc:payCardCvc.value,
    pageId:p&&(p.id||p.className), inert:!!(p&&p.inert), ariaHidden:p&&p.getAttribute('aria-hidden'),
    fieldInertEffective: payCardNo.matches(':disabled') ? 'disabled' : (payCardNo.closest('[inert]')?'inert-ancestor':'live'),
    valueStillReadable: document.querySelector('#payCardNo').value.length }
})())`))
// 20 seconds later, still there?
await sleep(8000)
const later = JSON.parse(await js(`JSON.stringify({no:payCardNo.value,cvc:payCardCvc.value,page:window.punchApp.page})`))
console.log(JSON.stringify({ filled, pageEl, abandoned, after8s: later }, null, 1))
ws.close(); chrome.kill()
