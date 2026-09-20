/* Machine screen: reading the strike. The beat between the hit and the score, about two seconds.
   One frame of two sections (parts/mscreen-loading.html): Caption and Reading, each paged in Customise.
   One progress value is written on the frame (.mld) every frame: --p (0 to 1, linear) and --pe (eased); data-phase
   turns "ready" when the reading is done, and data-step names what the machine is doing (force, speed, replay, phone).
   The CSS of every design reads those, so the sensor trace, the replay frame, the photo's beam, the checklist and the
   caption all move from one clock and nothing can look stuck. The sensor trace also gets its head's place from here
   (head(), from the line's own samples) so the bright tip sits exactly on the line as it draws.
   Opened with opts.next (a screen key) it hands over to window.showcase.mscreen(opts.next, opts) once the reading
   is done; opened from the bar with no next it rests on "ready" for a moment and reads again, in a loop.
   opts.duration (ms) sets the length; the default is 2200. A design chosen in Customise (document event "psec") is
   brought up to the same moment. Reduced motion: no frames, the designs rest full and still, and the hand over keeps
   its time. */
(() => {
  'use strict'
  const host = document.querySelector('.mscreen-loading')
  if (!host) return
  const root = host.querySelector('.mld')
  if (!root) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const PAGE = 'loading'

  const DURATION = 2200
  const HOLD = 800      // the loop rests on "ready" this long before it reads again
  const BEAT = 160      // after the reading, the hand over waits one beat

  const PF = () => window.PunchFormat
  function me() {
    let list = null
    try { list = window.punchApp && typeof window.punchApp.leaders === 'function' ? window.punchApp.leaders() : null } catch { list = null }
    const p = Array.isArray(list) ? list.find((x) => x.id === 'me') : null
    let score = p ? Number(p.score) || 0 : 999999
    if (Number.isInteger(score) && PF()) score = PF().withDecimals(score, 'me')
    return { first: ((p && p.name) || 'Sara Malik').split(' ')[0], ava: (p && p.ava) || 'assets/app/avatars/sara.jpg', score }
  }

  /* ------------------------------------------------------------ built once: the trace, the reels */
  // the sensor trace: flat, then the strike's spike rising high up the glass, then the pad ringing down to rest at the
  // far edge. Drawn to its box in glass pixels; the samples are kept so the head can ride the tip as it draws.
  let wave = null
  function trace() {
    const box = root.querySelector('.mst-trace')
    if (!box) { wave = null; return }
    const W = Math.max(300, Math.round(box.clientWidth || 1080)), H = Math.max(300, Math.round(box.clientHeight || 1600))
    // one unit reading first (a sharp crest, a smaller trough, the ring dying away), then fitted between a top and a
    // bottom margin so the crest climbs high up the glass and the trough never touches the bar
    const x0 = W * 0.2, lam = W * 0.12, raw = []
    for (let x = 0; x <= W; x += 4) {
      if (x <= x0) { raw.push(0); continue }
      const t = (x - x0) / lam
      raw.push(Math.sin(t * Math.PI) * Math.exp(-t * 0.55) * Math.min(1, (x - x0) / 10))
    }
    const up = Math.max(...raw), down = -Math.min(...raw)
    const top = Math.max(90, H * 0.1), bottom = H - Math.max(60, H * 0.06)
    const amp = (bottom - top) / (up + down)
    const y0 = top + amp * up
    const ys = raw.map((r, i) => (i * 4 <= x0 ? y0 + Math.sin(i * 4 * 0.09) * 3 : y0 - r * amp))
    let d = ''
    ys.forEach((y, i) => { d += `${i ? 'L' : 'M'}${i * 4} ${y.toFixed(1)}` })
    let pk = 0
    ys.forEach((y, i) => { if (y < ys[pk]) pk = i })
    const svg = box.querySelector('svg')
    if (svg) svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    box.querySelectorAll('.mst-line').forEach((el) => el.setAttribute('d', d))
    box.style.setProperty('--y0', y0.toFixed(1))
    box.style.setProperty('--px', String(pk * 4)); box.style.setProperty('--py', ys[pk].toFixed(1))
    box.style.setProperty('--pk', ((pk * 4) / W).toFixed(4))
    wave = { box, W, ys }
    head(lastP)
  }
  // how far across the line has drawn: it reaches the far edge at 80 % of the reading and holds while the bar finishes
  function head(p) {
    if (!wave || !wave.box.isConnected) return
    const d = Math.min(1, Math.max(0, p * 1.25))
    const x = d * wave.W
    const i = Math.min(wave.ys.length - 1, Math.floor(x / 4)), f = x / 4 - i
    const y = wave.ys[i] + ((wave.ys[i + 1] ?? wave.ys[i]) - wave.ys[i]) * f
    wave.box.style.setProperty('--d', d.toFixed(4))
    wave.box.style.setProperty('--hx', x.toFixed(1))
    wave.box.style.setProperty('--hy', y.toFixed(1))
  }

  // the counter's reels, in the score format: six digits and a separator, then three smaller decimals when they show
  function reels() {
    const el = root.querySelector('[data-mld-reels]')
    if (!el) return
    const strip = '<span class="mld-strip-digits">' + '0123456789012345678901234567890123456789'.split('').map((c) => `<b>${c}</b>`).join('') + '</span>'
    const reel = (k) => `<span class="mld-reel" style="--k:${k}">${strip}</span>`
    let html = `${reel(0)}${reel(1)}${reel(2)}<span class="mld-sep">,</span>${reel(3)}${reel(4)}${reel(5)}`
    const dec = !PF() || PF().decimals()
    if (dec) html += `<span class="mld-dec"><span class="mld-sep">.</span>${reel(6)}${reel(7)}${reel(8)}</span>`
    el.innerHTML = html
    el.style.setProperty('--chars', dec ? '8.84' : '7')
  }

  function paintText() {
    const who = me()
    root.querySelectorAll('[data-mld-best]').forEach((b) => { b.innerHTML = PF() ? PF().scoreHTML(who.score) : Math.floor(who.score).toLocaleString('en-US') })
    root.querySelectorAll('[data-mld-first]').forEach((e) => { e.textContent = who.first })
    root.querySelectorAll('[data-mld-ava]').forEach((e) => { if (e.getAttribute('src') !== who.ava) e.setAttribute('src', who.ava) })
    root.dataset.who = who.first
  }

  // what the machine is doing, as the progress passes each quarter; every [data-mld-status] line says it
  const STEPS = ['force', 'speed', 'replay', 'phone']
  function lineFor(v, p, ready) {
    const who = root.dataset.who || 'your'
    if (v === 'ticker') return ready ? 'Your score is ready' : ['Reading the force', 'Timing the speed', 'Cutting the replay', `Sending it to ${who}'s phone`][Math.min(3, Math.floor(p * 4))]
    return p < 0.38 ? 'Saving the clip' : p < 0.74 ? 'Cutting the slow motion' : `Sending it to ${who}'s phone`
  }
  function status(p) {
    const ready = root.dataset.phase === 'ready'
    root.querySelectorAll('[data-mld-status]').forEach((el) => {
      const text = lineFor(el.classList.contains('mcap-now') ? 'ticker' : 'replay', p, ready)
      if (el.textContent !== text) el.textContent = text
    })
  }

  /* ------------------------------------------------------------ the clock */
  let run = null
  let lastP = 0
  const ease = (p) => 1 - Math.pow(1 - p, 3)

  function set(p) {
    lastP = p
    root.style.setProperty('--p', p.toFixed(4))
    root.style.setProperty('--pe', ease(p).toFixed(4))
    head(p)
    const phase = p >= 1 ? 'ready' : 'reading'
    if (root.dataset.phase !== phase) root.dataset.phase = phase
    const step = STEPS[Math.min(3, Math.floor(p * 4))]
    if (root.dataset.step !== step) root.dataset.step = step
    status(p)
  }

  function frame(now) {
    if (!run) return
    const p = Math.min(1, (now - run.t0) / run.dur)
    set(p)
    if (p < 1) { run.raf = requestAnimationFrame(frame); return }
    if (run.next) return
    // the loop: rest on "ready", then read again
    run.loop = setTimeout(() => {
      if (!run) return
      run.t0 = performance.now()
      run.raf = requestAnimationFrame(frame)
    }, HOLD)
  }

  // reduced motion: the designs rest full, the caption stays on the reading line until the hand over
  function still() {
    set(1)
    root.dataset.phase = 'reading'
    root.dataset.step = 'force'
    status(0)
  }

  function start(opts) {
    stop()
    const dur = Math.max(800, Number(opts.duration) || DURATION)
    run = { dur, next: typeof opts.next === 'string' ? opts.next : '', t0: performance.now(), raf: 0, loop: 0, hand: 0 }
    reels()
    paintText()
    trace()
    root.classList.add('is-live')
    host.classList.add('is-live')
    if (reduced.matches) still()
    else {
      set(0)
      run.raf = requestAnimationFrame(frame)
    }
    if (run.next) {
      // a timer, not the frame clock, owns the hand over: a hidden pane stops frames, never the flow
      const { next } = run
      const rest = { ...opts }
      delete rest.next; delete rest.variant; delete rest.design; delete rest.duration
      run.hand = setTimeout(() => {
        if (!run) return
        set(1)
        if (window.showcase && typeof window.showcase.mscreen === 'function') window.showcase.mscreen(next, { ...rest, from: 'loading' })
      }, dur + BEAT)
    }
  }

  function stop() {
    if (run) {
      cancelAnimationFrame(run.raf)
      clearTimeout(run.loop); clearTimeout(run.hand)
    }
    run = null
    host.classList.remove('is-live')
    root.classList.remove('is-live')
    root.style.setProperty('--p', '0'); root.style.setProperty('--pe', '0')
    root.dataset.phase = 'reading'; root.dataset.step = 'force'
  }

  paintText()
  reels()
  document.addEventListener('mscreen', (e) => {
    const { key, opts } = e.detail || {}
    if (key === 'loading') start(opts || {})
    else if (run) stop()
  })
  // a design chosen in Customise joins the reading where it is: the trace is drawn to its new box, the text filled in
  document.addEventListener('psec', (e) => {
    const d = e.detail || {}
    if (d.surface !== 'machine' || d.page !== PAGE) return
    requestAnimationFrame(() => {
      trace()
      if (d.sec === 'reading') reels()
      paintText()
      if (run) (reduced.matches ? still() : set(lastP))
      if (!d.initial && run && d.el && d.el.animate && !reduced.matches) d.el.animate([{ opacity: 0, transform: 'translateY(30px)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: 'cubic-bezier(.2,.9,.25,1)' })
    })
  })
  document.addEventListener('decimals', () => { reels(); paintText() })
  // the trace's box changes with the caption above it and the look's type: redraw the line to the new box
  const traceBox = root.querySelector('.mst-trace')
  if (traceBox && 'ResizeObserver' in window) new ResizeObserver(() => { if (traceBox.clientWidth) trace() }).observe(traceBox)
})()
