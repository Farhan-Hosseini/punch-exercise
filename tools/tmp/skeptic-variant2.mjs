import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'; import { join } from 'node:path'
const port = 9483
const udd = join(tmpdir(),'sk'+port)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${udd}`,'--window-size=1600,1100','about:blank'], { stdio:'ignore' })
const sleep = ms => new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<120&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map(); let errs=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data)
  if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}
  else if(m.method==='Runtime.exceptionThrown') errs.push((m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text||'').split('\n').slice(0,2).join(' | '))
  else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error') errs.push('console.error: '+m.params.args.map(a=>a.value||a.description).join(' ').split('\n')[0])})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>{const r=await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true}); return r.result?.result?.value}
await send('Runtime.enable'); await send('Page.enable')
const V5 = (o) => `localStorage.setItem('punch-showcase.v5', JSON.stringify(Object.assign({variant:'arena',appearance:'dark',typeface:'arena',viewV:3,sets:{},layout:{},mode:'mobile',logo:'fist',mscreen:'default',mvar:{},backdrop:'glow',decimals:'on',scoreV:2}, ${JSON.stringify(o)})))`

const probe = `(async () => {
  const q=s=>document.querySelector(s), R={};
  const box=s=>{const e=q(s); if(!e) return 'missing'; const b=e.getBoundingClientRect(); const cs=getComputedStyle(e); return (cs.display==='none'||cs.visibility==='hidden'||e.hidden)?'hidden':Math.round(b.width)+'x'+Math.round(b.height)};
  R.start_mode = document.documentElement.dataset.mode || null;
  // click the Machine tab like a visitor
  const mb = q('.mode[data-mode="machine"]'); if(mb) mb.click(); else R.noMachineBtn=1;
  await new Promise(z=>setTimeout(z,1500));
  R.mode_after_machine_click = document.documentElement.dataset.mode || null;
  R.machine_pressed = mb ? mb.getAttribute('aria-pressed') : null;
  R.glass = box('#glass'); R.stage = box('#stage');
  // open Customise
  const cb = q('#openCustom'); if(cb) cb.click(); else R.noCustomBtn=1;
  await new Promise(z=>setTimeout(z,1200));
  R.customPanel = box('#custom');
  R.customExpanded = cb ? cb.getAttribute('aria-expanded') : null;
  R.customRows = document.querySelectorAll('#custom .sec-row, #custom [data-sec-row], #custom .row').length;
  R.customText = ((q('#custom')||{innerText:''}).innerText||'').trim().length;
  // back to phone
  const pb = q('.mode[data-mode="mobile"]'); if(pb) pb.click();
  await new Promise(z=>setTimeout(z,1200));
  R.mode_after_phone_click = document.documentElement.dataset.mode || null;
  R.phone = box('.phone-shell') !== 'missing' ? box('.phone-shell') : box('.phone');
  return JSON.stringify(R)
})()`

const out = {}
for (const [name, poison] of [['clean','1'],['variant=__proto__',V5({variant:'__proto__'})]]) {
  await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(2500)
  await js(`localStorage.clear(); ${poison}; 1`)
  errs=[]
  await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(6500)
  const r = await js(probe)
  out[name] = { ...JSON.parse(r||'{}'), errors: [...new Set(errs)].slice(0,5), errCount: errs.length }
}
console.log(JSON.stringify(out,null,1))
ws.close(); chrome.kill(); await sleep(800); try{ await rm(udd,{recursive:true,force:true}) }catch{}
