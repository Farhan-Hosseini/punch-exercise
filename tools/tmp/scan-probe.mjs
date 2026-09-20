// The machine's Scan screen: every State design in every state (the waiting line's break, wrapping and overflow) and
// every How to design's icons (drawn, non-zero, centred), shot in dark and light.
// node tools/tmp/scan-probe.mjs [appearance=dark|light] [shots=1]
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const rest = process.argv.slice(2)
const opt = (k) => (rest.find((r) => r.startsWith(k + '=')) || '').split('=')[1]
const APP = opt('appearance') || 'dark'
const SHOTS = opt('shots') !== '0'
const W = 1440
const port = 9700 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sp' + port)}`, `--window-size=${W},1100`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).split('\n')[0]) })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 1100, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js(`window.showcase.mode('machine'); 1`); await sleep(1800)
await js(`window.showcase.mscreen('scan'); 1`); await sleep(2000)
await js(`window.showcase.appearance('${APP}'); 1`); await sleep(800)

async function shot(sel, out) {
  if (!SHOTS) return
  const b = JSON.parse(await js(`JSON.stringify((() => { const el = document.querySelector('${sel}'); if (!el) return null; el.scrollIntoView({ block: 'start' }); const r = el.getBoundingClientRect(); return { x: Math.max(0, Math.round(r.left) - 8), y: Math.max(0, Math.round(r.top + scrollY) - 8), width: Math.round(r.width) + 16, height: Math.round(r.height) + 16 } })())`) || 'null')
  if (!b) { console.log('not found', sel); return }
  await sleep(300)
  const s = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...b, scale: 1 } })
  if (s.result) await writeFile(out, Buffer.from(s.result.data, 'base64'))
}

const out = []
const ok = (name, pass, detail) => out.push({ name, pass, detail })

/* 1. the State section: five designs, four states --------------------------------------------------------- */
const STATES = { wait: {}, linked: { linked: true }, holding: { linked: true, holding: true }, missed: { linked: true, missed: true } }
const names = JSON.parse(await js(`JSON.stringify(window.showcase.sections('machine', 'scan'))`))
console.log('sections', JSON.stringify(names))
const status = names.find((s) => s.key === 'status')
for (let i = 0; i < status.names.length; i++) {
  await js(`window.showcase.sec('machine', 'scan', 'status', ${i}); 1`); await sleep(400)
  for (const [st, opts] of Object.entries(STATES)) {
    await js(`window.showcase.mscreen('scan', ${JSON.stringify(opts)}); 1`); await sleep(900)
    const r = JSON.parse(await js(`JSON.stringify((() => {
      const sec = document.querySelector('.mscreen-scan .scn-status')
      const design = [...sec.children].find((c) => c.hasAttribute('data-sv') && !c.hidden)
      const el = design.querySelector('[data-scn="line"]')
      const node = el.firstChild
      const rg = document.createRange(); rg.selectNodeContents(el)
      // the preserved newline draws a zero-width box of its own, so only the boxes with ink count
      const rects = [...rg.getClientRects()].filter((r) => r.width > 0).map((r) => ({ t: Math.round(r.top), l: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) }))
      // the lines as text: walk the characters and bucket them by the top of their rect
      const lines = []
      const txt = node.textContent
      for (let c = 0; c < txt.length; c++) {
        const cr = document.createRange(); cr.setStart(node, c); cr.setEnd(node, c + 1)
        const b = cr.getBoundingClientRect(); if (!b.width && !b.height) continue
        const top = Math.round(b.top)
        const last = lines[lines.length - 1]
        if (last && Math.abs(last.top - top) < 4) last.text += txt[c]; else lines.push({ top, text: txt[c] })
      }
      const box = el.getBoundingClientRect(), d = design.getBoundingClientRect(), s = sec.getBoundingClientRect()
      // the dot or icon beside the line sits on its first line
      const mk = el.parentElement.querySelector(':scope > .sst-dot, :scope > .scn-ics')
      const mb = mk ? mk.getBoundingClientRect() : null
      const onFirst = mb ? (mb.top + mb.height / 2 >= rects[0].t && mb.top + mb.height / 2 <= rects[0].t + rects[0].h) : null
      const fit = document.querySelector('.mscreen-scan').getBoundingClientRect().width / 1080
      return { design: design.dataset.sv, state: document.querySelector('.mscreen-scan .scn').dataset.state, text: txt, rects: rects.length, lines: lines.map((l) => l.text.trim()), ws: getComputedStyle(el).whiteSpace, overflowX: Math.round((box.right - s.right) / fit), overflowY: Math.round((d.bottom - s.bottom) / fit), scrollW: el.scrollWidth > el.clientWidth + 1, marker: onFirst }
    })())`))
    const name = `${r.design} / ${st}`
    // the other states wrap as they did before this pass (Player card holding and missed, Beacon missed: two lines) and never worse
    const WAS = { 'Player card / holding': 2, 'Player card / missed': 2, 'Beacon / missed': 2 }
    if (st === 'wait') ok(`${name}: two lines, "Waiting for your" then "phone"`, r.rects === 2 && r.lines.length === 2 && r.lines[0] === 'Waiting for your' && r.lines[1] === 'phone' && r.marker !== false, JSON.stringify(r))
    else ok(`${name}: ${WAS[name] || 1} line(s) as before, inside the gutters`, r.lines.length <= (WAS[name] || 1) && r.overflowX <= 0 && !r.scrollW && r.marker !== false, JSON.stringify(r))
    if (st === 'wait' || st === 'missed') await shot('.mscreen-scan .scn-status', `build/anim/scan/status-${i}-${st}-${APP}.png`)
  }
}
await js(`window.showcase.mscreen('scan', {}); 1`); await sleep(600)

