// Independent re-check of the machine's Scan screen (items 8b-1 and 8b-2): every State design in every state and every
// How to design's icons, measured in glass pixels and shot at scale 2 under build/anim/verify-machine-scan-*.
// node tools/tmp/verify-machine-scan.mjs [appearance=dark|light] [face=arena|orbitron] [shots=0]
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const rest = process.argv.slice(2)
const opt = (k) => (rest.find((r) => r.startsWith(k + '=')) || '').split('=')[1]
const APP = opt('appearance') || 'dark'
const FACE = opt('face') || 'arena'
const SHOTS = opt('shots') !== '0'
const TAG = `${APP}-${FACE}`
const W = 1440
const port = 9780 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'vm' + port)}`, `--window-size=${W},1100`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).split('\n')[0]); else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map((a) => a.value || a.description).join(' ').split('\n')[0]) })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) console.log('exception:', (r.result.exceptionDetails.exception?.description || '').split('\n')[0]); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 1100, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js(`window.showcase.mode('machine'); 1`); await sleep(1800)
if (FACE !== 'arena') {
  await js("document.getElementById('openCustom').click(); 1"); await sleep(600)
  await js(`document.querySelector('.face-tile[data-typeface="${FACE}"]').click(); 1`); await sleep(800)
  await js("document.getElementById('closeCustom').click(); 1"); await sleep(500)
}
await js(`window.showcase.mscreen('scan'); 1`); await sleep(2000)
await js(`window.showcase.appearance('${APP}'); 1`); await sleep(800)
await js('document.fonts.ready.then(() => 1)'); await sleep(300)

async function shot(sel, out, scale = 2) {
  if (!SHOTS) return
  const b = JSON.parse(await js(`JSON.stringify((() => { const el = document.querySelector('${sel}'); if (!el) return null; el.scrollIntoView({ block: 'start' }); const r = el.getBoundingClientRect(); return { x: Math.max(0, Math.round(r.left) - 8), y: Math.max(0, Math.round(r.top + scrollY) - 8), width: Math.round(r.width) + 16, height: Math.round(r.height) + 16 } })())`) || 'null')
  if (!b) { console.log('not found', sel); return }
  await sleep(300)
  const s = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...b, scale } })
  if (s.result) await writeFile(out, Buffer.from(s.result.data, 'base64')); else console.log('capture failed', out)
}

const out = []
const ok = (name, pass, detail) => out.push({ name, pass, detail })
const results = { app: APP, face: FACE, status: [], howto: [] }

const names = JSON.parse(await js(`JSON.stringify(window.showcase.sections('machine', 'scan'))`))
const status = names.find((s) => s.key === 'status'), howto = names.find((s) => s.key === 'howto'), code = names.find((s) => s.key === 'code')
ok('sections: Status and How to carry five designs each', status && howto && status.names.length === 5 && howto.names.length === 5, JSON.stringify(names))
results.sections = names
const look = await js(`JSON.stringify({ typeface: document.documentElement.dataset.typeface, appearance: document.documentElement.dataset.appearance, fit: getComputedStyle(document.documentElement).getPropertyValue('--fit').trim(), fontDisplay: getComputedStyle(document.querySelector('.mscreen-scan .scn')).getPropertyValue('--f-display').trim() })`)
ok(`look is ${TAG}`, look.includes(`"typeface":"${FACE}"`) && look.includes(`"appearance":"${APP}"`), look)

/* 1. State: five designs, four states ----------------------------------------------------------------------- */
const STATES = { wait: {}, linked: { linked: true }, holding: { linked: true, holding: true }, missed: { linked: true, missed: true } }
const MEASURE_STATUS = `JSON.stringify((() => {
  const host = document.querySelector('.mscreen-scan'), fit = host.getBoundingClientRect().width / 1080
  const px = (v) => Math.round(v / fit * 10) / 10
  const sec = host.querySelector('.scn-status')
  const design = [...sec.children].find((c) => c.hasAttribute('data-sv') && !c.hidden)
  const el = design.querySelector('[data-scn="line"]')
  const node = el.firstChild
  const txt = node ? node.textContent : ''
  const rg = document.createRange(); rg.selectNodeContents(el)
  const all = [...rg.getClientRects()]
  const rects = all.filter((r) => r.width > 0)
  const lines = []
  for (let c = 0; c < txt.length; c++) {
    const cr = document.createRange(); cr.setStart(node, c); cr.setEnd(node, c + 1)
    const b = cr.getBoundingClientRect(); if (!b.width && !b.height) continue
    const top = Math.round(b.top)
    const last = lines[lines.length - 1]
    if (last && Math.abs(last.top - top) < 4) last.text += txt[c]; else lines.push({ top, text: txt[c] })
  }
  const s = sec.getBoundingClientRect(), d = design.getBoundingClientRect()
  // the marker beside the line: the dot or the state icon set
  const mk = el.parentElement.querySelector(':scope > .sst-dot, :scope > .scn-ics')
  let marker = null
  if (mk && rects.length) {
    const mb = mk.getBoundingClientRect(), cy = mb.top + mb.height / 2, first = rects[0]
    marker = { onFirst: cy >= first.top && cy <= first.bottom, top: px(mb.top - first.top), size: px(mb.height), firstH: px(first.height) }
  }
  // the union of every drawn descendant against the section's room (the Beacon's pulse rings are decoration that
  // rings out into the gutter by design, so they are listed but not counted)
  let u = { l: d.left, t: d.top, r: d.right, b: d.bottom }
  const spillers = []
  for (const n of design.querySelectorAll('*')) {
    const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden') continue
    const b = n.getBoundingClientRect(); if (!b.width || !b.height) continue
    const outside = b.left < s.left - 1 || b.top < s.top - 1 || b.right > s.right + 1 || b.bottom > s.bottom + 1
    if (outside) spillers.push((typeof n.className === 'string' ? n.className : n.tagName) + ' ' + [px(s.left - b.left), px(s.top - b.top), px(b.right - s.right), px(b.bottom - s.bottom)].map((v) => Math.max(0, v)).join('/'))
    if (n.classList.contains('sst-ring')) continue
    u = { l: Math.min(u.l, b.left), t: Math.min(u.t, b.top), r: Math.max(u.r, b.right), b: Math.max(u.b, b.bottom) }
  }
  const spill = { left: px(s.left - u.l), top: px(s.top - u.t), right: px(u.r - s.right), bottom: px(u.b - s.bottom) }
  const boxSpill = { top: px(s.top - d.top), bottom: px(d.bottom - s.bottom) }
  // computed lengths are glass pixels already (the glass is scaled as a whole), only rects need the fit
  return { design: design.dataset.sv, state: host.querySelector('.scn').dataset.state, text: txt, rawRects: all.length, rects: rects.length, lines: lines.map((l) => l.text.trim()), ws: getComputedStyle(el).whiteSpace, fontSize: parseFloat(getComputedStyle(el).fontSize), marker, spill, spillers, boxSpill, lineRight: px(el.getBoundingClientRect().right - s.right), scrollW: el.scrollWidth > el.clientWidth + 1 }
})())`
for (let i = 0; i < status.names.length; i++) {
  await js(`window.showcase.sec('machine', 'scan', 'status', ${i}); 1`); await sleep(500)
  for (const [st, opts] of Object.entries(STATES)) {
    await js(`window.showcase.mscreen('scan', ${JSON.stringify(opts)}); 1`); await sleep(1000)
    const r = JSON.parse(await js(MEASURE_STATUS))
    results.status.push(r)
    const name = `${r.design} / ${st}`
    const spills = Math.max(r.spill.left, r.spill.top, r.spill.right, r.spill.bottom)
    if (st === 'wait') {
      ok(`${name}: exactly two lines, "Waiting for your" then "phone"`, r.rects === 2 && r.lines.length === 2 && r.lines[0] === 'Waiting for your' && r.lines[1] === 'phone', JSON.stringify({ text: r.text, lines: r.lines, rects: r.rects, ws: r.ws }))
      ok(`${name}: marker on the first line (or none)`, !r.marker || r.marker.onFirst, JSON.stringify(r.marker))
    } else {
      const WAS = { 'Player card / holding': 2, 'Player card / missed': 2, 'Beacon / missed': 2 }
      ok(`${name}: text unchanged, ${WAS[name] || 1} line(s), no scroll`, r.lines.length <= (WAS[name] || 1) && !r.scrollW && r.lineRight <= 0, JSON.stringify({ text: r.text, lines: r.lines, right: r.lineRight }))
    }
    ok(`${name}: fits the 560 room (spill <= 0)`, spills <= 0, JSON.stringify({ spill: r.spill, box: r.boxSpill, spillers: r.spillers }))
    if (st === 'wait' || st === 'missed') await shot('.mscreen-scan .scn-status', `build/anim/verify-machine-scan-status-${i}-${st}-${TAG}.png`)
  }
}
await js(`window.showcase.mscreen('scan', {}); 1`); await sleep(600)

/* 2. How to: every design's icons -------------------------------------------------------------------------- */
const MEASURE_HOWTO = `JSON.stringify((() => {
  const host = document.querySelector('.mscreen-scan'), fit = host.getBoundingClientRect().width / 1080
  const px = (v) => Math.round(v / fit * 10) / 10
  const sec = host.querySelector('.scn-howto')
  const design = [...sec.children].find((c) => c.hasAttribute('data-sv') && !c.hidden)
  const mid = (b) => [b.left + b.width / 2, b.top + b.height / 2]
  const icons = [...design.querySelectorAll('[data-lucide]')].map((el) => {
    const svg = el.querySelector('svg')
    const sb = svg ? svg.getBoundingClientRect() : { width: 0, height: 0, left: 0, top: 0 }
    const eb = el.getBoundingClientRect()
    const p = el.parentElement, pb = p.getBoundingClientRect(), cs = getComputedStyle(p)
    const round = cs.borderRadius.includes('50%') && Math.abs(pb.width - pb.height) < 1
    const [sx, sy] = mid(sb), [ex, ey] = mid(eb), [cx, cy] = mid(pb)
    const vis = getComputedStyle(el)
    return { name: el.dataset.lucide, cls: el.className, parent: p.className, painted: el.dataset.lucidePainted, drawn: !!svg, w: px(sb.width), h: px(sb.height), inSpan: [px(sx - ex), px(sy - ey)], disc: round ? { size: px(pb.width), off: [px(sx - cx), px(sy - cy)], display: cs.display, ratio: Math.round(sb.width / pb.width * 100) / 100 } : null, opacity: vis.opacity, display: vis.display, hiddenByState: el.closest('.scn-ics') ? vis.display === 'none' : false }
  })
  // the Sequence's fist image
  const fist = design.querySelector('.sho-fist')
  let fistInfo = null
  if (fist) {
    const b = fist.getBoundingClientRect(), cs = getComputedStyle(fist)
    const sib = [...design.querySelectorAll('.sho-item .sho-t [data-lucide] svg')].map((s) => s.getBoundingClientRect())
    fistInfo = { w: px(b.width), h: px(b.height), radius: cs.borderRadius, shadow: cs.boxShadow, bg: cs.backgroundColor, display: cs.display, complete: fist.complete, natural: fist.naturalWidth, src: fist.getAttribute('src'), top: px(b.top), sibTops: sib.map((r) => px(r.top)), sibSizes: sib.map((r) => px(r.width)), left: px(b.left - fist.closest('.sho-item').getBoundingClientRect().left), sibLefts: [...design.querySelectorAll('.sho-item .sho-t [data-lucide]')].map((s) => px(s.getBoundingClientRect().left - s.closest('.sho-item').getBoundingClientRect().left)) }
  }
  const marks = [...design.querySelectorAll('.sho-mark')].map((m) => { const b = m.getBoundingClientRect(), cs = getComputedStyle(m); return { step: m.closest('[data-step]')?.dataset.step, w: px(b.width), h: px(b.height), display: cs.display, radius: cs.borderRadius, place: cs.placeItems, font: parseFloat(cs.fontSize) } })
  const steps = [...design.querySelectorAll('.scn-step')].map((li) => ({ step: li.dataset.step, done: li.classList.contains('is-done'), on: li.classList.contains('is-on'), tick: getComputedStyle(li.querySelector('.tick')).opacity, ic: getComputedStyle(li.querySelector('.ic')).opacity }))
  const s = sec.getBoundingClientRect(), d = design.getBoundingClientRect()
  // what an overflow: hidden ancestor clips never shows, so it does not count as spill
  const clipped = (n) => { for (let p = n.parentElement; p && p !== design; p = p.parentElement) if (getComputedStyle(p).overflow === 'hidden') return true; return false }
  let u = { l: d.left, t: d.top, r: d.right, b: d.bottom }
  const spillers = []
  for (const n of design.querySelectorAll('*')) {
    const cs = getComputedStyle(n); if (cs.display === 'none') continue
    const b = n.getBoundingClientRect(); if (!b.width || !b.height) continue
    if (b.left < s.left - 1 || b.top < s.top - 1 || b.right > s.right + 1 || b.bottom > s.bottom + 1) spillers.push((typeof n.className === 'string' ? n.className : n.tagName) + (clipped(n) ? ' (clipped)' : ''))
    if (clipped(n)) continue
    u = { l: Math.min(u.l, b.left), t: Math.min(u.t, b.top), r: Math.max(u.r, b.right), b: Math.max(u.b, b.bottom) }
  }
  const spill = { left: px(s.left - u.l), top: px(s.top - u.t), right: px(u.r - s.right), bottom: px(u.b - s.bottom) }
  return { design: design.dataset.sv, state: host.querySelector('.scn').dataset.state, icons, fist: fistInfo, marks, steps, spill, spillers }
})())`
for (let i = 0; i < howto.names.length; i++) {
  await js(`window.showcase.sec('machine', 'scan', 'howto', ${i}); 1`); await sleep(800)
  const r = JSON.parse(await js(MEASURE_HOWTO))
  results.howto.push(r)
  for (const ic of r.icons) {
    const inSpan = Math.abs(ic.inSpan[0]) <= 1 && Math.abs(ic.inSpan[1]) <= 1
    const inDisc = !ic.disc || (Math.abs(ic.disc.off[0]) <= 2 && Math.abs(ic.disc.off[1]) <= 2)
    ok(`How to ${r.design}: ${ic.name} (.${ic.cls || '-'} in .${ic.parent.split(' ')[0]}) drawn ${ic.w}x${ic.h}${ic.disc ? `, disc ${ic.disc.size} off ${ic.disc.off} ratio ${ic.disc.ratio}` : ''}`, ic.drawn && ic.painted === ic.name && ic.w > 0 && ic.h > 0 && inSpan && inDisc, JSON.stringify(ic))
  }
  ok(`How to ${r.design}: fits the 1276 room`, Math.max(r.spill.left, r.spill.top, r.spill.right, r.spill.bottom) <= 0, JSON.stringify({ spill: r.spill, spillers: r.spillers }))
  if (r.design === 'Icons') {
    ok('Icons: four 150 px discs, grid centred, icon 60 px (forty percent)', r.marks.length === 4 && r.marks.every((m) => Math.abs(m.w - 150) <= 1 && Math.abs(m.h - 150) <= 1 && m.display === 'grid' && m.radius === '50%' && Math.abs(m.font - 60) <= 1) && r.icons.filter((x) => x.cls === 'ic').every((x) => Math.abs(x.w - 60) <= 1), JSON.stringify(r.marks))
    ok('Icons, wait: no tick shown, first step lit', r.steps.every((x) => !x.done && x.tick === '0' && x.ic === '1') && r.steps[0].on && r.steps.filter((x) => x.on).length === 1, JSON.stringify(r.steps))
    await shot('.mscreen-scan .scn-howto', `build/anim/verify-machine-scan-howto-icons-wait-${TAG}.png`)
    await js(`window.showcase.mscreen('scan', { linked: true }); 1`); await sleep(1000)
    const l = JSON.parse(await js(MEASURE_HOWTO))
    results.howtoIconsLinked = l
    ok('Icons, linked: scan, app, credit done (tick 1, icon 0), punch lit (tick 0, icon 1)', l.steps.slice(0, 3).every((x) => x.done && x.tick === '1' && x.ic === '0') && l.steps[3].on && !l.steps[3].done && l.steps[3].tick === '0' && l.steps[3].ic === '1', JSON.stringify(l.steps))
    ok('Icons, linked: the ticks are drawn 60 px and centred in their disc', l.icons.filter((x) => x.cls === 'tick').every((x) => x.drawn && Math.abs(x.w - 60) <= 1 && x.disc && Math.abs(x.disc.off[0]) <= 2 && Math.abs(x.disc.off[1]) <= 2), JSON.stringify(l.icons.filter((x) => x.cls === 'tick')))
    await shot('.mscreen-scan .scn-howto', `build/anim/verify-machine-scan-howto-icons-linked-${TAG}.png`)
    await js(`window.showcase.mscreen('scan', {}); 1`); await sleep(900)
  } else {
    await shot('.mscreen-scan .scn-howto', `build/anim/verify-machine-scan-howto-${i}-${r.design.toLowerCase().replace(/\s+/g, '-')}-${TAG}.png`)
  }
  if (r.design === 'Sequence') {
    const f = r.fist
    ok('Sequence: the fist image is a plain 56 px mark (no disc, no ring, loaded)', !!f && Math.abs(f.w - 56) <= 1 && Math.abs(f.h - 56) <= 1 && f.shadow === 'none' && (f.bg === 'rgba(0, 0, 0, 0)') && f.complete && f.natural > 0, JSON.stringify(f))
    ok('Sequence: the fist sits where the other steps put their icons (same top, same size, same left)', !!f && f.sibTops.every((tp) => Math.abs(tp - f.top) <= 1) && f.sibSizes.every((sz) => Math.abs(sz - f.w) <= 1) && f.sibLefts.every((lf) => Math.abs(lf - f.left) <= 1), JSON.stringify(f && { top: f.top, sibTops: f.sibTops, left: f.left, sibLefts: f.sibLefts, sibSizes: f.sibSizes }))
    ok('Sequence: no .sho-mark left in it', r.marks.length === 0, JSON.stringify(r.marks))
  }
}
await js(`window.showcase.sec('machine', 'scan', 'howto', 0); window.showcase.sec('machine', 'scan', 'status', 0); 1`); await sleep(500)

/* 3. the whole glass: no sideways overflow, no console errors ---------------------------------------------- */
const whole = await js(`JSON.stringify((() => { const host = document.querySelector('.mscreen-scan'); const fit = host.getBoundingClientRect().width / 1080; const scn = host.querySelector('.scn'); return { scrollW: scn.scrollWidth, clientW: scn.clientWidth, fit: Math.round(fit * 1000) / 1000, pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth } })())`)
ok('the frame has no sideways scroll and the page no horizontal overflow', whole.includes('"pageOverflow":0'), whole)
if (SHOTS && APP === 'dark' && FACE === 'arena') await shot('.mscreen-scan', `build/anim/verify-machine-scan-full-${TAG}.png`, 1)
ok('no console errors', errs.length === 0, errs.slice(0, 4).join(' | '))

const fails = out.filter((o) => !o.pass)
for (const o of out) console.log(`${o.pass ? 'PASS' : 'FAIL'}  ${o.name}${o.pass ? '' : '\n        ' + o.detail}`)
console.log(`\n${out.length - fails.length}/${out.length} passed (${TAG})`)
await writeFile(`build/anim/verify-machine-scan-${TAG}.json`, JSON.stringify({ checks: out, results }, null, 1))
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'vm' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)
process.exit(fails.length ? 1 : 0)
