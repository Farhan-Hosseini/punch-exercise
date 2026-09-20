import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = 1440
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk' + port)}`, `--window-size=${W},1000`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); sessionStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

// 1. is the button there, visible, and is the brief hidden at rest?
const before = JSON.parse(await js(`JSON.stringify((()=>{
  const b = document.getElementById('openBrief'); const br = document.getElementById('brief')
  const rb = b && b.getBoundingClientRect()
  return { btn: !!b, btnText: b && b.innerText.trim(), btnVisible: !!(rb && rb.width>0 && rb.height>0 && getComputedStyle(b).visibility!=='hidden' && getComputedStyle(b).display!=='none'), btnRect: rb && {x:Math.round(rb.x),y:Math.round(rb.y),w:Math.round(rb.width),h:Math.round(rb.height)}, briefHiddenAttr: br && br.hasAttribute('hidden'), briefInDom: !!br, briefTextLen: br ? br.innerText.length : 0 }
})())`))

// 2. click it like a visitor: real CDP mouse events at the button centre
const r = before.btnRect
for (const type of ['mousePressed','mouseReleased']) {
  await send('Input.dispatchMouseEvent', { type, x: r.x + r.w/2, y: r.y + r.h/2, button: 'left', clickCount: 1 })
}
await sleep(1200)
const after = JSON.parse(await js(`JSON.stringify((()=>{
  const br = document.getElementById('brief')
  const cs = getComputedStyle(br)
  const rr = br.getBoundingClientRect()
  const txt = br.innerText
  return { open: br.classList.contains('is-open'), hidden: br.hasAttribute('hidden'), opacity: cs.opacity, visibility: cs.visibility, rect:{w:Math.round(rr.width),h:Math.round(rr.height)}, chars: txt.length, first: txt.slice(0,220), hasTimeline: /send it back within 6 days/.test(txt), hasEval: /What we.{0,3}re evaluating/.test(txt), hasFrom: /Given by Robotenc/.test(txt), hasConfidential: /confidential|do not share|NDA/i.test(txt) }
})())`))
const shot = await send('Page.captureScreenshot', { format: 'png' })
await writeFile('C:/Claude Database/punch-exercise/tools/tmp/skeptic-brief.png', Buffer.from(shot.result.data,'base64'))
console.log(JSON.stringify({ before, after, errors: errs.slice(0,6) }, null, 1))
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'sk' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
