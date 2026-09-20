/* Clean baseline: four tabs + every phone page + the case overlay, watching for console errors and for any
   event-handler attribute or javascript: URL that the page produced from its own data. */
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`,
  `--user-data-dir=${join(tmpdir(), 'xk' + port)}`, '--window-size=1440,1000', 'about:blank',
], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description).slice(0, 180))
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map((a) => a.value || a.description).join(' ').slice(0, 180))
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; const to = setTimeout(() => { pend.delete(n); r({ __timeout: m }) }, 15000); pend.set(n, (v) => { clearTimeout(to); r(v) }); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.__timeout) return 'TIMEOUT'; if (r.result?.exceptionDetails) return 'THROW: ' + String(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text).slice(0, 200); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

const SWEEP = `(() => {
  const roots = [document]
  for (const f of document.querySelectorAll('iframe')) { try { if (f.contentDocument) roots.push(f.contentDocument) } catch {} }
  const handlers = [], jsUrls = [], dataUrls = []
  for (const d of roots) for (const el of d.querySelectorAll('*')) {
    for (const a of el.attributes) {
      if (/^on/i.test(a.name)) handlers.push(el.tagName + '[' + a.name + '=' + a.value.slice(0, 60) + ']')
      if ((a.name === 'href' || a.name === 'src' || a.name === 'poster' || a.name === 'action') && /^\\s*javascript:/i.test(a.value)) jsUrls.push(el.tagName + ' ' + a.value.slice(0, 60))
      if ((a.name === 'href' || a.name === 'src') && /^\\s*data:text\\/html/i.test(a.value)) dataUrls.push(el.tagName + ' ' + a.value.slice(0, 60))
    }
  }
  return JSON.stringify({ roots: roots.length, handlers: handlers.slice(0, 8), handlerCount: handlers.length, jsUrls, dataUrls })
})()`

const out = { modes: {} }
for (const mode of ['mobile', 'machine', 'animation', 'ds']) {
  await js(`window.showcase.mode('${mode}'); 1`); await sleep(2800)
  if (mode === 'ds') { await js(`(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)) } scrollTo(0,0) })()`); await sleep(5000) }
  out.modes[mode] = await (async()=>{const v=await js(SWEEP); try { return JSON.parse(v) } catch { return v } })()
}
await js(`window.showcase.mode('mobile'); 1`); await sleep(1000)
const pages = JSON.parse(await js(`JSON.stringify([...document.querySelectorAll('.pagebar [data-page]')].map(b => b.dataset.page))`) || '[]')
for (const p of pages) { await js(`try { window.punchApp.go(${JSON.stringify(p)}) } catch(e) {}; 1`); await sleep(600) }
out.afterPages = await (async()=>{const v=await js(SWEEP); try { return JSON.parse(v) } catch { return v } })()
// the case overlay
await js(`(() => { const b = document.getElementById('openCase'); if (b) b.click() })(); 1`); await sleep(2500)
await js(`(async () => { const c = document.getElementById('case'); const s = c.querySelector('.case-scroll') || c; for (let y = 0; y < s.scrollHeight; y += 900) { s.scrollTop = y; await new Promise(r => setTimeout(r, 70)) } })()`); await sleep(3000)
out.afterCase = await (async()=>{const v=await js(SWEEP); try { return JSON.parse(v) } catch { return v } })()
out.errors = errs.slice(0, 15)
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'xk' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600); process.exit(0)
