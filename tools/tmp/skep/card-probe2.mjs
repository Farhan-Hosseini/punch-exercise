import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'; import { join } from 'node:path'
import { writeFileSync } from 'node:fs'
const port = 9467
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1500,1100','about:blank'], { stdio:'ignore' })
const sleep = ms => new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<120&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map(); const reqs=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data)
  if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}
  else if(m.method==='Network.requestWillBeSent') reqs.push(m.params.request.url)})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>{const r=await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true}); if(r.result?.exceptionDetails) return 'ERR:'+JSON.stringify(r.result.exceptionDetails.exception?.description||r.result.exceptionDetails.text); return r.result?.result?.value}
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable'); await send('DOM.enable')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(2500)
await js('try{localStorage.clear();sessionStorage.clear()}catch(e){}; 1')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(6500)
const out={}
await js(`window.showcase.mode('mobile'); 1`); await sleep(1500)
await js(`window.punchApp.go('checkout'); 1`); await sleep(1500)

// click "Use another card" with real CDP mouse events, at its real screen point
const box = await js(`JSON.stringify((()=>{const b=document.querySelector('#payMethods [data-method="card"]'); if(!b)return null; const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,label:b.innerText.split("\n").join(" / ")}})())`)
out.cardOptionBox = box
const b = JSON.parse(box)
await send('Input.dispatchMouseEvent',{type:'mousePressed',x:b.x,y:b.y,button:'left',clickCount:1})
await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:b.x,y:b.y,button:'left',clickCount:1})
await sleep(1600)
out.cardHiddenAfterRealClick = await js(`document.getElementById('payNewCard').hidden`)
out.focusedAfterClick = await js(`document.activeElement && document.activeElement.id`)
out.fieldGeom = await js(`JSON.stringify(['payCardNo','payCardExp','payCardCvc'].map(i=>{const e=document.getElementById(i),r=e.getBoundingClientRect();return{id:i,x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),ac:e.getAttribute('autocomplete'),form:!!e.form}}))`)
// everything a visitor reads, from the card block down
out.textFromCardBlock = await js(`(()=>{const n=document.getElementById('payNewCard'); let s=n.innerText; let e=n.nextElementSibling; let i=0; while(e&&i<4){s+='\n--\n'+e.innerText; e=e.nextElementSibling; i++} return s})()`)
// is there any prototype/demo framing visible on screen at the same time?
out.visibleDemoWords = await js(`JSON.stringify([...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect(); if(r.width<2||r.height<2||r.bottom<0||r.top>innerHeight) return false; const tx=(e.childNodes.length&&[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ')||''); return /demo|prototype|mock|not real|design task|brief|concept|fictional|exercise/i.test(tx)}).map(e=>e.tagName+'.'+(e.className||'')+' :: '+e.innerText.replace(/\s+/g,' ').slice(0,90)).slice(0,25))`)
// type a PAN with REAL key events, then look for it everywhere
await send('Input.dispatchMouseEvent',{type:'mousePressed',x:JSON.parse(out.fieldGeom)[0].x+40,y:JSON.parse(out.fieldGeom)[0].y+JSON.parse(out.fieldGeom)[0].h/2,button:'left',clickCount:1})
await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:JSON.parse(out.fieldGeom)[0].x+40,y:JSON.parse(out.fieldGeom)[0].y+JSON.parse(out.fieldGeom)[0].h/2,button:'left',clickCount:1})
for (const ch of '4111111111111111') await send('Input.dispatchKeyEvent',{type:'keyDown',text:ch,key:ch})
await sleep(500)
out.panTyped = await js(`document.getElementById('payCardNo').value`)
reqs.length=0
out.panInPageHTML = await js(`document.documentElement.outerHTML.includes('4111 1111 1111 1111') || document.documentElement.outerHTML.includes('4111111111111111')`)
out.panInStorage = await js(`JSON.stringify(Object.entries(localStorage).filter(([k,v])=>String(v).includes('4111')).concat(Object.entries(sessionStorage).filter(([k,v])=>String(v).includes('4111'))))`)
out.cookie = await js(`document.cookie`)
// screenshot the card block region
const g = JSON.parse(out.fieldGeom)
const clipY = Math.max(0, g[0].y - 230), clipH = Math.min(1100-clipY, 620)
const shot = await send('Page.captureScreenshot',{format:'png',clip:{x:Math.max(0,g[0].x-90),y:clipY,width:Math.min(720,g[0].w+220),height:clipH,scale:1.6}})
writeFileSync('C:/Claude Database/punch-exercise/tools/tmp/skep/card.png', Buffer.from(shot.result.data,'base64'))
const full = await send('Page.captureScreenshot',{format:'png'})
writeFileSync('C:/Claude Database/punch-exercise/tools/tmp/skep/full.png', Buffer.from(full.result.data,'base64'))
// now pay with the card and see what survives
await js(`document.getElementById('payCardExp').value='12 / 30'; document.getElementById('payCardExp').dispatchEvent(new Event('input',{bubbles:true})); document.getElementById('payCardCvc').value='123'; document.getElementById('payCardCvc').dispatchEvent(new Event('input',{bubbles:true})); document.getElementById('payNow').click(); 1`)
await sleep(10000)
out.afterPayPage = await js(`(document.querySelector('.m-page.is-on')||{dataset:{}}).dataset.page`)
out.panAfterPayInStorage = await js(`JSON.stringify(Object.entries(localStorage).filter(([k,v])=>String(v).includes('4111')))`)
out.panStillInInput = await js(`document.getElementById('payCardNo') ? document.getElementById('payCardNo').value : 'GONE'`)
out.offOriginReqs = reqs.filter(u=>!u.startsWith('http://localhost:5770')&&!u.startsWith('data:')&&!u.startsWith('blob:'))
out.paidText = await js(`(document.querySelector('.m-page.is-on')||document.body).innerText.slice(0,400)`)
writeFileSync('C:/Claude Database/punch-exercise/tools/tmp/skep/out2.json', JSON.stringify(out,null,1))
console.log(JSON.stringify(out,null,1).slice(0,6500))
ws.close(); chrome.kill()
