// FULL-SYSTEM RUNTIME SWEEP (dimension: does the whole thing run with no errors, everywhere)
// usage: node tools/tmp/zz-runtime-sweep.mjs <width> <height> <out.json>
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const W = Number(process.argv[2] || 1440)
const H = Number(process.argv[3] || 900)
const OUT = process.argv[4] || null
const DEEP = process.argv[5] !== 'shallow'
const port = 9100 + Math.floor(Math.random() * 120)
const profile = join(tmpdir(), 'zzs' + port)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb',
  '--force-prefers-reduced-motion=no-preference', '--autoplay-policy=no-user-gesture-required',
  '--disk-cache-size=1', '--media-cache-size=1',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${W},${H}`, 'about:blank',
], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => process.stderr.write(a.join(' ') + '\n')

let t
for (let i = 0; i < 150 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
if (!t) { log('NO CHROME TARGET'); process.exit(2) }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))

let id = 0
const pend = new Map()
let STEP = 'boot'
const errors = []; const warnings = []; const netFail = []
const reqs = new Map(); const status = new Map()
const add = (arr, msg) => { arr.push({ step: STEP, msg: String(msg).split('\n').slice(0, 2).join(' | ').slice(0, 300) }) }

ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data); const p = m.params
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (m.method === 'Runtime.exceptionThrown') add(errors, 'UNCAUGHT ' + (p.exceptionDetails?.exception?.description || p.exceptionDetails?.text))
  else if (m.method === 'Runtime.consoleAPICalled') {
    const txt = p.args.map((a) => (a.value !== undefined ? a.value : a.description || a.type)).join(' ')
    if (p.type === 'error') add(errors, 'console.error ' + txt)
    else if (p.type === 'warning') add(warnings, 'console.warn ' + txt)
  } else if (m.method === 'Log.entryAdded') {
    const l = p.entry
    if (l.level === 'error') add(errors, `log(${l.source}) ${l.text} ${l.url || ''}`)
    else if (l.level === 'warning') add(warnings, `log(${l.source}) ${l.text} ${l.url || ''}`)
  } else if (m.method === 'Network.requestWillBeSent') reqs.set(p.requestId, p.request.url)
  else if (m.method === 'Network.responseReceived') {
    status.set(p.response.url, p.response.status)
    if (p.response.status >= 400) add(netFail, `HTTP ${p.response.status} ${p.response.url}`)
  } else if (m.method === 'Network.loadingFailed') {
    const u = reqs.get(p.requestId) || '?'
    if (!/ERR_ABORTED/.test(p.errorText || '')) add(netFail, `FAILED ${p.errorText} ${u}`)
  }
})
const send = (m, pr = {}) => new Promise((r) => {
  const n = ++id
  const to = setTimeout(() => { if (pend.has(n)) { pend.delete(n); add(errors, 'CDP-TIMEOUT ' + m); r({}) } }, 20000)
  pend.set(n, (v) => { clearTimeout(to); r(v) })
  ws.send(JSON.stringify({ id: n, method: m, params: pr }))
})
const js = async (e) => {
  const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) { add(errors, 'EVAL-THREW ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text)); return undefined }
  return r.result?.result?.value
}
const jj = async (e) => { const v = await js(`JSON.stringify((()=>{${e}})())`); try { return JSON.parse(v) } catch { return null } }

const report = { viewport: { W, H }, deep: DEEP }
function dump() {
  report.errors = errors; report.warnings = warnings; report.netFail = netFail
  report.counts = { errors: errors.length, warnings: warnings.length, netFail: netFail.length }
  report.http4xx = [...status.entries()].filter(([, s]) => s >= 400)
  const text = JSON.stringify(report, null, 1)
  if (OUT) { try { writeFileSync(OUT, text) } catch (e) { log('WRITE FAILED ' + e.message) } }
  process.stdout.write(text.slice(0, 200000) + '\n')
}

try {
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable'); await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })

  STEP = 'warm load'
  await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
  await js('localStorage.clear(); sessionStorage.clear(); 1')
  errors.length = 0; warnings.length = 0; netFail.length = 0; status.clear()
  STEP = 'cold load (storage cleared)'
  log('loading...')
  await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

  report.boot = await jj(`
    return { loaderDone: document.getElementById('loader')?.classList.contains('is-done'),
             mode: document.body.dataset.mode,
             apis: { showcase: !!window.showcase, punchApp: !!window.punchApp, PSec: !!window.PSec, PunchFormat: !!window.PunchFormat, designSystem: !!window.designSystem },
             title: document.title }`)
  log('boot', JSON.stringify(report.boot))

  // cheap overflow probe: page-level first, element list only when it overflows
  const OVER = `
    const de = document.documentElement
    const page = Math.max(0, de.scrollWidth - de.clientWidth)
    if (!page) return { page: 0 }
    const vw = de.clientWidth, bad = []
    for (const el of document.querySelectorAll('body *')) {
      if (!el.getClientRects().length) continue
      const b = el.getBoundingClientRect()
      if (b.width > 0 && (b.right > vw + 1 || b.left < -1) && el.children.length < 40) {
        bad.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className||'').split(' ').filter(Boolean).slice(0,2).join('.')) + ' L' + Math.round(b.left) + ' R' + Math.round(b.right))
      }
    }
    return { page, vw, bad: bad.slice(-6), badN: bad.length }`
  const overflows = []
  const probe = async (label) => { const o = await jj(OVER); if (o && o.page > 0) overflows.push({ step: label, ...o }); return o }

  // ---------- 1. the four tabs ----------
  report.modes = {}
  for (const mode of ['mobile', 'machine', 'animation', 'system']) {
    STEP = `tab ${mode}`
    log(STEP)
    await js(`window.showcase.mode('${mode}'); 1`)
    await sleep(mode === 'animation' ? 6000 : 2000)
    report.modes[mode] = await jj(`
      const vis = (id) => { const e = document.getElementById(id); return e ? (!e.hidden && !!e.getClientRects().length) : null }
      const fr = document.getElementById('linkedFrame') || document.querySelector('.linked iframe')
      return { bodyMode: document.body.dataset.mode, stage: vis('stage'), phoneStage: vis('phoneStage'), dsStage: vis('dsStage'),
               iframeSrc: fr ? fr.getAttribute('src') : null, iframeReady: fr ? fr.classList.contains('is-ready') : null,
               iframeDoc: (()=>{ try { return fr && fr.contentDocument ? { mode: fr.contentDocument.body.dataset.mode, kids: fr.contentDocument.body.children.length, err: fr.contentDocument.title } : null } catch(e){ return 'cross-origin' } })(),
               videos: [...document.querySelectorAll('#phoneStage video, .clip video, video')].map(v=>({src:(v.currentSrc||v.getAttribute('src')||'').split('/').pop(), err:v.error?v.error.code:0, rs:v.readyState, paused:v.paused})) }`)
    await probe(`tab ${mode}`)
  }
  STEP = "mode('ds') literal"
  await js(`window.showcase.mode('ds'); 1`); await sleep(800)
  report.dsLiteral = await js(`document.body.dataset.mode`)

  // ---------- 2. every phone page ----------
  STEP = 'tab mobile'
  await js(`window.showcase.mode('mobile'); 1`); await sleep(1800)
  const phonePages = await jj(`return window.PSec.pages('phone')`)
  report.phonePages = phonePages
  const navPages = await jj(`return [...document.querySelectorAll('.pagenav[data-pagenav="page"] [data-page]')].map(b=>b.dataset.page)`)
  report.navPages = navPages
  report.pages = []
  for (const pg of navPages || []) {
    STEP = `phone page ${pg}`
    log(STEP)
    const before = errors.length
    await js(`window.punchApp.go('${pg}'); 1`); await sleep(900)
    const o = await probe(STEP)
    report.pages.push({
      page: pg, newErrors: errors.length - before, over: o?.page || 0, bad: o?.bad,
      ...(await jj(`
        const el = document.querySelector('.m-page[data-page="${pg}"]')
        if (!el) return { missingNode: true, landed: window.punchApp.page }
        const b = el.getBoundingClientRect()
        const broken = [...el.querySelectorAll('img')].filter(i=>i.complete && i.naturalWidth===0).map(i=>i.getAttribute('src'))
        return { landed: window.punchApp.page, h: Math.round(b.height), w: Math.round(b.width), visible: !!el.getClientRects().length && !el.inert,
                 textLen: (el.innerText||'').trim().length, brokenImgs: broken.slice(0,4), brokenN: broken.length }`)),
    })
  }

  // ---------- 3. every machine screen ----------
  STEP = 'tab machine'
  await js(`window.showcase.mode('machine'); 1`); await sleep(1800)
  const MS = await jj(`return window.PSec.pages('machine')`)
  report.machinePages = MS
  const navScreens = await jj(`return [...document.querySelectorAll('.pagenav[data-pagenav="mscreen"] [data-mscreen]')].map(b=>b.dataset.mscreen)`)
  report.navScreens = navScreens
  const SCREENS = (navScreens && navScreens.length ? navScreens : ['default', 'attract', 'scan', 'countdown', 'loading', 'result', 'score', 'record'])
  report.screens = []
  for (const k of SCREENS) {
    STEP = `machine screen ${k}`
    log(STEP)
    const before = errors.length
    await js(`window.showcase.mscreen('${k}'); 1`); await sleep(1200)
    const o = await probe(STEP)
    report.screens.push({
      screen: k, newErrors: errors.length - before, over: o?.page || 0, bad: o?.bad,
      ...(await jj(`
        const s = document.getElementById('screen')
        const shown = [...s.children].filter(e=>!e.hasAttribute('hidden') && e.getClientRects().length)
        const broken = [...s.querySelectorAll('img')].filter(i=>i.complete && i.naturalWidth===0).map(i=>i.getAttribute('src'))
        return { bodyMscreen: document.body.dataset.mscreen, shownN: shown.length, shownIds: shown.map(e=>e.dataset.mscreen||e.id||e.className).slice(0,3),
                 h: Math.round(s.getBoundingClientRect().height), textLen: (s.innerText||'').trim().length, brokenImgs: broken.slice(0,4), brokenN: broken.length }`)),
    })
  }

  // ---------- 4. the case study ----------
  STEP = 'open case'
  log(STEP)
  const errBeforeCase = errors.length
  await js(`document.getElementById('openCase').click(); 1`); await sleep(4500)
  const caseH = await js(`document.getElementById('caseScroll')?.scrollHeight || 0`)
  for (let y = 0; y < caseH; y += 600) { STEP = `case scroll ${y}/${caseH}`; await js(`document.getElementById('caseScroll').scrollTo(0, ${y}); 1`); await sleep(120) }
  await sleep(1800)
  STEP = 'case bottom'
  report.caseStudy = {
    scrollH: caseH, newErrors: errors.length - errBeforeCase,
    ...(await jj(`
      const sc = document.getElementById('caseScroll')
      const broken = [...document.querySelectorAll('#case img')].filter(i=>i.complete && i.naturalWidth===0).map(i=>i.getAttribute('src'))
      const vids = [...document.querySelectorAll('#case video')].map(v=>({src:(v.currentSrc||v.getAttribute('src')||[...v.querySelectorAll('source')].map(s=>s.getAttribute('src')).join(',')).split('/').pop(), err:v.error?v.error.code:0, rs:v.readyState}))
      const spill = []
      for (const el of document.querySelectorAll('#case *')) if (el.scrollWidth - el.clientWidth > 2 && getComputedStyle(el).overflowX === 'visible') spill.push(String(el.className).slice(0,60) + ' +' + (el.scrollWidth - el.clientWidth))
      return { hOver: Math.max(0, sc.scrollWidth - sc.clientWidth), brokenImgs: broken.slice(0,8), brokenN: broken.length, vids, spill: spill.slice(0,6),
               emptySections: [...document.querySelectorAll('#case .cs-sec')].filter(s=>s.getBoundingClientRect().height < 60).map(s=>s.id||String(s.className).slice(0,40)),
               deadAnchors: [...document.querySelectorAll('#case a[href^="#"]')].map(a=>a.getAttribute('href')).filter(h=>{try{return h!=='#' && !document.querySelector(h)}catch(e){return true}}) }`)),
  }
  await probe('case open')
  STEP = 'close case'
  await js(`(document.querySelector('#case [data-close-case]')||document.querySelector('#case .cs-close'))?.click(); 1`); await sleep(1400)
  report.caseClosed = await jj(`const c=document.getElementById('case'); return { hidden: c.hidden, open: c.classList.contains('is-open'), bodyLock: document.body.className.includes('lock') }`)

  // ---------- 5. brief + help ----------
  STEP = 'open brief'
  log(STEP)
  let before = errors.length
  await js(`document.getElementById('openBrief').click(); 1`); await sleep(1800)
  report.brief = { newErrors: errors.length - before, ...(await jj(`
    const b = document.getElementById('brief')
    const sc = b.querySelector('.brief-scroll') || b.firstElementChild || b
    const broken = [...b.querySelectorAll('img')].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.getAttribute('src'))
    return { hidden: b.hidden, open: b.classList.contains('is-open'), h: Math.round(b.getBoundingClientRect().height), scrollH: sc.scrollHeight, textLen: (b.innerText||'').trim().length, brokenImgs: broken.slice(0,4) }`)) }
  await probe('brief open')
  STEP = 'scroll brief'
  await js(`const b=document.getElementById('brief'); const sc=b.querySelector('.brief-scroll')||b.firstElementChild||b; sc.scrollTo(0, sc.scrollHeight); 1`); await sleep(1000)
  await probe('brief bottom')
  STEP = 'close brief'
  await js(`document.getElementById('openBrief').click(); 1`); await sleep(900)
  report.briefClosed = await js(`document.getElementById('brief').hidden`)

  STEP = 'open help'
  log(STEP)
  before = errors.length
  await js(`document.getElementById('openHelp').click(); 1`); await sleep(1600)
  report.help = { newErrors: errors.length - before, ...(await jj(`
    const h = document.getElementById('help')
    return { hidden: h.hidden, open: h.classList.contains('is-open'), h: Math.round(h.getBoundingClientRect().height), textLen: (h.innerText||'').trim().length }`)) }
  await probe('help open')
  STEP = 'close help'
  await js(`document.getElementById('closeHelp')?.click(); 1`); await sleep(900)
  report.helpClosed = await js(`document.getElementById('help').hidden`)

  // ---------- 6. Customise, every control ----------
  STEP = 'open customise'
  log(STEP)
  await js(`document.getElementById('openCustom').click(); 1`); await sleep(1400)
  report.panel = await jj(`
    const c = document.getElementById('custom')
    return { hidden: c.hidden, open: c.classList.contains('is-open'), buttons: c.querySelectorAll('button').length, ranges: [...c.querySelectorAll('input[type=range]')].map(i=>i.id), rows: c.querySelectorAll('.sec-row').length, accs: [...c.querySelectorAll('details.acc')].map(d=>d.dataset.acc) }`)
  await probe('customise open')

  const CONTROLS = [
    ['typeface orbitron', `document.querySelector('[data-typeface="orbitron"]').click()`],
    ['typeface chakra', `document.querySelector('[data-typeface="chakra"]').click()`],
    ['typeface arena', `document.querySelector('[data-typeface="arena"]').click()`],
    ['appearance light', `document.querySelector('[data-appearance-btn="light"]').click()`],
    ['appearance dark', `document.querySelector('[data-appearance-btn="dark"]').click()`],
    ['logo boxer', `document.querySelector('[data-logo="boxer"]').click()`],
    ['logo glove', `document.querySelector('[data-logo="glove"]').click()`],
    ['logo upright', `document.querySelector('[data-logo="upright"]').click()`],
    ['logo pair', `document.querySelector('[data-logo="pair"]').click()`],
    ['logo bag', `document.querySelector('[data-logo="bag"]').click()`],
    ['logo fist', `document.querySelector('[data-logo="fist"]').click()`],
    ['device android', `document.querySelector('[data-device="android"]').click()`],
    ['device iphone', `document.querySelector('[data-device="iphone"]').click()`],
    ['wallet three credits', `document.getElementById('walletFull').click()`],
    ['wallet no credits', `document.getElementById('walletEmpty').click()`],
    ['phone fit to window', `document.getElementById('phoneFit').click()`],
    ['phone actual size', `document.getElementById('phoneActual').click()`],
    ['replay the flow', `document.getElementById('replayFlow').click()`],
  ]
  report.controls = []
  await js(`window.showcase.mode('mobile'); 1`); await sleep(1200)
  for (const [label, expr] of CONTROLS) {
    STEP = `customise: ${label}`
    const b0 = errors.length
    await js(expr + '; 1'); await sleep(700)
    const o = await probe(STEP)
    report.controls.push({ control: label, newErrors: errors.length - b0, over: o?.page || 0, bad: o?.bad })
  }
  STEP = 'tab machine for glass sizes'
  await js(`window.showcase.mode('machine'); 1`); await sleep(1400)
  for (const [label, expr] of [['glass actual size', `document.getElementById('actualMachine').click()`], ['glass reading size', `document.getElementById('readSize').click()`]]) {
    STEP = `customise: ${label}`
    const b0 = errors.length
    await js(expr + '; 1'); await sleep(900)
    const o = await probe(STEP)
    report.controls.push({ control: label, newErrors: errors.length - b0, over: o?.page || 0, bad: o?.bad })
  }
  report.scoreSlider = []
  await js(`window.showcase.mscreen('result'); 1`); await sleep(900)
  for (const v of [0, 1, 250, 750, 1000]) {
    STEP = `customise: score slider ${v}`
    const b0 = errors.length
    await js(`const r=document.getElementById('c-score'); r.value=${v}; r.dispatchEvent(new Event('input',{bubbles:true})); r.dispatchEvent(new Event('change',{bubbles:true})); 1`); await sleep(600)
    report.scoreSlider.push({ v, newErrors: errors.length - b0, shown: await js(`document.getElementById('o-score')?.textContent`), onGlass: await js(`(document.querySelector('#screen .score-num, #screen [data-slot="score"]')?.innerText||'').trim().slice(0,24)`) })
  }
  // backdrops + decimals + zoom through the public API
  report.api = []
  for (const expr of [`window.showcase.decimals(false)`, `window.showcase.decimals(true)`, `window.showcase.appearance('light')`, `window.showcase.appearance('dark')`, `window.showcase.zoom(1.4)`, `window.showcase.zoom(1)`, `window.showcase.theme('arena')`]) {
    STEP = `api ${expr}`
    const b0 = errors.length
    const v = await js(expr + '; 1')
    await sleep(500)
    report.api.push({ expr, newErrors: errors.length - b0, ok: v !== undefined })
  }
  const backs = await jj(`return [...document.querySelectorAll('[data-backdrop]')].map(b=>b.dataset.backdrop)`)
  report.backdrops = []
  for (const b of (backs || []).slice(0, 12)) {
    STEP = `backdrop ${b}`
    const b0 = errors.length
    await js(`window.showcase.backdrop('${b}'); 1`); await sleep(450)
    report.backdrops.push({ b, newErrors: errors.length - b0 })
  }
  STEP = 'customise: reset everything'
  await js(`document.getElementById('resetCustom').click(); 1`); await sleep(1800)
  report.afterReset = await jj(`return { mode: document.body.dataset.mode, psec: Object.keys(window.PSec.state).length }`)

  // ---------- 7. every section design on every page ----------
  if (DEEP) {
    report.designIndex = {}
    report.designProblems = []
    let count = 0
    const sweep = async (surface, page) => {
      const secs = await jj(`return (window.PSec.sections('${surface}','${page}')||[]).map(s=>({key:s.key,label:s.label,n:s.names.length,names:s.names}))`)
      report.designIndex[`${surface}/${page}`] = (secs || []).map((s) => `${s.key}(${s.n})`)
      for (const s of secs || []) {
        for (let i = 0; i < s.n; i++) {
          STEP = `design ${surface}/${page}/${s.key}[${i}] ${s.names[i]}`
          const b0 = errors.length
          const name = await js(`window.showcase.sec('${surface}','${page}','${s.key}',${i})`)
          await sleep(200); count++
          const o = await jj(OVER)
          if (errors.length > b0 || (o && o.page > 0) || !name) report.designProblems.push({ step: STEP, name, newErrors: errors.length - b0, over: o?.page || 0, bad: o?.bad })
        }
        await js(`window.showcase.sec('${surface}','${page}','${s.key}',0); 1`)
      }
    }
    await js(`window.showcase.mode('machine'); 1`); await sleep(1200)
    for (const k of SCREENS) { log('designs machine/' + k); STEP = `open machine/${k}`; await js(`window.showcase.mscreen('${k}'); 1`); await sleep(700); await sweep('machine', k) }
    await js(`window.showcase.mode('mobile'); 1`); await sleep(1400)
    for (const pg of navPages || []) { log('designs phone/' + pg); STEP = `open phone/${pg}`; await js(`window.punchApp.go('${pg}'); 1`); await sleep(650); await sweep('phone', pg) }
    log('designs global'); await sweep('global', 'all')
    report.designsExercised = count
  }

  // ---------- 8. final state ----------
  STEP = 'final'
  report.final = await jj(`
    const broken = [...document.images].filter(i=>i.complete && i.naturalWidth===0).map(i=>i.getAttribute('src'))
    return { brokenImgs: broken.slice(0,10), brokenN: broken.length, fonts: document.fonts?document.fonts.status:'n/a', mode: document.body.dataset.mode }`)
  report.overflows = overflows
  log('done')
} catch (e) {
  report.harnessError = String(e && e.stack || e).slice(0, 600)
  log('HARNESS ERROR ' + report.harnessError)
}
dump()
try { ws.close() } catch {}
chrome.kill()
process.exit(0)
