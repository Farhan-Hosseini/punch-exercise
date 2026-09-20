// SKEPTIC probe 2: on a FRESH page, is checkVisibility() ever reached from the 300ms interval?
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9600 + Math.floor(Math.random() * 90)
const prof = join(tmpdir(), 'skv' + port)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
   `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`,
   '--window-size=1440,1000', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
await send('Page.addScriptToEvaluateOnNewDocument', { source: `
(() => {
  window.__cv = 0; window.__cvEl = {}
  const o = Element.prototype.checkVisibility
  if (o) Element.prototype.checkVisibility = function (...a) {
    window.__cv++; const k = this.tagName + '.' + (this.className || '').split(' ')[0]
    window.__cvEl[k] = (window.__cvEl[k] || 0) + 1; return o.apply(this, a)
  }
  window.__rafFrame = 0
  const oR = window.requestAnimationFrame
  window.requestAnimationFrame = function (cb) {
    const mine = ((new Error()).stack || '').indexOf('at frame (') !== -1
    return oR.call(window, function (x) { if (mine) window.__rafFrame++; return cb(x) })
  }
})()` })

const out = {}
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

const probe = async (label, secs = 8) => {
  await js('window.__cv = 0; window.__cvEl = {}; window.__rafFrame = 0; 1')
  await sleep(secs * 1000)
  out[label] = JSON.parse(await js(`JSON.stringify({
    mscreen: document.getElementById('machine').dataset.mscreen,
    mode: document.documentElement.getAttribute('data-mode'),
    checkVisibilityCalls: window.__cv, byElement: window.__cvEl,
    framesFromVideoLoop: window.__rafFrame,
    reelsPlaying: [...document.querySelectorAll('.s-video video.rv')].map(v => !v.paused),
    reelTime: [...document.querySelectorAll('.s-video video.rv')].map(v => +v.currentTime.toFixed(2)),
    secs: ${secs}
  })`))
}
await probe('case1_default_mobileTab')
await js(`window.showcase.mode('machine'); 1`); await sleep(1200)
await js(`window.showcase.mscreen('result'); 1`); await sleep(3000)
await probe('case3_sittingOnResult')
await js(`window.showcase.mode('mobile'); 1`); await sleep(1500)
await probe('case2_resultLeftOpen_backOnMobile')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await probe('case4_afterReload_restoredState')
out.savedState = await js(`(() => { try { return JSON.stringify(Object.keys(localStorage).map(x => [x, (localStorage[x]||'').slice(0,200)])) } catch { return 'n/a' } })()`)
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill()
