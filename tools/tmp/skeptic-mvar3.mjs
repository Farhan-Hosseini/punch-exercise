import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'; import { join } from 'node:path'
const port = 9417
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk3'+port)}`,'--window-size=1440,1000','about:blank'], { stdio: 'ignore' })
const sleep = ms => new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<120&&!t;i++){try{t=(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map()
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(3500); await js('localStorage.clear(); 1')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(6000)
await js(`window.showcase.mode('machine'); window.showcase.mscreen('countdown'); 1`); await sleep(3000)
const h = async () => createHash('md5').update((await send('Page.captureScreenshot',{format:'png'})).result.data).digest('hex').slice(0,12)
// NOISE CONTROL: two shots, same state, nothing touched
const a = await h(); await sleep(1200); const b = await h()
console.log('noise control (same state, 1.2s apart):', a, b, 'identical:', a === b)
// capture the variant the app actually dispatches on the mscreen event
console.log('dispatched opts.variant / opts.design for each screen:', await js(`JSON.stringify((() => {
  const seen = {}
  const on = (e) => { seen[e.detail.key] = { variant: e.detail.opts.variant, design: e.detail.opts.design } }
  document.addEventListener('mscreen', on)
  for (const k of ['default','attract','scan','countdown','loading','result','score','record']) window.showcase.mvar(k, 3)
  document.removeEventListener('mscreen', on)
  return seen
})())`))
ws.close(); chrome.kill()
