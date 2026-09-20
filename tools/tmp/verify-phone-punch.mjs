// A second, skeptical look at round twelve on the phone's Punch page, Look up section: the Arrow keeps only the logo,
// centred in the disc and pulsing about that centre; the Machine design is gone. Nothing is forced that the flow can
// reach itself: the strike is waited for. Shots go to build/anim/verify-phone-punch-*.png.
// node tools/tmp/verify-phone-punch.mjs [width]
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = Number(process.argv[2] || 1440)
const port = 9800 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'vp' + port)}`, `--window-size=${W},1100`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); let errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).split('\n')[0])
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map((a) => a.value || a.description).join(' ').split('\n')[0])
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 1100, deviceScaleFactor: 1, mobile: false })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
const out = []
const ok = (name, pass, detail) => out.push({ name, pass, detail })
const P = 'build/anim/verify-phone-punch-'

async function boot(seed) {
  await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
  await js('localStorage.clear(); 1')
  if (seed) await js(seed)
  errs = []
  await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
}
async function shot(sel, file, scale = 2) {
  const b = JSON.parse(await js(`JSON.stringify((() => { const el = document.querySelector('${sel.replace(/'/g, "\\'")}'); if (!el) return null; el.scrollIntoView({ block: 'start' }); const r = el.getBoundingClientRect(); return { x: Math.max(0, Math.round(r.left) - 8), y: Math.max(0, Math.round(r.top + scrollY) - 8), width: Math.round(r.width) + 16, height: Math.round(r.height) + 16 } })())`) || 'null')
  if (!b) { console.log('not found:', sel); return null }
  const s = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...b, scale } })
  if (!s.result) { console.log('capture failed', file); return null }
  await writeFile(file, Buffer.from(s.result.data, 'base64'))
  return b
}
// everything about the Arrow at this instant: the logo's box against the disc's, the disc's own transform, the copy
const MEASURE = `JSON.stringify((() => {
  const p = document.getElementById('mPunch'), f = p.querySelector('.pp-bc-fist'), d = p.querySelector('.pp-bc-disc'), bc = p.querySelector('.pp-beacon')
  const fr = f.getBoundingClientRect(), dr = d.getBoundingClientRect(), br = bc.getBoundingClientRect()
  const r = (v) => Math.round(v * 100) / 100
  const cs = getComputedStyle(f)
  return { page: window.punchApp.page, state: p.dataset.state, live: p.classList.contains('is-live'), struck: p.classList.contains('is-struck'),
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    up: document.querySelector('.pp-bc-up'), chev: p.querySelector('[data-lucide="chevrons-up"], .lucide-chevrons-up') === null, discKids: d.children.length, discKid: d.firstElementChild && d.firstElementChild.tagName,
    disc: r(dr.width), discH: r(dr.height), discTf: getComputedStyle(d).transform, dvar: getComputedStyle(bc).getPropertyValue('--d').trim(), stage: [r(br.width), r(br.height)],
    logo: r(fr.width), logoH: r(fr.height), share: r(fr.width / dr.width), origin: cs.transformOrigin, opacity: cs.opacity, anim: cs.animationName, dur: cs.animationDuration, ease: cs.animationTimingFunction,
    dx: r((fr.left + fr.width / 2) - (dr.left + dr.width / 2)), dy: r((fr.top + fr.height / 2) - (dr.top + dr.height / 2)),
    rings: p.querySelectorAll('.pp-bc-ring').length, spin: getComputedStyle(p.querySelector('.pp-beacon .pp-spin')).opacity, spinAnim: getComputedStyle(p.querySelector('.pp-beacon .pp-spin')).animationName,
    sub: p.querySelector('[data-punch-sub]').textContent.trim(), link: p.querySelector('[data-punch-link]').textContent.trim(), cancelHidden: document.getElementById('mPunchCancel').hidden }
})())`

