/* ==========================================================================
   The run, recorded from the live phone.

   The second motion deliverable: one turn on PunchApp as the app plays it, from the home screen to the replay in your
   hand. Like tools/record-reveal.mjs it loads the showcase in headless Chrome, takes the page's clock (tools/vclock.mjs)
   and steps it frame by frame, so every frame is the instant it claims to be however long the capture takes. The phone
   is captured at its own size, two device pixels to one CSS pixel.

   Most of the run is the app's own: the scan finds the machine, the link finds an empty wallet and opens the shop,
   Paid sends the player back to the link, Connected sends them to the pad, the strike lands, the glass reads it and
   Your hit opens by itself. The recorder starts the scan, taps the link, picks a pack and pays with the phone's own
   wallet, taps Punch now, and brings the strike forward, because a real turn waits five to twelve seconds for it.

     node tools/record-run.mjs --stills 0,2,5,9,13,16 --dir C:/gtmp/punch/run     PNG stills at clip times
     node tools/record-run.mjs --lossless C:/gtmp/punch/run/phone.mkv              every frame, lossless
     node tools/record-run.mjs --beats                                             the beats as JSON

   Options: --fps 60, --url, --scale 2 (device pixels per CSS pixel), --from / --to (clip seconds)
   ========================================================================== */
import { spawn } from 'node:child_process'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { SHIM } from './vclock.mjs'

const args = process.argv.slice(2)
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 && !String(args[i + 1] ?? '').startsWith('--') ? args[i + 1] : def }
const flag = (name) => args.includes(`--${name}`)

const URL_ = opt('url', 'http://localhost:5770/')
const FPS = Number(opt('fps', 60))
const SCALE = Number(opt('scale', 2))
const DIR = opt('dir', 'C:/gtmp/punch/run')
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const DEBUG_PORT = 9760 + Math.floor(Math.random() * 100)
const profile = `C:/gtmp/punch/run-profile-${process.pid}`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ------------------------------------------------------------ the beats, in clip seconds */
const STRIKE_IN = 1.8       // how long the countdown runs before the strike is brought forward
const PUNCH = 20.50         // the pad, once the credit is bought and the link taken up again
export const BEATS = {
  home: 0,
  scan: 1.00,               // the scan page opens; the code is read 0.7 s later
  read: 1.70,
  link: 3.40,               // the machine is found and the phone links to it
  tap: 4.30,                // the link finishes; the wallet is empty, so the shop opens 2.2 s later
  topup: 6.50,              // Buy credits: the packs, one picked 1.1 s later
  pick: 7.60,
  checkout: 8.60,           // Continue: Pay with, the phone's own wallet chosen, then Pay
  method: 9.40,
  pay: 10.20,               // the wallet sheet: side button, Face ID, processing, done, 5.6 s in all
  paid: 15.80,              // Paid: the receipt, and Punch now takes the link up again
  again: 18.20,
  punch: PUNCH,             // the pad: the phone says what to do while the glass keeps the count
  strike: PUNCH + STRIKE_IN,
  hit: PUNCH + STRIKE_IN + 1.2 + 2.56,   // landed (1.2 s), then the glass reads it (2.56 s), then Your hit counts up
  reel: PUNCH + 8.80,       // the replay, the score burnt in, ready to share; it plays through to its end
  end: PUNCH + 15.80,
}
if (flag('beats')) { console.log(JSON.stringify(BEATS)); process.exit(0) }
const FROM = Number(opt('from', 0)), TO = Number(opt('to', BEATS.end))

// bring the strike forward: startRun sets it five to twelve seconds out, which is a real turn but not a clip
const SOON = `(() => {
  const V = window.__vt
  const late = [...V.timers.values()].filter((t) => !t.every && t.at - V.t >= 4000).sort((a, b) => a.at - b.at)
  if (!late.length) return 'no strike timer'
  late[0].at = V.t + ${STRIKE_IN * 1000}
  return late.length
})()`

