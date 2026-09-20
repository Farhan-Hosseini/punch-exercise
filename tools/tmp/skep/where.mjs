import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9800 + Math.floor(Math.random()*90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'wh'+port)}`,'--window-size=1440,900','about:blank'],{stdio:'ignore'})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<150&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map()
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>{const r=await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true}); if(r.result?.exceptionDetails) console.error(JSON.stringify(r.result.exceptionDetails).slice(0,500)); return r.result?.result?.value}
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(9000)
const out = await js(`(()=>{
  const urls=${JSON.stringify(process.argv.slice(2))};
  const imgs=[...document.querySelectorAll('img')];
  const info=(el)=>{ // walk up to find the tab/overlay owner
    let n=el, chain=[]
    while(n && n!==document.body){ const id=n.id?'#'+n.id:''; const cls=(n.className&&n.className.baseVal!==undefined?n.className.baseVal:n.className||'').toString().split(/\s+/).filter(Boolean).slice(0,2).map(c=>'.'+c).join(''); chain.push(n.tagName.toLowerCase()+id+cls); n=n.parentElement }
    return chain.slice(0,6).join(' < ')
  }
  const res=[]
  for(const u of urls){
    const el=imgs.find(i=>i.currentSrc.endsWith(u)||i.getAttribute('src')===u)
    if(!el){ res.push({u, el:'NOT AN <img> (css bg / js / preload?)'}); continue }
    const r=el.getBoundingClientRect(); const cs=getComputedStyle(el)
    // offscreen-parent detection
    let hidden=null, n=el
    while(n&&n!==document.documentElement){ const c=getComputedStyle(n); if(c.display==='none'){hidden='display:none @ '+(n.id?'#'+n.id:n.tagName+'.'+String(n.className).split(' ')[0]); break} if(c.visibility==='hidden'){hidden='visibility:hidden @ '+(n.id||n.tagName); break} n=n.parentElement }
    res.push({u, loading:el.loading, natural:el.naturalWidth+'x'+el.naturalHeight, css:Math.round(r.width)+'x'+Math.round(r.height),
      inViewport: r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth&&r.width>0,
      top:Math.round(r.top), hidden, chain:info(el)})
  }
  const counts={}
  for(const i of imgs){ if(i.loading!=='lazy'){ let n=i,owner='?'; while(n&&n!==document.body){ if(n.id){owner='#'+n.id;break} n=n.parentElement } counts[owner]=(counts[owner]||0)+1 } }
  return JSON.stringify({res, eagerByOwner:counts, mode:document.body.dataset.mode||document.documentElement.dataset.mode}, null, 1)
})()`)
console.log(out)
ws.close(); chrome.kill()
