import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9200 + Math.floor(Math.random() * 150)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sx'+port)}`,'--window-size=1400,1000','about:blank'], { stdio:'ignore' })
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms))
let t
for (let i=0;i<150&&!t;i++){try{t=(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map()
ws.addEventListener('message',(e)=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}})
const send=(m,pr={})=>new Promise(r=>{const n=++id;const to=setTimeout(()=>{if(pend.has(n)){pend.delete(n);r({})}},25000);pend.set(n,v=>{clearTimeout(to);r(v)});ws.send(JSON.stringify({id:n,method:m,params:pr}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
const jj=async e=>{const v=await js(`JSON.stringify((()=>{${e}})())`);try{return JSON.parse(v)}catch{return{RAW:v}}}
mkdirSync('build/narrow',{recursive:true})
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride',{width:768,height:900,deviceScaleFactor:1,mobile:false})
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(4500)
await js('localStorage.clear(); 1')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(7000)
await js(`window.showcase.mode('animation'); 1`); await sleep(5000)
// can the reader actually scroll sideways?
console.log('SCROLLX', JSON.stringify(await jj(`scrollTo(999,0); return { scrollX: Math.round(scrollX), maxX: document.documentElement.scrollWidth - document.documentElement.clientWidth }`)))
await js('scrollTo(0,0); 1'); await sleep(300)
// what is cut off at the right edge of the presentation clip?
console.log('CLIPS', JSON.stringify(await jj(`
  const o=[]; for (const el of document.querySelectorAll('.anim-clip, .anim-fig, .anim-clips, .anim-piece-tall, .anim-beats > div')) {
    const b=el.getBoundingClientRect(); if(!el.getClientRects().length) continue
    o.push([el.className.split(' ').slice(0,2).join('.'), Math.round(b.left), Math.round(b.right), Math.round(b.width)]) }
  return o.slice(0,14)`), null, 1))
// full-page screenshot of the spilling region
const m = await send('Page.getLayoutMetrics')
await js('scrollTo(0, 1150); 1'); await sleep(1200)
let s = await send('Page.captureScreenshot',{format:'png'})
if (s.result?.data) writeFileSync('build/narrow/sk-run-768.png', Buffer.from(s.result.data,'base64'))
// and a clip-region shot wider than the viewport to show what sits beyond 768
s = await send('Page.captureScreenshot',{format:'png', clip:{x:0,y:1150,width:800,height:700,scale:1}, captureBeyondViewport:true})
if (s.result?.data) writeFileSync('build/narrow/sk-run-768-wide.png', Buffer.from(s.result.data,'base64'))
console.log('metrics', JSON.stringify(m.result?.cssContentSize || m.result?.contentSize))
try{ws.close()}catch{}
chrome.kill(); process.exit(0)
