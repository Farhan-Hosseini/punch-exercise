// SKEPTIC probe 3: prove the checkVisibility hook actually installs (negative control),
// then read the exact guard chain of drive() on each screen, and collect page exceptions.
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
   `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'skg' + port)}`,
   '--window-size=1440,1000', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '').slice(0, 200))
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
await send('Page.addScriptToEvaluateOnNewDocument', { source: `
(() => {
  window.__cv = 0
  const o = Element.prototype.checkVisibility
  window.__cvWasFunction = typeof o
  Element.prototype.checkVisibility = function (...a) { window.__cv++; return o.apply(this, a) }
  window.__hookInstalled = Element.prototype.checkVisibility.toString().indexOf('__cv') !== -1
})()` })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

const out = {}
// NEGATIVE CONTROL: call checkVisibility myself; the counter must move
out.control = JSON.parse(await js(`JSON.stringify((() => {
  const before = window.__cv
  const v = document.querySelector('.s-video video.rv')
  const r = v.checkVisibility()
  return { cvWasFunction: window.__cvWasFunction, hookInstalled: window.__hookInstalled,
           counterBefore: before, counterAfter: window.__cv, manualResult: r }
})())`))

const guard = async (label) => {
  await js('window.__cv = 0; 1'); await sleep(4000)
  out[label] = JSON.parse(await js(`JSON.stringify((() => {
    const v = document.querySelector('.s-video video.rv')
    const machine = document.getElementById('machine')
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const screen = document.getElementById('screen')
    return {
      mscreen: machine.dataset.mscreen,
      g1_notReduced: !reduced,
      g2_notHidden: !document.hidden,
      g3_isResult: machine.dataset.mscreen === 'result',
      g4_seen: v._seen,
      g5_checkVisibility: v.checkVisibility(),
      screenHidden: screen ? screen.hidden : null,
      screenDisplay: screen ? getComputedStyle(screen).display : null,
      videoDisplay: getComputedStyle(v).display,
      paused: v.paused,
      cvCallsIn4s_excludingMine: window.__cv - 1
    }
  })())`))
}
await guard('A_default')
await js(`window.showcase.mode('machine'); 1`); await sleep(1200)
await js(`window.showcase.mscreen('result'); 1`); await sleep(3000)
await guard('B_onResult')
out.errors = errs.slice(0, 8)
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill()
