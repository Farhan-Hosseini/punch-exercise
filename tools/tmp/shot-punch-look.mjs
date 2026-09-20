// The phone's Punch page, Look up section, after round twelve: the Arrow's logo pulses around the disc's centre with
// no chevrons, the Machine design is gone (four designs), the design-system tab counts four, and a saved state that
// still points past the end (or names "Machine") falls back without an error.
// node tools/tmp/shot-punch-look.mjs [width]
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = Number(process.argv[2] || 1440)
const port = 9700 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'pl' + port)}`, `--window-size=${W},1100`, 'about:blank'], { stdio: 'ignore' })
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
const out = []
const ok = (name, pass, detail) => out.push({ name, pass, detail })

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
// the logo's box against the disc's: centre offsets and the width as a share of the disc
const MEASURE = `JSON.stringify((() => {
  const p = document.getElementById('mPunch'), f = p.querySelector('.pp-bc-fist'), d = p.querySelector('.pp-bc-disc')
  const fr = f.getBoundingClientRect(), dr = d.getBoundingClientRect()
  const r = (v) => Math.round(v * 100) / 100
  return { state: p.dataset.state, live: p.classList.contains('is-live'), up: document.querySelector('.pp-bc-up') === null,
    disc: r(dr.width), logo: r(fr.width), share: r(fr.width / dr.width),
    dx: r((fr.left + fr.width / 2) - (dr.left + dr.width / 2)), dy: r((fr.top + fr.height / 2) - (dr.top + dr.height / 2)),
    cx: r(fr.left + fr.width / 2), cy: r(fr.top + fr.height / 2 + scrollY), anim: getComputedStyle(f).animationName }
})())`

/* 1. the Arrow, live and waiting: three stills across the pulse, timed inside the page from its animationstart ---- */
await boot(null)
await js("window.showcase.mode('mobile'); 1"); await sleep(1800)
// the Arrow is the first design, so a clean state shows it; go() starts the run and the pulse together. Each still
// re-enters the page (scan, then punch) so the pulse starts afresh, and the rise-in is dropped so the still is at rest
await js("window.PSec.set('phone', 'punch', 'look', 0, true); 1")
const reads = []
for (const at of [0, 700, 1400]) {
  await js("window.punchApp.go('scan'); 1"); await sleep(1300)
  const m = JSON.parse(await js(`new Promise((done) => {
    const p = document.getElementById('mPunch'), f = p.querySelector('.pp-bc-fist')
    const t0 = performance.now()
    f.addEventListener('animationstart', (e) => {
      if (e.animationName !== 'pp-pulse') return
      const start = performance.now()
      p.classList.remove('is-entering')
      setTimeout(() => { const r = JSON.parse(${MEASURE}); r.fromGo = Math.round(performance.now() - t0); r.fromStart = Math.round(performance.now() - start); done(JSON.stringify(r)) }, ${at})
    }, { once: true })
    window.punchApp.go('punch', { flow: true })
  })`))
  reads.push(m)
  await shot('#device', `build/anim/punch-look-wait-${at}.png`)
}
console.log('wait readings', JSON.stringify(reads))
ok('no chevrons in the DOM', reads.every((r) => r.up), reads.map((r) => r.up).join(','))
ok('live wait state with the pulse running', reads.every((r) => r.state === 'wait' && r.live && r.anim === 'pp-pulse'), reads.map((r) => `${r.state}/${r.live}/${r.anim}`).join(' '))
ok('logo centred on the disc in every reading', reads.every((r) => Math.abs(r.dx) <= 1 && Math.abs(r.dy) <= 1), reads.map((r) => `dx ${r.dx} dy ${r.dy}`).join(' | '))
const rest = reads[0], peak = reads[2]
ok('rest size about .64 of the disc', rest.share >= .62 && rest.share <= .68, `logo ${rest.logo} of disc ${rest.disc} = ${rest.share}`)
ok('peak about twelve percent above rest', peak.logo / rest.logo >= 1.10 && peak.logo / rest.logo <= 1.14 && reads[1].logo > rest.logo && reads[1].logo < peak.logo, reads.map((r) => `${r.fromStart}ms after start ${r.logo}`).join(' -> '))

/* 2. the strike: the logo jumps to the full .8 ------------------------------------------------------------- */
await js("const p = document.getElementById('mPunch'); p.dataset.state = 'landed'; p.classList.remove('is-struck'); void p.offsetWidth; p.classList.add('is-struck'); 1")
await sleep(700)
const landed = JSON.parse(await js(MEASURE))
await shot('#device', 'build/anim/punch-look-landed.png')
ok('landed: the logo at .8 of the disc, still centred', landed.state === 'landed' && landed.share >= .78 && landed.share <= .82 && Math.abs(landed.dx) <= 1 && Math.abs(landed.dy) <= 1, JSON.stringify(landed))
await js("document.getElementById('mPunch').dataset.state = 'reading'; 1"); await sleep(700)
const reading = JSON.parse(await js(MEASURE))
await shot('#device', 'build/anim/punch-look-reading.png')
ok('reading: the logo holds .8 of the disc', reading.state === 'reading' && reading.share >= .78 && reading.share <= .82, JSON.stringify(reading))

/* 3. the section pages through four designs ---------------------------------------------------------------- */
const names = JSON.parse(await js("JSON.stringify(window.PSec.sections('phone', 'punch').map((s) => ({ key: s.key, names: s.names })))"))
const look = names.find((s) => s.key === 'look')
ok('Look up lists Arrow, Pad, Photo, Big type', look && look.names.join('|') === 'Arrow|Pad|Photo|Big type', JSON.stringify(names))
ok('no pp-mc left in the page', await js("document.querySelector('.pp-mc, [data-sv=\"Machine\"]') === null"), '')
ok('no console errors so far', errs.length === 0, errs.slice(0, 3).join(' | '))

/* 4. the design-system tab counts four, read live ---------------------------------------------------------- */
await js("window.showcase.mode('system'); 1"); await sleep(2500)
const grp = await js("(document.querySelector('.pagenav[data-pagenav=\"page\"] .pagesub [data-page=\"punch\"]') || {}).dataset?.in || ''")
await js(`document.querySelector('[data-pn="phone|g|${grp}"]').click(); 1`); await sleep(400)
await js('document.querySelector(\'[data-pn="phone|p|punch"]\').click(); 1'); await sleep(600)
const row = JSON.parse(await js(`JSON.stringify((() => {
  const rows = [...document.querySelectorAll('[data-ds-cust] .sec-row')]
  const r = rows.find((x) => x.querySelector('.sec-name')?.textContent.trim() === 'Look up')
  if (!r) return null
  return { design: r.querySelector('.sec-design b').textContent, dots: r.querySelectorAll('.sec-dots i').length, note: document.querySelector('[data-ds-pn-note]')?.textContent }
})())`) || 'null')
ok('design-system Customise row for Look up shows four dots', row && row.dots === 4 && row.design === 'Arrow', JSON.stringify(row))
await shot('[data-ds-cust]', 'build/anim/punch-look-ds-rows.png', 1)
const cen = JSON.parse(await js(`JSON.stringify((() => {
  const li = [...document.querySelectorAll('[data-ds-census="phone"] li')].find((x) => /punch/i.test(x.querySelector('.ds-cen-name')?.textContent || ''))
  if (!li) return null
  li.querySelector('details').open = true
  const sec = [...li.querySelectorAll('.ds-cen-sec')].find((s) => s.querySelector('.ds-cen-label').textContent.trim() === 'Look up')
  li.setAttribute('data-shot', '1')
  return { name: li.querySelector('.ds-cen-name').textContent, picks: sec ? [...sec.querySelectorAll('.ds-pick')].map((b) => b.textContent) : null, sum: document.querySelector('[data-ds-census-sum]')?.textContent }
})())`) || 'null')
await sleep(400)
ok('design-system census lists the four names', cen && cen.picks && cen.picks.join('|') === 'Arrow|Pad|Photo|Big type', JSON.stringify(cen))
await shot('[data-ds-census="phone"] li[data-shot]', 'build/anim/punch-look-ds-census.png', 1)

/* 5. a saved state from before the removal falls back cleanly ---------------------------------------------- */
for (const [label, seed] of [['name "Machine"', `{ look: 'Machine' }`], ['index past the end', '{ look: 4 }'], ['old Machine index', '{ look: 1 }']]) {
  await boot(`localStorage.setItem('punch-psec.v2', JSON.stringify({ 'phone/punch': ${seed} })); 1`)
  await js("window.showcase.mode('mobile'); 1"); await sleep(1500)
  await js("window.punchApp.go('punch'); 1"); await sleep(1200)
  const st = JSON.parse(await js(`JSON.stringify((() => {
    const sec = document.querySelector('.m-page[data-page="punch"] [data-sec="look"]')
    const shown = [...sec.children].filter((c) => c.hasAttribute('data-sv') && !c.hidden)
    const r = shown[0] && shown[0].getBoundingClientRect()
    return { index: sec.dataset.svIndex, name: sec.dataset.svName, shown: shown.map((c) => c.dataset.sv), visible: !!r && r.width > 100 && r.height > 100 && getComputedStyle(shown[0]).visibility === 'visible', get: window.PSec.get('phone', 'punch', 'look') }
  })())`))
  ok(`saved state ${label}: one visible design, no error`, st.shown.length === 1 && st.visible && errs.length === 0, `${JSON.stringify(st)} errors ${errs.slice(0, 2).join(' | ')}`)
}

const fails = out.filter((o) => !o.pass)
for (const o of out) console.log(`${o.pass ? 'PASS' : 'FAIL'}  ${o.name}\n        ${o.detail}`)
console.log(`\n${out.length - fails.length}/${out.length} passed at ${W}px`)
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'pl' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)
process.exit(fails.length ? 1 : 0)
