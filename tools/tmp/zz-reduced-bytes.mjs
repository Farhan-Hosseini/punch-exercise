// (a) the whole sweep again with prefers-reduced-motion: reduce (Chrome's default in this environment)
// (b) byte accounting for what a cold visit downloads, and what the unreachable "stats" screen costs
// (c) does the shell chrome leak into ?embed=machine
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const OUT = process.argv[2] || null
const port = 9900 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=reduce', '--disk-cache-size=1', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'zzq' + port)}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => process.stderr.write(a.join(' ') + '\n')
let t
for (let i = 0; i < 150 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); let STEP = 'boot'
const errors = [], warnings = [], netFail = [], reqs = new Map()
let bytes = []
const add = (a, m) => a.push({ step: STEP, msg: String(m).split('\n').slice(0, 2).join(' | ').slice(0, 300) })
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data), p = m.params
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (m.method === 'Runtime.exceptionThrown') add(errors, 'UNCAUGHT ' + (p.exceptionDetails?.exception?.description || p.exceptionDetails?.text))
  else if (m.method === 'Runtime.consoleAPICalled') { const x = p.args.map((a) => (a.value !== undefined ? a.value : a.description || a.type)).join(' '); if (p.type === 'error') add(errors, 'console.error ' + x); else if (p.type === 'warning') add(warnings, 'console.warn ' + x) }
  else if (m.method === 'Log.entryAdded') { if (p.entry.level === 'error') add(errors, `log(${p.entry.source}) ${p.entry.text} ${p.entry.url || ''}`); else if (p.entry.level === 'warning') add(warnings, `log(${p.entry.source}) ${p.entry.text} ${p.entry.url || ''}`) }
  else if (m.method === 'Network.requestWillBeSent') reqs.set(p.requestId, p.request.url)
  else if (m.method === 'Network.responseReceived') { if (p.response.status >= 400) add(netFail, `HTTP ${p.response.status} ${p.response.url}`) }
  else if (m.method === 'Network.loadingFinished') { bytes.push({ url: reqs.get(p.requestId) || '?', n: p.encodedDataLength }) }
  else if (m.method === 'Network.loadingFailed') { if (!/ERR_ABORTED/.test(p.errorText || '')) add(netFail, `FAILED ${p.errorText} ${reqs.get(p.requestId) || '?'}`) }
})
const send = (m, pr = {}) => new Promise((r) => { const n = ++id; const to = setTimeout(() => { if (pend.has(n)) { pend.delete(n); add(errors, 'CDP-TIMEOUT ' + m); r({}) } }, 20000); pend.set(n, (v) => { clearTimeout(to); r(v) }); ws.send(JSON.stringify({ id: n, method: m, params: pr })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) { add(errors, 'EVAL-THREW ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text)); return undefined } return r.result?.result?.value }
const jj = async (e) => { try { return JSON.parse(await js(`JSON.stringify((()=>{${e}})())`)) } catch { return null } }
const report = {}
try {
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable'); await send('Network.enable')
  await send('Network.setCacheDisabled', { cacheDisabled: true })
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
  await js('localStorage.clear(); 1')
  errors.length = 0; warnings.length = 0; netFail.length = 0; bytes = []
  STEP = 'cold load (reduced motion)'
  log('cold load')
  await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(7000)
  report.reducedMatches = await js(`matchMedia('(prefers-reduced-motion: reduce)').matches`)
  report.boot = await jj(`return { loaderDone: document.getElementById('loader')?.classList.contains('is-done'), mode: document.body.dataset.mode, apis: !!(window.showcase&&window.punchApp&&window.PSec) }`)
  // byte accounting for the first paint
  const tot = bytes.reduce((s, b) => s + b.n, 0)
  const byName = {}
  for (const b of bytes) { const k = b.url.replace(/^https?:\/\/[^/]+/, ''); byName[k] = (byName[k] || 0) + b.n }
  report.coldBytes = { total: tot, requests: bytes.length, top: Object.entries(byName).sort((a, b) => b[1] - a[1]).slice(0, 14) }
  report.statsCost = { js: byName['/mscreens/stats.js'] || 0, cssFileOnDisk: 'see mscreens.css (concatenated)', mscreensCss: byName['/mscreens.css'] || 0 }

  // the reduced-motion sweep
  STEP = 'reduced: tabs'
  for (const mode of ['mobile', 'machine', 'animation', 'system']) {
    STEP = `reduced tab ${mode}`
    log(STEP)
    await js(`window.showcase.mode('${mode}'); 1`); await sleep(mode === 'animation' ? 5000 : 1800)
  }
  STEP = 'reduced: phone pages'
  await js(`window.showcase.mode('mobile'); 1`); await sleep(1500)
  const pages = await jj(`return [...document.querySelectorAll('.pagenav[data-pagenav="page"] [data-page]')].map(b=>b.dataset.page)`)
  report.reducedPages = []
  for (const pg of pages || []) {
    STEP = `reduced phone ${pg}`
    const b0 = errors.length
    await js(`window.punchApp.go('${pg}'); 1`); await sleep(700)
    report.reducedPages.push({ pg, newErrors: errors.length - b0, h: await js(`Math.round((document.querySelector('.m-page[data-page="${pg}"]')||{getBoundingClientRect:()=>({height:0})}).getBoundingClientRect().height)`) })
  }
  STEP = 'reduced: machine screens'
  await js(`window.showcase.mode('machine'); 1`); await sleep(1500)
  report.reducedScreens = []
  for (const k of ['default', 'attract', 'scan', 'countdown', 'loading', 'result', 'score', 'record']) {
    STEP = `reduced machine ${k}`
    const b0 = errors.length
    await js(`window.showcase.mscreen('${k}'); 1`); await sleep(1000)
    report.reducedScreens.push({ k, newErrors: errors.length - b0, attr: await js(`document.getElementById('machine').dataset.mscreen`) })
  }
  STEP = 'reduced: case'
  log('case')
  await js(`document.getElementById('openCase').click(); 1`); await sleep(4000)
  const cH = await js(`document.getElementById('caseScroll').scrollHeight`)
  for (let y = 0; y < cH; y += 800) { STEP = `reduced case ${y}`; await js(`document.getElementById('caseScroll').scrollTo(0,${y}); 1`); await sleep(100) }
  await sleep(1500)
  report.reducedCase = { h: cH, hOver: await js(`(()=>{const s=document.getElementById('caseScroll'); return Math.max(0, s.scrollWidth - s.clientWidth)})()`) }
  await js(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); 1`); await sleep(1000)

  // (c) does the shell chrome leak into the embed?
  STEP = 'embed chrome'
  log('embed chrome')
  await send('Page.navigate', { url: 'http://localhost:5770/?embed=machine' }); await sleep(6000)
  report.embedChrome = await jj(`
    const pick = (sel) => { const e = document.querySelector(sel); if (!e) return 'absent'; const cs = getComputedStyle(e); const b = e.getBoundingClientRect(); return { disp: cs.display, vis: cs.visibility, h: Math.round(b.height), rects: e.getClientRects().length } }
    return { topbar: pick('.topbar'), pagenav: pick('.pagenav'), custom: pick('#custom'), loader: pick('#loader'),
             machineH: Math.round(document.getElementById('machine').getBoundingClientRect().height),
             docH: document.documentElement.scrollHeight, vpH: innerHeight,
             liveRegions: [...document.querySelectorAll('[aria-live]')].map(e=>e.getAttribute('aria-live')).filter((v,i,a)=>a.indexOf(v)===i) }`)
  log('done')
} catch (e) { report.harnessError = String(e?.stack || e).slice(0, 600) }
report.errors = errors; report.warnings = warnings; report.netFail = netFail
report.counts = { errors: errors.length, warnings: warnings.length, netFail: netFail.length }
const text = JSON.stringify(report, null, 1)
if (OUT) { try { writeFileSync(OUT, text) } catch (e) { log('write ' + e.message) } }
process.stdout.write(text.slice(0, 120000) + '\n')
try { ws.close() } catch {}
chrome.kill(); process.exit(0)
