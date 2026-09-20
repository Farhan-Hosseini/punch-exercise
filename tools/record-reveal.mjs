/* ==========================================================================
   The score reveal, recorded from the live glass.

   Loads the showcase's own machine (?embed=machine&follow=0) in headless Chrome at the glass's real size and drives
   its time itself: a virtual clock injected before any page script owns performance.now, Date, setTimeout,
   setInterval, requestAnimationFrame and requestIdleCallback, and every Web Animation (CSS keyframes, CSS
   transitions, el.animate) is paused and seeked to the virtual time before each frame. Every frame is therefore the
   instant it claims to be, however long the capture takes. The flow is driven through window.showcase.mscreen with
   the designs chosen by default (a fresh profile: nothing saved).

     node tools/record-reveal.mjs --stills 0,1.35,3,5,8.5 --dir C:/gtmp/punch/rr     PNG stills at clip times
     node tools/record-reveal.mjs --lossless C:/gtmp/punch/rr/glass.mkv               every frame, lossless (libx264rgb qp 0)

   Options: --fps 60, --url (default http://localhost:5770/?embed=machine&follow=0), --score 958214.607,
            --scale 1 (capture scale), --from / --to (clip seconds, for a partial run)
   The beats (clip seconds, 0 is the first frame) are in BEATS below and are printed as JSON with --beats.
   ========================================================================== */
import { spawn } from 'node:child_process'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'

const args = process.argv.slice(2)
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 && !String(args[i + 1] ?? '').startsWith('--') ? args[i + 1] : def }
const flag = (name) => args.includes(`--${name}`)

const URL_ = opt('url', 'http://localhost:5770/?embed=machine&follow=0')
const FPS = Number(opt('fps', 60))
const SCALE = Number(opt('scale', 1))
const SCORE = Number(opt('score', 958214.607))
const DIR = opt('dir', 'C:/gtmp/punch/rr')
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const DEBUG_PORT = 9860 + Math.floor(Math.random() * 100)
const profile = `C:/gtmp/punch/rr-profile-${process.pid}`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ------------------------------------------------------------ the beats, in clip seconds */
const SECONDS = 20          // the machine's count
// --lead N opens the clip N seconds earlier, so more of the count plays before the strike: the run on the phone is
// seventeen seconds, and --lead 7.07 makes this one the same length
const LEAD = Number(opt('lead', 0))
const LEFT_AT_0 = 3.62 + LEAD  // time left on the count at the first frame
const PRE = SECONDS - LEFT_AT_0 + 0  // the count starts this long before the first frame (fast-forwarded, not captured)
export const BEATS = {
  strike: 0.80 + LEAD,      // the punch lands (2.82 s left on the count; the count has ticked from 4 to 3 at 0.62 s)
  reading: 1.60 + LEAD,     // the glass moves on to Reading the strike
  readingMs: 1600,          // how long the reading takes (the screen's default is 2200)
  record: 1.60 + 1.6 + 0.16 + LEAD, // Reading hands over to New record by itself (duration + its one-beat wait)
  score: 5.60 + LEAD,       // the Big score, once the old best and the margin have joined the record (1.74 s in)
  why: 5.60 + 2.54 + LEAD,  // its reason lands once the number has (score.js beats(): 80 + 320 + 1800 + 60 + 280 ms)
  photo: 5.60 + 3.24 + LEAD, // then the still of the strike (land + 980 ms), in by about 0.6 s later
  end: 9.93 + LEAD,         // the last frame (597 frames at 60 fps without a lead: the brief asks for 5 to 10 seconds)
}
if (flag('beats')) { console.log(JSON.stringify(BEATS)); process.exit(0) }
const FROM = Number(opt('from', 0)), TO = Number(opt('to', BEATS.end))

const CUES = [
  { at: -PRE, label: 'countdown', js: `window.showcase.mscreen('countdown', { seconds: ${SECONDS}, punch: false, score: ${SCORE} })` },
  // the demo's own punch is a click on the glass while it counts
  { at: BEATS.strike, label: 'strike', js: `document.querySelector('.mscreen-countdown').click()` },
  // the demo would hand over after 1.2 s by itself; the clip takes it a touch sooner and shortens the reading
  { at: BEATS.reading, label: 'reading', js: `window.showcase.mscreen('loading', { next: 'record', score: ${SCORE}, duration: ${BEATS.readingMs} })` },
  { at: BEATS.score, label: 'score', js: `window.showcase.mscreen('score', { score: ${SCORE}, from: 'record' })` },
]

