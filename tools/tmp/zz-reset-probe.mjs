// Does "Reset everything" actually put every section back to its first design?
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9800 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', '--disk-cache-size=1', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'zzr' + port)}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => process.stderr.write(a.join(' ') + '\n')
let t
for (let i = 0; i < 150 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errors = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data), p = m.params
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (m.method === 'Runtime.exceptionThrown') errors.push(String(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text).split('\n')[0])
  else if (m.method === 'Runtime.consoleAPICalled' && p.type === 'error') errors.push('console.error ' + p.args.map((a) => a.value || a.description).join(' ').split('\n')[0])
})
const send = (m, pr = {}) => new Promise((r) => { const n = ++id; const to = setTimeout(() => { if (pend.has(n)) { pend.delete(n); errors.push('CDP TIMEOUT ' + m); r({}) } }, 15000); pend.set(n, (v) => { clearTimeout(to); r(v) }); ws.send(JSON.stringify({ id: n, method: m, params: pr })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) { errors.push('EVAL ' + String(r.result.exceptionDetails.exception?.description || '').split('\n')[0]); return undefined } return r.result?.result?.value }
const jj = async (e) => { try { return JSON.parse(await js(`JSON.stringify((()=>{${e}})())`)) } catch { return null } }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

const out = {}
out.freshPsec = await jj(`return window.PSec.state`)
// move a pile of choices off zero
log('setting choices')
await js(`window.showcase.mode('machine'); 1`); await sleep(1200)
const moved = await jj(`
  const done = []
  for (const surface of ['machine','phone']) for (const page of window.PSec.pages(surface)) {
    for (const s of window.PSec.sections(surface, page)) if (s.names.length > 1) { window.PSec.set(surface, page, s.key, 1, true); done.push(surface+'/'+page+'/'+s.key) }
  }
  for (const s of window.PSec.sections('global','all')) if (s.names.length > 1) { window.PSec.set('global','all', s.key, 1, true); done.push('global/'+s.key) }
  return done`)
out.moved = (moved || []).length
await js(`window.showcase.appearance('light'); window.showcase.theme('orbitron'); window.showcase.logo('bag'); window.showcase.backdrop('grid'); window.showcase.decimals(false); 1`)
await sleep(1200)
out.before = await jj(`return { psecKeys: Object.keys(window.PSec.state), nonZero: Object.entries(window.PSec.state).flatMap(([b,v])=>Object.entries(v).filter(([,i])=>i!==0).map(([k,i])=>b+'/'+k+'='+i)).length, appearance: document.documentElement.dataset.appearance || document.body.dataset.appearance, decimals: document.documentElement.dataset.decimals }`)
log('reset')
await js(`document.getElementById('openCustom').click(); 1`); await sleep(900)
await js(`document.getElementById('resetCustom').click(); 1`); await sleep(2500)
out.after = await jj(`
  const st = window.PSec.state
  const nonZero = Object.entries(st).flatMap(([b,v])=>Object.entries(v).filter(([,i])=>i!==0).map(([k,i])=>b+'/'+k+'='+i))
  // and what the DOM actually shows
  const shownNonZero = []
  for (const surface of ['machine','phone']) for (const page of window.PSec.pages(surface))
    for (const s of window.PSec.sections(surface, page)) { const i = window.PSec.get(surface, page, s.key); if (i !== 0) shownNonZero.push(surface+'/'+page+'/'+s.key+'='+i) }
  for (const s of window.PSec.sections('global','all')) { const i = window.PSec.get('global','all', s.key); if (i !== 0) shownNonZero.push('global/'+s.key+'='+i) }
  const domNonZero = [...document.querySelectorAll('[data-sec][data-sv-index]')].filter(e=>e.dataset.svIndex !== '0').map(e=>e.dataset.sec+'='+e.dataset.svIndex)
  return { psecKeys: Object.keys(st), psecState: st, nonZero, shownNonZero, domNonZero: domNonZero.slice(0,12), domNonZeroN: domNonZero.length,
           appearance: document.documentElement.dataset.appearance || document.body.dataset.appearance, decimals: document.documentElement.dataset.decimals,
           typeface: document.documentElement.dataset.typeface || document.body.dataset.typeface, logo: (document.querySelector('[data-logo][aria-checked="true"]')||{dataset:{}}).dataset.logo }`)
// and after a reload, does the reset stick?
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
out.afterReload = await jj(`
  const st = window.PSec.state
  return { psecState: st, nonZero: Object.entries(st).flatMap(([b,v])=>Object.entries(v).filter(([,i])=>i!==0).map(([k,i])=>b+'/'+k+'='+i)),
           domNonZeroN: [...document.querySelectorAll('[data-sec][data-sv-index]')].filter(e=>e.dataset.svIndex !== '0').length }`)
out.errors = errors
const text = JSON.stringify(out, null, 1)
if (process.argv[2]) { try { writeFileSync(process.argv[2], text) } catch (e) { log('write ' + e.message) } }
process.stdout.write(text + '\n')
try { ws.close() } catch {}
chrome.kill(); process.exit(0)
