import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const KEYARG = process.argv[2] || 'ds'
const port = 9800 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'jc' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Profiler.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Profiler.startPreciseCoverage', { callCount: true, detailed: true })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js(`window.showcase.mode('${KEYARG}'); 1`); await sleep(4500)
await js(`(async()=>{const s=document.scrollingElement;for(let y=0;y<s.scrollHeight;y+=800){s.scrollTo(0,y);await new Promise(r=>setTimeout(r,55))}s.scrollTo(0,0);return 1})()`); await sleep(2500)
const r = await send('Profiler.takePreciseCoverage')
const ds = (r.result?.result || []).filter(x => /\/ds\.js$/.test(x.url))
let uncalled = 0, called = 0, names = []
for (const s of ds) for (const f of s.functions) { const hit = f.ranges.some(g => g.count > 0); if (hit) called++; else { uncalled++; if (f.functionName) names.push(f.functionName) } }
console.log(`key='${KEYARG}' body.dataset.mode='${await js('document.body.dataset.mode')}' ds.js functions: called=${called} uncalled=${uncalled}`)
console.log('  uncalled sample:', names.slice(0, 14).join(', '))
ws.close(); chrome.kill()
