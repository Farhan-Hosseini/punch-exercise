import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeFileSync } from 'node:fs'
const port = 9700 + Math.floor(Math.random() * 60)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1600,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 200 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return '__ERR__' + JSON.stringify(r.result.exceptionDetails).slice(0,600); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(7000)
await js(`window.showcase.mode('machine'); 1`); await sleep(1500)
await js(`window.showcase.mscreen('score'); 1`); await sleep(2000)
await js(`window.showcase.sec('machine','score','again',1); 1`); await sleep(1500)
const OFF = `(() => { let s=document.getElementById('nofftb'); if(!s){s=document.createElement('style');s.id='nofftb';document.head.appendChild(s)} s.textContent='*, *::before, *::after { text-box-trim: none !important; }'; return 1 })()`
const ON  = `(() => { const s=document.getElementById('nofftb'); if(s) s.textContent=''; return 1 })()`
// scroll the Punch again section into view and get its rect
const RECT = `(() => { const e=document.querySelector('.mscreen-score .ag-sec'); if(!e) return null; const r=e.getBoundingClientRect(); return JSON.stringify({x:Math.max(0,r.left-20),y:Math.max(0,r.top-20),w:Math.min(r.width+40, innerWidth-r.left),h:r.height+40}) })()`
await js(ON); await sleep(500)
const rect = JSON.parse(await js(RECT) || 'null')
console.log('CLIP', JSON.stringify(rect))
if (rect) {
  for (const [label, expr] of [['with-textbox', ON], ['without-textbox', OFF]]) {
    await js(expr); await sleep(900)
    const r2 = JSON.parse(await js(RECT))
    const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: r2.x, y: r2.y, width: r2.w, height: r2.h, scale: 1 }, captureBeyondViewport: false })
    writeFileSync(`C:/Claude Database/punch-exercise/tools/tmp/tb-${label}.png`, Buffer.from(shot.result.data, 'base64'))
    console.log('wrote', label, 'rect', JSON.stringify(r2))
  }
}
ws.close(); chrome.kill()
