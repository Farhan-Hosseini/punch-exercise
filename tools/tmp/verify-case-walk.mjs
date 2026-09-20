// Reviewer's walk through the machine chapter: a real scroll (not forced) with a frame every viewport, and at each
// frame the nav's ground and current link, the active beat, then the chapter's contrast rows and the reveal count.
// node tools/tmp/verify-case-walk.mjs <width> <out prefix> [scale]
import { spawn } from 'node:child_process'
import { writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = Number(process.argv[2] || 1440), PRE = process.argv[3] || 'build/anim/verify-case-walk', SCALE = Number(process.argv[4] || 0.5)
const V = 900
const port = 9700 + Math.floor(Math.random() * 90)
const dir = join(tmpdir(), 'vw' + port)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, `--window-size=${W},${V}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).split('\n')[0])
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map((a) => a.value || a.description).join(' ').split('\n')[0])
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: V, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)
await js("document.getElementById('openCase').click(); 1"); await sleep(4000)
const span = JSON.parse(await js(`JSON.stringify((() => { const sc = document.getElementById('caseScroll'), el = document.getElementById('case-machine'); const r = el.getBoundingClientRect(), s = sc.getBoundingClientRect(); return { top: r.top - s.top + sc.scrollTop, h: r.height } })())`))
// creep up to the chapter first so the reader's own scroll settles the rises, then frame it viewport by viewport
for (let y = span.top - 1800; y < span.top - 500; y += 300) { await js(`document.getElementById('caseScroll').scrollTo(0, ${Math.max(0, y)}); 1`); await sleep(100) }
const frames = []
let i = 0
for (let y = span.top - 500; y < span.top + span.h + 200; y += V - 100, i++) {
  await js(`document.getElementById('caseScroll').scrollTo(0, ${Math.max(0, y)}); 1`); await sleep(900)
  const st = JSON.parse(await js(`JSON.stringify((() => { const nav = document.querySelector('.cs-localnav'); const cur = document.querySelector('.cs-localnav-links a[aria-current]'); const seq = document.querySelector('.cs-seq-machine'); return { y: document.getElementById('caseScroll').scrollTop, navGround: nav.dataset.ground, current: cur ? cur.textContent.trim() : null, screen: seq.dataset.screen, zoom: seq.dataset.zoom || null, beat: seq.querySelector('.cs-beat.is-active')?.dataset.screen || null } })())`))
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: W, height: V, scale: SCALE } })
  const out = `${PRE}-${W}-f${String(i).padStart(2, '0')}.png`
  if (shot.result) await writeFile(out, Buffer.from(shot.result.data, 'base64'))
  frames.push({ out, ...st })
}
console.log(JSON.stringify(frames, null, 1))
console.log(await js(`JSON.stringify((() => {
  const el = document.getElementById('case-machine')
  const lum = (c) => { const [r, g, b] = c.match(/[\\d.]+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return +(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2)) }
  const alpha = (c) => { const m = c.match(/[\\d.]+/g); return m && m.length > 3 ? Number(m[3]) : (c === 'transparent' ? 0 : 1) }
  const groundOf = (n) => { for (let e = n; e; e = e.parentElement) { const bg = getComputedStyle(e).backgroundColor; if (alpha(bg) === 1) return bg } return 'rgb(0, 0, 0)' }
  const rows = []
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const seen = new Set()
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue
    const e = n.parentElement
    if (seen.has(e) || e.closest('iframe, svg')) continue
    seen.add(e)
    const cs = getComputedStyle(e)
    if (cs.display === 'none' || cs.visibility === 'hidden') continue
    const ground = groundOf(e)
    rows.push({ tag: e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).split(' ')[0] : ''), text: n.textContent.trim().slice(0, 30), color: cs.color, ground, ratio: ratio(cs.color, ground), size: parseFloat(cs.fontSize), opacity: cs.opacity })
  }
  rows.sort((a, b) => a.ratio - b.ratio)
  const rises = [...el.querySelectorAll('[data-rise]')]
  const btns = [...el.querySelectorAll('.cs-btn')].map((b) => { const cs = getComputedStyle(b); return { text: b.textContent.trim(), color: cs.color, bg: cs.backgroundColor, border: cs.borderColor, ratioOnBg: alpha(cs.backgroundColor) === 1 ? ratio(cs.color, cs.backgroundColor) : ratio(cs.color, 'rgb(0, 0, 0)') } })
  // the heights figure's band labels: do they run past the viewport at this width
  const hx = [...document.querySelectorAll('.cs-heights-svg .hx-band-t, .cs-heights-svg .hx-serve-t')].map((t) => { const r = t.getBoundingClientRect(); return { text: t.textContent, right: Math.round(r.right), vw: innerWidth, over: Math.round(r.right - innerWidth) } })
  const capP = document.querySelector('.cs-heights-cap p')
  return {
    order: [...document.querySelectorAll('#case .cs-sec[id]')].map((s) => s.id),
    nav: [...document.querySelectorAll('.cs-localnav-links a')].map((a) => a.textContent.trim() + '>' + a.getAttribute('href')),
    ground: { attr: el.dataset.ground, cls: el.className, bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color, prev: el.previousElementSibling.id + ' ' + getComputedStyle(el.previousElementSibling).backgroundColor, next: el.nextElementSibling.id + ' ' + getComputedStyle(el.nextElementSibling).backgroundColor },
    rises: rises.length + ' rises, ' + rises.filter((r) => r.classList.contains('is-in')).length + ' settled',
    embed: el.querySelector('iframe[data-embed]')?.src || null,
    lowest: rows.slice(0, 5),
    under45: rows.filter((r) => r.ratio < 4.5).map((r) => r.tag + ' ' + r.ratio),
    textCount: rows.length,
    buttons: btns,
    heightsLabels: hx,
    heightsCap: capP ? { chars: capP.textContent.length, sentences: capP.textContent.split(/\\.\\s|\\.$/).filter(Boolean).length, w: Math.round(capP.getBoundingClientRect().width), font: getComputedStyle(capP).font } : null,
    glassShadow: getComputedStyle(el.querySelector('.cs-glass-screen')).boxShadow,
  }
})())`, null, 1))
console.log('errors:', JSON.stringify(errs.slice(0, 6)))
ws.close(); chrome.kill()
// the throwaway profile is ~57 MB; left behind, a day of shots fills the disk
await sleep(600); await rm(dir, { recursive: true, force: true }).catch(() => {})
