// Renders everything the Figma pack needs from the running showcase, over CDP, into build/figma/cap with a manifest.
// node tools/figma-capture.mjs [only]   (only: machine | phone | chrome | looks | beats; default: all)
// Machine captures are in glass pixels (1080 wide); phone captures are at 2x (880 wide), positions in phone points.
// Motion is reduced so every design rests in its final state; long page timers (auto advance) are held off.
import { spawn } from 'node:child_process'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const ONLY = process.argv[2] || 'all'
const OUT = process.env.OUT || 'C:/Claude Database/punch-exercise/build/figma/cap'
const URL = 'http://localhost:5770/'
const W = 1440, H = 1080
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const port = 9400 + Math.floor(Math.random() * 400)
const profile = join(tmpdir(), 'figcap-' + port)
await mkdir(OUT, { recursive: true })

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let target
for (let i = 0; i < 60 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page') } catch { await sleep(150) }
}
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let seq = 0
const pending = new Map(), errors = []
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)
})
const send = (method, params = {}) => new Promise((r) => { const n = ++seq; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })) })
const js = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) throw new Error('eval: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text) + '\n' + expr.slice(0, 200))
  return r.result?.result?.value
}
async function shot(file, clip, scale, format = 'png') {
  const params = { format, clip: { x: clip.x, y: clip.y, width: clip.width, height: clip.height, scale }, captureBeyondViewport: false }
  if (format === 'jpeg') params.quality = 90
  const r = await send('Page.captureScreenshot', params)
  if (!r.result?.data) throw new Error('capture failed ' + file + ' ' + JSON.stringify(r.error || {}))
  await mkdir(join(OUT, file, '..'), { recursive: true })
  await writeFile(join(OUT, file), Buffer.from(r.result.data, 'base64'))
  return { w: Math.round(clip.width * scale), h: Math.round(clip.height * scale) }
}

await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })

const manifest = []
const add = (e) => { manifest.push(e); if (manifest.length % 20 === 0) console.log(manifest.length, e.file) }

async function boot() {
  await send('Page.navigate', { url: URL })
  await sleep(1200)
  await js("localStorage.clear(); 1")
  await send('Page.navigate', { url: URL })
  await sleep(4800)
  // the showcase chrome goes; long timers (auto advance, hand overs, sliders) are held so a page stays put
  await js(`(() => {
    const st = document.createElement('style'); st.id = 'figcap'
    st.textContent = '.topbar, .custom, .custom-scrim { display: none !important } body .stage, body .phone-stage { padding-top: 8px !important } .device-island, .device-keys { visibility: hidden !important } html.figcap-nomask .m-scroll { -webkit-mask-image: none !important; mask-image: none !important }'
    document.head.appendChild(st)
    window.__st = window.__st || window.setTimeout
    window.setTimeout = (fn, ms, ...a) => (ms > 1200 ? 0 : window.__st(fn, ms, ...a))
    return 1 })()`)
}
const rectOf = (sel) => js(`(() => { const e = ${sel}; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height } })()`)

