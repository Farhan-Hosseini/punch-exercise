// Screenshot the overflowing part of the Animation tab at 768, and list the spill precisely.
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = Number(process.argv[2] || 768)
const port = 9060 + Math.floor(Math.random() * 6)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'zzsh' + port)}`, '--window-size=1200,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 150 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, pr = {}) => new Promise((r) => { const n = ++id; const to = setTimeout(() => { if (pend.has(n)) { pend.delete(n); r({}) } }, 20000); pend.set(n, (v) => { clearTimeout(to); r(v) }); ws.send(JSON.stringify({ id: n, method: m, params: pr })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
const jj = async (e) => { try { return JSON.parse(await js(`JSON.stringify((()=>{${e}})())`)) } catch { return null } }
mkdirSync('build/narrow', { recursive: true })
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6500)
await js(`window.showcase.mode('animation'); 1`); await sleep(5000)
console.log('doc:', JSON.stringify(await jj(`const de=document.documentElement; return { vw: de.clientWidth, scrollW: de.scrollWidth, over: de.scrollWidth - de.clientWidth, docH: de.scrollHeight }`)))
console.log('container widths:', JSON.stringify(await jj(`
  const out = []
  for (const sel of ['#phoneStage', '.anim-extra', '.anim-piece', '.anim-piece-tall', '.anim-clips', '.anim-fig-tall', '.anim-glass', '.anim-files']) {
    const e = document.querySelector(sel); if (!e) { out.push([sel, 'absent']); continue }
    const b = e.getBoundingClientRect(); const cs = getComputedStyle(e)
    out.push([sel, Math.round(b.left), Math.round(b.right), Math.round(b.width), cs.containerType || '-', cs.gridTemplateColumns])
  }
  return out`), null, 1))
const y = await js(`(()=>{ const e = document.querySelector('.anim-piece-tall'); if (!e) return 0; return Math.max(0, Math.round(e.getBoundingClientRect().top + scrollY - 40)) })()`)
await js(`scrollTo(0, ${y}); 1`); await sleep(1200)
const s = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
if (s.result?.data) writeFileSync(`build/narrow/anim-spill-${W}.png`, Buffer.from(s.result.data, 'base64'))
console.log('shot at y=' + y)
console.log('spill:', JSON.stringify(await jj(`
  const de = document.documentElement, vw = de.clientWidth, bad = []
  for (const el of document.querySelectorAll('body *')) { if (!el.getClientRects().length) continue
    const b = el.getBoundingClientRect()
    if (b.width > 0 && b.right > vw + 1) bad.push([(el.id?'#'+el.id:el.tagName.toLowerCase()+'.'+String(el.className||'').split(' ').filter(Boolean).slice(0,2).join('.')), Math.round(b.left), Math.round(b.right)]) }
  return { vw, n: bad.length, first: bad.slice(0,10) }`), null, 1))
try { ws.close() } catch {}
chrome.kill(); process.exit(0)
