import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text) })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return JSON.stringify({ __err: r.result.exceptionDetails.text + ' ' + (r.result.exceptionDetails.exception?.description || '') }); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)

const findBtn = `JSON.stringify((() => {
  const all = [...document.querySelectorAll('button')]
  const b = all.find((x) => /customise/i.test(x.textContent || ''))
  if (!b) return null
  const r = b.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, txt: b.textContent.trim(), id: b.id, cls: b.className }
})())`
const bb = JSON.parse(await js(findBtn))
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: bb.x, y: bb.y, button: 'left', clickCount: 1 })
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: bb.x, y: bb.y, button: 'left', clickCount: 1 })
await sleep(1200)

const step1 = JSON.parse(await js(`JSON.stringify((() => {
  const tile = document.querySelector('.face-tile')
  if (!tile) return { no: 'no .face-tile in DOM' }
  const anc = []
  let e = tile.parentElement
  while (e && e !== document.body) { anc.push({ tag: e.tagName.toLowerCase(), cls: String(e.className).slice(0, 44), open: e.tagName === 'DETAILS' ? e.open : undefined }); e = e.parentElement }
  return { panelClass: document.querySelector('.custom') ? document.querySelector('.custom').className : null, tileVisible: tile.checkVisibility(), ancestors: anc.slice(0, 9) }
})())`))

// open any closed <details> ancestor through its real summary click
const opened = await js(`(() => { let e = document.querySelector('.face-tile'); let n = 0; while (e && e !== document.body) { if (e.tagName === 'DETAILS' && !e.open) { const s = e.querySelector('summary'); if (s) { s.click(); n++ } } e = e.parentElement } return n })()`)
await sleep(800)
await js(`document.querySelector('.face-tile').scrollIntoView({ block: 'center' }); 1`)
await sleep(700)

const measure = `JSON.stringify((() => {
  const srgb = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
  const L = (a) => 0.2126 * srgb(a[0]) + 0.7152 * srgb(a[1]) + 0.0722 * srgb(a[2])
  const cr = (a, b) => { const l1 = L(a), l2 = L(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) }
  const parse = (s) => { const m = String(s).match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[,\\s\\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] } }
  const over = (fg, bg) => [fg.r * fg.a + bg[0] * (1 - fg.a), fg.g * fg.a + bg[1] * (1 - fg.a), fg.b * fg.a + bg[2] * (1 - fg.a)].map((v) => Math.round(v))
  const stack = (el) => { let e = el; const chain = []; while (e) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) chain.push(c); if (c && c.a === 1) break; e = e.parentElement } let out = [255, 255, 255]; for (let i = chain.length - 1; i >= 0; i--) out = over(chain[i], out); return out }
  const tile = document.querySelector('.face-tile')
  const n = tile.querySelector('.face-tile-n'), s = tile.querySelector('.face-tile-s')
  const cs = getComputedStyle(tile), csn = getComputedStyle(n), cssS = getComputedStyle(s)
  const panel = document.querySelector('.custom')
  const tileBg = stack(tile)
  const inkN = parse(csn.color), inkS = parse(cssS.color)
  const effN = over({ r: inkN.r, g: inkN.g, b: inkN.b, a: inkN.a * parseFloat(csn.opacity) }, tileBg)
  const effS = over({ r: inkS.r, g: inkS.g, b: inkS.b, a: inkS.a * parseFloat(cssS.opacity) }, tileBg)
  const rt = getComputedStyle(document.documentElement)
  const r = tile.getBoundingClientRect()
  return {
    appearance: document.documentElement.dataset.appearance,
    shellPillToken: rt.getPropertyValue('--shell-pill').trim(),
    panelBgToken: rt.getPropertyValue('--panel-bg').trim(),
    panelInkToken: rt.getPropertyValue('--panel-ink').trim(),
    panelComputedBg: getComputedStyle(panel).backgroundColor,
    panelStack: stack(panel),
    tileBgDeclared: cs.backgroundColor,
    tileBgComposite: tileBg,
    tileRect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    tileVisible: tile.checkVisibility(),
    faceTileN: { color: csn.color, opacity: csn.opacity, size: cssS && csn.fontSize, weight: csn.fontWeight, eff: effN, contrast: +cr(effN, tileBg).toFixed(3), text: n.textContent },
    faceTileS: { color: cssS.color, opacity: cssS.opacity, size: cssS.fontSize, weight: cssS.fontWeight, eff: effS, contrast: +cr(effS, tileBg).toFixed(3), text: s.textContent },
    tileVsPanel: +cr(tileBg, stack(panel)).toFixed(3),
    allTileBgs: [...document.querySelectorAll('.face-tile')].map((x) => getComputedStyle(x).backgroundColor)
  }
})())`

const dark = JSON.parse(await js(measure))
const clip = JSON.parse(await js(`JSON.stringify((() => { const r = document.querySelector('.faces').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, scale: 3 } })())`))
const s1 = await send('Page.captureScreenshot', { format: 'png', clip })
await writeFile('build/skeptic/faces-dark.png', Buffer.from(s1.result.data, 'base64'))

await js(`document.querySelector('[data-appearance-btn="light"]').click(); 1`); await sleep(1000)
await js(`document.querySelector('.face-tile').scrollIntoView({ block: 'center' }); 1`); await sleep(500)
const light = JSON.parse(await js(measure))
const clip2 = JSON.parse(await js(`JSON.stringify((() => { const r = document.querySelector('.faces').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, scale: 3 } })())`))
const s2 = await send('Page.captureScreenshot', { format: 'png', clip: clip2 })
await writeFile('build/skeptic/faces-light.png', Buffer.from(s2.result.data, 'base64'))

console.log(JSON.stringify({ btn: bb, detailsOpened: opened, step1, dark, light, errs: errs.slice(0, 5) }, null, 1))
ws.close(); chrome.kill()
