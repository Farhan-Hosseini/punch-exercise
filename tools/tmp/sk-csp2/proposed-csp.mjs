// Runs the site under the EXACT CSP the reporter proposed, and checks whether the site still works.
// usage: node proposed-csp.mjs "<csp or empty>" <label>
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CSP = process.argv[2] || ''
const LABEL = process.argv[3] || 'run'
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb',
  '--force-prefers-reduced-motion=no-preference',
  `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'skcsp' + port)}`,
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
// CSP is applied to the document AND to the iframe document (./?embed=machine)
await send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Response', resourceType: 'Document' }] })

// --- pass 1: seed a LIGHT appearance into localStorage, so the pre-paint inline script has work to do
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4500)
await js(`try{localStorage.clear();localStorage.setItem('punch-showcase.v5', JSON.stringify({appearance:'light', logo:'glove', decimals:'off'}))}catch(e){}; 1`)

// --- pass 2: reload, so the inline pre-paint script runs against that saved state
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(7000)

const r = { label: LABEL, csp: CSP || '(none)' }
r.inline1_ran_appearance = await js(`document.documentElement.dataset.appearance`)
r.inline2_PunchLoader = await js(`typeof window.PunchLoader`)
r.loaderGone = await js(`!!document.getElementById('loader')?.classList.contains('is-done')`)
r.showcaseApi = await js(`typeof window.showcase`)
r.bodyBg = await js(`getComputedStyle(document.body).backgroundColor`)

// animation tab: the live machine iframe is ./?embed=machine
await js(`try{window.showcase.mode('animation')}catch(e){}; 1`); await sleep(6000)
r.iframeSrc = await js(`(document.querySelector('iframe[src*="embed=machine"]')||{}).src || null`)
r.iframeEmbedDataset = await js(`(function(){var f=document.querySelector('iframe[src*="embed=machine"]');try{return f&&f.contentDocument?String(f.contentDocument.documentElement.dataset.embed):'noaccess'}catch(e){return 'err:'+e.message}})()`)
r.iframeLoaderGone = await js(`(function(){var f=document.querySelector('iframe[src*="embed=machine"]');try{return !!(f&&f.contentDocument&&f.contentDocument.getElementById('loader')&&f.contentDocument.getElementById('loader').classList.contains('is-done'))}catch(e){return 'err'}})()`)

const v = JSON.parse(await js(`JSON.stringify(window.__csp||[])`))
const byD = {}; for (const x of v) byD[x.d] = (byD[x.d] || 0) + 1
r.violations = v.length; r.byDirective = byD
r.sampleSources = [...new Set(v.map((x) => x.s))].slice(0, 8)
console.log(JSON.stringify(r, null, 1))
ws.close(); chrome.kill()