const CUES = [
  { at: -1.2, label: 'home', js: `window.punchApp.go('default')` },
  { at: BEATS.scan, label: 'scan', js: `window.punchApp.go('scan')` },
  { at: BEATS.read, label: 'read the code', js: `document.querySelector('.m-scan [data-scan-go]').click()` },
  { at: BEATS.link, label: 'link', js: `window.punchApp.go('connect', { flow: true })` },
  { at: BEATS.tap, label: 'linked', js: `document.getElementById('mConnect').click()` },
  { at: BEATS.pick, label: 'pick a pack', js: `(() => { const b = document.querySelector('#payPacks [role="radio"][data-pack="1"]'); b.click(); return document.getElementById('mApp').dataset.page })()` },
  { at: BEATS.checkout, label: 'continue', js: `document.getElementById('payContinue').click(); document.getElementById('mApp').dataset.page` },
  { at: BEATS.method, label: 'wallet', js: `(() => { const b = document.querySelector('#payMethods [data-method="wallet"]'); if (b) b.click(); return document.getElementById('mApp').dataset.page })()` },
  { at: BEATS.pay, label: 'pay', js: `(() => { const b = document.getElementById('payNow'); b.click(); return b.disabled + ' ' + document.getElementById('mApp').dataset.page })()` },
  { at: BEATS.again, label: 'punch now', js: `document.getElementById('payPunchNow').click(); document.getElementById('mApp').dataset.page` },
  { at: BEATS.again + 1.0, label: 'link again', js: `(() => { const c = document.getElementById('mConnect'); const was = c.dataset.state; c.click(); return was + ' -> ' + c.dataset.state + ' credits ' + document.getElementById('mApp').dataset.credits })()` },
  { at: BEATS.punch, label: 'punch', js: `window.punchApp.go('punch', { flow: true })` },
  { at: BEATS.punch + 0.05, label: 'strike soon', js: SOON },
  { at: BEATS.reel, label: 'reel', js: `window.punchApp.go('reel', { player: 'me', index: 0 })` },
]

/* ------------------------------------------------------------ chrome over CDP */
await mkdir(DIR, { recursive: true })
await mkdir(profile, { recursive: true })
const chrome = spawn(CHROME, ['--headless=new', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--force-color-profile=srgb',
  '--autoplay-policy=no-user-gesture-required',
  `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`, '--window-size=1440,1200', 'about:blank'], { stdio: 'ignore' })

