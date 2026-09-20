import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9100 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'tb'+port)}`,'--window-size=1600,1000','about:blank'], { stdio: 'ignore' })
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
// measure cumulative layout shift on a cold load
await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__cls = 0; window.__shifts = [];
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; window.__shifts.push({ v: +e.value.toFixed(4), t: Math.round(e.startTime), srcs: (e.sources||[]).slice(0,3).map(s=>({ n: s.node ? (s.node.tagName||'') + '.' + ((s.node.className&&typeof s.node.className==='string')?s.node.className.split(/\\s+/)[0]:'') : '?', from: s.previousRect ? [Math.round(s.previousRect.x),Math.round(s.previousRect.y),Math.round(s.previousRect.width),Math.round(s.previousRect.height)] : null, to: s.currentRect ? [Math.round(s.currentRect.x),Math.round(s.currentRect.y),Math.round(s.currentRect.width),Math.round(s.currentRect.height)] : null })) }) } }).observe({ type: 'layout-shift', buffered: true }) } catch (e) {}` })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(9000)
console.log('CLS', await js('JSON.stringify({ cls: +window.__cls.toFixed(4), n: window.__shifts.length, worst: window.__shifts.sort((a,b)=>b.v-a.v).slice(0,5) })'))

// text-box: what the machine screen loses when the property is dropped (as Firefox drops it)
await js(`window.showcase.mode('machine'); 1`); await sleep(2500)
console.log('TEXTBOX SUPPORT', await js(`JSON.stringify({ supported: CSS.supports('text-box','trim-both cap alphabetic'), trim: CSS.supports('text-box-trim','trim-both') })`))
console.log('TEXTBOX DELTA', await js(`JSON.stringify((()=>{
  const els = [...document.querySelectorAll('*')].filter(e => { const s = getComputedStyle(e); return s.textBoxTrim && s.textBoxTrim !== 'none' })
  const sample = els.filter(e => e.offsetWidth || e.getClientRects().length).slice(0, 10); const sample2 = sample.length ? sample : els.slice(0,10)
  const before = sample2.map(e => { const r = e.getBoundingClientRect(); return { cls: e.className, h: +r.height.toFixed(1), y: +r.top.toFixed(1), txt: e.textContent.trim().slice(0,14) } })
  const st = document.createElement('style'); st.textContent = '* { text-box: normal !important; text-box-trim: none !important; }'; document.head.appendChild(st)
  void document.body.offsetHeight
  const after = sample2.map(e => { const r = e.getBoundingClientRect(); return { h: +r.height.toFixed(1), y: +r.top.toFixed(1) } })
  st.remove()
  return { count: els.length, delta: before.map((b, i) => ({ cls: b.cls, txt: b.txt, h: b.h + ' -> ' + after[i].h, dh: +(after[i].h - b.h).toFixed(1), dy: +(after[i].y - b.y).toFixed(1) })) }
})())`))
ws.close(); chrome.kill()
