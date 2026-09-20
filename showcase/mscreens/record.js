/* Machine screen: New record. Round six: one frame of sections (psec.js), five designs each: Moment, Score, Video (round
   nine: the record strike as a reel) and Punch again (round nine, parts/ms-again.html, static markup played in last).
   The reels: every <video> in the shown design plays, muted and looping, while its section's run is live, the screen
   is open and the video is in view; reduced motion never plays one (its poster is the strike frame). Replay's bar and
   frames follow its reel; Three speeds sets each band's rate.
   When the screen opens (document event "mscreen" with key "record") this fills the names and scores and plays every
   section's chosen design; when Customise changes a section ("psec") only that section replays; another screen
   stops everything. Each section keeps its own run (timers, animations, frames), so replaying one never cuts another.
   The score is opts.score, else the phone's live score (window.punchApp.score), else 999,999; the old machine best is
   opts.best (with opts.bestName), else the best on this machine's board without the player (window.punchApp.leaders(),
   the Dubai board, as the phone decides a record), else Omar Nasser's 931,440. Every score goes through
   window.PunchFormat and is redrawn at rest on the document "decimals" event. With opts.next === 'result' the glass
   moves on to the result after about six seconds. Reduced motion: every design rests in its final state at once. */
(() => {
  'use strict'
  const host = document.querySelector('.mscreen-record')
  if (!host) return
  const PAGE = 'record'
  const SECS = ['moment', 'score', 'photo', 'again']
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const F = () => window.PunchFormat
  const text = (n) => (F() ? F().score(n) : Math.round(n).toLocaleString('en-US'))
  const html = (n) => (F() ? F().scoreHTML(n) : Math.round(n).toLocaleString('en-US'))
  const chars = (n) => (F() ? F().width(n) : String(Math.round(n)).length)
  const MAX = 999999.999
  const HANDOFF = 6000
  const AVATARS = ['adam', 'amara', 'arjun', 'faris', 'hamad', 'hana', 'karim', 'leila', 'lina', 'maya', 'mia', 'nadia', 'noor', 'omar', 'rami', 'sara', 'tariq', 'yara', 'yusuf', 'zayd']

  const easeOut = (x) => 1 - (1 - x) * (1 - x)
  const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)
  const expo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x))
  // the frame's spring (Figma motion export for the stars)
  const spring = (t) => 1 - Math.exp(-t * 7.4674) * (Math.cos(t * 9.9565) + 0.75 * Math.sin(t * 9.9565))
  const TIMELINE = 2500

  /* ---------------------------------------------------------- who and what */
  function board() {
    try { return window.punchApp && window.punchApp.leaders ? window.punchApp.leaders() : [] } catch { return [] }
  }
  function scoreFrom(opts) {
    const own = Number(opts.score)
    if (opts.score != null && Number.isFinite(own)) return Math.max(0, Math.min(MAX, own))
    const live = window.punchApp && Number(window.punchApp.score)
    return Number.isFinite(live) && live > 0 ? live : 999999
  }
  const dubai = () => board().filter((p) => p.id !== 'me' && /Dubai/.test(p.city || '')).sort((a, b) => b.score - a.score)
  function machineBest(opts) {
    if (opts.best != null && Number.isFinite(Number(opts.best))) return { score: Number(opts.best), name: opts.bestName || 'The last best' }
    const top = dubai()[0]
    const name = top ? top.name : 'Omar Nasser'
    const whole = top ? Number(top.score) : 931440
    return { score: F() ? F().withDecimals(whole, name) : whole, name }
  }
  function playerName(opts) {
    if (opts.name) return String(opts.name)
    const me = board().find((p) => p.id === 'me')
    return me ? me.name : 'Sara Malik'
  }
  // the record book: the machine's past bests under the one just beaten
  function book(ctx) {
    const rows = dubai().slice(0, 4).map((p) => ({ name: p.name, score: F() ? F().withDecimals(Number(p.score), p.name) : Number(p.score) }))
    if (!rows.length || rows[0].name !== ctx.best.name) rows.unshift({ name: ctx.best.name, score: ctx.best.score })
    const fallback = [['Yara Haddad', 918210], ['Faris Aziz', 902655], ['Leila Nour', 889030]]
    for (const [name, whole] of fallback) if (rows.length < 4 && !rows.some((r) => r.name === name)) rows.push({ name, score: F() ? F().withDecimals(whole, name) : whole })
    return rows.sort((a, b) => b.score - a.score).slice(0, 4)
  }
  const avatar = (name) => {
    const first = String(name || '').trim().split(/\s+/)[0].toLowerCase()
    return AVATARS.includes(first) ? `assets/app/avatars/${first}.jpg` : ''
  }
  const initials = (name) => String(name || '').trim().split(/\s+/).map((w) => w[0] || '').join('').slice(0, 2).toUpperCase()
  const today = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  let ctx = null
  let opts = {}
  let open = false
  let handoff = 0

  // names, the old best, the margin, faces and the date, everywhere on the screen
  function fill() {
    const gain = Math.max(0, ctx.score - ctx.best.score)
    host.querySelectorAll('[data-rec="name"]').forEach((e) => { e.textContent = ctx.name })
    host.querySelectorAll('[data-rec="holder"]').forEach((e) => { e.textContent = ctx.best.name })
    host.querySelectorAll('[data-rec-old]').forEach((e) => { e.innerHTML = html(ctx.best.score); e.style.setProperty('--chars', chars(ctx.best.score).toFixed(2)) })
    host.querySelectorAll('[data-rec-gain]').forEach((e) => { e.innerHTML = html(gain); e.style.setProperty('--chars', Math.max(chars(ctx.best.score), chars(gain)).toFixed(2)) })
    host.querySelectorAll('.rs-fact [data-rec-old]').forEach((e) => { e.style.setProperty('--chars', Math.max(chars(ctx.best.score), chars(gain)).toFixed(2)) })
    host.querySelectorAll('[data-rec-gainbox]').forEach((e) => { e.hidden = gain <= 0 })
    host.querySelectorAll('[data-rec-ghost]').forEach((e) => { e.innerHTML = html(ctx.score) })
    host.querySelectorAll('[data-rec-num]').forEach((e) => { e.innerHTML = html(ctx.score) })
    host.querySelectorAll(':is(.rs-num, .rs-new, .rs-big)').forEach((e) => { e.style.setProperty('--chars', chars(ctx.score).toFixed(2)) })
    host.querySelectorAll('[data-rec-sr]').forEach((e) => { e.textContent = text(ctx.score) })
    const [whole, decs] = splitScore(ctx.score)
    host.querySelectorAll('[data-rec-whole], [data-rec-wghost]').forEach((e) => { e.textContent = whole })
    host.querySelectorAll('.rs-whole').forEach((e) => { e.style.setProperty('--wchars', wideOf(whole).toFixed(2)) })
    host.querySelectorAll('[data-rec-decs]').forEach((e) => { e.textContent = decs })
    host.querySelectorAll('[data-rec-avatar]').forEach((img) => {
      const who = img.dataset.recAvatar === 'name' ? ctx.name : ctx.best.name
      const src = avatar(who)
      const face = img.parentElement
      let ini = face.querySelector('.rm-ini')
      if (src) { img.hidden = false; if (img.getAttribute('src') !== src) img.src = src; if (ini) ini.remove() }
      else {
        img.hidden = true
        if (!ini) { ini = document.createElement('span'); ini.className = 'rm-ini'; ini.setAttribute('aria-hidden', 'true'); face.appendChild(ini) }
        ini.textContent = initials(who)
      }
    })
    host.querySelectorAll('[data-rec-date]').forEach((e) => { e.textContent = today() })
    host.querySelectorAll('[data-rec-book]').forEach((ol) => {
      ol.innerHTML = book(ctx).map((r) => `<li><span></span><span>${html(r.score)}</span></li>`).join('')
      ;[...ol.children].forEach((li, i) => { li.firstElementChild.textContent = book(ctx)[i].name })
    })
    host.querySelectorAll('.rm-belt-name').forEach((e) => { e.style.setProperty('--nc', Math.max(6, ctx.name.length).toFixed(0)) })
  }
  // type that must fill a width exactly (the whole score, the big caption): measured at 100 px, then scaled to the
  // room it has (layout sizes, not rects, so the showcase zoom does not enter into it)
  const FITS = [['.rs-whole', 480], ['.rp-grade-cap b', 300]]
  function fitIn(root) {
    for (const [sel, max] of FITS) {
      root.querySelectorAll(sel).forEach((el) => {
        const room = el.parentElement.clientWidth
        el.style.fontSize = '100px'
        const w = el.offsetWidth
        if (w && room) el.style.fontSize = Math.min(max, Math.floor(100 * room / w)) + 'px'
        else el.style.fontSize = ''
      })
    }
  }
  const splitScore = (n) => { const t = text(n); const i = t.indexOf('.'); return i < 0 ? [t, ''] : [t.slice(0, i), t.slice(i)] }
  const wideOf = (s) => [...s].reduce((w, c) => w + (/\d/.test(c) ? 1 : 0.45), 0)

  /* ---------------------------------------------------------- one run per section */
  const runs = {}
  function stop(key) {
    const r = runs[key]
    if (!r) return
    r.dead = true
    cancelAnimationFrame(r.raf)
    r.timers.forEach(clearTimeout)
    r.anims.forEach((a) => { try { a.cancel() } catch { /* already gone */ } })
    r.bits.forEach((b) => b.remove())
    if (r.cleanup) r.cleanup()
    r.el.querySelectorAll('video').forEach((v) => { v._want = false; drive(v) })
    delete runs[key]
  }
  const stopAll = () => { SECS.forEach(stop); clearTimeout(handoff) }
  function mkRun(key, el) {
    const r = { key, el, dead: false, raf: 0, timers: [], anims: [], bits: [], cleanup: null }
    r.later = (fn, ms) => { r.timers.push(setTimeout(() => { if (!r.dead) fn() }, ms)) }
    r.play = (node, frames, o) => { if (!node || !node.animate || r.dead) return null; const a = node.animate(frames, o); r.anims.push(a); return a }
    r.loop = (fn) => {
      const t0 = performance.now()
      const step = (now) => { if (r.dead) return; if (fn((now - t0) / 1000) !== false) r.raf = requestAnimationFrame(step) }
      r.raf = requestAnimationFrame(step)
    }
    runs[key] = r
    return r
  }
  // a number that counts from a to b through PunchFormat; lands on time even when no frames run (a hidden tab)
  function count(r, nodes, a, b, { delay = 0, dur = 1700, ease = expo, done } = {}) {
    const paint = (v) => nodes.forEach((n) => { n.innerHTML = html(v) })
    paint(a)
    let landed = false
    const land = () => { if (landed) return; landed = true; paint(b); if (done) done() }
    r.later(() => r.loop((t) => {
      const k = Math.min(1, t / (dur / 1000))
      if (landed) return false
      paint(a + (b - a) * ease(k))
      if (k < 1) return true
      land()
      return false
    }), delay)
    r.later(land, delay + dur + 400)
  }
  // confetti through the glass: ribbons that fall, sway and flip; made fresh each time, cleared with their run
  function confetti(r, { n = 44, top = -40, fall = 1600, x0 = 30, x1 = 1050, delay = 0, spread = 1800 } = {}) {
    const layer = host.querySelector('.rec-rain')
    if (reduced.matches || !layer) return
    const kinds = ['hi', 'hi', 'red', 'ink', 'hi', 'red']
    const frag = document.createDocumentFragment()
    const jobs = []
    for (let i = 0; i < n; i++) {
      const d = document.createElement('i')
      d.className = 'rx-bit ' + kinds[i % kinds.length]
      d.style.width = (14 + Math.random() * 16).toFixed(1) + 'px'
      d.style.height = (8 + Math.random() * 10).toFixed(1) + 'px'
      frag.appendChild(d)
      r.bits.push(d)
      const x = x0 + Math.random() * (x1 - x0)
      const drift = (Math.random() - 0.5) * 220
      const spin = (Math.random() < 0.5 ? -1 : 1) * (240 + Math.random() * 480)
      const flips = 1 + Math.round(Math.random() * 3)
      const frames = []
      for (let k = 0; k <= 10; k++) {
        const t = k / 10
        const sway = Math.sin(t * Math.PI * 2 * (0.6 + (i % 3) * 0.25)) * 34
        frames.push({
          offset: t,
          opacity: t < 0.06 ? t / 0.06 : t > 0.8 ? Math.max(0, (1 - t) / 0.2) : 1,
          transform: `translate(${(x + drift * t + sway).toFixed(1)}px, ${(top + t * fall).toFixed(1)}px) rotate(${(spin * t).toFixed(1)}deg) scaleY(${Math.cos(t * Math.PI * 2 * flips).toFixed(3)})`,
        })
      }
      jobs.push([d, frames, { duration: 3000 + Math.random() * 2200, delay: delay + Math.random() * spread, easing: 'linear', fill: 'both' }])
    }
    layer.appendChild(frag)
    jobs.forEach(([d, f, o]) => r.play(d, f, o))
  }
  const rise = (r, node, delay = 0, y = 40) => r.play(node, [{ opacity: 0, transform: `translateY(${y}px)` }, { opacity: 1, transform: 'none' }], { duration: 620, delay, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' })
  // the top of the moment room on the glass, for confetti that starts over the celebration
  const roomTop = () => { const s = host.querySelector('.rec-moment'); return s ? s.offsetTop : 296 }

  /* ============================================================ MOMENT */
  function burst(el, r, c) {
    const win = el.querySelector('.rm-win')
    const glow = el.querySelector('.rm-glow')
    r.cleanup = () => el.classList.remove('is-idle')
    if (c.calm) return
    function piece(p) {
      const [fx, fy] = (p.dataset.from || '0 0').split(' ').map(Number)
      const spin = Number(p.dataset.spin) || 0
      const peak = Number(p.dataset.peak) || 1.4
      const at = Number(p.dataset.at) || 0
      const rot0 = parseFloat(getComputedStyle(p).getPropertyValue('--r')) || 0
      const D = 700, frames = []
      for (let i = 0; i <= 14; i++) {
        const t = i / 14, ms = t * D
        // out from the middle, 18.75% past the resting place, then back (the frame's overshoot)
        const k = ms <= 250 ? 1 + (-0.1875 - 1) * easeOut(ms / 250) : ms <= 500 ? -0.1875 + 0.1875 * easeInOut((ms - 250) / 250) : 0
        const s = ms <= 250 ? peak * easeOut(ms / 250) : ms <= 500 ? peak + (1 - peak) * easeInOut((ms - 250) / 250) : 1
        const rot = rot0 + spin * (easeOut(Math.min(1, ms / 600)) - 1)
        frames.push({ offset: t, opacity: Math.min(1, ms / 150), transform: `translate(${(fx * k).toFixed(2)}px, ${(fy * k).toFixed(2)}px) rotate(${rot.toFixed(1)}deg) scale(${s.toFixed(3)})` })
      }
      r.play(p, frames, { duration: D, delay: at * TIMELINE, fill: 'backwards' })
    }
    function star(p) {
      const at = Number(p.dataset.at) || 0
      const frames = []
      for (let i = 0; i <= 12; i++) {
        const t = i / 12, ms = t * 500
        const s = ms <= 350 ? spring(ms / 350) : 1
        frames.push({ offset: t, opacity: Math.min(1, ms / 150), transform: `rotate(${(-15 + 15 * easeOut(Math.min(1, ms / 500))).toFixed(1)}deg) scale(${Math.max(0, s).toFixed(3)})` })
      }
      r.play(p, frames, { duration: 500, delay: at * TIMELINE, fill: 'backwards' })
    }
    r.play(glow, [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(.86)', offset: 0.75 }, { opacity: 1, transform: 'scale(1)' }], { duration: 800, easing: 'ease-out', fill: 'backwards' })
    const wf = []
    for (let i = 0; i <= 12; i++) { const t = i / 12; wf.push({ offset: t, opacity: Math.min(1, t * 3), transform: `scale(${Math.max(0, spring(t)).toFixed(3)})` }) }
    r.play(win, wf, { duration: 520, delay: 100, fill: 'backwards' })
    el.querySelectorAll('.rm-k').forEach(piece)
    el.querySelectorAll('.rm-star').forEach(star)
    confetti(r, { n: 46, top: roomTop() - 60, fall: 1100, delay: 250, spread: 2600 })
    r.later(() => el.classList.add('is-idle'), 1400)
  }

  function line(el, r, c) {
    const halves = [...el.querySelectorAll('.rm-half')]
    const sparks = el.querySelector('.rm-sparks')
    const copy = el.querySelector('.rm-line-copy')
    const bell = el.querySelector('.rm-bell')
    const vOf = (s) => Math.max(0, Math.min(1, s / MAX))
    const oldV = vOf(c.best.score), endV = vOf(c.score)
    const HANG = 16, CUT = 150
    const setV = (v) => el.style.setProperty('--v', v.toFixed(4))
    const hang = (k) => { el.style.setProperty('--a-l', (HANG * k).toFixed(2) + 'deg'); el.style.setProperty('--a-r', (-HANG * 2.2 * k).toFixed(2) + 'deg') }
    el.style.setProperty('--old', oldV.toFixed(4))
    const rung = endV >= 0.9999
    const final = () => { setV(endV); hang(1); el.style.setProperty('--cut', CUT + 'px'); el.classList.toggle('is-rung', rung) }
    r.cleanup = () => { sparks.textContent = ''; el.classList.remove('is-rung') }
    if (c.calm) { final(); return }
    const RISE = 1.15, STRAIN = 0.16, ON = 0.7
    setV(0); hang(0); el.style.setProperty('--cut', '0px'); el.classList.remove('is-rung')
    rise(r, copy, 100)
    let broke = false
    r.loop((t) => {
      let v
      if (t < RISE) { const k = t / RISE; v = oldV * (k * k * (1.6 - 0.6 * k)) }
      else if (t < RISE + STRAIN) {
        // the tape bows up under the strike before it gives
        const k = Math.sin(((t - RISE) / STRAIN) * Math.PI / 2)
        v = oldV + 0.004 * k
        el.style.setProperty('--a-l', (-3 * k).toFixed(2) + 'deg')
        el.style.setProperty('--a-r', (3 * k).toFixed(2) + 'deg')
      } else {
        if (!broke) { broke = true; snap() }
        const k = Math.min(1, (t - RISE - STRAIN) / ON)
        v = oldV + (endV - oldV) * (1 - Math.pow(1 - k, 3) + Math.sin(k * Math.PI) * 0.02)
        if (k >= 1) {
          final()
          if (rung) r.play(bell, [0, -14, 12, -9, 6, -3, 0].map((a, i, l) => ({ offset: i / (l.length - 1), transform: `rotate(${a}deg)` })), { duration: 900, easing: 'ease-out' })
          return false
        }
      }
      setV(Math.min(1, v))
      return true
    })
    // a hidden tab never runs frames: the column still lands on time
    r.later(final, (RISE + STRAIN + ON) * 1000 + 500)
    function snap() {
      el.style.setProperty('--cut', CUT + 'px')
      hang(1)
      const swing = (dir, amp) => [0, 1.35, 0.8, 1.1, 0.95, 1].map((k, i, a) => ({ offset: i / (a.length - 1), transform: `rotate(${(dir * amp * k).toFixed(1)}deg)` }))
      r.play(halves[0], swing(1, HANG), { duration: 1300, easing: 'cubic-bezier(.3,.6,.3,1)' })
      r.play(halves[1], swing(-1, HANG * 2.2), { duration: 1300, easing: 'cubic-bezier(.3,.6,.3,1)' })
      const frag = document.createDocumentFragment(), jobs = []
      for (let i = 0; i < 34; i++) {
        const s = document.createElement('i')
        // the first four are the torn middle of the tape itself; the rest are sparks
        if (i < 4) s.className = 'shred'
        else if (i % 3 === 0) s.className = 'red'
        frag.appendChild(s)
        const ang = i < 4 ? -Math.PI * [0.18, 0.38, 0.62, 0.82][i] : -Math.PI * (0.08 + 0.84 * Math.random())
        const sp = i < 4 ? 520 + Math.random() * 160 : 380 + Math.random() * 520
        const vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp
        const fr = []
        for (let k = 0; k <= 8; k++) {
          const tt = k / 8 * 1.3
          fr.push({ offset: k / 8, opacity: k === 8 ? 0 : 1, transform: `translate(${(vx * tt).toFixed(1)}px, ${(vy * tt + 620 * tt * tt).toFixed(1)}px) rotate(${(k * 70 * (i % 2 ? 1 : -1))}deg)` })
        }
        jobs.push([s, fr, { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' }])
      }
      sparks.appendChild(frag)
      jobs.forEach(([s, f, o]) => r.play(s, f, o))
      confetti(r, { n: 50, top: roomTop() - 60, fall: 2400, delay: 200, spread: 2400 })
    }
  }

  function roll(el, r, c) {
    const flaps = el.querySelector('.rm-flaps')
    const was = el.querySelector('.rm-was')
    const now = el.querySelector('.rm-now')
    const to = c.name.toUpperCase(), from = c.best.name.toUpperCase()
    const n = Math.max(to.length, from.length)
    const target = to.padEnd(n, ' '), start = from.padEnd(n, ' ')
    flaps.querySelectorAll('.rm-flap').forEach((f) => f.remove())
    // the tile size fits the longer name in the width of the glass
    const gaps = [...target].filter((ch) => ch === ' ').length
    const fw = Math.max(40, Math.min(96, Math.floor((flaps.clientWidth || 904) - 10 * (n - 1)) / (n - gaps * 0.55)))
    flaps.style.setProperty('--fw', fw.toFixed(1) + 'px')
    const tiles = []
    for (let i = 0; i < n; i++) {
      const f = document.createElement('span')
      f.className = 'rm-flap'
      f.setAttribute('aria-hidden', 'true')
      flaps.appendChild(f)
      tiles.push(f)
    }
    const set = (f, ch) => { f.textContent = ch.trim() ? ch : ''; f.classList.toggle('is-gap', !ch.trim()) }
    const final = () => { tiles.forEach((f, i) => { set(f, target[i]); f.classList.toggle('is-landed', !!target[i].trim()) }) }
    if (c.calm) { final(); return }
    tiles.forEach((f, i) => set(f, start[i]))
    const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    rise(r, el.querySelector('.rm-roll-h'), 60)
    r.play(was, [{ opacity: 0, transform: 'translateY(30px)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: 200, fill: 'backwards', easing: 'cubic-bezier(.2,.8,.2,1)' })
    const START = 600, STEP = 110, FLIPS = 7, TICK = 75
    tiles.forEach((f, i) => {
      const land = START + i * STEP + FLIPS * TICK
      for (let k = 0; k < FLIPS; k++) {
        r.later(() => {
          set(f, target[i].trim() || start[i].trim() ? ABC[Math.floor(Math.random() * 26)] : ' ')
          r.play(f, [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-80deg)', offset: 0.5 }, { transform: 'rotateX(0deg)' }], { duration: TICK, easing: 'linear' })
        }, START + i * STEP + k * TICK)
      }
      r.later(() => { set(f, target[i]); f.classList.toggle('is-landed', !!target[i].trim()) }, land)
    })
    const done = START + (n - 1) * STEP + FLIPS * TICK
    r.play(now, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1.06)', offset: 0.7 }, { opacity: 1, transform: 'none' }], { duration: 620, delay: done - 200, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' })
    r.later(() => confetti(r, { n: 40, top: roomTop() - 60, fall: 1800, delay: 0, spread: 1600 }), done)
    r.later(final, done + 300)
  }

  function stamp(el, r, c) {
    const ink = el.querySelector('.rm-ink')
    const shock = el.querySelector('.rm-shock')
    const rows = [...el.querySelectorAll('.rm-rows li')]
    if (c.calm) return
    rows.forEach((li, i) => r.play(li, [{ opacity: 0, transform: 'translateX(-30px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 80 + i * 110, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }))
    const AT = 720
    r.play(ink, [
      { opacity: 0, transform: 'scale(2.4) rotate(-7deg)' },
      { opacity: 1, transform: 'scale(.95) rotate(0deg)', offset: 0.78 },
      { opacity: 1, transform: 'scale(1) rotate(0deg)' },
    ], { duration: 460, delay: AT, easing: 'cubic-bezier(.55,0,.8,.3)', fill: 'backwards' })
    r.play(shock, [{ opacity: 0, transform: 'scale(.96)' }, { opacity: 0.9, transform: 'scale(1)', offset: 0.08 }, { opacity: 0, transform: 'scale(1.4)' }], { duration: 700, delay: AT + 360, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' })
    r.play(el, [0, -14, 10, -6, 3, 0].map((y, i, a) => ({ offset: i / (a.length - 1), transform: `translateY(${y}px)` })), { duration: 420, delay: AT + 360, easing: 'ease-out' })
    r.later(() => confetti(r, { n: 30, top: roomTop() - 60, fall: 1500, delay: 0, spread: 1200 }), AT + 360)
  }

  function belt(el, r, c) {
    const [left, right] = el.querySelectorAll('.rm-strap > i')
    const plate = el.querySelector('.rm-plate')
    const sheen = el.querySelector('.rm-plate-sheen')
    if (c.calm) return
    rise(r, el.querySelector('.rm-belt-head'), 0)
    const slide = (node, dir) => r.play(node, [{ transform: `translateX(${dir * 105}%)` }, { transform: 'none' }], { duration: 820, delay: 240, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' })
    slide(left, -1); slide(right, 1)
    r.play(plate, [
      { opacity: 0, transform: 'scale(1.7) rotate(-20deg)' },
      { opacity: 1, transform: 'scale(.94) rotate(3deg)', offset: 0.7 },
      { opacity: 1, transform: 'none' },
    ], { duration: 620, delay: 900, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'backwards' })
    r.play(sheen, [{ transform: 'translateX(-130%)' }, { transform: 'translateX(130%)' }], { duration: 1100, delay: 1500, easing: 'cubic-bezier(.4,0,.2,1)' })
    rise(r, el.querySelector('.rm-belt-t'), 1400, 24)
    r.later(() => confetti(r, { n: 44, top: roomTop() - 60, fall: 1900, delay: 0, spread: 2000 }), 1300)
  }

  /* ============================================================ SCORE */
  const nums = (el) => [...el.querySelectorAll('[data-rec-num]')]

  function card(el, r, c) {
    const slab = el.querySelector('.rs-slab')
    const sheen = el.querySelector('.rs-sheen')
    const facts = el.querySelector('.rs-facts')
    if (c.calm) return
    rise(r, slab, 0, 30)
    count(r, nums(el), 0, c.score, {
      delay: 350,
      done: () => {
        r.play(slab, [{ transform: 'scale(1)' }, { transform: 'scale(1.025)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 480, easing: 'cubic-bezier(.2,.8,.2,1)' })
        r.play(sheen, [{ transform: 'translateX(-120%)' }, { transform: 'translateX(120%)' }], { duration: 1100, easing: 'cubic-bezier(.4,0,.2,1)' })
      },
    })
    rise(r, facts, 1500, 30)
  }

  function reels(el, r, c) {
    const box = el.querySelector('.rs-reelbox')
    let row = box.querySelector('.rs-reelrow')
    if (row) row.remove()
    // one reel per digit: the strip holds 0 to 9 three times, so every reel rolls forward at least one turn
    const to = text(c.score)
    const from = text(c.best.score).padStart(to.length, ' ').slice(-to.length)
    const dot = to.indexOf('.')
    row = document.createElement('span')
    row.className = 'rs-reelrow'
    row.setAttribute('aria-hidden', 'true')
    let decs = null
    const tiles = []
    const strip = Array.from({ length: 30 }, (_, i) => `<span>${i % 10}</span>`).join('')
    for (let i = 0; i < to.length; i++) {
      const ch = to[i]
      let into = row
      if (dot >= 0 && i > dot) {
        if (!decs) { decs = document.createElement('span'); decs.className = 'rs-decs-row'; row.appendChild(decs) }
        into = decs
      }
      if (/\d/.test(ch)) {
        const t = document.createElement('span')
        t.className = 'rs-tile'
        t.innerHTML = `<span class="rs-strip">${strip}</span>`
        into.appendChild(t)
        tiles.push({ el: t, strip: t.firstElementChild, a: /\d/.test(from[i]) ? Number(from[i]) : 0, b: 20 + Number(ch) })
      } else {
        const s = document.createElement('span')
        s.className = 'rs-sep'
        s.textContent = ch
        into.appendChild(s)
      }
    }
    box.appendChild(row)
    // size the board to the glass: one digit of the display face, then the row scaled to the width it has (layout
    // sizes, not rects, so the showcase zoom does not enter into it)
    function fit() {
      row.style.fontSize = '100px'
      const m = document.createElement('span')
      m.textContent = '0'
      m.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap'
      row.appendChild(m)
      const dEm = Math.max(0.3, Math.min(0.9, m.offsetWidth / 100))
      m.remove()
      row.style.setProperty('--dw', dEm.toFixed(3) + 'em')
      const avail = el.clientWidth || 904
      row.style.fontSize = Math.min(260, Math.floor(100 * avail / (row.scrollWidth || 1000))) + 'px'
    }
    fit()
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!r.dead) fit() })
    const LH = 1.12
    const at = (t, n) => { t.strip.style.transform = `translateY(${(-n * LH).toFixed(3)}em)` }
    const final = () => tiles.forEach((t) => { at(t, t.b); t.el.classList.add('is-landed') })
    if (c.calm) { final(); return }
    tiles.forEach((t) => { t.el.classList.remove('is-landed'); at(t, t.a) })
    const START = 500, GAP = 150, SPIN = 1000
    tiles.forEach((t, i) => {
      const d = START + i * GAP
      r.later(() => {
        at(t, t.b)
        r.play(t.strip, [
          { transform: `translateY(${(-t.a * LH).toFixed(3)}em)` },
          { transform: `translateY(${(-(t.b + 0.18) * LH).toFixed(3)}em)`, offset: 0.86 },
          { transform: `translateY(${(-t.b * LH).toFixed(3)}em)` },
        ], { duration: SPIN, easing: 'cubic-bezier(.45,.05,.25,1)' })
      }, d)
      r.later(() => {
        t.el.classList.add('is-landed')
        r.play(t.el, [{ filter: 'brightness(1.8)', transform: 'translateY(.03em)' }, { filter: 'brightness(1)', transform: 'none' }], { duration: 380, easing: 'ease-out' })
      }, d + SPIN)
    })
    const landed = START + (tiles.length - 1) * GAP + SPIN
    rise(r, el.querySelector('.rs-facts'), landed - 200, 30)
    r.later(final, landed + 400)
  }

  function duel(el, r, c) {
    const old = el.querySelector('.rs-old')
    const nowRow = el.querySelector('.rs-now')
    const final = () => old.style.setProperty('--k', '1')
    if (c.calm) { final(); return }
    old.style.setProperty('--k', '0')
    rise(r, el.querySelector('.rs-was'), 0, 30)
    const strike = el.querySelector('.rs-strike')
    r.later(() => {
      old.style.setProperty('--k', '1')
      r.play(strike, [{ transform: 'rotate(-4deg) scaleX(0)' }, { transform: 'rotate(-4deg) scaleX(1)' }], { duration: 420, easing: 'cubic-bezier(.6,0,.2,1)' })
    }, 650)
    rise(r, el.querySelector('.rs-down'), 900, -20)
    rise(r, nowRow, 1000, 60)
    count(r, nums(el), c.best.score, c.score, { delay: 1100, dur: 1300 })
  }

  function bars(el, r, c) {
    const lanes = [...el.querySelectorAll('.rs-lane')]
    const o = Math.max(0, Math.min(1, c.best.score / MAX)), n = Math.max(0, Math.min(1, c.score / MAX))
    lanes.forEach((l) => { l.style.setProperty('--o', o.toFixed(4)); l.style.setProperty('--n', n.toFixed(4)) })
    const [newLane, oldLane] = lanes
    const setG = (l, g) => l.style.setProperty('--g', g.toFixed(4))
    const setK = (k) => newLane.style.setProperty('--k', k.toFixed(4))
    const final = () => { lanes.forEach((l) => setG(l, 1)); setK(1) }
    if (c.calm) { final(); return }
    lanes.forEach((l) => setG(l, 0)); setK(0)
    // both bars grow to the old best together; then the player's bar runs on in the full red, and the number with it
    let landed = false
    r.later(() => r.loop((t) => {
      if (landed) return false
      const a = Math.min(1, t / 0.9), b = Math.max(0, Math.min(1, (t - 0.9) / 0.8))
      lanes.forEach((l) => setG(l, easeOut(a)))
      setK(easeOut(b))
      if (b >= 1) { landed = true; final(); return false }
      return true
    }), 300)
    r.later(() => { landed = true; final() }, 300 + 1700 + 400)
    count(r, nums(el), 0, c.score, { delay: 300, dur: 1700, ease: (x) => (x < 0.53 ? (c.best.score / Math.max(1, c.score)) * easeOut(x / 0.53) : (c.best.score + (c.score - c.best.score) * easeOut((x - 0.53) / 0.47)) / Math.max(1, c.score)) })
    rise(r, oldLane, 100, 20)
    rise(r, newLane, 0, 20)
  }

  function full(el, r, c) {
    const whole = el.querySelector('[data-rec-whole]')
    const [w] = splitScore(c.score)
    if (c.calm) return
    // the whole number counts in its own format; the decimals and the margin arrive once it lands
    const paint = (v) => { whole.textContent = splitScore(v)[0] }
    paint(0)
    let landed = false
    const land = () => { if (landed) return; landed = true; whole.textContent = w }
    r.later(() => r.loop((t) => {
      if (landed) return false
      const k = Math.min(1, t / 1.6)
      paint(c.score * expo(k))
      if (k < 1) return true
      land(); return false
    }), 300)
    r.later(land, 2300)
    rise(r, el.querySelector('.rs-decs'), 1700, 30)
    rise(r, el.querySelector('.rs-chip'), 2000, 30)
  }

  /* ============================================================ VIDEO: the record strike as a reel */
  // a section's reels play while its run wants them (r.reels), the design is on show, the screen is open and the video
  // is in view (a glass off screen, or the machine not on show, plays nothing); reduced motion never plays them
  const seen = window.IntersectionObserver ? new IntersectionObserver((entries) => {
    for (const en of entries) { en.target._seen = en.isIntersecting; drive(en.target) }
  }) : null
  function drive(v) {
    const d = v.closest('[data-sv]')
    const go = !!v._want && (v._seen ?? true) && open && !reduced.matches && !host.hidden && !!d && !d.hidden
    v.muted = true
    if (go && v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}) }
    else if (!go && !v.paused) v.pause()
  }
  function reelsOf(r, el, delay = 0) {
    const vids = [...el.querySelectorAll('video')]
    vids.forEach((v) => {
      const rate = Number((v.closest('[data-rate]') || {}).dataset?.rate) || 1
      v.defaultPlaybackRate = rate; v.playbackRate = rate
      if (seen && !v._watched) { v._watched = true; seen.observe(v) }
    })
    r.later(() => vids.forEach((v) => { v._want = true; drive(v) }), delay)
  }
  function framed(el, r, c) {
    reelsOf(r, el)
    if (c.calm) return
    r.play(el.querySelector('video'), [{ transform: 'scale(1.1)' }, { transform: 'scale(1)' }], { duration: 3200, easing: 'cubic-bezier(.2,.7,.2,1)' })
    r.play(el.querySelector('.rp-tag'), [{ opacity: 0, transform: 'translateX(-30px)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: 500, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' })
  }
  function grade(el, r, c) {
    reelsOf(r, el)
    if (c.calm) return
    r.play(el.querySelector('video'), [{ transform: 'scale(1.12)', filter: 'grayscale(1) contrast(1.15) brightness(2.6)' }, { transform: 'scale(1)', filter: 'grayscale(1) contrast(1.15) brightness(1.9)' }], { duration: 2600, easing: 'cubic-bezier(.2,.7,.2,1)' })
    rise(r, el.querySelector('.rp-grade-cap b'), 500, 60)
    rise(r, el.querySelector('.rp-grade-cap > span'), 800, 30)
  }
  // Replay: the bar follows the reel, the mark on it is the moment of contact, the frame the playhead is on lights
  function replay(el, r, c) {
    const v = el.querySelector('.rp-screen video')
    const scrub = el.querySelector('.rp-scrub')
    const film = [...el.querySelectorAll('.rp-film li')]
    const strike = Number(v.dataset.strike) || 0, D = () => (v.duration > 0 ? v.duration : Number(v.dataset.dur) || 1)
    scrub.style.setProperty('--at', (strike / D()).toFixed(4))
    const at = (t) => {
      scrub.style.setProperty('--p', Math.max(0, Math.min(1, t / D())).toFixed(4))
      // the frame nearest the playhead, round the loop
      let best = null, bd = Infinity
      film.forEach((li) => { const d0 = Math.abs(Number(li.dataset.t) - t), d = Math.min(d0, D() - d0); if (d < bd) { bd = d; best = li } })
      film.forEach((li) => li.classList.toggle('is-now', li === best))
    }
    r.cleanup = () => film.forEach((li) => li.classList.remove('is-now'))
    // at rest, and until the reel runs, the poster: the strike frame
    at(strike)
    reelsOf(r, el)
    // the bar follows the reel whenever it plays (a redraw at rest keeps it playing too)
    if (!reduced.matches) r.loop(() => { if (!v.paused && v.readyState >= 2) at(v.currentTime); return true })
    if (c.calm) return
    film.forEach((li, i) => r.play(li, [{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 300 + i * 120, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }))
  }
  function trio(el, r, c) {
    reelsOf(r, el)
    if (c.calm) return
    el.querySelectorAll('.rp-band').forEach((b, i) => {
      r.play(b, [{ opacity: 0, transform: `translateX(${i % 2 ? 80 : -80}px)` }, { opacity: 1, transform: 'none' }], { duration: 640, delay: 150 + i * 260, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' })
    })
  }
  function print(el, r, c) {
    reelsOf(r, el)
    if (c.calm) return
    const [older, newer] = el.querySelectorAll('.rp-card')
    r.play(older, [{ opacity: 0, transform: 'translateY(-40px)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' })
    r.play(newer, [
      { opacity: 0, transform: 'translate(-60px, -140px) rotate(-10deg) scale(1.08)' },
      { opacity: 1, transform: 'translate(0, 6px) rotate(1deg) scale(1)', offset: 0.75 },
      { opacity: 1, transform: 'none' },
    ], { duration: 820, delay: 500, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' })
    r.play(el.querySelector('.rp-seal'), [{ opacity: 0, transform: 'scale(1.8) rotate(-40deg)' }, { opacity: 1, transform: 'scale(.92)', offset: 0.7 }, { opacity: 1, transform: 'none' }], { duration: 520, delay: 1300, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'backwards' })
  }

  /* ============================================================ PUNCH AGAIN: in last, once the record has landed */
  const AGAIN_AT = 2600
  function again(el, r, c) {
    r.cleanup = () => { el.classList.remove('is-play', 'is-settled'); el.style.removeProperty('--sd') }
    if (c.calm) return
    // replayed alone (Customise changed its design) it plays in at once, as on the Big score, not after the record
    const at = c.solo ? 0 : AGAIN_AT
    el.style.setProperty('--sd', `${at}ms`)
    void el.offsetWidth
    el.classList.add('is-play')
    r.later(() => el.classList.add('is-settled'), at + 2000)
  }

  const PLAYERS = {
    'rm-burst': burst, 'rm-line': line, 'rm-roll': roll, 'rm-stamp': stamp, 'rm-belt': belt,
    'rs-card': card, 'rs-reels': reels, 'rs-duel': duel, 'rs-bars': bars, 'rs-full': full,
    'rp-frame': framed, 'rp-grade': grade, 'rp-replay': replay, 'rp-trio': trio, 'rp-print': print,
    'ag-full': again, 'ag-pair': again, 'ag-clock': again, 'ag-code': again, 'ag-pad': again,
  }
  const activeOf = (key) => (window.PSec ? window.PSec.active('machine', PAGE, key) : host.querySelector(`[data-sec="${key}"] > [data-sv]:not([hidden])`))

  function playSection(key, still, el, solo) {
    stop(key)
    el = el || activeOf(key)
    if (!el || !ctx) return
    const cls = Object.keys(PLAYERS).find((k) => el.classList.contains(k))
    if (!cls) return
    const r = mkRun(key, el)
    fitIn(el)
    if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(() => { if (!r.dead) fitIn(el) })
    PLAYERS[cls](el, r, { ...ctx, calm: reduced.matches || !!still, solo: !!solo })
  }
  function begin(o, still) {
    // a redraw at rest (the score format changed) keeps a pending hand-off to the result
    if (still) SECS.forEach(stop)
    else stopAll()
    opts = o || {}
    ctx = { score: scoreFrom(opts), best: machineBest(opts), name: playerName(opts) }
    fill()
    SECS.forEach((k) => playSection(k, still))
    if (opts.next === 'result' && !still) handoff = setTimeout(() => { if (open && window.showcase) window.showcase.mscreen('result') }, HANDOFF)
  }

  document.addEventListener('mscreen', (e) => {
    const { key, opts: o = {} } = e.detail || {}
    if (key !== PAGE) { open = false; stopAll(); return }
    open = true
    begin(o)
  })
  // a section changed design in Customise: replay only that one
  document.addEventListener('psec', (e) => {
    const d = e.detail || {}
    if (d.surface !== 'machine' || d.page !== PAGE || !open || !ctx) return
    if (!SECS.includes(d.sec)) return
    playSection(d.sec, false, d.el, true)
  })
  // the score format changed while the record is on show: redraw it at rest in the new format
  document.addEventListener('decimals', () => { if (open && ctx) { const keep = { ...opts }; begin(keep, true) } })
  // reduced motion switched while the record is on show: play it again (a reel that played shows its poster again)
  const onReduce = () => {
    if (!open || !ctx) return
    host.querySelectorAll('.rec-photo video').forEach((v) => { v._want = false; drive(v); if (v.played.length) v.load() })
    begin({ ...opts })
  }
  if (reduced.addEventListener) reduced.addEventListener('change', onReduce)
})()
