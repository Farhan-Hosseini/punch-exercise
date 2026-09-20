import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'cc'+port)}`,'--window-size=1440,900','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; const to = setTimeout(() => { if (pend.has(n)) { pend.delete(n); r({ result: { result: { value: '<TIMEOUT>' } } }) } }, 15000); pend.set(n, (v) => { clearTimeout(to); r(v) }); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

console.log('OPEN-CASE probe:', await js(`JSON.stringify({openCase:!!document.getElementById('openCase'),caseEl:!!document.getElementById('case'),caseScroll:!!document.getElementById('caseScroll')})`))
await js("document.getElementById('openCase').click(); 1"); await sleep(4500)
console.log('after click:', await js(`JSON.stringify({caseScroll:!!document.getElementById('caseScroll'),caseOpen:document.getElementById('case')?.className, sh:document.getElementById('caseScroll')?.scrollHeight||0})`))
const H = Number(await js("document.getElementById('caseScroll') ? document.getElementById('caseScroll').scrollHeight : 0")) || 0
for (let y = 0; y < H; y += 600) { await js(`document.getElementById('caseScroll').scrollTo(0,${y}); 1`); await sleep(60) }
await sleep(1500)
console.log('B. diagrams present after full scroll:', await js(`JSON.stringify({
  cdRoots:[...document.querySelectorAll('.cd[data-cd]')].map(e=>e.dataset.cd),
  stateOrRun:document.querySelectorAll('.cd-state, .cd-run').length,
  ready:[...document.querySelectorAll('[data-cd-ready]')].map(e=>e.dataset.cd)
})`))
console.log('C. customise panel controls:', await js(`JSON.stringify([...document.querySelectorAll('#custom [data-design],#custom select,#custom input[type=radio]')].map(e=>(e.dataset.design||e.id||e.name)).slice(0,60))`))
console.log('D. orphan files fetchable over HTTP:', await js(`(async()=>{const out={};for(const p of ['/parts/case-run.html','/parts/case-state.html','/parts/case-geometry.html','/parts/ds.html','/parts/case.html']){const r=await fetch(p);out[p]=r.status+' '+(await r.text()).length+'B'}return JSON.stringify(out)})()`))
ws.close(); chrome.kill(); process.exit(0)
