import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9900 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk5' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
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
// in the glass: tell the parent the instant the key is read, and record the instant it is written back
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `(() => { const P = Storage.prototype, g = P.getItem, s = P.setItem
    P.getItem = function (k) { if (k === 'punch-acc.v2' && window !== top) { window.__accReadAt = Date.now(); try { parent.postMessage({ accRead: 1 }, '*') } catch {} } return g.apply(this, arguments) }
    P.setItem = function (k, v) { if (k === 'punch-acc.v2' && window !== top) { window.__accWriteAt = Date.now(); window.__accWrote = String(v) } return s.apply(this, arguments) } })()`,
})
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4500)
for (let run = 1; run <= 3; run++) {
  const r = await js(`(async () => {
    document.querySelectorAll('iframe.__race').forEach(f => f.remove())
    localStorage.setItem('punch-acc.v2', JSON.stringify({ page: false, page2: true, shared: true }))
    const t0 = Date.now(); let firedAt = 0
    const onMsg = (e) => { if (e.data && e.data.accRead && !firedAt) { firedAt = Date.now(); localStorage.setItem('punch-acc.v2', JSON.stringify({ page: true, page2: true, shared: true, READER_CHANGE: 1 })) } }
    addEventListener('message', onMsg)
    const f = document.createElement('iframe'); f.className = '__race'
    f.style.cssText = 'position:fixed;left:-9999px;top:0;width:420px;height:900px'
    document.body.appendChild(f); f.src = './?embed=machine&follow=0'
    await new Promise(r => setTimeout(r, 8000))
    removeEventListener('message', onMsg)
    let w = null; try { w = { readAt: f.contentWindow.__accReadAt - t0, writeAt: (f.contentWindow.__accWriteAt || 0) && f.contentWindow.__accWriteAt - t0, wrote: f.contentWindow.__accWrote || null } } catch {}
    return JSON.stringify({ parentWroteAt: firedAt - t0, glass: w, final: localStorage.getItem('punch-acc.v2') })
  })()`)
  const o = JSON.parse(r); o.clobbered = !o.final.includes('READER_CHANGE')
  console.log('run' + run + ' ' + JSON.stringify(o))
}
ws.close(); chrome.kill()