/* 1. the Arrow, live and waiting: three stills across one second, timed from the pulse's own animationstart -------- */
await boot(null)
await js("window.showcase.mode('mobile'); 1"); await sleep(1800)
await js("window.PSec.set('phone', 'punch', 'look', 0, true); 1")
const reads = []
for (const at of [0, 700, 1400]) {
  await js("window.punchApp.go('scan'); 1"); await sleep(1300)
  const m = JSON.parse(await js(`new Promise((done) => {
    const p = document.getElementById('mPunch'), f = p.querySelector('.pp-bc-fist')
    const t0 = performance.now()
    const bail = setTimeout(() => done(JSON.stringify({ noStart: true, state: p.dataset.state, live: p.classList.contains('is-live'), anim: getComputedStyle(f).animationName })), 3000)
    f.addEventListener('animationstart', (e) => {
      if (e.animationName !== 'pp-pulse') return
      clearTimeout(bail)
      const start = performance.now()
      p.classList.remove('is-entering')
      setTimeout(() => { const r = JSON.parse(${MEASURE}); r.fromGo = Math.round(performance.now() - t0); r.fromStart = Math.round(performance.now() - start); done(JSON.stringify(r)) }, ${at})
    }, { once: true })
    window.punchApp.go('punch', { flow: true })
  })`))
  reads.push(m)
  await shot('#device', `${P}wait-${at}.png`)
}
console.log('wait readings', JSON.stringify(reads, null, 1))
ok('no chevrons anywhere in the page (.pp-bc-up null, no chevrons-up icon in #mPunch)', reads.every((r) => r.up === null && r.chev), reads.map((r) => `${r.up}/${r.chev}`).join(' '))
ok('the disc holds one child, the logo img', reads.every((r) => r.discKids === 1 && r.discKid === 'IMG'), reads.map((r) => `${r.discKids} ${r.discKid}`).join(' '))
ok('live wait with pp-pulse 2.8s ease-in-out and reduced motion off', reads.every((r) => !r.noStart && r.state === 'wait' && r.live && !r.reduced && r.anim === 'pp-pulse' && r.dur === '2.8s' && r.ease === 'ease-in-out'), reads.map((r) => `${r.state}/${r.live}/${r.anim}/${r.dur}/${r.ease}/reduced ${r.reduced}`).join(' '))
ok('logo centred on the disc in every still, the disc itself not transformed', reads.every((r) => Math.abs(r.dx) <= 1 && Math.abs(r.dy) <= 1 && r.discTf === 'none'), reads.map((r) => `dx ${r.dx} dy ${r.dy} disc ${r.discTf}`).join(' | '))
const rest = reads[0], mid = reads[1], peak = reads[2]
ok('rest size about .64 of the disc, square, scaled about its own centre', rest.share >= .62 && rest.share <= .66 && Math.abs(rest.logo - rest.logoH) < 1 && /^56\.3\d?px 56\.3\d?px$/.test(rest.origin), `logo ${rest.logo}x${rest.logoH} of disc ${rest.disc} = ${rest.share}, origin ${rest.origin}, --d ${rest.dvar}, stage ${rest.stage}`)
ok('big and bigger and small again: mid between rest and peak, peak about twelve percent up', mid.logo > rest.logo + 3 && mid.logo < peak.logo - 3 && peak.logo / rest.logo >= 1.10 && peak.logo / rest.logo <= 1.14, reads.map((r) => `${r.fromStart}ms ${r.logo}`).join(' -> '))
ok('halo rings and the spin arc still there while waiting (two rings, arc hidden)', reads.every((r) => r.rings === 2 && r.spin === '0'), reads.map((r) => `rings ${r.rings} spin ${r.spin}`).join(' '))
ok('wait copy and link unchanged', reads.every((r) => r.sub === 'Look up at the glass and give the pad one full strike.' && r.link === 'Connected' && !r.cancelHidden), `${rest.sub} / ${rest.link} / cancel hidden ${rest.cancelHidden}`)

