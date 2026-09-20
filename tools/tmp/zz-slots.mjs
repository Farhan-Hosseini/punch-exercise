// The Result screen's older data-slot engine: every slot, every design, plus the theme/space/zoom/backdrop APIs.
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const OUT = process.argv[2] || null
const port = 9030 + Math.floor(Math.random() * 15)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', '--disk-cache-size=1', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'zzl' + port)}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => process.stderr.write(a.join(' ') + '\n')
let t
for (let i = 0; i < 150 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); let STEP = 'boot'
const errors = [], warnings = [], netFail = [], reqs = new Map()
const add = (a, m) => a.push({ step: STEP, msg: String(m).split('\n').slice(0, 2).join(' | ').slice(0, 300) })
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data), p = m.params
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (m.method === 'Runtime.exceptionThrown') add(errors, 'UNCAUGHT ' + (p.exceptionDetails?.exception?.description || p.exceptionDetails?.text))
  else if (m.method === 'Runtime.consoleAPICalled') { const x = p.args.map((a) => (a.value !== undefined ? a.value : a.description || a.type)).join(' '); if (p.type === 'error') add(errors, 'console.error ' + x); else if (p.type === 'warning') add(warnings, 'console.warn ' + x) }
  else if (m.method === 'Log.entryAdded') { if (p.entry.level === 'error') add(errors, `log(${p.entry.source}) ${p.entry.text} ${p.entry.url || ''}`); else if (p.entry.level === 'warning') add(warnings, `log(${p.entry.source}) ${p.entry.text} ${p.entry.url || ''}`) }
  else if (m.method === 'Network.requestWillBeSent') reqs.set(p.requestId, p.request.url)
  else if (m.method === 'Network.responseReceived') { if (p.response.status >= 400) add(netFail, `HTTP ${p.response.status} ${p.response.url}`) }
  else if (m.method === 'Network.loadingFailed') { if (!/ERR_ABORTED/.test(p.errorText || '')) add(netFail, `FAILED ${p.errorText} ${reqs.get(p.requestId) || '?'}`) }
})
const send = (m, pr = {}) => new Promise((r) => { const n = ++id; const to = setTimeout(() => { if (pend.has(n)) { pend.delete(n); add(errors, 'CDP-TIMEOUT ' + m); r({}) } }, 20000); pend.set(n, (v) => { clearTimeout(to); r(v) }); ws.send(JSON.stringify({ id: n, method: m, params: pr })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) { add(errors, 'EVAL-THREW ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text)); return undefined } return r.result?.result?.value }
const jj = async (e) => { try { return JSON.parse(await js(`JSON.stringify((()=>{${e}})())`)) } catch { return null } }
const report = {}
try {
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable'); await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
  await js('localStorage.clear(); 1')
  errors.length = 0; netFail.length = 0; warnings.length = 0
  await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6500)
  STEP = 'result screen'
  await js(`window.showcase.mode('machine'); window.showcase.mscreen('result'); 1`); await sleep(2000)
  const slots = await jj(`return window.showcase.slots()`)
  report.slots = (slots || []).map((s) => ({ key: s.key, n: s.designs.length, designs: s.designs }))
  report.problems = []
  let n = 0
  for (const s of slots || []) {
    for (let i = 0; i < s.designs.length; i++) {
      STEP = `slot ${s.key}[${i}] ${s.designs[i]}`
      const b0 = errors.length, nf0 = netFail.length
      const got = await js(`window.showcase.set('${s.key}', ${i})`)
      await sleep(250); n++
      const m = await jj(`
        const de = document.documentElement
        const el = document.querySelector('.sec[data-slot="${s.key}"]')
        const shown = el ? [...el.querySelectorAll(':scope > .vars > .var')].filter(v=>!v.hidden)[0] : null
        return { over: Math.max(0, de.scrollWidth - de.clientWidth), h: shown ? Math.round(shown.getBoundingClientRect().height) : (el ? -1 : -2),
                 broken: [...document.querySelectorAll('#screen img')].filter(i=>i.complete && i.naturalWidth===0).length }`)
      if (errors.length > b0 || netFail.length > nf0 || !got || !m || m.over > 0 || m.h <= 0 || m.broken > 0) {
        report.problems.push({ step: STEP, got, newErrors: errors.slice(b0).map((e) => e.msg), net: netFail.slice(nf0).map((e) => e.msg), ...m })
      }
    }
    await js(`window.showcase.set('${s.key}', 0); 1`)
  }
  report.slotDesignsExercised = n
  // theme / space / zoom / backdrop / fit
  report.api = []
  const themes = await jj(`return [...document.querySelectorAll('[data-theme-tile], .theme-tile[data-variant], [data-variant]')].map(b=>b.dataset.variant).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i)`)
  report.themes = themes
  for (const v of (themes || [])) {
    STEP = `theme ${v}`
    const b0 = errors.length
    await js(`window.showcase.theme('${v}'); 1`); await sleep(450)
    report.api.push({ what: 'theme ' + v, newErrors: errors.length - b0, over: await js(`Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)`) })
  }
  for (const b of ['glow', 'lights', 'spot', 'beams', 'smoke', 'pulse', 'embers', 'grid']) {
    STEP = `backdrop ${b}`
    const b0 = errors.length
    const got = await js(`window.showcase.backdrop('${b}')`)
    await sleep(400)
    report.api.push({ what: 'backdrop ' + b, got, newErrors: errors.length - b0 })
  }
  for (const s of [0, 1, 2, 3, 4]) {
    STEP = `space ${s}`
    const b0 = errors.length
    await js(`window.showcase.space(${s}); 1`); await sleep(350)
    report.api.push({ what: 'space ' + s, newErrors: errors.length - b0 })
  }
  for (const z of [0.5, 1, 1.5, 2]) {
    STEP = `zoom ${z}`
    const b0 = errors.length
    await js(`window.showcase.zoom(${z}); 1`); await sleep(350)
    report.api.push({ what: 'zoom ' + z, newErrors: errors.length - b0, over: await js(`Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)`) })
  }
  await js(`window.showcase.zoom(1); 1`)
  report.fit = await jj(`return window.showcase.fit()`)
  report.sectionHeights = await jj(`
    const out = {}
    for (const s of window.showcase.slots()) { try { out[s.key] = window.showcase.sectionHeight(s.key) } catch (e) { out[s.key] = 'THREW ' + e.message } }
    return out`)
  log('done')
} catch (e) { report.harnessError = String(e?.stack || e).slice(0, 600) }
report.errors = errors; report.warnings = warnings; report.netFail = netFail
report.counts = { errors: errors.length, warnings: warnings.length, netFail: netFail.length }
const text = JSON.stringify(report, null, 1)
if (OUT) { try { writeFileSync(OUT, text) } catch {} }
process.stdout.write(text.slice(0, 120000) + '\n')
try { ws.close() } catch {}
chrome.kill(); process.exit(0)
