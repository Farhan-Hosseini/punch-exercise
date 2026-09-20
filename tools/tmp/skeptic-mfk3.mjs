// Third pass: does mf-fill ever run, and does the ring animate? Observe class + computed deg with a MutationObserver.
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9820 + Math.floor(Math.random() * 20)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk3' + port)}`, '--window-size=1600,1100', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 200 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return '__ERR__' + JSON.stringify(r.result.exceptionDetails).slice(0, 400); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1100, deviceScaleFactor: 1, mobile: false })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(2500)
await js('try{localStorage.clear()}catch(e){}; 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js(`(async()=>{ window.showcase.mode('mobile'); await new Promise(r=>setTimeout(r,700)); window.punchApp.go('feed'); await new Promise(r=>setTimeout(r,1000)); return 1 })()`)

console.log('reduced-motion in page:', await js(`matchMedia('(prefers-reduced-motion: reduce)').matches`))
console.log('feed page is-on:', await js(`document.querySelector('.m-page[data-page="feed"]').classList.contains('is-on')`))

console.log('\\nsynchronous class read right after PSec.set:')
console.log(await js(`(()=>{
  window.PSec.set('phone','feed','stories',2)
  const rail = document.querySelector('#mStories').firstElementChild
  return JSON.stringify({ cls: rail.className, anims: rail.getAnimations ? rail.getAnimations().map(a=>a.animationName+':'+a.playState) : 'n/a' })
})()`))

console.log('\\nring --mf-k / deg sampled every ~60ms for 1.6s after a fresh swap:')
console.log(await js(`(async()=>{
  window.PSec.set('phone','feed','stories',0); await new Promise(r=>setTimeout(r,500))
  const t0 = performance.now()
  window.PSec.set('phone','feed','stories',2)
  const out = []
  while (performance.now() - t0 < 1600) {
    const rail = document.querySelector('#mStories').firstElementChild
    const o = document.querySelector('.mf-fr-o')
    out.push([Math.round(performance.now()-t0), rail.className.replace('mf-rail ',''), o ? getComputedStyle(o).getPropertyValue('--mf-k') : '-', o ? ((getComputedStyle(o).backgroundImage.match(/([\\d.]+)deg/)||[])[1] || 'none') : '-'])
    await new Promise(r=>setTimeout(r,60))
  }
  return JSON.stringify(out)
})()`))
ws.close(); chrome.kill()