/* 2. a fine sampler over one and a half cycles, then the real strike (five to twelve seconds in) ------------------- */
await js("window.punchApp.go('scan'); 1"); await sleep(1300)
const trace = JSON.parse(await js(`new Promise((done) => {
  const p = document.getElementById('mPunch'), f0 = p.querySelector('.pp-bc-fist')
  const ev = []
  for (const k of ['animationstart', 'animationiteration', 'animationend', 'animationcancel']) f0.addEventListener(k, (e) => ev.push({ k, name: e.animationName, at: Math.round(performance.now() - t0) }))
  const t0 = performance.now()
  window.punchApp.go('punch', { flow: true })
  const rows = []
  const iv = setInterval(() => {
    const f = p.querySelector('.pp-bc-fist'), d = p.querySelector('.pp-bc-disc')
    const fr = f.getBoundingClientRect(), dr = d.getBoundingClientRect()
    rows.push({ t: Math.round(performance.now() - t0), w: Math.round(fr.width * 100) / 100, dx: Math.round(((fr.left + fr.width / 2) - (dr.left + dr.width / 2)) * 100) / 100, dy: Math.round(((fr.top + fr.height / 2) - (dr.top + dr.height / 2)) * 100) / 100, same: f === f0, state: p.dataset.state })
  }, 40)
  setTimeout(() => { clearInterval(iv); done(JSON.stringify({ rows, ev })) }, 4400)
})`))
const wsz = trace.rows.map((r) => r.w)
const iters = trace.ev.filter((e) => e.k === 'animationiteration' && e.name === 'pp-pulse')
const starts = trace.ev.filter((e) => e.k === 'animationstart' && e.name === 'pp-pulse')
const peaks = trace.rows.filter((r) => r.w === Math.max(...wsz)).map((r) => r.t)
console.log('sampler events', JSON.stringify(trace.ev), 'min', Math.min(...wsz), 'max', Math.max(...wsz), 'peak at', peaks.join(','), 'first', trace.rows.slice(0, 4).map((r) => `${r.t}:${r.w}`).join(' '))
ok('sampler: one pulse start, one iteration about 2.8s later, width from rest up twelve percent and back, always centred, same element', starts.length === 1 && iters.length === 1 && Math.abs((iters[0].at - starts[0].at) - 2800) < 150 && Math.max(...wsz) / Math.min(...wsz) >= 1.10 && Math.max(...wsz) / Math.min(...wsz) <= 1.14 && trace.rows.every((r) => Math.abs(r.dx) <= 1 && Math.abs(r.dy) <= 1 && r.same && r.state === 'wait'), `starts ${starts.length} iters ${JSON.stringify(iters)} ratio ${(Math.max(...wsz) / Math.min(...wsz)).toFixed(3)} peak at ${peaks[0]}ms centred ${trace.rows.every((r) => Math.abs(r.dx) <= 1 && Math.abs(r.dy) <= 1)}`)
ok('sampler: the pulse starts from rest (first samples at the rest size)', trace.rows.slice(0, 3).every((r) => Math.abs(r.w - Math.min(...wsz)) < 1.5), trace.rows.slice(0, 3).map((r) => r.w).join(' '))

// the strike lands on its own between five and twelve seconds after the run began; wait for it, then for the reading
const waitFor = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await js(cond)) return true; await sleep(60) } return false }
const gotLanded = await waitFor("document.getElementById('mPunch').dataset.state === 'landed'", 14000)
await sleep(450)
const landed = JSON.parse(await js(MEASURE))
await shot('#device', `${P}landed.png`)
console.log('landed', JSON.stringify(landed))
ok('real strike: landed, is-struck, the logo at .8 of the disc, centred, full opacity, copy says Great punch', gotLanded && landed.state === 'landed' && landed.struck && landed.share >= .78 && landed.share <= .82 && Math.abs(landed.dx) <= 1 && Math.abs(landed.dy) <= 1 && landed.opacity === '1' && landed.sub.startsWith('Great punch.') && landed.link === 'Hit received' && landed.cancelHidden, `${gotLanded} ${JSON.stringify(landed)}`)
const gotReading = await waitFor("document.getElementById('mPunch').dataset.state === 'reading'", 3000)
await sleep(500)
const reading = JSON.parse(await js(MEASURE))
await shot('#device', `${P}reading.png`)
console.log('reading', JSON.stringify(reading))
ok('real reading: the logo holds .8, centred, the spin arc showing and turning', gotReading && reading.state === 'reading' && reading.share >= .78 && reading.share <= .82 && Math.abs(reading.dx) <= 1 && Math.abs(reading.dy) <= 1 && reading.spin === '1' && reading.spinAnim === 'pp-turn' && reading.sub.startsWith('Great punch.') && reading.link === 'Reading your hit', JSON.stringify(reading))
const gotHit = await waitFor("window.punchApp.page === 'hit'", 5000)
ok('the flow still carries on to Your hit after the reading', gotHit, `page now ${await js('window.punchApp.page')}`)

/* 3. time up, forced for the look only (the real one takes twenty seconds) ------------------------------------- */
await js("window.punchApp.go('scan'); 1"); await sleep(1000)
await js("window.punchApp.go('punch', { flow: true }); 1"); await sleep(1200)
await js("document.getElementById('mPunch').dataset.state = 'miss'; 1"); await sleep(600)
const miss = JSON.parse(await js(MEASURE))
const missOp = await js("getComputedStyle(document.querySelector('#mPunch .pp-beacon')).opacity")
await shot('#device', `${P}miss.png`, 1)
ok('time up (forced): the picture dims to .4 and the pulse stops, the logo at rest and centred', missOp === '0.4' && miss.anim === 'none' && miss.share >= .62 && miss.share <= .66 && Math.abs(miss.dx) <= 1 && Math.abs(miss.dy) <= 1, `opacity ${missOp} anim ${miss.anim} share ${miss.share}`)

