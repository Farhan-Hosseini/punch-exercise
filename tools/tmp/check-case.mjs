// a pass down the whole case study: console errors, horizontal overflow, and any text that spills its box
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = Number(process.argv[2] || 1440)
const port = 9400 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'cc' + port)}`, `--window-size=${W},900`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).split('\n')[0])
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map((a) => a.value || a.description).join(' ').split('\n')[0])
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)
await js("document.getElementById('openCase').click(); 1"); await sleep(4000)
// scroll the whole thing so every lazy piece runs
const H = await js("document.getElementById('caseScroll').scrollHeight")
for (let y = 0; y < H; y += 700) { await js(`document.getElementById('caseScroll').scrollTo(0, ${y}); 1`); await sleep(90) }
await sleep(1200)
console.log(await js(`JSON.stringify((() => {
  const sc = document.getElementById('caseScroll')
  const over = []
  for (const el of document.querySelectorAll('#case *')) {
    if (el.scrollWidth - el.clientWidth > 2 && getComputedStyle(el).overflowX === 'visible') over.push(el.className + ' +' + (el.scrollWidth - el.clientWidth))
  }
  return {
    hOverflow: Math.max(0, sc.scrollWidth - sc.clientWidth),
    scrollH: sc.scrollHeight,
    spilling: over.slice(0, 8),
    emptySections: [...document.querySelectorAll('#case .cs-sec')].filter(s => s.getBoundingClientRect().height < 60).map(s => s.id || s.className),
    navTargets: [...document.querySelectorAll('.cs-localnav-links a')].map(a => ({ label: a.textContent.trim(), ok: !!document.querySelector(a.getAttribute('href')) })),
    chapterTargets: [...document.querySelectorAll('.cs-chapters a')].map(a => ({ label: a.querySelector('.cs-ch-n').textContent.trim(), ok: !!document.querySelector(a.getAttribute('href')) })),
  }
})())`, null, 1))
console.log('errors:', JSON.stringify(errs.slice(0, 6)))
ws.close(); chrome.kill()
