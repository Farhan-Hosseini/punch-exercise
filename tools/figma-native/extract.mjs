// Serializes every design of every section, the chrome, the backgrounds and each page's base (its layout with the
// sections left as slots) from the running showcase, for tools/figma-native/renderer.js to rebuild natively in Figma.
// node tools/figma-native/extract.mjs [machine|phone|all]   ->  build/figma/native/items/*.json + index-<what>.json
import { spawn } from 'node:child_process'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const WHAT = process.argv[2] || 'all'
const ROOT = 'C:/Claude Database/punch-exercise'
const OUT = join(ROOT, 'build/figma/native/items')
const URL = 'http://localhost:5770/'
const W = 1440, H = 1080
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const port = 9800 + Math.floor(Math.random() * 150)
const profile = join(tmpdir(), 'fignat-' + port)
await mkdir(OUT, { recursive: true })
const SER = await readFile(join(ROOT, 'tools/figma-native/serialize.js'), 'utf8')

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let target
for (let i = 0; i < 60 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page') } catch { await sleep(150) } }
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
  if (r.result?.exceptionDetails) throw new Error('eval: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text) + '\n' + expr.slice(0, 300))
  return r.result?.result?.value
}
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })

const index = []
const allImages = new Set()
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
async function save(meta, res) {
  const file = `${slug(meta.surface)}-${slug(meta.page || meta.kind)}-${slug(meta.sec || meta.kind)}-${meta.i ?? 0}.json`
  for (const s of res.images) allImages.add(s)
  await writeFile(join(OUT, file), JSON.stringify(res.tree))
  const size = JSON.stringify(res.tree).length
  index.push({ ...meta, file, size, images: res.images })
  if (index.length % 25 === 0) console.log(index.length, file, size)
}
const ser = (sel, opts = {}) => js(`(() => { const el = ${sel}; if (!el) return null; return window.__figSer(el, ${JSON.stringify(opts)}) })()`)

async function boot() {
  await send('Page.navigate', { url: URL }); await sleep(1200)
  await js('localStorage.clear(); 1')
  await send('Page.navigate', { url: URL }); await sleep(4800)
  await js(`(() => {
    const st = document.createElement('style'); st.id = 'fignat'
    st.textContent = '.topbar, .custom, .custom-scrim { display: none !important } .device-island, .device-keys { visibility: hidden !important }'
      + ' html.figfull #mApp { height: auto !important; min-height: 956px }'
      + ' html.figfull .m-page.m-scroll.is-on { position: relative !important; inset: auto !important; height: auto !important; overflow: visible !important; -webkit-mask-image: none !important; mask-image: none !important }'
    document.head.appendChild(st)
    window.__st = window.__st || window.setTimeout
    window.setTimeout = (fn, ms, ...a) => (ms > 1200 ? 0 : window.__st(fn, ms, ...a))
    return 1 })()`)
  await js(SER + '; 1')
}

