// Small, exact confirmations for the write-up.
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9012 + Math.floor(Math.random() * 6)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'zzf' + port)}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 150 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, pr = {}) => new Promise((r) => { const n = ++id; const to = setTimeout(() => { if (pend.has(n)) { pend.delete(n); r({}) } }, 15000); pend.set(n, (v) => { clearTimeout(to); r(v) }); ws.send(JSON.stringify({ id: n, method: m, params: pr })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
const jj = async (e) => { try { return JSON.parse(await js(`JSON.stringify((()=>{${e}})())`)) } catch { return null } }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6500)
console.log('punchApp.device typeof:', await js(`typeof window.punchApp.device`))
console.log('punchApp.device value:', await js(`String(window.punchApp.device).slice(0,40)`))
console.log('punchApp.state.device:', await js(`window.punchApp.state.device`))
console.log("mode('ds') ->", await jj(`window.showcase.mode('ds'); return document.body.dataset.mode`))
console.log("mode('system') ->", await jj(`window.showcase.mode('system'); return document.body.dataset.mode`))
console.log("mode('') ->", await jj(`window.showcase.mode(''); return document.body.dataset.mode`))
console.log('mvar over every screen:', await jj(`
  const out = {}
  for (const k of ['default','attract','scan','countdown','loading','result','score','record','stats']) out[k] = window.showcase.mvar(k, 1)
  return out`))
console.log('msv elements in the document:', await js(`document.querySelectorAll('.msv').length`))
console.log("mscreen('stats') ->", await jj(`window.showcase.mode('machine'); window.showcase.mscreen('stats'); return { machineAttr: document.getElementById('machine').dataset.mscreen, statsHidden: document.querySelector('.mscreen[data-mscreen=\\"stats\\"]').hidden }`))
console.log('stats designs PSec still tracks:', await jj(`return window.PSec.sections('machine','stats').map(s=>s.key+':'+s.names.length)`))
console.log('scripts without defer/async:', await jj(`
  const s = [...document.scripts].filter(x=>x.src && !x.defer && !x.async).map(x=>x.getAttribute('src'))
  return { n: s.length, sample: s.slice(0,6) }`))
console.log('head stylesheets:', await jj(`return [...document.querySelectorAll('head link[rel=stylesheet]')].map(l=>l.getAttribute('href'))`))
try { ws.close() } catch {}
chrome.kill(); process.exit(0)
