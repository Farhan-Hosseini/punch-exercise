import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9780 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'ep' + port)}`, '--window-size=300,612', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).slice(0, 160)) })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 300, height: 612, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/?embed=phone&page=hit' }); await sleep(7000)
console.log(await js(`JSON.stringify((() => {
  const d = document.getElementById('device'); const r = d && d.getBoundingClientRect()
  const wrap = document.querySelector('.device-wrap')
  return { embed: document.documentElement.dataset.embed, mode: document.documentElement.dataset.mode, stageHidden: document.querySelector('.phone-stage') && document.querySelector('.phone-stage').hidden, device: r && { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }, pz: wrap && getComputedStyle(wrap).zoom, page: document.getElementById('mApp') && document.getElementById('mApp').dataset.page, hasPunchApp: typeof window.punchApp, loader: document.getElementById('loader') && document.getElementById('loader').className }
})())`))
console.log(await js(`JSON.stringify((() => { const out = []; let n = document.getElementById('device'); while (n && n !== document.documentElement) { const cs = getComputedStyle(n); out.push({ tag: n.tagName, id: n.id, cls: String(n.className).slice(0, 30), display: cs.display, vis: cs.visibility, hidden: n.hidden, w: Math.round(n.getBoundingClientRect().width) }); n = n.parentElement } return out })())`))
console.log('errors:', JSON.stringify(errs))
const shot = await send('Page.captureScreenshot', { format: 'png' })
await writeFile('build/anim/embed-phone.png', Buffer.from(shot.result.data, 'base64'))
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'ep' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
