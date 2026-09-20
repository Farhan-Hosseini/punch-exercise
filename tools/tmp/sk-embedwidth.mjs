import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = Number(process.argv[2] || 390), H = 900
const port = 9800 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sw' + port)}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return 'ERR:' + (r.result.exceptionDetails.exception?.description||'').slice(0,120); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable'); await send('HeapProfiler.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 768 })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
const gc = async () => { await send('HeapProfiler.collectGarbage'); await sleep(500); return (await send('Memory.getDOMCounters')).result.nodes }
const before = await gc()
const gate = await js(`JSON.stringify({ deskgate: getComputedStyle(document.querySelector('.deskgate')).display, caseDisp: getComputedStyle(document.getElementById('case')).display, openBtnBox: (()=>{const b=document.getElementById('openCase'); const r=b.getBoundingClientRect(); return {w:Math.round(r.width),h:Math.round(r.height),disp:getComputedStyle(b).display}})() })`)
await js(`document.getElementById('openCase').click(); 1`); await sleep(9000)
const after = await gc()
const srcs = await js(`JSON.stringify([...document.querySelectorAll('#case iframe[data-embed]')].map(f=>f.getAttribute('src')))`)
console.log(JSON.stringify({ width: W, gate: JSON.parse(gate), nodesBefore: before, nodesAfterOpen: after, embedSrcs: JSON.parse(srcs) }, null, 1))
ws.close(); chrome.kill()
