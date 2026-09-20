/* Machine screen: Punch now. The glass is the only place the count shows; the phone just says punch on the machine.
   One frame of sections (parts/mscreen-countdown.html): Player, Count, Call and Stage, each paged in Customise.
   Starts when app.js opens the "countdown" screen (document event "mscreen") and stops when any other screen opens.
   One clock, written on the frame (.cdn) every frame so every section holds the same moment:
     data-state  count, urgent (the last five seconds), hit, up
     --f         time left, 1 to 0          --drain  0 to 1          --hot  0 to 1 across the last five seconds
     --beat      a pulse on every second, twice a second and harder in the last five
     --spin, --sway and each stage shape's --z   the stage's own motion, which speeds up as the time drains
   The Count design on show has a painter of its own (ring, column, light drain, flip board, gauge); a change in
   Customise (document event "psec") swaps the painter and brings the new design to the same moment at once.
   Two ways to run:
   - linked to the phone: opts.start (epoch ms) and opts.seconds give the count, Math.ceil(seconds - (now - start) / 1000),
     so both ends agree on the moment; opts.impactAt (epoch ms) is the hit, which flashes and holds while the phone
     moves the machine on. Opening it again with the same start only updates impactAt.
   - on its own (from the screen bar, no start): a demo counts opts.seconds || 20 down and lands a punch at a random
     moment between 12 and 5 seconds left (or on a click on the glass). After the hit it opens the Reading screen with
     { next: 'record', score }, so the reading plays before the record. Run out without a punch and it says the time
     is up, then starts again; opts.punch === false skips the simulated punch. The demo keeps its own clock, which only
     runs while the glass is on show.
   Reduced motion: no beat, no flash, no stage motion (each stage holds a composed still that still builds with the
   time) and the time steps once a second. */
