import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = Number(process.argv[2] || 390)
const port = 9800 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sd'+port)}`,`--window-size=${W},1400`,'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 150 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return 'ERR:'+JSON.stringify(r.result.exceptionDetails).slice(0,300); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 1400, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(7000)
console.log('DIAG', await js(`JSON.stringify({iw:innerWidth, bodyMode:document.body.dataset.mode, loader:!!document.querySelector('.loader,#loader'),
  nav:(()=>{const n=document.querySelector('.pagenav[data-pagenav="page"]'); if(!n) return 'no nav'; const cs=getComputedStyle(n); const r=n.getBoundingClientRect(); return {display:cs.display, vis:cs.visibility, h:r.height, w:r.width, top:r.top, parent:n.parentElement.className}})(),
  gb:(()=>{const b=document.querySelector('.pagenav[data-pagenav="page"] .pagegroups button'); if(!b) return 'none'; const r=b.getBoundingClientRect(); return {h:r.height,w:r.width,top:r.top,left:r.left, hidden:b.hidden, cs:getComputedStyle(b).display}})()})`))
await js(`window.showcase.mode('mobile'); 1`); await sleep(2000)
console.log('AFTER mode(mobile)', await js(`JSON.stringify({bodyMode:document.body.dataset.mode,
  gb:(()=>{const b=document.querySelector('.pagenav[data-pagenav="page"] .pagegroups button'); const r=b.getBoundingClientRect(); return {h:r.height,w:r.width,top:r.top,left:r.left}})(),
  navDisplay:getComputedStyle(document.querySelector('.pagenav[data-pagenav="page"]')).display,
  navRect:(()=>{const r=document.querySelector('.pagenav[data-pagenav="page"]').getBoundingClientRect(); return {h:r.height,w:r.width,t:r.top}})()})`))
ws.close(); chrome.kill()
