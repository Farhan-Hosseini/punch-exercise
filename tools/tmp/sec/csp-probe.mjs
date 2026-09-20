// Applies a candidate CSP to the document response via CDP Fetch interception and reports every violation.
// usage: node csp-probe.mjs "<csp string>"
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CSP = process.argv[2]
const port = 9400 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb',
  '--force-prefers-reduced-motion=no-preference',
  `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'csp' + port)}`,
  '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
const send = (m, p = {}, sess) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p, ...(sess ? { sessionId: sess } : {}) })) })

ws.addEventListener('message', async (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (m.method === 'Log.entryAdded' && /Content Security|Refused/.test(m.params.entry.text||'')) errs.push('LOG ' + m.params.entry.text.slice(0,400))
  else if (m.method === 'Runtime.exceptionThrown') errs.push('EXC ' + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text))
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push('ERR ' + m.params.args.map(a => a.value || a.description).join(' ').slice(0, 220))
  else if (m.method === 'Fetch.requestPaused') {
    const { requestId, responseHeaders = [], responseStatusCode } = m.params
    try {
      const b = (await send('Fetch.getResponseBody', { requestId })).result
      const hdrs = responseHeaders.filter((h) => !/^content-(length|security-policy)$/i.test(h.name))
      if (CSP) hdrs.push({ name: 'Content-Security-Policy', value: CSP })
      await send('Fetch.fulfillRequest', { requestId, responseCode: responseStatusCode || 200, responseHeaders: hdrs, body: b.base64Encoded ? b.body : Buffer.from(b.body, 'utf8').toString('base64') })
    } catch (err) { await send('Fetch.continueRequest', { requestId }).catch(() => {}) }
  }
})
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value

await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
await send('Page.addScriptToEvaluateOnNewDocument', { source: `
  window.__csp = [];
  document.addEventListener('securitypolicyviolation', (e) => {
    window.__csp.push({ d: e.violatedDirective, b: String(e.blockedURI).slice(0,80), s: String(e.sourceFile||'').split('/').pop() + ':' + e.lineNumber, sample: String(e.sample||'').slice(0,60) })
  }, true);` })
await send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Response', resourceType: 'Document' }] })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('try{localStorage.clear()}catch(e){}; 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
const report = { csp: CSP || '(none)' , modes: {} }
for (const mode of ['mobile', 'machine', 'animation', 'ds']) {
  await js(`try{window.showcase.mode('${mode}')}catch(e){}; 1`); await sleep(2200)
  report.modes[mode] = await js(`(window.__csp||[]).length`)
}
await js(`try{document.getElementById('openCase').click()}catch(e){}; 1`); await sleep(2500)
report.afterCase = await js(`(window.__csp||[]).length`)
const v = JSON.parse(await js(`JSON.stringify(window.__csp||[])`))
const byDir = {}
for (const x of v) { const k = x.d + ' | ' + x.b + ' | ' + x.s; byDir[k] = (byDir[k] || 0) + 1 }
report.total = v.length
report.violations = Object.entries(byDir).sort((a,b)=>b[1]-a[1]).slice(0, 14)
const byD = {}; for (const x of v) byD[x.d] = (byD[x.d]||0)+1; report.byDirective = byD
report.scriptViolations = v.filter(x=>/script/.test(x.d)).slice(0,10)
report.pageOk = await js(`!!(window.showcase && document.querySelector('#machine') && getComputedStyle(document.body).backgroundColor)`)
report.loaderGone = await js(`!!document.getElementById('loader')?.classList.contains('is-done')`)
report.errors = errs.slice(0, 10)
console.log(JSON.stringify(report, null, 1))
ws.close(); chrome.kill()
