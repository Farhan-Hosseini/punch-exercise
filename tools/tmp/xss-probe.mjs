import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'; import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'xp'+port)}`,'--window-size=1440,1000','about:blank'],{stdio:'ignore'})
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<90&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map(); const errs=[]
ws.addEventListener('message',(e)=>{const m=JSON.parse(e.data)
  if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}
  else if(m.method==='Runtime.exceptionThrown')errs.push(m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text)})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async(e)=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(5500)
await js(`window.showcase.mode('mobile'); 1`); await sleep(2000)
const nav = await js(`JSON.stringify([...document.querySelectorAll('.m-nav-item,[data-page]')].map(b=>b.dataset.page).filter(Boolean).slice(0,20))`)
console.log('pages:', nav)
const out = await js(`(async()=>{
  window.__pwn=0
  const cands=[...document.querySelectorAll('[data-page]')].filter(b=>b.dataset.page==='reel')
  for(const c of cands){ c.click(); await new Promise(r=>setTimeout(r,600)) }
  await new Promise(r=>setTimeout(r,2500))
  window.__dbg={cands:cands.length, onPage:document.querySelector('.m-page.is-on')?.dataset.page||null, comBtns:document.querySelectorAll('[data-ract=\"comment\"]').length}
  const cbtn=document.querySelector('.m-reel-slide.is-on [data-ract="comment"]')||document.querySelector('[data-ract="comment"]')
  if(!cbtn) return JSON.stringify({step:'no comment button',dbg:window.__dbg})
  cbtn.click(); await new Promise(r=>setTimeout(r,1200))
  const inp=document.getElementById('mReelComInput')
  if(!inp) return JSON.stringify({step:'no input'})
  const payloads=["<img src=x onerror=window.__pwn=1>","XX' onmouseover='window.__pwn=2","YY\\"><b>bold</b>"]
  for(const p of payloads){
    inp.value=p; inp.dispatchEvent(new Event('input',{bubbles:true}))
    inp.closest('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))
    await new Promise(r=>setTimeout(r,450))
  }
  const list=document.getElementById('mReelComList')
  return JSON.stringify({
    pwn:window.__pwn,
    injectedImg:list.querySelectorAll('img[src="x"]').length,
    injectedBold:list.querySelectorAll('b > b, p b').length,
    firstThreeTexts:[...list.querySelectorAll('p')].slice(0,3).map(p=>p.textContent),
    firstLiHTML:list.querySelector('li')?list.querySelector('li').innerHTML.slice(0,320):null
  })
})()`)
console.log('--- comment-box injection result ---'); console.log(out)
console.log('--- errors ---', JSON.stringify(errs.slice(0,5)))
ws.close(); chrome.kill()
