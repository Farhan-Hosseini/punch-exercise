import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9413
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk2'+port)}`,'--window-size=1440,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i=0;i<120&&!t;i++){try{t=(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map(); const errs=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)} else if(m.method==='Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text)})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(6000)
await js(`window.showcase.mode('machine'); 1`); await sleep(1500)

console.log('--- every machine screen: does it have psec sections (so the legacy row is unreachable BY DESIGN)? ---')
for (const k of ['default','attract','scan','countdown','loading','result','score','record']) {
  const secs = await js(`JSON.stringify(window.showcase.sections('machine','${k}').map(s=>s.key+':'+s.names.length))`)
  console.log(`  ${k.padEnd(10)} sections=${secs}`)
}

console.log('\n--- does a polluted mvar change ANY pixel? screenshot hash with clean vs polluted mvar ---')
const grab = async () => (await send('Page.captureScreenshot', { format: 'png' })).result.data.length
await js(`window.showcase.mscreen('scan'); 1`); await sleep(2500)
const clean = await grab()
await js(`localStorage.setItem('punch-showcase.v5', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('punch-showcase.v5')), { mvar: { scan: 7, attract: 99, result: -4 }, mode:'machine', mscreen:'scan' }))); 1`)
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(6000)
await js(`window.showcase.mode('machine'); window.showcase.mscreen('scan'); 1`); await sleep(2500)
const dirty = await grab()
console.log('  clean screenshot bytes:', clean, ' polluted-mvar screenshot bytes:', dirty, ' identical:', clean === dirty)
console.log('  mvar read back after reload:', await js(`JSON.stringify(JSON.parse(localStorage.getItem('punch-showcase.v5')).mvar)`))
console.log('  visible screen:', await js(`(document.querySelector('.mscreen:not([hidden])')||{dataset:{}}).dataset.mscreen`))
console.log('  uncaught errors:', JSON.stringify(errs.slice(0,6)))
ws.close(); chrome.kill()
