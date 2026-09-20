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
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return '__ERR__' + JSON.stringify(r.result.exceptionDetails).slice(0,500); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(7000)
await js(`window.showcase.mode('machine'); 1`); await sleep(2500)

// 0. does Chrome actually apply it, and does forcing none change computed style?
console.log('SUPPORT', await js(`JSON.stringify({ supports: CSS.supports('text-box','trim-both cap alphabetic'), trimmedNow: [...document.querySelectorAll('*')].filter(e=>{const v=getComputedStyle(e).textBoxTrim; return v&&v!=='none'}).length })`))

// 1. the harness: measure geometry of the whole result screen, with and without the property
const MEASURE = `(() => {
  const out = { boxes: [], overflow: [], screenH: 0 }
  const scr = document.querySelector('#screenContent') || document.querySelector('#screen')
  if (scr) out.screenH = +scr.getBoundingClientRect().height.toFixed(2)
  const scrRect = scr ? scr.getBoundingClientRect() : null
  // every element that is trimmed, plus every .sec and every .var, plus clipping ancestors
  const pool = new Set()
  for (const e of document.querySelectorAll('#machine *')) {
    if (e.offsetParent === null && getComputedStyle(e).position !== 'fixed') continue
    const cs = getComputedStyle(e)
    if ((cs.textBoxTrim && cs.textBoxTrim !== 'none') || e.classList.contains('sec') || e.classList.contains('var') || e.classList.contains('vars')) pool.add(e)
  }
  for (const e of pool) {
    const r = e.getBoundingClientRect()
    out.boxes.push({ k: (e.className||'').toString().slice(0,60) + '#' + (e.tagName), t: +r.top.toFixed(2), h: +r.height.toFixed(2), w: +r.width.toFixed(2), l: +r.left.toFixed(2) })
  }
  // clipping: any element whose content overflows its own padding box while overflow is hidden/clip
  for (const e of document.querySelectorAll('#machine *')) {
    const cs = getComputedStyle(e)
    if (!/hidden|clip/.test(cs.overflowY + cs.overflowX)) continue
    if (e.scrollHeight - e.clientHeight > 1 || e.scrollWidth - e.clientWidth > 1) {
      out.overflow.push({ k: (e.className||'').toString().slice(0,60), dy: e.scrollHeight - e.clientHeight, dx: e.scrollWidth - e.clientWidth })
    }
  }
  return out
})()`

const before = await js(`JSON.stringify(${MEASURE})`)
// 2. simulate a browser that does not implement the property: the declarations are simply dropped
await js(`(() => { const s = document.createElement('style'); s.id='nofftb'; s.textContent = '*, *::before, *::after { text-box-trim: none !important; }'; document.head.appendChild(s); return 1 })()`)
await sleep(1200)
const after = await js(`JSON.stringify(${MEASURE})`)
const B = JSON.parse(before), A = JSON.parse(after)
console.log('SCREEN HEIGHT  with:', B.screenH, ' without:', A.screenH, ' delta:', +(A.screenH - B.screenH).toFixed(2))
console.log('OVERFLOW/CLIP  with:', JSON.stringify(B.overflow), '\n               without:', JSON.stringify(A.overflow))
let moved = 0, maxDy = 0, maxDh = 0, worst = null
for (let i = 0; i < Math.min(B.boxes.length, A.boxes.length); i++) {
  const b = B.boxes[i], a = A.boxes[i]
  const dy = Math.abs(a.t - b.t), dh = Math.abs(a.h - b.h)
  if (dy > 0.5 || dh > 0.5) moved++
  if (dy > maxDy) { maxDy = dy }
  if (dh > maxDh) { maxDh = dh; worst = { sel: b.k, h: b.h, h2: a.h, pct: +((a.h-b.h)/b.h*100).toFixed(1) } }
}
console.log('BOXES', B.boxes.length, 'moved/resized:', moved, 'maxTopShift:', maxDy.toFixed(2), 'maxHeightGrowth:', maxDh.toFixed(2))
console.log('WORST', JSON.stringify(worst))
console.log('TOP5 GROWTH', JSON.stringify(B.boxes.map((b,i)=>({sel:b.k,d:+((A.boxes[i]?.h??b.h)-b.h).toFixed(1),pct:b.h?+(((A.boxes[i]?.h??b.h)-b.h)/b.h*100).toFixed(1):0})).sort((x,y)=>y.d-x.d).slice(0,6)))
ws.close(); chrome.kill()
