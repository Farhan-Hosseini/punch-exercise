import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random() * 60)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1600,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 200 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return '__ERR__' + JSON.stringify(r.result.exceptionDetails).slice(0,600); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(7000)
await js(`window.showcase.mode('machine'); 1`); await sleep(1500)

const OFF = `(() => { let s=document.getElementById('nofftb'); if(!s){s=document.createElement('style');s.id='nofftb';document.head.appendChild(s)} s.textContent='*, *::before, *::after { text-box-trim: none !important; }'; return 1 })()`
const ON  = `(() => { const s=document.getElementById('nofftb'); if(s) s.textContent=''; return 1 })()`
// TAG runs while the property is ON, marking every trimmed visible element
const TAG = `(() => { let n=0; const scr=[...document.querySelectorAll('.mscreen')].find(s=>s.getBoundingClientRect().height>0); if(!scr) return -1
  for (const e of scr.querySelectorAll('[data-tbm]')) e.removeAttribute('data-tbm')
  for (const e of scr.querySelectorAll('*')) { const cs=getComputedStyle(e); if (cs.textBoxTrim && cs.textBoxTrim!=='none' && e.getBoundingClientRect().height>0) e.setAttribute('data-tbm', ++n) }
  return n })()`
const M = `(() => {
  const scr=[...document.querySelectorAll('.mscreen')].find(s=>s.getBoundingClientRect().height>0)
  const fit = scr.getBoundingClientRect().height / 3840
  const o = { fit:+fit.toFixed(4), items:[], overflow:0, overflowPx:0, overlaps:0, secH:{} }
  for (const e of [...scr.querySelectorAll('[data-tbm]')].sort((a,b)=>+a.dataset.tbm-+b.dataset.tbm)) {
    const r=e.getBoundingClientRect(), p=e.parentElement.getBoundingClientRect()
    o.items.push({ c:(e.className||'').toString().slice(0,30), txt:(e.textContent||'').trim().slice(0,16),
      h:+(r.height/fit).toFixed(1), offCentre:+(((r.top+r.bottom)/2-(p.top+p.bottom)/2)/fit).toFixed(1) })
  }
  for (const e of scr.querySelectorAll('*')) { const cs=getComputedStyle(e)
    if (/hidden|clip/.test(cs.overflowY) && e.scrollHeight-e.clientHeight>1) { o.overflow++; o.overflowPx += e.scrollHeight-e.clientHeight } }
  for (const par of scr.querySelectorAll('*')) {
    const kids=[...par.children].filter(k=>{const cs=getComputedStyle(k); return k.getBoundingClientRect().height>0 && cs.position==='static' && cs.display!=='inline'})
    for(let i=1;i<kids.length;i++){const a=kids[i-1].getBoundingClientRect(),b=kids[i].getBoundingClientRect()
      if(b.top<a.bottom-1 && b.left<a.right-1 && b.right>a.left+1) o.overlaps++} }
  const ag=scr.querySelector('.ag-sec'); if(ag) o.secH.ag=+(ag.getBoundingClientRect().height/fit).toFixed(1)
  const hd=scr.querySelector('.msh'); if(hd) o.secH.msh=+(hd.getBoundingClientRect().height/fit).toFixed(1)
  return o })()`

for (const k of ['score','record','stats']) {
  await js(`window.showcase.mscreen('${k}'); 1`); await sleep(2200)
  const secs = JSON.parse(await js(`JSON.stringify(window.showcase.sections('machine','${k}'))`) || '[]')
  for (const s of secs) {
    for (let i = 0; i < (s.names?.length || 0); i++) {
      await js(ON); await js(`window.showcase.sec('machine','${k}','${s.key}',${i}); 1`); await sleep(900)
      const n = await js(TAG); if (!n || n < 1) continue
      const b = JSON.parse(await js(`JSON.stringify(${M})`))
      await js(OFF); await sleep(900)
      const a = JSON.parse(await js(`JSON.stringify(${M})`))
      const cmp = b.items.map((x,ix)=>({ c:x.c, txt:x.txt, glassH:[x.h,a.items[ix]?.h], grow:+(((a.items[ix]?.h??x.h)-x.h)).toFixed(1), growPct:+(((a.items[ix]?.h??x.h)-x.h)/x.h*100).toFixed(1), offCentre:[x.offCentre,a.items[ix]?.offCentre] }))
      console.log(JSON.stringify({ screen:k, sec:s.key, design:s.names[i], tagged:n, overflow:[b.overflow,a.overflow], overflowPx:[b.overflowPx,a.overflowPx], overlaps:[b.overlaps,a.overlaps], secH:[b.secH,a.secH], items:cmp }))
    }
  }
}
ws.close(); chrome.kill()