/* ------------------------------------------------------------ the virtual clock, injected before any page script */
const SHIM = `(() => {
  if (window.__vt) return
  const N = {
    raf: window.requestAnimationFrame.bind(window), si: window.setInterval.bind(window),
    now: performance.now.bind(performance), dnow: Date.now, D: Date,
  }
  const V = window.__vt = { t: N.now(), frozen: false, seq: 1, timers: new Map(), rafs: new Map() }
  const dateOff = N.dnow() - V.t
  performance.now = () => V.t
  const VDate = function (...a) {
    if (!new.target) return new N.D(V.t + dateOff).toString()
    return a.length ? new N.D(...a) : new N.D(V.t + dateOff)
  }
  VDate.prototype = N.D.prototype
  VDate.now = () => Math.floor(V.t + dateOff)
  VDate.parse = N.D.parse; VDate.UTC = N.D.UTC
  window.Date = VDate
  // a seeded random, so the confetti and the demo's picks are the same on every run
  let seed = 0x2F6E2B1
  Math.random = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }

  window.setTimeout = function (fn, ms, ...a) { const id = V.seq++; V.timers.set(id, { at: V.t + Math.max(0, Number(ms) || 0), fn, a, every: 0, n: id }); return id }
  window.setInterval = function (fn, ms, ...a) { const id = V.seq++; const every = Math.max(4, Number(ms) || 0); V.timers.set(id, { at: V.t + every, fn, a, every, n: id }); return id }
  window.clearTimeout = window.clearInterval = (id) => { V.timers.delete(id) }
  window.requestAnimationFrame = (fn) => { const id = V.seq++; V.rafs.set(id, fn); return id }
  window.cancelAnimationFrame = (id) => { V.rafs.delete(id) }
  window.requestIdleCallback = (fn) => window.setTimeout(() => fn({ didTimeout: false, timeRemaining: () => 8 }), 1)
  window.cancelIdleCallback = window.clearTimeout

  function runTimers(to) {
    for (let guard = 0; guard < 20000; guard++) {
      let pick = null
      for (const [id, t] of V.timers) if (t.at <= to && (!pick || t.at < pick[1].at || (t.at === pick[1].at && t.n < pick[1].n))) pick = [id, t]
      if (!pick) break
      const [id, t] = pick
      if (t.at > V.t) V.t = t.at
      if (t.every) { t.at += t.every; t.n = V.seq++ } else V.timers.delete(id)
      try { typeof t.fn === 'function' ? t.fn(...t.a) : (0, eval)(String(t.fn)) } catch (e) { console.error('timer', e && e.stack || e) }
    }
    if (to > V.t) V.t = to
  }
  function runRafs() {
    const list = [...V.rafs.values()]; V.rafs.clear()
    for (const fn of list) { try { fn(V.t) } catch (e) { console.error('raf', e && e.stack || e) } }
  }
  const advance = (to) => { runTimers(to); runRafs() }

  // until the recorder takes the clock, it follows real time so the page loads as it always does
  const pump = () => { if (V.frozen) return; advance(N.now()); N.raf(pump) }
  N.raf(pump)
  N.si(() => { if (!V.frozen) runTimers(N.now()) }, 8)

  // every Web Animation is paused and seeked to the virtual time; the page's own pause, play and seeks are respected
  const AP = Animation.prototype
  const O = { pause: AP.pause, play: AP.play, finish: AP.finish, reverse: AP.reverse, upr: AP.updatePlaybackRate }
  const CT = Object.getOwnPropertyDescriptor(AP, 'currentTime')
  const PR = Object.getOwnPropertyDescriptor(AP, 'playbackRate')
  const S = new WeakMap()
  const touch = (a, user) => { const s = S.get(a); if (!s) return; if (user === 'pause') s.user = 'pause'; else { if (user) s.user = user; s.rebase = true; s.done = false } }
  AP.pause = function () { touch(this, 'pause'); return O.pause.call(this) }
  AP.play = function () { touch(this, 'play'); return O.play.call(this) }
  AP.reverse = function () { touch(this, 'play'); return O.reverse.call(this) }
  AP.updatePlaybackRate = function (r) { touch(this); return O.upr.call(this, r) }
  AP.finish = function () { const r = O.finish.call(this); const s = S.get(this); if (s) s.done = true; return r }
  Object.defineProperty(AP, 'currentTime', { configurable: true, get: CT.get, set(v) { CT.set.call(this, v); touch(this) } })
  Object.defineProperty(AP, 'playbackRate', { configurable: true, get: PR.get, set(v) { PR.set.call(this, v); touch(this) } })
  V.count = 0
  function sync() {
    const all = document.getAnimations()
    V.count = all.length
    for (const a of all) {
      let s = S.get(a)
      if (!s) {
        const ps = a.playState
        s = { ct0: CT.get.call(a) ?? 0, vt0: V.t, user: ps === 'paused' ? 'pause' : 'play', done: ps === 'finished', rebase: false }
        S.set(a, s)
      }
      if (s.rebase) { s.ct0 = CT.get.call(a) ?? 0; s.vt0 = V.t; s.rebase = false }
      if (s.user === 'pause' || s.done) continue
      const rate = PR.get.call(a)
      const target = s.ct0 + (V.t - s.vt0) * rate
      const end = a.effect ? a.effect.getComputedTiming().endTime : 0
      if ((rate > 0 && Number.isFinite(end) && target >= end) || (rate < 0 && target <= 0)) { s.done = true; O.finish.call(a); continue }
      if (a.playState !== 'paused') O.pause.call(a)
      CT.set.call(a, target)
    }
  }
  V.freeze = () => { V.frozen = true; V.t = N.now(); sync(); return V.t }
  V.step = (ms) => { advance(V.t + ms); sync(); return V.t }
  V.settle = () => new Promise((res) => N.raf(() => N.raf(() => { sync(); res(V.t) })))
})()`

