import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sw'+port)}`,'--window-size=1600,1000','about:blank'], { stdio: 'ignore' })
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
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return '__ERR__' + JSON.stringify(r.result.exceptionDetails).slice(0, 300); return r.result?.result?.value }
const jj = async (e) => { const v = await js(e); if (typeof v === 'string' && v.startsWith('__ERR__')) { console.log(v); return null } return typeof v === 'string' ? JSON.parse(v) : v }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6500)

await js(`(()=>{ window.__chk = function () {
  const byId = {}
  for (const el of document.querySelectorAll('[id]')) (byId[el.id] ||= []).push(el.tagName + '.' + (typeof el.className==='string'? el.className.split(/\\s+/)[0] : ''))
  const dupes = Object.entries(byId).filter(([, v]) => v.length > 1).map(([k, v]) => k + ' x' + v.length + ' ' + v.join(','))
  const ids = new Set(Object.keys(byId))
  const dangling = []
  for (const attr of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'for']) {
    for (const el of document.querySelectorAll('[' + attr + ']')) {
      const v = (el.getAttribute(attr) || '').trim(); if (!v) continue
      for (const tk of (attr === 'for' && el.tagName === 'LABEL' ? [v] : v.split(/\\s+/))) if (tk && !ids.has(tk)) dangling.push(attr + '->' + tk + ' on ' + el.tagName + '#' + el.id + '.' + (typeof el.className==='string'?el.className.split(/\\s+/)[0]:''))
    }
  }
  return { dupes, dangling }
}; 1})()`)

const surfaces = await jj(`JSON.stringify({ machine: window.PSec.pages('machine'), phone: window.PSec.pages('phone') })`)
console.log('PAGES', JSON.stringify(surfaces))
const bad = []
for (const surface of ['phone', 'machine']) {
  for (const page of surfaces[surface]) {
    const secs = await jj(`JSON.stringify(window.showcase.sections('${surface}','${page}'))`)
    for (const s of secs || []) {
      for (let i = 0; i < s.names.length; i++) {
        await js(`window.PSec.set('${surface}','${page}','${s.key}',${i}); 1`)
        await sleep(90)
        const r = await jj('JSON.stringify(window.__chk())')
        if (r && (r.dupes.length || r.dangling.length)) bad.push({ surface, page, sec: s.key, i, name: s.names[i], ...r })
      }
      await js(`window.PSec.set('${surface}','${page}','${s.key}',0); 1`)
    }
  }
}
console.log('SWEEP PROBLEMS:', bad.length)
for (const b of bad.slice(0, 40)) console.log(' ', b.surface, b.page, b.sec, '#' + b.i, b.name, '| dupes', JSON.stringify(b.dupes), '| dangling', JSON.stringify(b.dangling))
// global sections too
const g = await jj(`JSON.stringify(window.showcase.sections('global','all'))`)
console.log('GLOBAL SECS', JSON.stringify(g))
// the pagenav measurement
await js(`window.showcase.mode('mobile'); 1`); await sleep(1500)
console.log('PAGENAV', await js(`JSON.stringify((()=>{const n=[...document.querySelectorAll('.pagenav')].map(p=>({cls:p.className, dn:p.dataset.pagenav, vis:!!p.getClientRects().length, disp:getComputedStyle(p).display, subs:p.querySelectorAll('.pagesub button').length, groups:p.querySelectorAll('.pagegroups button').length}));return n})())`))
console.log('ERRORS', JSON.stringify(errs.slice(0, 12)))
ws.close(); chrome.kill()
