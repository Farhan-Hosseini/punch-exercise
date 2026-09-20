import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'; import { join } from 'node:path'
const port = 9400 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'ap'+port)}`,'--window-size=1440,1000','about:blank'],{stdio:'ignore'})
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t; for (let i=0;i<90&&!t;i++){ try{ t=(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page') }catch{ await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map(); const errs=[]
ws.addEventListener('message',(e)=>{ const m=JSON.parse(e.data)
  if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}
  else if(m.method==='Runtime.exceptionThrown')errs.push(m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text) })
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async(e)=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(5500)

// 1. the DS video list: does the apostrophe field render intact?
await js(`window.showcase.mode('ds'); 1`); await sleep(2500)
const dsv = await js(`(()=>{
  const b=[...document.querySelectorAll('[data-ds-vid]')]
  const apos=b.map(x=>x.getAttribute('aria-label')||'').filter(s=>s.includes("'"))
  const one=b.find(x=>(x.getAttribute('aria-label')||'').includes("'"))
  return JSON.stringify({ videoButtons:b.length, labelsWithApostrophe:apos,
    outerHTMLsnippet: one? one.outerHTML.slice(0,190):null,
    strayAttrs: one? [...one.attributes].map(a=>a.name):null })})()`)

// 2. actually try to inject through the only free-text box a visitor has
await js(`window.showcase.mode('mobile'); 1`); await sleep(1500)
const xss = await js(`(async()=>{
  window.__pwn=0
  const go=(n)=>window.showcase&&window.showcase.page&&window.showcase.page(n)
  try{ go('reel') }catch(e){}
  await new Promise(r=>setTimeout(r,1800))
  const cbtn=document.querySelector('[data-ract="comment"]')
  if(!cbtn) return JSON.stringify({note:'no comment button found'})
  cbtn.click(); await new Promise(r=>setTimeout(r,900))
  const inp=document.getElementById('mReelComInput')
  if(!inp) return JSON.stringify({note:'no comment input'})
  const payloads=["<img src=x onerror=window.__pwn=1>","' onmouseover='window.__pwn=2","\\"><script>window.__pwn=3<\/script>"]
  const rendered=[]
  for(const p of payloads){
    inp.value=p; inp.dispatchEvent(new Event('input',{bubbles:true}))
    inp.form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))
    await new Promise(r=>setTimeout(r,500))
  }
  const list=document.getElementById('mReelComList')
  const imgs=list?list.querySelectorAll('img[src="x"]').length:-1
  const html=list?list.innerHTML.slice(0,600):''
  const texts=list?[...list.querySelectorAll('p')].slice(0,4).map(p=>p.textContent):[]
  return JSON.stringify({ pwn:window.__pwn, injectedImgTags:imgs, firstTexts:texts, htmlHead:html.slice(0,400) })
})()`)
console.log('--- DS video labels ---'); console.log(dsv)
console.log('--- XSS attempt via comment box ---'); console.log(xss)
console.log('--- page errors ---', JSON.stringify(errs.slice(0,6)))
ws.close(); chrome.kill()
