// the machine at its real size, so one CSS pixel is one glass pixel: exact section heights for the Figma diff
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9210 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'ph' + port)}`, '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' })
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
await js("window.showcase.mode('machine'); 1"); await sleep(2000)
await js("document.getElementById('openCustom').click(); 1"); await sleep(900)
await js("document.getElementById('actualMachine').click(); 1"); await sleep(1600)
await js("document.getElementById('closeCustom').click(); 1"); await sleep(600)

const TARGETS = [
  ['default', 'how', 5], ['scan', 'status', 5], ['countdown', 'count', 5],
  ['loading', 'caption', 5], ['loading', 'reading', 5], ['score', 'photo', 5], ['record', 'photo', 5],
  ['countdown', 'stage', 5],
]
const out = []
for (const [p, key] of TARGETS) {
  await js(`window.showcase.mscreen('${p}'); 1`); await sleep(1300)
  const names = JSON.parse(await js(`JSON.stringify((window.showcase.sections('machine','${p}').find(s => s.key === '${key}') || {}).names || [])`))
  for (let i = 0; i < names.length; i++) {
    await js(`window.showcase.sec('machine','${p}','${key}',${i}); 1`); await sleep(400)
    const r = await js(`JSON.stringify((() => {
      const scr = document.querySelector('.mscreen[data-mscreen="${p}"]')
      const el = scr && scr.querySelector('[data-sec="${key}"]')
      if (!el || !scr) return null
      const sr = scr.getBoundingClientRect(), er = el.getBoundingClientRect()
      return { screenH: Math.round(sr.height), h: +(er.height / sr.height * 3840).toFixed(1), w: +(er.width / sr.width * 1080).toFixed(1) }
    })())`)
    out.push({ page: p, sec: key, i, name: names[i], ...(r ? JSON.parse(r) : {}) })
  }
}
for (const o of out) console.log(`${o.page}/${o.sec} ${o.name}: ${o.h} x ${o.w}  (screen ${o.screenH}px)`)
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'ph' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