/* 4. the neighbours: Pad, Photo and Big type still stand, one at a time, in the live wait ----------------------- */
await js("window.punchApp.go('scan'); 1"); await sleep(1000)
await js("window.punchApp.go('punch', { flow: true }); 1"); await sleep(1200)
const names = JSON.parse(await js("JSON.stringify(window.PSec.sections('phone', 'punch').map((s) => ({ key: s.key, label: s.label, names: s.names })))"))
console.log('sections', JSON.stringify(names))
const look = names.find((s) => s.key === 'look')
ok('PSec lists Look up as Arrow, Pad, Photo, Big type and Machine as five', look && look.names.join('|') === 'Arrow|Pad|Photo|Big type' && names.find((s) => s.key === 'machine')?.names.length === 5, JSON.stringify(names))
ok('no .pp-mc and no data-sv="Machine" in the document', await js(`document.querySelector('.pp-mc, [data-sv="Machine"], [class*="pp-mc-"]') === null`), '')
for (const [i, file, cls] of [[1, 'pad', '.pp-pad'], [2, 'photo', '.pp-ph'], [3, 'bigtype', '.pp-bt']]) {
  const nm = await js(`window.PSec.set('phone', 'punch', 'look', ${i})`); await sleep(900)
  const st = JSON.parse(await js(`JSON.stringify((() => {
    const sec = document.querySelector('.m-page[data-page="punch"] [data-sec="look"]')
    const shown = [...sec.children].filter((c) => c.hasAttribute('data-sv') && !c.hidden)
    const el = shown[0], r = el && el.getBoundingClientRect()
    const anim = [...el.querySelectorAll('*')].map((x) => getComputedStyle(x).animationName).filter((a) => a !== 'none')
    return { name: sec.dataset.svName, index: sec.dataset.svIndex, shown: shown.map((c) => c.dataset.sv), is: el.matches('${cls}'), w: r && Math.round(r.width), h: r && Math.round(r.height), state: document.getElementById('mPunch').dataset.state, anim: [...new Set(anim)] }
  })())`))
  await shot('#device', `${P}${file}.png`, 1)
  ok(`neighbour ${nm}: the one design shown, sized, waiting, with its own motion`, st.shown.length === 1 && st.is && st.w > 200 && st.h > 200 && st.state === 'wait' && st.anim.length > 0, JSON.stringify(st))
}
await js("window.PSec.set('phone', 'punch', 'look', 0); 1"); await sleep(600)

/* 5. reduced motion: the logo stands still at rest, centred ---------------------------------------------------- */
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
await js("window.punchApp.go('scan'); 1"); await sleep(800)
await js("window.punchApp.go('punch', { flow: true }); 1"); await sleep(1200)
const red = JSON.parse(await js(MEASURE))
await shot('#device', `${P}reduced.png`, 1)
ok('reduced motion: no animation on the logo, at rest .64, centred', red.reduced && red.anim === 'none' && red.share >= .62 && red.share <= .66 && Math.abs(red.dx) <= 1 && Math.abs(red.dy) <= 1, JSON.stringify({ reduced: red.reduced, anim: red.anim, share: red.share, dx: red.dx, dy: red.dy }))
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
ok('no console errors through the phone pass', errs.length === 0, errs.slice(0, 3).join(' | '))

