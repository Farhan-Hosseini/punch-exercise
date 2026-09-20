import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'ar'+port)}`,'--window-size=1600,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 150 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).slice(0, 200))
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map((a) => a.value || a.description).join(' ').slice(0, 200))
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return { __err: JSON.stringify(r.result.exceptionDetails).slice(0, 400) }; return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); sessionStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

const PROBE = function () {
  const cls = (el) => (el && typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')
  const sig = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + cls(el)
  const path = (el) => { const a = []; let e = el; let n = 0; while (e && e !== document.body && n++ < 12) { a.unshift(sig(e)); e = e.parentElement } return a.join(' > ') }
  const byId = {}
  for (const el of document.querySelectorAll('[id]')) (byId[el.id] ||= []).push(path(el))
  const dupes = Object.entries(byId).filter(([, v]) => v.length > 1).map(([k, v]) => ({ id: k, count: v.length, where: v }))
  const ids = new Set(Object.keys(byId))
  const dangling = []
  for (const attr of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-activedescendant', 'for']) {
    for (const el of document.querySelectorAll('[' + attr + ']')) {
      const v = (el.getAttribute(attr) || '').trim(); if (!v) continue
      for (const tk of (attr === 'for' && el.tagName === 'LABEL' ? [v] : v.split(/\s+/))) if (tk && !ids.has(tk)) dangling.push({ attr, value: tk, on: sig(el), path: path(el) })
    }
  }
  const vis = (el) => { if (!el.isConnected) return false; const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && (r.width > 0 || r.height > 0) }
  const atHidden = (el) => { let e = el; while (e) { if (e.hasAttribute && (e.getAttribute('aria-hidden') === 'true' || e.hasAttribute('inert') || e.hasAttribute('hidden'))) return true; e = e.parentElement } return false }
  const mains = [...document.querySelectorAll('main')].map((m) => ({ sig: sig(m), visible: vis(m), atHidden: atHidden(m), display: getComputedStyle(m).display, hidden: m.hasAttribute('hidden'), inert: m.hasAttribute('inert'), ariaHidden: m.getAttribute('aria-hidden') }))
  const h1s = [...document.querySelectorAll('h1')].map((h) => ({ text: h.textContent.trim().slice(0, 40), visible: vis(h) || (getComputedStyle(h).position === 'absolute' && !atHidden(h)), atHidden: atHidden(h), path: path(h) }))
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((h) => !atHidden(h)).map((h) => ({ tag: h.tagName, text: h.textContent.trim().replace(/\s+/g, ' ').slice(0, 44) }))
  // focusable things inside display:none-but-not-inert surfaces
  const focusables = [...document.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]')].filter((e) => e.tabIndex >= 0)
  const ghostFocus = focusables.filter((e) => !vis(e) && !atHidden(e) && !e.closest('.sr-only') && getComputedStyle(e).display !== 'none' ? false : (!vis(e) && !atHidden(e))).map((e) => ({ sig: sig(e), path: path(e) }))
  return { dupes, dangling, mains, h1s, headings, ghostFocusCount: ghostFocus.length, ghostFocus: ghostFocus.slice(0, 10) }
}
const probeExpr = 'JSON.stringify((' + PROBE.toString() + ')())'

const result = { modes: {}, sweep: [], errors: [] }
for (const mode of ['mobile', 'machine', 'animation', 'ds']) {
  await js(`window.showcase.mode('${mode}'); 1`); await sleep(2200)
  const r = await js(probeExpr)
  result.modes[mode] = typeof r === 'string' ? JSON.parse(r) : r
}
// case overlay
await js(`window.showcase.mode('mobile'); 1`); await sleep(800)
await js(`document.getElementById('openCase').click(); 1`); await sleep(3000)
{ const r = await js(probeExpr); result.modes['case-open'] = typeof r === 'string' ? JSON.parse(r) : r }
await js(`(document.getElementById('closeCase')||document.getElementById('closeCase2')).click(); 1`); await sleep(1200)
result.errors = errs.slice(0, 20)
await writeFile('tools/tmp/out-runtime.json', JSON.stringify(result, null, 1))
for (const [k, v] of Object.entries(result.modes)) {
  console.log('== ' + k + ' ==')
  console.log('  dupes:', v.dupes ? v.dupes.length : '?', v.dupes ? JSON.stringify(v.dupes.map((d) => d.id + 'x' + d.count)) : '')
  console.log('  dangling:', v.dangling ? v.dangling.length : '?', v.dangling ? JSON.stringify(v.dangling.map((d) => d.attr + '->' + d.value)) : '')
  console.log('  mains:', JSON.stringify(v.mains))
  console.log('  h1 shown:', JSON.stringify((v.h1s || []).filter((h) => !h.atHidden).map((h) => h.text)))
  console.log('  ghostFocus:', v.ghostFocusCount)
}
console.log('ERRORS', JSON.stringify(result.errors, null, 1))
ws.close(); chrome.kill()
