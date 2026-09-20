import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'cc'+port)}`,'--window-size=1440,900','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description).split('\n')[0]) })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)

// 1. does the served index.html contain the orphan markup at all?
console.log('A. served index.html contains cd-run/cd-state markup:', await js(`(async()=>{const s=await (await fetch('/')).text();return JSON.stringify({bytes:s.length,cdRun:s.includes('data-cd="run"'),cdState:s.includes('data-cd="state"'),cdGeom:s.includes('data-cd="geometry"'),leftoverMarkers:(s.match(/<!-- include:/g)||[]).length})})()`))

// 2. open the case study, scroll end to end, enumerate diagrams
await js("document.getElementById('openCase').click(); 1"); await sleep(4000)
const H = await js("document.getElementById('caseScroll').scrollHeight")
for (let y = 0; y < H; y += 600) { await js(`document.getElementById('caseScroll').scrollTo(0, ${y}); 1`); await sleep(70) }
await sleep(1500)
console.log('B. after full case scroll:', await js(`JSON.stringify({
  cdRoots:[...document.querySelectorAll('.cd[data-cd]')].map(e=>e.dataset.cd),
  stateOrRunNodes:document.querySelectorAll('.cd-state, .cd-run').length,
  cdReady:[...document.querySelectorAll('[data-cd-ready]')].map(e=>e.dataset.cd),
  scrollH:${H}
})`))

// 3. exercise every Customise control, then re-count
await js("document.getElementById('caseClose')?.click(); 1"); await sleep(600)
console.log('C. customise controls:', await js(`JSON.stringify([...document.querySelectorAll('#custom [data-design], #custom button, #custom select, #custom input')].slice(0,40).map(e=>e.tagName+':'+(e.dataset.design||e.id||e.name||e.textContent.trim().slice(0,22))))`))
