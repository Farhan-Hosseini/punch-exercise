// SKEPTIC probe 4: does the page already keep the frame pipeline awake without the video loop?
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9800 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
   `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'ska' + port)}`,
   '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
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
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6500)
const out = {}
out.runningAnimations = JSON.parse(await js(`JSON.stringify((() => {
  const a = document.getAnimations()
  const inf = a.filter(x => x.playState === 'running' && (x.effect && x.effect.getTiming().iterations === Infinity))
  const names = {}
  for (const x of inf) { const n = (x.animationName || (x.effect && x.effect.target && x.effect.target.className) || '?').toString().slice(0, 40); names[n] = (names[n] || 0) + 1 }
  return { total: a.length, running: a.filter(x => x.playState === 'running').length, infiniteRunning: inf.length, sample: Object.entries(names).slice(0, 12) }
})())`))
// how many other timers/intervals does the page keep alive?
out.docLines = JSON.parse(await js(`JSON.stringify((() => {
  const s = document.getElementById('machine')
  return { mscreen: s.dataset.mscreen, sVideoInDom: !!document.querySelector('.s-video'), reels: document.querySelectorAll('.s-video video.rv').length }
})())`))
// embed iframe on the Animation tab = a second copy of the same document
await js(`window.showcase.mode('animation'); 1`); await sleep(6000)
out.animationTab = JSON.parse(await js(`JSON.stringify((() => {
  const f = document.querySelector('iframe')
  let inner = null
  try { inner = { src: f.getAttribute('src'), reels: f.contentDocument.querySelectorAll('.s-video video.rv').length, mscreen: f.contentDocument.getElementById('machine').dataset.mscreen } } catch (e) { inner = { err: String(e) } }
  return { iframes: document.querySelectorAll('iframe').length, inner }
})())`))
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill()
