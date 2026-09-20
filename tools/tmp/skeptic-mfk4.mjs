// Fourth pass: with motion on, do the two candidate fixes keep the mf-fill animation working?
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9760 + Math.floor(Math.random() * 20)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk4' + port)}`, '--window-size=1600,1100', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 200 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return '__ERR__' + JSON.stringify(r.result.exceptionDetails).slice(0, 400); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1100, deviceScaleFactor: 1, mobile: false })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(2500)
await js('try{localStorage.clear()}catch(e){}; 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js(`(async()=>{ window.showcase.mode('mobile'); await new Promise(r=>setTimeout(r,700)); window.punchApp.go('feed'); await new Promise(r=>setTimeout(r,1000)); return 1 })()`)

const run = async (label, css) => {
  await js(`(()=>{ const o=document.getElementById('sk'); if(o) o.remove(); ${css ? `const s=document.createElement('style'); s.id='sk'; s.textContent=${JSON.stringify(css)}; document.head.append(s);` : ''} return 1 })()`)
  await sleep(400)
  const r = await js(`(async()=>{
    window.PSec.set('phone','feed','stories',0); await new Promise(r=>setTimeout(r,500))
    const t0 = performance.now(); window.PSec.set('phone','feed','stories',2)
    const seen = []
    while (performance.now() - t0 < 760) {
      const o = document.querySelector('.mf-fr-o'); const cs = o && getComputedStyle(o)
      seen.push([Math.round(performance.now()-t0), cs ? cs.getPropertyValue('--mf-k') : '-', cs ? ((cs.backgroundImage.match(/([\\d.]+)deg/)||[])[1] || 'NO-GRADIENT('+cs.backgroundImage+')') : '-'])
      await new Promise(r=>setTimeout(r,90))
    }
    return JSON.stringify(seen)
  })()`)
  console.log(label + ':\n  ' + r)
}

await run('A. as shipped (registered @property)', '')
await run('B. no @property at all (unregistered var, what FF<128 / Safari<16.4 compute)', '.mf-fr-o { background: conic-gradient(var(--m-red) calc(var(--f) * var(--mf-k-unreg) * 360deg), var(--m-line-2) 0) !important; }')
await run("C. reporter's fix: .mf-fr-o { --mf-k: 1 }", '.mf-fr-o { --mf-k: 1; }')
await run('D. fallback inside var(): var(--mf-k, 1)', '.mf-fr-o { background: conic-gradient(var(--m-red) calc(var(--f) * var(--mf-k, 1) * 360deg), var(--m-line-2) 0); }')
await run('E. plain declaration on the ANIMATED element: .mf-force { --mf-k: 1 }', '.mf-force { --mf-k: 1; }')
ws.close(); chrome.kill()
