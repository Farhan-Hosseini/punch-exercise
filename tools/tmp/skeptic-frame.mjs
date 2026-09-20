// Frame the real deployed page from a DIFFERENT origin and find out what an attacker
// actually gains: does it render? can they read anything? does anything leave the page?
import http from 'node:http'
import { spawn } from 'node:child_process'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const exfil = []

// the "attacker" origin: 127.0.0.1:9933 is cross-origin from localhost:5770
const srv = http.createServer((req, res) => {
  if (req.url.startsWith('/steal')) { exfil.push(req.url); res.end('ok'); return }
  res.writeHead(200, { 'content-type': 'text/html' })
  res.end(`<!doctype html><title>Totally Real PunchApp Payments</title>
  <body style="margin:0">
  <iframe id="f" src="http://localhost:5770/#pay" style="width:1200px;height:900px;border:0"></iframe>
  <script>
    const f = document.getElementById('f')
    window.results = { loaded:null, sameOriginRead:null, cardValueRead:null, docTitle:null }
    f.addEventListener('load', () => { window.results.loaded = true })
    window.probe = () => {
      try { window.results.docTitle = f.contentDocument.title; window.results.sameOriginRead = 'ALLOWED' }
      catch (e) { window.results.sameOriginRead = 'BLOCKED: ' + e.name }
      try { window.results.cardValueRead = f.contentDocument.getElementById('payCardNo').value }
      catch (e) { window.results.cardValueRead = 'BLOCKED: ' + e.name }
      return window.results
    }
  </script>`)
})
await new Promise(r => srv.listen(9933, '127.0.0.1', r))

const port = 9944
const chrome = spawn(CHROME, ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run',
  '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`,
  '--user-data-dir=' + process.env.TEMP + '/skeptic-chrome-frame', 'about:blank'], { stdio: 'ignore' })

const wait = ms => new Promise(r => setTimeout(r, ms))
let wsUrl
for (let i = 0; i < 40; i++) {
  try { const j = await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json())
        const t = j.find(t=>t.type==='page'); if (t) { wsUrl = t.webSocketDebuggerUrl; break } } catch {}
  await wait(250)
}
const ws = new WebSocket(wsUrl)
await new Promise(r => ws.addEventListener('open', r))
let id = 0; const pending = new Map()
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } })
const send = (method, params={}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({id:i,method,params})) })

await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
await send('Page.navigate', { url: 'http://127.0.0.1:9933/' })
await wait(7000)

const r = await send('Runtime.evaluate', { expression: 'window.probe()', returnByValue: true, awaitPromise: false })
console.log('=== attacker page probing the framed victim ===')
console.log(JSON.stringify(r.result?.result?.value, null, 2))

// did the frame render at all, or did the desktop gate / anything block it?
const r2 = await send('Runtime.evaluate', { expression: `
  (() => { const f=document.getElementById('f'); const b=f.getBoundingClientRect(); return {frameBox:[b.width,b.height]} })()
`, returnByValue: true })
console.log('frame box:', JSON.stringify(r2.result?.result?.value))
console.log('exfil hits:', JSON.stringify(exfil))

ws.close(); chrome.kill(); srv.close(); process.exit(0)
