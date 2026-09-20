// Round 2: both tabs get a real, loaded glass (bringToFront so headless lays each out),
// Customise open in tab B, and we watch B's SECOND accordion (the machine one, fed by liveMachine()).
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--force-prefers-reduced-motion=no-preference', '--force-color-profile=srgb',
  `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'skf2' + port)}`,
  '--window-size=1600,1000', 'about:blank',
], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
for (let i = 0; i < 120; i++) { try { await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break } catch { await sleep(150) } }

async function newTab(url) {
  const t = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json()
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
  const js = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value
  await send('Runtime.enable'); await send('Page.enable')
  return { id: t.id, ws, send, js, errs, front: async () => { try { await fetch(`http://127.0.0.1:${port}/json/activate/${t.id}`) } catch {} } }
}

const U = 'http://localhost:5770/'
const A = await newTab(U); const B = await newTab(U)
await sleep(4500)
for (const T of [A, B]) { await T.front(); await T.js('try{localStorage.clear()}catch(e){}; 1'); await T.send('Page.navigate', { url: U }); await sleep(3000) }
// lay each tab out in turn so both embedded glasses actually load
for (const T of [A, B]) { await T.front(); await T.js(`window.showcase.mode('animation'); 1`); await sleep(5000) }
// open Customise in B, then leave B in front so B keeps rendering; drive A from script (no focus needed)
await B.front()
await B.js(`document.getElementById('openCustom').click(); 1`); await sleep(1200)

const READ = `JSON.stringify({
  phone: (window.punchApp && window.punchApp.page) || '?',
  src: document.getElementById('linkedFrame').getAttribute('src'),
  glass: (() => { try { return document.getElementById('linkedFrame').contentDocument.getElementById('machine').dataset.mscreen } catch (e) { return 'UNREADABLE' } })(),
  acc1: (document.getElementById('accPageName')||{}).textContent,
  acc2: (document.getElementById('accPage2Name')||{}).textContent,
})`
const row = async (label) => {
  const a = JSON.parse(await A.js(READ)), b = JSON.parse(await B.js(READ))
  console.log(`${label.padEnd(9)} A[phone=${String(a.phone).padEnd(8)} glass=${String(a.glass).padEnd(9)}]  B[phone=${String(b.phone).padEnd(8)} glass=${String(b.glass).padEnd(9)} acc1="${b.acc1}" acc2="${b.acc2}"]`)
  return { a, b }
}
console.log('srcA=' + (await A.js(`document.getElementById('linkedFrame').getAttribute('src')`)) + '  srcB=' + (await B.js(`document.getElementById('linkedFrame').getAttribute('src')`)))
await row('start')
for (const page of ['ranks', 'scan', 'hit', 'feed']) {
  await A.js(`window.punchApp.go('${page}'); 1`)
  await sleep(2600)
  await row(page)
}
console.log('errA=' + JSON.stringify(A.errs.slice(0, 4)) + ' errB=' + JSON.stringify(B.errs.slice(0, 4)))
A.ws.close(); B.ws.close(); chrome.kill()
