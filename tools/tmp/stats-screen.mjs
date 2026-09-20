import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9090 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'st' + port)}`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' })
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
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
console.log(JSON.stringify(JSON.parse(await js(`JSON.stringify((() => {
  const el = document.querySelector('.mscreen[data-mscreen="stats"]')
  const secs = [...document.querySelectorAll('.mscreen[data-mscreen] [data-sec]:not([data-sec-scope="global"])')]
  const statsSecs = el ? [...el.querySelectorAll('[data-sec]:not([data-sec-scope="global"])')] : []
  const count = (x) => (x.hasAttribute('data-sv-names') ? x.dataset.svNames.split('|').filter(n => n.trim()).length : [...x.children].filter(c => c.hasAttribute('data-sv')).length)
  const total = document.querySelectorAll('#screen .var[data-name]').length + secs.reduce((n, x) => n + count(x), 0)
  const fromStats = statsSecs.reduce((n, x) => n + count(x), 0)
  // what the Customise panel offers
  const offered = [...document.querySelectorAll('[data-mscreen-btn], .mscreens button, #custom [data-mscreen]')].map(b => b.dataset.mscreen || b.textContent.trim())
  return {
    statsScreenInDom: !!el,
    statsHidden: el ? el.hidden : null,
    statsSectionCount: statsSecs.length,
    designsFromStats: fromStats,
    liveDesignsTotal: total,
    liveDesignsWithoutStats: total - fromStats,
    caseStudyMarkupNumber: 67,
    mscreenApiAcceptsStats: (() => { try { window.showcase.mscreen('stats'); const e2 = document.querySelector('.mscreen[data-mscreen="stats"]'); const ok = e2 && !e2.hidden; window.showcase.mscreen('default'); return !!ok } catch (e) { return 'threw: ' + e.message } })(),
    offeredButtons: offered.slice(0, 20),
  }
})())`)), null, 1))
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'st' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
