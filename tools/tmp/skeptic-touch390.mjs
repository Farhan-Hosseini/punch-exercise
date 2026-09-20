import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = Number(process.argv[2] || 390)
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sq'+port)}`,`--window-size=${W},1400`,'about:blank'], { stdio: 'ignore' })
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
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 1400, deviceScaleFactor: 1, mobile: true, screenWidth: W, screenHeight: 1400 })
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(7000)
const PROBE = `(sel) => {
  const el = document.querySelector(sel); if (!el) return { missing: sel }
  const r = el.getBoundingClientRect(); if (!r.height) return { sel, notRendered: true }
  const cx = Math.round(r.left + r.width/2)
  let lo=null, hi=null
  for (let y = Math.round(r.top)-18; y <= Math.round(r.bottom)+18; y++) { const h = document.elementFromPoint(cx,y); if (h && (h===el || el.contains(h))) { if(lo===null) lo=y; hi=y } }
  return { sel, text: el.textContent.trim().slice(0,16), drawnH:+r.height.toFixed(1), hitH: lo===null?0:hi-lo+1 }
}`
await js(`window.showcase.mode('mobile'); 1`); await sleep(1800)
await js(`(()=>{const b=[...document.querySelectorAll('.pagenav[data-pagenav="page"] .pagegroups button')].find(x=>x.dataset.group==='play'); b.click(); return 1})()`); await sleep(1500)
console.log('SHELL @'+W+' mobile:', await js(`JSON.stringify((()=>{const P=${PROBE}; return [
 P('.pagenav[data-pagenav="page"] .pagegroups button'),
 P('.pagenav[data-pagenav="page"] .pagesub button:not([hidden])'),
 P('.mode'), P('.briefbtn')]})())`))
await js(`window.showcase.mode('machine'); 1`); await sleep(1800)
await js(`(()=>{const b=[...document.querySelectorAll('.pagenav[data-pagenav="mscreen"] .pagegroups button')].find(x=>x.dataset.group==='play'); b.click(); return 1})()`); await sleep(1500)
console.log('SHELL @'+W+' machine:', await js(`JSON.stringify((()=>{const P=${PROBE}; return [
 P('.pagenav[data-pagenav="mscreen"] .pagegroups button'),
 P('.pagenav[data-pagenav="mscreen"] .pagesub button:not([hidden])')]})())`))
// DS tab replica of the same bar
await js(`window.showcase.mode('ds'); 1`); await sleep(2500)
await js(`(()=>{const el=document.querySelector('.ds-pn'); if(el) el.scrollIntoView({block:'center'}); return !!el})()`); await sleep(1200)
console.log('DS REPLICA @'+W+':', await js(`JSON.stringify((()=>{const P=${PROBE}; return [
 P('.ds-pn .pagebar button'), P('.ds-pn .ds-pn-sub button')]})())`))
ws.close(); chrome.kill()
