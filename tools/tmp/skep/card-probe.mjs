import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'; import { join } from 'node:path'
import { writeFileSync } from 'node:fs'
const port = 9466
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1500,1100','about:blank'], { stdio:'ignore' })
const sleep = ms => new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<120&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map(); const errs=[]; const reqs=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data)
  if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}
  else if(m.method==='Network.requestWillBeSent') reqs.push(m.params.request.url)
  else if(m.method==='Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text))
})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>{const r=await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true}); if(r.result?.exceptionDetails) return 'ERR:'+JSON.stringify(r.result.exceptionDetails.exception?.description||r.result.exceptionDetails.text); return r.result?.result?.value}
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable'); await send('DOM.enable')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(2500)
await js('try{localStorage.clear();sessionStorage.clear()}catch(e){}; 1')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(6500)

const out = {}
out.bootText = await js(`document.body.innerText.slice(0,900)`)
// go to the checkout the way a visitor would
out.modeOk = await js(`window.showcase.mode('mobile'); 1`); await sleep(1500)
out.goOk = await js(`window.punchApp.go('checkout'); 1`); await sleep(1500)
out.methodsHTML = await js(`document.getElementById('payMethods').innerText`)
out.cardHiddenBefore = await js(`document.getElementById('payNewCard').hidden`)
// click "card" the real way: a synthetic click on the radio
out.clicked = await js(`(()=>{const b=document.querySelector('#payMethods [data-method="card"]'); if(!b) return 'NO CARD OPTION'; b.click(); return b.innerText.replace(/\n/g,' | ')})()`)
await sleep(1400)
out.cardHiddenAfter = await js(`document.getElementById('payNewCard').hidden`)
out.cardBox = await js(`JSON.stringify((()=>{const r=document.getElementById('payNewCard').getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}})())`)
out.fieldsVisible = await js(`JSON.stringify(['payCardNo','payCardExp','payCardCvc'].map(i=>{const e=document.getElementById(i),r=e.getBoundingClientRect(),cs=getComputedStyle(e);return{id:i,w:Math.round(r.width),h:Math.round(r.height),vis:cs.visibility,disp:cs.display,ac:e.getAttribute('autocomplete'),form:!!e.form,p1:e.hasAttribute('data-1p-ignore'),lp:e.getAttribute('data-lpignore')}}))`)
out.focused = await js(`document.activeElement && document.activeElement.id`)
// all the text a visitor can read in the checkout screen, in order
out.checkoutText = await js(`document.querySelector('.m-page[data-page="checkout"]').innerText`)
// shell chrome around the phone
out.shellText = await js(`(()=>{const p=document.querySelector('.m-page[data-page="checkout"]'); let n=p, out=[]; while(n&&n!==document.body){n=n.parentElement} return document.body.innerText.slice(0,0)})() || [...document.querySelectorAll('header, .sh-head, nav')].map(e=>e.innerText).join(' || ').slice(0,1200)`)
// every input on the whole shipped page
out.allInputs = await js(`JSON.stringify([...document.querySelectorAll('input,textarea')].map(e=>({tag:e.tagName,id:e.id||null,type:e.type,ac:e.getAttribute('autocomplete'),name:e.name||null})))`)
// type a PAN and see where it goes
await js(`(()=>{const e=document.getElementById('payCardNo'); e.focus(); e.value='4111111111111111'; e.dispatchEvent(new Event('input',{bubbles:true})); const x=document.getElementById('payCardExp'); x.value='12 / 30'; x.dispatchEvent(new Event('input',{bubbles:true})); const c=document.getElementById('payCardCvc'); c.value='123'; c.dispatchEvent(new Event('input',{bubbles:true})); return 1})()`)
await sleep(600)
reqs.length = 0
out.typedValues = await js(`JSON.stringify({no:payCardNo.value,exp:payCardExp.value,cvc:payCardCvc.value})`)
out.storageAfterTyping = await js(`JSON.stringify({local:Object.fromEntries(Object.keys(localStorage).map(k=>[k,String(localStorage.getItem(k)).slice(0,200)])),session:Object.keys(sessionStorage),cookie:document.cookie})`)
// press Pay and run the whole flow
await js(`document.getElementById('payNow').click(); 1`); await sleep(9000)
out.afterPayPage = await js(`(document.querySelector('.m-page.is-on')||{dataset:{}}).dataset.page`)
out.afterPayText = await js(`(document.querySelector('.m-page.is-on')||document.body).innerText.slice(0,700)`)
out.storageAfterPay = await js(`JSON.stringify({local:Object.fromEntries(Object.keys(localStorage).map(k=>[k,String(localStorage.getItem(k)).slice(0,400)])),session:Object.keys(sessionStorage),cookie:document.cookie})`)
out.panInStorage = await js(`JSON.stringify(Object.entries(localStorage).filter(([k,v])=>String(v).includes('4111')))`)
out.reqsDuringPay = reqs.filter(u=>!u.startsWith('http://localhost:5770')&&!u.startsWith('data:')&&!u.startsWith('blob:'))
out.panStillInDom = await js(`document.getElementById('payCardNo') ? document.getElementById('payCardNo').value : 'GONE'`)
out.errs = errs.slice(0,10)
writeFileSync('C:/Claude Database/punch-exercise/tools/tmp/skep/out.json', JSON.stringify(out,null,1))
console.log(JSON.stringify(out,null,1).slice(0,7000))
ws.close(); chrome.kill()
