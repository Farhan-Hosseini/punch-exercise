import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'; import { join } from 'node:path'
const port = 9483
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk2'+port)}`,'--window-size=1440,1000','about:blank'], { stdio:'ignore' })
const sleep = ms => new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<120&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map(); let errs=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data)
  if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}
  else if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails
    errs.push({msg:(d?.exception?.description||d?.text||'').split('\n')[0],
      at:(d?.stackTrace?.callFrames||[]).slice(0,3).map(f=>`${(f.url||'').split('/').pop()}:${f.lineNumber+1}:${f.columnNumber+1} ${f.functionName||'(top)'}`)})}
  else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error') errs.push({msg:m.params.args.map(a=>a.value||a.description).join(' ').split('\n')[0],at:['console']}) })
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')

const PROBE = `JSON.stringify({
  punchApp: typeof window.punchApp, showcase: typeof window.showcase,
  pagesOn: document.querySelectorAll('.m-page.is-on').length,
  textLen: (document.body.innerText||'').trim().length,
  phoneText: ((document.querySelector('.m-app')||{}).innerText||'').trim().length,
  stored: localStorage.getItem('punch-showcase.app.v2'),
  navCount: document.querySelectorAll('.m-nav-item').length
})`
let script = null
async function poison(val){
  if (script) await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:script})
  const r = await send('Page.addScriptToEvaluateOnNewDocument',{source:
    `try{localStorage.setItem('punch-showcase.app.v2', ${JSON.stringify(val)})}catch(e){}`})
  script = r.result?.identifier
}
async function run(label, val, extra){
  await poison(val)
  errs = []
  await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(7000)
  const first = JSON.parse(await js(PROBE)||'{}')
  const firstErrs = JSON.parse(JSON.stringify(errs))
  let more = {}
  if (extra) more = JSON.parse(await js(extra)||'{}')
  return { label, injected: val, first, ...more, errors: firstErrs.slice(0,4) }
}
const EXTRA = `(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms)); const o={}
  o.hasShowcase = typeof window.showcase
  try{ window.showcase.mode('machine'); await s(2500); o.machineMode=document.documentElement.dataset.mode||document.body.dataset.mode||'?'; o.machineText=((document.querySelector('.machine, .m-screen, #machine')||document.body).innerText||'').trim().length }catch(e){ o.machine='threw: '+e.message }
  try{ window.showcase.mode('ds'); await s(2000); o.dsText=((document.querySelector('#ds')||{}).innerText||'').trim().length }catch(e){ o.ds='threw: '+e.message }
  try{ window.showcase.mode('mobile'); await s(2000); o.backToMobilePagesOn=document.querySelectorAll('.m-page.is-on').length }catch(e){ o.back='threw: '+e.message }
  try{ const c=document.querySelector('#custom'); o.customExists=!!c; o.customText=(c?.innerText||'').trim().length }catch(e){}
  return JSON.stringify(o) })()`

const out=[]
out.push(await run('A clean (no poison)', '{"page":"default","device":"iphone","fitV":2}', EXTRA))
out.push(await run('B page=toString', '{"page":"toString","device":"iphone","fitV":2}', EXTRA))
out.push(await run('C page=__proto__', '{"page":"__proto__","device":"iphone","fitV":2}'))
out.push(await run('D page=constructor', '{"page":"constructor","device":"iphone","fitV":2}'))
out.push(await run('E page=hasOwnProperty', '{"page":"hasOwnProperty","device":"iphone","fitV":2}'))
out.push(await run('F page=zzz-renamed (rename sim)', '{"page":"zzz-renamed","device":"iphone","fitV":2}'))
out.push(await run('G truncated JSON', '{"page":"toStr'))
out.push(await run('H device/board/nav poisoned, page ok', '{"page":"feed","device":"__proto__","board":"toString","connect":"constructor","nav":"valueOf","reelView":"__proto__","fitV":2}', EXTRA))
console.log(JSON.stringify(out,null,1))
ws.close(); chrome.kill()
