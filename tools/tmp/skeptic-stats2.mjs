import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1600,1000','about:blank'], { stdio: 'ignore' })
const sleep = ms => new Promise(r => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', e => { const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map(a => a.value || a.description).join(' ')) })
const send = (m, p = {}) => new Promise(r => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async e => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
const out = {}
// 1. Customise panel in machine mode: does any control belong to the stats screen?
await js(`window.showcase.mode('machine'); 1`); await sleep(1500)
await js(`(document.querySelector('[data-open-custom],#customBtn,[aria-controls="custom"]')||{click(){}}).click(); 1`); await sleep(1200)
out.customOpen = await js(`document.getElementById('custom').className`)
out.customStatsControls = await js(`JSON.stringify([...document.querySelectorAll('#custom [data-psec],#custom [data-sv],#custom [data-mvar]')].map(e=>e.dataset.psec||e.dataset.sv||e.dataset.mvar).filter(v=>/stats/.test(v)))`)
out.customTextMentionsYourRun = await js(`/Your run/.test(document.getElementById('custom').textContent)`)
// 2. can a saved localStorage state of stats resurrect it?
await js(`localStorage.setItem('punch-showcase.v5', JSON.stringify({variant:'arena',mode:'machine',mscreen:'stats'})); 1`)
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
out.afterSavedStats = await js(`JSON.stringify({mode:document.documentElement.dataset.mode||window.showcase.state&&1, ds:document.getElementById('machine').dataset.mscreen, statsHidden:document.querySelector('.mscreen[data-mscreen="stats"]').hidden})`)
// 3. is the stats article taking layout space / being painted at all?
out.statsBox = await js(`(()=>{const el=document.querySelector('.mscreen[data-mscreen="stats"]');const b=el.getBoundingClientRect();return JSON.stringify({hidden:el.hidden,w:Math.round(b.width),h:Math.round(b.height),display:getComputedStyle(el).display})})()`)
// 4. did stats.js render anything into the DOM (nodes) even though the screen never opened?
out.statsInnerNodes = await js(`document.querySelector('.mscreen[data-mscreen="stats"]').querySelectorAll('*').length`)
out.yourRunModel = await js(`JSON.stringify(window.yourRun ? {runs:window.yourRun.runs, model:window.yourRun.model===null?'null (never started)':'built'} : null)`)
// 5. deep link attempt via anim.js handler
out.deepLinkBtns = await js(`JSON.stringify([...document.querySelectorAll('[data-go-mscreen]')].map(b=>({k:b.dataset.goMscreen, vis:!!(b.offsetWidth||b.offsetHeight||b.getClientRects().length)})))`)
out.errors = errs.slice(0,8)
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill()
