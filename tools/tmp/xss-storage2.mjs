/* Second localStorage pass: does a poisoned "punch-showcase.v5" break the Result screen or smuggle CSS? */
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`,
  `--user-data-dir=${join(tmpdir(), 'xs' + port)}`, '--window-size=1440,1000', 'about:blank',
], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description).slice(0, 180))
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map((a) => a.value || a.description).join(' ').slice(0, 180))
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; const to = setTimeout(() => { pend.delete(n); r({ __timeout: m }) }, 15000); pend.set(n, (v) => { clearTimeout(to); r(v) }); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
const nav = async (u, ms) => { await send('Page.navigate', { url: u }); await sleep(ms) }

const out = {}
await nav('http://localhost:5770/', 5000)
await js('localStorage.clear(); 1')

// baseline: how many Result-screen sections are visible with clean storage
await nav('http://localhost:5770/', 6000)
await js(`window.showcase.mode('machine'); 1`); await sleep(1500)
await js(`window.showcase.mscreen('result'); 1`); await sleep(1500)
const count = `(() => { const s = document.getElementById('screenContent'); if (!s) return 'no screen'
  const slots = [...s.querySelectorAll('[data-slot]')]
  return JSON.stringify(slots.map(el => ({ k: el.dataset.slot, vars: el.querySelectorAll(':scope > .vars > .var').length, shownVars: [...el.querySelectorAll(':scope > .vars > .var')].filter(v => !v.hidden).length, h: Math.round(el.getBoundingClientRect().height) }))) })()`
out.baseline = JSON.parse(await js(count) || 'null')

// poison: a layout index that is not a number
await js(`(() => { const s = JSON.parse(localStorage.getItem('punch-showcase.v5')); s.layout.hero = 'x'; s.layout.ranks = {}; s.layout.cta = 99; s.sets.arena.radius = '9px;} html{background:url(https://evil.example/p)}'; s.sets.arena.space = 'NaN'; localStorage.setItem('punch-showcase.v5', JSON.stringify(s)); return s.layout })(); 1`)
await nav('http://localhost:5770/', 6000)
await js(`window.showcase.mode('machine'); 1`); await sleep(1500)
await js(`window.showcase.mscreen('result'); 1`); await sleep(1800)
out.poisoned = JSON.parse(await js(count) || 'null')
out.cssVars = await js(`JSON.stringify({ r: getComputedStyle(document.documentElement).getPropertyValue('--r'), space: getComputedStyle(document.documentElement).getPropertyValue('--space'), zoom: getComputedStyle(document.documentElement).getPropertyValue('--zoom') })`)
out.glassHeight = await js(`Math.round((document.getElementById('screenContent')||{getBoundingClientRect:()=>({height:0})}).getBoundingClientRect().height)`)
out.errors = errs.slice(0, 8)
// is the Customise reset able to recover?
out.reset = await js(`(() => { const b = document.getElementById('resetCustom'); if (!b) return 'no resetCustom'; b.click(); return b.textContent.trim() })()`)
await sleep(2500)
out.afterReset = JSON.parse(await js(count) || 'null')
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill(); process.exit(0)
