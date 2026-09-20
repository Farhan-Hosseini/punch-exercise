import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'; import { join } from 'node:path'
const port = 9485, udd = join(tmpdir(),'sk'+port)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${udd}`,'--window-size=1600,1100','about:blank'], { stdio:'ignore' })
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<120&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map(); let errs=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data)
 if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}
 else if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails; errs.push({msg:(d.exception?.description||d.text||'').split('\n')[0], frames:(d.stackTrace?.callFrames||[]).slice(0,5).map(f=>`${f.functionName||'(anon)'}@${f.lineNumber+1}:${f.columnNumber}`)})}})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
const V5=o=>`localStorage.setItem('punch-showcase.v5', JSON.stringify(Object.assign({variant:'arena',appearance:'dark',typeface:'arena',viewV:3,sets:{},layout:{},mode:'mobile',logo:'fist',mscreen:'default',mvar:{},backdrop:'glow',decimals:'on',scoreV:2}, ${JSON.stringify(o)})))`
const snap=`(()=>{const cs=getComputedStyle(document.documentElement);const g=n=>cs.getPropertyValue(n).trim();
 const vis=s=>{const e=document.querySelector(s);if(!e)return 'missing';return e.hidden?'hidden':'shown'};
 return JSON.stringify({glow:g('--glow'),r:g('--r'),space:g('--space'),ctaInk:g('--cta-ink'),accent:g('--accent-amt'),
  slots:['ranks','stats','video','clips','photo','sponsor'].map(k=>k+'='+vis('[data-slot="'+k+'"]')).join(' '),
  savedVariant:(JSON.parse(localStorage.getItem('punch-showcase.v5')||'{}')).variant })})()`
const out={}
for (const [name,poison] of [['clean','1'],['variant=__proto__',V5({variant:'__proto__'})]]) {
  await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(2500)
  await js(`localStorage.clear(); ${poison}; 1`); errs=[]
  await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(6500)
  out[name]={snap:JSON.parse(await js(snap)||'{}'), errors:errs}
}
console.log(JSON.stringify(out,null,1))
ws.close(); chrome.kill(); await sleep(800); try{await rm(udd,{recursive:true,force:true})}catch{}
