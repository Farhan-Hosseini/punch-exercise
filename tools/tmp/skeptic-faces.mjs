import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1440,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text) })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)

// real key, not a synthetic JS event
const KEYS = { ArrowRight: 39, ArrowLeft: 37, ArrowDown: 40, ArrowUp: 38, Tab: 9 }
async function key(k, mods = 0) {
  const p = { key: k, code: k, windowsVirtualKeyCode: KEYS[k], nativeVirtualKeyCode: KEYS[k], modifiers: mods }
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...p })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', ...p })
  await sleep(160)
}
const who = () => js(`(() => { const a = document.activeElement; return a ? (a.dataset.typeface||a.dataset.logo||a.dataset.device||a.className||a.tagName) : 'none' })()`)
const snap = (sel) => js(`JSON.stringify([...document.querySelectorAll('${sel}')].map(b => ({ k: b.dataset.typeface||b.dataset.logo||b.dataset.device, ti: b.tabIndex, ck: b.getAttribute('aria-checked'), vis: !!b.offsetParent })))`)

// open Customise
await js(`document.getElementById('openCustom')?.click(); 1`); await sleep(1200)
const out = { customOpen: await js(`document.getElementById('custom').classList.contains('is-open')`) }
out.groupRoles = JSON.parse(await js(`JSON.stringify(['.faces','.logos','.seg-appearance'].map(s=>{const e=document.querySelector(s);return{s,role:e&&e.getAttribute('role'),vis:!!(e&&e.offsetParent)}}))`))

for (const [name, sel] of [['faces', '.face-tile'], ['logos', '.logo-tile'], ['devices', '.dev-tile']]) {
  const before = JSON.parse(await snap(sel))
  await js(`document.querySelector('${sel}').focus(); 1`); await sleep(200)
  const f0 = await who()
  await key('ArrowRight')
  const f1 = await who()
  await key('ArrowDown')
  const f2 = await who()
  out[name] = { tabIndexes: before.map(b => b.ti), visible: before.map(b => b.vis), focusStart: f0, afterArrowRight: f1, afterArrowDown: f2, checkedBefore: before.map(b => b.ck), checkedAfter: JSON.parse(await snap(sel)).map(b => b.ck) }
}
// tab-stop cost inside the panel
out.panelTabStops = JSON.parse(await js(`JSON.stringify((()=>{const p=document.getElementById('custom');const all=[...p.querySelectorAll('button,a[href],input,select,textarea,[tabindex]')].filter(e=>!e.disabled&&e.tabIndex>=0&&e.offsetParent);return{total:all.length,faces:all.filter(e=>e.classList.contains('face-tile')).length,logos:all.filter(e=>e.classList.contains('logo-tile')).length,devices:all.filter(e=>e.classList.contains('dev-tile')).length}})())`))
out.errors = errs.slice(0, 6)
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill()
