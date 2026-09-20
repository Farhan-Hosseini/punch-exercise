// the live height of the children that overflow their Figma frames, in glass pixels
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9360 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'cg' + port)}`, '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js("window.showcase.mode('machine'); 1"); await sleep(1600)
await js("document.getElementById('openCustom').click(); 1"); await sleep(800)
await js("document.getElementById('actualMachine').click(); 1"); await sleep(1500)
await js("document.getElementById('closeCustom').click(); 1"); await sleep(500)
const JOBS = [
  ['default', 'how', 'One line', '.mdf-how-one, .mdf-oneline, [data-sv="One line"]'],
  ['scan', 'status', 'Player card', '[data-sv="Player card"]'],
  ['scan', 'status', 'Crowd', '.sst-line'],
  ['loading', 'reading', 'Replay saving', '.mld-frame'],
  ['loading', 'reading', 'Photo finish', '.mpf-shot'],
  ['countdown', 'call', 'Photo', '[data-sv="Photo"]'],
]
for (const [screen, sec, design, sel] of JOBS) {
  await js(`window.showcase.mscreen('${screen}'); 1`); await sleep(1200)
  const names = JSON.parse(await js(`JSON.stringify((window.showcase.sections('machine','${screen}').find(s => s.key === '${sec}') || {}).names || [])`))
  const i = names.indexOf(design)
  if (i < 0) { console.log(`${screen}/${sec} ${design}: NOT FOUND in ${names.join(',')}`); continue }
  await js(`window.showcase.sec('machine','${screen}','${sec}',${i}); 1`); await sleep(1100)
  const r = await js(`JSON.stringify((() => {
    const scr = document.querySelector('.mscreen[data-mscreen="${screen}"]')
    const s = scr.querySelector('[data-sec="${sec}"]')
    const k = scr.getBoundingClientRect().height / 3840
    const sr = s.getBoundingClientRect()
    const el = s.querySelector('${sel.replace(/'/g, "\'")}')
    const kids = [...s.querySelectorAll('[data-sv]')].filter(x => !x.hidden).map(x => ({ sv: x.dataset.sv, h: +(x.getBoundingClientRect().height / k).toFixed(1) }))
    return { section: +(sr.height / k).toFixed(1), child: el ? { cls: String(el.className).slice(0, 40), h: +(el.getBoundingClientRect().height / k).toFixed(1), top: +((el.getBoundingClientRect().top - sr.top) / k).toFixed(1) } : null, shownDesigns: kids }
  })())`)
  console.log(`${screen}/${sec} ${design}: ${r}`)
}
ws.close(); chrome.kill()