/* ------------------------------------------------------------------ the machine */
const MZ = 25, MS = 100 / MZ // CSS zoom 25%, captured at 4x: glass pixels
async function machine() {
  await boot()
  await js(`showcase.mode('machine'); showcase.zoom(${MZ}); window.scrollTo(0, 0); 1`)
  await sleep(800)
  const screens = ['default', 'attract', 'scan', 'countdown', 'loading', 'result', 'score', 'record']
  const labels = await js(`Object.fromEntries([...document.querySelectorAll('.mpagebar [data-mscreen]')].map(b => [b.dataset.mscreen, b.textContent.trim()]))`)
  for (const key of screens) {
    await js(`showcase.mscreen('${key}', { figcap: 1 }); window.scrollTo(0, 0); 1`)
    await sleep(1400)
    const g = await rectOf(`document.getElementById('machine')`)
    add({ kind: 'screen', surface: 'machine', page: key, pageLabel: labels[key] || key, file: `machine/screen-${key}.jpg`, ...(await shot(`machine/screen-${key}.jpg`, g, MS, 'jpeg')) })
    if (key === 'result') {
      const slots = await js(`showcase.slots()`)
      const slotNames = await js(`[...document.querySelectorAll('#secRows .sec-row .sec-name')].map(e => e.textContent.trim())`)
      for (const [si, s] of slots.entries()) {
        const label = slotNames[si] || s.key
        for (let i = 0; i < s.designs.length; i++) {
          await js(`showcase.set('${s.key}', ${i}); 1`)
          await sleep(500)
          const r = await rectOf(`document.querySelector('[data-slot="${s.key}"]')`)
          if (!r || r.height < 2) continue
          const f = `machine/result/${s.key}-${i}.png`
          add({ kind: 'section', surface: 'machine', page: 'result', pageLabel: 'Result', sec: s.key, secLabel: label, i, name: s.designs[i], file: f,
            x: Math.round((r.x - g.x) * MS), y: Math.round((r.y - g.y) * MS), ...(await shot(f, r, MS)) })
        }
        await js(`showcase.set('${s.key}', 0); 1`)
      }
      continue
    }
    const secs = await js(`showcase.sections('machine', '${key}')`)
    for (const s of secs) {
      for (let i = 0; i < s.names.length; i++) {
        await js(`showcase.sec('machine', '${key}', '${s.key}', ${i}); 1`)
        await sleep(700)
        const r = await rectOf(`document.querySelector('.mscreen[data-mscreen="${key}"] [data-sec="${s.key}"]:not([data-sec-scope="global"])')`)
        const box = r && r.height > 2 ? r : g
        const f = `machine/${key}/${s.key}-${i}.png`
        add({ kind: 'section', surface: 'machine', page: key, pageLabel: labels[key] || key, sec: s.key, secLabel: s.label, i, name: s.names[i], file: f,
          whole: box === g, x: Math.round((box.x - g.x) * MS), y: Math.round((box.y - g.y) * MS), ...(await shot(f, box, MS)) })
      }
      await js(`showcase.sec('machine', '${key}', '${s.key}', 0); 1`)
    }
    // the screen with its sections hidden: what stays when every section is swapped (grounds, labels, chrome)
    await js(`document.querySelectorAll('.mscreen[data-mscreen="${key}"] [data-sec]:not([data-sec-scope="global"])').forEach(e => e.style.visibility = 'hidden'); 1`)
    await sleep(300)
    add({ kind: 'base', surface: 'machine', page: key, pageLabel: labels[key] || key, file: `machine/base-${key}.jpg`, ...(await shot(`machine/base-${key}.jpg`, g, MS, 'jpeg')) })
    await js(`document.querySelectorAll('.mscreen[data-mscreen="${key}"] [data-sec]').forEach(e => e.style.visibility = ''); 1`)
  }
  // the chrome every flow screen shares: header and sponsor strip, from the Home screen
  await js(`showcase.mscreen('default'); window.scrollTo(0, 0); 1`)
  await sleep(1200)
  const g = await rectOf(`document.getElementById('machine')`)
  for (const s of await js(`showcase.sections('global', 'all')`)) {
    if (s.key === 'tabbar') continue
    for (let i = 0; i < s.names.length; i++) {
      await js(`showcase.sec('global', 'all', '${s.key}', ${i}); 1`)
      await sleep(600)
      const sel = s.key === 'mheader'
        ? `[...document.querySelectorAll('.mscreen[data-mscreen="default"] [data-sec="mheader"] > [data-sv]')].find(d => !d.hidden)`
        : `document.querySelector('.mscreen[data-mscreen="default"] [data-sec="${s.key}"]')`
      const r = await rectOf(sel)
      if (!r) continue
      const f = `machine/chrome/${s.key}-${i}.png`
      add({ kind: 'chrome', surface: 'machine', sec: s.key, secLabel: s.label, i, name: s.names[i], file: f, x: Math.round((r.x - g.x) * MS), y: Math.round((r.y - g.y) * MS), ...(await shot(f, r, MS)) })
    }
    await js(`showcase.sec('global', 'all', '${s.key}', 0); 1`)
  }
  // the backgrounds alone, on the glass
  const keys = await js(`(() => { const out = []; const seen = new Set(); let k = showcase.backdrop(); for (let n = 0; n < 12; n++) { if (seen.has(k)) break; seen.add(k); out.push(k); document.querySelector('#globalRows .sec-row .sec-btn[data-dir="1"]').click(); k = document.documentElement.dataset.mbackdrop } return out })()`)
  await js(`document.querySelectorAll('.mscreen[data-mscreen="default"] > div > :not(.ms-lights)').forEach(e => e.style.visibility = 'hidden'); 1`)
  for (const k of keys) {
    await js(`showcase.backdrop('${k}'); 1`)
    await sleep(500)
    const f = `machine/backgrounds/${k}.jpg`
    add({ kind: 'background', surface: 'machine', name: k, file: f, ...(await shot(f, g, MS / 2, 'jpeg')) })
  }
  await js(`document.querySelectorAll('.mscreen[data-mscreen="default"] > div > *').forEach(e => e.style.visibility = ''); showcase.backdrop('${keys[0]}'); 1`)
}

