import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9900 + Math.floor(Math.random() * 60)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'t3'+port)}`,'--window-size=1600,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 150 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return '__ERR__' + JSON.stringify(r.result.exceptionDetails).slice(0, 300); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(7000)
await js(`window.showcase.mode('machine'); 1`); await sleep(1200)
await js(`window.showcase.mscreen('default'); 1`); await sleep(1500)
console.log('SECS', await js(`JSON.stringify(window.showcase.sections('machine','default'))`))
// walk every design of every section until a text-box element is visible, then measure
console.log(await js(`JSON.stringify(await (async () => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms))
  const found = []
  for (const s of window.showcase.sections('machine','default')) {
    for (let i = 0; i < s.names.length; i++) {
      window.PSec.set('machine','default', s.key, i)
      await wait(60)
      const els = [...document.querySelectorAll('#screenContent *')].filter(e => { const st = getComputedStyle(e); if (!st.textBoxTrim || st.textBoxTrim === 'none') return false; const r = e.getBoundingClientRect(); return r.height > 1 && r.width > 1 })
      if (!els.length) continue
      const before = els.slice(0, 6).map(e => { const r = e.getBoundingClientRect(); return { e, cls: String(e.className).slice(0,26), txt: e.textContent.trim().slice(0,14), h: r.height, y: r.top } })
      const st = document.createElement('style'); st.textContent = '*, *::before, *::after { text-box: normal !important; }'; document.head.appendChild(st)
      void document.body.offsetHeight
      const rows = before.map(b => { const r = b.e.getBoundingClientRect(); return { cls: b.cls, txt: b.txt, h: +b.h.toFixed(1) + '->' + (+r.height.toFixed(1)), dh: +(r.height - b.h).toFixed(2), dy: +(r.top - b.y).toFixed(2) } })
      st.remove()
      found.push({ sec: s.key, design: s.names[i], n: els.length, rows })
      if (found.length >= 4) return found
    }
    window.PSec.set('machine','default', s.key, 0)
  }
  return found
})())`))
ws.close(); chrome.kill()
