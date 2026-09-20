// Runs the page under a candidate CSP and reports BOTH violations AND a geometry fingerprint,
// so we can tell whether violations actually change what renders.
// usage: node csp-effect.mjs "<csp string or empty>" <outfile>
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeFileSync } from 'node:fs'

const CSP = process.argv[2] || ''
const OUT = process.argv[3] || 'out.json'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb',
  '--force-prefers-reduced-motion=no-preference',
  `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'cspx' + port)}`,
  '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
ws.addEventListener('message', async (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (m.method === 'Fetch.requestPaused') {
    const { requestId, responseHeaders = [], responseStatusCode } = m.params
    try {
      const b = (await send('Fetch.getResponseBody', { requestId })).result
      const hdrs = responseHeaders.filter((h) => !/^content-(length|security-policy)$/i.test(h.name))
      if (CSP) hdrs.push({ name: 'Content-Security-Policy', value: CSP })
      await send('Fetch.fulfillRequest', { requestId, responseCode: responseStatusCode || 200, responseHeaders: hdrs, body: b.base64Encoded ? b.body : Buffer.from(b.body, 'utf8').toString('base64') })
    } catch { await send('Fetch.continueRequest', { requestId }).catch(() => {}) }
  }
})
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value

await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
await send('Page.addScriptToEvaluateOnNewDocument', { source: `
  window.__csp = [];
  document.addEventListener('securitypolicyviolation', (e) => {
    window.__csp.push({ d: e.violatedDirective, s: String(e.sourceFile||'').split('/').pop() + ':' + e.lineNumber })
  }, true);` })
await send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Response', resourceType: 'Document' }] })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('try{localStorage.clear()}catch(e){}; 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6500)

const report = { csp: CSP || '(none)', modes: {} }
// geometry fingerprint helper: round boxes so sub-pixel noise does not create false diffs
const FP = `(function(sel){
  const out = [];
  document.querySelectorAll(sel).forEach((el, i) => {
    if (i > 400) return;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out.push([el.className && String(el.className).slice(0,40), Math.round(r.width), Math.round(r.height), cs.objectPosition, cs.backgroundImage.slice(0,60), cs.transform.slice(0,40)].join('|'));
  });
  return out;
})`

for (const mode of ['mobile', 'machine', 'animation', 'ds']) {
  await js(`try{window.showcase.mode('${mode}')}catch(e){}; 1`); await sleep(2500)
  report.modes[mode] = {
    violations: await js(`(window.__csp||[]).length`),
    fp: await js(`JSON.stringify(${FP}('.ds-swatch, .ds-ph, .ds-ph img, [data-ds-swatches] li, .rank, .rank-row, #machine .scr, .m-page'))`)
  }
}
await js(`try{document.getElementById('openCase').click()}catch(e){}; 1`); await sleep(2500)
report.afterCase = await js(`(window.__csp||[]).length`)
const v = JSON.parse(await js(`JSON.stringify(window.__csp||[])`))
const byD = {}; for (const x of v) byD[x.d] = (byD[x.d]||0)+1
report.total = v.length; report.byDirective = byD
const bySrc = {}; for (const x of v) bySrc[x.s] = (bySrc[x.s]||0)+1
report.topSources = Object.entries(bySrc).sort((a,b)=>b[1]-a[1]).slice(0,8)
report.scriptViol = v.filter(x=>/script/.test(x.d)).map(x=>x.s).slice(0,10)
// did the app actually work?
report.pageOk = await js(`!!(window.showcase && getComputedStyle(document.body).backgroundColor)`)
report.loaderGone = await js(`!!document.getElementById('loader')?.classList.contains('is-done')`)
report.dsSwatchCount = await js(`document.querySelectorAll('.ds-swatch').length`)
report.dsPhotoCount = await js(`document.querySelectorAll('.ds-ph').length`)
writeFileSync(OUT, JSON.stringify(report, null, 1))
console.log('total', report.total, 'byDirective', JSON.stringify(report.byDirective), 'pageOk', report.pageOk, 'loaderGone', report.loaderGone, 'swatches', report.dsSwatchCount, 'photos', report.dsPhotoCount)
ws.close(); chrome.kill()
