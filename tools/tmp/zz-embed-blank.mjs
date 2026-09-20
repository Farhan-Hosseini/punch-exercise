// (a) the embedded machine as its own page (?embed=machine), every screen
// (b) every section design measured for "renders nothing"
// (c) a reload after customising, to prove restored state does not throw
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const W = Number(process.argv[2] || 1440), H = Number(process.argv[3] || 900)
const OUT = process.argv[4] || null
const port = 9300 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference',
  '--disk-cache-size=1', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'zzb' + port)}`, `--window-size=${W},${H}`, 'about:blank',
], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => process.stderr.write(a.join(' ') + '\n')
let t
for (let i = 0; i < 150 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
if (!t) { log('no target'); process.exit(2) }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
let STEP = 'boot'
const errors = [], warnings = [], netFail = [], reqs = new Map()
const add = (a, m) => a.push({ step: STEP, msg: String(m).split('\n').slice(0, 2).join(' | ').slice(0, 300) })
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data), p = m.params
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (m.method === 'Runtime.exceptionThrown') add(errors, 'UNCAUGHT ' + (p.exceptionDetails?.exception?.description || p.exceptionDetails?.text))
  else if (m.method === 'Runtime.consoleAPICalled') {
    const txt = p.args.map((a) => (a.value !== undefined ? a.value : a.description || a.type)).join(' ')
    if (p.type === 'error') add(errors, 'console.error ' + txt); else if (p.type === 'warning') add(warnings, 'console.warn ' + txt)
  } else if (m.method === 'Log.entryAdded') {
    if (p.entry.level === 'error') add(errors, `log(${p.entry.source}) ${p.entry.text} ${p.entry.url || ''}`)
    else if (p.entry.level === 'warning') add(warnings, `log(${p.entry.source}) ${p.entry.text} ${p.entry.url || ''}`)
  } else if (m.method === 'Network.requestWillBeSent') reqs.set(p.requestId, p.request.url)
  else if (m.method === 'Network.responseReceived') { if (p.response.status >= 400) add(netFail, `HTTP ${p.response.status} ${p.response.url}`) }
  else if (m.method === 'Network.loadingFailed') { if (!/ERR_ABORTED/.test(p.errorText || '')) add(netFail, `FAILED ${p.errorText} ${reqs.get(p.requestId) || '?'}`) }
})
const send = (m, pr = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: pr })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) { add(errors, 'EVAL-THREW ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text)); return undefined } return r.result?.result?.value }
const jj = async (e) => { const v = await js(`JSON.stringify((()=>{${e}})())`); try { return JSON.parse(v) } catch { return null } }

const report = { viewport: { W, H } }
try {
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable'); await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })

  // ---- (a) the embedded machine on its own ----
  STEP = 'embed load'
  log('embed load')
  await send('Page.navigate', { url: 'http://localhost:5770/?embed=machine' }); await sleep(5500)
  report.embedBoot = await jj(`return { mode: document.body.dataset.mode, embedAttr: document.documentElement.dataset.embed, loaderDone: document.getElementById('loader')?.classList.contains('is-done'), screenH: Math.round((document.getElementById('screen')||{getBoundingClientRect:()=>({height:0})}).getBoundingClientRect().height), chromeHidden: !!document.querySelector('.topbar')?.hidden }`)
  report.embedScreens = []
  for (const k of ['default', 'attract', 'scan', 'countdown', 'loading', 'result', 'score', 'record']) {
    STEP = `embed screen ${k}`
    const b0 = errors.length
    await js(`window.showcase.mscreen('${k}'); 1`); await sleep(800)
    report.embedScreens.push({ screen: k, newErrors: errors.length - b0, ...(await jj(`const s=document.getElementById('screen'); return { body: document.body.dataset.mscreen, h: Math.round(s.getBoundingClientRect().height), textLen:(s.innerText||'').trim().length }`)) })
  }
  report.embedErrors = errors.slice()
  report.embedNet = netFail.slice()
  errors.length = 0; warnings.length = 0; netFail.length = 0

  // ---- (b) every design, measured for emptiness ----
  STEP = 'main load'
  log('main load')
  await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3000)
  await js('localStorage.clear(); 1')
  await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
  await js(`window.__m = function (surface, page, sec) {
    const s = (window.PSec.sections(surface, page) || []).find(x => x.key === sec)
    if (!s) return { gone: true }
    const el = s.els[0]
    const shown = [...el.children].filter(c => c.hasAttribute('data-sv') && !c.hidden)
    const node = shown[0] || el
    const b = node.getBoundingClientRect()
    return { h: Math.round(b.height), w: Math.round(b.width), text: (node.innerText||'').trim().length,
             media: node.querySelectorAll('img,svg,canvas,video').length, vis: !!node.getClientRects().length,
             drawn: el.hasAttribute('data-sv-names') }
  }; 1`)
  const blanks = [], index = {}
  let n = 0
  const sweep = async (surface, page) => {
    const secs = await jj(`return (window.PSec.sections('${surface}','${page}')||[]).map(s=>({key:s.key,n:s.names.length,names:s.names}))`)
    index[`${surface}/${page}`] = (secs || []).map((s) => `${s.key}(${s.n})`)
    for (const s of secs || []) {
      for (let i = 0; i < s.n; i++) {
        STEP = `blank ${surface}/${page}/${s.key}[${i}] ${s.names[i]}`
        const name = await js(`window.showcase.sec('${surface}','${page}','${s.key}',${i})`)
        await sleep(190); n++
        const m = await jj(`return window.__m('${surface}','${page}','${s.key}')`)
        if (!m || m.gone || !m.vis || m.h < 6 || (m.text === 0 && m.media === 0)) blanks.push({ where: `${surface}/${page}/${s.key}[${i}]`, name: name || s.names[i], ...m })
      }
      await js(`window.showcase.sec('${surface}','${page}','${s.key}',0); 1`)
    }
  }
  await js(`window.showcase.mode('machine'); 1`); await sleep(1400)
  for (const k of ['default', 'attract', 'scan', 'countdown', 'loading', 'result', 'score', 'record']) {
    log('blank machine/' + k); STEP = `open machine/${k}`
    await js(`window.showcase.mscreen('${k}'); 1`); await sleep(800); await sweep('machine', k)
  }
  await js(`window.showcase.mode('mobile'); 1`); await sleep(1600)
  const pages = await jj(`return [...document.querySelectorAll('.pagenav[data-pagenav="page"] [data-page]')].map(b=>b.dataset.page)`)
  for (const pg of pages || []) {
    log('blank phone/' + pg); STEP = `open phone/${pg}`
    await js(`window.punchApp.go('${pg}'); 1`); await sleep(750); await sweep('phone', pg)
  }
  log('blank global'); await sweep('global', 'all')
  report.designsMeasured = n
  report.designIndex = index
  report.blanks = blanks

  // ---- (c) reload with a customised, persisted state ----
  STEP = 'customise then reload'
  log('reload test')
  await js(`window.showcase.mode('machine'); window.showcase.mscreen('score'); window.showcase.appearance('light'); window.showcase.theme('orbitron'); window.showcase.logo('bag'); window.PSec.set('machine','score',(window.PSec.sections('machine','score')[0]||{}).key,2); 1`)
  await sleep(1200)
  const before = await jj(`return { mode: document.body.dataset.mode, mscreen: document.body.dataset.mscreen, psec: window.PSec.state }`)
  errors.length = 0; netFail.length = 0
  await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6500)
  STEP = 'after reload'
  const after = await jj(`return { mode: document.body.dataset.mode, mscreen: document.body.dataset.mscreen, psec: window.PSec.state, loaderDone: document.getElementById('loader')?.classList.contains('is-done') }`)
  report.reload = { before, after, errorsOnReload: errors.slice(), netOnReload: netFail.slice() }
  log('done')
} catch (e) { report.harnessError = String(e?.stack || e).slice(0, 600); log('HARNESS ' + report.harnessError) }
report.errors = errors; report.warnings = warnings; report.netFail = netFail
const text = JSON.stringify(report, null, 1)
if (OUT) { try { writeFileSync(OUT, text) } catch (e) { log('write failed ' + e.message) } }
process.stdout.write(text.slice(0, 200000) + '\n')
try { ws.close() } catch {}
chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'zzb' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600); process.exit(0)
