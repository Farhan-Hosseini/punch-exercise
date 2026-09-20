import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = 1440
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'cc'+port)}`,`--window-size=${W},900`,'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []; const reqs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).split('\n')[0])
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map((a) => a.value || a.description).join(' ').split('\n')[0])
  else if (m.method === 'Network.requestWillBeSent') reqs.push(m.params.request.url)
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)
await js("document.getElementById('openCase').click(); 1"); await sleep(4000)
const H = await js("document.getElementById('caseScroll').scrollHeight")
for (let y = 0; y < H; y += 700) { await js(`document.getElementById('caseScroll').scrollTo(0, ${y}); 1`); await sleep(80) }
await sleep(1200)
console.log(await js(`JSON.stringify((() => {
  const roots = [...document.querySelectorAll('.cd[data-cd]')].map(r => ({ cd: r.dataset.cd, h: Math.round(r.getBoundingClientRect().height), cls: r.className }))
  const frames = [...document.querySelectorAll('#case .cs-diagram-frame')].map(f => ({ label: f.dataset.diagramFrame, kids: f.children.length, h: Math.round(f.getBoundingClientRect().height) }))
  const figs = [...document.querySelectorAll('#case figure.cs-diagram')].map(f => ({ cap: (f.querySelector('.cs-h4')||{}).textContent, h: Math.round(f.getBoundingClientRect().height) }))
  const cdInPage = document.documentElement.innerHTML.match(/cd-state|cd-run-|cd-geo/g) || []
  const counts = {}; for (const c of cdInPage) counts[c] = (counts[c]||0)+1
  return { roots, frames, figs, counts, hasStateMarkup: !!document.querySelector('.cd-state-svg'), hasRunMarkup: !!document.querySelector('.cd-run-scroller') }
})())`, null, 1))
console.log('errors:', JSON.stringify(errs.slice(0, 8)))
console.log('fetched parts/*:', JSON.stringify(reqs.filter(u => /parts\//.test(u))))
console.log('fetched case-diagrams:', JSON.stringify(reqs.filter(u => /case-diagrams/.test(u))))
ws.close(); chrome.kill()