/* ------------------------------------------------------------ chrome over CDP */
await mkdir(DIR, { recursive: true })
await mkdir(profile, { recursive: true })
const chrome = spawn(CHROME, ['--headless=new', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--force-color-profile=srgb',
  `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`, '--window-size=1080,960', 'about:blank'], { stdio: 'ignore' })

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
  await send('Emulation.setDeviceMetricsOverride', { width: 1080, height: 960, deviceScaleFactor: 1, mobile: false })
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }, { name: 'prefers-color-scheme', value: 'dark' }] })
  await send('Page.addScriptToEvaluateOnNewDocument', { source: SHIM })
  const loaded = new Promise((r) => on('Page.loadEventFired', r))
  await send('Page.navigate', { url: URL_ })
  await loaded
  await ev('document.fonts.ready.then(() => 1)')
  await sleep(3500)
  // the glass at its own size: 1 css px is 1 glass px
  await ev(`(() => { const s = document.createElement('style'); s.textContent = '.machine { zoom: 1 !important; }'; document.head.append(s); return 1 })()`)
  await sleep(600)
  const box = await ev(`(() => { const r = document.getElementById('machine').getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, look: document.documentElement.dataset.variant + '/' + document.documentElement.dataset.appearance, dec: document.documentElement.dataset.decimals, shim: !!window.__vt } })()`)
  console.log('glass', JSON.stringify(box))
  if (!box.shim) throw new Error('the virtual clock did not load')
  const clip = { x: box.x, y: box.y, width: 1080, height: 3840, scale: SCALE }
  const shoot = async () => Buffer.from((await send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: true, optimizeForSpeed: true })).data, 'base64')

  // take the clock, then run the timeline: cues at their exact instants, a frame every 1/FPS
  await ev('window.__vt.freeze()')
  const DT = 1000 / FPS
  let now = -PRE - 0.5 // clip seconds; half a second before the count starts, the glass sits at rest
  const todo = [...CUES].sort((a, b) => a.at - b.at)
  const stepTo = async (t) => { const ms = (t - now) * 1000; if (ms > 1e-6) await ev(`window.__vt.step(${ms})`); now = t }
  const runCuesUpTo = async (t) => {
    while (todo.length && todo[0].at <= t + 1e-9) {
      const c = todo.shift()
      // walk to the cue in frame-sized steps so every rAF loop sees ordinary frames, then fire it
      while (now + DT / 1000 < c.at - 1e-9) await stepTo(now + DT / 1000)
      await stepTo(c.at)
      await ev(c.js)
      console.log(`cue ${c.label} at ${c.at.toFixed(3)} s`)
    }
  }
  // the pre-roll, uncaptured, in frame-sized steps
  while (now < FROM - 1e-9) {
    const t = Math.min(FROM, now + DT / 1000)
    await runCuesUpTo(t)
    await stepTo(t)
  }

  const STILLS = opt('stills')
  const LOSSLESS = opt('lossless')
  if (STILLS) {
    const want = STILLS.split(',').map(Number).sort((a, b) => a - b)
    for (const t of want) {
      await runCuesUpTo(t)
      while (now + DT / 1000 < t - 1e-9) { await stepTo(now + DT / 1000); await runCuesUpTo(now) }
      await stepTo(t)
      await ev('window.__vt.settle()')
      const f = join(DIR, `still-${t.toFixed(2).replace('.', '_')}.png`)
      await writeFile(f, await shoot())
      console.log('still', f, 'animations', await ev('window.__vt.count'))
      if (opt('probe')) console.log('  probe', JSON.stringify(await ev(opt('probe'))))
    }
  } else if (LOSSLESS) {
    const n0 = Math.round(FROM * FPS), n1 = Math.round(TO * FPS)
    const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', 'pipe:0',
      '-c:v', 'libx264rgb', '-preset', 'ultrafast', '-qp', '0', '-r', String(FPS), LOSSLESS], { stdio: ['pipe', 'inherit', 'inherit'] })
    const t0 = Date.now()
    for (let i = n0; i <= n1; i++) {
      const t = i / FPS
      await runCuesUpTo(t)
      await stepTo(t)
      await ev('window.__vt.settle()')
      const buf = await shoot()
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
      if (i % 30 === 0) console.log(`frame ${i}/${n1} t=${t.toFixed(2)} ${((Date.now() - t0) / 1000).toFixed(0)} s`)
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
