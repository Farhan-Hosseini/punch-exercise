import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9800 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'cc'+port)}`,'--window-size=1440,900','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; const to = setTimeout(() => { if (pend.has(n)) { pend.delete(n); r({ result: { result: { value: '<TIMEOUT>' } } }) } }, 20000); pend.set(n, (v) => { clearTimeout(to); r(v) }); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js("document.getElementById('openCase').click(); 1"); await sleep(4000)
const H = Number(await js("document.getElementById('caseScroll').scrollHeight")) || 0
for (let y = 0; y < H; y += 600) { await js(`document.getElementById('caseScroll').scrollTo(0,${y}); 1`); await sleep(50) }
// also press every control inside the geometry diagram, so any state-class rules get a chance
await js(`document.querySelectorAll('#case .cd [data-cd-all],#case .cd [data-cd-play],#case .cd button').forEach(b=>{try{b.click()}catch(e){}}); 1`); await sleep(2500)
console.log('E. CSSOM sweep of case-diagrams.css:', await js(`JSON.stringify((()=>{
  const sheet=[...document.styleSheets].find(s=>(s.href||'').includes('case-diagrams.css'))
  if(!sheet) return {error:'sheet not found'}
  let total=0,dead=0,deadBytes=0,liveBytes=0; const deadSel=[]
  const walk=(rules)=>{for(const r of rules){
    if(r.cssRules&&!r.selectorText){walk(r.cssRules);continue}
    if(!r.selectorText)continue
    total++
    const bytes=r.cssText.length
    let matched=false
    for(const part of r.selectorText.split(',')){
      const clean=part.replace(/::?(before|after|marker|placeholder|first-line|selection|backdrop|-webkit-[\w-]+)/g,'').trim()
      if(!clean){matched=true;break}
      try{ if(document.querySelector(clean)){matched=true;break} }catch(e){matched=true;break}
    }
    if(matched)liveBytes+=bytes; else {dead++;deadBytes+=bytes;if(deadSel.length<25)deadSel.push(r.selectorText.slice(0,70))}
  }}
  walk(sheet.cssRules)
  return {totalRules:total,deadRules:dead,deadBytes,liveBytes,deadSel}
})())`))
console.log('F. sheet transfer + geometry diagram present:', await js(`JSON.stringify({cdRoots:[...document.querySelectorAll('.cd[data-cd]')].map(e=>e.dataset.cd),stateRun:document.querySelectorAll('.cd-state,.cd-run').length})`))
ws.close(); chrome.kill(); process.exit(0)