(() => {
  'use strict'
  const host = document.querySelector('.mscreen-countdown')
  if (!host) return
  const root = host.querySelector('.cdn')
  if (!root) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const PAGE = 'countdown'

  const SECONDS = 20
  const URGENT = 5      // the last five seconds build
  const HANDOFF = 1.2   // seconds between the demo's hit and the Reading screen
  const RESTART = 2.6   // seconds the demo rests on "Time is up"
  const FILL = 0.26     // seconds the time display takes to fill on the hit

  let run = null
  const SVG = 'http://www.w3.org/2000/svg'
  const secEl = (key) => root.querySelector(`[data-sec="${key}"]`)
  const activeOf = (key) => {
    if (window.PSec) { const a = window.PSec.active('machine', PAGE, key); if (a) return a }
    const s = secEl(key)
    return s ? [...s.children].find((c) => c.hasAttribute('data-sv') && !c.hidden) || s.firstElementChild : null
  }

  /* ---------------------------------------------------------- shared helpers */
  function anim(el, frames, opts) {
    if (!el || !el.animate || reduced.matches) return null
    const a = el.animate(frames, opts)
    if (run) run.anims.push(a)
    return a
  }
  const nums = (el) => [...el.querySelectorAll('[data-cd-num]')]
  function setNum(list, n, fresh) {
    for (const el of list) {
      if (el.textContent === String(n)) continue
      el.textContent = String(n)
      if (fresh) anim(el, [{ transform: 'translateY(-14%) scale(1.06)', opacity: 0 }, { transform: 'translateY(2%) scale(1)', opacity: 1, offset: 0.55 }, { transform: 'none', opacity: 1 }], { duration: 240, easing: 'cubic-bezier(.2,.9,.25,1)' })
    }
  }
  const setWord = (list, word) => list.forEach((el) => { el.textContent = word })

  /* ---------------------------------------------------------- painters: one per Count design, all fed by the same clock */
  function ring(el) {
    const arc = el.querySelector('.ccr-arc')
    const dial = el.querySelector('.ccr-dial')
    const shocks = [...el.querySelectorAll('.ccr-shock')]
    const g = el.querySelector('[data-ccr-ticks]')
    const list = nums(el)
    let ticks = []
    function build(total) {
      if (ticks.length === total) return
      g.innerHTML = ''
      ticks = Array.from({ length: total }, (_, j) => {
        // tick j stands for the second j + 1: clockwise from the top, so the arc retreats into the red last five
        const a = ((j + 0.5) / total) * Math.PI * 2
        const l = document.createElementNS(SVG, 'line')
        const r0 = 45, r1 = 49.2
        l.setAttribute('x1', (50 + Math.sin(a) * r0).toFixed(2)); l.setAttribute('y1', (50 - Math.cos(a) * r0).toFixed(2))
        l.setAttribute('x2', (50 + Math.sin(a) * r1).toFixed(2)); l.setAttribute('y2', (50 - Math.cos(a) * r1).toFixed(2))
        if (j < URGENT) l.classList.add('is-hot')
        g.appendChild(l)
        return l
      })
    }
    const arcTo = (f) => {
      const k = Math.max(0, Math.min(1, f))
      arc.style.strokeDashoffset = (100 * (1 - k)).toFixed(3)
      arc.classList.toggle('is-empty', k <= 0.001)
    }
    const ticksTo = (left) => ticks.forEach((l, j) => l.classList.toggle('is-gone', left <= j))
    let total = SECONDS
    return {
      reset(t) { total = t; build(t); arcTo(1); ticksTo(t); setWord(list, String(t)) },
      count({ n, f, left, fresh }) { setNum(list, n, fresh); arcTo(f); ticksTo(reduced.matches ? n : left) },
      hit() {
        setWord(list, 'Hit!')
        anim(dial, [{ transform: 'scale(1)' }, { transform: 'scale(1.1)', offset: 0.28 }, { transform: 'scale(.98)', offset: 0.62 }, { transform: 'scale(1)' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' })
        shocks.forEach((s, i) => anim(s, [{ transform: 'scale(1)', opacity: 0.95 }, { transform: `scale(${1.5 + i * 0.3})`, opacity: 0 }], { duration: 820 + i * 160, delay: i * 120, easing: 'cubic-bezier(.15,.7,.3,1)' }))
      },
      filling(f) { arcTo(f); ticksTo(f * total) },
      up() { setWord(list, '0'); arcTo(0); ticksTo(0) },
    }
  }

  function column(el) {
    const col = el.querySelector('.ccc-col')
    const rail = el.querySelector('.ccc-rail')
    const tag = el.querySelector('.ccc-tag')
    const list = nums(el)
    let cells = []
    let total = SECONDS
    // cell k (0 at the top) holds second (total - k): full while more than that many seconds are left
    function build(t) {
      if (cells.length === t) return
      col.style.gridTemplateRows = `repeat(${t}, 1fr)`
      col.innerHTML = Array.from({ length: t }, (_, k) => `<i class="${t - k <= URGENT ? 'is-hot' : ''}"><b></b></i>`).join('')
      cells = [...col.children]
    }
    function level(left) {
      const s = Math.max(1, Math.ceil(left))
      const cell = cells[total - s]
      if (!cell || left <= 0) { const last = cells[cells.length - 1]; return last ? last.offsetTop + last.offsetHeight : 0 }
      const part = Math.min(1, left - (s - 1))
      return cell.offsetTop + (1 - part) * cell.offsetHeight
    }
    function place(left) {
      const y = level(left) - col.offsetTop + (col.offsetTop - rail.offsetTop)
      const H = rail.clientHeight, h = tag.offsetHeight
      const top = Math.max(0, Math.min(H - h, y - 150))
      tag.style.setProperty('--lvl', top.toFixed(1) + 'px')
      tag.style.setProperty('--arrow', Math.max(22, Math.min(h - 22, y - top)).toFixed(1) + 'px')
    }
    const fillTo = (left) => cells.forEach((c, k) => { const s = total - k; c.style.setProperty('--f', Math.max(0, Math.min(1, left - (s - 1))).toFixed(3)) })
    return {
      reset(t) { total = t; build(t); fillTo(t); setWord(list, String(t)); place(t) },
      count({ n, left, fresh }) {
        const shown = reduced.matches ? n : left
        fillTo(shown); setNum(list, n, fresh); place(shown)
      },
      hit() {
        setWord(list, 'Hit!')
        if (reduced.matches) { fillTo(total); return }
        // the column refills from the floor like a strength reading, cell by cell
        cells.slice().reverse().forEach((c, i) => {
          c.style.setProperty('--f', '1')
          anim(c.firstElementChild, [{ transform: 'scaleY(0)', filter: 'brightness(1.8)' }, { transform: 'scaleY(1)', filter: 'brightness(1)' }], { duration: 260, delay: i * 22, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' })
        })
      },
      filling() {},
      up() { fillTo(0); setWord(list, '0'); place(0) },
    }
  }

  function lightDrain(el) {
    const panel = el.querySelector('.ccl-panel')
    const list = nums(el)
    const setF = (f) => panel.style.setProperty('--lf', Math.max(0, Math.min(1, f)).toFixed(4))
    return {
      reset(t) { setF(1); setWord(list, String(t)) },
      count({ n, f, fresh }) { setF(f); setNum(list, n, fresh) },
      hit() {
        setWord(list, 'Hit!')
        anim(el.querySelector('.ccl-light'), [{ filter: 'brightness(1.9)' }, { filter: 'brightness(1)' }], { duration: 700, easing: 'ease-out' })
      },
      filling(f) { setF(f) },
      up() { setF(0); setWord(list, '0') },
    }
  }

  function flip(el) {
    const cards = [...el.querySelectorAll('.ccf-card')]
    const digits = [...el.querySelectorAll('.ccf-d')]
    const bar = el.querySelector('[data-ccf-bar]')
    let segs = []
    let total = SECONDS
    function build(t) {
      if (segs.length === t) return
      // left to right: the twentieth second down to the last; the last five are red
      bar.innerHTML = Array.from({ length: t }, (_, k) => `<i class="${t - k <= URGENT ? 'is-hot' : ''}"></i>`).join('')
      segs = [...bar.children]
    }
    const segsTo = (n) => segs.forEach((s, k) => s.classList.toggle('is-gone', total - k > n))
    function show(text, fresh) {
      const s = String(text).padStart(2, '0').slice(-2)
      digits.forEach((d, i) => {
        if (d.textContent === s[i]) return
        d.textContent = s[i]
        if (fresh) anim(cards[i], [{ transform: 'rotateX(-72deg)', filter: 'brightness(.45)' }, { transform: 'rotateX(8deg)', filter: 'brightness(1.1)', offset: 0.7 }, { transform: 'none', filter: 'none' }], { duration: 300, easing: 'cubic-bezier(.3,.7,.3,1)' })
      })
    }
    return {
      reset(t) { total = t; build(t); show(t, false); segsTo(t) },
      count({ n, fresh }) { show(n, fresh); segsTo(n) },
      // the board stops on the second the strike landed, and turns red
      hit() {
        cards.forEach((c, i) => anim(c, [{ transform: 'scale(1)', filter: 'brightness(1.8)' }, { transform: 'scale(1.04)', offset: 0.3 }, { transform: 'none', filter: 'none' }], { duration: 520, delay: i * 70, easing: 'cubic-bezier(.2,.8,.2,1)' }))
      },
      filling() {},
      up() { show('00', false); segsTo(0) },
    }
  }

  function gauge(el) {
    const dial = el.querySelector('.ccg-dial')
    const fill = el.querySelector('.ccg-fill')
    const g = el.querySelector('[data-ccg-marks]')
    const list = nums(el)
    let total = SECONDS
    let built = 0
    function build(t) {
      if (built === t) return
      built = t
      g.innerHTML = ''
      // one mark per second on the arc, 20 on the left to nought on the right; a label every five
      for (let s = 0; s <= t; s++) {
        const v = s / t, a = Math.PI * v                       // 0 at the right end, PI at the left
        const major = s % 5 === 0
        const r0 = major ? 62 : 66, r1 = 71
        const l = document.createElementNS(SVG, 'line')
        l.setAttribute('x1', (100 + Math.cos(a) * r0).toFixed(2)); l.setAttribute('y1', (110 - Math.sin(a) * r0).toFixed(2))
        l.setAttribute('x2', (100 + Math.cos(a) * r1).toFixed(2)); l.setAttribute('y2', (110 - Math.sin(a) * r1).toFixed(2))
        if (major) l.classList.add('is-major')
        g.appendChild(l)
        if (major) {
          const tx = document.createElementNS(SVG, 'text')
          tx.setAttribute('x', (100 + Math.cos(a) * 52).toFixed(2)); tx.setAttribute('y', (110 - Math.sin(a) * 52).toFixed(2))
          tx.textContent = String(s)
          if (s <= URGENT) tx.classList.add('is-hot')
          g.appendChild(tx)
        }
      }
    }
    const to = (v) => {
      const k = Math.max(0, Math.min(1, v))
      dial.style.setProperty('--gv', k.toFixed(4))
      fill.style.strokeDasharray = `${(k * 100).toFixed(3)} 100`
      fill.style.strokeDashoffset = (-(1 - k) * 100).toFixed(3)
    }
    return {
      reset(t) { total = t; build(t); to(1); setWord(list, String(t)) },
      count({ n, f, fresh }) { to(f); setNum(list, n, fresh) },
      hit() {
        setWord(list, 'Hit!')
        anim(el.querySelector('.ccg-needle'), [{ filter: 'brightness(2)' }, { filter: 'none' }], { duration: 600, easing: 'ease-out' })
      },
      filling(f) { to(f) },
      up() { to(0); setWord(list, '0') },
    }
  }

  const PAINTERS = [['ccn-ring', ring], ['ccn-col', column], ['ccn-light', lightDrain], ['ccn-flip', flip], ['ccn-gauge', gauge]]
  const cache = new WeakMap()
  function paintFor(el) {
    if (!el) return null
    if (!cache.has(el)) { const p = PAINTERS.find(([c]) => el.classList.contains(c)); cache.set(el, p ? p[1](el) : null) }
    return cache.get(el)
  }
  // a painter that paints nothing, so the clock runs even while a design is missing
  const NONE = { reset() {}, count() {}, hit() {}, filling() {}, up() {} }

  /* ---------------------------------------------------------- the player: Sara, her best, her credits, the board's best */
  const PF = () => window.PunchFormat
  function player() {
    let list = null
    try { list = window.punchApp && typeof window.punchApp.leaders === 'function' ? window.punchApp.leaders() : null } catch { list = null }
    const me = Array.isArray(list) ? list.find((p) => p.id === 'me') : null
    const top = Array.isArray(list) ? list.filter((p) => p.id !== 'me' && /Dubai/.test(p.city || '')).sort((a, b) => b.score - a.score)[0] : null
    let credits = 2
    // the wallet's real count in a linked run; the standalone demo on an empty wallet keeps two, so the player on the
    // glass is not someone who has nothing left
    try {
      // the glass embedded beside the phone (?embed=machine) reads the wallet of the phone around it: its own copy of
      // the app never sees the purchase the phone just made, so it read 0 while the phone said 2 (r9 review)
      let app = window.punchApp
      try { if (window.parent !== window && window.parent.punchApp) app = window.parent.punchApp } catch { /* another origin */ }
      const c = app && app.credits
      if (Number.isFinite(c) && (c > 0 || (run && run.linked))) credits = Math.max(0, c | 0)
    } catch { /* keep two */ }
    const fmt = (n, seed) => {
      let v = Number(n) || 0
      if (Number.isInteger(v) && PF()) v = PF().withDecimals(v, seed)
      return PF() ? PF().scoreHTML(v) : Math.floor(v).toLocaleString('en-US')
    }
    return {
      name: (me && me.name) || 'Sara Malik',
      ava: (me && me.ava) || 'assets/app/avatars/sara.jpg',
      best: fmt(me ? me.score : 931440, 'me'),
      credits,
      top: top ? { first: top.name.split(' ')[0], ava: top.ava, score: fmt(top.score, top.id) } : { first: 'Omar', ava: 'assets/app/avatars/omar.jpg', score: fmt(968120, 'omar') },
      // when Sara already holds the machine's best, the other side is the one chasing her
      topLabel: top && me && Number(me.score) >= Number(top.score) ? 'Closest rival' : 'Machine best',
    }
  }
  function paintPlayer() {
    const sec = secEl('player')
    if (!sec) return
    const p = player()
    const set = (sel, fn) => sec.querySelectorAll(sel).forEach(fn)
    set('[data-cd-name]', (e) => { e.textContent = p.name })
    set('[data-cd-first]', (e) => { e.textContent = p.name.split(' ')[0] })
    set('[data-cd-ava]', (e) => { if (e.getAttribute('src') !== p.ava) e.setAttribute('src', p.ava) })
    set('[data-cd-best]', (e) => { e.innerHTML = p.best })
    set('[data-cd-credits]', (e) => { e.textContent = String(p.credits) })
    set('[data-cd-credits-word]', (e) => { e.textContent = p.credits === 1 ? 'credit' : 'credits' })
    // one pip for each credit left, up to five, and at least three places so an empty wallet still reads
    const places = Math.max(3, Math.min(5, p.credits))
    set('[data-cd-pips]', (e) => { e.innerHTML = Array.from({ length: places }, (_, i) => `<i class="${i < p.credits ? '' : 'is-off'}"></i>`).join('') })
    set('[data-cd-top-first]', (e) => { e.textContent = p.top.first })
    set('[data-cd-top-ava]', (e) => { if (p.top.ava && e.getAttribute('src') !== p.top.ava) e.setAttribute('src', p.top.ava) })
    set('[data-cd-top]', (e) => { e.innerHTML = p.top.score })
    set('[data-cd-top-l]', (e) => { e.textContent = p.topLabel })
  }

  /* ---------------------------------------------------------- the stage: the screen's own light, on the whole glass */
  // where the count sits on the glass, so the stage's light gathers on it whatever the other sections take
  function centre() {
    const c = secEl('count')
    if (c && c.offsetHeight) root.style.setProperty('--cy', String(Math.round(c.offsetTop + c.offsetHeight / 2)))
  }
  // each stage shape gets --z, 0 to 1, its place in a loop: frames rush out, streaks rise, rings leave the count
  function stageTo(phase) {
    const st = activeOf('stage')
    if (!st) return
    const shapes = st.querySelectorAll(':scope > i')
    const n = shapes.length
    shapes.forEach((s, i) => {
      const speed = Number(s.style.getPropertyValue('--s')) || 1
      const off = s.style.getPropertyValue('--d') !== '' ? Number(s.style.getPropertyValue('--d')) : i / n
      const z = ((phase * 0.22 * speed + off) % 1 + 1) % 1
      s.style.setProperty('--z', z.toFixed(4))
    })
  }

  /* ---------------------------------------------------------- the clock */
  const setState = (s) => { if (root.dataset.state !== s) root.dataset.state = s }
  const onShow = () => root.getClientRects().length > 0
  const elapsed = () => (run.linked ? (Date.now() - run.start) / 1000 : run.clock)

  function writeClock({ f, beat, hot }) {
    root.style.setProperty('--f', f.toFixed(4))
    root.style.setProperty('--drain', (1 - f).toFixed(4))
    root.style.setProperty('--hot', hot.toFixed(4))
    root.style.setProperty('--beat', beat.toFixed(3))
  }

  function stop() {
    if (!run) return
    cancelAnimationFrame(run.raf)
    run.anims.forEach((a) => { try { a.cancel() } catch { /* already gone */ } })
    delete root.dataset.demo
    run = null
  }

  // the demo's reading: better than the machine best more often than not, so the record screen has something to beat
  function demoScore() {
    let best = 931440
    try {
      const lead = window.punchApp && window.punchApp.leaders ? window.punchApp.leaders().filter((p) => p.id !== 'me' && /Dubai/.test(p.city || '')) : []
      if (lead.length) best = Math.max(...lead.map((p) => Number(p.score) || 0))
    } catch { /* the phone is not on this page: keep the default */ }
    const s = Math.min(999999.999, best + 6000 + Math.random() * Math.max(1000, 999999 - best - 6000))
    return Math.round(s * 1000) / 1000
  }

  function hit() {
    if (!run || run.phase !== 'count') return
    run.phase = 'hit'
    run.hitAt = elapsed()
    run.fillFrom = run.lastF
    setState('hit')
    writeClock({ f: run.lastF, beat: 0, hot: 0 })
    run.paint.hit()
    anim(secEl('call'), [{ transform: 'translateY(40px)', opacity: 0.2 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.9,.25,1)' })
  }

  function timeUp() {
    run.phase = 'up'
    run.upAt = elapsed()
    setState('up')
    writeClock({ f: 0, beat: 0, hot: 1 })
    run.paint.up()
  }

  function frame(now) {
    if (!run) return
    const dt = Math.min(0.1, Math.max(0, (now - run.last) / 1000))
    run.last = now
    // the demo pauses while the glass is not on show; the linked count follows the wall clock regardless
    if (!run.linked && onShow() && !document.hidden) run.clock += dt
    const t = Math.max(0, elapsed())
    const total = run.seconds

    if (run.phase === 'count') {
      if (run.linked && run.impactAt != null && Date.now() >= run.impactAt) hit()
      else if (!run.linked && t >= run.punchAt) hit()
    }

    if (run.phase === 'count') {
      const left = Math.max(0, total - t)
      const n = Math.ceil(left)
      if (left <= 0) timeUp()
      else {
        const urgent = n <= URGENT
        setState(urgent ? 'urgent' : 'count')
        const f = reduced.matches ? n / total : left / total
        run.lastF = f
        let beat = 0
        if (!reduced.matches) {
          // a beat on every whole second; twice a second, and harder, in the last five
          const p = urgent ? (t * 2) % 1 : t % 1
          beat = Math.exp(-p * (urgent ? 5.5 : 7)) * (urgent ? 1 : 0.6)
        }
        const hot = reduced.matches ? (urgent ? (URGENT + 1 - n) / URGENT : 0) : Math.max(0, Math.min(1, (URGENT - left) / URGENT + 0.2 * (urgent ? 1 : 0)))
        writeClock({ f, beat, hot })
        run.last2 = { n, left, f, t, total, urgent, beat }
        run.paint.count({ ...run.last2, fresh: run.lastN != null && n !== run.lastN })
        run.lastN = n
      }
    } else if (run.phase === 'hit') {
      const k = Math.min(1, (t - run.hitAt) / FILL)
      const e = 1 - Math.pow(1 - k, 3)
      const f = reduced.matches ? 1 : run.fillFrom + (1 - run.fillFrom) * e
      root.style.setProperty('--f', f.toFixed(4))
      run.paint.filling(f)
      if (!run.linked && t - run.hitAt >= HANDOFF) {
        const score = run.score
        stop()
        if (window.showcase) window.showcase.mscreen('loading', { next: 'record', score })
        return
      }
    } else if (run.phase === 'up') {
      if (!run.linked && t - run.upAt >= RESTART) { begin(run.opts); return }
    }

    // the stage keeps moving through the hit and the time up, calmer; it speeds up as the time drains
    if (!reduced.matches) {
      const hot = run.phase === 'count' ? Number(root.style.getPropertyValue('--hot')) || 0 : 0
      const drain = run.phase === 'count' ? 1 - run.lastF : 0.3
      run.ph += dt * (1 + drain * 1.4 + hot * 2.2)
      root.style.setProperty('--spin', (run.ph * 9).toFixed(2))
      root.style.setProperty('--sway', Math.sin(run.ph * 0.9).toFixed(3))
      stageTo(run.ph)
    }
    // linked and finished: hold still; the phone decides what the glass shows next
    if (run.linked && ((run.phase === 'hit' && t - run.hitAt >= FILL) || run.phase === 'up')) { run.raf = 0; return }
    run.raf = requestAnimationFrame(frame)
  }

  function begin(opts) {
    stop()
    const linked = Number.isFinite(opts.start) && Number.isFinite(opts.seconds) && opts.seconds > 0
    const seconds = Number(opts.seconds) > 0 ? Math.round(Number(opts.seconds)) : SECONDS
    run = {
      paint: paintFor(activeOf('count')) || NONE, opts, linked, seconds,
      start: linked ? opts.start : 0,
      impactAt: linked && Number.isFinite(opts.impactAt) ? opts.impactAt : null,
      // the demo's punch lands between 12 and 5 seconds before the end; opts.punch === false leaves it to a click
      punchAt: opts.punch === false ? Infinity : seconds - (5 + Math.random() * Math.min(7, seconds - 5)),
      score: Number.isFinite(Number(opts.score)) && opts.score != null ? Number(opts.score) : demoScore(),
      clock: 0, last: performance.now(), phase: 'count', lastN: null, lastF: 1, hitAt: 0, upAt: 0, fillFrom: 1, raf: 0, anims: [],
      ph: 0, last2: null,
    }
    setState('count')
    writeClock({ f: 1, beat: 0, hot: 0 })
    paintPlayer()
    centre()
    stageTo(0)
    run.paint.reset(seconds)
    if (!linked) root.dataset.demo = 'on'
    run.raf = requestAnimationFrame(frame)
  }

  // a Count design chosen in Customise takes over the clock at the same moment
  function swapCount(el) {
    if (!run) return
    run.paint = paintFor(el) || NONE
    run.paint.reset(run.seconds)
    if (run.phase === 'count' && run.last2) run.paint.count({ ...run.last2, fresh: false })
    else if (run.phase === 'hit') { if (run.last2) run.paint.count({ ...run.last2, fresh: false }); run.paint.hit(); run.paint.filling(1) }
    else if (run.phase === 'up') run.paint.up()
    if (run.linked && !run.raf) run.raf = requestAnimationFrame(frame)
  }

  document.addEventListener('mscreen', (e) => {
    const { key, opts = {} } = e.detail || {}
    if (key !== 'countdown') { stop(); return }
    // the same linked count again, now perhaps with the moment of impact: keep counting and take the new moment
    if (run && run.linked && Number.isFinite(opts.start) && opts.start === run.start) {
      if (Number.isFinite(opts.impactAt)) {
        run.impactAt = opts.impactAt
        if (!run.raf && run.phase === 'count') run.raf = requestAnimationFrame(frame)
      }
      return
    }
    begin(opts)
  })

  document.addEventListener('psec', (e) => {
    const d = e.detail || {}
    if (d.surface !== 'machine' || d.page !== PAGE) return
    if (d.sec === 'count') swapCount(d.el)
    if (d.sec === 'player') paintPlayer()
    // the sections around the count may change its height: the stage follows its centre
    requestAnimationFrame(() => { centre(); if (run) stageTo(run.ph) })
    if (!d.initial && run && d.el && d.sec !== 'stage') anim(d.el, [{ opacity: 0, transform: 'translateY(30px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,.9,.25,1)' })
  })

  document.addEventListener('decimals', paintPlayer)

  // the demo's punch: a click anywhere on the glass while it counts
  host.addEventListener('click', () => { if (run && !run.linked && run.phase === 'count') hit() })

  paintPlayer()
})()
