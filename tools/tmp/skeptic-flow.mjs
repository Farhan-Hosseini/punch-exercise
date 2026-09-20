// REFUTE/CONFIRM: does a second top-level showcase tab drive this tab's embedded glass via `punch-flow`?
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const port = 9500 + Math.floor(Math.random() * 90)
const profile = join(tmpdir(), 'skflow' + port)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--force-prefers-reduced-motion=no-preference', '--force-color-profile=srgb',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--window-size=1600,1000', 'about:blank',
], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitJson() {
  for (let i = 0; i < 120; i++) {
    try { return await (await fetch(`http://127.0.0.1:${port}/json`)).json() } catch { await sleep(150) }
  }
  throw new Error('no chrome')
}
await waitJson()

async function newTab(url) {
  const t = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json()
  return attach(t)
}
async function attach(t) {
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  let id = 0; const pend = new Map(); const errs = []
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
    else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map((a) => a.value || a.description).join(' '))
  })
  const send = (method, params = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method, params })) })
  const js = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
    if (r.result?.exceptionDetails) return { __err: r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text }
    return r.result?.result?.value
  }
  await send('Runtime.enable'); await send('Page.enable')
  return { ws, send, js, errs }
}

const URL_ = 'http://localhost:5770/'
const A = await newTab(URL_)
const B = await newTab(URL_)
await sleep(5000)
for (const T of [A, B]) { await T.js('try{localStorage.clear()}catch(e){}; 1'); await T.send('Page.navigate', { url: URL_ }) }
await sleep(6000)

// both tabs onto the Animation tab, where the embedded glass exists
for (const T of [A, B]) await T.js(`window.showcase.mode('animation'); 1`)
await sleep(5000)

const READ = `JSON.stringify({
  phone: (window.punchApp && window.punchApp.page) || document.getElementById('app')?.dataset.page || '?',
  hasFrame: !!document.getElementById('linkedFrame')?.getAttribute('src'),
  glass: (() => { try { return document.getElementById('linkedFrame').contentDocument.getElementById('machine').dataset.mscreen } catch (e) { return 'UNREADABLE:' + e.message } })(),
  panel: Array.from(document.querySelectorAll('#accPageName, #accPageKind')).map(e => e.textContent.trim()),
})`
const read = async (T) => JSON.parse(await T.js(READ))
const row = async (label) => {
  const a = await read(A), b = await read(B)
  console.log(`${label.padEnd(10)} A: phone=${String(a.phone).padEnd(9)} glass=${String(a.glass).padEnd(10)} | B: phone=${String(b.phone).padEnd(9)} glass=${String(b.glass).padEnd(10)} | B.panel=${JSON.stringify(b.panel)}`)
  return { a, b }
}
console.log('--- baseline (both tabs idle on Animation) ---')
await row('start')

console.log('--- only tab A is driven (clicking A\'s phone nav) ---')
for (const page of ['ranks', 'scan', 'feed', 'default']) {
  const clicked = await A.js(`(() => { const b = document.querySelector('#app [data-go="${page}"]') || document.querySelector('.pagebar [data-page="${page}"]'); if (b) { b.click(); return 'click:' + b.tagName } ; window.punchApp.go('${page}'); return 'api' })()`)
  await sleep(2500)
  const r = await row(page)
  if (r.b.phone === 'default' && r.b.glass !== 'default') console.log(`   ^^ LEAK: tab B's phone never moved (${r.b.phone}) but its glass is ${r.b.glass}   [${clicked}]`)
}

console.log('--- control: close tab B\'s channel listener? read raw BroadcastChannel reachability ---')
// a direct probe: post a flow message from a THIRD, independent context and see if B's glass follows
const C = await newTab('http://localhost:5770/?embed=machine&probe=1')
await sleep(3000)
await C.js(`new BroadcastChannel('punch-flow').postMessage({ type: 'mscreen', key: 'record', opts: {} }); 1`)
await sleep(2000)
const after = await row('3rd-post')
console.log('post-from-unrelated-tab -> A.glass=' + after.a.glass + ' B.glass=' + after.b.glass)

console.log('errorsA=' + JSON.stringify(A.errs.slice(0, 5)))
console.log('errorsB=' + JSON.stringify(B.errs.slice(0, 5)))
A.ws.close(); B.ws.close(); C.ws.close(); chrome.kill()
