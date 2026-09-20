import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'skw' + port)}`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0
const pend = new Map()
const errs = []
const reqs = new Map()   // requestId -> url
const seen = new Map()   // url -> {status, enc}
const failed = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map((a) => a.value || a.description).join(' '))
  else if (m.method === 'Network.requestWillBeSent') reqs.set(m.params.requestId, m.params.request.url)
  else if (m.method === 'Network.responseReceived') {
    const u = m.params.response.url
    const prev = seen.get(u) || { status: m.params.response.status, enc: 0, n: 0 }
    prev.status = m.params.response.status
    seen.set(u, prev)
  }
  else if (m.method === 'Network.loadingFinished') {
    const u = reqs.get(m.params.requestId); if (!u) return
    const prev = seen.get(u) || { status: 0, enc: 0, n: 0 }
    prev.enc = Math.max(prev.enc, m.params.encodedDataLength || 0)
    prev.n = (prev.n || 0) + 1
    seen.set(u, prev)
  }
  else if (m.method === 'Network.loadingFailed') { const u = reqs.get(m.params.requestId); if (u) failed.push([u, m.params.errorText]) }
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) errs.push('EVAL: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text)); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Network.setCacheDisabled', { cacheDisabled: true })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('try{localStorage.clear()}catch(e){}; 1')
seen.clear(); reqs.clear(); failed.length = 0
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

const pages = await js('JSON.stringify((window.showcase && window.showcase.pages && window.showcase.pages()) || null)')
console.log('pages() ->', String(pages).slice(0, 300))

for (const theme of ['dark', 'light']) {
  try { await js(`document.documentElement.setAttribute('data-theme','${theme}'); 1`) } catch {}
  for (const mode of ['mobile', 'machine', 'animation', 'ds']) {
    await js(`window.showcase.mode('${mode}'); 1`); await sleep(1400)
    // step through every page/screen of the surface
    for (let k = 0; k < 16; k++) {
      await js(`(function(){var b=document.querySelector('[data-pagenav="next"],[data-nav-next],.pn-next'); if(b) b.click(); return 1})()`)
      await sleep(320)
    }
    // exercise every design of every section
    await js(`(function(){var n=0; document.querySelectorAll('[data-sv],[data-sec-pick],.psec-dot,[data-psec-go]').forEach(function(b){ try{ b.click(); n++ }catch(e){} }); return n})()`)
    await sleep(1200)
    await js('scrollTo(0, document.body.scrollHeight); 1'); await sleep(900)
    await js('scrollTo(0, 0); 1'); await sleep(400)
  }
}
// overlays
for (const sel of ['#openCase', '[data-open="brief"]', '[data-open="help"]', '[data-open="custom"]']) {
  await js(`(function(){var b=document.querySelector('${sel}'); if(b){b.click(); return 1} return 0})()`); await sleep(2500)
  await js('scrollTo(0, document.body.scrollHeight); 1'); await sleep(800)
  await js(`(function(){var o=document.querySelector('.is-open [data-close],[data-close]'); if(o) o.click(); return 1})()`); await sleep(600)
}
// force every video to load
await js(`(function(){document.querySelectorAll('video').forEach(function(v){ try{ v.preload='auto'; v.load() }catch(e){} }); return document.querySelectorAll('video').length})()`)
await sleep(9000)

const rows = [...seen.entries()].map(([u, v]) => ({ u, ...v }))
const local = rows.filter((r) => r.u.startsWith('http://localhost:5770/'))
const bytes = local.reduce((s, r) => s + r.enc, 0)
const bad = rows.filter((r) => r.status >= 400)
writeFileSync('C:/Claude Database/punch-exercise/tools/tmp/skeptic-weight/urls.json', JSON.stringify(local.map((r) => [new URL(r.u).pathname, r.status, r.enc]), null, 0))
console.log(JSON.stringify({
  distinctUrls: rows.length, localUrls: local.length, transferredBytes: bytes,
  http4xx5xx: bad.map((b) => [b.u, b.status]).slice(0, 20),
  loadingFailed: failed.slice(0, 20),
  consoleErrors: [...new Set(errs)].slice(0, 12),
}, null, 1))
ws.close(); chrome.kill()
