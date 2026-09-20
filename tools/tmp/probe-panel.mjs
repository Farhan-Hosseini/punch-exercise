// one-off: on the machine screen, which Customise groups are actually visible, and how does the Reset button
// sit against the panel's rounded bottom?
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const port = 9500 + Math.floor(Math.random() * 80)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'pp' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 80 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0
const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (method, params = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method, params })) })
const js = async (e) => {
  const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description)
  return r.result?.result?.value
}
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5000)
await js("window.showcase.mode('machine'); window.showcase.mscreen('scan'); 1"); await sleep(2000)
await js("document.getElementById('openCustom').click(); 1"); await sleep(1200)

console.log(await js(`JSON.stringify((() => {
  const subs = [...document.querySelectorAll('.custom .cus-sub')].map(el => ({
    label: (el.querySelector('.acc-sub') || {}).textContent || '(none)',
    when: el.dataset.when || '(always)',
    hidden: el.hidden || el.offsetParent === null
  }))
  const panel = document.getElementById('custom')
  const reset = document.getElementById('resetCustom')
  const pr = panel.getBoundingClientRect(), rr = reset.getBoundingClientRect()
  const pcs = getComputedStyle(panel), rcs = getComputedStyle(reset)
  const wrap = reset.parentElement
  const wcs = getComputedStyle(wrap)
  return {
    visibleSubs: subs.filter(s => !s.hidden).map(s => s.label + '  [' + s.when + ']'),
    hiddenSubs: subs.filter(s => s.hidden).map(s => s.label),
    panel: { radius: pcs.borderRadius, bottom: Math.round(pr.bottom), left: Math.round(pr.left), right: Math.round(pr.right) },
    reset: { radius: rcs.borderRadius, bottom: Math.round(rr.bottom), left: Math.round(rr.left), right: Math.round(rr.right) },
    wrap: { tag: wrap.tagName + '.' + wrap.className, position: wcs.position, padding: wcs.padding, radius: wcs.borderRadius },
    gapToPanelBottom: Math.round(pr.bottom - rr.bottom),
    insetLeft: Math.round(rr.left - pr.left), insetRight: Math.round(pr.right - rr.right)
  }
})())`, null, 1))
ws.close(); chrome.kill()
