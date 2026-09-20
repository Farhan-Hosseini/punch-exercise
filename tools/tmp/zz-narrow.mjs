// What does the page actually look like at narrow widths? Geometry + a screenshot per width.
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9006 + Math.floor(Math.random() * 5)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'zzn' + port)}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' })
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
const GEO = `
  const box = (sel) => { const e = document.querySelector(sel); if (!e) return 'absent'
    const cs = getComputedStyle(e); const b = e.getBoundingClientRect()
    return { w: Math.round(b.width), h: Math.round(b.height), disp: cs.display, vis: cs.visibility, op: cs.opacity, hidden: e.hasAttribute('hidden'), rects: e.getClientRects().length } }
  const de = document.documentElement
  return { mode: document.body.dataset.mode, vw: de.clientWidth, docH: de.scrollHeight, overflow: Math.max(0, de.scrollWidth - de.clientWidth),
    topbar: box('.topbar'), stage: box('#stage'), phoneStage: box('#phoneStage'), dsStage: box('#dsStage'),
    deviceWrap: box('.device-wrap'), screen: box('#screen'), linked: box('.linked'),
    bodyText: (document.body.innerText||'').trim().slice(0,160).replace(/\\n+/g,' / '),
    visibleTop: [...document.body.children].filter(e=>!e.hidden && e.getClientRects().length).map(e=>(e.id||e.tagName)+':'+Math.round(e.getBoundingClientRect().height)) }`
for (const [W, H] of [[390, 844], [600, 900], [768, 1024], [900, 900], [1024, 768], [1180, 820]]) {
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 768 })
  await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6500)
  await js('localStorage.clear(); 1')
  await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6500)
  const rows = {}
  for (const m of ['mobile', 'machine', 'animation', 'system']) {
    await js(`window.showcase.mode('${m}'); 1`); await sleep(m === 'animation' ? 5000 : 1600)
    rows[m] = await jj(GEO)
  }
  // overlays
  await js(`window.showcase.mode('mobile'); 1`); await sleep(1200)
  await js(`document.getElementById('openBrief').click(); 1`); await sleep(1600)
  rows.brief = await jj(`const b=document.getElementById('brief'); const cs=getComputedStyle(b); const r=b.getBoundingClientRect(); return { w:Math.round(r.width), h:Math.round(r.height), disp:cs.display, hidden:b.hidden, open:b.classList.contains('is-open'), txt:(b.innerText||'').trim().length }`)
  await js(`document.getElementById('openBrief').click(); 1`); await sleep(700)
  await js(`document.getElementById('openHelp').click(); 1`); await sleep(1400)
  rows.help = await jj(`const b=document.getElementById('help'); const cs=getComputedStyle(b); const r=b.getBoundingClientRect(); return { w:Math.round(r.width), h:Math.round(r.height), disp:cs.display, hidden:b.hidden, open:b.classList.contains('is-open'), txt:(b.innerText||'').trim().length }`)
  await js(`document.getElementById('closeHelp')?.click(); 1`); await sleep(700)
  await js(`window.showcase.mode('mobile'); scrollTo(0,0); 1`); await sleep(1200)
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  if (shot.result?.data) writeFileSync(`build/narrow/w${W}.png`, Buffer.from(shot.result.data, 'base64'))
  await js(`window.showcase.mode('animation'); scrollTo(0,0); 1`); await sleep(5000)
  const shot2 = await send('Page.captureScreenshot', { format: 'png' })
  if (shot2.result?.data) writeFileSync(`build/narrow/w${W}-anim.png`, Buffer.from(shot2.result.data, 'base64'))
  console.log(`===== ${W}x${H} =====`)
  console.log(JSON.stringify(rows, null, 1))
}
try { ws.close() } catch {}
chrome.kill(); process.exit(0)
