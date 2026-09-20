import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'; import { join } from 'node:path'
const port = 9531
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1440,1000','about:blank'], { stdio:'ignore' })
const sleep = ms => new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<120&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map(); const errs=[]; const posts=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data)
  if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}
  else if(m.method==='Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text)
  else if(m.method==='Network.requestWillBeSent') posts.push({url:m.params.request.url.slice(0,120), method:m.params.request.method, body:(m.params.request.postData||'').slice(0,200)})
})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(4000)
await js('localStorage.clear(); sessionStorage.clear(); 1')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(6000)

// go to checkout, pick "card", type a PAN with real keystrokes
await js(`window.showcase.mode('mobile'); window.punchApp.go('topup'); 1`); await sleep(900)
await js(`window.punchApp.go('checkout'); 1`); await sleep(1200)
const methodClicked = await js(`(()=>{const b=document.querySelector('#payMethods [data-method="card"]'); if(!b) return 'NO CARD BUTTON'; b.click(); return 'clicked'})()`)
await sleep(900)
const focused = await js(`(()=>{const f=document.getElementById('payCardNo'); f.focus(); return document.activeElement && document.activeElement.id})()`)
const typeStr = async (s) => { for (const ch of s) { await send('Input.dispatchKeyEvent',{type:'keyDown',text:ch,key:ch}); await send('Input.dispatchKeyEvent',{type:'char',text:ch}); await send('Input.dispatchKeyEvent',{type:'keyUp',key:ch}) } }
await typeStr('4111111111111111')
await js(`document.getElementById('payCardExp').focus(); 1`); await typeStr('1230')
await js(`document.getElementById('payCardCvc').focus(); 1`); await typeStr('737')
await sleep(400)
const typed = JSON.parse(await js(`JSON.stringify({no:payCardNo.value, exp:payCardExp.value, cvc:payCardCvc.value})`))

// pay
await js(`document.getElementById('payNow').click(); 1`); await sleep(6500)
const afterPay = JSON.parse(await js(`JSON.stringify({page:window.punchApp.page, no:payCardNo.value, exp:payCardExp.value, cvc:payCardCvc.value, paidWith:(document.querySelector('#mpagePaid dd')||{}).textContent})`))

// leave the checkout entirely and browse
await js(`window.punchApp.go('feed'); 1`); await sleep(1000)
await js(`window.punchApp.go('ranks'); 1`); await sleep(800)
await js(`window.punchApp.go('profile'); 1`); await sleep(800)
await js(`window.showcase.mode('ds'); 1`); await sleep(1800)
await js(`document.getElementById('openCase').click(); 1`); await sleep(2500)
await js(`document.querySelector('#case [data-close], #case .case-close, #caseClose')?.click(); 1`); await sleep(1200)
await js(`window.showcase.mode('mobile'); 1`); await sleep(1500)
const afterLeaving = JSON.parse(await js(`JSON.stringify({page:window.punchApp.page, mode:document.documentElement.dataset.mode, no:payCardNo.value, exp:payCardExp.value, cvc:payCardCvc.value, checkoutHidden: !!document.getElementById('mpageCheckout')?.hidden, offscreenAria: document.getElementById('mpageCheckout')?.getAttribute('aria-hidden')})`))

// what a content script would read with one query
const harvest = await js(`JSON.stringify([...document.querySelectorAll('input')].filter(i=>i.value).map(i=>({id:i.id, ac:i.autocomplete, v:i.value})))`)
// is it anywhere in storage?
const storage = await js(`JSON.stringify({ls: Object.entries(localStorage).map(([k,v])=>k+'='+String(v).length+'ch'), panInLS: JSON.stringify(localStorage).includes('4111'), panInSS: JSON.stringify(sessionStorage).includes('4111'), panInHTML: document.documentElement.outerHTML.includes('4111 1111') })`)

// control: does a reload clear it?
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(6000)
const afterReload = JSON.parse(await js(`JSON.stringify({no:(document.getElementById('payCardNo')||{}).value, cvc:(document.getElementById('payCardCvc')||{}).value})`))

console.log(JSON.stringify({ methodClicked, focused, typed, afterPay, afterLeaving, harvest: JSON.parse(harvest), storage: JSON.parse(storage), afterReload,
  networkWithPan: posts.filter(p=>p.body.includes('4111')||p.url.includes('4111')),
  requestCount: posts.length, errors: errs.slice(0,6) }, null, 1))
ws.close(); chrome.kill()
