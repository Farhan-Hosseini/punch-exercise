import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = 1440
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'nd' + port)}`, `--window-size=${W},1000`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const reqs = []; const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Network.requestWillBeSent') reqs.push(m.params.request.url)
  else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true })
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
reqs.length = 0
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
for (const mode of ['mobile', 'machine', 'animation', 'ds']) { await js(`window.showcase.mode('${mode}'); 1`); await sleep(2500) }
// every phone page and every machine screen
await js(`window.showcase.mode('mobile'); 1`); await sleep(1200)
const pages = await js(`JSON.stringify(Object.keys(window.showcase.pages||{}))`)
await js(`window.showcase.mode('machine'); 1`); await sleep(1200)
for (const s of ['attract','scan','countdown','stats','score','record','default']) { await js(`try{window.showcase.mscreen('${s}',{punch:false})}catch(e){}; 1`); await sleep(700) }
// case overlay
await js(`document.querySelector('#openCase')?.click(); 1`); await sleep(2500)
await js(`const sc=document.querySelector('#caseScroll'); if(sc){sc.scrollTop=sc.scrollHeight}; 1`); await sleep(2000)
const u = new Set(reqs.map(r => r.replace('http://localhost:5770','')))
const hit = [...u].filter(x => /^\/parts\//.test(x) || /^\/(sections|mpages|mscreens)\/[^?]*\.css/.test(x))
console.log('total unique requests:', u.size)
console.log('pages known:', pages)
console.log('--- requests into build-input paths (parts/*.html, per-design css) ---')
console.log(hit.length ? hit.join('\n') : '(none)')
console.log('--- concatenated css requested ---')
console.log([...u].filter(x => /^\/(sections|mscreens|mpages)\.css/.test(x)).join('\n'))
console.log('--- per-design JS requested (count) ---')
console.log([...u].filter(x => /^\/(mpages|mscreens)\/.*\.js/.test(x)).length)
console.log('--- errors ---'); console.log(errs.slice(0,5).join('\n') || '(none)')
ws.close(); chrome.kill()
