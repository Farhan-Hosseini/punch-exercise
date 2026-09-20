// Focused follow-up: the phone app's 14 pages, the reel comment form (a real submit with an XSS
// payload), and every psec section row on both surfaces — under the candidate CSP.
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CSP = process.argv[2] || ''
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb',
  '--force-prefers-reduced-motion=no-preference',
  `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'cspm' + port)}`,
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
  if (m.method === 'Log.entryAdded') { const x = m.params.entry; if (/Content Security|Refused/i.test(x.text || '') || x.level === 'error') errs.push('LOG ' + (x.text || '').slice(0, 260)) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push('EXC ' + (m.params.exceptionDetails?.exception?.description || '').slice(0, 260))
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push('ERR ' + m.params.args.map((a) => a.value || a.description).join(' ').slice(0, 220))
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
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value

await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
await send('Page.addScriptToEvaluateOnNewDocument', { source: `
  try { if (window === window.top) { window.__csp = []; window.__xss = 0 } } catch (e) {}
  window.alert = function () { try { window.top.__xss = (window.top.__xss|0) + 1 } catch (e) {} };
  document.addEventListener('securitypolicyviolation', (e) => {
    try { (window.top.__csp = window.top.__csp || []).push({ d: e.violatedDirective, b: String(e.blockedURI).slice(0,90), s: String(e.sourceFile||'').split('/').pop()+':'+e.lineNumber, sample: String(e.sample||'').slice(0,70), frame: (window===window.top?'top':'iframe'), at: (window.__phase||'?') }) } catch (err) {}
  }, true);` })
await send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Response', resourceType: 'Document' }] })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('try{localStorage.clear()}catch(e){};1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6500)

const out = { csp: CSP ? CSP.slice(0, 60) + '...' : '(none)' }
const count = () => js('(window.__csp||[]).length')
const phase = (p) => js(`window.__phase=${JSON.stringify(p)};1`)

await phase('mobile'); await js(`window.showcase.mode('mobile');1`); await sleep(2200)
out.pagebarFound = await js(`document.querySelectorAll('.pagebar [data-page]').length`)
const pages = JSON.parse(await js(`JSON.stringify([...document.querySelectorAll('.pagebar [data-page]')].map(b=>b.dataset.page))`) || '[]')
out.pages = pages
out.perPage = []
for (const p of pages) {
  await phase('page:' + p)
  await js(`(()=>{const b=document.querySelector('.pagebar [data-page="${p}"]'); if(b)b.click(); return 1})()`)
  await sleep(1300)
  await js(`(()=>{const s=document.querySelector('#mobile .m-scroll,#mobile [data-scroll],.m-app'); if(s)s.scrollTop=s.scrollHeight; return 1})()`)
  await sleep(500)
  out.perPage.push({ page: p, shown: await js(`document.querySelector('.m-app')?.dataset.page`), csp: await count() })
}

// the comment sheet on the reel page, with a real payload typed and a real submit
await phase('reel'); await js(`(()=>{const b=document.querySelector('.pagebar [data-page="reel"]'); if(b)b.click();return 1})()`); await sleep(2000)
out.commentBtn = await js(`document.querySelectorAll('[data-ract="comment"]').length`)
await js(`(()=>{const b=document.querySelector('.m-reel-slide:not([hidden]) [data-ract="comment"]')||document.querySelector('[data-ract="comment"]'); if(b)b.click(); return 1})()`); await sleep(1600)
out.sheetOpen = await js(`!document.getElementById('mReelComments')?.hasAttribute('hidden')`)
await phase('comment-submit')
out.submitted = await js(`(()=>{
  const i=document.getElementById('mReelComInput'), f=document.getElementById('mReelComForm');
  if(!i||!f) return 'no form';
  const nat=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
  nat.call(i, '<img src=x onerror=alert(1)><svg onload=alert(1)>');
  i.dispatchEvent(new Event('input',{bubbles:true}));
  const btn=document.querySelector('#mReelComForm button[type=submit]');
  if(btn) btn.click(); else f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  return 'ok';
})()`)
await sleep(2000)
out.listHtml = await js(`(document.getElementById('mReelComList')?.innerHTML||'').slice(0,320)`)
out.xssFired = await js(`window.__xss|0`)
out.imgTagsInList = await js(`document.querySelectorAll('#mReelComList img').length`)
out.cspAfterComment = await count()

// psec rows on both surfaces, every page the engine knows
await phase('psec')
const all = []
for (const surface of ['machine', 'phone']) {
  for (const page of ['result', 'attract', 'scan', 'countdown', 'loading', 'score', 'record', 'stats', 'default', 'feed', 'ranks', 'connect', 'connected', 'hit', 'punch', 'profile', 'reel', 'saved']) {
    const s = JSON.parse(await js(`JSON.stringify((window.showcase.sections?window.showcase.sections('${surface}','${page}'):[]).map(x=>({k:x.key,n:(x.names||[]).length})))`) || '[]')
    for (const row of s) all.push({ surface, page, key: row.k, n: row.n })
  }
}
out.psecRows = all.length
out.psecDesigns = all.reduce((a, b) => a + b.n, 0)
for (const r of all) for (let i = 0; i < r.n; i++) { await js(`try{window.showcase.sec('${r.surface}','${r.page}','${r.key}',${i})}catch(e){};1`); await sleep(120) }
await sleep(1500)

out.total = await count()
const v = JSON.parse(await js(`JSON.stringify(window.__csp||[])`) || '[]')
const byD = {}; for (const x of v) byD[x.d] = (byD[x.d] || 0) + 1
out.byDirective = byD
out.sample = v.slice(0, 12)
out.pageOk = await js(`!!(window.showcase && document.querySelector('#machine'))`)
out.loaderGone = await js(`!!document.getElementById('loader')?.classList.contains('is-done')`)
out.jsErrors = errs.filter((e) => !/Content Security|Refused to/.test(e)).slice(0, 10)
out.cspLines = errs.filter((e) => /Content Security|Refused to/.test(e)).length
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill()
