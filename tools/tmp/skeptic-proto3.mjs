import { spawn } from 'node:child_process'
import { writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'; import { join } from 'node:path'
const port = 9487
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk3'+port)}`,'--window-size=1440,1000','about:blank'], { stdio:'ignore' })
const sleep = ms => new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<120&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map(); let errs=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data)
  if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}
  else if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails
    errs.push((d?.exception?.description||d?.text||'').split('\n')[0]+' @ '+((d?.stackTrace?.callFrames||[])[0]?`${(d.stackTrace.callFrames[0].url||'').split('/').pop()}:${d.stackTrace.callFrames[0].lineNumber+1}`:'?'))}
  else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error') errs.push('console: '+m.params.args.map(a=>a.value||a.description).join(' ').split('\n')[0]) })
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await mkdir('build/skeptic',{recursive:true}).catch(()=>{})

async function boot(val){
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`try{localStorage.clear();localStorage.setItem('punch-showcase.app.v2', ${JSON.stringify(val)})}catch(e){}`})
  errs=[]
  await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(7000)
}
const ACT = `(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms)); const o={}
  // 1. Customise panel: open it and click a phone-surface control
  try{ const open=document.querySelector('[data-panel="custom"],[data-open="custom"],#customOpen,.js-custom,button[aria-controls="custom"]')
    o.openBtn = open? (open.id||open.className||open.dataset.panel):'not found'
    if(open) open.click(); await s(1200)
    o.customOpen = !!document.querySelector('#custom.is-on, #custom[aria-hidden="false"], #custom.open') || (document.querySelector('#custom')?.offsetParent!=null)
    const ctl=[...document.querySelectorAll('#custom button, #custom [role="radio"], #custom input')]
    o.customControls = ctl.length
    for(const c of ctl.slice(0,14)){ try{ c.click(); await s(180) }catch(e){} }
    o.afterClicksPagesOn = document.querySelectorAll('.m-page.is-on').length
  }catch(e){ o.custom='threw: '+e.message }
  // 2. case study overlay
  try{ const cs=document.querySelector('#openCase'); o.hasOpenCase=!!cs; if(cs){cs.click(); await s(3000)}
    o.caseText=((document.querySelector('#case')||{}).innerText||'').trim().length
    const close=document.querySelector('#case [data-close],#case .close,#case button'); if(close){close.click(); await s(1000)}
  }catch(e){ o.case='threw: '+e.message }
  // 3. animation mode (drives the phone through punchApp)
  try{ window.showcase.mode('animation'); await s(4000); o.animPagesOn=document.querySelectorAll('.m-page.is-on').length
    o.animText=((document.querySelector('.anim, #animation, .animation')||document.body).innerText||'').trim().length }catch(e){ o.anim='threw: '+e.message }
  // 4. phone nav taps
  try{ window.showcase.mode('mobile'); await s(2000)
    const n=[...document.querySelectorAll('.m-nav-item')].slice(0,4); for(const b of n){ b.click(); await s(400) }
    o.afterNavTapsPagesOn=document.querySelectorAll('.m-page.is-on').length }catch(e){ o.nav='threw: '+e.message }
  return JSON.stringify(o) })()`

const out={}
await boot('{"page":"default","device":"iphone","fitV":2}')
out.clean = { probe: JSON.parse(await js(`JSON.stringify({pagesOn:document.querySelectorAll('.m-page.is-on').length,punchApp:typeof window.punchApp})`)), ...JSON.parse(await js(ACT)||'{}'), errors:[...new Set(errs)].slice(0,5) }
await js(`window.showcase.mode('mobile');1`); await sleep(2000)
let shot = await send('Page.captureScreenshot',{format:'png'}); await writeFile('build/skeptic/clean.png', Buffer.from(shot.result.data,'base64'))

await boot('{"page":"toString","device":"iphone","fitV":2}')
out.poisoned = { probe: JSON.parse(await js(`JSON.stringify({pagesOn:document.querySelectorAll('.m-page.is-on').length,punchApp:typeof window.punchApp})`)), ...JSON.parse(await js(ACT)||'{}'), errors:[...new Set(errs)].slice(0,6) }
await js(`window.showcase.mode('mobile');1`); await sleep(2000)
shot = await send('Page.captureScreenshot',{format:'png'}); await writeFile('build/skeptic/poisoned.png', Buffer.from(shot.result.data,'base64'))
console.log(JSON.stringify(out,null,1))
ws.close(); chrome.kill()
