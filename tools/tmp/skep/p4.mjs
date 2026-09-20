import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'; import { join } from 'node:path'
import { writeFileSync } from 'node:fs'
const port = 9471
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference','--remote-debugging-port='+port,'--user-data-dir='+join(tmpdir(),'sk'+port),'--window-size=1500,1100','about:blank'], { stdio:'ignore' })
const sleep = ms => new Promise(r=>setTimeout(r,ms))
const http = async p => (await (await fetch('http://127.0.0.1:'+port+p)).json())
let list; for(let i=0;i<120&&!list;i++){try{list=await http('/json')}catch{await sleep(150)}}
function attach(target){
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  const pend=new Map(); let id=0
  const ready = new Promise(r=>ws.addEventListener('open',r,{once:true}))
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}})
  const send=async(m,p={})=>{await ready; return new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})}
  const js=async e=>{const r=await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true}); if(r.result?.exceptionDetails) return 'ERR:'+String(r.result.exceptionDetails.exception?.description||r.result.exceptionDetails.text); return r.result?.result?.value}
  return { ws, send, js, ready }
}
// tab A: autofill-internals, opened FIRST so it catches the parse of the site
const aTarget = (await (await fetch('http://127.0.0.1:'+port+'/json/new?chrome://autofill-internals', {method:'PUT'})).json())
await sleep(2500)
const A = attach(aTarget); await A.send('Runtime.enable')
// tab B: the site
const bTarget = (await (await fetch('http://127.0.0.1:'+port+'/json/new?http://localhost:5770/', {method:'PUT'})).json())
const B = attach(bTarget); await B.send('Runtime.enable'); await B.send('Page.enable'); await B.send('Input.enable').catch(()=>{})
await sleep(7000)
const out = {}
await B.js("window.showcase.mode('mobile'); window.punchApp.go('checkout'); 1"); await sleep(1800)
const box = JSON.parse(await B.js("JSON.stringify((function(){var b=document.querySelector('#payMethods [data-method=\"card\"]'); var r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}})())"))
await B.send('Input.dispatchMouseEvent',{type:'mousePressed',x:box.x,y:box.y,button:'left',clickCount:1})
await B.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:box.x,y:box.y,button:'left',clickCount:1})
await sleep(1800)
const g = JSON.parse(await B.js("JSON.stringify((function(){var r=document.getElementById('payCardNo').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}})())"))
// real click into the card number field: this is what makes Chrome query autofill
await B.send('Input.dispatchMouseEvent',{type:'mousePressed',x:g.x,y:g.y,button:'left',clickCount:1})
await B.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:g.x,y:g.y,button:'left',clickCount:1})
await sleep(2500)
await B.send('Input.dispatchKeyEvent',{type:'keyDown',text:'4',key:'4'}); await B.send('Input.dispatchKeyEvent',{type:'keyUp',key:'4'})
await sleep(2500)
const logA = await A.js("document.body.innerText")
out.internalsLen = String(logA).length
const txt = String(logA)
out.mentionsCreditCard = /CREDIT_CARD/i.test(txt)
out.parsedLines = txt.split(String.fromCharCode(10)).filter(l=>/CREDIT_CARD|payCardNo|payCardExp|payCardCvc|Parsed form|FormStructure|Form parsed/i.test(l)).slice(0,60)
writeFileSync('C:/Claude Database/punch-exercise/tools/tmp/skep/internals.txt', txt)
console.log(JSON.stringify(out,null,1).slice(0,6000))
A.ws.close(); B.ws.close(); chrome.kill()