let exitCode = 0
try {
  let target
  for (let i = 0; i < 100 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`)).json()).find((t) => t.type === 'page') } catch { await sleep(200) }
  }
  if (!target) throw new Error('Chrome never opened a debugging port')
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  let id = 0
  const pending = new Map(), listeners = new Map(), logs = []
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    if (m.id !== undefined && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result) }
    else for (const fn of listeners.get(m.method) || []) fn(m.params)
  })
  const send = (method, params = {}) => new Promise((res, rej) => { const n = ++id; pending.set(n, { res, rej }); ws.send(JSON.stringify({ id: n, method, params })) })
  const on = (m, fn) => { if (!listeners.has(m)) listeners.set(m, []); listeners.get(m).push(fn) }
  on('Runtime.consoleAPICalled', (p) => { if (p.type === 'error' || p.type === 'warning') logs.push(p.type + ': ' + p.args.map((a) => a.value ?? a.description).join(' ')) })
  on('Runtime.exceptionThrown', (p) => logs.push('EXCEPTION ' + (p.exceptionDetails.exception?.description || p.exceptionDetails.text)))
  const ev = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error('page: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text))
    return r.result.value
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false })
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }, { name: 'prefers-color-scheme', value: 'dark' }] })
  // nothing behind the handset: the page around it is captured as transparent, so the frame's rounded corners and
  // anything the box has over the phone carry alpha, and the cut lays the phone on whatever it likes
  await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
  await send('Page.addScriptToEvaluateOnNewDocument', { source: SHIM })
  const loaded = new Promise((r) => on('Page.loadEventFired', r))
  await send('Page.navigate', { url: URL_ })
  await loaded
  await ev('document.fonts.ready.then(() => 1)')
  await sleep(3500)
  // a fresh visitor: nothing saved, the designs chosen by default, the phone at its own size, the loader out of the way
  await ev(`(() => {
    localStorage.clear()
    document.getElementById('loader')?.classList.add('is-done')
    window.showcase.mode('mobile')
    // a first visit: the wallet is empty, so the link opens the shop and the turn buys its credit on camera
    window.punchApp.credits = 0
    return 1
  })()`)
  await sleep(1600)
  await ev(`(() => { const st = document.createElement('style'); st.textContent = 'html, body, .phone-stage { background: transparent !important; } .loader { display: none !important; }'; document.head.append(st); return 1 })()`)
  await ev(`window.punchApp.go('default'); 1`)
  await sleep(900)
  const box = await ev(`(() => {
    const d = document.getElementById('device')
    const r = d.getBoundingClientRect()
    return { x: r.left, y: r.top, w: Math.round(r.width), h: Math.round(r.height), page: document.getElementById('mApp').dataset.page, credits: document.getElementById('mApp').dataset.credits, shim: !!window.__vt }
  })()`)
  console.log('phone', JSON.stringify(box))
  if (!box.shim) throw new Error('the virtual clock did not load')
  if (Number(box.credits)) throw new Error('the wallet is not empty: the run would skip the shop')
  // the handset moves during the run (the page bar above it changes height with the page), so the box is measured
  // again before every frame rather than once, in viewport coordinates and without captureBeyondViewport: that mode
  // resizes the view to the document for the shot and moved the phone under a box measured before the resize
  const clip = { x: box.x, y: box.y, width: box.w, height: box.h, scale: SCALE }
  const track = async () => {
    const r = await ev(`(() => { const r = document.getElementById('device').getBoundingClientRect(); return { x: r.left, y: r.top, sy: scrollY } })()`)
    if (r.sy) await ev('window.scrollTo(0, 0); 1')
    clip.x = r.x; clip.y = r.y + r.sy
  }
  const shoot = async () => { await track(); return Buffer.from((await send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: false, optimizeForSpeed: true })).data, 'base64') }

  await ev('window.__vt.freeze()')
  const DT = 1000 / FPS
  let now = -1.5
  const todo = [...CUES].sort((a, b) => a.at - b.at)
  const stepTo = async (t) => { const ms = (t - now) * 1000; if (ms > 1e-6) await ev(`window.__vt.step(${ms})`); now = t }
  const runCuesUpTo = async (t) => {
    while (todo.length && todo[0].at <= t + 1e-9) {
      const c = todo.shift()
      while (now + DT / 1000 < c.at - 1e-9) await stepTo(now + DT / 1000)
      await stepTo(c.at)
      const out = await ev(c.js)
      console.log(`cue ${c.label} at ${c.at.toFixed(3)} s${out === undefined ? '' : ' -> ' + out}`)
    }
  }
  const settle = async () => { await ev('window.__vt.videos().then(() => 1)'); await ev('window.__vt.settle()') }
  while (now < FROM - 1e-9) {
    const t = Math.min(FROM, now + DT / 1000)
    await runCuesUpTo(t)
    await stepTo(t)
  }

  const STILLS = opt('stills')
  const LOSSLESS = opt('lossless')
  if (STILLS) {
    for (const t of STILLS.split(',').map(Number).sort((a, b) => a - b)) {
      await runCuesUpTo(t)
      while (now + DT / 1000 < t - 1e-9) { await stepTo(now + DT / 1000); await runCuesUpTo(now) }
      await stepTo(t)
      await settle()
      const f = join(DIR, `still-${t.toFixed(2).replace('.', '_')}.png`)
      await writeFile(f, await shoot())
      console.log('still', f, 'page', await ev(`document.getElementById('mApp').dataset.page`))
    }
  } else if (LOSSLESS) {
    const n0 = Math.round(FROM * FPS), n1 = Math.round(TO * FPS)
    const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', 'pipe:0',
      '-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'bgra', '-r', String(FPS), LOSSLESS], { stdio: ['pipe', 'inherit', 'inherit'] })  // ffv1 keeps the alpha
    const t0 = Date.now()
    for (let i = n0; i <= n1; i++) {
      const t = i / FPS
      await runCuesUpTo(t)
      await stepTo(t)
      await settle()
      const buf = await shoot()
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
      if (i % 60 === 0) console.log(`frame ${i}/${n1} t=${t.toFixed(2)} ${((Date.now() - t0) / 1000).toFixed(0)} s`)
    }
    ff.stdin.end()
    await new Promise((r) => ff.on('close', r))
    console.log('wrote', LOSSLESS, `${n1 - n0 + 1} frames`)
  }
  if (logs.length) console.log('page said:\n  ' + [...new Set(logs)].slice(0, 20).join('\n  '))
  ws.close()
} catch (e) {
  console.error(e)
  exitCode = 1
} finally {
  chrome.kill()
  await sleep(400)
  await rm(profile, { recursive: true, force: true }).catch(() => {})
  process.exit(exitCode)
}
