import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'rl' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
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
const raw = (e) => send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })
const js = async (e) => {
  const r = await raw(e)
  if (r.result?.exceptionDetails) throw new Error('EVAL FAIL: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text) + '  <<' + e.slice(0, 120) + '>>')
  return r.result?.result?.value
}
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Emulation.setEmulatedMedia', { media: 'screen', features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)

console.log('reducedMotion matches =', await js(`matchMedia('(prefers-reduced-motion: reduce)').matches`))
console.log('document.hidden =', await js('document.hidden'))

const INSTRUMENT = [
  'window.__spy = { on: false, n: 0, tags: {} };',
  'window.__origRAF = window.requestAnimationFrame.bind(window);',
  'window.requestAnimationFrame = function (cb) {',
  '  var s = window.__spy;',
  '  if (s.on) {',
  '    var tag = "?";',
  '    try { throw new Error("t") } catch (err) { var L = String(err.stack||"").split(String.fromCharCode(10)); tag = String(L[2]||L[1]||"").trim().replace(/^at /, "").slice(0,100) }',
  '    s.n++; s.tags[tag] = (s.tags[tag]||0)+1;',
  '  }',
  '  return window.__origRAF(cb);',
  '};',
  'typeof window.__spy',
].join('\n')
console.log('instrument ->', await js(INSTRUMENT))

async function measure(label, secs = 3) {
  await js(`window.__spy.n = 0; window.__spy.tags = {}; window.__mut = 0;
    if (window.__mo) window.__mo.disconnect();
    var M = document.getElementById('machine');
    window.__mo = new MutationObserver(function (recs) { window.__mut += recs.length });
    if (M) window.__mo.observe(M, { attributes: true, childList: true, subtree: true, characterData: true });
    window.__spy.on = true; 1`)
  const read = (sel, prop) => `(function(){var e=document.querySelector(${JSON.stringify(sel)}); return e ? (e.style.getPropertyValue(${JSON.stringify(prop)})||getComputedStyle(e).getPropertyValue(${JSON.stringify(prop)})) : 'NOELEM'})()`
  const spin0 = await js(read('.mscreen-countdown .cdn', '--spin'))
  const p0 = await js(read('.mld', '--p'))
  await sleep(secs * 1000)
  const res = await js(`JSON.stringify({ n: window.__spy.n, mut: window.__mut, tags: Object.entries(window.__spy.tags).sort(function(a,b){return b[1]-a[1]}).slice(0,6) })`)
  await js('window.__spy.on = false; if (window.__mo) window.__mo.disconnect(); 1')
  const spin1 = await js(read('.mscreen-countdown .cdn', '--spin'))
  const p1 = await js(read('.mld', '--p'))
  const vis = await js(`JSON.stringify({
    stageHidden: document.getElementById('stage') ? document.getElementById('stage').hidden : null,
    mode: document.body.dataset.mode,
    mscreen: (document.getElementById('machine')||{dataset:{}}).dataset.mscreen,
    mldRects: (document.querySelector('.mld')||{getClientRects:function(){return []}}).getClientRects().length,
    cdnRects: (document.querySelector('.mscreen-countdown .cdn')||{getClientRects:function(){return []}}).getClientRects().length
  })`)
  console.log('\n=== ' + label + ' ===')
  console.log('  vis  ', vis)
  console.log('  ' + secs + 's:', res)
  console.log('  --spin', JSON.stringify(spin0), '->', JSON.stringify(spin1), '   --p', JSON.stringify(p0), '->', JSON.stringify(p1))
}

await js(`window.showcase.mode('mobile'); 1`); await sleep(1500)
await measure('CONTROL A: mobile tab, machine never opened')

await js(`window.showcase.mode('machine'); 1`); await sleep(600)
await js(`window.showcase.mscreen('loading', { from: 'bar' }); 1`); await sleep(2500)
await measure('B: machine tab, loading VISIBLE (baseline)')
await js(`window.showcase.mode('mobile'); 1`); await sleep(2000)
await measure('C: switched to mobile, loading was last mscreen')

await js(`window.showcase.mode('machine'); 1`); await sleep(500)
await js(`window.showcase.mscreen('default', { from: 'bar' }); 1`); await sleep(1500)
await js(`window.showcase.mode('mobile'); 1`); await sleep(2000)
await measure('CONTROL D: default mscreen then mobile')

await js(`window.showcase.mode('machine'); 1`); await sleep(500)
await js(`window.showcase.mscreen('countdown', { from: 'bar' }); 1`); await sleep(2500)
await js(`window.showcase.mode('mobile'); 1`); await sleep(2000)
await measure('E: switched to mobile, countdown was last mscreen')

console.log('\n--- soak 25s ---')
await sleep(25000)
await measure('F: +25s later, still on mobile (countdown)')

await js(`window.showcase.mode('system'); 1`); await sleep(2000)
await measure('G: design system tab, countdown still last mscreen')

// does the case overlay / brief stop it? and does picking another screen stop it?
await js(`window.showcase.mode('machine'); 1`); await sleep(400)
await js(`window.showcase.mscreen('default', { from: 'bar' }); 1`); await sleep(600)
await js(`window.showcase.mode('mobile'); 1`); await sleep(1200)
await measure('H: recovery - picked default on machine tab, back to mobile')

console.log('\nerrors:', JSON.stringify(errs.slice(0, 6)))
ws.close(); chrome.kill()