/* ------------------------------------------------------------------ the phone */
const PS = 2
async function phone() {
  await boot()
  await js(`showcase.mode('mobile'); window.scrollTo(0, 0); 1`)
  await sleep(900)
  const pages = process.env.PAGES ? process.env.PAGES.split(',') : ['default', 'scan', 'connect', 'connected', 'punch', 'topup', 'checkout', 'paid', 'failed', 'hit', 'reel', 'saved', 'ranks', 'feed', 'profile']
  const labels = await js(`Object.fromEntries([...document.querySelectorAll('.pagebar [data-page]')].map(b => [b.dataset.page, b.textContent.trim()]))`)
  const screenSel = `document.getElementById('mApp')`
  const hideChrome = (on) => js(`document.querySelectorAll('#mApp > .m-status, #mApp > .m-nav, #mApp > .m-homebar').forEach(e => e.style.visibility = ${on ? "'hidden'" : "''"}); 1`)
  for (const key of pages) {
    await js(`punchApp.go('${key}', { player: 'me' }); window.scrollTo(0, 0); 1`)
    await sleep(1300)
    const scr = await rectOf(screenSel)
    // the first screen as a player sees it, with the status bar and the tab bar
    add({ kind: 'screen', surface: 'phone', page: key, pageLabel: labels[key] || key, file: `phone/screen-${key}.png`, ...(await shot(`phone/screen-${key}.png`, scr, PS)) })
    const pageSel = `document.querySelector('.m-page[data-page="${key}"]')`
    const content = await js(`(() => { const p = ${pageSel}; return { scroll: p.scrollHeight, client: p.clientHeight } })()`)
    await hideChrome(true)
    // sections are captured without the fade the page applies under the status bar and the tab bar
    await js(`document.documentElement.classList.add('figcap-nomask'); 1`)
    const secs = await js(`showcase.sections('phone', '${key}')`)
    for (const s of secs) {
      for (let i = 0; i < s.names.length; i++) {
        await js(`showcase.sec('phone', '${key}', '${s.key}', ${i}); 1`)
        await sleep(650)
        const info = await js(`(() => {
          const p = ${pageSel}, e = p.querySelector('[data-sec="${s.key}"]')
          if (!e) return null
          const r = e.getBoundingClientRect(), pr = p.getBoundingClientRect()
          if (r.height < 2 || r.width < 2) return { whole: true }
          p.scrollTop = Math.max(0, p.scrollTop + r.top - pr.top - 8)
          const r2 = e.getBoundingClientRect()
          return { whole: false, top: r2.top - pr.top + p.scrollTop, h: r2.height, left: r2.left - pr.left }
        })()`)
        await sleep(250)
        const f = `phone/${key}/${s.key}-${i}.png`
        let dims, x = 0, y = 0, whole = false
        if (!info || info.whole) {
          whole = true
          dims = await shot(f, await rectOf(screenSel), PS)
        } else {
          const r = await rectOf(`${pageSel}.querySelector('[data-sec="${s.key}"]')`)
          // a few points of margin, so a ring or a glow that spills past the section's box is kept
          const PAD = 6, top = Math.max(r.y - PAD, scr.y), bottom = Math.min(r.y + r.height + PAD, scr.y + scr.height)
          const clip = { x: r.x, y: top, width: r.width, height: bottom - top }
          dims = await shot(f, clip, PS)
          if (process.env.DEBUG) console.log(f, JSON.stringify({ info, r, clip, scr }))
          x = Math.round(info.left); y = Math.round(info.top - (r.y - top))
          if (info.h > scr.height) add({ kind: 'note', file: f, note: 'section taller than the screen, cut to the screen' })
        }
        add({ kind: 'section', surface: 'phone', page: key, pageLabel: labels[key] || key, sec: s.key, secLabel: s.label, i, name: s.names[i], file: f, whole, x, y, ...dims })
      }
      await js(`showcase.sec('phone', '${key}', '${s.key}', 0); 1`)
      await js(`(() => { const sh = document.querySelector('#mApp .m-sheet:not([hidden]), #mApp [role=dialog]:not([hidden])'); if (sh && sh.querySelector('button[id$=Ok], [data-close]')) sh.querySelector('button[id$=Ok], [data-close]').click(); return 1 })()`)
    }
    // the page with its sections hidden, top to bottom, stitched from screen-high slices (no background)
    await js(`(() => { const p = ${pageSel}; p.querySelectorAll('[data-sec]').forEach(e => e.style.visibility = 'hidden'); document.querySelector('#mApp > .m-bg').style.visibility = 'hidden'; p.scrollTop = 0; return 1 })()`)
    await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
    await js(`document.getElementById('figcap').textContent += ' html, body, .phone-stage, .device, .device-screen, #mApp { background: transparent !important }'; 1`)
    const total = Math.max(content.client, content.scroll), slices = []
    for (let top = 0, n = 0; top < total && n < 12; n++) {
      await js(`${pageSel}.scrollTop = ${top}; 1`)
      await sleep(250)
      const actual = await js(`${pageSel}.scrollTop`)
      const f = `phone/base/${key}-${n}.png`
      slices.push({ file: f, top: actual, ...(await shot(f, await rectOf(screenSel), PS)) })
      if (actual + content.client >= total) break
      top = actual + content.client
    }
    add({ kind: 'base', surface: 'phone', page: key, pageLabel: labels[key] || key, height: total, slices })
    await send('Emulation.setDefaultBackgroundColorOverride', {})
    await js(`(() => { const st = document.getElementById('figcap'); st.textContent = st.textContent.replace(' html, body, .phone-stage, .device, .device-screen, #mApp { background: transparent !important }', ''); const p = ${pageSel}; p.querySelectorAll('[data-sec]').forEach(e => e.style.visibility = ''); document.querySelector('#mApp > .m-bg').style.visibility = ''; p.scrollTop = 0; return 1 })()`)
    await hideChrome(false)
    await js(`document.documentElement.classList.remove('figcap-nomask'); 1`)
  }
  // the phone chrome: the status bar and the five tab bars, on the Home page
  await js(`punchApp.go('default'); 1`)
  await sleep(1000)
  const scr = await rectOf(screenSel)
  const sb = await rectOf(`document.querySelector('#mApp > .m-status')`)
  add({ kind: 'chrome', surface: 'phone', sec: 'status', secLabel: 'Status bar', i: 0, name: 'Status bar', file: 'phone/chrome/status.png', x: 0, y: 0, ...(await shot('phone/chrome/status.png', { x: scr.x, y: scr.y, width: scr.width, height: Math.max(54, sb.y + sb.height - scr.y + 6) }, PS)) })
  const tb = await js(`showcase.sections('global', 'all').find(s => s.key === 'tabbar')`)
  for (let i = 0; i < tb.names.length; i++) {
    await js(`showcase.sec('global', 'all', 'tabbar', ${i}); 1`)
    await sleep(600)
    const bottom = 150
    const f = `phone/chrome/tabbar-${i}.png`
    add({ kind: 'chrome', surface: 'phone', sec: 'tabbar', secLabel: 'Tab bar', i, name: tb.names[i], file: f, x: 0, y: Math.round(scr.height - bottom), ...(await shot(f, { x: scr.x, y: scr.y + scr.height - bottom, width: scr.width, height: bottom }, PS)) })
  }
  await js(`showcase.sec('global', 'all', 'tabbar', 0); 1`)
  // the backgrounds on the phone, content hidden
  await js(`document.querySelectorAll('#mApp > :not(.m-bg)').forEach(e => e.style.visibility = 'hidden'); 1`)
  const keys = ['glow', 'lights', 'spot', 'beams', 'smoke', 'pulse', 'embers', 'grid']
  const real = await js(`(() => { const out = []; const seen = new Set(); let k = showcase.backdrop(); for (let n = 0; n < 12; n++) { if (seen.has(k)) break; seen.add(k); out.push(k); const b = document.querySelector('#globalRows .sec-row .sec-btn[data-dir="1"]'); if (!b) break; b.click(); k = document.documentElement.dataset.mbackdrop } return out })()`)
  for (const k of real.length ? real : keys) {
    await js(`showcase.backdrop('${k}'); 1`)
    await sleep(500)
    const f = `phone/backgrounds/${k}.png`
    add({ kind: 'background', surface: 'phone', name: k, file: f, ...(await shot(f, await rectOf(screenSel), 1)) })
  }
  await js(`document.querySelectorAll('#mApp > *').forEach(e => e.style.visibility = ''); 1`)
}