/* ------------------------------------------------------------------ the machine */
async function machine() {
  await boot()
  await js(`showcase.mode('machine'); showcase.zoom(100); window.scrollTo(0, 0); 1`)
  await sleep(900)
  const labels = await js(`Object.fromEntries([...document.querySelectorAll('.mpagebar [data-mscreen]')].map(b => [b.dataset.mscreen, b.textContent.trim()]))`)
  const screens = ['default', 'attract', 'scan', 'countdown', 'loading', 'result', 'score', 'record']
  for (const key of screens) {
    await js(`showcase.mscreen('${key}'); 1`)
    await sleep(1500)
    const rootSel = key === 'result' ? `document.getElementById('screen')` : `document.querySelector('.mscreen[data-mscreen="${key}"]')`
    if (key === 'result') {
      const slots = await js(`showcase.slots()`)
      const names = await js(`[...document.querySelectorAll('#secRows .sec-row .sec-name')].map(e => e.textContent.trim())`)
      // a section the result leaves switched off at rest (the kinematic breakdown) still belongs in the pack: switch
      // every eye on for the designs, and back to where it was for the base
      const eyesOn = await js(`(() => { const off = [...document.querySelectorAll('#secRows .eye')].filter(e => !e.checked); off.forEach(e => e.click()); return off.map(e => e.id) })()`)
      if (eyesOn.length) { console.log('switched on for the capture:', eyesOn.join(', ')); await sleep(600) }
      for (const [si, s] of slots.entries()) {
        for (let i = 0; i < s.designs.length; i++) {
          await js(`showcase.set('${s.key}', ${i}); 1`)
          await sleep(450)
          const pos = await js(`(() => { const r = document.querySelector('[data-slot="${s.key}"]').getBoundingClientRect(), g = ${rootSel}.getBoundingClientRect(); return { x: r.left - g.left, y: r.top - g.top, w: r.width, h: r.height } })()`)
          if (!pos || pos.h < 1) continue
          const res = await ser(`document.querySelector('[data-slot="${s.key}"]')`, { name: s.designs[i] })
          await save({ kind: 'section', surface: 'machine', page: key, pageLabel: labels[key] || key, sec: s.key, secLabel: names[si] || s.key, i, name: s.designs[i], ...pos }, res)
        }
        await js(`showcase.set('${s.key}', 0); 1`)
      }
      if (eyesOn.length) { await js(`(${JSON.stringify(eyesOn)}).forEach(id => { const e = document.getElementById(id); if (e.checked) e.click() }); 1`); await sleep(600) }
      await sleep(500)
      const res = await ser(rootSel, { name: labels[key] || key, skip: '[data-slot], .ms-lights' })
      await save({ kind: 'base', surface: 'machine', page: key, pageLabel: labels[key] || key }, res)
      continue
    }
    const secs = await js(`showcase.sections('machine', '${key}')`)
    for (const s of secs) {
      for (let i = 0; i < s.names.length; i++) {
        // Punch now runs its own clock: open it fresh for every design so it never moves on mid read
        if (key === 'countdown') { await js(`showcase.mscreen('countdown'); 1`); await sleep(900) }
        await js(`showcase.sec('machine', '${key}', '${s.key}', ${i}); 1`)
        await sleep(650)
        const sel = `document.querySelector('.mscreen[data-mscreen="${key}"] [data-sec="${s.key}"]:not([data-sec-scope="global"])')`
        const pos = await js(`(() => { const e = ${sel}; const r = e.getBoundingClientRect(), g = ${rootSel}.getBoundingClientRect(); return { x: r.left - g.left, y: r.top - g.top, w: r.width, h: r.height } })()`)
        // a section drawn over the whole glass (a stage, an overlay) has no box of its own: take the glass
        const whole = !pos || pos.h < 2 || pos.w < 2
        const res = whole ? await ser(rootSel, { name: s.names[i], skip: '[data-sec]:not([data-sec="' + s.key + '"]), .ms-lights' }) : await ser(sel, { name: s.names[i] })
        await save({ kind: 'section', surface: 'machine', page: key, pageLabel: labels[key] || key, sec: s.key, secLabel: s.label, i, name: s.names[i], whole, ...(whole ? { x: 0, y: 0, w: 1080, h: 3840 } : pos) }, res)
      }
      await js(`showcase.sec('machine', '${key}', '${s.key}', 0); 1`)
    }
    if (key === 'countdown') { await js(`showcase.mscreen('countdown'); 1`); await sleep(900) }
    await sleep(400)
    const res = await ser(rootSel, { name: labels[key] || key, skip: '[data-sec], .ms-lights' })
    await save({ kind: 'base', surface: 'machine', page: key, pageLabel: labels[key] || key }, res)
  }
  // the shared chrome: header and sponsor strip, on the Home screen
  await js(`showcase.mscreen('default'); 1`)
  await sleep(1200)
  for (const s of await js(`showcase.sections('global', 'all')`)) {
    if (s.key === 'tabbar') continue
    for (let i = 0; i < s.names.length; i++) {
      await js(`showcase.sec('global', 'all', '${s.key}', ${i}); 1`)
      await sleep(600)
      const sel = s.key === 'mheader'
        ? `[...document.querySelectorAll('.mscreen[data-mscreen="default"] [data-sec="mheader"] > [data-sv]')].find(d => !d.hidden)`
        : `document.querySelector('.mscreen[data-mscreen="default"] [data-sec="${s.key}"]')`
      const pos = await js(`(() => { const r = (${sel}).getBoundingClientRect(), g = document.querySelector('.mscreen[data-mscreen="default"]').getBoundingClientRect(); return { x: r.left - g.left, y: r.top - g.top, w: r.width, h: r.height } })()`)
      const res = await ser(sel, { name: s.names[i] })
      await save({ kind: 'chrome', surface: 'machine', sec: s.key, secLabel: s.label, i, name: s.names[i], ...pos }, res)
    }
    await js(`showcase.sec('global', 'all', '${s.key}', 0); 1`)
  }
  // the grounds, from the Home screen's backdrop host
  const keys = await js(`(() => { const out = []; const seen = new Set(); let k = showcase.backdrop(); for (let n = 0; n < 12; n++) { if (seen.has(k)) break; seen.add(k); out.push(k); const b = document.querySelector('#globalRows .sec-row .sec-btn[data-dir="1"]'); if (!b) break; b.click(); k = document.documentElement.dataset.mbackdrop } return out })()`)
  for (const [i, k] of keys.entries()) {
    await js(`showcase.backdrop('${k}'); 1`)
    await sleep(500)
    const sel = `document.querySelector('.mscreen[data-mscreen="default"] .ms-lights')`
    const pos = await js(`(() => { const r = (${sel}).getBoundingClientRect(), g = document.querySelector('.mscreen[data-mscreen="default"]').getBoundingClientRect(); return { x: r.left - g.left, y: r.top - g.top, w: r.width, h: r.height } })()`)
    const res = await ser(sel, { name: k })
    await save({ kind: 'background', surface: 'machine', sec: 'background', secLabel: 'Background', i, name: k, ...pos }, res)
  }
  await js(`showcase.backdrop('${keys[0]}'); 1`)
}

