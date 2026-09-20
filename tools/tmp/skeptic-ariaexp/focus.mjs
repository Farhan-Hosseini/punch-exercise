import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random() * 70)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'af'+port)}`,'--window-size=1440,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)
const desc = `(()=>{const a=document.activeElement;return a?(a.id||a.className||a.tagName)+' | inDialog='+!!a.closest('[role=dialog]'):'none'})()`
const out = {}
out.beforeOpen = await js(desc)
await js(`document.querySelector('#openCase').click(); 1`); await sleep(1000)
out.afterOpenCase = await js(desc)
out.caseIsDialog = await js(`(()=>{const c=document.getElementById('case');return c.getAttribute('role')+'/'+c.getAttribute('aria-modal')+'/open='+c.classList.contains('is-open')})()`)
out.customIsDialog = await js(`(()=>{const c=document.getElementById('custom');return (c.getAttribute('role')||'no-role')+'/'+(c.getAttribute('aria-modal')||'no-modal')})()`)
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill()
