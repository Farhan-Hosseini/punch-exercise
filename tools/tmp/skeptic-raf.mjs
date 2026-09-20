// SKEPTIC probe: does sections/video.html's rAF loop + 300ms interval really run on every tab,
// and does it cost anything? A/B: measure 10s idle, then kill both, measure 10s idle again.
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const RM = process.argv[2] === 'rm' // 'rm' => let Chrome's default (reduce) stand
const port = 9500 + Math.floor(Math.random() * 90)
const flags = ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk' + port)}`,
  '--window-size=1440,1000', 'about:blank']
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', flags, { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => {
  const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) return { __err: r.result.exceptionDetails.text + ' ' + (r.result.exceptionDetails.exception?.description || '') }
  return r.result?.result?.value
}
await send('Runtime.enable'); await send('Page.enable'); await send('Performance.enable')
if (!RM) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })

const HOOK = `
(() => {
  const line = () => {
    const s = (new Error()).stack.split('\\n').slice(1).map((x) => x.trim())
    return s.find((x) => x.indexOf('<anonymous>') === -1) || s[s.length - 1] || 'unknown'
  }
  window.__raf = { fires: {}, ids: {} }
  const oR = window.requestAnimationFrame
  window.requestAnimationFrame = function (cb) {
    const site = line()
    const n = oR.call(window, function (t) { window.__raf.fires[site] = (window.__raf.fires[site] || 0) + 1; return cb(t) })
    window.__raf.ids[site] = n
    return n
  }
  window.__iv = { ids: {}, fires: {} }
  const oI = window.setInterval
  window.setInterval = function (cb, ms, ...a) {
    const site = line() + ' @' + ms
    const n = oI.call(window, function (...b) { window.__iv.fires[site] = (window.__iv.fires[site] || 0) + 1; return cb.apply(this, b) }, ms, ...a)
    window.__iv.ids[site] = n
    return n
  }
  window.__cv = 0
  const oCV = Element.prototype.checkVisibility
  if (oCV) Element.prototype.checkVisibility = function (...a) { window.__cv++; return oCV.apply(this, a) }
  window.__sp = 0
  const oSP = CSSStyleDeclaration.prototype.setProperty
  CSSStyleDeclaration.prototype.setProperty = function (...a) { window.__sp++; return oSP.apply(this, a) }
})()`
await send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK })

await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

const metrics = async () => {
  const r = await send('Performance.getMetrics')
  const o = {}; for (const m of r.result.metrics) o[m.name] = m.value; return o
}
const snap = async () => JSON.parse(await js(`JSON.stringify({
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  mode: document.documentElement.dataset.mode || (window.showcase && showcase.state && showcase.state().mode) || '?',
  mscreen: document.getElementById('machine').dataset.mscreen,
  vids: document.querySelectorAll('.s-video video.rv').length,
  paused: [...document.querySelectorAll('.s-video video.rv')].map(v => v.paused),
  raf: window.__raf.fires, ivFires: window.__iv.fires, cv: window.__cv, sp: window.__sp
})`))

const out = { reducedMotionFlag: RM ? 'default(reduce)' : 'no-preference' }
out.stateAtLoad = await snap()

// --- A: 10s idle on the Mobile tab, untouched ---
const zero = await js('window.__raf.fires = {}; window.__iv.fires = {}; window.__cv = 0; window.__sp = 0; 1')
const mA0 = await metrics(); await sleep(10000); const mA1 = await metrics()
out.A_untouched = { ...(await snap()), window: '10s idle, Mobile tab' }
out.A_cost = {
  ScriptDuration: +(mA1.ScriptDuration - mA0.ScriptDuration).toFixed(4),
  RecalcStyleDuration: +(mA1.RecalcStyleDuration - mA0.RecalcStyleDuration).toFixed(4),
  LayoutDuration: +(mA1.LayoutDuration - mA0.LayoutDuration).toFixed(4),
  TaskDuration: +(mA1.TaskDuration - mA0.TaskDuration).toFixed(4),
  RecalcStyleCount: mA1.RecalcStyleCount - mA0.RecalcStyleCount,
  LayoutCount: mA1.LayoutCount - mA0.LayoutCount,
  Frames: (mA1.Frames || 0) - (mA0.Frames || 0)
}

// --- kill just the video.html interval + rAF chain ---
out.killed = await js(`(() => {
  const key = (o) => Object.keys(o).find(k => /:\\d+:\\d+\\)?$/.test(k))
  const rk = Object.keys(window.__raf.ids), ik = Object.keys(window.__iv.ids)
  let n = 0
  for (const k of rk) if (/video|frame/i.test(k) || true) { /* cancel every outstanding rAF id we know */ }
  // cancel the self-rescheduling loop: find the site whose id keeps advancing
  const before = { ...window.__raf.ids }
  return JSON.stringify({ rafSites: rk, ivSites: ik })
})()`)

// cancel: clear the 300ms interval and cancel the rAF site that belongs to the page document
await js(`(() => {
  for (const [site, n] of Object.entries(window.__iv.ids)) if (/@300$/.test(site)) clearInterval(n)
  window.__killRaf = () => { for (const [site, n] of Object.entries(window.__raf.ids)) if (/localhost:5770/.test(site)) cancelAnimationFrame(n) }
  window.__killRaf()
  // the loop may have already rescheduled; keep cancelling for a moment
  let k = 0; const h = setInterval(() => { window.__killRaf(); if (++k > 40) clearInterval(h) }, 25)
  return 1
})()`)
await sleep(1500)

const zero2 = await js('window.__raf.fires = {}; window.__iv.fires = {}; window.__cv = 0; window.__sp = 0; 1')
const mB0 = await metrics(); await sleep(10000); const mB1 = await metrics()
out.B_afterKill = { ...(await snap()), window: '10s idle, Mobile tab, loop+interval cancelled' }
out.B_cost = {
  ScriptDuration: +(mB1.ScriptDuration - mB0.ScriptDuration).toFixed(4),
  RecalcStyleDuration: +(mB1.RecalcStyleDuration - mB0.RecalcStyleDuration).toFixed(4),
  LayoutDuration: +(mB1.LayoutDuration - mB0.LayoutDuration).toFixed(4),
  TaskDuration: +(mB1.TaskDuration - mB0.TaskDuration).toFixed(4),
  RecalcStyleCount: mB1.RecalcStyleCount - mB0.RecalcStyleCount,
  LayoutCount: mB1.LayoutCount - mB0.LayoutCount,
  Frames: (mB1.Frames || 0) - (mB0.Frames || 0)
}

// --- C: what if the machine was left on the Result screen and the user went back to Mobile? ---
await js(`window.showcase.mode('machine'); 1`); await sleep(800)
await js(`window.showcase.mscreen('result'); 1`); await sleep(2500)
await js(`window.showcase.mode('mobile'); 1`); await sleep(1500)
await js('window.__cv = 0; window.__sp = 0; window.__iv.fires = {}; 1')
await sleep(6000)
out.C_resultLeftOpen_thenMobile = await snap()

out.errors = errs.slice(0, 6)
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill()
