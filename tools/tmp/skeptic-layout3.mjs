import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1600,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); let errs = []
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push('EXC ' + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text))
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push('CON ' + m.params.args.map(a => a.value || a.description).join(' ')) })
const send = (m, p = {}) => new Promise(r => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return 'THREW: ' + r.result.exceptionDetails.text; return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
const MEAS = `JSON.stringify((() => {
  const m = (k) => { const el=document.querySelector('[data-slot="'+k+'"]'); if(!el) return {missing:k}; const v=[...el.querySelectorAll(':scope > .vars > .var')]; return {vars:v.length, shown:v.filter(x=>!x.hidden).length, h:Math.round(el.getBoundingClientRect().height)} }
  const cs=getComputedStyle(document.documentElement); const screen=document.getElementById('screen')
  return { hero:m('hero'), cta:m('cta'), space:cs.getPropertyValue('--space').trim(), screenH: screen?Math.round(screen.getBoundingClientRect().height):null,
    spaceSlider: (document.querySelector('#space')||{}).value }
})())`
const nav = async () => { await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500) }
const toResult = async () => { await js(`window.showcase.mode('machine');1`); await sleep(1200); await js(`window.showcase.mscreen('result');1`); await sleep(1800) }
const poison = (patch) => js(`(()=>{const K='punch-showcase.v5';const s=JSON.parse(localStorage.getItem(K)||'{}');(${patch})(s);localStorage.setItem(K,JSON.stringify(s));return 1})()`)

await nav(); await js('localStorage.clear();1'); await nav(); await toResult()
const baseline = JSON.parse(await js(MEAS))
// A: sets.arena.space = 'NaN' ONLY
await poison(`s=>{s.sets=s.sets||{};s.sets.arena=s.sets.arena||{};s.sets.arena.space='NaN'}`)
await nav(); await toResult(); errs=[]
const spaceOnly = JSON.parse(await js(MEAS)); const spaceErrs = errs.slice()
// B: reset, then layout.hero = -1 (negative integer)
await js('localStorage.clear();1'); await nav(); await toResult()
await poison(`s=>{s.layout=s.layout||{};s.layout.hero=-1}`)
await nav(); await toResult(); errs=[]
const negOne = JSON.parse(await js(MEAS)); const negErrs = errs.slice()
// C: reset, then layout.hero = "2" (numeric string)
await js('localStorage.clear();1'); await nav(); await toResult()
await poison(`s=>{s.layout=s.layout||{};s.layout.hero='2'}`)
await nav(); await toResult()
const strTwo = JSON.parse(await js(MEAS))
console.log(JSON.stringify({ baseline, spaceOnly, spaceErrs, negOne, negErrs, strTwo }, null, 1))
ws.close(); chrome.kill()
