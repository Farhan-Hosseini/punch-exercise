// the Animation tab's motion deliverable: how wide the section runs, how big the machine clip ends up, and whether
// anything spills out of the shell
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const W = Number(process.argv[2] || 1440)
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'pa' + port)}`, `--window-size=${W},1000`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0
const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (method, params = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method, params })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)
await js("window.showcase.mode('animation'); 1"); await sleep(3000)

console.log(await js(`JSON.stringify((() => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), l: Math.round(b.left), t: Math.round(b.top + scrollY) } }
  const sec = document.getElementById('animExtra')
  const piece = document.querySelector('.anim-piece-tall')
  const fig = document.querySelector('.anim-fig-tall')
  const glass = document.querySelector('.anim-fig-tall .anim-glass')
  const text = document.querySelector('.anim-tall-text')
  const vids = [...document.querySelectorAll('#animExtra video')].map(v => ({ src: v.getAttribute('src').split('/').pop(), ...r(v) }))
  const pres = document.querySelectorAll('.anim-fig-pres').length
  const de = document.documentElement
  return {
    viewport: innerWidth,
    section: r(sec), piece: r(piece), figure: r(fig), glass: r(glass), text: r(text),
    glassScale: glass ? +(glass.getBoundingClientRect().width / 1080).toFixed(3) : null,
    videos: vids, presFiguresLeft: pres,
    headWidth: r(document.querySelector('#animExtra .anim-extra-head')),
    pageOverflow: Math.max(0, de.scrollWidth - de.clientWidth)
  }
})())`, null, 1))

await js(`document.getElementById('animExtra').scrollIntoView({block:'start'}); 1`); await sleep(600)
let shot = await send('Page.captureScreenshot', { format: 'png' })
await writeFile(process.argv[3] || 'build/anim-top.png', Buffer.from(shot.result.data, 'base64'))
// the whole section, full-page
const box = await js(`JSON.stringify((() => { const b = document.getElementById('animExtra').getBoundingClientRect(); return { x: 0, y: Math.round(b.top + scrollY), w: innerWidth, h: Math.round(b.height) } })())`)
const b = JSON.parse(box)
shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: b.x, y: b.y, width: b.w, height: Math.min(b.h, 16000), scale: 0.3 } })
await writeFile((process.argv[3] || 'build/anim-top.png').replace('.png', '-whole.png'), Buffer.from(shot.result.data, 'base64'))
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'pa' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
