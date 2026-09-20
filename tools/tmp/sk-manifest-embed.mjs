import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9900 + Math.floor(Math.random()*90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'ske'+port)}`,'--window-size=1440,1000','about:blank'],{stdio:'ignore'})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<120&&!t;i++){ try{ t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page') }catch{ await sleep(150) } }
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map(); let man=[]; const errs=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data)
 if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);return}
 if(m.method==='Network.requestWillBeSent'&&/manifest\.json/.test(m.params.request.url)){ man.push({u:m.params.request.url.replace('http://localhost:5770/',''),f:m.params.frameId, top:(m.params.initiator?.stack?.callFrames||[])[0]?.url?.replace('http://localhost:5770/','')+':'+(((m.params.initiator?.stack?.callFrames||[])[0]?.lineNumber??-1)+1)}) }
 if(m.method==='Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text)
})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable'); await send('Network.clearBrowserCache')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(7000)
console.log('after initial load:', man.length, 'manifest requests'); man.forEach(x=>console.log('  ',x.u,'<-',x.top))
man=[]
await js(`window.showcase.mode('animation'); 1`); await sleep(7000)
console.log('\nafter switching to the animation tab (iframe ?embed=machine):', man.length, 'NEW manifest requests'); man.forEach(x=>console.log('  ',x.u,'<-',x.top))
man=[]
await js(`window.showcase.mode('ds'); 1`); await sleep(4000)
console.log('\nafter opening the design system tab:', man.length, 'NEW manifest requests')
console.log('js errors:', errs.slice(0,5))
// how long does parsing the 104 KB manifest take, twice?
console.log('parse timing:', await js(`(async()=>{const r=await fetch('assets/photos/lib/manifest.json');const txt=await r.text();const t0=performance.now();JSON.parse(txt);const t1=performance.now();return JSON.stringify({bytes:txt.length, parseMs:+(t1-t0).toFixed(2), entries:JSON.parse(txt).length})})()`))
ws.close(); chrome.kill()
