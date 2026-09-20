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
await js(`window.showcase.mscreen('score'); 1`); await sleep(2000)
// Countdown design: .ag-next / .ag-num / .ag-unit are laid out to share a line; .ag-word is the red lockup
await js(`window.showcase.sec('machine','score','again',1); 1`); await sleep(1500)

const OFF = `(() => { let s=document.getElementById('nofftb'); if(!s){s=document.createElement('style');s.id='nofftb';document.head.appendChild(s)} s.textContent='*, *::before, *::after { text-box-trim: none !important; }'; return 1 })()`
const ON  = `(() => { const s=document.getElementById('nofftb'); if(s) s.textContent=''; return 1 })()`
// baseline of an element = top of a zero-size inline box appended to its text (ds.js uses this same trick)
const BASE = `(() => {
  const scr=[...document.querySelectorAll('.mscreen')].find(s=>s.getBoundingClientRect().height>0)
  const fit = scr.getBoundingClientRect().height/3840
  const sel = ['.ag-next','.ag-word','.ag-num','.ag-unit']
  const out = {}
  for (const s of sel) {
    const e = scr.querySelector(s); if(!e) continue
    const probe = document.createElement('span'); probe.style.cssText='font-size:0;line-height:0;display:inline-block;width:0'
    e.appendChild(probe)
    const r = probe.getBoundingClientRect(), er = e.getBoundingClientRect()
    out[s] = { baseline:+(r.top/fit).toFixed(2), capTop:+(er.top/fit).toFixed(2), boxBottom:+(er.bottom/fit).toFixed(2) }
    probe.remove()
  }
  return out })()`
await js(ON); await sleep(600)
const b = JSON.parse(await js(`JSON.stringify(${BASE})`))
await js(OFF); await sleep(900)
const a = JSON.parse(await js(`JSON.stringify(${BASE})`))
console.log('--- baselines in GLASS px (1080x3840 panel), Countdown design on the Big score screen ---')
for (const k of Object.keys(b)) {
  console.log(k.padEnd(10), 'baseline', String(b[k].baseline).padStart(8), '->', String(a[k].baseline).padStart(8), ' shift', (a[k].baseline-b[k].baseline).toFixed(2).padStart(7))
}
const pair = (x,y) => ({ withTrim:+(b[x].baseline-b[y].baseline).toFixed(2), without:+(a[x].baseline-a[y].baseline).toFixed(2) })
console.log('\n--- the alignment the design asserts: baseline DIFFERENCE between neighbouring boxes ---')
console.log('num vs unit  (meant to share a baseline):', JSON.stringify(pair('.ag-num','.ag-unit')))
console.log('num vs next :', JSON.stringify(pair('.ag-num','.ag-next')))
console.log('word vs num :', JSON.stringify(pair('.ag-word','.ag-num')))
ws.close(); chrome.kill()
