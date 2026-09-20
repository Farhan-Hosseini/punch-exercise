import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9800 + Math.floor(Math.random() * 150)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sw'+port)}`,'--window-size=1400,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 150 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x)=>x.type==='page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, pr={}) => new Promise((r)=>{ const n=++id; const to=setTimeout(()=>{if(pend.has(n)){pend.delete(n);r({})}},25000); pend.set(n,(v)=>{clearTimeout(to);r(v)}); ws.send(JSON.stringify({id:n,method:m,params:pr})) })
const js = async (e) => (await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
const jj = async (e) => { const v = await js(`JSON.stringify((()=>{${e}})())`); try { return JSON.parse(v) } catch { return {RAW:v} } }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride',{width:768,height:900,deviceScaleFactor:1,mobile:false})
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(4500)
await js('localStorage.clear(); 1')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(6500)
await js(`window.showcase.mode('animation'); 1`); await sleep(4000)
const widths = [760,767,768,769,772,780,790,800,810,820,850,900,1024,1180,1280,1440,1920]
for (const w of widths) {
  await send('Emulation.setDeviceMetricsOverride',{width:w,height:900,deviceScaleFactor:1,mobile:false})
  await sleep(1400)   // app.js resize debounce is 120ms; give the phone fit + RO time
  const r = await jj(`
    const de=document.documentElement, st=document.querySelector('.phone-stage'), cs=getComputedStyle(st)
    const g=document.querySelector('.deskgate')
    const ex=document.querySelector('.anim-extra')
    return { w:de.clientWidth, gate:g?getComputedStyle(g).display:null, layout:st.dataset.animLayout,
      over:de.scrollWidth-de.clientWidth, tracks:cs.gridTemplateColumns, gap:cs.columnGap,
      extraW: ex?Math.round(ex.getBoundingClientRect().width):null,
      masterHidden: (()=>{const f=document.querySelector('.anim-fig-master'); return f?getComputedStyle(f).display==='none':null})() }`)
  console.log(String(w).padStart(5), JSON.stringify(r))
}
try { ws.close() } catch {}
chrome.kill(); process.exit(0)
