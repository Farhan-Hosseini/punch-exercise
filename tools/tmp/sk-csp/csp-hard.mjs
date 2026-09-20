// Skeptic probe: apply a candidate CSP to EVERY document (top + the ?embed=machine iframe) and then
// exercise far more of the app than the original probe did: all 14 mobile pages, the reel comment
// form (an actual submit), all machine screens, every overlay, the Customise panel with real design
// switches, light/dark, logo and backdrop.
// usage: node csp-hard.mjs "<csp string or empty>"
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CSP = process.argv[2] || ''
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb',
  '--force-prefers-reduced-motion=no-preference',
  `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'cspx' + port)}`,
  '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })

ws.addEventListener('message', async (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (m.method === 'Log.entryAdded') { const x = m.params.entry; if (/Content Security|Refused|error/i.test(x.text || '') || x.level === 'error') errs.push('LOG ' + (x.text || '').slice(0, 300)) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push('EXC ' + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '').slice(0, 300))
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push('ERR ' + m.params.args.map((a) => a.value || a.description).join(' ').slice(0, 250))
  else if (m.method === 'Fetch.requestPaused') {
    const { requestId, responseHeaders = [], responseStatusCode } = m.params
    try {
      const b = (await send('Fetch.getResponseBody', { requestId })).result
      const hdrs = responseHeaders.filter((h) => !/^content-(length|security-policy)$/i.test(h.name))
      if (CSP) hdrs.push({ name: 'Content-Security-Policy', value: CSP })
      await send('Fetch.fulfillRequest', { requestId, responseCode: responseStatusCode || 200, responseHeaders: hdrs, body: b.base64Encoded ? b.body : Buffer.from(b.body, 'utf8').toString('base64') })
    } catch { await send('Fetch.continueRequest', { requestId }).catch(() => {}) }
  }
})
const js = async (e) => {
  const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) return '__EX__ ' + (r.result.exceptionDetails.exception?.description || '').slice(0, 160)
  return r.result?.result?.value
}

await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
// the listener runs in EVERY frame; the iframe reports up to the top document, which is same-origin
await send('Page.addScriptToEvaluateOnNewDocument', { source: `
  try { if (window === window.top) window.__csp = [] } catch (e) {}
  document.addEventListener('securitypolicyviolation', (e) => {
    const rec = { d: e.violatedDirective, b: String(e.blockedURI).slice(0, 90),
      s: String(e.sourceFile || '').split('/').pop() + ':' + e.lineNumber,
      sample: String(e.sample || '').slice(0, 70), frame: (window === window.top ? 'top' : 'iframe'), at: (window.__phase || '?') }
    try { (window.top.__csp = window.top.__csp || []).push(rec) } catch (err) {}
  }, true);` })
await send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Response', resourceType: 'Document' }] })

