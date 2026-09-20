import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9411
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1440,1000','about:blank'],{stdio:'ignore'})
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
let t
for(let i=0;i<90&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const pend=new Map();const errs=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}else if(m.method==='Runtime.exceptionThrown')errs.push(m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text)})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable');await send('Page.enable')
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(4000)
await js('try{localStorage.clear()}catch{};1')
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(5500)
await js(`window.showcase.mode('ds');1`);await sleep(2500)
// scroll the whole ds tab so lazy sections run
await js(`(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=700){scrollTo(0,y);await new Promise(r=>setTimeout(r,60))}scrollTo(0,0);return 1})()`)
await sleep(3000)
const res = JSON.parse(await js(`JSON.stringify((()=>{
  const all=[...document.querySelectorAll('a[href]')]
  const bad=all.filter(a=>!/^https?:$/.test(a.protocol)&&a.getAttribute('href')&&!a.getAttribute('href').startsWith('#'))
  const ph=[...document.querySelectorAll('[data-ds-photos] a[href]')]
  const vd=[...document.querySelectorAll('[data-ds-videos] a[href]')]
  return {
    photoCredits: ph.length,
    videoCredits: vd.length,
    photoSchemes: [...new Set(ph.map(a=>a.protocol))],
    videoSchemes: [...new Set(vd.map(a=>a.protocol))],
    jsHrefs: document.querySelectorAll('a[href^="javascript:"]').length,
    dataHrefs: document.querySelectorAll('a[href^="data:"]').length,
    nonHttpSample: bad.slice(0,5).map(a=>a.getAttribute('href')),
    sampleCredit: ph[0]? ph[0].outerHTML : null,
    sampleVid: vd[0]? vd[0].outerHTML : null
  }})())`))
console.log(JSON.stringify({res,errs:errs.slice(0,5)},null,1))
ws.close();chrome.kill()
