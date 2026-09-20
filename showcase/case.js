/* Case study motion. Everything here is driven by the #caseScroll position (the dialog scrolls, not the window),
   read once per frame and written as transform and opacity, or as a state attribute CSS turns into one.
   Nothing starts hidden: with motion off, or before this runs, every block rests in its final state.
   The embedded machine (./?embed=machine) loads this same page, so the script stands down there. */
(() => {
  'use strict'
  if (document.documentElement.dataset.embed === 'machine') return
  const root = document.getElementById('case')
  const scroller = document.getElementById('caseScroll')
  if (!root || !scroller) return

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
  const narrow = window.matchMedia('(max-width: 859px)')
  const $$ = (sel) => [...root.querySelectorAll(sel)]
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
  const fmt = (n) => Math.round(n).toLocaleString('en-US')

  const nav = root.querySelector('.cs-localnav')
  const navLinks = $$('.cs-localnav-links a')
  const page = root.querySelector('.cs-page')
  const heroCopy = root.querySelector('[data-hero-copy]')
  const heroStage = root.querySelector('[data-hero-stage]')
  const grounds = $$('.cs-sec[data-ground]')
  const chapters = $$('[data-chapter]')
  const lights = $$('[data-highlight] > span')
  const parallax = $$('[data-parallax]')
  const scaleIns = $$('[data-scale-in]')
  const frames = $$('[data-diagram-frame]')
  let rises = $$('[data-rise]')

  const seqs = $$('[data-seq]').map((el) => ({
    el, kind: el.dataset.seq,
    stage: el.querySelector('.cs-seq-stage'), pin: el.querySelector('.cs-seq-pin'),
    beats: [...el.querySelectorAll('.cs-beat')], active: -1,
    fill: el.querySelector('[data-fill]'), marks: [...el.querySelectorAll('[data-mark]')], bell: el.querySelector('.cs-tester-bell'),
  }))
  // data-count-live="designs" counts the designs in the page's own machine markup (every result section's options and
  // every design of every section on the other screens, psec.js), so the figure never drifts from what the Customise
  // rows page through. The shared header and strip are counted once each, not once per screen.
  function liveCount(kind) {
    if (kind !== 'designs') return 0
    const secs = [...document.querySelectorAll('.mscreen[data-mscreen] [data-sec]:not([data-sec-scope="global"])')]
    const shared = new Map()
    document.querySelectorAll('.mscreen[data-mscreen] [data-sec][data-sec-scope="global"]').forEach((el) => { if (!shared.has(el.dataset.sec)) shared.set(el.dataset.sec, el) })
    const count = (el) => (el.hasAttribute('data-sv-names')
      ? el.dataset.svNames.split('|').filter((n) => n.trim()).length
      : [...el.children].filter((c) => c.hasAttribute('data-sv')).length)
    return document.querySelectorAll('#screen .var[data-name]').length
      + secs.reduce((n, el) => n + count(el), 0) + [...shared.values()].reduce((n, el) => n + count(el), 0)
  }
  const counters = $$('[data-count-to]').map((el) => {
    const to = (el.dataset.countLive && liveCount(el.dataset.countLive)) || Number(el.dataset.countTo) || 0
    if (el.dataset.countLive) { el.dataset.countTo = to; el.textContent = fmt(to) }
    return {
      el, to, score: el.dataset.countScore != null,
      beat: el.dataset.countBeat != null ? Number(el.dataset.countBeat) : null,
      state: 'idle', raf: 0,
    }
  })
  // a score counts up in whole points like the glass, and lands with its three decimals when the format shows them
  const PF = () => window.PunchFormat
  function land(c) {
    if (c.score && PF()) c.el.innerHTML = PF().scoreHTML(PF().withDecimals(c.to, 'case-tester'))
    else c.el.textContent = fmt(c.to)
  }
  document.addEventListener('decimals', () => {
    for (const c of counters) if (c.score) { if (c.state === 'done') land(c); else if (c.state === 'idle') resetCount(c) }
  })

  /* ------------------------------------------------------------ the system specimens and the glyph row */
  const glyph = (name) => (window.glyphSVG ? window.glyphSVG(name) : '')
  function buildSpecimens() {
    for (const spec of $$('.cs-spec')) {
      spec.innerHTML =
        '<p class="sp-label">Ultimate result</p>' +
        `<p class="sp-score" style="--sp-chars:${PF() ? PF().width(999999).toFixed(2) : 7}">${PF() ? PF().scoreHTML(999999) : '999,999'}</p>` +
        '<div class="sp-charge"><span></span></div>' +
        '<p class="sp-grade">Perfect punch</p>' +
        '<div class="sp-ranks">' +
          `<div class="sp-rank"><span class="sp-glyph">${glyph('machine')}</span><span><small>Machine</small><b>#1</b></span></div>` +
          `<div class="sp-rank"><span class="sp-glyph">${glyph('city')}</span><span><small>City</small><b>#1</b></span></div>` +
        '</div>' +
        '<div class="sp-ranks">' +
          `<div class="sp-rank"><span class="sp-glyph">${glyph('force')}</span><span><small>Force</small><b>315<small>kg</small></b></span></div>` +
          `<div class="sp-rank"><span class="sp-glyph">${glyph('speed')}</span><span><small>Speed</small><b>31<small>km/h</small></b></span></div>` +
        '</div>'
    }
    for (const el of $$('[data-case-glyph]')) el.innerHTML = glyph(el.dataset.caseGlyph)
  }
  buildSpecimens()
  document.addEventListener('decimals', buildSpecimens)

  /* ------------------------------------------------------------ live embeds of the machine glass: two at most, loaded late */
  const embeds = {}
  for (const frame of $$('iframe[data-embed]')) {
    embeds[frame.dataset.embed] = { frame, kind: frame.dataset.kind || 'machine', want: frame.dataset.screen || frame.dataset.page || null, shown: null, sc: null, ready: false, loading: false }
  }
  function loadEmbed(e) {
    if (!e || e.loading) return
    e.loading = true
    e.frame.addEventListener('load', () => waitReady(e, 0))
    e.frame.src = e.kind === 'phone' ? `./?embed=phone&page=${e.want || 'hit'}` : './?embed=machine&follow=0'
  }
  function waitReady(e, tries) {
    let sc = null
    try { sc = e.frame.contentWindow && (e.kind === 'phone' ? e.frame.contentWindow.punchApp : e.frame.contentWindow.showcase) } catch (err) { sc = null }
    if (sc && typeof (e.kind === 'phone' ? sc.go : sc.mscreen) === 'function') {
      e.sc = sc
      e.ready = true
      applyEmbed(e)
      // let the screen it was asked for paint before the glass shows it
      setTimeout(() => e.frame.classList.add('is-ready'), 320)
      // once the hero's glass is up, the machine chapter's glass loads in the quiet after it, so it is ready on arrival
      if (e === embeds.hero && embeds.seq) setTimeout(() => { if (open) loadEmbed(embeds.seq) }, 1800)
    } else if (tries < 80) setTimeout(() => waitReady(e, tries + 1), 100)
  }
  function applyEmbed(e) {
    if (!e.ready || !e.want || e.shown === e.want) return
    try { if (e.kind === 'phone') e.sc.go(e.want, { player: 'me' }); else e.sc.mscreen(e.want) } catch (err) { /* the embed went away: it reloads on the next open */ }
    e.shown = e.want
  }
  function showOnEmbed(e, key) {
    if (!e) return
    e.want = key
    applyEmbed(e)
  }

  /* ------------------------------------------------------------ counting */
  function runCount(c) {
    cancelAnimationFrame(c.raf)
    if (!motion) { land(c); c.state = 'done'; return }
    c.state = 'running'
    c.el.classList.remove('is-ghost')
    const t0 = performance.now()
    const dur = c.to >= 1000 ? 1500 : 1100
    const step = (now) => {
      const t = clamp((now - t0) / dur)
      const e = 1 - Math.pow(1 - t, 4)
      c.el.textContent = fmt(c.to * e)
      if (t < 1) c.raf = requestAnimationFrame(step)
      else { land(c); c.state = 'done' }
    }
    c.raf = requestAnimationFrame(step)
  }
  function resetCount(c) {
    cancelAnimationFrame(c.raf)
    c.state = 'idle'
    // a score that has not landed shows the plate's empty cells, as the glass does
    c.el.textContent = c.el.dataset.countGhost || '0'
    if (c.score && PF() && PF().decimals()) c.el.insertAdjacentHTML('beforeend', '<span class="dec">.000</span>')
    c.el.classList.toggle('is-ghost', !!c.el.dataset.countGhost)
  }

  /* ------------------------------------------------------------ state */
  let motion = !reduce.matches
  let open = false, primed = false, queued = false
  let V = 0, navH = 52

  function measure() {
    V = scroller.clientHeight || window.innerHeight
    navH = nav ? nav.offsetHeight : 52
    root.style.setProperty('--vh', V + 'px')
    fitDuo()
  }
  // the phone's size follows the window's height and its column follows the width, so where the column is narrow the phone
  // and the glass beside it would spill over the copy: the pair is drawn smaller, just enough to fit its column
  function fitDuo() {
    const s = seqs.find((q) => q.kind === 'phone')
    if (!s) return
    const phone = s.el.querySelector('.cs-phone-seq'), mini = s.el.querySelector('.cs-mini')
    if (!phone || !mini || !mini.firstElementChild) return
    const w = phone.offsetWidth + (parseFloat(getComputedStyle(mini).marginLeft) || 0) + mini.firstElementChild.offsetWidth
    const room = s.stage.clientWidth
    if (!w || !room) return
    s.el.style.setProperty('--duo-k', Math.min(1, room / w).toFixed(4))
  }

  function setMotion() {
    motion = !reduce.matches
    root.classList.toggle('cs-motion', motion)
    if (motion) return
    // no motion: everything to its resting place, every number to its value
    for (const el of rises) el.classList.add('is-in')
    for (const el of [heroCopy, heroStage]) if (el) { el.style.transform = ''; el.style.opacity = '' }
    for (const el of parallax) if (el.firstElementChild) el.firstElementChild.style.transform = ''
    for (const el of scaleIns) if (el.firstElementChild) el.firstElementChild.style.transform = ''
    for (const c of counters) { cancelAnimationFrame(c.raf); land(c); c.el.classList.remove('is-ghost'); c.state = 'done' }
    for (const s of seqs) if (s.kind === 'idea') stepIdea(s)
  }

  function prime() {
    // numbers that are not yet on screen wait at zero and count up when they arrive
    if (primed) return
    primed = true
    if (!motion) return
    for (const c of counters) {
      const r = c.el.getBoundingClientRect()
      if (c.beat != null || r.top > V * .85) resetCount(c)
    }
  }

  /* ------------------------------------------------------------ beats */
  function setBeat(s, i) {
    s.active = i
    s.el.dataset.beat = String(i)
    s.beats.forEach((b, n) => b.classList.toggle('is-active', n === i))
    const b = s.beats[i]
    if (s.kind === 'machine') {
      s.el.dataset.screen = b.dataset.screen
      s.el.dataset.zoom = b.dataset.zoom || ''
      if (embeds.seq) showOnEmbed(embeds.seq, b.dataset.screen)
    } else if (s.kind === 'phone') {
      s.el.dataset.layer = b.dataset.layer
      s.el.dataset.over = b.dataset.over || ''
    } else if (s.kind === 'system') {
      s.el.dataset.look = b.dataset.look
      s.el.dataset.glyphs = b.dataset.glyphs || ''
    } else if (s.kind === 'idea') {
      for (const c of counters) {
        if (c.beat == null || !s.el.contains(c.el)) continue
        if (!motion) continue
        if (i >= c.beat) { if (c.state === 'idle') runCount(c) } else if (c.state !== 'idle') resetCount(c)
      }
      if (!motion) stepIdea(s)
    }
  }
  // without motion the charge steps with the beats instead of following the scroll
  function stepIdea(s) {
    const i = Math.max(0, s.active)
    paintCharge(s, [0.3, 0.9, 1, 1][i] ?? 1)
  }
  function paintCharge(s, f) {
    if (s.fill) s.fill.style.transform = `scaleY(${f.toFixed(4)})`
    for (const m of s.marks) m.classList.toggle('is-passed', f >= Number(m.dataset.mark))
    if (s.bell) s.bell.classList.toggle('is-rung', f >= 0.995)
  }

  /* ------------------------------------------------------------ one frame: read everything, then write */
  function update() {
    queued = false
    if (!open) return
    const top0 = scroller.getBoundingClientRect().top
    const st = scroller.scrollTop
    const writes = []

    // the ground under the navigation
    const probe = top0 + navH / 2
    let ground = 'dark'
    for (const el of grounds) {
      const r = el.getBoundingClientRect()
      if (r.top <= probe && r.bottom > probe) { ground = el.dataset.ground; break }
    }
    // the chapter being read
    let chapter = ''
    const line = top0 + V * 0.4
    for (const el of chapters) {
      const r = el.getBoundingClientRect()
      if (r.top <= line && r.bottom > line) { chapter = el.id; break }
    }
    writes.push(() => {
      if (nav && nav.dataset.ground !== ground) nav.dataset.ground = ground
      for (const a of navLinks) {
        const on = a.getAttribute('href') === '#' + chapter
        if (on !== a.hasAttribute('aria-current')) on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')
      }
    })

    // rise: settle whatever has reached the lower part of the screen, once
    if (motion) {
      const arrived = []
      for (const el of rises) if (el.getBoundingClientRect().top - top0 < V * 0.92) arrived.push(el)
      if (arrived.length) {
        rises = rises.filter((el) => !arrived.includes(el))
        writes.push(() => arrived.forEach((el) => el.classList.add('is-in')))
      }
    }

    // highlighted statements light up line by line as they pass the upper third
    if (motion) {
      const lit = lights.map((el) => el.getBoundingClientRect().top - top0 < V * 0.62)
      writes.push(() => lights.forEach((el, i) => el.classList.toggle('is-lit', lit[i])))
    }

    // hero: the copy drifts slower than the page and fades as it leaves, the pair grows to full size
    if (motion && st < V * 1.6) {
      const k = clamp(st / (V * 0.55))
      writes.push(() => {
        if (heroCopy) {
          heroCopy.style.transform = `translate3d(0, ${(st * 0.3).toFixed(1)}px, 0)`
          heroCopy.style.opacity = String(Math.max(0.12, 1 - st / (V * 0.7)).toFixed(3))
        }
        if (heroStage) heroStage.style.transform = `scale(${(0.9 + 0.1 * k).toFixed(4)})`
      })
    }

    // photographs: the environment settles from a close crop, the portraits drift inside their frames
    if (motion) {
      for (const el of scaleIns) {
        const r = el.getBoundingClientRect()
        if (r.bottom < top0 || r.top > top0 + V) continue
        const p = clamp((top0 + V - r.top) / (V + r.height))
        const img = el.firstElementChild
        writes.push(() => { if (img) img.style.transform = `scale(${(1.22 - 0.22 * Math.min(1, p * 1.6)).toFixed(4)})` })
      }
      for (const el of parallax) {
        const r = el.getBoundingClientRect()
        if (r.bottom < top0 - 100 || r.top > top0 + V + 100) continue
        const f = Number(el.dataset.parallax) || 0.1
        const c = r.top + r.height / 2 - (top0 + V / 2)
        const lim = r.height * 0.09
        const y = clamp(-c * f, -lim, lim)
        const img = el.firstElementChild
        writes.push(() => { if (img) img.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)` })
      }
    }

    // pinned sequences
    const isNarrow = narrow.matches
    for (const s of seqs) {
      const r = s.el.getBoundingClientRect()
      if (r.bottom < top0 - V || r.top > top0 + 2 * V) continue
      const pinR = (isNarrow ? s.stage : s.pin).getBoundingClientRect()
      const pinH = pinR.height
      const target = isNarrow ? top0 + navH + pinH + (V - navH - pinH) * 0.42 : top0 + navH + (V - navH) * 0.5
      let idx = 0, best = Infinity
      s.beats.forEach((b, i) => {
        const br = b.getBoundingClientRect()
        const d = Math.abs(br.top + Math.min(br.height, isNarrow ? br.height : V * 0.8) / 2 - target)
        if (d < best) { best = d; idx = i }
      })
      if (idx !== s.active) writes.push(() => setBeat(s, idx))
      if (s.kind === 'idea' && motion) {
        const range = Math.max(1, r.height - pinH)
        const p = clamp((top0 + navH - r.top) / range)
        const f = Math.max(0.04, clamp(p / 0.6))
        writes.push(() => paintCharge(s, f))
      }
      // the machine's live glass loads as its chapter comes near
      if (s.kind === 'machine' && embeds.seq && !embeds.seq.loading && r.top < top0 + V * 2.5) writes.push(() => loadEmbed(embeds.seq))
    }

    // numbers that count when they arrive
    if (motion) {
      for (const c of counters) {
        if (c.beat != null || c.state !== 'idle') continue
        const r = c.el.getBoundingClientRect()
        if (r.top - top0 < V * 0.85 && r.bottom > top0) writes.push(() => runCount(c))
      }
    }

    for (const w of writes) w()
  }
  function schedule() {
    if (queued || !open) return
    queued = true
    requestAnimationFrame(update)
  }

  /* ------------------------------------------------------------ diagrams: a board wider than the screen scrolls sideways inside its frame */
  function syncFrames() {
    for (const f of frames) {
      const over = f.scrollWidth > f.clientWidth + 2
      if (over) {
        f.tabIndex = 0
        f.setAttribute('role', 'region')
        f.setAttribute('aria-label', f.dataset.diagramFrame + ', scrolls sideways')
      } else if (f.hasAttribute('tabindex')) {
        f.removeAttribute('tabindex'); f.removeAttribute('role'); f.removeAttribute('aria-label')
      }
    }
  }

  /* ------------------------------------------------------------ open and close follow the class app.js sets */
  function onOpen() {
    open = true
    setMotion()
    measure()
    prime()
    if (embeds.hero) loadEmbed(embeds.hero)
    else if (embeds.seq) setTimeout(() => { if (open) loadEmbed(embeds.seq) }, 1200)
    if (embeds['hero-phone']) loadEmbed(embeds['hero-phone'])
    // the embeds also follow the phone flow while the dialog is closed, so each open puts them back on their story
    for (const e of Object.values(embeds)) { e.shown = null; applyEmbed(e) }
    // synchronous, before the first frame paints: whatever is already on screen settles without waiting
    update()
    syncFrames()
  }
  function onClose() {
    open = false
  }
  new MutationObserver(() => {
    const now = root.classList.contains('is-open')
    if (now && !open) onOpen()
    else if (!now && open) onClose()
  }).observe(root, { attributes: true, attributeFilter: ['class'] })

  scroller.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', () => { if (!open) return; measure(); syncFrames(); schedule() })
  if (window.ResizeObserver && page) new ResizeObserver(() => { if (open) { syncFrames(); schedule() } }).observe(page)
  const onPref = () => { setMotion(); if (open) { measure(); schedule() } }
  if (reduce.addEventListener) reduce.addEventListener('change', onPref)
  if (narrow.addEventListener) narrow.addEventListener('change', () => { if (open) { measure(); schedule() } })

  /* ------------------------------------------------------------ chapter links scroll the dialog, not the page, and move focus */
  function jump(id) {
    const t = id && document.getElementById(id)
    if (!t) return false
    // the chapter's own top goes under the navigation, so the bar turns with the chapter's ground; its padding clears the kicker
    const y = id === 'case-top' ? 0 : t.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
    scroller.scrollTo({ top: Math.max(0, y), behavior: motion ? 'smooth' : 'auto' })
    const focusEl = id === 'case-top' ? t : (t.querySelector('h2[tabindex]') || t)
    focusEl.focus({ preventScroll: true })
    return true
  }
  root.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-case-jump]')
    if (!a) return
    if (jump((a.getAttribute('href') || '').slice(1))) e.preventDefault()
  })
  // the brief drawer's deep links open the case study on a chapter (anim.js)
  window.caseStudy = { jump }

  if (root.classList.contains('is-open')) onOpen()
})()
