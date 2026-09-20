// The design-system tab scrolled top to bottom, plus every live glass iframe it lazy-loads,
// and the case study's two embedded machines. Errors, 404s, overflow, blank frames.
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = Number(process.argv[2] || 1440), H = Number(process.argv[3] || 900), OUT = process.argv[4] || null
const port = 9200 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', '--disk-cache-size=1', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'zzd' + port)}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' })
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
const report = { viewport: { W, H } }
try {
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable'); await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
  await js('localStorage.clear(); 1')
  errors.length = 0; netFail.length = 0; warnings.length = 0
  STEP = 'load'
  await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

  STEP = 'tab system'
  log('ds tab')
  await js(`window.showcase.mode('system'); 1`); await sleep(3000)
  const dsH = await js(`document.getElementById('dsStage')?.scrollHeight || document.documentElement.scrollHeight`)
  report.dsHeight = dsH
  const overs = []
  for (let y = 0; y < dsH; y += 500) {
    STEP = `ds scroll ${y}/${dsH}`
    await js(`window.scrollTo(0, ${y}); 1`); await sleep(160)
    const o = await jj(`const de=document.documentElement; return Math.max(0, de.scrollWidth - de.clientWidth)`)
    if (o > 0) overs.push({ y, over: o })
  }
  await sleep(4000)
  STEP = 'ds bottom'
  report.dsOverflowAt = overs.slice(0, 8)
  report.dsFrames = await jj(`
    return [...document.querySelectorAll('#dsStage iframe')].map(f => {
      let inner = null
      try { const d = f.contentDocument; inner = d ? { ready: d.readyState, mode: d.body?.dataset.mode, mscreen: d.getElementById('machine')?.dataset.mscreen, kids: d.body?.children.length, broken: [...d.images].filter(i=>i.complete&&i.naturalWidth===0).length } : 'no doc' } catch (e) { inner = 'blocked' }
      const b = f.getBoundingClientRect()
      return { attr: f.getAttribute('data-ds-live') || (f.hasAttribute('data-ds-monframe') ? 'mon' : '') || (f.hasAttribute('data-ds-flowframe') ? 'flow' : '') || '?', src: f.getAttribute('src'), w: Math.round(b.width), h: Math.round(b.height), inner }
    })`)
  report.dsBroken = await jj(`
    const broken = [...document.querySelectorAll('#dsStage img')].filter(i=>i.complete && i.naturalWidth===0).map(i=>i.getAttribute('src'))
    return { n: broken.length, sample: broken.slice(0,8), sections: document.querySelectorAll('#dsStage section').length,
             empty: [...document.querySelectorAll('#dsStage section')].filter(s=>s.getBoundingClientRect().height < 40).map(s=>s.id||String(s.className).slice(0,40)).slice(0,8) }`)
  report.dsErrors = errors.slice()
  report.dsNet = netFail.slice()

  // interactive controls inside the design system
  STEP = 'ds controls'
  log('ds controls')
  const ctls = await jj(`return [...document.querySelectorAll('#dsStage [data-ds-tab], #dsStage .ds-seg button, #dsStage [role="tab"]')].map((b,i)=>i).slice(0,40)`)
  report.dsControlCount = (ctls || []).length
  const b0 = errors.length
  await js(`(function(){ const list=[...document.querySelectorAll('#dsStage [data-ds-tab], #dsStage .ds-seg button, #dsStage [role="tab"]')].slice(0,40); for (const b of list) { try { b.click() } catch(e) {} } })(); 1`)
  await sleep(2500)
  report.dsControlErrors = errors.length - b0

  // case study embeds
  STEP = 'case embeds'
  log('case')
  await js(`window.showcase.mode('machine'); document.getElementById('openCase').click(); 1`); await sleep(4000)
  const cH = await js(`document.getElementById('caseScroll').scrollHeight`)
  for (let y = 0; y < cH; y += 600) { STEP = `case scroll ${y}`; await js(`document.getElementById('caseScroll').scrollTo(0, ${y}); 1`); await sleep(110) }
  await sleep(3500)
  STEP = 'case embeds read'
  report.caseFrames = await jj(`
    return [...document.querySelectorAll('#case iframe')].map(f => {
      let inner = null
      try { const d = f.contentDocument; inner = d ? { ready: d.readyState, mode: d.body?.dataset.mode, mscreen: d.getElementById('machine')?.dataset.mscreen, kids: d.body?.children.length } : 'no doc' } catch (e) { inner = 'blocked' }
      const b = f.getBoundingClientRect()
      return { embed: f.dataset.embed, src: f.getAttribute('src'), w: Math.round(b.width), h: Math.round(b.height), inner }
    })`)
  log('done')
} catch (e) { report.harnessError = String(e?.stack || e).slice(0, 600); log('HARNESS ' + report.harnessError) }
report.errors = errors; report.warnings = warnings; report.netFail = netFail
report.counts = { errors: errors.length, warnings: warnings.length, netFail: netFail.length }
const text = JSON.stringify(report, null, 1)
if (OUT) { try { writeFileSync(OUT, text) } catch (e) { log('write ' + e.message) } }
process.stdout.write(text.slice(0, 120000) + '\n')
try { ws.close() } catch {}
chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'zzd' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600); process.exit(0)
