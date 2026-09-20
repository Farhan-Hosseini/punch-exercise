import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9400 + Math.floor(Math.random()*150)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sf'+port)}`,'--window-size=1400,1000','about:blank'],{stdio:'ignore'})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<150&&!t;i++){try{t=(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const pend=new Map()
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}})
const send=(m,pr={})=>new Promise(r=>{const n=++id;const to=setTimeout(()=>{if(pend.has(n)){pend.delete(n);r({})}},25000);pend.set(n,v=>{clearTimeout(to);r(v)});ws.send(JSON.stringify({id:n,method:m,params:pr}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
const jj=async e=>{const v=await js(`JSON.stringify((()=>{${e}})())`);try{return JSON.parse(v)}catch{return{RAW:v}}}
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride',{width:768,height:900,deviceScaleFactor:1,mobile:false})
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(4500)
await js('localStorage.clear(); 1')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(7000)
await js(`window.showcase.mode('animation'); 1`); await sleep(5000)
const M = `const de=document.documentElement; return { layout: document.querySelector('.phone-stage').dataset.animLayout, over: de.scrollWidth-de.clientWidth, extraW: Math.round(document.querySelector('.anim-extra').getBoundingClientRect().width), tracks: getComputedStyle(document.querySelector('.phone-stage')).gridTemplateColumns }`
console.log('AS SHIPPED   ', JSON.stringify(await jj(M)))
// A: the reporter's fix -- widen the container query only
await js(`const s=document.createElement('style'); s.id='fixA'; s.textContent='@container (max-width: 800px){ .anim-clips{grid-template-columns:minmax(0,1fr)} .anim-fig-master{display:none} .anim-piece-tall{grid-template-columns:minmax(0,1fr)} .anim-beats > div{grid-template-columns:minmax(0,1fr)} .anim-tall-text{position:static} .anim-fig-tall{width:min(100%,320px);justify-self:center} .anim-old{grid-template-columns:minmax(0,1fr);gap:20px} }'; document.head.appendChild(s); 1`)
await sleep(1200)
console.log('FIX A (cq800)', JSON.stringify(await jj(M)))
await js(`document.getElementById('fixA').remove(); 1`); await sleep(800)
// B: the gap-accounting fix -- what app.js would have chosen counting all three gaps
await js(`document.querySelector('.phone-stage').dataset.animLayout='stack'; 1`); await sleep(1500)
console.log('FIX B (stack)', JSON.stringify(await jj(M)))
try{ws.close()}catch{}; chrome.kill(); process.exit(0)