/* ------------------------------------------------------------------ the four looks */
async function looks() {
  await boot()
  const LOOKS = [['arena', 'dark'], ['arena', 'light'], ['reference', 'dark'], ['reference', 'light']]
  for (const [v, a] of LOOKS) {
    await js(`showcase.theme('${v}'); showcase.appearance('${a}'); 1`)
    await js(`showcase.mode('machine'); showcase.zoom(${MZ}); 1`)
    for (const key of ['default', 'result', 'score']) {
      await js(`showcase.mscreen('${key}'); window.scrollTo(0, 0); 1`)
      await sleep(1500)
      const f = `looks/${v}-${a}-machine-${key}.jpg`
      add({ kind: 'look', surface: 'machine', look: `${v} ${a}`, page: key, file: f, ...(await shot(f, await rectOf(`document.getElementById('machine')`), MS / 2, 'jpeg')) })
    }
    await js(`showcase.mode('mobile'); 1`)
    for (const key of ['default', 'punch', 'hit', 'ranks']) {
      await js(`punchApp.go('${key}', { player: 'me' }); 1`)
      await sleep(1200)
      const f = `looks/${v}-${a}-phone-${key}.png`
      add({ kind: 'look', surface: 'phone', look: `${v} ${a}`, page: key, file: f, ...(await shot(f, await rectOf(`document.getElementById('mApp')`), PS)) })
    }
  }
}

