import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9200 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'tc'+port)}`,'--window-size=1600,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 150 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return '__ERR__' + JSON.stringify(r.result.exceptionDetails).slice(0, 300); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6500)
await js(`window.showcase.mode('mobile'); 1`); await sleep(1500)
// click a group that has sub-screens so .pagesub renders
console.log('GROUPS', await js(`JSON.stringify([...document.querySelectorAll('.pagenav[data-pagenav="page"] .pagegroups button')].map(b=>({t:b.textContent.trim(), g:b.dataset.group})))`))
await js(`(()=>{const bs=[...document.querySelectorAll('.pagenav[data-pagenav="page"] .pagegroups button')]; (bs[1]||bs[0]).click(); return 1})()`); await sleep(1200)
console.log('AFTER GROUP CLICK', await js(`JSON.stringify((()=>{
  const nav=[...document.querySelectorAll('.pagenav')].find(p=>p.dataset.pagenav==='page')
  const sub=nav.querySelector('.pagesub'); const b=[...sub.querySelectorAll("button")].find(x=>x.getClientRects().length)
  const m=(el)=>{ if(!el) return null; const r=el.getBoundingClientRect(); const a=getComputedStyle(el,'::after'); return {tag:el.tagName,text:el.textContent.trim().slice(0,16),h:+r.height.toFixed(1),w:+r.width.toFixed(1),afterContent:a.content,afterTop:a.top,afterBottom:a.bottom,afterH:a.height,afterW:a.width} }
  return { subDisplay:getComputedStyle(sub).display, subVisible:!!sub.getClientRects().length, subButton:m(b), groupButton:m(nav.querySelector('.pagegroups button')) }
})())`))
// Customise panel controls
await js(`(()=>{const b=document.querySelector('[data-open-custom],#openCustom,.customise-open,.custombtn'); if(b) b.click(); return b?b.className:'none'})()`); await sleep(1200)
console.log('PANEL', await js(`JSON.stringify((()=>{
  const m=(sel)=>{ const el=document.querySelector(sel); if(!el||!el.getClientRects().length) return {sel,missing:true}; const r=el.getBoundingClientRect(); const a=getComputedStyle(el,'::after'); return {sel,h:+r.height.toFixed(1),w:+r.width.toFixed(1),afterH:a.height,afterW:a.width,afterTop:a.top,afterBottom:a.bottom,afterLeft:a.left,afterRight:a.right} }
  return ['.sec-btn','.seg button','.iconbtn.small','.mode','.briefbtn','.anim-bar .anim-play'].map(m)
})())`))
ws.close(); chrome.kill()
