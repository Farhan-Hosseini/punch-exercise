import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9000 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'t2'+port)}`,'--window-size=1600,1000','about:blank'], { stdio: 'ignore' })
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
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(7000)
await js(`window.showcase.mode('machine'); 1`); await sleep(1500); await js(`window.showcase.mscreen('score'); 1`); await sleep(2500)
console.log('SUPPORT', await js(`JSON.stringify({ textBox: CSS.supports('text-box','trim-both cap alphabetic'), trim: CSS.supports('text-box-trim','trim-both'), hasSel: CSS.supports('selector(:has(a))'), colorMix: CSS.supports('color: color-mix(in oklab, red 50%, blue)') })`))
console.log('DBG', await js(`JSON.stringify((()=>{const s=document.querySelector('.screen'); const st=document.getElementById('stage'); return { mode: document.body.dataset.mode, stageH: st? st.getBoundingClientRect().height:null, stageHidden: st?st.hidden:null, screen: s?{h:s.getBoundingClientRect().height,w:s.getBoundingClientRect().width,disp:getComputedStyle(s).display,tr:getComputedStyle(s).transform}:null, mscreens: [...document.querySelectorAll('.mscreen')].map(m=>({k:m.dataset.mscreen,h:Math.round(m.getBoundingClientRect().height),hid:m.hidden,d:getComputedStyle(m).display})), tb: [...document.querySelectorAll('body *')].filter(e=>{const s=getComputedStyle(e); return s.textBoxTrim && s.textBoxTrim!=='none'}).length }})())`))
console.log('TBLIST', await js(`JSON.stringify([...document.querySelectorAll('body *')].filter(e=>{const s=getComputedStyle(e); return s.textBoxTrim && s.textBoxTrim!=='none'}).map(e=>{const r=e.getBoundingClientRect(); return {c:String(e.className).slice(0,28), h:Math.round(r.height), w:Math.round(r.width), t:e.textContent.trim().slice(0,14)}}).filter(x=>x.h>0).slice(0,12))`))
console.log('DELTA', await js(`JSON.stringify((()=>{
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.height > 0.5 && r.width > 0.5 }
  const els = [...document.querySelectorAll('body *')].filter(e => { const s = getComputedStyle(e); return s.textBoxTrim && s.textBoxTrim !== 'none' && vis(e) })
  const before = els.slice(0, 14).map(e => { const r = e.getBoundingClientRect(); return { e, cls: String(e.className).slice(0,34), txt: e.textContent.trim().slice(0,16), h: r.height, y: r.top } })
  const st = document.createElement('style'); st.textContent = '*, *::before, *::after { text-box: normal !important; }'; document.head.appendChild(st)
  void document.body.offsetHeight
  const rows = before.map(b => { const r = b.e.getBoundingClientRect(); return { cls: b.cls, txt: b.txt, h: +b.h.toFixed(1) + ' -> ' + (+r.height.toFixed(1)), dhPx: +(r.height - b.h).toFixed(1), dyPx: +(r.top - b.y).toFixed(1) } })
  const screenH = document.querySelector('.screen') ? document.querySelector('.screen').getBoundingClientRect().height : 0
  st.remove()
  return { visibleTrimmed: els.length, screenH: +screenH.toFixed(0), rows }
})())`))
ws.close(); chrome.kill()
