// Corrected machine-screen probe (#machine / .mscreen, not #screen), every mvar design,
// the score slider across its whole travel, the animation tab's clips actually playing, overlay keyboard paths.
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = Number(process.argv[2] || 1440), H = Number(process.argv[3] || 900), OUT = process.argv[4] || null
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', '--autoplay-policy=no-user-gesture-required', '--disk-cache-size=1', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'zzm' + port)}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' })
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
const send = (m, pr = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: pr })) })
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

  // ---- every machine screen, measured on the right node ----
  STEP = 'tab machine'
  await js(`window.showcase.mode('machine'); 1`); await sleep(1800)
  const SCREENS = ['default', 'attract', 'scan', 'countdown', 'loading', 'result', 'score', 'record']
  report.screens = []
  for (const k of SCREENS) {
    STEP = `machine screen ${k}`
    log(STEP)
    const b0 = errors.length
    await js(`window.showcase.mscreen('${k}'); 1`); await sleep(1300)
    report.screens.push({
      screen: k, newErrors: errors.length - b0,
      ...(await jj(`
        const m = document.getElementById('machine')
        const node = document.querySelector('.mscreen[data-mscreen="${k}"]') || document.getElementById('screen')
        const b = node.getBoundingClientRect()
        const broken = [...node.querySelectorAll('img')].filter(i=>i.complete && i.naturalWidth===0).map(i=>i.getAttribute('src'))
        const visN = [...document.querySelectorAll('.mscreen, #screen')].filter(e=>!e.hidden).map(e=>e.dataset.mscreen||'result')
        const de = document.documentElement
        return { attr: m.dataset.mscreen, node: node.className.slice(0,30), h: Math.round(b.height), w: Math.round(b.width),
                 vis: !!node.getClientRects().length, textLen: (node.innerText||'').trim().length,
                 shownScreens: visN, brokenImgs: broken.slice(0,4), brokenN: broken.length,
                 pageOverflow: Math.max(0, de.scrollWidth - de.clientWidth) }`)),
    })
  }
  // ---- every mvar (the .msv designs inside each screen) ----
  report.mvar = []
  for (const k of SCREENS) {
    STEP = `mvar ${k}`
    const names = await jj(`const a=document.querySelector('.mscreen[data-mscreen="${k}"]'); return a ? [...a.querySelectorAll(':scope > .msv')].map(d=>d.dataset.name||'?') : []`)
    for (let i = 0; i < (names || []).length; i++) {
      STEP = `mvar ${k}[${i}] ${names[i]}`
      const b0 = errors.length
      const nm = await js(`window.showcase.mvar('${k}',${i})`)
      await sleep(400)
      const m = await jj(`
        const a = document.querySelector('.mscreen[data-mscreen="${k}"]')
        const d = a ? [...a.querySelectorAll(':scope > .msv')].filter(x=>!x.hidden)[0] : null
        const de = document.documentElement
        return d ? { h: Math.round(d.getBoundingClientRect().height), txt: (d.innerText||'').trim().length, vis: !!d.getClientRects().length, over: Math.max(0, de.scrollWidth - de.clientWidth) } : { none: true }`)
      report.mvar.push({ screen: k, i, asked: names[i], got: nm, newErrors: errors.length - b0, ...m })
    }
    await js(`window.showcase.mvar('${k}',0); 1`)
  }
  // ---- score slider across its travel ----
  STEP = 'slider'
  log('slider')
  await js(`window.showcase.mscreen('result'); document.getElementById('openCustom').click(); 1`); await sleep(1400)
  report.slider = []
  for (const v of [0, 1, 2, 100, 500, 999, 1000]) {
    STEP = `slider ${v}`
    const b0 = errors.length
    await js(`(function(){var el=document.getElementById('c-score'); el.value=${v}; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));})(); 1`)
    await sleep(900)
    report.slider.push({ pos: v, newErrors: errors.length - b0, ...(await jj(`
      const de = document.documentElement
      return { out: (document.getElementById('o-score')||{}).textContent,
               glass: (document.querySelector('#screen .hero-score, #screen [data-slot=hero] .num, #screen .s-hero')||{innerText:''}).innerText.trim().slice(0,40).replace(/\\n/g,' '),
               over: Math.max(0, de.scrollWidth - de.clientWidth) }`)) })
  }
  // decimals off/on across the slider extremes
  STEP = 'decimals off'
  await js(`window.showcase.decimals(false); 1`); await sleep(700)
  report.decimalsOff = await js(`(document.getElementById('o-score')||{}).textContent`)
  await js(`window.showcase.decimals(true); 1`); await sleep(500)
  report.decimalsOn = await js(`(document.getElementById('o-score')||{}).textContent`)

  // ---- the animation tab: clips actually decode and play ----
  STEP = 'tab animation'
  log('animation')
  await js(`window.showcase.mode('animation'); 1`); await sleep(6500)
  report.anim = await jj(`
    const fr = document.querySelector('.linked iframe, #linkedFrame')
    return { iframeSrc: fr && fr.getAttribute('src'), ready: fr && fr.classList.contains('is-ready'),
             inner: (()=>{ try { const d = fr.contentDocument; return { mode: d.body.dataset.mode, mscreen: d.getElementById('machine')?.dataset.mscreen, screenH: Math.round((d.getElementById('machine')||{getBoundingClientRect:()=>({height:0})}).getBoundingClientRect().height), imgsBroken: [...d.images].filter(i=>i.complete&&i.naturalWidth===0).length } } catch(e) { return 'BLOCKED ' + e.message } })(),
             clips: [...document.querySelectorAll('[data-anim-clip]')].map(v=>({src:(v.getAttribute('src')||'').split('/').pop(), preload:v.preload, rs:v.readyState, err:v.error?v.error.code:0})),
             buttons: [...document.querySelectorAll('.anim-bar button, #animStart, #animReset, [data-anim]')].map(b=>({id:b.id, t:(b.textContent||'').trim().slice(0,20)})) }`)
  STEP = 'play the clips'
  report.play = await jj(`
    const out = []
    for (const v of document.querySelectorAll('[data-anim-clip]')) { try { v.preload='auto'; v.load(); v.play().catch(()=>{}) } catch(e) { out.push('throw ' + e.message) } }
    return out`)
  await sleep(6000)
  STEP = 'clips after play'
  report.playResult = await jj(`return [...document.querySelectorAll('[data-anim-clip]')].map(v=>({src:(v.getAttribute('src')||'').split('/').pop(), rs:v.readyState, ct:+v.currentTime.toFixed(2), dur:isFinite(v.duration)?+v.duration.toFixed(2):null, err:v.error?v.error.code+':'+v.error.message:0, w:v.videoWidth, h:v.videoHeight}))`)
  // the animation bar's own controls
  const animBtns = await jj(`return [...document.querySelectorAll('#phoneStage button, .anim-bar button')].map(b=>b.id||((b.textContent||'').trim().slice(0,18))).filter(Boolean).slice(0,14)`)
  report.animButtons = animBtns
  for (const b of (animBtns || []).filter((x) => /start|reset|play|run/i.test(x))) {
    STEP = `anim control ${b}`
    const b0 = errors.length
    await js(`(function(){const el=document.getElementById(${JSON.stringify(b)}) || [...document.querySelectorAll('#phoneStage button, .anim-bar button')].find(x=>(x.textContent||'').trim().startsWith(${JSON.stringify(b)})); if (el) el.click();})(); 1`)
    await sleep(2500)
    report[`anim_${b}`] = { newErrors: errors.length - b0, page: await js(`window.punchApp.page`) }
  }

  // ---- overlay keyboard paths ----
  STEP = 'escape closes overlays'
  await js(`window.showcase.mode('machine'); 1`); await sleep(1000)
  const esc = []
  for (const [name, open] of [['brief', `document.getElementById('openBrief').click()`], ['help', `document.getElementById('openHelp').click()`], ['case', `document.getElementById('openCase').click()`]]) {
    STEP = `escape ${name}`
    await js(open + '; 1'); await sleep(name === 'case' ? 3500 : 1300)
    const opened = await js(`!document.getElementById('${name}').hidden`)
    await js(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})); 1`); await sleep(1200)
    const closed = await js(`document.getElementById('${name}').hidden`)
    esc.push({ overlay: name, opened, closedByEscape: closed, focusBack: await js(`document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null`) })
    if (!closed) { await js(`(document.querySelector('#${name} [data-close-${name}], #${name} .cs-close, #close${name[0].toUpperCase()+name.slice(1)}'))?.click(); 1`); await sleep(900) }
  }
  report.escape = esc
  log('done')
} catch (e) { report.harnessError = String(e?.stack || e).slice(0, 600); log('HARNESS ' + report.harnessError) }
report.errors = errors; report.warnings = warnings; report.netFail = netFail
report.counts = { errors: errors.length, warnings: warnings.length, netFail: netFail.length }
const text = JSON.stringify(report, null, 1)
if (OUT) { try { writeFileSync(OUT, text) } catch (e) { log('write ' + e.message) } }
process.stdout.write(text.slice(0, 200000) + '\n')
try { ws.close() } catch {}
chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'zzm' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600); process.exit(0)