/* 6. the design-system tab counts four, read live from the markup ---------------------------------------------- */
await js("window.showcase.mode('system'); 1"); await sleep(2500)
const grp = await js("(document.querySelector('.pagenav[data-pagenav=\"page\"] .pagesub [data-page=\"punch\"]') || {}).dataset?.in || ''")
await js(`const g = document.querySelector('[data-pn="phone|g|${grp}"]'); if (g) g.click(); 1`); await sleep(400)
await js('const b = document.querySelector(\'[data-pn="phone|p|punch"]\'); if (b) b.click(); 1'); await sleep(700)
const row = JSON.parse(await js(`JSON.stringify((() => {
  const rows = [...document.querySelectorAll('[data-ds-cust] .sec-row')]
  const r = rows.find((x) => x.querySelector('.sec-name')?.textContent.trim() === 'Look up')
  const m = rows.find((x) => x.querySelector('.sec-name')?.textContent.trim() === 'Machine')
  if (!r) return { rows: rows.map((x) => x.querySelector('.sec-name')?.textContent.trim()) }
  return { design: r.querySelector('.sec-design b').textContent, dots: r.querySelectorAll('.sec-dots i').length, mdots: m && m.querySelectorAll('.sec-dots i').length, note: document.querySelector('[data-ds-pn-note]')?.textContent.trim() }
})())`) || 'null')
console.log('ds row', JSON.stringify(row))
ok('design-system Customise row: Look up / Arrow with four dots, Machine with five', row && row.dots === 4 && row.design === 'Arrow' && row.mdots === 5, JSON.stringify(row))
await shot('[data-ds-cust]', `${P}ds-rows.png`, 1)
const cen = JSON.parse(await js(`JSON.stringify((() => {
  const li = [...document.querySelectorAll('[data-ds-census="phone"] li')].find((x) => /punch/i.test(x.querySelector('.ds-cen-name')?.textContent || ''))
  if (!li) return null
  li.querySelector('details').open = true
  const sec = [...li.querySelectorAll('.ds-cen-sec')].find((s) => s.querySelector('.ds-cen-label').textContent.trim() === 'Look up')
  li.setAttribute('data-shot', '1')
  return { name: li.querySelector('.ds-cen-name').textContent, secs: li.querySelector('.ds-cen-secs').textContent, picks: sec ? [...sec.querySelectorAll('.ds-pick')].map((b) => b.textContent) : null, sum: document.querySelector('[data-ds-census-sum]')?.textContent }
})())`) || 'null')
await sleep(400)
console.log('census', JSON.stringify(cen))
ok('design-system census lists the four names for Look up', cen && cen.picks && cen.picks.join('|') === 'Arrow|Pad|Photo|Big type', JSON.stringify(cen))
await shot('[data-ds-census="phone"] li[data-shot]', `${P}ds-census.png`, 1)
ok('no console errors on the design-system tab', errs.length === 0, errs.slice(0, 3).join(' | '))

/* 7. saved states from before the removal fall back without a word ----------------------------------------------- */
for (const [label, seed, want] of [['name "Machine"', `{ look: 'Machine' }`, 'Arrow'], ['index past the end', '{ look: 4 }', 'Big type'], ['old Machine index', '{ look: 1 }', 'Pad'], ['negative index', '{ look: -3 }', 'Arrow'], ['not even an object', '"Machine"', 'Arrow']]) {
  await boot(`localStorage.setItem('punch-psec.v2', JSON.stringify({ 'phone/punch': ${seed} })); 1`)
  await js("window.showcase.mode('mobile'); 1"); await sleep(1500)
  await js("window.punchApp.go('punch'); 1"); await sleep(1200)
  const st = JSON.parse(await js(`JSON.stringify((() => {
    const sec = document.querySelector('.m-page[data-page="punch"] [data-sec="look"]')
    const shown = [...sec.children].filter((c) => c.hasAttribute('data-sv') && !c.hidden)
    const r = shown[0] && shown[0].getBoundingClientRect()
    return { index: sec.dataset.svIndex, name: sec.dataset.svName, shown: shown.map((c) => c.dataset.sv), visible: !!r && r.width > 100 && r.height > 100 && getComputedStyle(shown[0]).visibility === 'visible', get: window.PSec.get('phone', 'punch', 'look') }
  })())`))
  // the design-system tab must read the same state without a word
  await js("window.showcase.mode('system'); 1"); await sleep(1500)
  ok(`saved state ${label}: ${want} shown alone, no error, system tab fine`, st.shown.length === 1 && st.shown[0] === want && st.visible && errs.length === 0, `${JSON.stringify(st)} errors ${errs.slice(0, 2).join(' | ')}`)
}

/* 8. the negative control: the error collector must see an error when one is thrown ----------------------------- */
await js("console.error('verify-phone-punch control'); 1"); await sleep(300)
ok('negative control: the collector catches a console error', errs.some((e) => e.includes('verify-phone-punch control')), errs.join(' | '))

const fails = out.filter((o) => !o.pass)
for (const o of out) console.log(`${o.pass ? 'PASS' : 'FAIL'}  ${o.name}\n        ${o.detail}`)
console.log(`\n${out.length - fails.length}/${out.length} passed at ${W}px`)
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'vp' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)
process.exit(fails.length ? 1 : 0)
