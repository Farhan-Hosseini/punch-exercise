import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1600,1000','about:blank'], { stdio: 'ignore' })
const sleep = ms => new Promise(r => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise(r => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async e => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js(`window.showcase.mode('animation'); 1`); await sleep(6000)
const out = {}
out.embedStats = await js(`(()=>{const f=[...document.querySelectorAll('iframe')].find(f=>(f.getAttribute('src')||'').includes('embed=machine'));if(!f)return 'no embed';const w=f.contentWindow;const rs=w.performance.getEntriesByType('resource').filter(r=>/stats\.js|mscreens\.css/.test(r.name)).map(r=>({n:r.name.split('/').pop(),transfer:r.transferSize,dec:r.decodedBodySize}));return JSON.stringify({ran:typeof w.yourRun==='object', model:w.yourRun?(w.yourRun.model===null?'null (never started)':'built'):'-', nodes:w.document.querySelectorAll('.mscreen[data-mscreen="stats"] *').length, res:rs})})()`)
console.log(out.embedStats)
ws.close(); chrome.kill()
