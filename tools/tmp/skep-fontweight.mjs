import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1440,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const reqs = []; const failed = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Network.responseReceived') reqs.push({ url: m.params.response.url, status: m.params.response.status })
  else if (m.method === 'Network.loadingFailed') failed.push(m.params)
})
const send = (m, p = {}) => new Promise(r => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)
await js(`window.showcase.mode('machine'); 1`); await sleep(2500)
// walk every machine screen so the record screen is realised
const screens = await js(`JSON.stringify([...document.querySelectorAll('[class*="mscreen-"]')].map(e=>e.className).slice(0,40))`)
await js(`window.showcase.mscreen('record'); 1`); await sleep(2500); await js(`window.showcase.mscreen('scan'); 1`); await sleep(2500)
const fonts = await js(`JSON.stringify({
  poppins900: document.fonts.check('900 96px "Poppins"'),
  poppins600: document.fonts.check('600 40px "Poppins"'),
  saira: document.fonts.check('700 40px "Saira ExtraCondensed"'),
  loaded: [...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+':'+f.weight),
  recordTitleFont: (()=>{const e=document.querySelector('.mscreen-record .rm-title'); return e? getComputedStyle(e).fontFamily+' | '+getComputedStyle(e).fontWeight : 'no .rm-title'})()
})`)
console.log('FONTS', fonts)
console.log('POPPINS REQUESTS', JSON.stringify(reqs.filter(r=>/poppins/i.test(r.url))))
console.log('NODE_MODULES REQUESTS', JSON.stringify(reqs.filter(r=>/node_modules/.test(r.url))))
console.log('SAIRA REQUESTS', JSON.stringify(reqs.filter(r=>/saira/i.test(r.url))))
console.log('FONT 4xx/5xx', JSON.stringify(reqs.filter(r=>/\.woff2/.test(r.url) && r.status>=400)))
console.log('ALL WOFF2', JSON.stringify(reqs.filter(r=>/\.woff2/.test(r.url)).map(r=>r.url.split('/').pop()+'='+r.status)))
ws.close(); chrome.kill()
