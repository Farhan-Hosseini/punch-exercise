import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'gif' + port)}`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' })
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
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3000)
await js('try{localStorage.clear()}catch(e){};1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js(`window.showcase.mode('animation');1`); await sleep(2500)
console.log(await js(`JSON.stringify([...document.querySelectorAll('.anim-files a')].map(a=>{
  const r=a.getBoundingClientRect(); const cs=getComputedStyle(a);
  return {text:a.textContent.trim(), href:a.getAttribute('href'), download:a.hasAttribute('download'),
          w:Math.round(r.width), h:Math.round(r.height), display:cs.display, visibility:cs.visibility, opacity:cs.opacity,
          offscreenHidden: !!a.closest('[hidden]')}
}))`))
// prove a click actually fetches it: fetch the same URL the anchor points at
console.log(await js(`(async()=>{const a=document.querySelector('.anim-files a[href$=".gif"]'); if(!a) return 'NO GIF ANCHOR';
  const r=await fetch(a.href,{method:'GET'}); const b=await r.blob(); return JSON.stringify({href:a.getAttribute('href'),status:r.status,type:r.headers.get('content-type'),bytes:b.size})})()`))
ws.close(); chrome.kill()
