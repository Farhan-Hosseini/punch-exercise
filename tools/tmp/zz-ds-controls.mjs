// Click every control in the design-system tab, one at a time, and record which one produced an error.
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const OUT = process.argv[2] || null
const port = 9050 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', '--disk-cache-size=1', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'zzc' + port)}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' })
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
  STEP = 'ds tab'
  await js(`window.showcase.mode('system'); 1`); await sleep(2500)
  // scroll through once so lazy pieces build
  const H = await js(`document.documentElement.scrollHeight`)
  for (let y = 0; y < H; y += 900) { await js(`scrollTo(0,${y}); 1`); await sleep(90) }
  await js(`scrollTo(0,0); 1`); await sleep(1500)
  await js(`window.__btns = [...document.querySelectorAll('#dsStage button, #dsStage [role="radio"], #dsStage [role="tab"], #dsStage summary, #dsStage input[type=range]')]; window.__btns.length`)
  const n = await js(`window.__btns.length`)
  report.controlCount = n
  log('controls: ' + n)
  const bad = []
  for (let i = 0; i < n; i++) {
    STEP = `ds control ${i}`
    const b0 = errors.length, nf0 = netFail.length
    const label = await js(`(function(){ const b = window.__btns[${i}]; if (!b) return 'gone'
      try { b.scrollIntoView({block:'center'}) } catch(e){}
      const tag = (b.id ? '#'+b.id : '') + (b.dataset && b.dataset.psec ? ' psec='+b.dataset.psec : '') + ' ' + (b.getAttribute('aria-label')||b.textContent||b.type||'').trim().slice(0,32)
      if (b.tagName === 'INPUT') { b.value = b.max; b.dispatchEvent(new Event('input',{bubbles:true})); b.dispatchEvent(new Event('change',{bubbles:true})) }
      else b.click()
      return tag })()`)
    await sleep(120)
    if (errors.length > b0 || netFail.length > nf0) bad.push({ i, label, errors: errors.slice(b0).map((e) => e.msg), net: netFail.slice(nf0).map((e) => e.msg) })
    if (i % 40 === 0) {
      log('at ' + i + '/' + n + ' bad=' + bad.length)
      report.progress = i; report.badControls = bad; report.errorsSoFar = errors.length; report.netSoFar = netFail.length
      if (OUT) { try { writeFileSync(OUT + '.partial', JSON.stringify(report, null, 1)) } catch {} }
    }
  }
  report.badControls = bad
  STEP = 'ds after'
  await sleep(2500)
  report.after = await jj(`
    const de = document.documentElement
    const broken = [...document.querySelectorAll('#dsStage img')].filter(i=>i.complete && i.naturalWidth===0).map(i=>i.getAttribute('src'))
    return { pageOverflow: Math.max(0, de.scrollWidth - de.clientWidth), brokenImgs: broken.slice(0,8), brokenN: broken.length,
             emptySections: [...document.querySelectorAll('#dsStage section')].filter(s=>!s.hidden && s.getBoundingClientRect().height < 40).map(s=>s.id||String(s.className).slice(0,30)) }`)
  log('done')
} catch (e) { report.harnessError = String(e?.stack || e).slice(0, 600) }
report.errors = errors; report.warnings = warnings; report.netFail = netFail
report.counts = { errors: errors.length, warnings: warnings.length, netFail: netFail.length }
const text = JSON.stringify(report, null, 1)
if (OUT) { try { writeFileSync(OUT, text) } catch (e) { log('write ' + e.message) } }
process.stdout.write(text.slice(0, 120000) + '\n')
try { ws.close() } catch {}
chrome.kill(); process.exit(0)
