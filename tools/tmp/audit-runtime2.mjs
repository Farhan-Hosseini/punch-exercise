import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'a2'+port)}`,'--window-size=1600,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 150 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).slice(0, 220))
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map((a) => a.value || a.description).join(' ').slice(0, 220))
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return { __err: JSON.stringify(r.result.exceptionDetails).slice(0, 400) }; return r.result?.result?.value }
const jj = async (e) => { const v = await js(e); return typeof v === 'string' ? JSON.parse(v) : v }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); sessionStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6500)

await js(`(()=>{ window.__probe = function () {
  const cls = (el) => (el && typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '')
  const sig = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + cls(el)
  const path = (el) => { const a = []; let e = el, n = 0; while (e && e !== document.body && n++ < 10) { a.unshift(sig(e)); e = e.parentElement } return a.join(' > ') }
  const byId = {}
  for (const el of document.querySelectorAll('[id]')) (byId[el.id] ||= []).push(path(el))
  const dupes = Object.entries(byId).filter(([, v]) => v.length > 1).map(([k, v]) => ({ id: k, count: v.length, where: v }))
  const ids = new Set(Object.keys(byId))
  const dangling = []
  for (const attr of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-activedescendant', 'for']) {
    for (const el of document.querySelectorAll('[' + attr + ']')) {
      const v = (el.getAttribute(attr) || '').trim(); if (!v) continue
      const inView = !!(el.offsetParent || el.getClientRects().length)
      for (const tk of (attr === 'for' && el.tagName === 'LABEL' ? [v] : v.split(/\\s+/))) if (tk && !ids.has(tk)) dangling.push({ attr, value: tk, on: sig(el), inView, path: path(el) })
    }
  }
  // AT-hidden: display:none / visibility:hidden / hidden / aria-hidden / inert on self or any ancestor
  const atHidden = (el) => { let e = el; while (e && e.nodeType === 1) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || e.hasAttribute('hidden') || e.getAttribute('aria-hidden') === 'true' || e.hasAttribute('inert')) return true; e = e.parentElement } return false }
  const mains = [...document.querySelectorAll('main')].filter((m) => !atHidden(m)).map(sig)
  const h1s = [...document.querySelectorAll('h1')].filter((h) => !atHidden(h)).map((h) => ({ text: h.textContent.trim().slice(0, 40), path: path(h) }))
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((h) => !atHidden(h)).map((h) => ({ t: +h.tagName[1], x: h.textContent.trim().replace(/\\s+/g, ' ').slice(0, 42) }))
  const skips = []
  for (let i = 1; i < headings.length; i++) if (headings[i].t > headings[i - 1].t + 1) skips.push(headings[i - 1].t + ':' + headings[i - 1].x + ' -> ' + headings[i].t + ':' + headings[i].x)
  // focusable but visually gone and not AT-hidden (keyboard traps in hidden surfaces)
  const ghost = [...document.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]')].filter((e) => e.tabIndex >= 0).filter((e) => !atHidden(e) && !e.getClientRects().length).map((e) => ({ sig: sig(e), path: path(e) }))
  return { dupes, dangling, mains, h1s, headingSkips: skips, headingCount: headings.length, ghost: ghost.slice(0, 12), ghostCount: ghost.length }
}; 1})()`)

const res = { modes: {}, sweep: [], errors: [] }
for (const mode of ['mobile', 'machine', 'animation', 'system']) {
  await js(`window.showcase.mode('${mode}'); 1`); await sleep(2500)
  res.modes[mode] = await jj('JSON.stringify(window.__probe())')
}
// touch target measurement on the sub page bar
await js(`window.showcase.mode('mobile'); 1`); await sleep(1500)
res.touch = await jj(`JSON.stringify((()=>{
  const out = []
  for (const sel of ['.pagenav .pagesub button', '.pagenav .pagegroups button', '.mode', '.briefbtn', '.sec-btn', '.seg button', '.iconbtn.small']) {
    const b = document.querySelector(sel); if (!b || !b.getClientRects().length) { out.push({ sel, missing: true }); continue }
    const r = b.getBoundingClientRect()
    const cs = getComputedStyle(b, '::after')
    const top = parseFloat(cs.top), bot = parseFloat(cs.bottom), h = cs.height
    out.push({ sel, h: +r.height.toFixed(1), w: +r.width.toFixed(1), afterContent: cs.content, afterTop: cs.top, afterBottom: cs.bottom, afterHeight: cs.height, hit: (cs.content !== 'none' && cs.height !== 'auto') ? +parseFloat(cs.height).toFixed(1) : null })
  }
  return out
})())`)
res.errors = errs.slice(0, 25)
for (const [k, v] of Object.entries(res.modes)) {
  console.log('== ' + k + ' ==', 'dupes', v.dupes.length, JSON.stringify(v.dupes.map((d) => d.id + 'x' + d.count)))
  console.log('   dangling', v.dangling.length, JSON.stringify(v.dangling.map((d) => d.attr + '->' + d.value + (d.inView ? ' [VISIBLE]' : ''))))
  console.log('   mains', JSON.stringify(v.mains), 'h1', JSON.stringify(v.h1s.map((h) => h.text)))
  console.log('   headings', v.headingCount, 'skips', v.headingSkips.length, JSON.stringify(v.headingSkips.slice(0, 5)))
  console.log('   ghostFocusable', v.ghostCount, JSON.stringify(v.ghost.slice(0, 6).map((g) => g.path)))
}
console.log('TOUCH', JSON.stringify(res.touch, null, 1))
console.log('ERRORS', JSON.stringify(res.errors, null, 1))
ws.close(); chrome.kill()
