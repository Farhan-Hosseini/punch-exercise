import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk2' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
// a shared ledger on the origin: every document appends its writes to a key nobody else touches
const HOOK = `(() => {
  const P = Storage.prototype, si = P.setItem
  P.setItem = function (k, v) {
    if (k !== '__LEDGER') { try { const L = JSON.parse(si.call && localStorage.__LEDGER || '[]'); L.push({ doc: location.search || 'TOP', k, v: String(v).slice(0,120), t: Date.now(), st: (new Error().stack.split('\\n')[2]||'').trim() }); si.call(localStorage, '__LEDGER', JSON.stringify(L)) } catch {} }
    return si.apply(this, arguments)
  }
})()`
await send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK })
const ledger = async () => JSON.parse(await js(`localStorage.__LEDGER || '[]'`))

// ---- E: the real parent page, animation tab then DS tab (lazy glasses)
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3000)
await js(`localStorage.clear(); localStorage.setItem('punch-acc.v2','{"page":false,"page2":true,"shared":true}'); localStorage.setItem('__LEDGER','[]'); 1`)
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)
await js(`window.showcase.mode('animation'); 1`); await sleep(5000)
console.log('E1 after animation tab (iframe boots):')
console.log(JSON.stringify(await ledger(), null, 1))
await js(`window.showcase.mode('ds'); 1`); await sleep(2500)
await js(`window.scrollTo(0, document.body.scrollHeight); 1`); await sleep(4000)
await js(`window.scrollTo(0, document.body.scrollHeight/2); 1`); await sleep(3000)
const frames = await js(`JSON.stringify([...document.querySelectorAll('iframe')].map(f=>f.getAttribute('src')).filter(Boolean))`)
console.log('E2 ds tab, iframes: ' + frames)
console.log(JSON.stringify(await ledger(), null, 1))
console.log('final punch-acc.v2 = ' + await js(`localStorage.getItem('punch-acc.v2')`))

// ---- F: deliberate race. parent changes the value while a fresh embed is booting
await js(`localStorage.setItem('__LEDGER','[]'); localStorage.setItem('punch-acc.v2','{"page":false,"page2":true,"shared":true}'); 1`)
const race = await js(`(async () => {
  const f = document.createElement('iframe'); f.style.cssText='position:fixed;left:-9999px;width:400px;height:800px'
  document.body.appendChild(f); f.src = './?embed=machine&follow=0'
  const marks = []
  for (const d of [120, 200, 280, 360]) { await new Promise(r=>setTimeout(r, d===120?120:80)); localStorage.setItem('punch-acc.v2', JSON.stringify({page:true,page2:true,shared:true,PARENT_AT:d})); marks.push(d) }
  await new Promise(r=>setTimeout(r, 4000))
  return JSON.stringify({ marks, final: localStorage.getItem('punch-acc.v2') })
})()`)
console.log('F race: ' + race)
console.log(JSON.stringify(await ledger(), null, 1))
ws.close(); chrome.kill()
