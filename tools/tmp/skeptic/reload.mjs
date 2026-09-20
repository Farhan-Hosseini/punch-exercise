
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9800 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'rr' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text) })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })); setTimeout(() => { if (pend.has(n)) { pend.delete(n); r({ result: {} }) } }, 15000) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Emulation.setEmulatedMedia', { media: 'screen', features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

const snap = async (label) => {
  const s1 = await js(`JSON.stringify({ spin: (document.querySelector('.mscreen-countdown .cdn')||{style:{getPropertyValue:()=>'-'}}).style.getPropertyValue('--spin'), p: (document.querySelector('.mld')||{style:{getPropertyValue:()=>'-'}}).style.getPropertyValue('--p') })`)
  await sleep(2500)
  const s2 = await js(`JSON.stringify({ spin: (document.querySelector('.mscreen-countdown .cdn')||{style:{getPropertyValue:()=>'-'}}).style.getPropertyValue('--spin'), p: (document.querySelector('.mld')||{style:{getPropertyValue:()=>'-'}}).style.getPropertyValue('--p') })`)
  const st = await js(`JSON.stringify({ mode: document.body.dataset.mode, mscreen: document.getElementById('machine').dataset.mscreen, stageHidden: document.getElementById('stage').hidden })`)
  console.log(label)
  console.log('   ' + st)
  console.log('   t0 ' + s1 + '   t+2.5s ' + s2)
}

// --- ACCUMULATION: loading first, then countdown, then mobile
await js(`window.showcase.mode('machine'); 1`); await sleep(600)
await js(`window.showcase.mscreen('loading', { from: 'bar' }); 1`); await sleep(2000)
await js(`window.showcase.mode('mobile'); 1`); await sleep(1500)
await js(`window.showcase.mode('machine'); 1`); await sleep(600)
await js(`window.showcase.mscreen('countdown', { from: 'bar' }); 1`); await sleep(2000)
await js(`window.showcase.mode('mobile'); 1`); await sleep(1500)
await snap('ACCUMULATION test (visited loading, then countdown, now on mobile): does --p ALSO still move?')

// --- RELOAD: state saved as mode=mobile + mscreen=countdown. Reload and touch nothing.
console.log('\nsaved localStorage ->', await js(`(function(){var k=Object.keys(localStorage).find(function(x){return /punch/i.test(x)}); var v=localStorage.getItem(k)||''; var o=JSON.parse(v); return k+' : mode='+o.mode+' mscreen='+o.mscreen})()`))
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6500)
await snap('AFTER RELOAD, nothing clicked (Mobile tab is what the page opens on):')
await sleep(8000)
await snap('AFTER RELOAD +8s more, still nothing clicked:')
console.log('\nerrors:', JSON.stringify(errs.slice(0,5)))
ws.close(); chrome.kill()
