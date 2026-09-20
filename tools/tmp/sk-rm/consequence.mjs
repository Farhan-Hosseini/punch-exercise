// Does the flag actually change what a probe observes on the real page?
import { spawn, execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'

async function run(label, extra) {
  const port = 9300 + Math.floor(Math.random() * 250)
  const dir = join(tmpdir(), 'skc' + port)
  const ch = spawn(CHROME, ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run',
    ...extra, `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, '--window-size=1440,900','about:blank'], { stdio: 'ignore' })
  let t
  for (let i=0;i<120 && !t;i++){ try{ t=(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page') }catch{ await sleep(150) } }
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise(r=>ws.addEventListener('open',r,{once:true}))
  let id=0; const pend=new Map()
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}})
  const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
  const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
  await send('Runtime.enable'); await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
  await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(2800)
  // sample the loader EARLY, while it is still on screen
  const early = JSON.parse(await js(`JSON.stringify({
    rm: matchMedia('(prefers-reduced-motion: reduce)').matches,
    still: !!document.querySelector('#loader')?.classList.contains('is-still'),
    cls: document.querySelector('#loader')?.className || null
  })`))
  await js('localStorage.clear(); 1')
  await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(6000)
  // now open the case study and see whether reveal transforms are live
  await js(`document.getElementById('openCase')?.click(); 1`); await sleep(1800)
  await js(`const s=document.getElementById('caseScroll'); if(s) s.scrollTop = 1400; 1`); await sleep(1200)
  const late = JSON.parse(await js(`JSON.stringify((()=>{
    const rise=[...document.querySelectorAll('#case [data-rise]')]
    const moved=rise.filter(el=>{const t=getComputedStyle(el).transform; return t&&t!=='none'&&t!=='matrix(1, 0, 0, 1, 0, 0)'}).length
    const faded=rise.filter(el=>parseFloat(getComputedStyle(el).opacity)<0.99).length
    return {rm:matchMedia('(prefers-reduced-motion: reduce)').matches, caseOpen:!!document.getElementById('case')?.hasAttribute('open')||document.getElementById('case')?.className, riseTotal:rise.length, moved, faded}
  })())`))
  try{ws.close()}catch{}
  try{execSync('taskkill /PID '+ch.pid+' /T /F',{stdio:'ignore'})}catch{}
  return {label, early, late}
}
for (const [l,e] of [['NO FLAG (default)',[]],['WITH flag=no-preference',['--force-prefers-reduced-motion=no-preference']]]) {
  const r = await run(l,e); console.log(r.label); console.log('  early:', JSON.stringify(r.early)); console.log('  late :', JSON.stringify(r.late))
}
