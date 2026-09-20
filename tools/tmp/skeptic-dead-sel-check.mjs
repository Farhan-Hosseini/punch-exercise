import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'dz' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
const sels = ['.ds-lockups', '.ds-lockup figcaption', '.ds-foot', '.ds-index-list a[aria-current]', '.ds-flowlist .ds-pick']
const probe = (m) => `JSON.stringify({mode:document.body.dataset.mode, hits: ${JSON.stringify(sels)}.map(s=>{try{const n=document.querySelectorAll(s); const vis=[...n].filter(e=>e.getClientRects().length>0).length; return s+' n='+n.length+' visible='+vis}catch(e){return s+' ERR'}})})`
await js(`window.showcase.mode('ds'); 1`); await sleep(3500)
console.log("after showcase.mode('ds'):    ", await js(probe()))
await js(`window.showcase.mode('system'); 1`); await sleep(4500)
await js(`(async()=>{const s=document.scrollingElement;for(let y=0;y<s.scrollHeight;y+=900){s.scrollTo(0,y);await new Promise(r=>setTimeout(r,50))}s.scrollTo(0,0);return 1})()`); await sleep(2000)
console.log("after showcase.mode('system'):", await js(probe()))
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'dz' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
