import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'rl' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
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
  if (r.result?.exceptionDetails) return { __err: r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text }
  return r.result?.result?.value
}
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)

console.log('reducedMotion matches =', await js(`matchMedia('(prefers-reduced-motion: reduce)').matches`))
console.log('document.hidden =', await js('document.hidden'))

const INSTRUMENT = `(() => {
  if (window.__rafSpy) return 'already'
  const orig = window.requestAnimationFrame.bind(window)
  window.__rafSpy = { on: false, tags: {} , n: 0 }
  window.requestAnimationFrame = function (cb) {
    if (window.__rafSpy.on) {
      let tag = 'unknown'
      try { throw new Error('x') } catch (e) {
        const lines = (e.stack || '').split('\n')
        tag = (lines[2] || lines[1] || '').trim().replace(/^at /, '').slice(0, 90)
      }
      window.__rafSpy.n++
      window.__rafSpy.tags[tag] = (window.__rafSpy.tags[tag] || 0) + 1
    }
    return orig(cb)
  }
  return 'installed'
})()`

async function measure(label, secs = 3) {
  await js(`(() => { window.__rafSpy.n = 0; window.__rafSpy.tags = {}; window.__rafSpy.on = true
    window.__mut = 0
    if (window.__mo) window.__mo.disconnect()
    const m = document.getElementById('machine')
    window.__mo = new MutationObserver((recs) => { window.__mut += recs.length })
    if (m) window.__mo.observe(m, { attributes: true, childList: true, subtree: true, characterData: true })
    return 1 })()`)
  const spin0 = await js(`getComputedStyle(document.querySelector('.mscreen-countdown .cdn') || document.documentElement).getPropertyValue('--spin')`)
  const p0 = await js(`(document.querySelector('.mld')||{style:{getPropertyValue:()=>''}}).style.getPropertyValue('--p')`)
  await sleep(secs * 1000)
  const res = await js(`JSON.stringify({ n: window.__rafSpy.n, mut: window.__mut, tags: Object.entries(window.__rafSpy.tags).sort((a,b)=>b[1]-a[1]).slice(0,6) })`)
  await js('window.__rafSpy.on = false; window.__mo && window.__mo.disconnect(); 1')
  const spin1 = await js(`getComputedStyle(document.querySelector('.mscreen-countdown .cdn') || document.documentElement).getPropertyValue('--spin')`)
  const p1 = await js(`(document.querySelector('.mld')||{style:{getPropertyValue:()=>''}}).style.getPropertyValue('--p')`)
  const vis = await js(`JSON.stringify({
    stageHidden: document.getElementById('stage') ? document.getElementById('stage').hidden : null,
    bodyMode: document.body.dataset.mode,
    mldRects: (document.querySelector('.mld')||{getClientRects:()=>[]}).getClientRects().length,
    cdnRects: (document.querySelector('.mscreen-countdown .cdn')||{getClientRects:()=>[]}).getClientRects().length,
    machineRects: (document.getElementById('machine')||{getClientRects:()=>[]}).getClientRects().length
  })`)
  console.log('\n=== ' + label + ' ===')
  console.log(' visibility:', vis)
  console.log(' result:', res)
  console.log(' --spin', spin0, '->', spin1, '  --p', JSON.stringify(p0), '->', JSON.stringify(p1))
}

await js(INSTRUMENT)

// CONTROL 1: never visited machine at all, sitting on mobile
await js(`window.showcase.mode('mobile'); 1`); await sleep(1500)
await measure('control: mobile tab, machine never opened')

// loading
await js(`window.showcase.mode('machine'); 1`); await sleep(800)
await js(`window.showcase.mscreen('loading', { from: 'bar' }); 1`); await sleep(2500)
await measure('machine tab showing loading (baseline, visible)')
await js(`window.showcase.mode('mobile'); 1`); await sleep(2000)
await measure('AFTER switching to mobile, loading was last mscreen')

// control: default screen
await js(`window.showcase.mode('machine'); 1`); await sleep(500)
await js(`window.showcase.mscreen('default', { from: 'bar' }); 1`); await sleep(1500)
await js(`window.showcase.mode('mobile'); 1`); await sleep(2000)
await measure('control: default mscreen, then mobile')

// countdown
await js(`window.showcase.mode('machine'); 1`); await sleep(500)
await js(`window.showcase.mscreen('countdown', { from: 'bar' }); 1`); await sleep(2500)
await js(`window.showcase.mode('mobile'); 1`); await sleep(2000)
await measure('AFTER switching to mobile, countdown was last mscreen')

// long soak: does loading really restart forever?
console.log('\n--- soak 20s on mobile with countdown left running ---')
await sleep(20000)
await measure('soak +20s later, still on mobile (countdown)')

// does going to ds / case overlay stop it?
await js(`window.showcase.mode('system'); 1`); await sleep(2000)
await measure('design system tab, countdown still last mscreen')

console.log('\nerrors:', JSON.stringify(errs.slice(0, 6)))
ws.close(); chrome.kill()
