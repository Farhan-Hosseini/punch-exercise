import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'; import { join } from 'node:path'
const url = process.argv[2]
const nav = process.argv[3] || ''
const port = 9433 + Math.floor(Math.random()*40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--no-first-run','--allow-file-access-from-files',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'ac'+port)}`,'--window-size=1440,1000','about:blank'], { stdio:'ignore' })
const sleep = ms => new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<90&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map()
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('DOM.enable'); await send('Autofill.enable')
await send('Page.navigate',{url}); await sleep(nav?6000:1500)
if (nav) { await js(nav); await sleep(2000) }
await js(`document.getElementById('payCardNo').focus(); 1`); await sleep(400)
const frameId = (await send('Page.getFrameTree')).result.frameTree.frame.id
const doc = await send('DOM.getDocument',{depth:1})
const q = await send('DOM.querySelector',{nodeId: doc.result.root.nodeId, selector:'#payCardNo'})
const trig = await send('Autofill.trigger', { fieldId: q.result.nodeId, frameId, card: { number:'4444333322221111', name:'Sara Malik', expiryMonth:'12', expiryYear:'2030', cvc:'123' } })
await sleep(1500)
console.log(url.slice(0,60), '->', JSON.stringify(trig.result||trig.error), await js(`JSON.stringify({no:payCardNo.value,exp:payCardExp.value,cvc:payCardCvc.value})`))
ws.close(); chrome.kill()