await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('try{localStorage.clear();sessionStorage.clear()}catch(e){}; 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6500)

const phase = (p) => js(`window.__phase=${JSON.stringify(p)};1`)
const mark = async (label) => ({ label, n: await js('(window.__csp||[]).length') })
const trail = []
const step = async (label, expr, wait = 900) => {
  await phase(label)
  const r = await js(expr)
  await sleep(wait)
  trail.push({ label, count: await js('(window.__csp||[]).length'), ret: typeof r === 'string' && r.startsWith('__EX__') ? r : undefined })
}

const report = { csp: CSP || '(none)' }
report.afterLoad = (await mark('load')).n

// ---- 1. mobile: walk every page button there is
await step('mode:mobile', `window.showcase.mode('mobile');1`, 1800)
const pages = await js(`JSON.stringify([...new Set([...document.querySelectorAll('#mobile [data-page]')].map(b=>b.dataset.page))])`)
report.mobilePages = JSON.parse(pages || '[]')
for (const p of report.mobilePages) {
  await step('page:' + p, `(()=>{const b=document.querySelector('#mobile [data-page="${p}"]'); if(b){b.click(); return 1} return 0})()`, 1200)
}

// ---- 2. the reel comment form: open the sheet, type, and actually submit it (form-action 'none' is in the policy)
await step('page:reel', `(()=>{const b=document.querySelector('#mobile [data-page="reel"]'); if(b)b.click(); return 1})()`, 1600)
await step('open comments', `(()=>{const b=document.querySelector('[data-ract="comment"]'); if(b){b.click(); return 1} return 'no comment button'})()`, 1400)
await step('type + submit comment', `(()=>{
  const i=document.getElementById('mReelComInput'); const f=document.getElementById('mReelComForm');
  if(!i||!f) return 'no form';
  i.value='skeptic <img src=x onerror=alert(1)> test';
  i.dispatchEvent(new Event('input',{bubbles:true}));
  f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  const b=document.querySelector('#mReelComForm button[type=submit]'); if(b)b.click();
  return document.getElementById('mReelComList')?.innerHTML.slice(0,300) || 'no list';
})()`, 1600)
report.commentHtml = trail[trail.length - 1] && await js(`document.getElementById('mReelComList')?.innerHTML.slice(0,400)||''`)

// ---- 3. machine: every screen
await step('mode:machine', `window.showcase.mode('machine');1`, 1800)
const screens = await js(`JSON.stringify([...new Set([...document.querySelectorAll('[data-mscreen]')].map(b=>b.dataset.mscreen))])`)
report.mscreens = JSON.parse(screens || '[]')
for (const s of report.mscreens) await step('mscreen:' + s, `try{window.showcase.mscreen('${s}')}catch(e){};1`, 900)

// ---- 4. animation (loads ./?embed=machine in an iframe) and ds
await step('mode:animation', `window.showcase.mode('animation');1`, 5000)
report.iframeLoaded = await js(`(()=>{const f=document.querySelector('iframe'); try{return !!(f&&f.contentDocument&&f.contentDocument.querySelector('#machine'))}catch(e){return 'x-origin'}})()`)
await step('mode:ds', `window.showcase.mode('ds');1`, 2500)

// ---- 5. overlays
await step('open case', `(()=>{const b=document.getElementById('openCase'); if(b){b.click();return 1} return 0})()`, 3000)
await step('scroll case', `(()=>{const c=document.getElementById('case'); if(c){c.scrollTop=c.scrollHeight/2} return 1})()`, 1200)
await step('close case', `(()=>{document.querySelectorAll('#case [data-close],#case .c-x').forEach(b=>b.click()); if(location.hash)location.hash=''; return 1})()`, 1000)
await step('open brief', `try{window.showcase.brief(true)}catch(e){};1`, 1800)
await step('close brief', `try{window.showcase.brief(false)}catch(e){};1`, 800)
await step('open help', `(()=>{const b=document.getElementById('openHelp'); if(b){b.click();return 1} return 0})()`, 1500)
await step('close help', `(()=>{document.querySelectorAll('#help [data-close]').forEach(b=>b.click());return 1})()`, 800)

// ---- 6. Customise: open the panel and actually switch designs on every row it offers
await step('open custom', `(()=>{const p=document.getElementById('custom'); const b=document.querySelector('[aria-controls="custom"],#customToggle,[data-custom-toggle]'); if(b){b.click();return 'clicked'} if(p){p.hidden=false;return 'forced'} return 0})()`, 1200)
await step('mode:machine again', `window.showcase.mode('machine');1`, 1500)
const secs = await js(`JSON.stringify((window.showcase.sections?window.showcase.sections('machine','result'):[]).map(s=>({k:s.key,n:(s.names||[]).length})))`)
report.sections = JSON.parse(secs || '[]')
for (const s of report.sections) {
  for (let i = 0; i < Math.min(s.n, 6); i++) await step(`sec ${s.k}#${i}`, `try{window.showcase.sec('machine','result','${s.k}',${i})}catch(e){};1`, 450)
}
const slots = await js(`JSON.stringify((window.showcase.slots?window.showcase.slots():[]).map(s=>({k:s.key,n:(s.designs||[]).length})))`)
report.slots = JSON.parse(slots || '[]')
for (const s of report.slots) for (let i = 0; i < Math.min(s.n, 5); i++) await step(`slot ${s.k}#${i}`, `try{window.showcase.set('${s.k}',${i})}catch(e){};1`, 400)

// ---- 7. appearance, logo, backdrop, decimals
await step('light', `try{window.showcase.appearance('light')}catch(e){};1`, 1400)
await step('dark', `try{window.showcase.appearance('dark')}catch(e){};1`, 1200)
await step('decimals off', `try{window.showcase.decimals(false)}catch(e){};1`, 700)
await step('logo', `try{window.showcase.logo('fist-circle')}catch(e){};1`, 700)
await step('backdrop', `(()=>{const b=[...document.querySelectorAll('[data-backdrop]')].map(x=>x.dataset.backdrop); for(const k of b){try{window.showcase.backdrop(k)}catch(e){}} return b.length})()`, 1200)
await step('mobile again', `window.showcase.mode('mobile');1`, 1500)

// ---- results
const v = JSON.parse(await js(`JSON.stringify(window.__csp||[])`) || '[]')
report.total = v.length
const byD = {}; for (const x of v) byD[x.d] = (byD[x.d] || 0) + 1
report.byDirective = byD
const byKey = {}
for (const x of v) { const k = `${x.d} | ${x.b} | ${x.s} | ${x.frame} | @${x.at}` ; byKey[k] = (byKey[k] || 0) + 1 }
report.violations = Object.entries(byKey).sort((a, b) => b[1] - a[1]).slice(0, 20)
report.pageOk = await js(`!!(window.showcase && document.querySelector('#machine') && getComputedStyle(document.body).backgroundColor)`)
report.loaderGone = await js(`!!document.getElementById('loader')?.classList.contains('is-done')`)
report.bodyBg = await js(`getComputedStyle(document.body).backgroundColor`)
report.rootAppearance = await js(`document.documentElement.dataset.appearance`)
report.jsErrors = errs.filter((e) => !/Content Security|Refused to/.test(e)).slice(0, 8)
report.cspLogLines = errs.filter((e) => /Content Security|Refused to/.test(e)).slice(0, 8)
report.trailTail = trail.slice(-6)
report.stepsWithNewViolations = trail.filter((x, i) => x.count > (i ? trail[i - 1].count : report.afterLoad)).map((x) => x.label + ':' + x.count)
console.log(JSON.stringify(report, null, 1))
ws.close(); chrome.kill()
