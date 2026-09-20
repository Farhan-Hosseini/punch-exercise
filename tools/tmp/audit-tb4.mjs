import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9960 + Math.floor(Math.random() * 30)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'t4'+port)}`,'--window-size=1600,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 150 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return '__ERR__' + JSON.stringify(r.result.exceptionDetails).slice(0, 400); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(7000)
await js(`window.showcase.mode('machine'); 1`); await sleep(2000)
// what text-box actually removes, on the site's own display font at the site's own sizes
console.log('TRIM DELTA', await js(`JSON.stringify((() => {
  const host = document.querySelector('#machine') || document.body
  const out = []
  for (const size of [60, 120, 240]) {
    const el = document.createElement('span')
    el.style.cssText = 'position:absolute;left:-9999px;top:0;display:block;font:900 ' + size + 'px/1 "Big Shoulders Display", sans-serif;'
    el.textContent = '863,412'
    host.appendChild(el)
    const a = el.getBoundingClientRect().height
    el.style.textBox = 'trim-both cap alphabetic'
    const b = el.getBoundingClientRect().height
    out.push({ size, untrimmed: +a.toFixed(1), trimmed: +b.toFixed(1), removedPx: +(a - b).toFixed(1), applied: getComputedStyle(el).textBoxTrim })
    el.remove()
  }
  return out
})())`))
console.log('DECLS', await js(`JSON.stringify((() => {
  let n = 0, sheets = 0, samples = []
  for (const s of document.styleSheets) { try { sheets++; const walk = (rs) => { for (const r of rs) { if (r.cssRules) { walk(r.cssRules); continue } if (r.style && r.style.getPropertyValue('text-box-trim')) { n++; if (samples.length < 4) samples.push(r.selectorText.slice(0, 80)) } } }; walk(s.cssRules) } catch (e) {} }
  return { sheets, rulesWithTextBox: n, samples }
})())`))
ws.close(); chrome.kill()
