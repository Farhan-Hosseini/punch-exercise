import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-color-profile=srgb','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1600,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); let errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push('EXC ' + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text))
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push('CON ' + m.params.args.map(a => a.value || a.description).join(' '))
})
const send = (m, p = {}) => new Promise(r => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return 'THREW: ' + r.result.exceptionDetails.text + ' ' + (r.result.exceptionDetails.exception?.description||''); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })

const MEAS = `JSON.stringify((() => {
  const m = (key) => { const el = document.querySelector('[data-slot="'+key+'"]'); if (!el) return {missing:key}
    const vars = [...el.querySelectorAll(':scope > .vars > .var')]
    return { vars: vars.length, shownVars: vars.filter(v=>!v.hidden).length, h: Math.round(el.getBoundingClientRect().height) } }
  const cs = getComputedStyle(document.documentElement)
  const hero = document.querySelector('[data-slot="hero"]')
  return { hero: m('hero'), ranks: m('ranks'), cta: m('cta'),
    space: cs.getPropertyValue('--space').trim(), r: cs.getPropertyValue('--r').trim(), glow: cs.getPropertyValue('--glow').trim(),
    heroText: (hero ? hero.innerText.replace(/\s+/g,' ').trim().slice(0,60) : ''),
    designLabelHero: (document.getElementById('design-hero')||{}).textContent,
    saved: (()=>{try{const s=JSON.parse(localStorage.getItem('punch-showcase.v5')||'null');return s?{hero:s.layout&&s.layout.hero, ranks:JSON.stringify(s.layout&&s.layout.ranks), space:(s.sets&&s.sets.arena||{}).space}:null}catch(e){return 'err'}})() }
})())`
const nav = async (url='http://localhost:5770/') => { await send('Page.navigate', { url }); await sleep(5500) }
const toResult = async () => { await js(`window.showcase.mode('machine'); 1`); await sleep(1200); await js(`window.showcase.mscreen('result'); 1`); await sleep(1800) }

await nav(); await js('localStorage.clear(); 1'); await nav(); await toResult()
errs = []
const baseline = JSON.parse(await js(MEAS))

// corrupt
await js(`(() => { const K='punch-showcase.v5'; const s=JSON.parse(localStorage.getItem(K)||'{}'); s.layout=s.layout||{}; s.layout.hero='x'; s.layout.ranks={}; s.sets=s.sets||{}; s.sets.arena=s.sets.arena||{}; s.sets.arena.space='NaN'; localStorage.setItem(K, JSON.stringify(s)); return localStorage.getItem(K).slice(0,200) })()`)
await nav(); await toResult()
errs = []
const corrupted = JSON.parse(await js(MEAS))
const corruptErrs = errs.slice()

// does the next-design arrow recover it?
const btn = await js(`JSON.stringify([...document.querySelectorAll('.sec-btn')].slice(0,4).map(b=>({cls:b.className, lbl:b.getAttribute('aria-label')||b.title||b.textContent.trim(), dis:b.disabled})))`)
await js(`(() => { const row=[...document.querySelectorAll('.sec-row')].find(r=>r.querySelector('#design-hero')); if(!row) return 'norow'; const b=[...row.querySelectorAll('.sec-btn')].pop(); b.click(); return 'clicked '+b.className })()`)
await sleep(1200)
const afterArrow = JSON.parse(await js(MEAS))
await nav(); await toResult()
const afterArrowReload = JSON.parse(await js(MEAS))

// reset everything
await js(`(document.getElementById('resetCustom')||{click(){}}).click(); 1`); await sleep(1500)
const afterReset = JSON.parse(await js(MEAS))

console.log(JSON.stringify({ baseline, corrupted, corruptErrs, btn, afterArrow, afterArrowReload, afterReset }, null, 1))
ws.close(); chrome.kill()
