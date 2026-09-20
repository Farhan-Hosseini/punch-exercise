// Exactly what makes the page scroll sideways on the Animation tab at a given width.
// Only counts elements that spill past the viewport with NO scrollable ancestor between them and <html>.
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = Number(process.argv[2] || 768)
const port = 9070 + Math.floor(Math.random() * 6)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'zzs2' + port)}`, '--window-size=1200,1000', 'about:blank'], { stdio: 'ignore' })
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
const PROBE = `
  const de = document.documentElement, vw = de.clientWidth
  const clipped = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p); if (cs.overflowX !== 'visible' || cs.clipPath !== 'none') return true } return false }
  const bad = []
  for (const el of document.querySelectorAll('body *')) { if (!el.getClientRects().length) continue
    const b = el.getBoundingClientRect()
    if (b.width > 0 && b.right > vw + 1 && !clipped(el)) bad.push([(el.id?'#'+el.id:el.tagName.toLowerCase()+'.'+String(el.className||'').split(' ').filter(Boolean).slice(0,2).join('.')), Math.round(b.left), Math.round(b.right), Math.round(b.top + scrollY)]) }
  return { vw, scrollW: de.scrollWidth, over: de.scrollWidth - de.clientWidth, n: bad.length, worst: bad.sort((a,b)=>b[2]-a[2]).slice(0,8) }`
const out = {}
for (const mode of ['mobile', 'machine', 'system', 'animation']) {
  await js(`window.showcase.mode('${mode}'); 1`); await sleep(mode === 'animation' ? 5000 : 1600)
  out[mode] = await jj(PROBE)
  console.log(mode, JSON.stringify(out[mode], null, 1))
}
// shoot the worst offender in the animation tab
await js(`window.showcase.mode('animation'); 1`); await sleep(3000)
const y = (out.animation && out.animation.worst && out.animation.worst[0]) ? Math.max(0, out.animation.worst[0][3] - 80) : 0
await js(`scrollTo(0, ${y}); 1`); await sleep(1500)
const s = await send('Page.captureScreenshot', { format: 'png' })
if (s.result?.data) writeFileSync(`build/narrow/spill-${W}.png`, Buffer.from(s.result.data, 'base64'))
console.log('shot y=' + y + ' -> build/narrow/spill-' + W + '.png')
try { ws.close() } catch {}
chrome.kill(); process.exit(0)
