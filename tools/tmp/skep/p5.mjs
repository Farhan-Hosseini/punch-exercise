import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'; import { join } from 'node:path'
import { writeFileSync } from 'node:fs'
const port = 9473
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--remote-debugging-port='+port,'--user-data-dir='+join(tmpdir(),'sk'+port),'--window-size=1400,1000','about:blank'], { stdio:'ignore' })
const sleep = ms => new Promise(r=>setTimeout(r,ms))
let list; for(let i=0;i<120&&!list;i++){try{list=await (await fetch('http://127.0.0.1:'+port+'/json')).json()}catch{await sleep(150)}}
function attach(target){
  const ws = new WebSocket(target.webSocketDebuggerUrl); const pend=new Map(); let id=0
  const ready = new Promise(r=>ws.addEventListener('open',r,{once:true}))
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}})
  const send=async(m,p={})=>{await ready; return new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})}
  const js=async e=>{const r=await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true}); if(r.result?.exceptionDetails) return 'ERR:'+String(r.result.exceptionDetails.exception?.description||r.result.exceptionDetails.text); return r.result?.result?.value}
  return { ws, send, js }
}
const aT = await (await fetch('http://127.0.0.1:'+port+'/json/new?chrome://autofill-internals',{method:'PUT'})).json()
await sleep(2500); const A = attach(aT); await A.send('Runtime.enable')
const bT = await (await fetch('http://127.0.0.1:'+port+'/json/new?http://localhost:5770/',{method:'PUT'})).json()
const B = attach(bT); await B.send('Runtime.enable'); await B.send('Page.enable')
await sleep(7000)
// inject two CONTROL blocks on the same origin, same page
await B.js("(function(){var d=document.createElement('div'); d.id='ctrlwrap'; d.style.cssText='position:fixed;left:8px;top:8px;z-index:99999;background:#fff'; d.innerHTML='<label>Card number<input id=\"ctlOffNo\" type=\"text\" autocomplete=\"off\" data-1p-ignore data-lpignore=\"true\" data-form-type=\"other\"></label><label>Expiry<input id=\"ctlOffExp\" type=\"text\" autocomplete=\"off\" data-1p-ignore></label><label>Security code<input id=\"ctlOffCvc\" type=\"text\" autocomplete=\"off\" data-1p-ignore></label><label>Nickname<input id=\"ctlNeutA\" type=\"text\" autocomplete=\"off\"></label><label>Valid until<input id=\"ctlNeutB\" type=\"text\" autocomplete=\"off\"></label><label>Passphrase hint<input id=\"ctlNeutC\" type=\"text\" autocomplete=\"off\"></label>'; document.body.appendChild(d); return 1})()")
await sleep(1200)
const r = JSON.parse(await B.js("JSON.stringify((function(){var e=document.getElementById('ctlOffNo').getBoundingClientRect(); return {x:e.x+e.width/2,y:e.y+e.height/2}})())"))
await B.send('Input.dispatchMouseEvent',{type:'mousePressed',x:r.x,y:r.y,button:'left',clickCount:1})
await B.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:r.x,y:r.y,button:'left',clickCount:1})
await sleep(1000)
await B.send('Input.dispatchKeyEvent',{type:'keyDown',text:'4',key:'4'}); await B.send('Input.dispatchKeyEvent',{type:'keyUp',key:'4'})
await sleep(3000)
const txt = String(await A.js("document.body.innerText"))
writeFileSync('C:/Claude Database/punch-exercise/tools/tmp/skep/internals-control.txt', txt)
const NL = String.fromCharCode(10)
const lines = txt.split(NL)
const idx = []
lines.forEach((l,i)=>{ if(/ctlOffNo|ctlOffExp|ctlOffCvc|ctlNeutA|ctlNeutB|ctlNeutC/.test(l)) idx.push(i) })
const ctl = idx.map(i=>lines.slice(i,i+3).join(' >> ').replace(/\t/g,' ')).slice(0,40)
console.log(JSON.stringify({ controlLines: [...new Set(ctl)] },null,1).slice(0,5000))
A.ws.close(); B.ws.close(); chrome.kill()