/* ------------------------------------------------------------------ the flow, beat by beat, for the Animation page */
async function beats() {
  await boot()
  const B = [
    ['home', 'default', 'default', {}, 'Both at rest: the app on Home, the glass on its Home screen.'],
    ['scan', 'scan', 'scan', {}, 'The phone scans the code on the glass.'],
    ['link', 'connect', 'scan', { linked: true, page: 'connect' }, 'Linking: the glass greets the player.'],
    ['linked', 'connected', 'scan', { linked: true, page: 'connected' }, 'Connected: a credit is held for the turn.'],
    ['count', 'punch', 'countdown', { seconds: 20, start: 'NOW-8000' }, 'Punch now: only the glass keeps time, twenty seconds.'],
    ['read', 'punch', 'loading', {}, 'The strike lands and the glass reads it.'],
    ['record', 'hit', 'record', {}, 'A new record gets its own moment on the glass.'],
    ['result', 'hit', 'result', {}, 'The result on the glass; the hit is already on the phone.'],
  ]
  for (const [id, page, ms, opts, cap] of B) {
    await js(`showcase.mode('mobile'); punchApp.go('${page}', { player: 'me' }); 1`)
    await sleep(1200)
    const fp = `beats/${id}-phone.png`
    const pd = await shot(fp, await rectOf(`document.getElementById('mApp')`), PS)
    const o = JSON.stringify(opts).replace('"NOW-8000"', 'Date.now() - 8000')
    await js(`showcase.mode('machine'); showcase.zoom(${MZ}); showcase.mscreen('${ms}', ${o}); window.scrollTo(0, 0); 1`)
    await sleep(1600)
    const fm = `beats/${id}-machine.jpg`
    const md = await shot(fm, await rectOf(`document.getElementById('machine')`), MS / 2, 'jpeg')
    add({ kind: 'beat', id, caption: cap, phone: { file: fp, ...pd }, machine: { file: fm, ...md } })
  }
}

/* ------------------------------------------------------------------ the Result's base, and the design system tab */
async function extras() {
  await boot()
  await js(`showcase.mode('machine'); showcase.zoom(${MZ}); showcase.mscreen('result'); window.scrollTo(0, 0); 1`)
  await sleep(1600)
  const g = await rectOf(`document.getElementById('machine')`)
  await js(`document.querySelectorAll('#screenContent > .sec').forEach(e => e.style.visibility = 'hidden'); 1`)
  await sleep(300)
  add({ kind: 'base', surface: 'machine', page: 'result', pageLabel: 'Result', file: 'machine/base-result.jpg', ...(await shot('machine/base-result.jpg', g, MS, 'jpeg')) })
  await js(`document.querySelectorAll('#screenContent > .sec').forEach(e => e.style.visibility = ''); 1`)
  // the design system tab, top to bottom, in screen-high slices
  await js(`showcase.mode('system'); window.scrollTo(0, 0); 1`)
  await sleep(2500)
  const total = await js(`document.documentElement.scrollHeight`)
  const slices = []
  for (let top = 0, n = 0; top < total && n < 60; n++) {
    await js(`window.scrollTo(0, ${top}); 1`)
    await sleep(500)
    const y = await js(`window.scrollY`)
    const f = `ds/slice-${String(n).padStart(2, '0')}.jpg`
    slices.push({ file: f, top: y, ...(await shot(f, { x: 0, y: 0, width: W, height: H }, 1, 'jpeg')) })
    if (y + H >= total) break
    top = y + H
  }
  add({ kind: 'ds', height: total, width: W, slices })
}

