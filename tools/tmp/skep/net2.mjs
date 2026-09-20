import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = Number(process.argv[2] || 1440), H = Number(process.argv[3] || 900)
const WAIT = Number(process.argv[4] || 9000)
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-color-profile=srgb','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,`--window-size=${W},${H}`,'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
let t
for (let i=0;i<150 && !t;i++){ try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r, { once:true }))
let id=0; const pend=new Map(); const req=new Map(); const errs=[]
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  const p = m.params
  if (m.method==='Network.requestWillBeSent') req.set(p.requestId, { url:p.request.url, type:p.type, enc:0, t0:p.timestamp })
  else if (m.method==='Network.responseReceived'){ const r=req.get(p.requestId); if(r){ r.type=p.type; r.status=p.response.status; r.hdr=p.response.headers } }
  else if (m.method==='Network.loadingFinished'){ const r=req.get(p.requestId); if(r) r.enc=p.encodedDataLength }
  else if (m.method==='Network.loadingFailed'){ const r=req.get(p.requestId); if(r) r.failed=p.errorText }
  else if (m.method==='Runtime.exceptionThrown') errs.push(p.exceptionDetails?.exception?.description||p.exceptionDetails?.text)
})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Network.setCacheDisabled',{cacheDisabled:true})
await send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:1,mobile:false})
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(4000)
await js('localStorage.clear(); sessionStorage.clear(); 1')
req.clear(); errs.length=0
const t0 = Date.now()
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(WAIT)
const rows=[...req.values()]
const sum=a=>a.reduce((s,r)=>s+(r.enc||0),0)
const byType={}; for(const r of rows){ const k=r.type||'Other'; byType[k]=byType[k]||{n:0,b:0}; byType[k].n++; byType[k].b+=r.enc||0 }
// DOM facts
const dom = await js(`(()=>{const imgs=[...document.querySelectorAll('img')];
 const vis=imgs.filter(i=>{const r=i.getBoundingClientRect(); return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth});
 return JSON.stringify({nodes:document.getElementsByTagName('*').length, imgs:imgs.length,
  eager:imgs.filter(i=>i.loading!=='lazy').length, lazy:imgs.filter(i=>i.loading==='lazy').length,
  complete:imgs.filter(i=>i.complete&&i.naturalWidth>0).length,
  inViewport:vis.length, scrollY:scrollY, docH:document.documentElement.scrollHeight, mode:document.documentElement.dataset.mode||document.body.dataset.mode||'?',
  loaderDone: !!document.getElementById('loader')?.classList.contains('is-done')})})()`)
await writeFile('tools/tmp/skep/net2.json', JSON.stringify({ W,H,WAIT, elapsed:Date.now()-t0, count:rows.length, bytes:sum(rows), byType,
  top: rows.slice().sort((a,b)=>b.enc-a.enc).slice(0,25).map(r=>({b:r.enc,t:r.type,u:r.url.replace('http://localhost:5770/','')})),
  images: rows.filter(r=>r.type==='Image').sort((a,b)=>b.enc-a.enc).map(r=>({b:r.enc,u:r.url.replace('http://localhost:5770/','')})),
  notOk: rows.filter(r=>(r.status&&r.status>=400)||r.failed).map(r=>({u:r.url,s:r.status,f:r.failed})),
  encHdr: rows.find(r=>r.url.endsWith('/'))?.hdr, errs, dom: JSON.parse(dom||'{}') }, null, 1))
console.log(JSON.stringify({count:rows.length,bytes:sum(rows),byType,dom:JSON.parse(dom||'{}'),errs:errs.slice(0,5)},null,1))
ws.close(); chrome.kill()
