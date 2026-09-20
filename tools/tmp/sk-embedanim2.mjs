import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = 1440, H = 1000, port = 9209
const prof = join(tmpdir(), 'skepEmbedProf3')
await rm(prof, { recursive: true, force: true })
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disk-cache-size=1', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
ws.addEventListener('close', () => { console.log('WS CLOSED'); })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return 'ERR:' + (r.result.exceptionDetails.exception?.description||'').slice(0,140); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable'); await send('HeapProfiler.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
const gc = async (l) => { await send('HeapProfiler.collectGarbage'); await sleep(500); const d = (await send('Memory.getDOMCounters')).result; console.log(JSON.stringify({ at: l, nodes: d.nodes, listeners: d.jsEventListeners })); }
await gc('rest (mobile)')
await js(`window.showcase.mode('animation'); 1`); await sleep(10000)
await gc('animation tab')
await js(`window.showcase.mode('mobile'); 1`); await sleep(4000)
await gc('back to mobile')
console.log('linked src after leaving animation:', await js(`document.querySelector('.linked iframe')?.getAttribute('src') ?? 'NO FRAME'`))
console.log('linked inner nodes:', await js(`(()=>{const f=document.querySelector('.linked iframe'); try { return f && f.contentDocument ? f.contentDocument.querySelectorAll('*').length : -1 } catch(e){ return -2 }})()`))
await js(`window.showcase.mode('ds'); 1`); await sleep(9000)
await gc('ds tab')
console.log('ds live srcs:', await js(`JSON.stringify([...document.querySelectorAll('iframe[data-live], .ds-stage iframe')].map(f=>f.getAttribute('src')))`))
await js(`window.showcase.mode('mobile'); 1`); await sleep(6000)
await gc('back to mobile from ds')
console.log('ds live srcs after leaving:', await js(`JSON.stringify([...document.querySelectorAll('iframe[data-live], .ds-stage iframe')].map(f=>f.getAttribute('src')))`))
ws.close(); chrome.kill(); await sleep(800); await rm(prof, { recursive: true, force: true })
