import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []; const net = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map(a => a.value || a.description).join(' '))
  else if (m.method === 'Network.loadingFinished') { const r = net.find(x => x.id === m.params.requestId); if (r) r.bytes = m.params.encodedDataLength }
  else if (m.method === 'Network.requestWillBeSent') net.push({ id: m.params.requestId, url: m.params.request.url })
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
net.length = 0
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

const out = {}
out.errorsOnLoad = errs.slice(0, 6)
out.before = JSON.parse(await js(`JSON.stringify({
  mscreen: document.getElementById('machine').dataset.mscreen,
  statsHidden: document.querySelector('.mscreen-stats').hidden,
  statsRects: document.querySelector('.mscreen-stats').getClientRects().length,
  statsNodes: document.querySelector('.mscreen-stats').querySelectorAll('*').length,
  screenHidden: document.getElementById('screen').hidden,
  barHasStats: !!document.querySelector('.mpagebar [data-mscreen="stats"]'),
  mscreenArticles: [...document.querySelectorAll('.mscreen')].map(a=>a.dataset.mscreen)
})`))
// the reproduction
out.afterStats = JSON.parse(await js(`(()=>{ window.showcase.mscreen('stats'); return JSON.stringify({
  mscreen: document.getElementById('machine').dataset.mscreen,
  statsHidden: document.querySelector('.mscreen-stats').hidden,
  statsRects: document.querySelector('.mscreen-stats').getClientRects().length,
  screenHidden: document.getElementById('screen').hidden,
  stateSaved: JSON.parse(localStorage.getItem('punch-showcase.v5')||'{}').mscreen
}) })()`))
out.afterScore = JSON.parse(await js(`(()=>{ window.showcase.mscreen('score'); return JSON.stringify({ mscreen: document.getElementById('machine').dataset.mscreen }) })()`))
// the ds button
await js(`window.showcase.mode('system'); 1`); await sleep(3000)
out.ds = JSON.parse(await js(`JSON.stringify((()=>{
  const b = document.querySelector('[data-go-mscreen="stats"]')
  const sec = document.getElementById('ds-yourrun')
  const idx = [...document.querySelectorAll('#ds a[href="#ds-yourrun"], #ds [data-ds-jump="ds-yourrun"]')].length
  return { btn: !!b, btnRects: b? b.getClientRects().length : null, secHidden: sec? sec.hidden : null, secRects: sec? sec.getClientRects().length : null, indexLinks: idx,
    anyIndexText: [...document.querySelectorAll('#ds a[href^="#ds-"]')].map(a=>a.getAttribute('href')).filter(h=>h.includes('yourrun')) }
})())`))
// does stats.js wire up? probe its listeners by dispatching the event it listens for
out.listeners = JSON.parse(await js(`JSON.stringify((()=>{
  const el = document.querySelector('.mscreen-stats')
  const before = el.outerHTML.length
  document.dispatchEvent(new CustomEvent('mscreen',{detail:{key:'stats',opts:{}}}))
  return { htmlLenBefore: before, htmlLenAfter: el.outerHTML.length, changed: el.outerHTML.length !== before }
})())`))
out.errorsAfter = errs.slice(0, 8)
const wanted = net.filter(r => /stats\.js|mscreens\.css|app\.js/.test(r.url))
out.net = wanted.map(r => ({ url: r.url.replace('http://localhost:5770',''), bytes: r.bytes }))
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill()
