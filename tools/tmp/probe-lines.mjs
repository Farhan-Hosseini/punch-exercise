// Counts the line boxes of the phone's wait line ("Waiting for your" over "phone") in every Code design that shows it,
// and through the scan's own states, so a text swap by mobile.js would be caught.
// node tools/tmp/probe-lines.mjs
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = 1440
const port = 9700 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'pl' + port)}`, `--window-size=${W},1100`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 300 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description?.split('\n')[0]) })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 1100, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js("window.showcase.mode('mobile'); 1"); await sleep(1800)
await js("window.punchApp.go('scan'); 1"); await sleep(1800)
const probe = `JSON.stringify((() => {
  const all = [...document.querySelectorAll('.m-page[data-page="scan"] .psc-glass-wait')]
  const el = all[0]
  // a design that is not on show has no line boxes: say which design shows and that the wait line is not in it
  if (el.closest('[data-sv]').hidden) return { waitLinesOnPage: all.length, shownDesign: window.PSec.active('phone', 'scan', 'code').dataset.sv, waitShown: false }
  const span = el.querySelector('span')
  const r = document.createRange(); r.selectNodeContents(span)
  const rects = [...r.getClientRects()].filter((b) => b.width > 0)
  const tops = [...new Set(rects.map((b) => Math.round(b.top)))]
  const nodes = [...span.childNodes].map((n) => n.nodeName === 'BR' ? '<br>' : n.textContent)
  const second = (span.childNodes[2] || {}).textContent
  const dot = el.querySelector('i').getBoundingClientRect(), first = rects[0]
  const glass = el.closest('.psc-glass').getBoundingClientRect()
  const design = el.closest('[data-sv]')
  return { waitLinesOnPage: all.length, lines: tops.length, nodes, second, dotOnFirstLine: dot.top >= first.top && dot.bottom <= first.bottom, waitBottomToGlassBottom: Math.round(glass.bottom - el.getBoundingClientRect().bottom), shownDesign: design.dataset.sv, designHidden: design.hidden }
})())`
const out = {}
for (const i of [0, 1, 2, 3, 4]) {
  await js(`window.PSec.set('phone', 'scan', 'code', ${i}); 1`); await sleep(700)
  const name = await js("window.PSec.active('phone','scan','code').dataset.sv")
  out[name] = JSON.parse(await js(probe))
}
// the scan's own states: the wait line must not be rewritten by mobile.js while scanning or found
await js("window.PSec.set('phone', 'scan', 'code', 2); 1"); await sleep(500)
await js("document.getElementById('mScanBtn').click(); 1"); await sleep(900)
out['On the machine, scanning'] = JSON.parse(await js(probe))
await sleep(3500)
out['On the machine, after the scan'] = JSON.parse(await js(probe))
console.log(JSON.stringify(out, null, 1))
console.log('errors', errs)
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'pl' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
