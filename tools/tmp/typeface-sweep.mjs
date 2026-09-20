// Every machine screen and phone page under each typeface: which number or text elements overflow their box, and a
// contact sheet of the number-heavy screens so the shapes can be judged by eye.
// node tools/tmp/typeface-sweep.mjs
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9520 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'tf' + port)}`, '--window-size=1600,1100', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return JSON.stringify({ error: String(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text).slice(0, 200) }); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1100, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await mkdir('build/typefaces', { recursive: true })

const MS = ['default', 'attract', 'scan', 'countdown', 'loading', 'result', 'score', 'record']
const PP = ['default', 'scan', 'connect', 'connected', 'punch', 'topup', 'checkout', 'paid', 'failed', 'hit', 'ranks', 'feed', 'profile', 'reel']
const FACES = ['arena', 'orbitron', 'chakra']

// an element overflows when its content is wider than its box and nothing clips it, or when nowrap text is cut
const PROBE = (scopeSel) => `JSON.stringify((() => { try {
  const scope = document.querySelector('${scopeSel}')
  if (!scope) return { missing: true }
  const bad = []
  for (const el of scope.querySelectorAll('*')) {
    if (!el.offsetParent && el !== scope) continue
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') continue
    const text = (el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) ? el.textContent.trim().slice(0, 30) : ''
    if (!text) continue
    const over = el.scrollWidth - el.clientWidth
    const clipped = cs.overflowX !== 'visible' || cs.textOverflow === 'ellipsis'
    if (over > 2 && !clipped) bad.push({ cls: String(el.className).slice(0, 40), text, over, font: cs.fontFamily.split(',')[0].replace(/"/g, '') })
    else if (over > 2 && clipped && cs.textOverflow === 'ellipsis') bad.push({ cls: String(el.className).slice(0, 40), text, over, ellipsis: true, font: cs.fontFamily.split(',')[0].replace(/"/g, '') })
  }
  // also the screen itself spilling
  const r = scope.getBoundingClientRect()
  let spill = 0
  for (const el of scope.querySelectorAll('*')) { const b = el.getBoundingClientRect(); if (b.width && b.right > r.right + 2 && getComputedStyle(el).position !== 'fixed') spill = Math.max(spill, Math.round(b.right - r.right)) }
  return { bad: bad.slice(0, 12), count: bad.length, spill }
} catch (e) { return { error: String(e) } } })())`

const results = {}
for (const face of FACES) {
  await js(`window.showcase.mode('machine'); 1`); await sleep(1200)
  await js(`document.getElementById('openCustom').click(); 1`); await sleep(700)
  await js(`document.querySelector('.face-tile[data-typeface="${face}"]').click(); 1`); await sleep(900)
  await js(`document.getElementById('closeCustom').click(); 1`); await sleep(500)
  results[face] = { machine: {}, phone: {} }
  for (const s of MS) {
    await js(`window.showcase.mscreen('${s}'); 1`); await sleep(1500)
    results[face].machine[s] = JSON.parse(await js(PROBE(`.mscreen[data-mscreen="${s}"]`)))
    if (['default', 'countdown', 'score', 'record', 'result'].includes(s)) {
      const b = JSON.parse(await js(`JSON.stringify((() => { const r = document.querySelector('.mscreen[data-mscreen="${s}"]').getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top + scrollY), width: Math.round(r.width), height: Math.round(Math.min(r.height, 2200)) } })())`))
      const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80, captureBeyondViewport: true, clip: { ...b, scale: 0.35 } })
      if (shot.result && shot.result.data) await writeFile(`build/typefaces/${face}-m-${s}.jpg`, Buffer.from(shot.result.data, 'base64'))
    }
  }
  await js(`window.showcase.mode('mobile'); 1`); await sleep(1500)
  for (const p of PP) {
    await js(`window.punchApp.go('${p}'); 1`); await sleep(1300)
    results[face].phone[p] = JSON.parse(await js(PROBE(`.m-page[data-page="${p}"]:not([inert])`)))
    if (['default', 'hit', 'ranks', 'profile', 'topup'].includes(p)) {
      const b = JSON.parse(await js(`JSON.stringify((() => { const el = document.querySelector('.device-wrap') || document.querySelector('.m-page[data-page="${p}"]'); const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top + scrollY), width: Math.round(r.width), height: Math.round(r.height) } })())`))
      const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80, captureBeyondViewport: true, clip: { ...b, scale: 0.6 } })
      if (shot.result && shot.result.data) await writeFile(`build/typefaces/${face}-p-${p}.jpg`, Buffer.from(shot.result.data, 'base64'))
    }
  }
}
await writeFile('build/typefaces/sweep.json', JSON.stringify(results, null, 1))
for (const face of FACES) {
  const m = Object.entries(results[face].machine).map(([k, v]) => `${k}:${v.count || 0}${v.spill ? '/s' + v.spill : ''}`).join(' ')
  const p = Object.entries(results[face].phone).map(([k, v]) => `${k}:${v.count || 0}${v.spill ? '/s' + v.spill : ''}`).join(' ')
  console.log(`${face}\n  machine ${m}\n  phone   ${p}`)
}
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'tf' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
