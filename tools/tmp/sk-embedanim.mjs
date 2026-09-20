import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = 1440, H = 1000, port = 9208
const prof = join(tmpdir(), 'skepEmbedProf2')
await rm(prof, { recursive: true, force: true })
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disk-cache-size=1', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return 'ERR:' + (r.result.exceptionDetails.exception?.description||'').slice(0,140); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable'); await send('HeapProfiler.enable'); await send('Performance.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
const gc = async (l) => { await send('HeapProfiler.collectGarbage'); await sleep(500); const d = (await send('Memory.getDOMCounters')).result; return { at: l, nodes: d.nodes, listeners: d.jsEventListeners } }
const met = async (n) => { const ms = (await send('Performance.getMetrics')).result.metrics; return ms.find(x=>x.name===n).value }
const out = []
out.push(await gc('rest'))
// Animation tab: does its linked machine get released on the way back out?
await js(`window.showcase.mode('animation'); 1`); await sleep(9000)
out.push(await gc('animation tab'))
await js(`window.showcase.mode('mobile'); 1`); await sleep(4000)
out.push(await gc('back to mobile'))
out.push({ at: 'linked frame src after leaving animation', src: await js(`document.querySelector('.linked iframe')?.getAttribute('src') ?? 'NO FRAME'`) })
// DS tab: liveGlass release, for contrast
await js(`window.showcase.mode('ds'); 1`); await sleep(8000)
out.push(await gc('ds tab'))
await js(`window.showcase.mode('mobile'); 1`); await sleep(5000)
out.push(await gc('back to mobile from ds'))
out.push({ at: 'ds live frames', srcs: JSON.parse(await js(`JSON.stringify([...document.querySelectorAll('.ds-stage iframe')].map(f=>f.getAttribute('src')))`) || '[]') })
// second CPU sample, case closed vs never opened already measured; repeat the after-close idle cost
const a = await met('TaskDuration'), sa = await met('ScriptDuration'); await sleep(8000)
out.push({ at: 'idle 8s WITHOUT case ever opened (this run)', taskSec: Math.round((await met('TaskDuration') - a)*1000)/1000, scriptSec: Math.round((await met('ScriptDuration') - sa)*1000)/1000 })
await js(`document.getElementById('openCase').click(); 1`); await sleep(9000)
await js(`document.getElementById('closeCase').click(); 1`); await sleep(3000)
const b = await met('TaskDuration'), sb = await met('ScriptDuration'); await sleep(8000)
out.push({ at: 'idle 8s AFTER case opened+closed (same run)', taskSec: Math.round((await met('TaskDuration') - b)*1000)/1000, scriptSec: Math.round((await met('ScriptDuration') - sb)*1000)/1000 })
out.push(await gc('final'))
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill(); await sleep(800); await rm(prof, { recursive: true, force: true })
