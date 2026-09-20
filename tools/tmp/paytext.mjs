import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'; import { join } from 'node:path'
const port = 9477, udd = join(tmpdir(),'pt'+port)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run',`--remote-debugging-port=${port}`,`--user-data-dir=${udd}`,'--window-size=1440,1000','about:blank'], { stdio:'ignore' })
const sleep = ms => new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<90&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map()
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(3000)
await js('localStorage.clear(); 1')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(6000)
const boot = await js(`JSON.stringify({ bootText: document.body.innerText.replace(/\s+/g,' ').slice(0,400) })`)
await js(`window.showcase.mode('mobile'); window.punchApp.go('checkout'); 1`); await sleep(1200)
await js(`document.querySelector('#payMethods [data-method="card"]').click(); 1`); await sleep(900)
const co = await js(`JSON.stringify({
  checkoutText: document.querySelector('.m-page[data-page="checkout"]').innerText.replace(/\s+/g,' '),
  inForm: !!document.getElementById('payCardNo').closest('form'),
  ancestors: (()=>{let e=document.getElementById('payCardNo'),a=[];while(e&&e!==document.body){a.push(e.tagName+(e.id?'#'+e.id:'')+(e.className?'.'+String(e.className).split(' ')[0]:''));e=e.parentElement}return a.slice(0,6)})()
})`)
console.log(JSON.parse(boot).bootText); console.log('---'); console.log(JSON.stringify(JSON.parse(co),null,1))
ws.close(); chrome.kill(); await sleep(600); try{ await rm(udd,{recursive:true,force:true}) }catch{}
