// At which widths does the Animation tab spill past the viewport? (the desktop gate lifts at 768)
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9002 + Math.floor(Math.random() * 4)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'zza' + port)}`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' })
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
await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6500)
const OVER = `
  const de = document.documentElement
  const page = Math.max(0, de.scrollWidth - de.clientWidth)
  const vw = de.clientWidth, bad = []
  for (const el of document.querySelectorAll('body *')) {
    if (!el.getClientRects().length) continue
    const b = el.getBoundingClientRect()
    if (b.width > 0 && b.right > vw + 1) bad.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className||'').split(' ').filter(Boolean).slice(0,2).join('.')) + ' L' + Math.round(b.left) + ' R' + Math.round(b.right))
  }
  return { page, vw, badN: bad.length, bad: bad.slice(0, 5), layout: document.getElementById('phoneStage')?.dataset.animLayout }`
const rows = []
for (const W of [768, 800, 850, 900, 960, 1000, 1024, 1100, 1180, 1200, 1280, 1366, 1440]) {
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: 900, deviceScaleFactor: 1, mobile: false })
  await sleep(600)
  for (const mode of ['mobile', 'machine', 'system', 'animation']) {
    await js(`window.showcase.mode('${mode}'); 1`); await sleep(mode === 'animation' ? 3800 : 1200)
    const o = await jj(OVER)
    rows.push({ W, mode, ...o })
  }
  if (W === 768 || W === 900 || W === 1024) {
    await js(`window.showcase.mode('animation'); scrollTo(0,0); 1`); await sleep(2500)
    const s = await send('Page.captureScreenshot', { format: 'png' })
    if (s.result?.data) writeFileSync(`build/narrow/anim-${W}.png`, Buffer.from(s.result.data, 'base64'))
  }
}
console.log(JSON.stringify(rows.filter((r) => r.page > 0), null, 1))
console.log('--- all rows ---')
for (const r of rows) console.log(r.W, r.mode, 'over=' + r.page, 'layout=' + (r.layout || '-'), 'badN=' + r.badN)
try { ws.close() } catch {}
chrome.kill(); process.exit(0)
