import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sw' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return JSON.stringify({ __err: r.result.exceptionDetails.text }); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)
await js(`document.getElementById('openCustom').click(); 1`); await sleep(1000)
await js(`document.querySelectorAll('.custom details').forEach(d => { if (!d.open) d.querySelector('summary')?.click() }); 1`); await sleep(900)

// Sweep every text node inside the open panel: composite its background, compute contrast.
const res = await js(`JSON.stringify((() => {
  const srgb = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
  const L = (a) => 0.2126 * srgb(a[0]) + 0.7152 * srgb(a[1]) + 0.0722 * srgb(a[2])
  const cr = (a, b) => { const l1 = L(a), l2 = L(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) }
  const parse = (s) => { const m = String(s).match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[,\\s\\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] } }
  const over = (fg, bg) => [fg.r * fg.a + bg[0] * (1 - fg.a), fg.g * fg.a + bg[1] * (1 - fg.a), fg.b * fg.a + bg[2] * (1 - fg.a)].map((v) => Math.round(v))
  const stack = (el) => { let e = el; const chain = []; while (e) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) chain.push(c); if (c && c.a === 1) break; e = e.parentElement } let out = [255, 255, 255]; for (let i = chain.length - 1; i >= 0; i--) out = over(chain[i], out); return out }
  const eff = (el) => { let o = 1, e = el; while (e) { const v = parseFloat(getComputedStyle(e).opacity); if (!isNaN(v)) o *= v; e = e.parentElement } return o }
  const panel = document.querySelector('.custom')
  const bad = []
  const seen = new Set()
  panel.querySelectorAll('*').forEach((el) => {
    const txt = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ')
    if (!txt) return
    if (!el.checkVisibility()) return
    const cs = getComputedStyle(el)
    const size = parseFloat(cs.fontSize), w = parseInt(cs.fontWeight) || 400
    const large = size >= 24 || (size >= 18.66 && w >= 700)
    const bg = stack(el)
    const ink = parse(cs.color)
    if (!ink) return
    const o = eff(el)
    const e2 = over({ r: ink.r, g: ink.g, b: ink.b, a: ink.a * o }, bg)
    const ratio = cr(e2, bg)
    const need = large ? 3 : 4.5
    const key = el.className + '|' + txt.slice(0, 20)
    if (ratio < need && !seen.has(key)) { seen.add(key); bad.push({ cls: String(el.className).slice(0, 40), txt: txt.slice(0, 28), size, w, large, bg, ink: e2, ratio: +ratio.toFixed(2), need }) }
  })
  // which elements in the panel resolve a --shell-* background token
  const shellUsers = [...panel.querySelectorAll('*')].filter((el) => {
    const c = getComputedStyle(el).backgroundColor
    return c === 'rgba(20, 19, 18, 0.72)' || c === 'rgb(242, 239, 234)'
  }).map((el) => String(el.className).slice(0, 30))
  return { appearance: document.documentElement.dataset.appearance, failures: bad.sort((a, b) => a.ratio - b.ratio).slice(0, 12), shellTokenBackgroundsInPanel: [...new Set(shellUsers)] }
})())`)
console.log(res)
ws.close(); chrome.kill()
