// Measures the On the machine card's vertical rhythm: every gap from the card's top to its bottom, in css px.
// node tools/tmp/probe-glass.mjs
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = 1440
const port = 9800 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'pg' + port)}`, `--window-size=${W},1100`, 'about:blank'], { stdio: 'ignore' })
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
await js("window.PSec.set('phone', 'scan', 'code', 2); 1"); await sleep(1200)
const out = await js(`JSON.stringify((() => {
  const g = document.querySelector('.psc-machine .psc-glass')
  // the phone stage may be scaled: measure in the card's own px through offset geometry
  const k = g.getBoundingClientRect().height / g.offsetHeight
  const q = (s) => g.querySelector(s)
  const parts = { logo: q('.psc-glass-logo'), kick: q('.psc-glass-kick'), title: q('.psc-glass-title'), code: q('.psc-hit'), wait: q('.psc-glass-wait') }
  const box = (el) => { const r = el.getBoundingClientRect(), b = g.getBoundingClientRect(); return { top: Math.round((r.top - b.top) / k), bottom: Math.round((r.bottom - b.top) / k), left: Math.round((r.left - b.left) / k), right: Math.round((b.right - r.right) / k), h: Math.round(r.height / k) } }
  const B = Object.fromEntries(Object.entries(parts).map(([n, el]) => [n, box(el)]))
  const gaps = { topToMark: B.logo.top, markToLabel: B.kick.top - B.logo.bottom, labelToHeading: B.title.top - B.kick.bottom, headingToCode: B.code.top - B.title.bottom, codeToWait: B.wait.top - B.code.bottom, waitToBottom: Math.round(g.offsetHeight) - B.wait.bottom }
  const cs = getComputedStyle(g)
  const machine = document.querySelector('.psc-machine'), page = document.querySelector('.m-page[data-page="scan"]')
  return { scale: +k.toFixed(3), glassHeight: g.offsetHeight, glassScrollHeight: g.scrollHeight, glassWidth: g.offsetWidth, padding: cs.padding, mask: cs.maskImage || cs.webkitMaskImage, boxes: B, gaps, codeSideMargins: [B.code.left, B.code.right], machineHeight: machine.offsetHeight, machineWidth: machine.offsetWidth, machineScrollWidth: machine.scrollWidth, pageClientHeight: page.clientHeight, pageScrollHeight: page.scrollHeight, psHeight: document.querySelector('.ps.m-scan').offsetHeight, psComputedHeight: getComputedStyle(document.querySelector('.ps.m-scan')).height, codeSec: document.querySelector('.ps-code').offsetHeight, overflowsCard: [...g.querySelectorAll('*')].some((el) => { const r = el.getBoundingClientRect(), b = g.getBoundingClientRect(); return r.right > b.right + 0.5 || r.left < b.left - 0.5 || r.bottom > b.bottom + 0.5 }) }
})())`)
console.log(out)
console.log('errors', errs)
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'pg' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