/* 2. the How to section: every design's icons ---------------------------------------------------------------- */
const howto = names.find((s) => s.key === 'howto')
for (let i = 0; i < howto.names.length; i++) {
  await js(`window.showcase.sec('machine', 'scan', 'howto', ${i}); 1`); await sleep(700)
  const r = JSON.parse(await js(`JSON.stringify((() => {
    const sec = document.querySelector('.mscreen-scan .scn-howto')
    const design = [...sec.children].find((c) => c.hasAttribute('data-sv') && !c.hidden)
    const fit = document.querySelector('.mscreen-scan').getBoundingClientRect().width / 1080
    const px = (v) => Math.round(v / fit)
    const mid = (b) => [b.left + b.width / 2, b.top + b.height / 2]
    const icons = [...design.querySelectorAll('[data-lucide]')].map((el) => {
      const svg = el.querySelector('svg')
      const sb = svg ? svg.getBoundingClientRect() : { width: 0, height: 0, left: 0, top: 0 }
      const eb = el.getBoundingClientRect()
      // the disc the icon sits in, when its parent is one (round, square)
      const p = el.parentElement, pb = p.getBoundingClientRect(), cs = getComputedStyle(p)
      const disc = cs.borderRadius.includes('50%') && Math.abs(pb.width - pb.height) < 1
      const [sx, sy] = mid(sb), [ex, ey] = mid(eb), [px2, py2] = mid(pb)
      return { name: el.dataset.lucide, in: p.className.split(' ')[0], drawn: !!svg, w: px(sb.width), h: px(sb.height), inSpan: [px(sx - ex), px(sy - ey)], disc: disc ? { size: px(pb.width), off: [px(sx - px2), px(sy - py2)], display: cs.display } : null, opacity: getComputedStyle(el).opacity }
    })
    return { design: design.dataset.sv, icons }
  })())`))
  for (const ic of r.icons) {
    const inSpan = Math.abs(ic.inSpan[0]) <= 1 && Math.abs(ic.inSpan[1]) <= 1
    const inDisc = !ic.disc || (Math.abs(ic.disc.off[0]) <= 2 && Math.abs(ic.disc.off[1]) <= 2)
    ok(`How to ${r.design}: ${ic.name} in .${ic.in} drawn ${ic.w}x${ic.h}${ic.disc ? `, centred in its ${ic.disc.size} px disc (off ${ic.disc.off})` : ''}`, ic.drawn && ic.w > 0 && ic.h > 0 && inSpan && inDisc, JSON.stringify(ic))
  }
  if (r.design === 'Icons') {
    // the linked state: three steps done (ticks), the last lit
    await js(`window.showcase.mscreen('scan', { linked: true }); 1`); await sleep(900)
    const tk = JSON.parse(await js(`JSON.stringify([...document.querySelectorAll('.mscreen-scan .sho-icons .scn-step')].map((li) => ({ step: li.dataset.step, done: li.classList.contains('is-done'), on: li.classList.contains('is-on'), tick: getComputedStyle(li.querySelector('.tick')).opacity, ic: getComputedStyle(li.querySelector('.ic')).opacity })))`))
    ok('How to Icons, linked: ticks on the done steps only', tk.filter((x) => x.done).every((x) => x.tick === '1' && x.ic === '0') && tk.filter((x) => !x.done).every((x) => x.tick === '0' && x.ic === '1') && tk.filter((x) => x.done).length === 3, JSON.stringify(tk))
    await shot('.mscreen-scan .scn-howto', `build/anim/scan/howto-${i}-linked-${APP}.png`)
    await js(`window.showcase.mscreen('scan', {}); 1`); await sleep(900)
  }
  await shot('.mscreen-scan .scn-howto', `build/anim/scan/howto-${i}-${APP}.png`)
}
ok('no console errors', errs.length === 0, errs.slice(0, 4).join(' | '))

const fails = out.filter((o) => !o.pass)
for (const o of out) console.log(`${o.pass ? 'PASS' : 'FAIL'}  ${o.name}${o.pass ? '' : '\n        ' + o.detail}`)
console.log(`\n${out.length - fails.length}/${out.length} passed (${APP})`)
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'sp' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)
process.exit(fails.length ? 1 : 0)