/* ------------------------------------------------------------------ the phone */
async function phone() {
  await boot()
  await js(`showcase.mode('mobile'); window.scrollTo(0, 0); document.documentElement.classList.add('figfull'); 1`)
  await sleep(900)
  const labels = await js(`Object.fromEntries([...document.querySelectorAll('.pagebar [data-page]')].map(b => [b.dataset.page, b.textContent.trim()]))`)
  const pages = process.env.PAGES ? process.env.PAGES.split(',') : ['default', 'scan', 'connect', 'connected', 'punch', 'topup', 'checkout', 'paid', 'failed', 'hit', 'reel', 'ranks', 'feed', 'profile']
  const app = `document.getElementById('mApp')`
  for (const key of pages) {
    await js(`punchApp.go('${key}', { player: 'me' }); window.scrollTo(0, 0); 1`)
    await sleep(1400)
    const pageSel = `document.querySelector('.m-page[data-page="${key}"]')`
    const secs = await js(`showcase.sections('phone', '${key}')`)
    for (const s of secs) {
      for (let i = 0; i < s.names.length; i++) {
        await js(`showcase.sec('phone', '${key}', '${s.key}', ${i}); 1`)
        await sleep(650)
        const sel = `${pageSel}.querySelector('[data-sec="${s.key}"]')`
        const pos = await js(`(() => { const e = ${sel}; if (!e) return null; const r = e.getBoundingClientRect(), g = ${app}.getBoundingClientRect(); return { x: r.left - g.left, y: r.top - g.top, w: r.width, h: r.height } })()`)
        const whole = !pos || pos.h < 2 || pos.w < 2
        let res
        if (whole) {
          // an overlay (a sheet): take the open dialog over the whole screen
          const dsel = `[...${app}.querySelectorAll('[role=dialog], .m-sheet')].find(d => !d.hidden && d.getBoundingClientRect().height > 50)`
          res = await ser(dsel, { name: s.names[i] }) || await ser(app, { name: s.names[i] })
        } else res = await ser(sel, { name: s.names[i] })
        await save({ kind: 'section', surface: 'phone', page: key, pageLabel: labels[key] || key, sec: s.key, secLabel: s.label, i, name: s.names[i], whole, ...(whole ? { x: 0, y: 0, w: 440, h: 956 } : pos) }, res)
      }
      await js(`showcase.sec('phone', '${key}', '${s.key}', 0); 1`)
      await js(`(() => { const sh = [...document.querySelectorAll('#mApp [role=dialog], #mApp .m-sheet')].find(d => !d.hidden); if (sh) { const b = sh.querySelector('button[id$=Ok], [data-close], .m-sheet-scrim'); if (b) b.click() } return 1 })()`)
      await sleep(300)
    }
    // the page with its sections left as slots, at its full height, with the status bar, the tab bar and the ground as slots
    await sleep(400)
    const height = await js(`Math.max(956, Math.round(${app}.getBoundingClientRect().height))`)
    const res = await ser(app, { name: labels[key] || key, height, skip: '[data-sec], #mApp > .m-bg, #mApp > .m-status' })
    await save({ kind: 'base', surface: 'phone', page: key, pageLabel: labels[key] || key, h: height }, res)
  }
  // the chrome: the status bar and the tab bar's styles
  await js(`punchApp.go('default'); 1`)
  await sleep(1000)
  const st = await ser(`document.querySelector('#mApp > .m-status')`, { name: 'Status bar' })
  await save({ kind: 'chrome', surface: 'phone', sec: 'status', secLabel: 'Status bar', i: 0, name: 'Status bar', x: 0, y: 0 }, st)
  const tb = await js(`showcase.sections('global', 'all').find(s => s.key === 'tabbar')`)
  for (let i = 0; i < tb.names.length; i++) {
    await js(`showcase.sec('global', 'all', 'tabbar', ${i}); 1`)
    await sleep(600)
    const pos = await js(`(() => { const r = document.querySelector('#mApp > .m-nav').getBoundingClientRect(), g = ${app}.getBoundingClientRect(); return { x: r.left - g.left, y: r.top - g.top, w: r.width, h: r.height } })()`)
    const res = await ser(`document.querySelector('#mApp > .m-nav')`, { name: tb.names[i] })
    await save({ kind: 'chrome', surface: 'phone', sec: 'tabbar', secLabel: 'Tab bar', i, name: tb.names[i], ...pos }, res)
  }
  await js(`showcase.sec('global', 'all', 'tabbar', 0); 1`)
  const keys = await js(`(() => { const out = []; const seen = new Set(); let k = showcase.backdrop(); for (let n = 0; n < 12; n++) { if (seen.has(k)) break; seen.add(k); out.push(k); const b = document.querySelector('#globalRows .sec-row .sec-btn[data-dir="1"]'); if (!b) break; b.click(); k = document.documentElement.dataset.mbackdrop } return out })()`)
  for (const [i, k] of keys.entries()) {
    await js(`showcase.backdrop('${k}'); 1`)
    await sleep(500)
    await js(`document.documentElement.classList.remove('figfull'); 1`)
    const res = await ser(`document.querySelector('#mApp > .m-bg')`, { name: k })
    await js(`document.documentElement.classList.add('figfull'); 1`)
    await save({ kind: 'background', surface: 'phone', sec: 'background', secLabel: 'Background', i, name: k, x: 0, y: 0, w: 440, h: 956 }, res)
  }
  await js(`showcase.backdrop('${keys[0]}'); 1`)
}