/* ------------------------------------------------------------------ sections taller than the phone's screen, stitched */
async function tall() {
  const { readFile } = await import('node:fs/promises')
  const { execFileSync } = await import('node:child_process')
  const man = JSON.parse(await readFile(join(OUT, 'manifest-phone.json'), 'utf8'))
  const todo = man.entries.filter((e) => e.kind === 'note').map((n) => man.entries.find((e) => e.kind === 'section' && e.file === n.file)).filter(Boolean)
  await boot()
  await js(`showcase.mode('mobile'); window.scrollTo(0, 0); document.documentElement.classList.add('figcap-nomask'); 1`)
  await sleep(900)
  for (const e of todo) {
    await js(`punchApp.go('${e.page}', { player: 'me' }); 1`)
    await sleep(1200)
    await js(`document.querySelectorAll('#mApp > .m-status, #mApp > .m-nav, #mApp > .m-homebar').forEach(x => x.style.visibility = 'hidden'); showcase.sec('phone', '${e.page}', '${e.sec}', ${e.i}); 1`)
    await sleep(800)
    const scr = await rectOf(`document.getElementById('mApp')`)
    const pageSel = `document.querySelector('.m-page[data-page="${e.page}"]')`
    const secSel = `${pageSel}.querySelector('[data-sec="${e.sec}"]')`
    const total = await js(`${secSel}.getBoundingClientRect().height`)
    const parts = []
    let done = 0
    for (let n = 0; done < total && n < 12; n++) {
      // put the next unseen part of the section at the top of the screen
      await js(`(() => { const p = ${pageSel}, s = ${secSel}; p.scrollTop += s.getBoundingClientRect().top + ${done} - scr0(); return 1; function scr0() { return document.getElementById('mApp').getBoundingClientRect().top } })()`)
      await sleep(300)
      const r = await rectOf(secSel)
      const from = Math.max(scr.y, r.y + done), to = Math.min(scr.y + scr.height, r.y + total)
      if (to - from < 1) break
      const f = e.file.replace('.png', `-part${n}.png`)
      await shot(f, { x: r.x, y: from, width: r.width, height: to - from }, PS)
      parts.push(join(OUT, f))
      done += to - from
    }
    execFileSync('python', ['-c', `import sys
from PIL import Image
ims=[Image.open(p) for p in sys.argv[2:]]
W=ims[0].width
H=sum(i.height for i in ims)
out=Image.new('RGBA',(W,H))
y=0
for i in ims:
  out.paste(i,(0,y)); y+=i.height
out.save(sys.argv[1])`, join(OUT, e.file), ...parts])
    e.w = Math.round(e.w); e.h = Math.round(total * PS); e.stitched = parts.length
    console.log('stitched', e.file, parts.length, e.h)
  }
  man.entries = man.entries.filter((x) => x.kind !== 'note')
  await writeFile(join(OUT, 'manifest-phone.json'), JSON.stringify(man, null, 1))
}

try {
  if (ONLY === 'tall') await tall()
  if (ONLY === 'extras') await extras()
  if (ONLY === 'all' || ONLY === 'machine') await machine()
  if (ONLY === 'all' || ONLY === 'phone') await phone()
  if (ONLY === 'all' || ONLY === 'looks') await looks()
  if (ONLY === 'all' || ONLY === 'beats') await beats()
} finally {
  await writeFile(join(OUT, `manifest-${ONLY}.json`), JSON.stringify({ made: new Date().toISOString(), errors, entries: manifest }, null, 1))
  console.log('entries', manifest.length, 'page errors', errors.length)
  ws.close(); chrome.kill()
  await rm(profile, { recursive: true, force: true }).catch(() => {})
}
