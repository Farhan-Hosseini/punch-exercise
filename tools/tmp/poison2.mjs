import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'; import { join } from 'node:path'
const port = 9466
const udd = join(tmpdir(),'po'+port)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run',`--remote-debugging-port=${port}`,`--user-data-dir=${udd}`,'--window-size=1440,1000','about:blank'], { stdio:'ignore' })
const sleep = ms => new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<90&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map(); let errs=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data)
  if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}
  else if(m.method==='Runtime.exceptionThrown') errs.push((m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text||'').split('\n')[0])
  else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error') errs.push(m.params.args.map(a=>a.value||a.description).join(' ').split('\n')[0])})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
const V5 = (o) => `localStorage.setItem('punch-showcase.v5', JSON.stringify(Object.assign({variant:'arena',appearance:'dark',typeface:'arena',viewV:3,sets:{},layout:{},mode:'mobile',logo:'fist',mscreen:'default',mvar:{},backdrop:'glow',decimals:'on',scoreV:2}, ${JSON.stringify(o)})))`
const cases = {
  'baseline (clean)': `1`,
  'v5 variant=__proto__': V5({ variant: '__proto__' }),
  'v5 logo=__proto__': V5({ logo: '__proto__' }),
  'v5 logo=constructor': V5({ logo: 'constructor' }),
  'app.v2 page=constructor': `localStorage.setItem('punch-showcase.app.v2', JSON.stringify({page:'constructor',device:'iphone',fitV:2,credits:0}))`,
  'app.v2 page=toString': `localStorage.setItem('punch-showcase.app.v2', JSON.stringify({page:'toString',device:'iphone',fitV:2,credits:0}))`,
}
const out = {}
for (const [name, poison] of Object.entries(cases)) {
  await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(3000)
  await js(`localStorage.clear(); ${poison}; 1`)
  errs = []
  await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(6000)
  const state = await js(`JSON.stringify({ text: (document.body.innerText||'').trim().length, hasPunchApp: typeof window.punchApp, hasShowcase: typeof window.showcase, hasPSec: typeof window.PSec, onPage: (document.querySelector('.m-page.is-on')||{dataset:{}}).dataset.page || null })`)
  out[name] = { ...JSON.parse(state||'{}'), errors: [...new Set(errs)].slice(0,3) }
}
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill()
await sleep(800); try { await rm(udd, { recursive:true, force:true }) } catch {}