/* ------------------------------------------------------------------ the four looks: Home, whole, in each */
async function looks() {
  await boot()
  const LOOKS = [['arena', 'dark', 'Arena dark'], ['arena', 'light', 'Arena light'], ['reference', 'dark', 'Reference dark'], ['reference', 'light', 'Reference light']]
  for (const [i, [variant, appearance, label]] of LOOKS.entries()) {
    await js(`showcase.theme('${variant}'); showcase.appearance('${appearance}'); 1`)
    await js(`showcase.mode('machine'); showcase.zoom(100); window.scrollTo(0, 0); showcase.mscreen('default'); 1`)
    await sleep(1600)
    const m = await ser(`document.querySelector('.mscreen[data-mscreen="default"]')`, { name: label })
    await save({ kind: 'look', surface: 'machine', page: 'look', sec: slug(label), secLabel: label, i, name: label, x: 0, y: 0, w: 1080, h: 3840 }, m)
    await js(`showcase.mode('mobile'); window.scrollTo(0, 0); punchApp.go('default'); 1`)
    await sleep(1600)
    const p = await ser(`document.getElementById('mApp')`, { name: label })
    await save({ kind: 'look', surface: 'phone', page: 'look', sec: slug(label), secLabel: label, i, name: label, x: 0, y: 0, w: 440, h: 956 }, p)
  }
  await js(`showcase.theme('arena'); showcase.appearance('dark'); 1`)
}

// debug: serialize one element and print the tree outline
async function probe() {
  await boot()
  await js(process.env.SETUP || '1')
  await sleep(1500)
  const res = await ser(process.env.SEL)
  const lines = []
  const walk = (n, d) => { lines.push('  '.repeat(d) + (n.t === 't' ? 'T ' + n.runs.map((r) => r.s).join('|') : n.t + ' ' + (n.n || n.name || '') + ' ' + n.w + 'x' + n.h)); for (const k of n.k || []) walk(k, d + 1) }
  if (res) walk(res.tree, 0)
  console.log(lines.join(String.fromCharCode(10)))
}

try {
  if (WHAT === 'probe') await probe()
  if (WHAT === 'looks') await looks()
  if (WHAT === 'all' || WHAT === 'machine') await machine()
  if (WHAT === 'all' || WHAT === 'phone') await phone()
} finally {
  await writeFile(join(ROOT, `build/figma/native/index-${WHAT}.json`), JSON.stringify({ errors, items: index, images: [...allImages] }, null, 1))
  console.log('items', index.length, 'images', allImages.size, 'page errors', errors.length)
  ws.close(); chrome.kill()
  await rm(profile, { recursive: true, force: true }).catch(() => {})
}
