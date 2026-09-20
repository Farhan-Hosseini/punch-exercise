/* PunchApp showcase behaviour, a design task for Robotenc.
   Loading, the reveal, the machine or phone switch, themes, the logo, the glass fit, section designs in the
   Customise panel, and the case study. The phone flow itself lives in mobile.js. No dependencies. */
(() => {
  'use strict'

  const root = document.documentElement
  const body = document.body
  const $ = (id) => document.getElementById(id)
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

  /* ------------------------------------------------------------ glyphs: exported Figma paths, colour from the theme */
  const glyph = (name) => (window.glyphSVG ? window.glyphSVG(name) : '')
  // the logo hosts are filled by applyLogo with the chosen mark
  document.querySelectorAll('[data-glyph]:not([data-glyph="logo"])').forEach((el) => { el.innerHTML = glyph(el.dataset.glyph) })

  /* ------------------------------------------------------------ the run code QR, in the one QR style (qr.js, PunchQR)
     Every [data-qr] on the Result screen gets the phone app's code on its glass tile; the design sizes it with
     --pqr-size on the [data-qr] element (sections/*.css), and data-qr-glow="on" keeps the red glow behind it */
  function drawQR() {
    if (!window.PunchQR) return
    document.querySelectorAll('[data-qr]').forEach((el) => {
      if (el.querySelector(':scope > .pqr')) return
      const tile = document.createElement('span')
      tile.className = 'pqr'
      if (el.dataset.qrGlow !== 'on') tile.dataset.pqrGlow = 'off'
      el.replaceChildren(tile)
      window.PunchQR.mount(tile, { label: 'QR code for this run' })
    })
  }

  /* ------------------------------------------------------------ settings */
  const SLOTS = [
    { key: 'header', label: 'Header' },
    { key: 'hero', label: 'Score' },
    { key: 'ranks', label: 'Leaderboard ranks', toggle: true },
    { key: 'stats', label: 'Kinematic breakdown', toggle: true },
    { key: 'video', label: 'Watch performance', toggle: true },
    { key: 'clips', label: 'Recent punches', toggle: true },
    { key: 'photo', label: 'Fight photo', toggle: true },
    { key: 'cta', label: 'Punch again' },
    { key: 'sponsor', label: 'Sponsor', toggle: true },
  ]
  const TOGGLES = SLOTS.filter((s) => s.toggle).map((s) => s.key)
  // every section is on at rest except the kinematic breakdown: the numbers behind the hit are there for whoever wants
  // them, and the glass reads better without them (round eleven)
  const OFF_AT_REST = ['stats']
  const allOn = () => Object.fromEntries(TOGGLES.map((k) => [k, !OFF_AT_REST.includes(k)]))
  const layoutA = () => Object.fromEntries(SLOTS.map((s) => [s.key, 0]))
  // the brief's scores run from 0 to 999,999.000; the Score control moves in whole points, so the top score is 999,999,
  // which the glass shows at full length, 999,999.000 (PunchFormat; whole points only when the format says so)
  const TOP_SCORE = 999999
  // the example hit the showcase opens on: a strong, realistic score, not the top of the scale
  const EXAMPLE_SCORE = 863412.576
  const DEFAULTS = {
    arena:     { score: EXAMPLE_SCORE, accent: 100, glow: 40, photo: 35, space: 100, radius: 20 },
    reference: { score: EXAMPLE_SCORE, accent: 100, glow: 100, photo: 100, space: 100, radius: 24 },
  }
  const LOCKED_IN_REFERENCE = ['accent', 'glow', 'photo', 'space', 'radius']
  const KEY = 'punch-showcase.v5'

  const MACHINE_W = 1080, MACHINE_H = 3840
  const fitZoom = () => {
    const w = Math.min(document.documentElement.clientWidth - 32, 600)
    return Math.round(Math.max(12, Math.min(80, (w / MACHINE_W) * 100)))
  }
  const stageTop = () => parseFloat(getComputedStyle(document.getElementById('stage')).paddingTop) || 96
  const wholeZoom = () => Math.max(12, Math.floor(((window.innerHeight - stageTop() - 56) / MACHINE_H) * 100))
  const maxZoom = () => Math.max(12, Math.min(100, Math.floor(((document.documentElement.clientWidth - 32) / MACHINE_W) * 100)))
  const fresh = (v) => ({ ...DEFAULTS[v], on: allOn() })
  // the glass's size: 'whole' fits the whole 3840 px height to the window, null is the reading size, a number is a zoom
  const zoomNow = () => (state.zoom === 'actual' ? maxZoom() : state.zoom === 'whole' ? Math.min(wholeZoom(), maxZoom()) : Math.min(state.zoom ?? fitZoom(), maxZoom()))

  const LOGOS = {
    punchapp: { name: 'PunchApp', src: 'assets/logos/punchapp-mark.svg' },
    fist:    { name: 'Fist', src: 'assets/logos/fist-circle.svg' },
    boxer:   { name: 'Boxer', src: 'assets/logos/boxer-circle.svg' },
    glove:   { name: 'Glove', src: 'assets/logos/glove-tilt.svg' },
    upright: { name: 'Guard', src: 'assets/logos/glove-upright.svg' },
    pair:    { name: 'Pair', src: 'assets/logos/gloves-pair.svg' },
    bag:     { name: 'Speed bag', src: 'assets/logos/speedbag.svg' },
  }
  const MODES = ['mobile', 'machine', 'animation', 'system']
  // the machine flow: the result screen and the six screens around it (parts/mscreens.html)
  const MSCREENS = ['default', 'attract', 'scan', 'countdown', 'loading', 'result', 'score', 'record']
  // the global background, one look for the phone and every machine screen (mscreens/_backdrops.css), chosen in
  // Customise; the first is the default: the phone's own red glow, now on the glass too
  const BACKDROPS = [
    { key: 'glow', name: 'Red glow' }, { key: 'lights', name: 'Soft lights' }, { key: 'spot', name: 'Spotlight' },
    { key: 'beams', name: 'Stadium beams' }, { key: 'smoke', name: 'Smoke' }, { key: 'pulse', name: 'Heartbeat' },
    { key: 'embers', name: 'Embers' }, { key: 'grid', name: 'Arena grid' },
  ]
  // the phone's live machine panel loads this same page as ?embed=machine: it shows only the glass and follows the phone
  const EMBED = document.documentElement.dataset.embed === 'machine'
  // ?embed=machine&follow=0 is a machine that keeps its own screen (the case study's), not one that follows the phone
  const FOLLOW = EMBED && !/[?&]follow=0\b/.test(location.search)
  // an embedded machine is an illustration beside the phone or inside the case study, and the page around it speaks for
  // it: its live regions stay quiet, or the glass's "Great punch" would be read out on top of the phone's own
  if (EMBED) document.querySelectorAll('[aria-live], [role="status"]').forEach((el) => el.setAttribute('aria-live', 'off'))
  let state = { variant: 'arena', appearance: 'dark', zoom: null, viewV: 3, sets: {}, layout: layoutA(), mode: 'mobile', logo: 'fist', mscreen: 'default', mvar: {}, backdrop: BACKDROPS[0].key, decimals: 'on' }
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (saved && DEFAULTS[saved.variant]) {
      state = {
        // the glass opens whole ('whole' follows the window); a setting saved before that became the default moves once
        variant: saved.variant, zoom: saved.viewV === 3 ? (saved.zoom ?? null) : null, viewV: 3, sets: saved.sets || {}, layout: { ...layoutA(), ...(saved.layout || {}) },
        mode: MODES.includes(saved.mode) ? saved.mode : 'mobile', logo: LOGOS[saved.logo] ? saved.logo : 'fist',
        appearance: saved.appearance === 'light' ? 'light' : 'dark',
        mscreen: MSCREENS.includes(saved.mscreen) ? saved.mscreen : 'default',
        mvar: saved.mvar && typeof saved.mvar === 'object' ? saved.mvar : {},
        backdrop: BACKDROPS.some((b) => b.key === saved.backdrop) ? saved.backdrop : BACKDROPS[0].key,
        decimals: saved.decimals === 'off' ? 'off' : 'on',
      }
    }
  } catch { /* storage unavailable: start from defaults */ }
  for (const v of Object.keys(DEFAULTS)) state.sets[v] = { ...fresh(v), ...(state.sets[v] || {}), on: { ...allOn(), ...((state.sets[v] || {}).on || {}) } }
  // the example score moved from the top of the scale to a realistic hit: saved settings move to it once
  if (state.scoreV !== 2) { for (const v of Object.keys(DEFAULTS)) state.sets[v].score = DEFAULTS[v].score; state.scoreV = 2 }

  const cur = () => state.sets[state.variant]
  let saveTimer = 0
  const save = () => {
    if (EMBED) return // the embedded machine never writes: the page around it owns the saved state
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* private window */ } }, 200)
  }
  const locked = () => state.variant === 'reference'

  /* ------------------------------------------------------------ readable ink on the strike colour */
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  const lum = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2])
  const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
  const ACCENT = { arena: '#EB1110', reference: '#EB1110' }
  const OFF = { arena: '#F5F3EF', reference: '#FFFFFF' }
  function ctaInk(variant, amt) {
    const off = state.appearance === 'light' ? '#151413' : OFF[variant]
    const a = hex(state.appearance === 'light' ? '#E3100F' : ACCENT[variant]), o = hex(off), t = amt / 100
    const mix = a.map((c, i) => c * t + o[i] * (1 - t))
    return contrast(mix, hex('#FFFFFF')) >= contrast(mix, hex('#0B0B0C')) ? '#FFFFFF' : '#0B0B0C'
  }

  /* ------------------------------------------------------------ elements */
  const linked = $('linked'), linkedFrame = $('linkedFrame')
  const stage = $('stage'), phoneStage = $('phoneStage'), dsStage = $('dsStage'), screen = $('screen'), content = $('screenContent'), live = $('switchLive')
  const slotEl = (key) => content.querySelector(`[data-slot="${key}"]`)
  const varsOf = (key) => [...slotEl(key).querySelectorAll(':scope > .vars > .var')]
  const shown = (key) => (locked() ? 0 : Math.min(state.layout[key] || 0, varsOf(key).length - 1))
  const switching = new Set()

  /* ------------------------------------------------------------ score */
  const gradeFor = (s) => (s >= 900000 ? 'Perfect punch' : s >= 600000 ? 'Heavy hitter' : s >= 300000 ? 'Solid strike' : 'Warm up')
  let counting = false, countRaf = 0
  // every score on the glass takes the brief's full length through PunchFormat: 999,999<span class="dec">.000</span>,
  // the three decimals smaller and quieter, or whole points when the format is set to whole points
  function paintScore(value) {
    const html = window.PunchFormat.scoreHTML(value), charge = Math.max(0, Math.min(1, value / TOP_SCORE))
    document.querySelectorAll('[data-bind="score"]').forEach((el) => { if (el.innerHTML !== html) el.innerHTML = html })
    document.querySelectorAll('[data-bind="charge"]').forEach((el) => el.style.setProperty('--charge', charge))
  }
  const stopCount = () => { counting = false; cancelAnimationFrame(countRaf) }

  /* ------------------------------------------------------------ slot reels: any design can show the score on spinning reels */
  const REEL_ROWS = 30
  const rowShift = (row) => `translateY(${(-row / REEL_ROWS) * 100}%)`
  function reelMarkup(ch) {
    if (!/[0-9]/.test(ch)) return `<span class="reel-sep">${ch}</span>`
    let rows = ''
    for (let r = 0; r < REEL_ROWS; r++) rows += `<span>${r % 10}</span>`
    return `<span class="reel"><span class="reel-strip">${rows}</span></span>`
  }
  // the whole points on full size reels; the three decimals, when shown, on a small bank of their own after the point
  function reelsHTML(text) {
    const [whole, dec] = text.split('.')
    const bank = [...whole].map(reelMarkup).join('')
    return dec === undefined ? bank : bank + `<span class="reel-dec"><span class="reel-sep reel-point">.</span>${[...dec].map(reelMarkup).join('')}</span>`
  }
  function setReels(value, spin) {
    const text = window.PunchFormat.score(value)
    const digits = [...text].filter((c) => /[0-9]/.test(c)).map(Number)
    const wholeReels = text.split('.')[0].replace(/[^0-9]/g, '').length
    document.querySelectorAll('[data-reels]').forEach((host) => {
      const pattern = text.replace(/[0-9]/g, '0')
      if (host.dataset.pattern !== pattern) {
        host.innerHTML = reelsHTML(text)
        host.dataset.pattern = pattern
        host.rows = null
      }
      const strips = [...host.querySelectorAll('.reel-strip')]
      host.rows = host.rows || strips.map(() => 20)
      const animate = spin && !reduced.matches && !!strips[0]?.animate && host.offsetParent !== null
      strips.forEach((strip, i) => {
        const target = 20 + digits[i]
        strip.getAnimations().forEach((an) => an.cancel())
        strip.style.transform = rowShift(target)
        if (animate) {
          // each reel starts on its current digit, spins two full turns, and the reels stop left to right;
          // the small decimal reels stop last, in quick succession, after the whole points have landed
          const from = host.rows[i] % 10
          strip.animate([
            { transform: rowShift(from), filter: 'blur(0px)', easing: 'cubic-bezier(.3, .05, .25, 1)' },
            { filter: 'blur(3px)', offset: .14 },
            { filter: 'blur(2px)', offset: .7 },
            { transform: rowShift(target + .16), filter: 'blur(0px)', offset: .9, easing: 'ease-in-out' },
            { transform: rowShift(target), filter: 'blur(0px)' },
          ], { duration: i < wholeReels ? 1200 + i * 230 : 1200 + (wholeReels - 1) * 230 + 170 + (i - wholeReels) * 120, easing: 'linear' })
        }
        host.rows[i] = target
      })
    })
  }

  /* ------------------------------------------------------------ fit the column to the 3840 glass.
     Measured at the glass's own scale, so the fit depends on the layout alone, never on how large the showcase draws
     the machine. Scaling the column does not shrink what takes its height from the width (players, photos, numbers
     sized to the column), so a long mix is solved in a few passes instead of by one ratio, and never left long. */
  // round eleven: the panel carries no fit note and no Shuffle or Back to A; the note text still answers showcase.fit()
  const fitNote = { textContent: '', classList: { add() {}, remove() {}, toggle() {} } }
  const machineEl = $('machine')
  let fitTimer = 0
  const queueFit = (delay = 0) => { clearTimeout(fitTimer); fitTimer = setTimeout(fitScreen, delay) }
  function fitScreen() {
    if (switching.size) { queueFit(120); return }
    // a hidden glass has no size to measure; showing the machine fits it again
    if (stage.hidden || screen.hidden) return
    const secs = [...content.querySelectorAll(':scope > .sec')].filter((s) => !s.hidden)
    secs.forEach((s, i) => s.classList.toggle('is-last', i === secs.length - 1 && secs.length > 1))
    machineEl.style.zoom = '1'
    content.classList.add('is-measuring')
    content.style.removeProperty('--gap-live')
    // the column's natural height in glass pixels, at a given fit
    const tall = (f) => {
      root.style.setProperty('--fit', f)
      return content.getBoundingClientRect().height * MACHINE_H / screen.getBoundingClientRect().height
    }
    root.style.setProperty('--fit', 1)
    const base = parseFloat(getComputedStyle(content).rowGap) || 0
    content.style.setProperty('--gap-live', base + 'px')
    const floor4 = (f) => Math.max(.6, Math.min(1, Math.floor(f * 1e4) / 1e4))
    let fit = 1, h = tall(1)
    if (h > MACHINE_H) {
      let f0 = 1, h0 = h
      fit = floor4(MACHINE_H / h)
      for (let pass = 0; pass < 6; pass++) {
        h = tall(fit)
        if ((h <= MACHINE_H && h > MACHINE_H - 4) || (fit <= .6 && h > MACHINE_H)) break
        const slope = (h - h0) / (fit - f0)
        const next = slope > 0 ? fit + (MACHINE_H - 2 - h) / slope : fit * (MACHINE_H - 2) / h
        f0 = fit; h0 = h
        if (floor4(next) === fit) break
        fit = floor4(next)
      }
      for (let guard = 0; h > MACHINE_H && fit > .6 && guard < 8; guard++) { fit = floor4(fit * (MACHINE_H - 2) / h); h = tall(fit) }
    }
    content.classList.remove('is-measuring')
    machineEl.style.zoom = ''
    if (fit === 1) {
      // room to spare: the gaps grow to fill the glass and the last section stands on its foot
      const add = secs.length > 1 ? Math.min((MACHINE_H - h) / (secs.length - 1), base * 1.4) : 0
      content.style.setProperty('--gap-live', (base + add) + 'px')
    }
    if (fit >= .99) {
      // a scale under one percent cannot be seen, so it is not worth a warning
      fitNote.textContent = 'Everything fits the glass.'
      fitNote.classList.remove('is-scaled')
    } else {
      // Reference locks the sections, so it cannot be told to hide or swap one
      fitNote.textContent = fit >= .95
        ? 'Everything fits the glass, drawn a little smaller.'
        : locked()
          ? 'The frame as drawn runs taller than the glass, so the glass draws it smaller.'
          : 'This mix runs long, so the glass draws it smaller. Hide a section or pick shorter designs to show it at full size.'
      fitNote.classList.toggle('is-scaled', fit < .95)
    }
    root.style.setProperty('--fit', fit)
  }

  /* ------------------------------------------------------------ controls in the panel */
  const controls = {
    // the slider moves in whole points, a thousand a step, and its last step lands on the top score; the readout keeps
    // the decimals the glass shows (999,999.000 by default)
    score:  { el: $('c-score'),  out: $('o-score'),  show: (x) => window.PunchFormat.score(x), toPos: (x) => (x >= TOP_SCORE ? 1000 : Math.round(x / 1000)), fromPos: (p) => (p >= 1000 ? TOP_SCORE : p * 1000) },
  }

  /* ------------------------------------------------------------ apply everything */
  function apply() {
    const s = cur(), v = state.variant
    for (const [k, c] of Object.entries(controls)) {
      const lo = c.fromPos ? c.fromPos(Number(c.el.min)) : Number(c.el.min), hi = c.fromPos ? c.fromPos(Number(c.el.max)) : Number(c.el.max)
      if (k !== 'zoom' && typeof s[k] === 'number') s[k] = Math.min(hi, Math.max(lo, s[k]))
    }
    root.dataset.variant = v
    root.dataset.appearance = state.appearance
    root.dataset.mbackdrop = state.backdrop
    root.dataset.decimals = state.decimals
    const themeNote = $('themeNote')
    if (themeNote) themeNote.textContent = `${v === 'reference' ? 'Reference' : 'Arena'}, ${state.appearance}`
    document.querySelectorAll('[data-decimals-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.decimalsBtn === state.decimals)))
    document.querySelectorAll('[data-appearance-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.appearanceBtn === state.appearance)))
    root.style.setProperty('--zoom', zoomNow() / 100)
    root.style.setProperty('--accent-amt', s.accent)
    root.style.setProperty('--glow', s.glow / 100)
    root.style.setProperty('--photo-sat', s.photo / 100)
    if (v !== 'reference') {
      root.style.setProperty('--space', s.space / 100)
      root.style.setProperty('--r', s.radius + 'px')
    } else {
      root.style.removeProperty('--space')
      root.style.removeProperty('--r')
    }
    root.style.setProperty('--cta-ink', v === 'reference' ? '#FFFFFF' : ctaInk(v, s.accent))
    // Reference is the frame as drawn, so every section shows
    for (const k of TOGGLES) slotEl(k).hidden = !locked() && !s.on[k]
    renderLayout()
    if (!counting) paintScore(s.score)
    setReels(s.score, false)
    document.querySelectorAll('[data-bind="grade"]').forEach((el) => { el.textContent = gradeFor(s.score) })
    if (window.punchApp) window.punchApp.setScore(s.score)
    paintRanks(s.score)
    applyLogo()
    syncControls()
    syncThemes()
    queueFit(30)
    if (EMBED) root.style.setProperty('--zoom', Math.min(window.innerHeight / MACHINE_H, document.documentElement.clientWidth / MACHINE_W))
  }

  /* ------------------------------------------------------------ the Result's ranks, worked out from the score
     (PunchFormat.ranks); the Scoreboard design sets each digit on its own tile */
  function paintRanks(score) {
    if (!window.PunchFormat || !window.PunchFormat.ranks) return
    const r = window.PunchFormat.ranks(score)
    const txt = (k) => '#' + r[k].toLocaleString('en-US')
    document.querySelectorAll('[data-glass-rank]').forEach((el) => { el.textContent = txt(el.dataset.glassRank) })
    document.querySelectorAll('[data-glass-rank-tiles]').forEach((el) => {
      const t = txt(el.dataset.glassRankTiles)
      el.setAttribute('aria-label', t)
      el.innerHTML = '<span class="ranks-d-hash">#</span>' + [...t.slice(1)].map((c) => (c === ',' ? '<span class="ranks-d-sep">,</span>' : `<span class="ranks-d-tile">${c}</span>`)).join('')
    })
  }

  /* ------------------------------------------------------------ the logo: six marks from the Figma file, on every
     surface in both themes. The Reference frame drew a placeholder badge where the logo goes, so the mark stands in. */
  const favicon = document.querySelector('link[rel="icon"]')
  function applyLogo() {
    const key = LOGOS[state.logo] ? state.logo : 'fist', logo = LOGOS[key]
    document.querySelectorAll('[data-glyph="logo"]').forEach((el) => {
      if (el.dataset.mark === key && el.firstElementChild) return
      el.innerHTML = `<img src="${logo.src}" alt="">`
      el.dataset.mark = key
    })
    document.querySelectorAll('[data-logo-img]').forEach((img) => { if (img.getAttribute('src') !== logo.src) img.src = logo.src })
    document.querySelectorAll('.logo-tile').forEach((b) => {
      const on = b.dataset.logo === key
      b.setAttribute('aria-checked', String(on))
      b.tabIndex = on ? 0 : -1
    })
    const ln = $('logoName'); if (ln) ln.textContent = logo.name
    if (favicon && favicon.getAttribute('href') !== logo.src) favicon.href = logo.src
  }
  const logoBtns = [...document.querySelectorAll('.logo-tile')]
  logoBtns.forEach((b, i) => {
    const pick = (btn, focus) => { state.logo = btn.dataset.logo; applyLogo(); save(); live.textContent = `Logo: ${LOGOS[state.logo].name}`; if (focus) btn.focus() }
    b.addEventListener('click', () => pick(b, false))
    b.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
      if (!step) return
      e.preventDefault()
      pick(logoBtns[(i + step + logoBtns.length) % logoBtns.length], true)
    })
  })

  /* ------------------------------------------------------------ machine screen or phone flow */
  const modeBtns = [...document.querySelectorAll('.mode')]
  const MODE_TEXT = {
    machine: { sub: 'This screen first, then what every screen shares.', live: 'Showing the machine screen' },
    mobile: { sub: 'This screen first, then what every screen shares.', live: 'Showing the mobile app' },
    animation: { sub: 'The phone screen and the live glass, then what every screen shares.', live: 'Showing the phone and the machine together, with the score reveal clip' },
    system: { sub: 'Theme, appearance and logo, shared by the machine and the phone.', live: 'Showing the design system' },
  }
  function setMode(mode, quiet) {
    state.mode = MODES.includes(mode) ? mode : 'mobile'
    const m = state.mode
    body.dataset.mode = m
    stage.hidden = m !== 'machine'
    // the phone stage serves two tabs: Mobile app shows the phone alone, Animation adds the live machine and the clip
    phoneStage.hidden = m !== 'mobile' && m !== 'animation'
    phoneStage.classList.toggle('is-anim', m === 'animation')
    if (dsStage) dsStage.hidden = m !== 'system'
    modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)))
    // a panel group shows in the modes its data-when lists; groups without it show everywhere
    document.querySelectorAll('.custom [data-when]').forEach((el) => { el.hidden = !el.dataset.when.split(' ').includes(m) })
    $('customSub').textContent = MODE_TEXT[m].sub
    syncControls()
    renderPanel()
    if (!quiet) {
      save()
      window.scrollTo({ top: 0 })
      live.textContent = MODE_TEXT[m].live
    }
    if ((m === 'mobile' || m === 'animation') && window.punchApp) requestAnimationFrame(() => { window.punchApp.fit(); syncLinked() })
    if (m === 'system' && window.designSystem) requestAnimationFrame(() => window.designSystem.refresh())
    if (m === 'machine') queueFit(30)
  }
  modeBtns.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)))
  // the run code on the glass is the way into the phone: clicking it plays the scan
  content.addEventListener('click', (e) => {
    if (!e.target.closest('[data-qr]') || !window.punchApp) return
    setMode('mobile')
    window.punchApp.go('scan')
    setTimeout(() => { const b = $('mScanBtn'); if (b) b.click() }, 650)
  })

  const fill = (el) => el.style.setProperty('--fill', ((el.value - el.min) / (el.max - el.min)) * 100 + '%')
  function syncControls() {
    const s = cur(), lock = locked()
    for (const [k, c] of Object.entries(controls)) {
      const value = k === 'zoom' ? zoomNow() : s[k]
      if (document.activeElement !== c.el) c.el.value = c.toPos ? c.toPos(value) : value
      const isLocked = lock && LOCKED_IN_REFERENCE.includes(k)
      c.out.textContent = isLocked ? 'as designed' : c.show(value)
      if (c.toPos) c.el.setAttribute('aria-valuetext', c.show(value))
      c.el.disabled = isLocked
      c.el.closest('.ctl').classList.toggle('is-locked', isLocked)
      fill(c.el)
    }
    // two ways to look at the glass: at its own size, or at reading size (round eleven dropped Whole screen)
    const actual = state.zoom === 'actual'
    $('actualMachine').setAttribute('aria-pressed', String(actual))
    $('readSize').setAttribute('aria-pressed', String(!actual))
    $('lockNote').hidden = !lock || state.mode !== 'machine'
    syncRows()
  }
  for (const [k, c] of Object.entries(controls)) {
    c.el.addEventListener('input', () => {
      const value = c.fromPos ? c.fromPos(Number(c.el.value)) : Number(c.el.value)
      if (k === 'zoom') state.zoom = value
      else cur()[k] = value
      if (k === 'score') stopCount()
      apply(); save()
    })
  }
  document.querySelectorAll('[data-appearance-btn]').forEach((b) => b.addEventListener('click', () => {
    state.appearance = b.dataset.appearanceBtn === 'light' ? 'light' : 'dark'
    apply(); save()
    if (window.designSystem) requestAnimationFrame(() => window.designSystem.refresh())
    live.textContent = state.appearance === 'light' ? 'Light appearance' : 'Dark appearance'
  }))
  controls.score.el.addEventListener('change', () => setReels(cur().score, true))
  $('resetCustom').addEventListener('click', () => {
    state.variant = 'arena'
    state.appearance = 'dark'
    for (const v of Object.keys(DEFAULTS)) state.sets[v] = fresh(v)
    state.zoom = null
    state.logo = 'fist'
    state.backdrop = BACKDROPS[0].key
    state.decimals = 'on'
    state.mvar = {}
    state.layout = layoutA()
    if (window.PSec) window.PSec.reset()
    // the phone's own settings too: device, screen styles, wallet and size
    const app = window.punchApp
    if (app) {
      if (typeof app.device === 'function') app.device('iphone')
      if (typeof app.style === 'function') for (const k of ['board', 'connect', 'nav']) app.style(k, 0)
      try { app.credits = 0 } catch { /* an older phone script */ }
      const fitBtn = $('phoneFit')
      if (fitBtn && fitBtn.getAttribute('aria-pressed') !== 'true') fitBtn.click()
    }
    stopCount()
    apply(); save()
    if (window.designSystem) requestAnimationFrame(() => window.designSystem.refresh())
    renderPanel(true)
    live.textContent = 'Everything is back to how it started'
  })
  $('readSize').addEventListener('click', () => { state.zoom = null; apply(); save() })
  $('actualMachine').addEventListener('click', () => { state.zoom = 'actual'; apply(); save() })

  /* ------------------------------------------------------------ section rows: show or hide, previous and next */
  const rows = {}
  const chevron = (d) => `<svg class="ico" viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${d.startsWith('M12.5') ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'}"/></svg>`
  function buildRows() {
    const host = $('secRows')
    for (const { key, label, toggle } of SLOTS) {
      const row = document.createElement('div')
      row.className = 'sec-row'
      row.dataset.for = key
      const eye = toggle
        ? `<input class="eye" type="checkbox" id="eye-${key}" aria-label="Show ${label.toLowerCase()}">`
        : '<span class="eye-spacer" aria-hidden="true"></span>'
      row.innerHTML = `${eye}
        <div class="sec-meta"><span class="sec-name">${label}</span><span class="sec-design"><b id="design-${key}"></b><span class="sec-dots" aria-hidden="true"></span></span></div>
        <div class="sec-arrows">
          <button class="sec-btn" type="button" data-dir="-1" aria-label="Previous ${label.toLowerCase()} design">${chevron('M12.5 4.5 7 10l5.5 5.5')}</button>
          <button class="sec-btn" type="button" data-dir="1" aria-label="Next ${label.toLowerCase()} design">${chevron('M7.5 4.5 13 10l-5.5 5.5')}</button>
        </div>`
      row.querySelectorAll('.sec-btn').forEach((b) => b.addEventListener('click', () => go(key, Number(b.dataset.dir))))
      row.addEventListener('keydown', (e) => {
        if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.target.classList.contains('eye')) return
        e.preventDefault()
        go(key, e.key === 'ArrowRight' ? 1 : -1)
      })
      const eyeEl = row.querySelector('.eye')
      if (eyeEl) eyeEl.addEventListener('change', () => { cur().on[key] = eyeEl.checked; apply(); save() })
      row.addEventListener('pointerenter', () => slotEl(key).classList.add('is-target'))
      row.addEventListener('pointerleave', () => slotEl(key).classList.remove('is-target'))
      row.addEventListener('focusin', () => slotEl(key).classList.add('is-target'))
      row.addEventListener('focusout', () => slotEl(key).classList.remove('is-target'))
      host.appendChild(row)
      rows[key] = row
    }
  }
  function syncRows() {
    const s = cur(), lock = locked()
    for (const { key, toggle } of SLOTS) {
      const row = rows[key]
      if (!row) continue
      const vars = varsOf(key), i = shown(key)
      row.querySelector(`#design-${key}`).textContent = vars[i]?.dataset.name || 'Design A'
      row.querySelector('.sec-dots').innerHTML = vars.map((_, n) => `<i class="${n === i ? 'on' : ''}"></i>`).join('')
      row.querySelectorAll('.sec-btn').forEach((b) => { b.disabled = lock || vars.length < 2 })
      row.classList.toggle('is-off', !!toggle && !lock && !s.on[key])
      const eye = row.querySelector('.eye')
      if (eye) { eye.checked = lock || !!s.on[key]; eye.disabled = lock }
    }
  }

  function renderLayout() {
    for (const { key } of SLOTS) {
      if (switching.has(key)) continue
      const i = shown(key)
      varsOf(key).forEach((v, n) => { v.hidden = n !== i })
    }
  }

  function go(key, dir) {
    if (locked() || switching.has(key)) return
    if (state.mscreen !== 'result') setMscreen('result')
    const vars = varsOf(key), n = vars.length
    if (n < 2) return
    const from = shown(key), to = (from + dir + n) % n
    state.layout[key] = to
    save()
    live.textContent = `${SLOTS.find((s) => s.key === key).label}: ${vars[to].dataset.name}, design ${to + 1} of ${n}`
    const box = slotEl(key).querySelector(':scope > .vars')
    const out = vars[from], inn = vars[to]
    if (reduced.matches || !out.animate || slotEl(key).hidden) {
      vars.forEach((v, i) => { v.hidden = i !== to })
      setReels(cur().score, false)
      syncRows(); queueFit(); return
    }
    switching.add(key)
    box.style.height = box.offsetHeight + 'px'
    box.classList.add('is-switching')
    inn.hidden = false
    if (inn.querySelector('[data-reels]')) setTimeout(() => setReels(cur().score, true), 160)
    out.style.cssText += ';position:absolute;left:0;right:0;top:0'
    const h1 = inn.offsetHeight
    syncRows()
    void box.offsetHeight
    box.style.height = h1 + 'px'
    const shift = 80 * dir, ease = 'cubic-bezier(.2,.7,.2,1)'
    out.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-shift}px)` }], { duration: 260, easing: ease, fill: 'forwards' })
    inn.animate([{ opacity: 0, transform: `translateX(${shift}px)` }, { opacity: 1, transform: 'none' }], { duration: 420, easing: ease, delay: 60, fill: 'backwards' })
    let done = false
    const finish = () => {
      if (done) return
      done = true
      out.hidden = true
      out.getAnimations().forEach((a) => a.cancel())
      out.style.position = out.style.left = out.style.right = out.style.top = ''
      box.style.height = ''
      box.classList.remove('is-switching')
      switching.delete(key)
      renderLayout()
      queueFit()
    }
    setTimeout(finish, 520)
  }

  // swipe across a section on a touch screen
  for (const { key } of SLOTS) {
    const box = slotEl(key).querySelector(':scope > .vars')
    let sx = 0, sy = 0, tracking = false
    box.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') return; tracking = true; sx = e.clientX; sy = e.clientY })
    box.addEventListener('pointerup', (e) => {
      if (!tracking) return
      tracking = false
      const dx = e.clientX - sx, dy = e.clientY - sy
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) go(key, dx < 0 ? 1 : -1)
    })
    box.addEventListener('pointercancel', () => { tracking = false })
  }

  function setLayout(next, message) {
    if (locked()) return
    state.layout = next
    save()
    renderLayout(); syncRows(); queueFit()
    live.textContent = message
  }

  /* ------------------------------------------------------------ the top bar: a ground once the page scrolls, and its
     height for the panel that opens under it */
  const topbar = document.querySelector('.topbar')
  const onScroll = () => topbar.classList.toggle('is-scrolled', window.scrollY > 2)
  window.addEventListener('scroll', onScroll, { passive: true })
  const barHeight = () => root.style.setProperty('--topbar-h', topbar.getBoundingClientRect().height + 'px')
  if ('ResizeObserver' in window) new ResizeObserver(barHeight).observe(topbar)
  barHeight()

  /* ------------------------------------------------------------ customise panel */
  const custom = $('custom'), openBtn = $('openCustom'), scrim = $('customScrim')
  // under 1180 px the panel lies over the page: the page goes quiet behind a veil until it closes
  const overPage = window.matchMedia('(max-width: 1179px)')
  let closeTimer = 0, scrimTimer = 0

  /* ------------------------------------------------------------ what can be reached. A dialog (or the loader) quiets
     everything else; the panel over the page quiets the stages but leaves the top bar in reach */
  const quiet = { loader: true }
  let caseEl = null, briefEl = null
  // queried rather than captured: the help panel is declared further down, and a const would still be in its dead zone here
  const dialogOpen = () => !!document.querySelector('.case.is-open, .brief.is-open')
  function syncInert() {
    const dialog = quiet.loader || dialogOpen()
    const sheet = custom.classList.contains('is-open') && overPage.matches
    topbar.inert = dialog
    custom.inert = dialog
    for (const n of [stage, phoneStage, dsStage]) if (n) n.inert = dialog || sheet
  }
  function syncSheet() {
    const on = custom.classList.contains('is-open') && overPage.matches
    clearTimeout(scrimTimer)
    if (on) { scrim.hidden = false; void scrim.offsetWidth; scrim.classList.add('is-on') }
    else {
      scrim.classList.remove('is-on')
      scrimTimer = setTimeout(() => { if (!scrim.classList.contains('is-on')) scrim.hidden = true }, 320)
    }
    syncInert()
  }
  function openCustom() {
    clearTimeout(closeTimer)
    custom.hidden = false
    void custom.offsetWidth
    custom.classList.add('is-open')
    openBtn.setAttribute('aria-expanded', 'true')
    body.classList.add('custom-open')
    syncSheet()
    $('closeCustom').focus({ preventScroll: true })
  }
  function closeCustom() {
    custom.classList.remove('is-open')
    openBtn.setAttribute('aria-expanded', 'false')
    body.classList.remove('custom-open')
    syncSheet()
    closeTimer = setTimeout(() => { if (!custom.classList.contains('is-open')) custom.hidden = true }, 460)
    openBtn.focus({ preventScroll: true })
  }
  openBtn.addEventListener('click', () => (custom.classList.contains('is-open') ? closeCustom() : openCustom()))
  $('closeCustom').addEventListener('click', closeCustom)
  scrim.addEventListener('click', closeCustom)
  overPage.addEventListener('change', syncSheet)

  /* ------------------------------------------------------------ themes: a radio group with arrow keys */
  const themeBtns = [...document.querySelectorAll('.variant')]
  function syncThemes() {
    for (const b of themeBtns) {
      const on = b.dataset.variant === state.variant
      b.setAttribute('aria-checked', String(on))
      b.tabIndex = on ? 0 : -1
    }
  }
  function choose(v, focus) {
    if (!DEFAULTS[v]) return
    state.variant = v
    stopCount()
    apply(); save()
    if (window.designSystem) requestAnimationFrame(() => window.designSystem.refresh())
    if (focus) themeBtns.find((b) => b.dataset.variant === v)?.focus()
  }
  themeBtns.forEach((b, i) => {
    b.addEventListener('click', () => choose(b.dataset.variant, false))
    b.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
      if (!step) return
      e.preventDefault()
      choose(themeBtns[(i + step + themeBtns.length) % themeBtns.length].dataset.variant, true)
    })
  })

  /* ------------------------------------------------------------ case study */
  caseEl = $('case')
  const caseBtn = $('openCase')
  let caseTimer = 0
  function openCase() {
    clearTimeout(caseTimer)
    caseEl.hidden = false
    void caseEl.offsetWidth
    caseEl.classList.add('is-open')
    syncInert()
    body.style.overflow = 'hidden'
    $('caseScroll').scrollTop = 0
    $('closeCase').focus({ preventScroll: true })
  }
  function closeCase() {
    caseEl.classList.remove('is-open')
    syncInert()
    body.style.overflow = ''
    caseTimer = setTimeout(() => { if (!caseEl.classList.contains('is-open')) caseEl.hidden = true }, 460)
    caseBtn.focus({ preventScroll: true })
  }
  caseBtn.addEventListener('click', openCase)
  // links inside the case study that jump to the machine or the phone flow
  caseEl.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go-mode]')
    if (!go) return
    e.preventDefault()
    closeCase()
    if (window.showcase.mode) window.showcase.mode(go.dataset.goMode)
  })
  $('closeCase').addEventListener('click', closeCase)
  $('closeCase2').addEventListener('click', closeCase)

  briefEl = $('brief')
  const briefBtn = $('openBrief')
  let briefTimer = 0
  function openBrief() {
    if (!briefEl) return
    clearTimeout(briefTimer)
    const sc = briefEl.querySelector('.bf-scroll')
    if (sc) sc.scrollTop = 0
    body.style.overflow = 'hidden'
    briefEl.hidden = false
    void briefEl.offsetWidth
    briefEl.classList.add('is-open')
    briefBtn.setAttribute('aria-expanded', 'true')
    syncInert()
    const close = $('closeBrief')
    if (close) close.focus({ preventScroll: true })
  }
  function closeBrief() {
    briefEl.classList.remove('is-open')
    briefBtn.setAttribute('aria-expanded', 'false')
    body.style.overflow = ''
    syncInert()
    briefTimer = setTimeout(() => { if (!briefEl.classList.contains('is-open')) briefEl.hidden = true }, 460)
    briefBtn.focus({ preventScroll: true })
  }
  if (briefEl && briefBtn) {
    briefBtn.addEventListener('click', () => (briefEl.classList.contains('is-open') ? closeBrief() : openBrief()))
    briefEl.addEventListener('click', (e) => {
      const go = e.target.closest('[data-go-mode]')
      if (go) { e.preventDefault(); closeBrief(); setMode(go.dataset.goMode); return }
      if (e.target.closest('[data-close-brief]')) closeBrief()
    })
  }

  /* ------------------------------------------------------------ how it works: the same shell as the brief */
  const helpEl = $('help'), helpBtn = $('openHelp')
  let helpTimer = 0
  function openHelp() {
    if (!helpEl) return
    clearTimeout(helpTimer)
    const sc = helpEl.querySelector('.bf-scroll')
    if (sc) sc.scrollTop = 0
    body.style.overflow = 'hidden'
    helpEl.hidden = false
    void helpEl.offsetWidth
    helpEl.classList.add('is-open')
    helpBtn.setAttribute('aria-expanded', 'true')
    syncInert()
    const close = $('closeHelp')
    if (close) close.focus({ preventScroll: true })
  }
  function closeHelp() {
    if (!helpEl) return
    helpEl.classList.remove('is-open')
    helpBtn.setAttribute('aria-expanded', 'false')
    body.style.overflow = ''
    syncInert()
    helpTimer = setTimeout(() => { if (!helpEl.classList.contains('is-open')) helpEl.hidden = true }, 460)
    helpBtn.focus({ preventScroll: true })
  }
  if (helpEl && helpBtn) {
    helpBtn.addEventListener('click', () => (helpEl.classList.contains('is-open') ? closeHelp() : openHelp()))
    helpEl.addEventListener('click', (e) => { if (e.target.closest('[data-close-help]')) closeHelp() })
  }

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    if (caseEl.classList.contains('is-open')) closeCase()
    else if (helpEl && helpEl.classList.contains('is-open')) closeHelp()
    else if (briefEl && briefEl.classList.contains('is-open')) closeBrief()
    else if (custom.classList.contains('is-open')) closeCustom()
  })

  /* ------------------------------------------------------------ the machine flow: one screen at a time on the glass */
  const mBtns = [...document.querySelectorAll('.mpagebar [data-mscreen]')]
  function setMscreen(key, opts = {}, quietly) {
    if (!MSCREENS.includes(key)) key = 'result'
    const changed = state.mscreen !== key
    state.mscreen = key
    screen.hidden = key !== 'result'
    document.querySelectorAll('.mscreen').forEach((el) => { el.hidden = el.dataset.mscreen !== key })
    const article = document.querySelector(`.mscreen[data-mscreen="${key}"]`)
    const designs = article ? [...article.querySelectorAll(':scope > .msv')] : []
    const variant = designs.length ? Math.min(Math.max(0, state.mvar[key] | 0), designs.length - 1) : 0
    designs.forEach((d, i) => { d.hidden = i !== variant })
    opts = { ...opts, variant, design: designs[variant] ? designs[variant].dataset.name : '' }
    if (window.PSec && key !== 'result') window.PSec.apply('machine', key)
    mBtns.forEach((b) => (b.dataset.mscreen === key ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')))
    machineEl.dataset.mscreen = key
    if (!quietly) save()
    if (key === 'result') { queueFit(30); if (changed && !quietly) { stopCount(); countUp(cur().score) } }
    // each screen's own script listens for this and starts its motion (a countdown, confetti, a leaderboard reveal)
    document.dispatchEvent(new CustomEvent('mscreen', { detail: { key, opts } }))
    if (changed) renderPanel()
  }
  mBtns.forEach((b) => b.addEventListener('click', () => setMscreen(b.dataset.mscreen, { from: 'bar' })))

  // the phone flow announces where it is; only the embedded machine follows it
  const flow = 'BroadcastChannel' in window ? new BroadcastChannel('punch-flow') : null
  if (FOLLOW && flow) {
    flow.onmessage = (e) => {
      const d = e.data || {}
      if (d.type !== 'mscreen') return
      setMscreen(d.key, d.opts || {}, true)
      // the phone just landed the hit: the glass counts the score up as it does in the showcase
      if (d.key === 'result') { stopCount(); countUp(cur().score) }
    }
  }
  if (EMBED) {
    // theme, appearance, logo and score changes in the page around it arrive through storage
    window.addEventListener('storage', (e) => {
      if (e.key !== KEY || !e.newValue) return
      try {
        const s = JSON.parse(e.newValue)
        if (DEFAULTS[s.variant]) state.variant = s.variant
        state.appearance = s.appearance === 'light' ? 'light' : 'dark'
        if (LOGOS[s.logo]) state.logo = s.logo
        if (s.sets) for (const v of Object.keys(DEFAULTS)) if (s.sets[v]) state.sets[v] = { ...state.sets[v], ...s.sets[v] }
        if (s.layout) state.layout = { ...layoutA(), ...s.layout }
        if (s.mvar) state.mvar = s.mvar
        if (s.backdrop) state.backdrop = s.backdrop
        state.decimals = s.decimals === 'off' ? 'off' : 'on'
        apply()
        setMscreen(state.mscreen, {}, true)
        document.dispatchEvent(new CustomEvent('decimals', { detail: { on: state.decimals === 'on' } }))
      } catch { /* a half-written value: the next change brings a whole one */ }
    })
  }

  /* ------------------------------------------------------------ Customise: this screen's sections, then the shared ones
     The panel is a stack of accordions. "This screen" lists the sections of the page on show (psec.js; the Result
     screen keeps its own rows), and changes with the page; "Across every screen" holds the background, the chrome every
     page carries (the machine's header and sponsor strip, the phone's tab bar), the score format and the score; theme,
     logo, the phone and the glass follow. Which accordions are open is remembered per viewer. */
  const chev = (dir) => `<svg class="ico" viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${dir < 0 ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'}"/></svg>`
  const labelOf = (surface, page) => {
    const b = document.querySelector(surface === 'machine' ? `.mpagebar [data-mscreen="${page}"]` : `.pagebar [data-page="${page}"]`)
    return b ? b.textContent.trim() : page
  }
  // one row: a section's name, the design on show with a dot per design, previous and next
  function makeRow(host, { label, names, index, step, targets }) {
    const row = document.createElement('div')
    // no show or hide switch on a section row, so no spacer for one: the name starts at the row's own padding
    row.className = 'sec-row is-plain'
    row.innerHTML = `<div class="sec-meta"><span class="sec-name"></span><span class="sec-design"><b></b><span class="sec-dots" aria-hidden="true"></span></span></div>
      <div class="sec-arrows">
        <button class="sec-btn" type="button" data-dir="-1">${chev(-1)}</button>
        <button class="sec-btn" type="button" data-dir="1">${chev(1)}</button>
      </div>`
    row.querySelector('.sec-name').textContent = label
    const [prev, next] = row.querySelectorAll('.sec-btn')
    prev.setAttribute('aria-label', `Previous ${label.toLowerCase()} design`)
    next.setAttribute('aria-label', `Next ${label.toLowerCase()} design`)
    const paint = (i) => {
      row.querySelector('b').textContent = names[i] || 'Design'
      row.querySelector('.sec-dots').innerHTML = names.map((_, n) => `<i class="${n === i ? 'on' : ''}"></i>`).join('')
      row.querySelectorAll('.sec-btn').forEach((btn) => { btn.disabled = names.length < 2 })
    }
    const go = (dir) => { const i = step(dir); paint(i); live.textContent = `${label}: ${names[i]}` }
    row.querySelectorAll('.sec-btn').forEach((btn) => btn.addEventListener('click', () => go(Number(btn.dataset.dir))))
    row.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault(); go(e.key === 'ArrowRight' ? 1 : -1)
    })
    // pointing at a row marks its section on the screen
    const mark = (on) => (targets ? targets() : []).forEach((el) => el.classList.toggle('is-target', on))
    row.addEventListener('pointerenter', () => mark(true))
    row.addEventListener('pointerleave', () => mark(false))
    row.addEventListener('focusin', () => mark(true))
    row.addEventListener('focusout', () => mark(false))
    paint(index)
    host.appendChild(row)
    return row
  }
  // a flow screen still built as whole-screen designs (.msv) pages through them in one row, until it has sections
  function mflowDesigns(key) {
    const article = document.querySelector(`.mscreen[data-mscreen="${key}"]`)
    return article ? [...article.querySelectorAll(':scope > .msv')].map((d) => d.dataset.name || 'Design') : []
  }
  function fillRows(host, surface, page) {
    host.innerHTML = ''
    const P2 = window.PSec
    const secs = P2 ? P2.sections(surface, page) : []
    for (const sec of secs) {
      makeRow(host, {
        label: sec.label, names: sec.names, index: P2.get(surface, page, sec.key),
        step: (dir) => { P2.step(surface, page, sec.key, dir); return P2.get(surface, page, sec.key) },
        targets: () => P2.sections(surface, page).find((x) => x.key === sec.key)?.els || [],
      })
    }
    if (!secs.length && surface === 'machine') {
      const names = mflowDesigns(page)
      if (names.length > 1) {
        makeRow(host, {
          label: 'Layout', names, index: Math.min(state.mvar[page] | 0, names.length - 1),
          step: (dir) => {
            state.mvar[page] = ((state.mvar[page] | 0) + dir + names.length) % names.length
            save(); setMscreen(page, { from: 'customise' }, state.mode !== 'machine')
            return state.mvar[page]
          },
        })
        return 1
      }
    }
    return secs.length
  }
  function liveMachine() {
    try { return linkedFrame.contentDocument.getElementById('machine').dataset.mscreen || 'default' } catch { return 'default' }
  }
  let panelKey = ''
  function renderPanel(force) {
    if (EMBED) return
    const m = state.mode
    const phonePage = window.punchApp ? window.punchApp.page || 'default' : 'default'
    const first = m === 'machine' ? { surface: 'machine', page: state.mscreen } : m === 'mobile' || m === 'animation' ? { surface: 'phone', page: phonePage } : null
    const second = m === 'animation' ? { surface: 'machine', page: liveMachine() } : null
    const key = JSON.stringify([m, first, second])
    if (key === panelKey && !force) return
    panelKey = key
    if (first) {
      $('accPageKind').textContent = first.surface === 'machine' ? 'Machine screen' : 'Phone screen'
      $('accPageName').textContent = labelOf(first.surface, first.page)
      const isResult = first.surface === 'machine' && first.page === 'result'
      $('resultRows').hidden = !isResult
      $('pageRows').hidden = isResult
      const n = isResult ? 1 : fillRows($('pageRows'), first.surface, first.page)
      $('pageEmpty').hidden = n > 0
    }
    if (second) {
      $('accPage2Name').textContent = labelOf('machine', second.page)
      const isResult = second.page === 'result'
      const n = isResult ? 0 : fillRows($('pageRows2'), 'machine', second.page)
      $('pageRows2').hidden = isResult
      $('pageEmpty2').hidden = n > 0 && !isResult
      $('pageEmpty2').textContent = isResult ? 'The live glass is on the result screen: its sections are in the Machine screen tab.' : 'This screen has nothing to change yet.'
    }
    renderGlobalRows()
  }
  function renderGlobalRows() {
    const host = $('globalRows')
    if (!host) return
    host.innerHTML = ''
    makeRow(host, {
      label: 'Background', names: BACKDROPS.map((b) => b.name), index: Math.max(0, BACKDROPS.findIndex((b) => b.key === state.backdrop)),
      step: (dir) => {
        const i = BACKDROPS.findIndex((b) => b.key === state.backdrop)
        const n = (i + dir + BACKDROPS.length) % BACKDROPS.length
        state.backdrop = BACKDROPS[n].key
        apply(); save()
        if (state.mode === 'machine' && state.mscreen === 'result') setMscreen('default', { from: 'customise' })
        return n
      },
      targets: () => [...document.querySelectorAll('.ms-lights, .bd-host')],
    })
    const P2 = window.PSec
    if (!P2) return
    // chrome that belongs to one surface (data-sec-for) is listed only where that surface is on show
    const onShow = state.mode === 'machine' ? ['machine'] : state.mode === 'mobile' ? ['phone'] : ['phone', 'machine']
    for (const sec of P2.sections('global', 'all')) {
      const f = sec.els[0].dataset.secFor
      if (f && !onShow.includes(f)) continue
      makeRow(host, {
        label: sec.label, names: sec.names, index: P2.get('global', 'all', sec.key),
        step: (dir) => { P2.step('global', 'all', sec.key, dir); return P2.get('global', 'all', sec.key) },
        targets: () => P2.sections('global', 'all').find((x) => x.key === sec.key)?.els || [],
      })
    }
  }
  // the phone moved to another page; the live glass moved to another screen
  document.addEventListener('mpage', () => renderPanel())
  if (linkedFrame) linkedFrame.addEventListener('load', () => {
    try { linkedFrame.contentDocument.addEventListener('mscreen', () => renderPanel()) } catch { /* not the same origin */ }
  })
  // which accordions are open, per viewer
  const ACC_KEY = 'punch-acc.v2'
  let accOpen = {}
  try { accOpen = JSON.parse(localStorage.getItem(ACC_KEY) || '{}') || {} } catch { accOpen = {} }
  document.querySelectorAll('.custom details.acc').forEach((d) => {
    if (d.dataset.acc in accOpen) d.open = !!accOpen[d.dataset.acc]
    d.addEventListener('toggle', () => {
      accOpen[d.dataset.acc] = d.open
      try { localStorage.setItem(ACC_KEY, JSON.stringify(accOpen)) } catch { /* private window */ }
    })
  })

  // the score format: the brief's full length (999,999.000) or whole points
  document.querySelectorAll('[data-decimals-btn]').forEach((b) => b.addEventListener('click', () => {
    state.decimals = b.dataset.decimalsBtn === 'off' ? 'off' : 'on'
    apply(); save()
    document.dispatchEvent(new CustomEvent('decimals', { detail: { on: state.decimals === 'on' } }))
    live.textContent = state.decimals === 'on' ? 'Scores show three decimals' : 'Scores show whole points'
  }))

  /* ------------------------------------------------------------ the machine beside the phone */
  function syncLinked() {
    if (!linked || EMBED) return
    const on = state.mode === 'animation'
    linked.hidden = !on
    // the Animation tab lays the pair out itself (anim.css); the older side panel grid of mobile.css stays off
    phoneStage.classList.remove('has-linked')
    if (!on) { delete phoneStage.dataset.animLayout; return }
    const dev = $('device')
    const r = dev ? dev.getBoundingClientRect() : { width: 0, height: 0 }
    if (!r.height) return
    // the glass stands as tall as the phone; its caption sits under it, level with the phone's own caption
    const gh = r.height, w = gh * 1080 / 3840
    const cs = getComputedStyle(phoneStage)
    const room = phoneStage.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0)
    const gap = parseFloat(cs.columnGap) || 48
    // the rail beside the pair when all three fit, above the pair when only the pair fits, and the glass under the
    // phone when even the pair does not
    const mw = Math.max(w, 240)
    // the pair side by side when both fit, the glass under the phone when they do not (Start and Reset sit in the top bar)
    const layout = room >= r.width + mw + gap ? 'mid' : 'stack'
    const was = phoneStage.dataset.animLayout
    phoneStage.dataset.animLayout = layout
    phoneStage.style.setProperty('--anim-phone-w', Math.round(r.width) + 'px')
    linked.style.setProperty('--linked-w', Math.round(w) + 'px')
    linked.style.setProperty('--linked-h', Math.round(gh) + 'px')
    if (!linkedFrame.getAttribute('src')) linkedFrame.setAttribute('src', './?embed=machine')
    // moving the rail above or beside the pair moves the phone, and the phone sizes itself from where it starts
    if (was && was !== layout && window.punchApp) requestAnimationFrame(() => window.punchApp.fit())
  }
  // the embedded machine boots on its leaderboard and the phone tells it where the flow is once it has loaded
  // (mobile.js); the glass stays dark until that message has landed, so the wrong screen never flashes up first
  // The embedded glass is a second copy of this page, so it is not fetched on arrival: that would undo the
  // weight the lazy images saved. It is warmed on intent instead — hovering or focusing the Animation tab
  // starts the load, so by the time the click lands the glass is usually already up.
  if (linkedFrame && !EMBED) {
    const warmGlass = () => { if (!linkedFrame.getAttribute('src')) linkedFrame.setAttribute('src', './?embed=machine') }
    const animBtn = document.querySelector('.mode[data-mode="animation"]')
    if (animBtn) for (const ev of ['pointerenter', 'focus', 'touchstart']) animBtn.addEventListener(ev, warmGlass, { once: true, passive: true })
  }
  if (linkedFrame) linkedFrame.addEventListener('load', () => setTimeout(() => linkedFrame.classList.add('is-ready'), 160))
  if (window.ResizeObserver && $('deviceWrap')) new ResizeObserver(() => requestAnimationFrame(syncLinked)).observe($('deviceWrap'))

  let resizeTimer = 0
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { apply(); syncLinked() }, 120) })

  /* ------------------------------------------------------------ a small hook for the render harness */
  window.showcase = {
    mode: (m) => setMode(m),
    mscreen: (k, opts) => setMscreen(k, opts || {}),
    // a flow screen's design by index, as the Customise row would pick it (for the render harness)
    mvar: (k, i, opts) => { state.mvar[k] = i | 0; setMscreen(k, opts || {}); renderPanel(true); return mflowDesigns(k)[state.mvar[k]] },
    // a section's design by index, as its Customise row picks it: showcase.sec('machine', 'scan', 'code', 2)
    sec: (surface, page, key, i) => { const n = window.PSec ? window.PSec.set(surface, page, key, i | 0) : ''; renderPanel(true); return n },
    sections: (surface, page) => (window.PSec ? window.PSec.sections(surface, page).map(({ key, label, names }) => ({ key, label, names })) : []),
    // saved like the Customise row, so a pick in the design system survives a reload and reaches the embedded glasses
    backdrop: (k) => { if (BACKDROPS.some((b) => b.key === k)) { state.backdrop = k; apply(); save(); renderPanel(true) } return state.backdrop },
    decimals: (on) => { state.decimals = on === false || on === 'off' ? 'off' : 'on'; apply(); document.dispatchEvent(new CustomEvent('decimals', { detail: { on: state.decimals === 'on' } })) },
    appearance: (a) => { state.appearance = a === 'light' ? 'light' : 'dark'; apply(); fitScreen() },
    brief: (open) => (open === false ? closeBrief() : openBrief()),
    logo: (k) => { if (LOGOS[k]) { state.logo = k; applyLogo(); save() } },
    slots: () => SLOTS.map(({ key }) => ({ key, designs: varsOf(key).map((v) => v.dataset.name) })),
    set: (key, i) => { state.layout[key] = i; renderLayout(); syncRows(); fitScreen(); return varsOf(key)[shown(key)]?.dataset.name },
    theme: (v) => { choose(v, false); fitScreen() },
    space: (v) => { cur().space = v; apply(); fitScreen() },
    zoom: (v) => { state.zoom = v; apply() },
    fit: () => { fitScreen(); return { fit: parseFloat(getComputedStyle(root).getPropertyValue('--fit')), note: fitNote.textContent } },
    // a section's height in glass pixels, as laid out at full size
    sectionHeight: (key) => {
      const fit = parseFloat(getComputedStyle(root).getPropertyValue('--fit')) || 1
      return Math.round(slotEl(key).getBoundingClientRect().height / screen.getBoundingClientRect().height * 3840 / fit)
    },
  }

  /* ------------------------------------------------------------ loading, then the reveal */
  const loader = $('loader')
  // the count: the whole points run up with the decimals held at .000, then the last point is counted out in its
  // decimals, which roll and tick the final whole digit over as they land (999,998.000 rolls to 999,999.000).
  // With whole points only there is no decimal roll, so the count runs straight to the score.
  function countUp(to) {
    if (reduced.matches || locked()) { paintScore(to); setReels(to, false); return }
    counting = true
    setReels(to, true)
    const whole = Math.floor(to), base = Math.max(0, whole - 1)
    const tail = window.PunchFormat.decimals() && to >= 1 ? 520 : 0
    const start = performance.now(), dur = 1300
    const ease = (x) => 1 - Math.pow(1 - x, 3)
    const step = (now) => {
      if (!counting) return
      const t = now - start
      if (!tail) paintScore(Math.round(to * ease(Math.min(1, t / dur))))
      else if (t < dur) paintScore(Math.round(base * ease(t / dur)))
      else paintScore(base + (to - base) * ease(Math.min(1, (t - dur) / tail)))
      if (t < dur + tail) countRaf = requestAnimationFrame(step)
      else { counting = false; paintScore(to) }
    }
    paintScore(0)
    countRaf = requestAnimationFrame(step)
    // a hidden tab never runs frames: land the number on time regardless
    setTimeout(() => { if (counting) { counting = false; paintScore(cur().score) } }, dur + tail + 400)
  }
  function reveal() {
    const secs = [...content.querySelectorAll(':scope > .sec')]
    secs.forEach((s, i) => s.style.setProperty('--i', i))
    if (!reduced.matches) {
      body.classList.add('is-revealing')
      setTimeout(() => body.classList.remove('is-revealing'), 70 * secs.length + 900)
    }
    countUp(cur().score)
  }

  function boot() {
    buildRows()
    drawQR()
    setMode(EMBED ? 'machine' : state.mode, true)
    setMscreen(EMBED ? 'default' : state.mscreen, {}, true)
    apply()
    renderPanel(true)
    if (EMBED) { loader.classList.add('is-done'); loader.setAttribute('aria-hidden', 'true'); fitScreen(); return }
    quiet.loader = true
    syncInert()
    // the loader has shown since the first paint, so its least time counts from the navigation (performance.now()'s
    // zero), not from here: on a fast load the rail fills by about .7 s, the bell rings and it is gone by about 1.1 s
    const minimum = reduced.matches ? 0 : 560
    // wait only for the images on show: not a hidden section design, not the other mode, not a lazy one further down
    const visibleImages = [...document.images].filter((img) => img.loading !== 'lazy' && !img.closest('[hidden]'))
    const jobs = [
      document.fonts ? document.fonts.ready : Promise.resolve(),
      ...visibleImages.map((img) => (img.decode ? img.decode() : Promise.resolve())),
    ]
    let done = 0
    // progress only climbs: a job that settles after finish() (the 6 s failsafe) must not pull a full rail back
    let loaded = 0
    const setLoad = (p) => { if (p > loaded) { loaded = p; loader.style.setProperty('--load', p.toFixed(3)) } }
    setLoad(0.06)
    jobs.forEach((j) => Promise.resolve(j).catch(() => {}).then(() => { done++; setLoad(0.06 + 0.84 * (done / jobs.length)) }))
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      setLoad(1)
      fitScreen()
      // the loader leaves when its bar is full (window.PunchLoader, the script under its markup); a hidden tab runs no
      // frames, so it never waits longer than the bar could take to fill
      const full = window.PunchLoader ? window.PunchLoader.full() : Promise.resolve()
      Promise.race([full, new Promise((r) => setTimeout(r, reduced.matches ? 0 : 600))]).then(() => {
        $('loaderNote').textContent = 'Ready'
        setTimeout(() => {
          loader.classList.add('is-done')
          loader.setAttribute('aria-hidden', 'true')
          quiet.loader = false
          syncInert()
          reveal()
          if (location.hash === '#case') openCase()
        }, reduced.matches ? 0 : 260)
      })
    }
    Promise.allSettled(jobs).then(() => setTimeout(finish, Math.max(0, minimum - performance.now())))
    setTimeout(finish, 6000)
    if (document.fonts) document.fonts.addEventListener('loadingdone', () => queueFit(60))
  }

  boot()
})()
