/* How long does one embedded glass take to boot, and what does the tab hold afterwards? */
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sb' + port)}`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0
const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Performance.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(2500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(9000)
const metric = async (label) => {
  const m = (await send('Performance.getMetrics')).result?.result?.metrics || []
  const g = (n) => m.find((x) => x.name === n)?.value
  console.log(label, '| Nodes', g('Nodes'), '| JSHeapUsedSize MB', Math.round(g('JSHeapUsedSize') / 1048576), '| LayoutCount', g('LayoutCount'), '| RecalcStyleCount', g('RecalcStyleCount'))
}
await metric('parent only            ')
// time one embed from src set to its own load event
const boot = await js(`(async () => {
  const f = document.getElementById('linkedFrame')
  f.removeAttribute('src')
  const t0 = performance.now()
  const done = new Promise(r => f.addEventListener('load', () => r(performance.now() - t0), { once: true }))
  f.setAttribute('src', './?embed=machine')
  const load = await done
  const w = f.contentWindow
  await new Promise(r => setTimeout(r, 2500))
  const n = w.performance.getEntriesByType('navigation')[0]
  return JSON.stringify({ loadEventMs: Math.round(load), dcl: Math.round(n.domContentLoadedEventEnd), loadEnd: Math.round(n.loadEventEnd), els: w.document.querySelectorAll('*').length, scripts: w.document.querySelectorAll('script[src]').length })
})()`)
console.log('one embed boot:', boot)
await metric('parent + 1 embed       ')
await js(`(()=>{const b=document.getElementById('openCase'); if(b) b.click(); return !!b})()`); await sleep(9000)
await js(`(async()=>{const d=document.getElementById('case');const sc=d.querySelector('.cs-scroll')||d;const h=sc.scrollHeight;for(let y=0;y<h;y+=800){sc.scrollTop=y;await new Promise(r=>setTimeout(r,90))}return h})()`); await sleep(7000)
await metric('parent + 3 embeds      ')
console.log('frame element counts:', await js(`JSON.stringify([...document.querySelectorAll('iframe')].map(f=>{try{return f.contentDocument?f.contentDocument.querySelectorAll('*').length:0}catch(e){return -1}}))`))
ws.close(); chrome.kill(); process.exit(0)
