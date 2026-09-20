import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'; import { join } from 'node:path'
const port = 9481
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1440,1000','about:blank'], { stdio:'ignore' })
const sleep = ms => new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<120&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map(); let errs=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data)
  if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}
  else if(m.method==='Runtime.exceptionThrown') errs.push((m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text||'').split('\n')[0])
  else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error') errs.push(m.params.args.map(a=>a.value||a.description).join(' ').split('\n')[0])})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')

const PROBE = `JSON.stringify((()=>({
  punchApp: typeof window.punchApp,
  showcase: typeof window.showcase,
  pagesOn: document.querySelectorAll('.m-page.is-on').length,
  pagesTotal: document.querySelectorAll('.m-page').length,
  textLen: (document.body.innerText||'').trim().length,
  phoneText: ((document.querySelector('.m-app')||{}).innerText||'').trim().length,
  storedPage: (()=>{try{return JSON.parse(localStorage.getItem('punch-showcase.app.v2')||'null')?.page}catch{return 'parse-error'}})(),
  mode: document.documentElement.dataset.mode||''
}))())`

async function run(label, poison, extra) {
  await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(3500)
  await js(`localStorage.clear(); ${poison||''}; 1`)
  errs = []
  await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(6000)
  const first = JSON.parse(await js(PROBE)||'{}')
  // second reload: does it persist / self-heal?
  await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(6000)
  const second = JSON.parse(await js(PROBE)||'{}')
  let more = {}
  if (extra) more = JSON.parse(await js(extra)||'{}')
  return { label, first, second, ...more, errors:[...new Set(errs)].slice(0,3) }
}

const SET = k => `localStorage.setItem('punch-showcase.app.v2', JSON.stringify(${k}))`
const EXTRA = `(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms)); const o={};
  try{ window.showcase.mode('machine'); await s(2000); o.machineWorks = document.querySelectorAll('.mscreen.is-on, .mscreen').length>0 && (document.documentElement.dataset.mode||'')==='machine' }catch(e){ o.machineWorks='threw: '+e.message }
  try{ window.showcase.mode('ds'); await s(1500); o.dsText = ((document.querySelector('#ds')||{}).innerText||'').trim().length }catch(e){ o.dsText='threw: '+e.message }
  try{ window.showcase.mode('mobile'); await s(1500) }catch(e){}
  // can Customise panel open and does it drive the phone?
  try{ const b=document.querySelector('#custom, [data-open="custom"], .customise-open'); o.customPanel = !!document.querySelector('#custom') }catch(e){ o.customPanel='threw' }
  try{ o.recover = (()=>{ try{ window.punchApp.go('feed'); return document.querySelectorAll('.m-page.is-on').length }catch(e){ return 'threw: '+e.message } })() }catch(e){ o.recover='outer '+e.message }
  return JSON.stringify(o) })()`

const out = []
out.push(await run('A clean baseline', '', EXTRA))
out.push(await run('B page=toString', SET({page:'toString',device:'iphone',fitV:2}), EXTRA))
out.push(await run('C page=__proto__', SET({page:'__proto__',device:'iphone',fitV:2})))
out.push(await run('D page=constructor', SET({page:'constructor',device:'iphone',fitV:2})))
out.push(await run('E page=nosuchpage (rename sim)', SET({page:'zzz-renamed',device:'iphone',fitV:2})))
out.push(await run('F truncated JSON', `localStorage.setItem('punch-showcase.app.v2','{"page":"toStr')`))
out.push(await run('G page=valueOf + device=__proto__', SET({page:'valueOf',device:'__proto__',board:'__proto__',connect:'toString',nav:'constructor',reelView:'__proto__',fitV:2})))
console.log(JSON.stringify(out,null,1))
ws.close(); chrome.kill()
