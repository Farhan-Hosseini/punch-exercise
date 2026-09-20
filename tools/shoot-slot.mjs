// Render every design of one section in Arena, dark and light, cropped to the section, and report overflow.
// node tools/shoot-slot.mjs <slot> [dark|light|both] [outDir]
// Needs the showcase server on http://localhost:5770.
import { spawn } from 'node:child_process'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const slot = process.argv[2]
if (!slot) { console.error('usage: node tools/shoot-slot.mjs <slot> [dark|light|both] [outDir]'); process.exit(1) }
const LOOKS = { dark: ['dark'], light: ['light'], both: ['dark', 'light'] }[process.argv[3] || 'both'] || ['dark', 'light']
const outDir = process.argv[4] || join('build', 'slots', slot)
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const port = 9800 + Math.floor(Math.random() * 1000)
const profile = join(tmpdir(), 'shoot-slot-' + port)
await mkdir(outDir, { recursive: true })
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let target
for (let i = 0; i < 80 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page') } catch { await sleep(150) } }
if (!target) { chrome.kill(); throw new Error('Chrome did not start') }
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pending = new Map(); const errors = []
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '))
})
const send = (method, params = {}) => new Promise((r) => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })) })
const js = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description); return r.result?.result?.value }

await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
await send('Page.navigate', { url: 'http://localhost:5770/' })
await sleep(2500)
await js(`localStorage.clear(); document.getElementById('loader').classList.add('is-done'); document.querySelector('.topbar').style.visibility = 'hidden'; 1`)
// the showcase opens on the phone, so the glass has to be brought up before a section can be shot
await js(`window.showcase.mode('machine'); window.showcase.mscreen('result'); 1`)
await sleep(1200)
const designs = await js(`window.showcase.slots().find(s => s.key === ${JSON.stringify(slot)}).designs`)
console.log(`${slot}: ${designs.length} designs: ${designs.join(', ')}`)

const probe = `(() => {
  const sec = document.querySelector('[data-slot=${JSON.stringify(slot)}]')
  const screen = document.getElementById('screen').getBoundingClientRect()
  const zoom = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--zoom'))
  const fit = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fit')) || 1
  const pad = parseFloat(getComputedStyle(document.getElementById('screenContent')).paddingLeft) * zoom * fit
  const inner = { left: screen.left + pad, right: screen.right - pad }
  const active = [...sec.querySelectorAll(':scope > .vars > .var')].find(v => !v.hidden)
  const bad = []
  for (const el of active.querySelectorAll('*')) {
    const r = el.getBoundingClientRect()
    if (!r.width || getComputedStyle(el).visibility === 'hidden' || el.closest('.sr-only')) continue
    const bleed = el.closest('[data-bleed]')
    const lim = bleed ? screen : inner
    if (r.left < lim.left - 1 || r.right > lim.right + 1) bad.push((el.className?.baseVal ?? el.className) + ' "' + (el.textContent || '').trim().slice(0, 18) + '" out by ' + Math.round(Math.max(lim.left - r.left, r.right - lim.right) / zoom) + ' units')
    if (getComputedStyle(el).whiteSpace === 'nowrap' && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible') bad.push('clipped text: ' + (el.textContent || '').trim().slice(0, 18))
  }
  const box = sec.getBoundingClientRect()
  return { height: window.showcase.sectionHeight(${JSON.stringify(slot)}), bad: [...new Set(bad)].slice(0, 12), clip: { x: Math.max(0, screen.left - 24), y: box.top + scrollY - 32, width: screen.width + 48, height: box.height + 64 } }
})()`

// height budgets at breathing room 100, in glass pixels, so any combination fits the 3840 glass
const BUDGET = { header: 180, hero: 640, ranks: 480, stats: 600, video: 620, clips: 380, photo: 430, cta: 200, sponsor: 120 }
const report = []
for (const look of LOOKS) {
  for (let i = 0; i < designs.length; i++) {
    for (const space of [70, 100, 125]) {
      await js(`window.showcase.theme('arena'); window.showcase.appearance('${look}'); window.showcase.zoom(64); window.showcase.space(${space}); window.showcase.set(${JSON.stringify(slot)}, ${i}); document.querySelector('[data-slot=${JSON.stringify(slot)}]').scrollIntoView({ block: 'start', behavior: 'instant' }); 1`)
      await sleep(300)
      const { bad, clip, height } = await js(probe)
      const letter = String.fromCharCode(97 + i)
      const name = `${letter}-${look}-${space}`
      if (space === 100 || space === 125) {
        const shot = await send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 0.75 }, captureBeyondViewport: true })
        await writeFile(join(outDir, name + '.png'), Buffer.from(shot.result.data, 'base64'))
      }
      const budget = BUDGET[slot]
      const tall = space === 100 && height > budget ? `TOO TALL: ${height} px, budget ${budget} px` : ''
      report.push(`${name.padEnd(17)} ${designs[i].padEnd(20)} h=${String(height).padEnd(5)} ${bad.length ? 'OVERFLOW: ' + bad.join(' | ') : (tall || 'clean')}`)
    }
  }
}
console.log(report.join('\n'))
if (errors.length) console.log('page errors:\n  ' + errors.join('\n  '))
console.log('screenshots in ' + outDir)
ws.close(); chrome.kill(); await sleep(300); await rm(profile, { recursive: true, force: true }).catch(() => {})
