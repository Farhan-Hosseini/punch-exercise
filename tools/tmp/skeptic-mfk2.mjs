// Second skeptic pass: does the reporter's proposed fix (.mf-fr-o { --mf-k: 1 }) kill the mf-fill animation?
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9970 + Math.floor(Math.random() * 20)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk2' + port)}`, '--window-size=1600,1100', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 200 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return '__ERR__' + JSON.stringify(r.result.exceptionDetails).slice(0, 400); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1100, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(2500)
await js('try{localStorage.clear()}catch(e){}; 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js(`(async()=>{ window.showcase.mode('mobile'); await new Promise(r=>setTimeout(r,600)); window.punchApp.go('feed'); await new Promise(r=>setTimeout(r,800)); return 1 })()`)

const sample = async (label) => await js(`(async()=>{
  // swap stories away and back so the mf-fill animation replays
  window.PSec.set('phone','feed','stories',0); await new Promise(r=>setTimeout(r,400))
  window.PSec.set('phone','feed','stories',2)
  const out = []
  for (let i=0;i<9;i++){
    await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,80)))
    const rail = document.querySelector('.mf-force'); const o = document.querySelector('.mf-fr-o')
    if (!o) { out.push('no ring'); continue }
    out.push({ ms: i*80, railClass: rail ? rail.className : '-', railK: rail ? getComputedStyle(rail).getPropertyValue('--mf-k') : '-', ringK: getComputedStyle(o).getPropertyValue('--mf-k'), deg: (getComputedStyle(o).backgroundImage.match(/([\\d.]+)deg/)||[])[1] })
  }
  return JSON.stringify({ label: ${JSON.stringify(label)}, out })
})()`)

console.log('AS SHIPPED:'); console.log(await sample('as-shipped'))
await js(`(()=>{ const s=document.createElement('style'); s.id='fix'; s.textContent='.mf-fr-o { --mf-k: 1; }'; document.head.append(s); return 1 })()`)
await sleep(600)
console.log('\\nWITH THE PROPOSED FIX .mf-fr-o{--mf-k:1}:'); console.log(await sample('proposed-fix'))
await js(`document.getElementById('fix').remove(); 1`)
await sleep(600)
// and the alternative fix: var(--mf-k, 1) in the consumer
await js(`(()=>{ const s=document.createElement('style'); s.id='fix2'; s.textContent='.mf-fr-o { background: conic-gradient(var(--m-red) calc(var(--f) * var(--mf-k, 1) * 360deg), var(--m-line-2) 0); }'; document.head.append(s); return 1 })()`)
await sleep(600)
console.log('\\nWITH var(--mf-k, 1) IN THE CONSUMER:'); console.log(await sample('fallback-in-var'))
ws.close(); chrome.kill()
