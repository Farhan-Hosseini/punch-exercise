import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
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
  const m = (key) => {
    const el = document.querySelector('[data-slot="'+key+'"]') || document.getElementById('slot-'+key)
    if (!el) return { missing: key }
    const vars = [...el.querySelectorAll(':scope > .vars > .var')]
    return { vars: vars.length, shownVars: vars.filter(v => !v.hidden).length, h: Math.round(el.getBoundingClientRect().height) }
  }
  const cs = getComputedStyle(document.documentElement)
  return { hero: m('hero'), ranks: m('ranks'), stats: m('stats'), cta: m('cta'),
    space: cs.getPropertyValue('--space').trim(), glow: cs.getPropertyValue('--glow').trim(), r: cs.getPropertyValue('--r').trim(),
    saved: (()=>{try{const s=JSON.parse(localStorage.getItem('punch-showcase.v5')||'null');return s?{layoutHero:s.layout&&s.layout.hero, layoutRanks:JSON.stringify(s.layout&&s.layout.ranks), space:(s.sets&&s.sets.arena||{}).space}:null}catch(e){return 'err'}})() }
})())`

const nav = async (url='http://localhost:5770/') => { await send('Page.navigate', { url }); await sleep(5500) }

await nav()
await js('localStorage.clear(); 1')
await nav()
await js(`window.showcase.mode('machine'); 1`); await sleep(1500)
await js(`window.showcase.mscreen ? window.showcase.mscreen('result') : (window.showcase.screen && window.showcase.screen('result')); 1`); await sleep(1800)
errs = []
const baseline = JSON.parse(await js(MEAS))
const apiKeys = await js('JSON.stringify(Object.keys(window.showcase))')
const baseErrs = errs.slice()

// find what slot selector actually is, if the above missed
const probe = await js(`JSON.stringify([...document.querySelectorAll('[data-slot]')].slice(0,12).map(e=>e.getAttribute('data-slot')))`)

console.log(JSON.stringify({ apiKeys, probe, baseline, baseErrs }, null, 1))
ws.close(); chrome.kill()
