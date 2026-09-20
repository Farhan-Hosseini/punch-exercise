// Drive the whole showcase in headless Chrome and record EVERY network request.
// Then report which of the "unreferenced" assets were actually fetched.
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--force-prefers-reduced-motion=no-preference', '--force-color-profile=srgb',
  `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'ns' + port)}`,
  '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const urls = new Set(); const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Network.requestWillBeSent') urls.add(m.params.request.url)
  else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).slice(0, 160))
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

const MSCREENS = ['attract', 'countdown', 'default', 'loading', 'record', 'scan', 'score', 'stats']
const MPAGES = ['connect', 'connected', 'default', 'failed', 'feed', 'hit', 'profile', 'punch', 'ranks', 'reel', 'saved', 'scan']

for (const look of ['dark', 'light']) {
  await js(`window.showcase.appearance('${look}'); 1`); await sleep(400)
  for (const mode of ['mobile', 'machine', 'animation', 'ds']) {
    await js(`window.showcase.mode('${mode}'); 1`); await sleep(1400)
    await js('scrollTo(0, document.body.scrollHeight); 1'); await sleep(600)
    await js('scrollTo(0, 0); 1'); await sleep(300)
  }
  // every machine screen and every one of its flow designs
  await js(`window.showcase.mode('machine'); 1`); await sleep(1200)
  for (const k of MSCREENS) {
    await js(`window.showcase.mscreen('${k}'); 1`); await sleep(500)
    for (let i = 0; i < 8; i++) { await js(`try{window.showcase.mvar('${k}', ${i})}catch(e){}; 1`); await sleep(220) }
    // every section design on this machine page
    const secs = await js(`JSON.stringify(window.showcase.sections('machine','${k}'))`)
    for (const s of JSON.parse(secs || '[]')) {
      for (let i = 0; i < s.names.length; i++) { await js(`window.showcase.sec('machine','${k}','${s.key}',${i}); 1`); await sleep(200) }
    }
  }
  // every phone page and every section design on it
  await js(`window.showcase.mode('mobile'); 1`); await sleep(1200)
  for (const p of MPAGES) {
    const secs = await js(`JSON.stringify(window.showcase.sections('mobile','${p}'))`)
    for (const s of JSON.parse(secs || '[]')) {
      for (let i = 0; i < s.names.length; i++) { await js(`window.showcase.sec('mobile','${p}','${s.key}',${i}); 1`); await sleep(180) }
    }
  }
  // every backdrop, every logo
  for (const b of ['none', 'grid', 'gym', 'ring', 'street', 'arena', 'studio', 'neon', 'crowd', 'mat']) { await js(`try{window.showcase.backdrop('${b}')}catch(e){}; 1`); await sleep(220) }
  for (const l of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'mark', 'word', 'stack']) { await js(`try{window.showcase.logo('${l}')}catch(e){}; 1`); await sleep(120) }
  // overlays
  for (const sel of ['#openCase', '#openBrief', '#openHelp', '[data-open-case]', '[data-open-brief]']) {
    await js(`(() => { const el = document.querySelector('${sel}'); if (el) el.click(); return !!el })()`); await sleep(1600)
    await js('scrollTo(0, document.body.scrollHeight); 1'); await sleep(900)
    await js(`(() => { const o = document.querySelector('#case.open, #brief.open, #help.open'); document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})); return !!o })()`); await sleep(500)
  }
  await js(`try{window.showcase.brief(true)}catch(e){}; 1`); await sleep(1200)
  await js(`try{window.showcase.brief(false)}catch(e){}; 1`); await sleep(400)
}
// the case study overlay, scrolled fully
await js(`location.hash = ''; (document.querySelector('#openCase')||{click(){}}).click(); 1`); await sleep(2500)
for (let i = 0; i < 25; i++) { await js(`(() => { const c = document.querySelector('#case'); const s = c && c.querySelector('.case-scroll') || c; if (s) s.scrollTop += 900; scrollBy(0,900); return 1 })()`); await sleep(260) }
await sleep(1500)
// the machine embed
await send('Page.navigate', { url: 'http://localhost:5770/?embed=machine' }); await sleep(6000)
await js('scrollTo(0, document.body.scrollHeight); 1'); await sleep(1200)

console.log(JSON.stringify({ requests: urls.size, errors: errs.slice(0, 6) }))
console.log('---URLS---')
console.log([...urls].join('\n'))
ws.close(); chrome.kill()
