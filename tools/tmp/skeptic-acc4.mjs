import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9800 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk4' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
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
// mark the exact moment each document READS the accordion key
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `(() => { const g = Storage.prototype.getItem
    Storage.prototype.getItem = function (k) { if (k === 'punch-acc.v2') window.__accReadAt = Date.now(); return g.apply(this, arguments) } })()`,
})
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4500)
// the reader changes an accordion N ms AFTER the glass has read the key - inside the read-to-write window
for (const gap of [5, 20, 60, 120, 180]) {
  const r = await js(`(async () => {
    document.querySelectorAll('iframe.__race').forEach(f => f.remove())
    localStorage.setItem('punch-acc.v2', JSON.stringify({ page: false, page2: true, shared: true }))
    const f = document.createElement('iframe'); f.className = '__race'
    f.style.cssText = 'position:fixed;left:-9999px;top:0;width:420px;height:900px'
    document.body.appendChild(f); f.src = './?embed=machine&follow=0'
    const t0 = Date.now(); let readAt = 0
    while (Date.now() - t0 < 15000) { try { if (f.contentWindow.__accReadAt) { readAt = f.contentWindow.__accReadAt; break } } catch {} await new Promise(r => setTimeout(r, 5)) }
    await new Promise(r => setTimeout(r, ${gap}))
    const wroteAt = Date.now()
    localStorage.setItem('punch-acc.v2', JSON.stringify({ page: true, page2: true, shared: true, READER_CHANGE: ${gap} }))
    await new Promise(r => setTimeout(r, 6000))
    return JSON.stringify({ gap: ${gap}, readAt: readAt - t0, wroteAt: wroteAt - t0, final: localStorage.getItem('punch-acc.v2') })
  })()`)
  const o = JSON.parse(r); o.clobbered = !o.final.includes('READER_CHANGE')
  console.log(JSON.stringify(o))
}
ws.close(); chrome.kill()
