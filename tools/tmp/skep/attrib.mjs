import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9300 + Math.floor(Math.random()*90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'at'+port)}`,'--window-size=1440,900','about:blank'],{stdio:'ignore'})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<150&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map()
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>{const r=await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true}); if(r.result?.exceptionDetails)console.error(JSON.stringify(r.result.exceptionDetails).slice(0,400)); return r.result?.result?.value}
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(9000)
const fetched = JSON.parse(await readFile('tools/tmp/skep/net2.json','utf8')).images.map(r=>r.u)
const out = await js(`(()=>{
  const want=new Set(${JSON.stringify(fetched)});
  const imgs=[...document.querySelectorAll('img')];
  const uniq=new Set(imgs.map(i=>i.getAttribute('src')).filter(Boolean));
  const owner=(el)=>{let n=el;while(n&&n!==document.body){if(n.id)return '#'+n.id;n=n.parentElement}return '(body)'};
  const byUrl={};
  for(const i of imgs){const s=i.getAttribute('src'); if(!s||!want.has(s))continue;
    (byUrl[s]=byUrl[s]||{n:0,eager:0,owners:new Set()});
    byUrl[s].n++; if(i.loading!=='lazy')byUrl[s].eager++; byUrl[s].owners.add(owner(i));}
  const res={}; for(const k in byUrl) res[k]={n:byUrl[k].n,eager:byUrl[k].eager,owners:[...byUrl[k].owners]};
  // hidden-ness of each owner root
  const roots={}; for(const el of document.querySelectorAll('[id]')){const cs=getComputedStyle(el); if(cs.display==='none')roots['#'+el.id]='display:none'; }
  return JSON.stringify({uniqSrc:uniq.size, totalImgs:imgs.length, res, hiddenRoots:roots},null,1)
})()`)
await writeFile('tools/tmp/skep/attrib.json', out)
const d=JSON.parse(out)
console.log('unique img src in DOM:', d.uniqSrc, ' total <img>:', d.totalImgs)
const bytes=Object.fromEntries(JSON.parse(await readFile('tools/tmp/skep/net2.json','utf8')).images.map(r=>[r.u,r.b]))
let eagerB=0, lazyOnlyB=0, notInDom=0
const byOwner={}
for(const u of fetched){ const r=d.res[u]; const b=bytes[u]||0
  if(!r){ notInDom+=b; continue }
  if(r.eager>0){ eagerB+=b; for(const o of r.owners) byOwner[o]=(byOwner[o]||0)+b/r.owners.length } else lazyOnlyB+=b }
console.log('fetched bytes where at least one <img> is EAGER:', eagerB)
console.log('fetched bytes where every <img> is loading=lazy :', lazyOnlyB)
console.log('fetched bytes with no matching <img> (css/js)   :', notInDom)
console.log('eager bytes by owner root:'); console.log(Object.entries(byOwner).sort((a,b)=>b[1]-a[1]).map(([k,v])=>String(Math.round(v)).padStart(9)+'  '+k+(d.hiddenRoots[k]?'   ['+d.hiddenRoots[k]+']':'')).join('\n'))
ws.close(); chrome.kill()
