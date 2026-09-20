import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9930 + Math.floor(Math.random() * 25)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'gt'+port)}`,'--window-size=420,900','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 150 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return '__ERR__' + JSON.stringify(r.result.exceptionDetails).slice(0, 300); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(7000)
console.log('GATE @390', await js(`JSON.stringify((() => {
  const atHidden = (el) => { let e = el; while (e && e.nodeType === 1) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || e.hasAttribute('hidden') || e.getAttribute('aria-hidden') === 'true' || e.hasAttribute('inert')) return true; e = e.parentElement } return false }
  const gate = document.querySelector('.deskgate')
  const gs = getComputedStyle(gate)
  const focusable = [...document.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]')].filter(e => e.tabIndex >= 0 && !atHidden(e))
  const outside = focusable.filter(e => !gate.contains(e))
  const h1s = [...document.querySelectorAll('h1')].filter(e => !atHidden(e)).map(h => h.textContent.trim().slice(0, 34))
  const mains = [...document.querySelectorAll('main')].filter(e => !atHidden(e)).map(m => m.id)
  return { gateDisplay: gs.display, gateVisible: !!gate.getClientRects().length, gateRole: gate.getAttribute('role'), gateModal: gate.getAttribute('aria-modal'), gateTabindex: gate.getAttribute('tabindex'),
    bodyOverflow: getComputedStyle(document.body).overflow, docScrollH: document.documentElement.scrollHeight, viewH: innerHeight,
    focusableTotal: focusable.length, focusableOutsideGate: outside.length, sample: outside.slice(0, 8).map(e => (e.tagName + '.' + String(e.className).split(' ')[0] + ' "' + e.textContent.trim().slice(0, 18) + '"')),
    exposedH1s: h1s, exposedMains: mains, activeEl: document.activeElement ? document.activeElement.tagName + '.' + String(document.activeElement.className).split(' ')[0] : null }
})())`))
// what actually receives focus on the first Tab
await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 9, key: 'Tab', code: 'Tab' })
await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 9, key: 'Tab', code: 'Tab' })
await sleep(400)
console.log('AFTER TAB', await js(`JSON.stringify({ el: document.activeElement ? document.activeElement.tagName + '.' + String(document.activeElement.className).split(' ')[0] + ' "' + document.activeElement.textContent.trim().slice(0,26) + '"' : null, inGate: document.querySelector('.deskgate').contains(document.activeElement), rect: (r=>({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}))(document.activeElement.getBoundingClientRect()) })`))
ws.close(); chrome.kill()
