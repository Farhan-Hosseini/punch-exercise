import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return '__ERR__' + JSON.stringify(r.result.exceptionDetails).slice(0,500); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(7000)

const PATH = `(e) => { const p=[]; let n=e; while(n&&n!==document.body&&p.length<6){ p.unshift(n.tagName.toLowerCase()+(n.className&&n.className.toString?('.'+n.className.toString().trim().split(/\s+/).slice(0,2).join('.')):'')); n=n.parentElement } return p.join(' > ') }`

for (const mode of ['machine','mobile','animation','ds']) {
  await js(`window.showcase.mode('${mode}'); 1`); await sleep(2500)
  const r = await js(`JSON.stringify((() => {
    const path = ${PATH}
    const all = [...document.querySelectorAll('*')].filter(e => { const v = getComputedStyle(e).textBoxTrim; return v && v !== 'none' })
    const vis = all.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 })
    return { mode: '${mode}', trimmed: all.length, visible: vis.length, sample: vis.slice(0,6).map(e => ({ p: path(e), h: +e.getBoundingClientRect().height.toFixed(1), fs: getComputedStyle(e).fontSize, lh: getComputedStyle(e).lineHeight, txt: (e.textContent||'').trim().slice(0,22) })) }
  })())`)
  console.log(r)
}
ws.close(); chrome.kill()
