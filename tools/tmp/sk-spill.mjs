// Independent skeptic probe: horizontal overflow per tab at a given width + grid track diagnosis.
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = Number(process.argv[2] || 768)
const HIDE = process.argv[3] !== 'scrollbars'   // pass "scrollbars" to NOT hide them
const port = 9500 + Math.floor(Math.random() * 300)
const flags = ['--headless=new', '--disable-gpu', '--no-first-run', '--force-prefers-reduced-motion=no-preference',
  `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk' + port)}`, '--window-size=1400,1000', 'about:blank']
if (HIDE) flags.splice(2, 0, '--hide-scrollbars')
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', flags, { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 150 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).slice(0,160)) })
const send = (m, pr = {}) => new Promise((r) => { const n = ++id; const to = setTimeout(() => { if (pend.has(n)) { pend.delete(n); r({}) } }, 25000); pend.set(n, (v) => { clearTimeout(to); r(v) }); ws.send(JSON.stringify({ id: n, method: m, params: pr })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
const jj = async (e) => { const v = await js(`JSON.stringify((()=>{${e}})())`); try { return JSON.parse(v) } catch { return { RAW: v } } }
mkdirSync('build/narrow', { recursive: true })
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(7000)

const gateState = await jj(`const g=document.querySelector('.deskgate'); const cs=g?getComputedStyle(g):null;
  return { gateExists: !!g, gateDisplay: cs?cs.display:null, gateVisible: !!(g&&g.getClientRects().length), bodyOverflow: getComputedStyle(document.body).overflow, clientW: document.documentElement.clientWidth, innerW: innerWidth }`)
console.log('GATE', JSON.stringify(gateState))

const PROBE = `
  const de = document.documentElement, vw = de.clientWidth
  const clipped = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p); if (cs.overflowX !== 'visible' || cs.clipPath !== 'none') return true } return false }
  const nm = (el) => (el.id ? '#'+el.id : el.tagName.toLowerCase()) + (el.className && typeof el.className === 'string' ? '.'+el.className.trim().split(/\s+/).slice(0,2).join('.') : '')
  const bad = []
  for (const el of document.querySelectorAll('body *')) { if (!el.getClientRects().length) continue
    const b = el.getBoundingClientRect()
    if (b.width > 0 && b.right > vw + 1 && !clipped(el)) bad.push([nm(el), Math.round(b.left), Math.round(b.right), Math.round(b.top + scrollY)]) }
  return { vw, scrollW: de.scrollWidth, over: de.scrollWidth - de.clientWidth, bodyScrollW: document.body.scrollWidth, n: bad.length, worst: bad.sort((a,b)=>b[2]-a[2]).slice(0,6) }`

const out = {}
for (const mode of ['mobile', 'machine', 'system', 'animation']) {
  await js(`window.showcase.mode('${mode}'); 1`); await sleep(mode === 'animation' ? 5500 : 1800)
  out[mode] = await jj(PROBE)
  console.log(mode.toUpperCase(), JSON.stringify(out[mode]))
}

// ---- diagnose the animation grid
await js(`window.showcase.mode('animation'); 1`); await sleep(3000)
const diag = await jj(`
  const st = document.querySelector('.phone-stage'); const cs = getComputedStyle(st)
  const ex = document.querySelector('.anim-extra'); const exb = ex ? ex.getBoundingClientRect() : null
  const dev = document.querySelector('.device'); const devb = dev ? dev.getBoundingClientRect() : null
  const lk = document.querySelector('.linked'); const lkb = lk ? lk.getBoundingClientRect() : null
  const cols = cs.gridTemplateColumns.split(' ').map(Number)
  const gap = parseFloat(cs.columnGap)
  const sum = cols.reduce((a,b)=>a+b,0) + gap*(cols.length-1)
  return {
    layout: st.dataset.animLayout,
    clientW: st.clientWidth, padL: cs.paddingLeft, padR: cs.paddingRight,
    gridTemplateColumns: cs.gridTemplateColumns, columnGap: cs.columnGap,
    tracksPlusGaps: Math.round(sum),
    room: Math.round(st.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)),
    deviceW: devb ? Math.round(devb.width) : null,
    linkedW: lkb ? Math.round(lkb.width) : null,
    jsCheck_needs_one_gap: devb && lkb ? Math.round(devb.width + Math.max(lkb.width,240) + gap) : null,
    jsCheck_needs_three_gaps: devb && lkb ? Math.round(devb.width + Math.max(lkb.width,240) + gap*3) : null,
    animExtra: exb ? { l: Math.round(exb.left), r: Math.round(exb.right), w: Math.round(exb.width) } : null,
    containerQueryWidth: ex ? Math.round(ex.getBoundingClientRect().width) : null,
    masterFigDisplay: (()=>{const f=document.querySelector('.anim-fig-master'); return f?getComputedStyle(f).display:null})(),
    animClipsCols: (()=>{const c=document.querySelector('.anim-clips'); return c?getComputedStyle(c).gridTemplateColumns:null})()
  }`)
console.log('DIAG', JSON.stringify(diag, null, 1))

const y = out.animation?.worst?.[0] ? Math.max(0, out.animation.worst[0][3] - 60) : 0
await js(`scrollTo(0, ${y}); 1`); await sleep(1500)
const s = await send('Page.captureScreenshot', { format: 'png' })
if (s.result?.data) writeFileSync(`build/narrow/sk-spill-${W}${HIDE?'':'-sb'}.png`, Buffer.from(s.result.data, 'base64'))
console.log('errors', JSON.stringify(errs.slice(0,5)))
console.log('shot -> build/narrow/sk-spill-' + W + (HIDE?'':'-sb') + '.png at y=' + y)
try { ws.close() } catch {}
chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'sk' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600); process.exit(0)
