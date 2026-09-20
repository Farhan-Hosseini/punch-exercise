import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk3' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
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
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4500)
// one fresh glass per delay: the parent writes a NEW value `delay` ms after the iframe src is set.
// if the glass's boot-snapshot write lands afterwards, the parent's change is lost.
const out = []
for (const delay of [300, 350, 400, 450, 500, 600, 800]) {
  const r = await js(`(async () => {
    document.querySelectorAll('iframe.__race').forEach(f => f.remove())
    localStorage.setItem('punch-acc.v2', JSON.stringify({ page: false, page2: true, shared: true }))
    const f = document.createElement('iframe'); f.className = '__race'
    f.style.cssText = 'position:fixed;left:-9999px;top:0;width:420px;height:900px'
    document.body.appendChild(f); f.src = './?embed=machine&follow=0'
    await new Promise(r => setTimeout(r, ${delay}))
    localStorage.setItem('punch-acc.v2', JSON.stringify({ page: true, page2: true, shared: true, READER_CHANGE: ${delay} }))
    await new Promise(r => setTimeout(r, 5000))
    return JSON.stringify({ delay: ${delay}, final: localStorage.getItem('punch-acc.v2') })
  })()`)
  const o = JSON.parse(r); o.clobbered = !o.final.includes('READER_CHANGE')
  out.push(o); console.log(JSON.stringify(o))
}
console.log('clobbered at delays: ' + out.filter(o => o.clobbered).map(o => o.delay).join(',') || 'none')
ws.close(); chrome.kill()
