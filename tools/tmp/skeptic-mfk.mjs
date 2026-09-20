// Skeptic pass on the --mf-k @property finding. Read-only against the running dev server on 5770.
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeFileSync, mkdirSync } from 'node:fs'
const OUT = 'C:/Claude Database/punch-exercise/tools/tmp/skeptic-out'
mkdirSync(OUT, { recursive: true })
const port = 9940 + Math.floor(Math.random() * 20)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk' + port)}`, '--window-size=1600,1100', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 200 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errs.push(m.params.entry.text)
  if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails.text))
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return '__ERR__' + JSON.stringify(r.result.exceptionDetails).slice(0, 400); return r.result?.result?.value }
const shot = async (name, sel) => {
  const box = await js(`JSON.stringify((()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}})())`)
  if (!box || box === 'null') { console.log('  no box for', sel); return }
  const b = JSON.parse(box)
  const r = await send('Page.captureScreenshot', { format: 'png', clip: { x: Math.max(0, b.x - 6), y: Math.max(0, b.y - 6), width: Math.max(8, b.w + 12), height: Math.max(8, b.h + 12), scale: 2 } })
  if (r.result?.data) { writeFileSync(join(OUT, name + '.png'), Buffer.from(r.result.data, 'base64')); console.log('  shot ->', name + '.png', JSON.stringify(b)) }
}
await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1100, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(2500)
await js('try{localStorage.clear()}catch(e){}; 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

console.log('1. default state of the stories section:', await js(`JSON.stringify((()=>{
  const g = window.PSec ? window.PSec.get('phone','feed','stories') : 'noPSec'
  return { psecStories: g, hasForce: !!document.querySelector('.mf-force'), ringsPresent: !!document.querySelector('.mf-rings') }
})())`))

// switch to mobile + feed page, then select design index 2 (Force rings)
console.log('2. switch:', await js(`(async()=>{
  if (window.showcase && window.showcase.mode) window.showcase.mode('mobile')
  await new Promise(r=>setTimeout(r,600))
  if (window.punchApp && window.punchApp.go) window.punchApp.go('feed')
  await new Promise(r=>setTimeout(r,800))
  if (window.PSec) window.PSec.set('phone','feed','stories',2)
  await new Promise(r=>setTimeout(r,1500))
  const el = document.querySelector('.mf-fr-o')
  const btn = document.querySelector('.mf-fr')
  const r = el && el.getBoundingClientRect()
  return JSON.stringify({ mode: document.documentElement.getAttribute('data-mode') || document.body.getAttribute('data-mode') || '?', forceRail: !!document.querySelector('.mf-force'), ring: !!el,
    rect: r ? {w:r.width,h:r.height,visible: r.width>0 && r.height>0} : null,
    inlineF: btn ? btn.getAttribute('style') : null, psec: window.PSec ? window.PSec.get('phone','feed','stories') : 'none' })
})()`))

console.log('3. computed on the REAL ring (registered, as shipped):', await js(`JSON.stringify((()=>{
  const el = document.querySelector('.mf-fr-o'); if(!el) return 'missing'
  const cs = getComputedStyle(el)
  return { mfk: cs.getPropertyValue('--mf-k'), f: cs.getPropertyValue('--f'), bgImage: cs.backgroundImage.slice(0,160), bgColor: cs.backgroundColor }
})())`))
await shot('A-as-shipped-ring', '.mf-fr')
await shot('A-as-shipped-rail', '.mf-force')

// 4. simulate a browser with no @property: same declaration, an identically-shaped but unregistered property
console.log('4. injecting the no-@property simulation')
console.log(await js(`JSON.stringify((()=>{
  const s = document.createElement('style'); s.id='simNoProp'
  s.textContent = '.mf-fr-o { background: conic-gradient(var(--m-red) calc(var(--f) * var(--mf-k-unreg) * 360deg), var(--m-line-2) 0) !important; }'
  document.head.append(s)
  const el = document.querySelector('.mf-fr-o'); const cs = getComputedStyle(el)
  const img = el.querySelector('.m-ava'); const ir = img && img.getBoundingClientRect()
  return { bgImage: cs.backgroundImage, bgColor: cs.backgroundColor, avatarStillVisible: ir ? {w:ir.width,h:ir.height} : null }
})())`))
await shot('B-no-atproperty-ring', '.mf-fr')
await shot('B-no-atproperty-rail', '.mf-force')
await js(`document.getElementById('simNoProp').remove(); 1`)

// 5. does anything else in the repo depend on an unset registered property? --rp check
console.log('5. skipped')

// 6. the score is also printed as text under the ring -> is the ring the only carrier of the number?
console.log('6. text under the ring:', await js(`JSON.stringify([...document.querySelectorAll('.mf-fr')].slice(0,3).map(b=>({label:b.getAttribute('aria-label'), text:b.textContent.trim().replace(/\\s+/g,' ')})))`))

console.log('7. console errors during the run:', JSON.stringify(errs.slice(0, 8)))
ws.close(); chrome.kill()
