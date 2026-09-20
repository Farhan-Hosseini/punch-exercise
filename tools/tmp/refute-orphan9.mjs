import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9900 + Math.floor(Math.random() * 90)
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
await sleep(1500)
// full rule-level sweep, counting EVERY selector part, with bytes
console.log(await js(`JSON.stringify((()=>{
  const sheet=[...document.styleSheets].find(s=>(s.href||'').includes('case-diagrams.css'))
  let rules=0, parts=0, deadParts=0, wholeDead=0, wholeDeadBytes=0, mixed=0, mixedSelBytes=0
  const samples=[]
  const walk=(rs)=>{for(const r of rs){
    if(r.cssRules&&r.selectorText===undefined){walk(r.cssRules);continue}
    if(r.selectorText===undefined)continue
    rules++
    const ps=r.selectorText.split(',').map(s=>s.trim()).filter(Boolean)
    let dead=0
    for(const p of ps){parts++
      let ok=false
      try{ ok = !!document.querySelector(p) }catch(e){ ok = true }
      if(!ok){dead++;deadParts++;if(samples.length<12)samples.push(p.slice(0,60))}
    }
    if(dead===ps.length){wholeDead++;wholeDeadBytes+=r.cssText.length}
    else if(dead){mixed++;mixedSelBytes+=ps.filter(p=>{try{return !document.querySelector(p)}catch(e){return false}}).reduce((a,p)=>a+p.length+1,0)}
  }}
  walk(sheet.cssRules)
  return {rules,parts,deadParts,wholeDeadRules:wholeDead,wholeDeadBytes,mixedRules:mixed,mixedSelBytes,exactDeletable:wholeDeadBytes+mixedSelBytes,samples}
})())`))
ws.close(); chrome.kill(); process.exit(0)
