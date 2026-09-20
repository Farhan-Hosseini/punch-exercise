import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'; import { join } from 'node:path'
const port = 9491
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk4'+port)}`,'--window-size=1440,1000','about:blank'], { stdio:'ignore' })
const sleep = ms => new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<120&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map(); let errs=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data)
  if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}
  else if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails
    errs.push((d?.exception?.description||d?.text||'').split('\n')[0]+' @ '+((d?.stackTrace?.callFrames||[])[0]?`${(d.stackTrace.callFrames[0].url||'').split('/').pop()}:${d.stackTrace.callFrames[0].lineNumber+1}`:'?'))}})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
// poison ONCE, on the first load only, so later reloads see whatever the app itself left behind
await send('Page.addScriptToEvaluateOnNewDocument',{source:
 `try{ if(!sessionStorage.getItem('poisoned')){ sessionStorage.setItem('poisoned','1'); localStorage.clear(); localStorage.setItem('punch-showcase.app.v2','{"page":"toString","device":"iphone","fitV":2}') } }catch(e){}`})
const S = `JSON.stringify({pagesOn:document.querySelectorAll('.m-page.is-on').length, punchApp:typeof window.punchApp, stored:localStorage.getItem('punch-showcase.app.v2'), phoneText:((document.querySelector('.m-app')||{}).innerText||'').trim().length})`
const out={}
errs=[]
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(7000)
out['1 poisoned boot'] = JSON.parse(await js(S))
// a visitor taps the phone's bottom nav once
out['2 after ONE nav tap'] = JSON.parse(await js(`(async()=>{const s=m=>new Promise(r=>setTimeout(r,m)); const n=document.querySelector('.m-nav-item'); n&&n.click(); await s(1500); return ${S}})()`))
await sleep(2500)
out['3 two seconds later (save debounce)'] = JSON.parse(await js(S))
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(7000)
out['4 reload after the tap'] = JSON.parse(await js(S))
out.errors=[...new Set(errs)].slice(0,6)
// and a control: poisoned boot where the visitor taps nothing, reloaded twice
await js(`sessionStorage.clear(); localStorage.setItem('punch-showcase.app.v2','{"page":"__proto__","device":"iphone","fitV":2}'); sessionStorage.setItem('poisoned','1'); 1`)
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(7000)
out['5 no-tap reload A'] = JSON.parse(await js(S))
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(7000)
out['6 no-tap reload B'] = JSON.parse(await js(S))
console.log(JSON.stringify(out,null,1))
ws.close(); chrome.kill()
