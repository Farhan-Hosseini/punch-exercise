/* The design system page: the system shared by the machine glass and the phone, read live from the stylesheets.
   Loads after mobile.js and before app.js. app.js calls designSystem.refresh() when the page opens and when the
   theme or appearance changes; this file also watches <html> and the favicon itself, so it never goes stale. */
(() => {
  'use strict'

  const root = document.documentElement
  const stage = document.getElementById('dsStage')
  const ds = document.getElementById('ds')
  if (!stage || !ds) { window.designSystem = { refresh() {} }; return }
  const q = (s, el = ds) => el.querySelector(s)
  const qa = (s, el = ds) => [...el.querySelectorAll(s)]
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const visible = () => !stage.hidden
  const round = (n, d = 0) => { const k = Math.pow(10, d); return Math.round(n * k) / k }
  const px = (n) => `${round(n, n < 10 && n % 1 ? 1 : 0)} px`

  /* ------------------------------------------------------------ icons and glyphs for the samples */
  const ICONS = window.APP_ICONS || {}
  function paintIcons(scope) {
    scope.querySelectorAll('[data-icon]').forEach((el) => {
      const i = ICONS[el.dataset.icon]
      if (i && !el.firstElementChild) el.innerHTML = `<svg viewBox="${i.vb}" aria-hidden="true" focusable="false">${i.svg}</svg>`
    })
  }
  function paintGlyphs(scope) {
    scope.querySelectorAll('[data-glyph]:not([data-glyph="logo"])').forEach((el) => {
      if (el.firstElementChild || !window.glyphSVG) return
      el.innerHTML = window.glyphSVG(el.dataset.glyph)
    })
  }

  /* ------------------------------------------------------------ the icon set: every app icon, grouped by job */
  // a key missing from these groups still shows, under More, so the catalogue never drifts from app-icons.js
  const ICON_GROUPS = [
    ['Tab bar', ['scan', 'board', 'fist', 'cup', 'user']],
    ['Actions', ['back', 'next', 'arrowLeft', 'arrow', 'close', 'plus', 'minus', 'check', 'more', 'search', 'gear', 'refresh', 'rotate', 'download', 'grid']],
    ['Social', ['bell', 'heart', 'heartFill', 'comment', 'share', 'save', 'users', 'eye', 'party']],
    ['Replay', ['play', 'playCircle', 'video', 'camera', 'film', 'volume']],
    ['Rank and stats', ['trophy', 'crown', 'medal', 'award', 'star', 'target', 'flame', 'bolt', 'speed', 'wave', 'up', 'down', 'trend', 'dumbbell']],
    ['Place and time', ['home', 'map', 'pin', 'globe', 'flag', 'qr', 'clock', 'timer']],
    ['Credits', ['wallet', 'card', 'coins', 'banknote', 'receipt', 'bag', 'store', 'ticket', 'gift']],
    ['Trust and status', ['lock', 'fingerprint', 'face', 'shield', 'info', 'checkCircle', 'sparkles']],
  ]
  function buildIcons() {
    const host = q('[data-ds-icons]')
    if (!host) return
    const keys = Object.keys(ICONS)
    const placed = new Set()
    const groups = ICON_GROUPS.map(([name, list]) => {
      const own = list.filter((k) => ICONS[k] && !placed.has(k))
      own.forEach((k) => placed.add(k))
      return [name, own]
    })
    groups.push(['More', keys.filter((k) => !placed.has(k))])
    host.innerHTML = groups.filter(([, list]) => list.length).map(([name, list]) => `<div class="ds-icogroup" data-ds-icogroup>
      <h4 class="ds-icogroup-t">${name}</h4>
      <ul class="ds-icogrid">${list.map((k) => `<li class="ds-ico" data-ds-ico="${k.toLowerCase()}"><span class="ds-ico-well"><span data-icon="${k}"></span></span><code>${k}</code></li>`).join('')}</ul></div>`).join('')
    const find = q('[data-ds-icofind]'), empty = q('[data-ds-icoempty]'), count = q('[data-ds-icocount]')
    if (!find) return
    let t = 0
    find.addEventListener('input', () => {
      const v = find.value.trim().toLowerCase().replace(/[\s-]+/g, '')
      let shown = 0
      qa('[data-ds-icogroup]', host).forEach((g) => {
        let any = false
        qa('[data-ds-ico]', g).forEach((li) => {
          const on = !v || li.dataset.dsIco.includes(v)
          li.hidden = !on
          if (on) { any = true; shown++ }
        })
        g.hidden = !any
      })
      if (empty) empty.hidden = shown > 0
      clearTimeout(t)
      t = setTimeout(() => { if (count) count.textContent = v ? `${shown} ${shown === 1 ? 'icon' : 'icons'} match` : '' }, 400)
    })
  }

  /* ------------------------------------------------------------ the glass glyphs, in their live badges */
  const GLYPH_ROLES = [
    ['machine', 'Machine rank', 'rank', 'trophy'],
    ['city', 'City rank', 'rank', 'map-pin'],
    ['country', 'Country rank', 'rank', 'flag'],
    ['global', 'Global rank', 'rank', 'globe'],
    ['energy', 'Energy', 'stat', 'zap'],
    ['force', 'Force', 'stat', 'activity'],
    ['speed', 'Speed', 'stat', 'gauge'],
    ['acc', 'Acceleration', 'stat', 'trending-up'],
  ]
  function buildGlyphs() {
    const host = q('[data-ds-glyphs]')
    if (!host || !window.GLYPHS) return
    host.innerHTML = GLYPH_ROLES.filter(([k]) => window.GLYPHS[k]).map(([k, role, kind, src]) => `<li class="ds-glyph">
      <span class="ds-glyph-well ds-glass"><span class="badge badge-${kind}" data-glyph="${k}" aria-hidden="true"></span></span>
      <span class="ds-glyph-name">${role}</span><span class="ds-glyph-src"><code>${k}</code><span>Lucide ${src}</span></span></li>`).join('')
  }
  // the line a glyph draws on the glass, from the live badge sizes and the glyph's own box and stroke
  function paintGlyphLine() {
    const out = q('[data-ds-glyphline]'), g = window.GLYPHS && window.GLYPHS.machine
    if (!out || !g || !g.sw) return
    const box = parseFloat(String(g.viewBox).split(/\s+/)[2]) || 40
    const width = (cls) => {
      const b = document.createElement('span')
      b.className = `badge ${cls}`
      b.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none'
      ds.appendChild(b)
      const w = b.getBoundingClientRect().width
      b.remove()
      return w
    }
    const rank = width('badge-rank'), stat = width('badge-stat')
    if (!rank || !stat) return
    const line = (w) => round((g.sw * w) / box, 1)
    out.textContent = `In this theme the rank badge is ${Math.round(rank)} glass pixels and the stat badge ${Math.round(stat)}, so the ${g.sw} stroke draws at ${line(rank)} and ${line(stat)}.`
  }

  /* ------------------------------------------------------------ colour: read a token, resolve it, name it */
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const cx = canvas.getContext('2d', { willReadFrequently: true })
  const probe = document.createElement('span')
  probe.className = 'ds-sprobe'
  probe.setAttribute('aria-hidden', 'true')

  function toRGBA(str) {
    const m = /^rgba?\(([^)]+)\)$/.exec(str.trim())
    if (m) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat)
      return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]
    }
    // oklab, color(srgb ...) and friends: let the canvas convert
    cx.clearRect(0, 0, 1, 1)
    cx.fillStyle = '#000'
    cx.fillStyle = str
    cx.fillRect(0, 0, 1, 1)
    const d = cx.getImageData(0, 0, 1, 1).data
    return [d[0], d[1], d[2], d[3] / 255]
  }
  // resolve any colour expression in the context of an element, so .m-app tokens resolve inside .m-app
  function resolve(expr, host) {
    host.appendChild(probe)
    probe.style.color = ''
    probe.style.color = expr
    const c = getComputedStyle(probe).color
    probe.remove()
    return toRGBA(c)
  }
  const hex = (c) => '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()
  const named = (c) => (c[3] >= 0.995 ? hex(c) : `${hex(c)} at ${Math.round(c[3] * 100)}%`)
  const tok = (host, name) => getComputedStyle(host).getPropertyValue(name).trim()
  const COLOR_RE = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|oklab\([^)]*\)|oklch\([^)]*\)|color\([^)]*\)/gi
  function describeFill(host, name) {
    const raw = tok(host, name)
    if (/gradient\(/.test(raw)) {
      const cs = (raw.match(COLOR_RE) || []).map((c) => named(resolve(c, host)))
      return cs.length > 1 ? `Gradient, ${cs[0]} to ${cs[cs.length - 1]}` : cs[0] || raw
    }
    return named(resolve(`var(${name})`, host))
  }
  function describeBorder(host, name) {
    const raw = tok(host, name)
    const w = /([\d.]+)px/.exec(raw)
    const c = raw.match(COLOR_RE)
    return c ? `${w ? w[1] + ' px ' : ''}rim, ${named(resolve(c[0], host))}` : raw
  }
  // contrast of an ink (maybe translucent) laid over an opaque ground
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2])
  function contrast(fg, bg) {
    const a = fg[3], mix = [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a))
    const [x, y] = [lum(mix), lum(bg)].sort((p, r) => r - p)
    return (x + 0.05) / (y + 0.05)
  }

  /* ------------------------------------------------------------ colour roles */
  const ROLES = {
    machine: {
      ground: '--ground',
      list: [
        { t: '--ground', kind: 'fill', role: 'The glass behind everything' },
        { t: '--raised', kind: 'fill', role: 'Wells and image placeholders, one step off the ground' },
        { t: '--ink-1', kind: 'ink', role: 'Numbers, names and anything read first' },
        { t: '--ink-2', kind: 'ink', role: 'Labels, section titles and card names' },
        { t: '--ink-3', kind: 'ink', role: 'Units and the quiet half of the wordmark' },
        { t: '--line', kind: 'line', role: 'Rules, such as the one above the sponsor' },
        { t: '--track', kind: 'track', role: 'The empty part of the charge and the replay' },
        { t: '--strike', kind: 'fill', role: 'The one red: the charge, the replay and Punch again' },
        { t: '--cta-ink', kind: 'on', on: '--strike', role: 'Words on the red, picked by contrast' },
        { t: '--surface-bg', kind: 'surface', cls: 'surface', border: '--surface-border', label: 'surface', role: 'Cards: ranks, stats and the sponsor' },
        { t: '--surface-hi-bg', kind: 'surface', cls: 'surface-hi', border: '--surface-hi-border', label: 'surface hi', role: 'The one card that matters most on a screen' },
      ],
    },
    app: {
      ground: '--m-ground',
      list: [
        { t: '--m-ground', kind: 'fill', role: 'The app ground, under the red light' },
        { t: '--m-glass', kind: 'glass', border: '--m-line', role: 'Cards, fields and buttons over the light' },
        { t: '--m-glass-hi', kind: 'fill', role: 'Wells inside glass: rank tiles and chips' },
        { t: '--m-card', kind: 'fill', role: 'Feed posts and list cards' },
        { t: '--m-sheet', kind: 'fill', role: 'Bottom sheets, nearly solid' },
        { t: '--m-scrim', kind: 'fill', role: 'Behind a sheet or a dialog' },
        { t: '--m-ink', kind: 'ink', role: 'Titles, names and numbers' },
        { t: '--m-ink-2', kind: 'ink', role: 'Places, captions and secondary text' },
        { t: '--m-ink-3', kind: 'ink', role: 'Hints and placeholders' },
        { t: '--m-line', kind: 'rim', role: 'Glass rims and dividers' },
        { t: '--m-line-2', kind: 'rim', role: 'Rims on buttons, and on hover and focus' },
        { t: '--m-red', kind: 'fill', role: 'The strike on the phone: the main button and the chosen tab' },
        { t: '--m-red-soft', kind: 'ink', role: 'Red as text and icons, lifted for contrast' },
        { t: '--m-red-deep', kind: 'fill', role: 'The dark end of red gradients' },
        { t: '--m-on-red', kind: 'on', on: '--m-red', role: 'Words and icons on red' },
        { t: '--m-up', kind: 'ink', role: 'A rank that moved up' },
        { t: '--m-down', kind: 'ink', role: 'A rank that moved down' },
        { t: '--m-blob', kind: 'fill', role: 'The red light behind the glass' },
      ],
    },
  }
  function chipFor(r, ground) {
    const g = `background:var(${ground})`
    switch (r.kind) {
      case 'ink': return `<span class="ds-chip" aria-hidden="true" style="${g}"><b style="color:var(${r.t})">Aa</b></span>`
      case 'on': return `<span class="ds-chip" aria-hidden="true" style="background:var(${r.on})"><b style="color:var(${r.t})">Aa</b></span>`
      case 'line': return `<span class="ds-chip" aria-hidden="true" style="${g}"><i class="ds-chip-line" style="background:var(${r.t})"></i></span>`
      case 'track': return `<span class="ds-chip" aria-hidden="true" style="${g}"><i class="ds-chip-track" style="background:var(${r.t})"></i></span>`
      case 'rim': return `<span class="ds-chip" aria-hidden="true" style="${g}"><i class="ds-chip-rim" style="border-color:var(${r.t})"></i></span>`
      case 'surface': return `<span class="ds-chip" aria-hidden="true" style="${g}"><i class="ds-chip-surface ${r.cls}"></i></span>`
      case 'glass': return `<span class="ds-chip" aria-hidden="true" style="${g}"><i style="background:linear-gradient(135deg, var(--m-blob) 0 45%, transparent 45%)"></i><i class="ds-chip-rim" style="background:var(${r.t});border-color:var(${r.border})"></i></span>`
      default: return `<span class="ds-chip" aria-hidden="true" style="${g}"><i style="background:var(${r.t})"></i></span>`
    }
  }
  function buildSwatches() {
    for (const [key, set] of Object.entries(ROLES)) {
      const host = q(`[data-ds-swatches="${key}"]`)
      if (!host) continue
      host.innerHTML = set.list.map((r) => `<li class="ds-swatch">${chipFor(r, set.ground)}
        <span class="ds-sw-text"><span class="ds-sw-name">${r.label ? '.' + r.cls : r.t}</span><span class="ds-sw-val" data-ds-val="${r.t}">&nbsp;</span><span class="ds-sw-role">${r.role}</span></span></li>`).join('')
    }
  }
  function paintSwatches() {
    for (const [key, set] of Object.entries(ROLES)) {
      const list = q(`[data-ds-swatches="${key}"]`)
      if (!list) continue
      const host = key === 'app' ? q('[data-ds-apptokens]') : ds
      const ground = resolve(`var(${set.ground})`, host)
      for (const r of set.list) {
        const out = list.querySelector(`[data-ds-val="${r.t}"]`)
        if (!out) continue
        let text
        if (r.kind === 'surface') text = `${describeFill(host, r.t)}, ${describeBorder(host, r.border)}`
        else if (r.kind === 'glass') text = `${describeFill(host, r.t)}, ${describeBorder(host, r.border).replace(/^rim, /, 'rim ')}`
        else text = describeFill(host, r.t)
        if (r.kind === 'ink' || r.kind === 'on') {
          const fg = resolve(`var(${r.t})`, host)
          const bg = r.kind === 'on' ? resolve(`var(${r.on})`, host) : ground
          text += `, ${round(contrast(fg, bg), 1).toFixed(1)}:1 on ${r.kind === 'on' ? 'the red' : 'the ground'}`
        }
        out.textContent = text
      }
    }
  }

  /* ------------------------------------------------------------ the brief's tokens, exactly as given */
  const GIVEN = [
    { name: 'Primary red', steps: [['50', '#FEF3F3'], ['100', '#FAC5C5'], ['200', '#F69898'], ['300', '#F26B6A'], ['400', '#EE3E3D'], ['500', '#EB1110'], ['600', '#BC0D0C'], ['700', '#8D0A09'], ['800', '#8D0A09'], ['900', '#5E0606']],
      marks: [{ at: 5, span: 1, text: 'Kept' }, { at: 7, span: 2, text: 'Same value' }] },
    { name: 'Secondary magenta', steps: [['50', '#FBECFB'], ['100', '#F9D7F8'], ['500', '#D842D3'], ['900', '#9C339D']],
      marks: [{ at: 2, span: 1, text: 'Dropped' }] },
    { name: 'Warm neutrals', steps: [['50', '#FAF9F9'], ['100', '#EBE6E4'], ['200', '#DCD2D0'], ['300', '#CCBFBB'], ['400', '#CCBFBB'], ['500', '#BDABA6'], ['600', '#AE9892'], ['700', '#685E5B'], ['800', '#453C3A'], ['900', '#221E1D']],
      marks: [{ at: 3, span: 2, text: 'Same value' }] },
    { name: 'Supportive green, yellow and red', groups: 3, steps: [['', '#00C853'], ['', '#04853F'], ['', '#E5F8ED'], ['', '#FFAB00'], ['', '#9F8016'], ['', '#FFFAE7'], ['', '#D50000'], ['', '#99050A'], ['', '#FBE5E5']],
      marks: [{ at: 0, span: 3, text: 'Green' }, { at: 3, span: 3, text: 'Yellow' }, { at: 6, span: 3, text: 'Red' }] },
  ]
  const OPACITY = [0, 10, 20, 30, 40, 50, 60, 70]
  const isLight = (h) => { const c = toRGBA(h); return lum(c) > 0.6 }
  function stripMarkup(set) {
    const n = set.steps.length, gap = set.groups ? n / set.groups : 0
    let html = `<div class="ds-strip${set.groups ? ' is-grouped' : ''}" style="grid-template-columns:repeat(${n}, minmax(0, 1fr))">`
    set.steps.forEach(([label, h], i) => {
      const cls = ['ds-sw']
      if (isLight(h)) cls.push('is-light')
      if (gap && i % gap === 0 && i > 0) cls.push('is-gap')
      if (i === n - 1 || (gap && i % gap === gap - 1)) cls.push(gap && i % gap === gap - 1 ? 'is-gap-end' : 'is-last')
      html += `<span class="${cls.join(' ')}" style="background:${h};grid-row:1;grid-column:${i + 1}" title="${label ? set.name + ' ' + label + ', ' : ''}${h}"></span>`
      if (label) html += `<span class="ds-step" style="grid-row:2;grid-column:${i + 1}">${label}</span>`
    })
    for (const m of set.marks || []) {
      html += `<span class="ds-mark${m.span === 1 ? ' is-one' : ''}" style="grid-row:3;grid-column:${m.at + 1} / span ${m.span}">${m.text}</span>`
    }
    return html + '</div>'
  }
  function buildGiven() {
    const host = q('[data-ds-given]')
    if (!host) return
    const described = (set) => set.steps.map(([l, h]) => (l ? `${l} ${h}` : h)).join(', ')
    let html = GIVEN.map((set) => `<div class="ds-scale" role="group" aria-label="${set.name}: ${described(set)}"><p class="ds-k">${set.name}</p>${stripMarkup(set)}</div>`).join('')
    const op = (name, rgb) => stripMarkup({
      name, steps: OPACITY.map((a) => [String(a), `rgba(${rgb}, ${a / 100})`]),
    }).replace(/ is-light/g, '')
    html += `<div class="ds-scale ds-dark-tile" role="group" aria-label="White and grey opacity scales from 0 to 70 percent, shown over neutral 900">
      <p class="ds-k">White, 0 to 70%, over neutral 900</p>${op('White', '255, 255, 255')}
      <p class="ds-k">Grey #F2F3F3, 0 to 70%</p>${op('Grey', '242, 243, 243')}</div>`
    host.innerHTML = html
  }

  /* ------------------------------------------------------------ Orbitron against Big Shoulders on the 920 column */
  const LONGEST = '999,999.000'
  const FIT_FACES = { orbitron: '"Orbitron"', shoulders: '"Big Shoulders Display"' }
  let fitMetrics = null
  async function measureFaces() {
    try {
      await Promise.all(Object.values(FIT_FACES).map((f) => document.fonts.load(`900 100px ${f}`, LONGEST)))
    } catch { /* fonts unavailable: fall back to whatever loaded */ }
    const m = {}
    for (const [key, face] of Object.entries(FIT_FACES)) {
      cx.font = `900 100px ${face}, sans-serif`
      const w = cx.measureText(LONGEST).width
      const cap = cx.measureText('0').actualBoundingBoxAscent
      m[key] = { w, cap, capAt920: (cap * 920) / w }
    }
    fitMetrics = m
    paintFit()
  }
  function paintFit() {
    if (!fitMetrics) return
    const { orbitron: o, shoulders: s } = fitMetrics
    for (const [key, v] of Object.entries(fitMetrics)) {
      const out = q(`[data-ds-fit="${key}"]`)
      if (out) out.textContent = `cap height ${Math.round(v.capAt920)} px`
      const num = q(`[data-ds-fitnum="${key}"]`)
      if (!num) continue
      const box = num.parentElement
      const width = box.clientWidth - 20
      if (width > 0) num.style.fontSize = ((width / v.w) * 100).toFixed(2) + 'px'
    }
    const cmp = q('[data-ds-fitcmp]')
    if (cmp) cmp.setAttribute('aria-label', `The same score across the same column: ${Math.round(o.capAt920)} pixel cap height in Orbitron, ${Math.round(s.capAt920)} in Big Shoulders Display, ${round(s.capAt920 / o.capAt920, 1)} times taller.`)
  }

  /* ------------------------------------------------------------ faces and the type scale */
  const firstFamily = (v) => (v.split(',')[0] || '').replace(/["']/g, '').trim()
  function paintFaces() {
    qa('[data-ds-face]').forEach((el) => {
      const host = el.hasAttribute('data-ds-app') ? el.closest('.m-app') : root
      const t = el.dataset.dsFace
      const weightTok = { '--f-display': '--w-display', '--f-text': '--w-text', '--f-label': '--w-label', '--m-num': '--m-w-num' }[t]
      const w = weightTok ? tok(host, weightTok) : ''
      el.textContent = `${firstFamily(tok(host, t))}${w ? ', ' + w : ''}`
    })
    const faces = [...new Set(['--f-display', '--f-text', '--f-label'].map((t) => firstFamily(tok(root, t))))]
    const list = faces.length > 1 ? faces.slice(0, -1).join(', ') + ' and ' + faces[faces.length - 1] : faces[0]
    const f = q('[data-ds-faces]')
    if (f) f.textContent = list
  }
  // computed font sizes inside a zoomed glass: compare against a known size in the same context
  function glassFactor(el) {
    const scope = el.closest('.ds-glass-in')
    if (!scope) return 1
    const s = document.createElement('span')
    s.style.cssText = 'position:absolute;visibility:hidden;font-size:100px'
    scope.appendChild(s)
    const f = 100 / (parseFloat(getComputedStyle(s).fontSize) || 100)
    s.remove()
    return f
  }
  // a face sample never clips: it shrinks until it fits its column
  function fitSpecs() {
    qa('.ds-face-spec').forEach((el) => {
      el.style.fontSize = ''
      const w = el.clientWidth
      if (w && el.scrollWidth > w) el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * w / el.scrollWidth * 0.98).toFixed(1) + 'px'
    })
  }
  // the score card's column on the phone, the same width .ds-cq draws at on a wide page
  const PHONE_COL = 354
  function paintSizes() {
    qa('[data-ds-size]').forEach((el) => {
      const out = q(`[data-ds-size-of="${el.dataset.dsSize}"]`)
      if (!out) return
      const cs = getComputedStyle(el)
      let size = parseFloat(cs.fontSize) * glassFactor(el)
      // a phone sample sized by its column is reported at the phone's own column, even when this page is narrower
      const cq = el.closest('.ds-cq')
      if (cq && cq.clientWidth < PHONE_COL - 1) {
        const probe = cq.cloneNode(true)
        probe.style.cssText = `position:absolute;left:0;top:0;width:${PHONE_COL}px;visibility:hidden;pointer-events:none`
        cq.parentElement.appendChild(probe)
        const twin = probe.querySelector('[data-ds-size]')
        if (twin) size = parseFloat(getComputedStyle(twin).fontSize)
        probe.remove()
      }
      const unit = el.closest('.m-app') ? 'pt' : 'px'
      out.textContent = `${round(size, size % 1 ? 1 : 0)} ${unit}, ${cs.fontWeight}`
    })
  }

  /* ------------------------------------------------------------ the big-number rule */
  const CAP_PX = 210
  const rule = { col: 920, text: '999,999' }
  const colIn = q('#dsCol'), colOut = q('#dsColOut')
  function paintRule() {
    const cap = parseFloat(tok(root, '--cap')) || 0.8
    const numW = parseFloat(tok(root, '--num-w')) || 0.424
    qa('[data-ds-tok]').forEach((el) => { el.textContent = String(parseFloat(tok(root, el.dataset.dsTok))).replace(/^0\./, '.') })
    // the number's width in digits, measured in the live display face, separators included
    let meter = q('.ds-meter')
    if (!meter) {
      const wrap = document.createElement('span')
      wrap.className = 'ds-meter-wrap'
      wrap.setAttribute('aria-hidden', 'true')
      meter = document.createElement('span')
      meter.className = 'display ds-meter'
      wrap.appendChild(meter)
      ds.appendChild(wrap)
    }
    meter.textContent = rule.text
    const em = meter.getBoundingClientRect().width / 100
    const chars = em > 0 ? em / numW : rule.text.length + 0.4
    const byCap = CAP_PX / cap
    const byCol = rule.col / (chars * numW)
    const size = Math.min(byCap, byCol)
    const col = q('[data-ds-col]'), num = q('[data-ds-bignum]')
    if (!col || !num) return
    col.style.width = rule.col + 'px'
    num.style.fontSize = size.toFixed(2) + 'px'
    q('[data-ds-bigtext]').textContent = rule.text
    if (colOut) colOut.textContent = `${rule.col} px`
    if (colIn) colIn.style.setProperty('--fill', ((rule.col - colIn.min) / (colIn.max - colIn.min)) * 100 + '%')
    const limit = byCol < byCap ? 'The column limits it, so the number shrinks to fit.' : `The cap height limits it: ${CAP_PX} px of cap, whatever the column.`
    const out = q('[data-ds-readout]')
    if (out) out.textContent = `${rule.text} is ${round(chars, 1)} digits wide. Font size ${Math.round(size)} px, cap height ${Math.round(size * cap)} px. ${limit}`
    // guides: the baseline from a zero-size inline box, the cap line from the --cap token above it
    const base = num.querySelector('.ds-base')
    const colRect = col.getBoundingClientRect()
    const scale = colRect.width / rule.col || 1
    const baseY = (base.getBoundingClientRect().top - colRect.top) / scale
    const g1 = q('[data-ds-guide="base"]'), g2 = q('[data-ds-guide="cap"]')
    if (g1) g1.style.top = baseY.toFixed(1) + 'px'
    if (g2) g2.style.top = (baseY - size * cap).toFixed(1) + 'px'
  }
  if (colIn) colIn.addEventListener('input', () => { rule.col = Number(colIn.value); paintRule() })
  qa('[data-ds-len]').forEach((b) => b.addEventListener('click', () => {
    rule.text = b.dataset.dsLen
    qa('[data-ds-len]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)))
    paintRule()
  }))

  /* ------------------------------------------------------------ spacing and radius */
  // each scale is read from the element that owns it: the flow screens' from a real .mscreen, the result's and the
  // phone's through probes laid out in their own grounds, so every bar is the live value
  const SPACE = {
    flow: [
      { t: '--ms-gut', role: 'Side margin of every flow screen', owner: '#machine .mscreen' },
      { t: '--ms-sec-gap', role: 'Between two sections of a screen', owner: '#machine .mscreen' },
      { t: '--ms-group-gap', role: 'Between groups inside a section, a heading and its content', owner: '#machine .mscreen' },
      { t: '--ms-item-gap', role: 'Between items in a list', owner: '#machine .mscreen' },
      { t: '--ms-pad', role: 'Inside a card or a tile', owner: '#machine .mscreen' },
    ],
    machine: [
      { t: '--pad', role: 'Side margin of the result, the same as every flow screen’s', from: '#screen' },
      { t: '--pad-top', role: 'Above the header', from: '#screen' },
      { t: '--pad-bottom', role: 'Below the sponsor', from: '#screen' },
      { t: '--gap-sec', role: 'Between sections, before the fit shares out any spare height', from: '#screen' },
      { t: '--card-pad', role: 'Inside a card', from: '#screen' },
      { t: '--gap-title', role: 'From a section title to its content', from: '#screen' },
      { t: '--gap-grid', role: 'Between cards in a grid', from: '#screen' },
    ],
    app: [
      { t: '--m-top', role: 'Clear of the status bar and the island' },
      { t: '--m-bottom', role: 'Clear of the home indicator' },
      { t: '--m-gut', role: 'Side margin of every page' },
      { t: '--m-sec-gap', role: 'Between two sections of a page' },
      { t: '--m-group-gap', role: 'Between groups inside a section, a heading and its content' },
      { t: '--m-item-gap', role: 'Between items in a list or a row of chips' },
      { t: '--m-pad', role: 'Inside a card or a tile' },
    ],
  }
  const scaleHost = (key) => q(`[data-ds-spaces="${key}"]`)
  function buildSpaces() {
    for (const [key, list] of Object.entries(SPACE)) {
      const host = scaleHost(key)
      if (!host) continue
      host.innerHTML = list.map((s) => `<li class="ds-space">
        <span class="ds-space-name"><code>${s.t}</code></span>
        <span class="ds-space-bar"><i data-ds-bar="${key}${s.t}"></i><span class="ds-space-v" data-ds-spv="${key}${s.t}"></span></span>
        <span class="ds-space-role">${s.role}</span>
        ${s.owner ? '' : `<span class="ds-sprobe" style="width:var(${s.t})" data-ds-probe="${key}${s.t}"></span>`}</li>`).join('')
    }
  }
  function paintSpaces() {
    for (const [key, list] of Object.entries(SPACE)) {
      for (const s of list) {
        const id = key + s.t
        let v = 0
        if (s.owner) { const o = document.querySelector(s.owner); v = o ? parseFloat(getComputedStyle(o).getPropertyValue(s.t)) || 0 : 0 }
        else {
          const probeEl = q(`[data-ds-probe="${id}"]`)
          // a result token is read as the Result glass (#screen) resolves it: its value is laid out on the probe
          const from = s.from && document.querySelector(s.from)
          const val = from ? getComputedStyle(from).getPropertyValue(s.t).trim() : ''
          if (probeEl) probeEl.style.width = val || `var(${s.t})`
          v = probeEl ? probeEl.getBoundingClientRect().width : 0
        }
        const bar = q(`[data-ds-bar="${id}"]`), out = q(`[data-ds-spv="${id}"]`)
        if (bar) bar.style.width = v + 'px'
        if (out) out.textContent = px(v)
      }
    }
    const space = parseFloat(getComputedStyle(root).getPropertyValue('--space')) || 1
    const note = q('[data-ds-space-note]')
    if (note) note.textContent = root.dataset.variant === 'reference'
      ? 'Fixed values from the Figma frame, in glass pixels'
      : `Breathing room at ${Math.round(space * 100)}%, in glass pixels`
  }
  const RADII = [
    { group: 'Glass' },
    { name: 'Cards and buttons', r: 'var(--r)', live: '--r', code: '--r' },
    { name: 'Thumbnails', r: 'calc(var(--r) * .7)', code: '--r × .7' },
    { name: 'Badges', r: '50%', v: 'round', code: '.badge' },
    { group: 'Phone' },
    { name: 'Glass cards', r: '20px', code: '.m-glass' },
    { name: 'Rows and stats', r: '18px', code: '.m-row' },
    { name: 'Buttons', r: '16px', code: '.m-btn' },
    { name: 'Hit card, posts', r: '24px', code: '.yh-card' },
    { name: 'Chips, tabs, tab bar', r: '999px', v: 'round', code: '.m-chip' },
  ]
  function buildRadii() {
    const host = q('[data-ds-radii]')
    if (!host) return
    host.innerHTML = RADII.map((r) => (r.group
      ? `<li class="ds-radius-group">${r.group}</li>`
      : `<li class="ds-radius"><span class="ds-radius-shape" style="border-radius:${r.r}" aria-hidden="true"></span>
         <span class="ds-radius-name">${r.name}</span><span class="ds-radius-v"><span data-ds-radius="${r.code}">${r.v || (/^[\d.]+px$/.test(r.r) ? px(parseFloat(r.r)) : r.r)}</span>, <code>${r.code}</code></span></li>`)).join('')
  }
  function paintRadii() {
    const r = parseFloat(tok(root, '--r')) || 0
    const a = q('[data-ds-radius="--r"]'), b = q('[data-ds-radius="--r × .7"]')
    if (a) a.textContent = px(r)
    if (b) b.textContent = px(r * 0.7)
  }

  /* ------------------------------------------------------------ the logo */
  const LOGOS = [
    { key: 'fist', name: 'Fist', src: 'assets/logos/fist-circle.svg' },
    { key: 'boxer', name: 'Boxer', src: 'assets/logos/boxer-circle.svg' },
    { key: 'glove', name: 'Glove', src: 'assets/logos/glove-tilt.svg' },
    { key: 'upright', name: 'Guard', src: 'assets/logos/glove-upright.svg' },
    { key: 'pair', name: 'Pair', src: 'assets/logos/gloves-pair.svg' },
    { key: 'bag', name: 'Speed bag', src: 'assets/logos/speedbag.svg' },
  ]
  const favicon = document.querySelector('link[rel="icon"]')
  function currentLogo() {
    const href = favicon ? favicon.getAttribute('href') : ''
    let found = LOGOS.find((l) => href && href.endsWith(l.src))
    if (!found) {
      try { const saved = JSON.parse(localStorage.getItem('punch-showcase.v5') || 'null'); found = LOGOS.find((l) => saved && l.key === saved.logo) } catch { /* storage blocked */ }
    }
    return (found || LOGOS[0]).key
  }
  function buildLogos() {
    const host = q('[data-ds-logos]')
    if (!host) return
    host.innerHTML = LOGOS.map((l) => `<button class="ds-logo" type="button" role="radio" aria-checked="false" data-ds-logo="${l.key}" aria-label="${l.name}${l.key === 'fist' ? ', the default' : ''}">
      <span class="ds-logo-well"><img src="${l.src}" alt=""></span>
      <span class="ds-logo-name">${l.name}<span class="ds-logo-use">In use</span></span>
      <span class="ds-logo-file">${l.src.split('/').pop()}</span></button>`).join('')
    const btns = qa('[data-ds-logo]', host)
    const pick = (b, focus) => {
      if (window.showcase && window.showcase.logo) window.showcase.logo(b.dataset.dsLogo)
      paintLogos()
      if (focus) b.focus()
      const live = document.getElementById('switchLive')
      if (live) live.textContent = `Logo: ${LOGOS.find((l) => l.key === b.dataset.dsLogo).name}`
    }
    btns.forEach((b, i) => {
      b.addEventListener('click', () => pick(b, false))
      b.addEventListener('keydown', (e) => {
        const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
        if (!step) return
        e.preventDefault()
        pick(btns[(i + step + btns.length) % btns.length], true)
      })
    })
  }
  function paintLogos() {
    const key = currentLogo()
    qa('[data-ds-logo]').forEach((b) => {
      const on = b.dataset.dsLogo === key
      b.setAttribute('aria-checked', String(on))
      b.tabIndex = on ? 0 : -1
    })
  }

  /* ------------------------------------------------------------ the scaled glass: 1080 glass pixels to the tile's width.
     A small type sample stays legible on a narrow screen: its piece of glass is laid out narrower, so it draws larger */
  const LEGIBLE_PX = 11
  function fitGlass(g) {
    const inner = g.querySelector(':scope > .ds-glass-in')
    if (!inner || !g.clientWidth) return
    inner.style.removeProperty('width')
    let w = 1080
    inner.style.setProperty('--dz', (g.clientWidth / w).toFixed(4))
    const sample = g.hasAttribute('data-ds-legible') && inner.querySelector('[data-ds-size]')
    if (sample) {
      const glassPx = parseFloat(getComputedStyle(sample).fontSize) * glassFactor(sample)
      const need = glassPx ? LEGIBLE_PX / glassPx : 0
      if (g.clientWidth / w < need) {
        w = Math.max(360, Math.floor(g.clientWidth / need))
        inner.style.width = w + 'px'
        inner.style.setProperty('--dz', (g.clientWidth / w).toFixed(4))
      }
    }
  }
  const glassObserver = 'ResizeObserver' in window ? new ResizeObserver((entries) => {
    for (const e of entries) fitGlass(e.target)
    queueLayout()
  }) : null
  const fitGlassNow = () => qa('[data-ds-glass]').forEach(fitGlass)
  // a tab bar sample keeps the phone's 440 px width, so nav.css lays it out as on the device; a narrower column zooms it
  const NAV_W = 440
  const fitNav = (row) => {
    const demo = row.querySelector(':scope > .ds-navdemo')
    if (demo && row.clientWidth) demo.style.setProperty('--nz', Math.min(1, row.clientWidth / NAV_W).toFixed(4))
  }
  const navObserver = 'ResizeObserver' in window ? new ResizeObserver((entries) => entries.forEach((e) => fitNav(e.target))) : null
  let layoutRaf = 0
  function queueLayout() {
    cancelAnimationFrame(layoutRaf)
    layoutRaf = requestAnimationFrame(() => { if (visible()) { paintRule(); paintFit(); fitSpecs() } })
  }

  /* ------------------------------------------------------------ the page's own controls */
  function wire() {
    // index: scroll to a section and move focus to its heading, without touching the URL
    qa('[data-ds-link]').forEach((a) => a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'))
      if (!target) return
      e.preventDefault()
      target.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' })
      const h = target.querySelector('.ds-h2')
      if (h) h.focus({ preventScroll: true })
    }))
    const custom = q('[data-ds-custom]')
    if (custom) custom.addEventListener('click', () => { const b = document.getElementById('openCustom'); if (b && b.getAttribute('aria-expanded') !== 'true') b.click() })
    // sample tabs and tab bar respond, so the states can be tried
    qa('[data-ds-tabs]').forEach((list) => {
      const tabs = qa('[role="tab"]', list)
      const select = (t, focus) => { tabs.forEach((x) => { x.setAttribute('aria-selected', String(x === t)); x.tabIndex = x === t ? 0 : -1 }); if (focus) t.focus() }
      tabs.forEach((t, i) => {
        t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1
        t.addEventListener('click', () => select(t, false))
        t.addEventListener('keydown', (e) => {
          const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
          if (!step) return
          e.preventDefault()
          select(tabs[(i + step + tabs.length) % tabs.length], true)
        })
      })
    })
    // each tab bar sample keeps its own current tab; --nav-i drives the sliding line of the Minimal style
    qa('[data-ds-nav]').forEach((nav) => {
      const items = qa('.m-nav-item', nav)
      const app = nav.closest('.m-app')
      items.forEach((b, i) => b.addEventListener('click', () => {
        items.forEach((x) => { if (x === b) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current') })
        if (app) { app.style.setProperty('--nav-i', i); app.removeAttribute('data-nav-none') }
      }))
    })
    // scrollspy for the index
    const links = qa('[data-ds-link]')
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const id = '#' + e.target.id
          links.forEach((a) => { if (a.getAttribute('href') === id) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current') })
        }
      }, { rootMargin: '-30% 0px -60% 0px' })
      qa('.ds-sec').forEach((s) => io.observe(s))
      // back above the first section (the hero), no section is current: the last one lit must not stay lit
      const first = q('.ds-sec')
      let spyRaf = 0
      window.addEventListener('scroll', () => {
        cancelAnimationFrame(spyRaf)
        spyRaf = requestAnimationFrame(() => {
          if (!visible() || !first) return
          if (first.getBoundingClientRect().top > window.innerHeight * .4) links.forEach((a) => a.removeAttribute('aria-current'))
        })
      }, { passive: true })
    }
  }

  /* ------------------------------------------------------------ refresh: read everything again */
  function paintLook() {
    const look = `${root.dataset.variant === 'reference' ? 'Reference' : 'Arena'}, ${root.dataset.appearance === 'light' ? 'Light' : 'Dark'}`
    const el = q('[data-ds-look]')
    if (el) el.textContent = look
    const accent = q('[data-ds-accent]')
    if (accent) accent.textContent = hex(resolve('var(--strike)', ds))
  }
  function refresh() {
    if (!visible()) { stale = true; return }
    stale = false
    fitGlassNow()
    paintLook()
    paintSwatches()
    paintFaces()
    fitSpecs()
    paintSizes()
    paintSpaces()
    paintRadii()
    paintLogos()
    paintGlyphLine()
    paintRule()
    paintFit()
  }
  let stale = true, refreshRaf = 0
  const queueRefresh = () => { cancelAnimationFrame(refreshRaf); refreshRaf = requestAnimationFrame(refresh) }

  /* ------------------------------------------------------------ boot */
  buildGiven()
  buildSwatches()
  buildSpaces()
  buildRadii()
  buildLogos()
  buildIcons()
  buildGlyphs()
  paintIcons(ds)
  paintGlyphs(ds)
  wire()
  if (glassObserver) qa('[data-ds-glass]').forEach((g) => glassObserver.observe(g))
  if (navObserver) qa('.ds-navrow').forEach((r) => navObserver.observe(r))
  // theme, appearance and the live controls all land on <html>; the logo lands on the favicon
  new MutationObserver(() => { if (visible()) queueRefresh() }).observe(root, { attributes: true, attributeFilter: ['data-variant', 'data-appearance', 'style'] })
  if (favicon) new MutationObserver(paintLogos).observe(favicon, { attributes: true, attributeFilter: ['href'] })
  // the stage is shown by app.js: catch up if anything changed while it was hidden
  new MutationObserver(() => { if (visible() && stale) queueRefresh() }).observe(stage, { attributes: true, attributeFilter: ['hidden'] })
  if (document.fonts) {
    measureFaces()
    document.fonts.ready.then(() => { if (visible()) queueRefresh() })
    document.fonts.addEventListener('loadingdone', () => { if (visible()) queueRefresh() })
  }
  window.addEventListener('resize', () => { if (visible()) queueLayout() })

  window.designSystem = { refresh }
})()


/* The score format and the machine flow sections of the design system page (parts/ds.html, #ds-score and #ds-flow).
   The score specimen is written by the shared formatter (format.js) and follows the Score format control. The flow
   section lists the flow screens with the designs each one pages through, read from the machine's own markup, and
   previews any of them, on any backdrop, in a live glass: this page in ?embed=machine&follow=0, loaded when the
   section comes near. A preview never changes what the machine tab shows; Open does, the same as the screen bar. */
;(() => {
  'use strict'
  const root = document.documentElement
  const stage = document.getElementById('dsStage')
  if (!stage || root.dataset.embed === 'machine') return

  /* ------------------------------------------------------------ score format */
  function paintScores() {
    const F = window.PunchFormat
    if (!F) return
    stage.querySelectorAll('[data-ds-scorefmt]').forEach((el) => {
      const n = Number(el.dataset.dsScorefmt)
      el.innerHTML = F.scoreHTML(n)
      // the result's own score takes the result's widths (.s-hero: 9.8, or 7.9 in whole points), as on the glass
      if (!el.closest('.s-hero')) el.style.setProperty('--score-chars', F.width(n).toFixed(2))
      el.style.setProperty('--chars', F.width(n).toFixed(2))
      el.setAttribute('aria-label', F.score(n))
    })
  }
  paintScores()
  document.addEventListener('decimals', paintScores)

  /* ------------------------------------------------------------ the machine flow
     Every screen is one frame of sections now (psec.js), so the list names each screen's sections, read from the
     machine's own markup; the Result keeps its older engine and its own nine. */
  const SCREENS = [
    { key: 'default', name: 'Home', job: 'The glass at rest, between visits: a Monster Energy banner up top, the code and today’s best.' },
    { key: 'attract', name: 'Leaderboard', job: 'Between players the glass shows the board, so the queue always has a score to beat.' },
    { key: 'scan', name: 'Scan', job: 'The phone app’s code at chest height, linking a phone before the turn.' },
    { key: 'countdown', name: 'Punch now', job: 'The only clock in the flow: twenty seconds, readable from the pad.' },
    { key: 'loading', name: 'Reading', job: 'Reading the strike, between the hit and the score, so the number arrives as news.' },
    { key: 'result', name: 'Result', job: 'The score as an event, the replay, recent punches at this machine and Punch again, in nine sections with their own rows in Customise.' },
    { key: 'score', name: 'Big score', job: 'The number, whose hit it is, one reason to care and the player’s own punch on video, for the back of the queue.' },
    { key: 'record', name: 'New record', job: 'A hit that tops the board gets a moment of its own in red, with its video, before the result.' },
  ]
  // the eight looks of app.js BACKDROPS, in its order: Red glow first, the default
  const BACKDROPS = [
    { key: 'glow', name: 'Red glow' }, { key: 'lights', name: 'Soft lights' }, { key: 'spot', name: 'Spotlight' },
    { key: 'beams', name: 'Stadium beams' }, { key: 'smoke', name: 'Smoke' }, { key: 'pulse', name: 'Heartbeat' },
    { key: 'embers', name: 'Embers' }, { key: 'grid', name: 'Arena grid' },
  ]
  window.dsBackdrops = BACKDROPS
  const list = stage.querySelector('[data-ds-flowlist]')
  const frame = stage.querySelector('[data-ds-flowframe]')
  const cap = stage.querySelector('[data-ds-flowcap]')
  const bdHost = stage.querySelector('[data-ds-backdrops]')
  if (!list || !frame) return
  const words = (a) => (a.length < 2 ? (a[0] || '') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`)
  const secsOf = (key) => (window.PSec ? window.PSec.sections('machine', key).map((s) => s.label) : [])
  const cur = { key: 'default', backdrop: BACKDROPS.some((b) => b.key === root.dataset.mbackdrop) ? root.dataset.mbackdrop : BACKDROPS[0].key }

  function paintList() {
    list.innerHTML = SCREENS.map((s) => {
      const secs = s.key === 'result' ? [] : secsOf(s.key)
      const line = secs.length ? `<p class="ds-flowsecs"><span class="sr-only">Sections: </span>${words(secs)}</p>` : ''
      return `<li data-flow="${s.key}"><button class="ds-flowname" type="button" data-flow-key="${s.key}">${s.name}</button><p class="ds-flowjob">${s.job}</p>${line}<button class="ds-look-btn ds-flowopen" type="button" data-flow-open="${s.key}" aria-label="Open ${s.name} on the machine">Open</button></li>`
    }).join('')
  }
  paintList()
  if (bdHost) bdHost.innerHTML = BACKDROPS.map((b) => `<button class="ds-pick" type="button" data-bd="${b.key}" aria-pressed="false">${b.name}</button>`).join('')

  let ready = false
  function show() {
    let w, doc
    try { w = frame.contentWindow; doc = frame.contentDocument } catch (e) { return }
    if (ready && w && w.showcase && doc) {
      w.showcase.mscreen(cur.key, { from: 'ds' })
      doc.documentElement.dataset.mbackdrop = cur.backdrop
    }
    sync()
  }
  function sync() {
    list.querySelectorAll('li').forEach((li) => { if (li.dataset.flow === cur.key) li.setAttribute('aria-current', 'true'); else li.removeAttribute('aria-current') })
    if (bdHost) bdHost.querySelectorAll('.ds-pick').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.bd === cur.backdrop)))
    const s = SCREENS.find((x) => x.key === cur.key)
    const bd = BACKDROPS.find((b) => b.key === cur.backdrop)
    if (cap && ready) cap.textContent = cur.key === 'result' ? `${s.name}, as set in Customise.` : `${s.name}, on ${bd ? bd.name : 'the background'}.`
  }
  function load() {
    if (!frame.getAttribute('src')) frame.setAttribute('src', './?embed=machine&follow=0')
  }
  list.addEventListener('click', (e) => {
    const open = e.target.closest('[data-flow-open]')
    if (open) {
      if (window.showcase) { window.showcase.mode('machine'); window.showcase.mscreen(open.dataset.flowOpen, { from: 'ds' }) }
      return
    }
    const b = e.target.closest('[data-flow-key]')
    if (!b) return
    cur.key = b.dataset.flowKey
    load(); show()
  })
  if (bdHost) bdHost.addEventListener('click', (e) => {
    const b = e.target.closest('[data-bd]')
    if (!b) return
    cur.backdrop = b.dataset.bd
    load(); show()
  })
  // the shared choice moved (Customise, or Background above): the preview follows it
  new MutationObserver(() => {
    const k = root.dataset.mbackdrop
    if (k && k !== cur.backdrop && BACKDROPS.some((b) => b.key === k)) { cur.backdrop = k; show() }
  }).observe(root, { attributes: true, attributeFilter: ['data-mbackdrop'] })
  frame.addEventListener('load', () => {
    // the embedded page runs its scripts as it loads; wait for its hook before the first preview
    let tries = 0
    const wait = () => {
      let ok = false
      try { ok = !!(frame.contentWindow && frame.contentWindow.showcase) } catch (e) { ok = false }
      if (ok) { ready = true; show(); setTimeout(() => frame.classList.add('is-ready'), 200) }
      else if (tries++ < 40) setTimeout(wait, 150)
    }
    wait()
  })
  // the glass loads only once the section is near and the design system is the tab on show
  const sec = document.getElementById('ds-flow')
  if ('IntersectionObserver' in window && sec) {
    new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting) && !stage.hidden) load() }, { rootMargin: '400px 0px' }).observe(sec)
  } else load()
  sync()
})()


/* Round six on the design system page (parts/ds.html): the page model (#ds-pages, with the Default pages and a live
   census of every page's sections), the global background (#ds-bg), the one QR style (#ds-qr), the Lucide icons in
   use (#ds-icons), the photo library (#ds-photo) and the Monster Energy kit (#ds-sponsor). Everything is read from
   the showcase itself (psec.js, app.js's hooks, the photo manifest), so the page cannot drift from what it documents.
   A pick on this page is the real choice, the same as its Customise row. */
;(() => {
  'use strict'
  const root = document.documentElement
  const stage = document.getElementById('dsStage')
  const ds = document.getElementById('ds')
  if (!stage || !ds || root.dataset.embed === 'machine') return
  const q = (s, el = ds) => el.querySelector(s)
  const qa = (s, el = ds) => [...el.querySelectorAll(s)]
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const words = (a) => (a.length < 2 ? (a[0] || '') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`)
  const cap1 = (t) => t.charAt(0).toUpperCase() + t.slice(1)
  const PS = () => window.PSec
  const SC = () => window.showcase
  const SPELL = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']
  const spell = (n) => (n < SPELL.length ? SPELL[n] : String(n))

  // arrow keys move through a radiogroup of buttons, as a radiogroup should
  function roving(group) {
    group.addEventListener('keydown', (e) => {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
      if (!(e.key in keys)) return
      const g = e.target.closest('[role="radiogroup"]') || group
      const items = [...g.querySelectorAll('[role="radio"]')].filter((b) => !b.closest('[hidden]'))
      const i = items.indexOf(document.activeElement)
      if (i < 0) return
      e.preventDefault()
      const next = items[(i + keys[e.key] + items.length) % items.length]
      next.focus(); next.click()
    })
  }
  const check = (group, pred) => group.querySelectorAll('[role="radio"]').forEach((b) => {
    const on = !!pred(b)
    b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1
  })

  /* ------------------------------------------------------------ go links: app.js takes them only in the brief and the
     case study, so the page switches the tab here; anim.js then opens the screen or the page on the same click */
  ds.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go-mode]')
    if (go && SC()) SC().mode(go.dataset.goMode)
  })

  /* ------------------------------------------------------------ pages and sections */
  const labelOf = (surface, page) => {
    const b = document.querySelector(surface === 'machine' ? `.mpagebar [data-mscreen="${page}"]` : `.pagebar [data-page="${page}"]`)
    const t = b ? b.textContent.trim() : page
    return surface === 'phone' && page === 'default' ? 'Home' : t
  }
  const keysOf = (surface) => (surface === 'machine'
    ? [...document.querySelectorAll('.mpagebar [data-mscreen]')].map((b) => b.dataset.mscreen)
    : [...document.querySelectorAll('.pagebar [data-page]')].map((b) => b.dataset.page))
  const goAttrs = (surface, page) => (surface === 'machine' ? `data-go-mode="machine" data-go-mscreen="${page}"` : `data-go-mode="mobile" data-go-page="${page}"`)
  const picks = (surface, page, s, label) => `<div class="ds-picks" role="radiogroup" aria-label="${esc(label)}">${s.names.map((n, i) =>
    `<button class="ds-pick" type="button" role="radio" aria-checked="false" data-psec="${surface}|${page}|${s.key}|${i}">${esc(n)}</button>`).join('')}</div>`

  function census() {
    if (!PS()) return
    let pages = 0, secs = 0, designs = 0, fewest = Infinity
    for (const surface of ['phone', 'machine']) {
      const host = q(`[data-ds-census="${surface}"]`)
      if (!host) continue
      host.innerHTML = keysOf(surface).map((page) => {
        const name = labelOf(surface, page)
        if (surface === 'machine' && page === 'result') {
          return `<li class="ds-cen ds-cen-plain"><div class="ds-cen-row"><span class="ds-cen-name">${esc(name)}</span><span class="ds-cen-secs">Its own nine sections and older engine, with rows of their own in Customise</span></div><button class="ds-look-btn ds-cen-open" type="button" ${goAttrs(surface, page)} aria-label="Open ${esc(name)}">Open</button></li>`
        }
        const list = PS().sections(surface, page)
        pages++; secs += list.length
        for (const s of list) { designs += s.names.length; fewest = Math.min(fewest, s.names.length) }
        const body = list.map((s) => `<div class="ds-cen-sec"><p class="ds-cen-label">${esc(s.label)}</p>${picks(surface, page, s, `${s.label} on ${name}`)}</div>`).join('')
        return `<li class="ds-cen"><details><summary><span class="ds-cen-row"><span class="ds-cen-name">${esc(name)}</span><span class="ds-cen-secs">${esc(words(list.map((s) => s.label)))}</span></span></summary><div class="ds-cen-body">${body}<button class="ds-look-btn" type="button" ${goAttrs(surface, page)}>Open ${esc(name)}</button></div></details></li>`
      }).join('')
    }
    const sum = q('[data-ds-census-sum]')
    if (sum) sum.textContent = `Read live from the pages. ${cap1(spell(pages))} pages carry ${secs} sections and ${designs} designs between them, and no section has fewer than ${spell(fewest === Infinity ? 5 : fewest)}. Open a page to page through its designs here.`
    const g = q('[data-ds-census-global]')
    if (g) {
      const shared = PS().sections('global')
      g.innerHTML = `Shared by every page: ${shared.map((s) => `<b>${esc(s.label)}</b>, ${s.names.length} designs`).join('; ')}.`
    }
    for (const host of qa('[data-ds-secs]')) {
      const [surface, page] = host.dataset.dsSecs.split('/')
      host.innerHTML = PS().sections(surface, page).map((s) => `<li><span class="ds-dflt-sec">${esc(s.label)}</span><span class="ds-dflt-n">${esc(s.names.join(', '))}</span></li>`).join('')
    }
    syncPicks()
  }
  function syncPicks() {
    if (!PS()) return
    for (const group of qa('.ds-cen-sec .ds-picks, [data-ds-monpick], [data-ds-wires]')) {
      const b = group.querySelector('[data-psec]')
      if (!b) continue
      const [surface, page, key] = b.dataset.psec.split('|')
      const i = PS().get(surface, page, key)
      check(group, (x) => Number(x.dataset.psec.split('|')[3]) === i)
    }
  }
  ds.addEventListener('click', (e) => {
    const b = e.target.closest('[data-psec]')
    if (!b || !SC()) return
    const [surface, page, key, i] = b.dataset.psec.split('|')
    SC().sec(surface, page, key, Number(i))
    syncPicks()
  })
  qa('.ds-census-list').forEach(roving)
  document.addEventListener('psec', syncPicks)

  /* five designs of one section: the phone's leaderboard Board, drawn as wireframes that pick the real design */
  const WIRES = {
    cards: '<rect x="6" y="10" width="48" height="16" rx="4"/><rect x="6" y="31" width="48" height="16" rx="4"/><rect x="6" y="52" width="48" height="16" rx="4"/><g class="k"><circle cx="14" cy="18" r="4"/><circle cx="14" cy="39" r="4"/><circle cx="14" cy="60" r="4"/></g>',
    champion: '<rect x="6" y="8" width="48" height="34" rx="4"/><g class="k"><rect x="11" y="33" width="24" height="4" rx="2"/></g><rect x="6" y="47" width="48" height="10" rx="3"/><rect x="6" y="61" width="48" height="10" rx="3"/>',
    podium: '<g class="k"><circle cx="30" cy="20" r="5"/></g><circle cx="15" cy="32" r="4"/><circle cx="45" cy="38" r="4"/><rect x="23" y="28" width="14" height="44" rx="2"/><rect x="8" y="39" width="14" height="33" rx="2"/><rect x="38" y="45" width="14" height="27" rx="2"/>',
    tiles: '<rect x="6" y="10" width="22" height="28" rx="4"/><rect x="32" y="10" width="22" height="28" rx="4"/><rect x="6" y="42" width="22" height="28" rx="4"/><rect x="32" y="42" width="22" height="28" rx="4"/><g class="k"><rect x="10" y="30" width="12" height="4" rx="2"/></g>',
    'force meter': '<g class="k"><rect x="6" y="12" width="48" height="8" rx="4"/></g><rect x="6" y="25" width="41" height="8" rx="4"/><rect x="6" y="38" width="35" height="8" rx="4"/><rect x="6" y="51" width="28" height="8" rx="4"/><rect x="6" y="64" width="22" height="8" rx="4"/>',
  }
  function wires() {
    const host = q('[data-ds-wires]')
    if (!host || !PS()) return
    const secs = PS().sections('phone', 'ranks')
    const s = secs.find((x) => x.label === 'Board') || secs.find((x) => x.names.length >= 5)
    if (!s) return
    host.innerHTML = s.names.map((n, i) => {
      const art = WIRES[n.toLowerCase()] || WIRES.cards
      return `<button class="ds-wire" type="button" role="radio" aria-checked="false" data-psec="phone|ranks|${s.key}|${i}"><svg viewBox="0 0 60 80" aria-hidden="true" focusable="false">${art}</svg><span>${esc(n)}</span></button>`
    }).join('')
    roving(host)
    syncPicks()
  }

  /* ------------------------------------------------------------ the global background */
  const BG_LINES = {
    glow: 'The phone’s own three red bodies', lights: 'Six warm pools, drifting slowly', spot: 'One lamp, a lit floor, dust in the beam',
    beams: 'Lamps along the top, swinging', smoke: 'Haze rolling through stage light', pulse: 'Rings of light rising in pairs',
    embers: 'Sparks drifting up from below', grid: 'A lit floor in perspective',
  }
  function backgrounds() {
    const host = q('[data-ds-bgpicks]')
    const list = window.dsBackdrops
    if (!host || !list) return
    const img = (k, s, a) => `<img class="ds-bgimg ds-on-${a}" src="assets/ds/bg/${k}-${s}-${a}.jpg" alt="" loading="lazy" decoding="async">`
    host.innerHTML = list.map((b) => `<button class="ds-bgpick" type="button" role="radio" aria-checked="false" data-bg="${b.key}">
      <span class="ds-bgthumbs" aria-hidden="true"><span class="ds-bgt ds-bgt-glass">${img(b.key, 'glass', 'dark')}${img(b.key, 'glass', 'light')}</span><span class="ds-bgt ds-bgt-phone">${img(b.key, 'phone', 'dark')}${img(b.key, 'phone', 'light')}</span></span>
      <span class="ds-bgname">${b.name}</span><span class="ds-bgline">${BG_LINES[b.key] || ''}</span></button>`).join('')
    host.addEventListener('click', (e) => {
      const b = e.target.closest('[data-bg]')
      if (b && SC()) SC().backdrop(b.dataset.bg)
      syncBackground()
    })
    roving(host)
    syncBackground()
  }
  function syncBackground() {
    const host = q('[data-ds-bgpicks]')
    const list = window.dsBackdrops || []
    const k = root.dataset.mbackdrop || (list[0] && list[0].key)
    if (host) check(host, (b) => b.dataset.bg === k)
    const bd = list.find((b) => b.key === k)
    const c = q('[data-ds-bgcap]')
    if (c && bd) c.textContent = `${bd.name}, live on the phone ground`
  }

  /* ------------------------------------------------------------ the QR code, in its three states */
  function qr() {
    const group = q('[data-ds-qrstate]')
    if (!group) return
    if (window.PunchQR) qa('#ds-qr [data-pqr]:not([data-pqr-mounted])').forEach((el) => window.PunchQR.mount(el))
    group.addEventListener('click', (e) => {
      const b = e.target.closest('[data-state]')
      if (!b) return
      qa('#ds-qr .pqr').forEach((el) => { el.classList.remove('is-scanning', 'is-found'); if (b.dataset.state) el.classList.add(b.dataset.state) })
      check(group, (x) => x === b)
    })
    roving(group)
    check(group, (x) => x.dataset.state === '')
  }

  /* ------------------------------------------------------------ the Lucide icons in use, read from the page */
  function lucide() {
    const host = q('[data-ds-lucide]')
    if (!host) return
    const where = new Map()
    for (const el of document.querySelectorAll('[data-lucide]')) {
      if (stage.contains(el)) continue
      const n = el.dataset.lucide
      if (!where.has(n)) where.set(n, new Set())
      where.get(n).add(el.closest('#machine') ? 'Glass' : el.closest('#mApp, #device') ? 'Phone' : 'Showcase')
    }
    const names = [...where.keys()].sort()
    host.innerHTML = names.map((n) => `<li class="ds-luc" data-luc="${esc(n)}"><span class="ds-luc-ico" data-lucide="${esc(n)}" aria-hidden="true"></span><span class="ds-luc-name">${esc(n)}</span><span class="ds-luc-where">${[...where.get(n)].sort().map((w) => `<i>${w}</i>`).join('')}</span></li>`).join('')
    const c = q('[data-ds-lucidecount]')
    if (c) c.textContent = `${names.length} icons, each drawn at 24 px with the surfaces it appears on`
    // three rows at first; the rest open on request, so the grid never buries the sections below it
    const more = q('[data-ds-lucmore]')
    if (more) {
      more.hidden = names.length <= 21
      if (!more.dataset.wired) {
        more.dataset.wired = '1'
        more.addEventListener('click', () => {
          const all = host.classList.toggle('is-all')
          more.setAttribute('aria-expanded', String(all))
          more.textContent = all ? 'Show fewer' : `Show all ${host.children.length}`
        })
      }
      if (!host.classList.contains('is-all')) more.textContent = `Show all ${names.length}`
    }
  }

  /* ------------------------------------------------------------ the photo library, from its manifest */
  const SETS = [
    ['all', 'All'], ['strike', 'Strikes'], ['boxer', 'Boxers'], ['training', 'Training'], ['gloves', 'Gloves'], ['venue', 'Venues'], ['city', 'Cities'],
    ['friends', 'Friends'], ['phone', 'Phones'], ['drink', 'Drinks'], ['ground', 'Dark grounds'], ['face', 'Faces'],
  ]
  const setOf = (e) => {
    const f = e.file.replace(/^.*\//, '')
    if (e.subject === 'avatar') return 'face'
    if (/^(bag|fist)-strike/.test(f)) return 'strike'
    if (/^boxer/.test(f)) return 'boxer'
    if (/^(gloves|fist-closeup)/.test(f)) return 'gloves'
    if (/^(gym-regular|strength)/.test(f)) return 'training'
    if (/^(gym|arcade|mall)/.test(f)) return 'venue'
    if (/^(dubai|city)/.test(f)) return 'city'
    if (/^friends/.test(f)) return 'friends'
    if (/^phone/.test(f)) return 'phone'
    if (/^hydrate/.test(f)) return 'drink'
    if (/^dark/.test(f)) return 'ground'
    return 'all'
  }
  let photosDone = false
  function photos() {
    if (photosDone) return
    photosDone = true
    const strip = q('[data-ds-photos]'), filter = q('[data-ds-photofilter]')
    if (!strip) return
    fetch('assets/photos/lib/manifest.json').then((r) => r.json()).then((list) => {
      const byFile = new Map(list.map((e) => [e.file.replace(/^.*\//, ''), e]))
      qa('[data-ds-libphoto]').forEach((img) => { const e = byFile.get(img.dataset.dsLibphoto); if (e && e.focal) img.style.setProperty('--ds-focal', e.focal) })
      strip.innerHTML = list.map((e) => {
        const f = e.file.replace(/^.*\//, '')
        const face = e.subject === 'avatar'
        const src = face ? `assets/app/avatars/${f}` : `assets/ds/photos/${f}`
        const who = e.photographer ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.photographer)}</a>` : 'unknown'
        const subject = face ? `${cap1(f.replace(/\.jpg$/, ''))}, avatar` : cap1(e.subject)
        return `<li class="ds-ph${face ? ' is-face' : ''}" data-set="${setOf(e)}"><img src="${src}" alt="${esc(subject)}" loading="lazy" decoding="async" width="150" height="200"${face ? '' : ` style="object-position:${esc(e.focal || '50% 50%')}"`}><p class="ds-ph-s">${esc(subject)}</p><p class="ds-ph-c">${who}, ${esc(e.source || 'Pexels')}</p></li>`
      }).join('')
      const counts = {}
      list.forEach((e) => { const s = setOf(e); counts[s] = (counts[s] || 0) + 1 })
      qa('.ds-ph', strip).forEach((li, i) => { if (list[i].player) li.dataset.player = list[i].player })
      // the cast: every board player has a shoot of their own (three or more shots of one person), so no hit borrows
      // another face; the regulars and the reel's crowd have fewer and stay out of this row
      const cast = q('[data-ds-cast]')
      const shoots = new Map()
      list.forEach((e) => { if (e.player && !/^crowd/.test(e.player)) { if (!shoots.has(e.player)) shoots.set(e.player, []); shoots.get(e.player).push(e) } })
      const players = [...shoots].filter(([, es]) => es.length >= 3).sort((a, b) => (a[0] === 'me' ? -1 : b[0] === 'me' ? 1 : a[0].localeCompare(b[0])))
      if (cast && players.length) {
        const nameOf = (k) => (k === 'me' ? 'Sara' : cap1(k))
        const byOf = (es) => { const c = {}; es.forEach((e) => { c[e.photographer] = (c[e.photographer] || 0) + 1 }); return Object.keys(c).sort((a, b) => c[b] - c[a])[0] }
        cast.innerHTML = players.map(([k, es]) => `<button class="ds-castp" type="button" role="radio" aria-checked="false" tabindex="-1" data-player="${esc(k)}"><img src="assets/app/avatars/${esc(nameOf(k).toLowerCase())}.jpg" alt="" width="44" height="44" loading="lazy" decoding="async"><span class="ds-castp-n">${esc(nameOf(k))}</span><span class="ds-castp-c">${cap1(spell(es.length))} shots, ${esc(byOf(es))}</span></button>`).join('')
        const castNote = q('[data-ds-castnote]')
        if (castNote) castNote.textContent = `${cap1(spell(players.length))} players, each with a shoot of their own. Pick one to see their shots.`
      }
      if (filter) {
        filter.innerHTML = SETS.filter(([k]) => k === 'all' || counts[k]).map(([k, n]) => `<button class="ds-pick" type="button" role="radio" aria-checked="${k === 'all'}" tabindex="${k === 'all' ? 0 : -1}" data-set="${k}">${n}</button>`).join('')
        const castEl = q('[data-ds-cast]')
        const pick = (b) => {
          const k = b.dataset.set, p = b.dataset.player
          qa('.ds-ph', strip).forEach((li) => { li.hidden = p ? li.dataset.player !== p : (k !== 'all' && li.dataset.set !== k) })
          strip.scrollLeft = 0
          check(filter, (x) => x === b)
          if (castEl) check(castEl, (x) => x === b)
          // one tab stop for the two groups together: the filter keeps it while a player is picked
          if (p) { const all = filter.querySelector('[data-set="all"]'); if (all) all.tabIndex = 0; const cur = castEl.querySelector('[aria-checked="true"]'); if (cur) cur.tabIndex = 0 }
          else if (castEl) { const f = castEl.querySelector('[role="radio"]'); if (f) f.tabIndex = 0 }
        }
        filter.addEventListener('click', (ev) => { const b = ev.target.closest('[data-set]'); if (b) pick(b) })
        roving(filter)
        if (castEl) {
          castEl.addEventListener('click', (ev) => { const b = ev.target.closest('[data-player]'); if (b) pick(b) })
          roving(castEl)
          const f = castEl.querySelector('[role="radio"]'); if (f) f.tabIndex = 0
        }
      }
      const photosN = list.filter((e) => e.subject !== 'avatar').length, faces = list.length - photosN
      const foot = q('[data-ds-photofoot]')
      if (foot) foot.textContent = `${photosN} photographs and ${faces} faces, all from Pexels under the Pexels License, free for commercial use. The photographer's name under each one links to the original. Thumbnails here are cut at each photo's focal point, the point every crop keeps.`
    }).catch(() => { strip.innerHTML = '<li class="ds-ph-none">The photo library did not load.</li>' })
  }

  /* ------------------------------------------------------------ the Monster Energy kit */
  const MON = [
    { t: '--mon-green', name: 'Monster green', role: 'The call to act, the claw, the flash' },
    { t: '--mon-black', name: 'Monster black', role: 'The ground under every creative' },
    { t: '--mon-steel', name: 'Can steel', role: 'The can’s top and the small print' },
    { t: '--mon-mark', name: 'Claw on the ground', role: 'The claw where it sits on the page, darker in daylight' },
  ]
  function sponsor() {
    const claw = q('[data-ds-monclaw]'), src = document.querySelector('#machine .ms-ad .mon-claw')
    if (claw && src) claw.innerHTML = src.innerHTML
    const sw = q('[data-ds-monsw]')
    if (sw) sw.innerHTML = MON.map((m) => `<li class="ds-monchip"><span class="ds-monchip-c" style="background:var(${m.t})" aria-hidden="true"></span><span><b>${m.name}</b><code data-ds-mon="${m.t}"></code><span class="ds-note">${m.role}</span></span></li>`).join('')
    paintSponsor()
    if (PS()) {
      const top = PS().sections('machine', 'default').find((s) => s.key === 'topad' || /ad/i.test(s.label))
      const strip = PS().sections('global').find((s) => s.key === 'sponsor')
      const fill = (sel, surface, page, s) => {
        const host = q(`[data-ds-monpick="${sel}"]`)
        if (!host || !s) return
        host.innerHTML = s.names.map((n, i) => `<button class="ds-pick" type="button" role="radio" aria-checked="false" data-psec="${surface}|${page}|${s.key}|${i}">${esc(n)}</button>`).join('')
        roving(host)
      }
      fill('topad', 'machine', 'default', top)
      fill('sponsor', 'global', '', strip)
      fill('promo', 'phone', 'default', PS().sections('phone', 'default').find((s) => s.key === 'promo'))
      syncPicks()
    }
    // the phone Home banner: a copy of the design on show, taken again whenever its pick changes
    const home = q('[data-ds-monhome]')
    const takeHome = () => {
      const real = PS() && PS().active('phone', 'default', 'promo')
      if (!home || !real || real.hasAttribute('data-sec')) return
      const c = real.cloneNode(true)
      c.removeAttribute('hidden'); c.removeAttribute('data-sv')
      c.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'))
      c.querySelectorAll('[data-mh-claim]').forEach((el) => { el.removeAttribute('data-mh-claim'); el.tabIndex = -1 })
      home.replaceChildren(c)
    }
    takeHome()
    document.addEventListener('psec', (e) => { if (e.detail && e.detail.surface === 'phone' && e.detail.page === 'default' && e.detail.sec === 'promo') takeHome() })
    const post = q('[data-ds-monpost]')
    const real = document.querySelector('.m-page[data-page="feed"] [data-sec="sponsored"] > [data-sv]')
    if (post && real) {
      const c = real.cloneNode(true)
      c.removeAttribute('hidden'); c.removeAttribute('data-sv')
      c.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'))
      c.querySelectorAll('[hidden]').forEach((el) => el.removeAttribute('hidden'))
      post.replaceChildren(c)
      if (window.APP_ICONS) c.querySelectorAll('[data-icon]').forEach((el) => { const i = window.APP_ICONS[el.dataset.icon]; if (i && !el.firstChild) el.innerHTML = i })
    }
    // the glass at rest, live: this page in ?embed=machine&follow=0, loaded when the section comes near
    const frame = q('[data-ds-monframe]'), capEl = q('[data-ds-moncap]')
    if (!frame) return
    const load = () => { if (!frame.getAttribute('src')) frame.setAttribute('src', './?embed=machine&follow=0') }
    frame.addEventListener('load', () => {
      let tries = 0
      const wait = () => {
        let w = null
        try { w = frame.contentWindow && frame.contentWindow.showcase ? frame.contentWindow : null } catch (e) { w = null }
        if (w) {
          w.showcase.mscreen('default', { from: 'ds' })
          setTimeout(() => frame.classList.add('is-ready'), 200)
          if (capEl) capEl.textContent = 'The glass at rest, live. It follows the picks beside it.'
        } else if (tries++ < 40) setTimeout(wait, 150)
      }
      wait()
    })
    const sec = document.getElementById('ds-sponsor')
    if ('IntersectionObserver' in window && sec) {
      new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting) && !stage.hidden) load() }, { rootMargin: '400px 0px' }).observe(sec)
    } else load()
  }
  function paintSponsor() {
    const cs = getComputedStyle(root)
    qa('[data-ds-mon]').forEach((el) => { el.textContent = cs.getPropertyValue(el.dataset.dsMon).trim().toUpperCase() })
  }

  /* ------------------------------------------------------------ start, once the other scripts have drawn the pages */
  function start() {
    census(); wires(); backgrounds(); qr(); lucide(); sponsor()
    // the manifest is read at once (the thumbnails still load lazily): the cast it builds has height, and filling it
    // late would push every section below it down under a reader who jumped there from the index or the brief
    photos()
  }
  // after the other scripts have run their DOMContentLoaded work (psec.js applies every section, qr.js mounts)
  if (document.readyState !== 'loading') setTimeout(start, 0)
  else document.addEventListener('DOMContentLoaded', () => setTimeout(start, 60))
  new MutationObserver(() => { syncBackground(); paintSponsor() }).observe(root, { attributes: true, attributeFilter: ['data-mbackdrop', 'data-appearance', 'data-variant'] })
  // a page that opens later may have added icons: recount them whenever the design system comes on show
  new MutationObserver(() => { if (!stage.hidden) { lucide(); syncPicks(); syncBackground() } }).observe(stage, { attributes: true, attributeFilter: ['hidden'] })
})()


/* Round seven on the design system page (parts/ds.html): the page bars in two steps with Customise's This screen under
   them (#ds-pagebars), Your run (#ds-yourrun), the Big score (#ds-bigscore) and the showcase's own loader (#ds-loader).
   As before, everything is read from the showcase itself: the bars from the real page navs, the rows and picks from
   psec.js, the loader from its own markup, and each live glass is this page in ?embed=machine&follow=0. A pick here is
   the real choice, the same as its Customise row. */
;(() => {
  'use strict'
  const root = document.documentElement
  const stage = document.getElementById('dsStage')
  const ds = document.getElementById('ds')
  if (!stage || !ds || root.dataset.embed === 'machine') return
  const q = (s, el = ds) => el.querySelector(s)
  const qa = (s, el = ds) => [...el.querySelectorAll(s)]
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const PS = () => window.PSec
  const SC = () => window.showcase
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const CHEV = (d) => `<svg class="ico" viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${d < 0 ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'}"/></svg>`
  // a radiogroup of buttons: arrows move and pick, one tab stop
  function roving(group) {
    group.addEventListener('keydown', (e) => {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
      if (!(e.key in keys)) return
      const items = [...group.querySelectorAll('[role="radio"]')]
      const i = items.indexOf(document.activeElement)
      if (i < 0) return
      e.preventDefault()
      const next = items[(i + keys[e.key] + items.length) % items.length]
      next.focus(); next.click()
    })
  }
  const check = (group, pred) => group.querySelectorAll('[role="radio"]').forEach((b) => {
    const on = !!pred(b)
    b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1
  })
  // redraw a host without losing the focus a click put inside it
  function redraw(host, html, keyAttr) {
    const a = document.activeElement
    const key = a && host.contains(a) ? a.getAttribute(keyAttr) : null
    host.innerHTML = html
    if (key) { const b = host.querySelector(`[${keyAttr}="${CSS.escape(key)}"]`); if (b) b.focus({ preventScroll: true }) }
  }

  /* ------------------------------------------------------------ the page bars, in two steps, and This screen */
  const SURF = [
    { surface: 'phone', attr: 'page', kind: 'Phone screen', name: 'Phone', when: 'mobile', icon: 'smartphone' },
    { surface: 'machine', attr: 'mscreen', kind: 'Machine screen', name: 'Machine', when: 'machine', icon: 'monitor' },
  ]
  const bars = {}
  let active = 'machine'
  // the groups and screens of each surface, read from its real page bar; the screen on show there starts the sample
  function readBars() {
    for (const s of SURF) {
      const nav = document.querySelector(`.pagenav[data-pagenav="${s.attr}"]`)
      if (!nav) continue
      const groups = [...nav.querySelectorAll('.pagegroups [data-group]')].map((b) => ({ key: b.dataset.group, name: b.textContent.trim() }))
      const pages = [...nav.querySelectorAll(`.pagesub [data-${s.attr}]`)].map((b) => ({ key: b.getAttribute(`data-${s.attr}`), name: b.textContent.trim(), group: b.dataset.in }))
      if (!groups.length || !pages.length) continue
      const cur = nav.querySelector('.pagesub [aria-current="page"]')
      const was = bars[s.surface]
      bars[s.surface] = { ...s, groups, pages, page: was ? was.page : (cur ? cur.getAttribute(`data-${s.attr}`) : pages[0].key), last: was ? was.last : {} }
    }
  }
  const pageOf = (b, key) => b.pages.find((p) => p.key === key) || b.pages[0]
  function paintBars() {
    const host = q('[data-ds-pn]')
    if (!host) return
    const html = SURF.filter((s) => bars[s.surface]).map((s) => {
      const b = bars[s.surface]
      const on = pageOf(b, b.page)
      const mine = b.pages.filter((p) => p.group === on.group)
      const gname = (b.groups.find((g) => g.key === on.group) || {}).name || ''
      const sub = mine.length > 1
        ? `<div class="pagebar ds-pn-sub" role="group" aria-label="${esc(gname)} screens on the ${s.name.toLowerCase()}">${mine.map((p) => `<button type="button" data-pn="${s.surface}|p|${p.key}" aria-pressed="${p.key === on.key}">${esc(p.name)}</button>`).join('')}</div>`
        : '<p class="ds-note ds-pn-one">One screen in this group, so no second row</p>'
      return `<div class="ds-pn-surf${active === s.surface ? ' is-active' : ''}">
        <p class="ds-k ds-pn-k"><span data-lucide="${s.icon}" aria-hidden="true"></span>${s.name}</p>
        <div class="ds-pn-nav">
          <div class="pagebar ds-pn-groups" role="group" aria-label="${s.name} screen groups">${b.groups.map((g) => `<button type="button" data-pn="${s.surface}|g|${g.key}" aria-pressed="${g.key === on.group}">${esc(g.name)}</button>`).join('')}</div>
          ${sub}
        </div>
      </div>`
    }).join('')
    redraw(host, html, 'data-pn')
    const b = bars[active]
    const note = q('[data-ds-pn-note]'), open = q('[data-ds-pn-open]')
    if (b) {
      const p = pageOf(b, b.page)
      if (note) note.textContent = `Customise below is drawn for ${p.name}, on the ${b.name.toLowerCase()}.`
      if (open) { open.textContent = `Open ${p.name}`; open.dataset.surface = active; open.dataset.page = p.key }
    }
  }
  function pickBar(surface, kind, key) {
    const b = bars[surface]
    if (!b) return
    active = surface
    if (kind === 'g') {
      const first = b.pages.find((p) => p.group === key)
      const last = b.last[key]
      b.page = last && pageOf(b, last).group === key ? last : (first ? first.key : b.page)
    } else b.page = key
    b.last[pageOf(b, b.page).group] = b.page
    paintBars(); paintCust()
  }

  // Customise, drawn with the real panel's own classes (.acc, .sec-row) for the screen picked above
  const rowHTML = (label, name, n, i, data) => `<div class="sec-row is-plain"><div class="sec-meta"><span class="sec-name">${esc(label)}</span><span class="sec-design"><b>${esc(name)}</b><span class="sec-dots" aria-hidden="true">${Array.from({ length: n }, (_, k) => `<i${k === i ? ' class="on"' : ''}></i>`).join('')}</span></span></div>
    <div class="sec-arrows"><button class="sec-btn" type="button" data-cust="${data}|-1" aria-label="Previous ${esc(label.toLowerCase())} design">${CHEV(-1)}</button><button class="sec-btn" type="button" data-cust="${data}|1" aria-label="Next ${esc(label.toLowerCase())} design">${CHEV(1)}</button></div></div>`
  const accOpen = { page: true, every: true }
  const accHTML = (id, kind, title, body, note) => `<details class="acc" data-ds-acc="${esc(id)}"${accOpen[id] ? ' open' : ''}><summary class="acc-sum"><span class="acc-t"><span class="acc-k">${esc(kind)}</span><b class="acc-title">${esc(title)}</b></span>${note ? `<span class="acc-note">${esc(note)}</span>` : ''}<span class="acc-chev" aria-hidden="true"></span></summary><div class="acc-body">${body}</div></details>`
  function paintCust() {
    const host = q('[data-ds-cust]')
    const b = bars[active]
    if (!host || !b || !PS()) return
    const page = pageOf(b, b.page)
    let rows
    if (active === 'machine' && page.key === 'result') rows = '<p class="acc-empty">The Result keeps its own nine rows here, on its older engine. Open Customise to page through them.</p>'
    else {
      const secs = PS().sections(active, page.key)
      rows = secs.length
        ? `<div class="sec-rows">${secs.map((s) => { const i = PS().get(active, page.key, s.key); return rowHTML(s.label, s.names[i], s.names.length, i, `${active}|${page.key}|${s.key}`) }).join('')}</div>`
        : '<p class="acc-empty">This screen has nothing to change yet.</p>'
    }
    const bds = window.dsBackdrops || []
    const bk = root.dataset.mbackdrop || (bds[0] && bds[0].key)
    const bi = Math.max(0, bds.findIndex((x) => x.key === bk))
    const glob = PS().sections('global').filter((s) => { const f = s.els && s.els[0] && s.els[0].dataset.secFor; return !f || f === active })
    // Round eleven folded everything shared into one accordion, Across the showcase: size on screen first, then the
    // rows every screen carries, then theme, logo and the two surfaces. Only the rows are live here.
    const sizes = active === 'machine' ? ['Actual size', 'Reading size'] : ['Actual size', 'Fit to window']
    const sub = (title, body) => `<div class="cus-sub"><span class="acc-sub">${esc(title)}</span>${body}</div>`
    const rest = active === 'machine' ? 'Theme, Logo and The glass' : 'Theme, Logo and The phone'
    const shared = sub('Size on screen', `<p class="acc-empty">${esc(sizes.join(' or '))}.</p>`)
      + sub('Across every screen', `<div class="sec-rows">${bds.length ? rowHTML('Background', bds[bi].name, bds.length, bi, 'bg||bg') : ''}${glob.map((s) => { const i = PS().get('global', '', s.key); return rowHTML(s.label, s.names[i], s.names.length, i, `global||${s.key}`) }).join('')}</div>`)
      + sub(rest, '<p class="acc-empty">The same controls as the real panel. Open Customise to change them.</p>')
    const themeNote = document.querySelector('#themeNote')
    const html = `<div class="ds-cust-head"><p class="ds-cust-title" aria-hidden="true">Customise</p><p class="ds-cust-sub">This screen first, then everything the showcase shares.</p></div>
      <div class="ds-cust-body">${accHTML('page', b.kind, page.name, rows)}${accHTML('every', 'Shared', 'Across the showcase', `<div class="cus-shared">${shared}</div>`, themeNote ? themeNote.textContent.trim() : '')}</div>`
    redraw(host, html, 'data-cust')
  }
  function wireBars() {
    const host = q('[data-ds-pn]'), cust = q('[data-ds-cust]'), open = q('[data-ds-pn-open]')
    if (!host || !cust) return
    readBars()
    paintBars(); paintCust()
    host.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pn]')
      if (!b) return
      const [surface, kind, key] = b.dataset.pn.split('|')
      pickBar(surface, kind, key)
    })
    // an accordion keeps its state across redraws ('toggle' does not bubble: listen in the capture phase)
    cust.addEventListener('toggle', (e) => { const d = e.target; if (d.dataset && d.dataset.dsAcc) accOpen[d.dataset.dsAcc] = d.open }, true)
    cust.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cust]')
      if (!b || !SC() || !PS()) return
      const [surface, page, key, dir] = b.dataset.cust.split('|')
      if (surface === 'bg') {
        const list = window.dsBackdrops || []
        const k = root.dataset.mbackdrop || (list[0] && list[0].key)
        const i = list.findIndex((x) => x.key === k)
        const next = list[(i + Number(dir) + list.length) % list.length]
        if (next) SC().backdrop(next.key)
      } else SC().sec(surface, page, key, PS().get(surface, page, key) + Number(dir))
      paintCust()
    })
    if (open) open.addEventListener('click', () => {
      if (!SC()) return
      if (open.dataset.surface === 'machine') { SC().mode('machine'); SC().mscreen(open.dataset.page, { from: 'ds' }) }
      else { SC().mode('mobile'); const b = document.querySelector(`.pagesub [data-page="${open.dataset.page}"]`); if (b) b.click() }
    })
    document.addEventListener('psec', () => { if (!stage.hidden) paintCust() })
    new MutationObserver(paintCust).observe(root, { attributes: true, attributeFilter: ['data-mbackdrop'] })
  }

  /* ------------------------------------------------------------ a live glass: loaded when its section is near and the
     design system is on show, let go again when it is far, so the page never holds more than a copy or two */
  function liveGlass(frame, sec, onReady) {
    let win = null
    frame.addEventListener('load', () => {
      if (frame.dataset.live !== '1') return
      let tries = 0
      const wait = () => {
        if (frame.dataset.live !== '1') return
        let w = null
        try { w = frame.contentWindow && frame.contentWindow.showcase ? frame.contentWindow : null } catch (e) { w = null }
        if (w) { win = w; onReady(w); setTimeout(() => frame.classList.add('is-ready'), 250) }
        else if (tries++ < 40) setTimeout(wait, 150)
      }
      wait()
    })
    const go = (on) => {
      if (on && frame.dataset.live !== '1') { frame.dataset.live = '1'; frame.src = './?embed=machine&follow=0' }
      if (!on && frame.dataset.live === '1') { frame.dataset.live = '0'; win = null; frame.classList.remove('is-ready'); frame.src = 'about:blank' }
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => { const e = entries[entries.length - 1]; go(e.isIntersecting && !stage.hidden) }, { rootMargin: '700px 0px' }).observe(sec)
    } else go(true)
    return () => win
  }

  /* ------------------------------------------------------------ a screen's sections, each with its five picks */
  const WHY = {
    'machine/stats': {
      next: 'The gap to the nearest mark above, with its owner’s name, rounded up. The score sits small above it, and the top of the scale reads Bell rung.',
      crew: 'Everyone in the run on the column by their best hit. The leader wears the crown, three slots each ask for the next attempts, and a line names who goes next.',
      fix: 'One change for the next hit, tagged Camera read when the camera inferred it. Below the confidence line it falls back to a plain tip with no tag.',
      crown: 'The best hit on this machine today, who holds it and since when, in words. The crowd band flatters only when it is true, and an unclaimed crown asks for a scan.',
      again: 'The Results screens’ shared close, a 200 px band over the strip, playing in last after the crown.',
    },
    'machine/score': {
      score: 'The number at the brief’s full length, as wide as the glass, the decimals quieter, and whose hit it is.',
      why: 'One reason to care, the first that holds from the list below, so it is always true and always one.',
      photo: 'The player’s own punch, cut square from their clip, muted and looping, with the strike frame as its poster. Reduced motion shows the poster.',
      again: 'The close every result screen shares: the same five designs as the Result’s own, playing in last.',
    },
    'phone/hit': {
      stats: 'Five designs over one reading. Each keeps the source tags in the same place and handles a hit past the bell, no speed and a first hit.',
    },
    'phone/connected': {
      linked: 'The link, made plain, with the chosen logo in every design.',
      machine: 'Which machine, by venue, floor, landmark and number, and the credit held for this turn.',
      next: 'Step up to the pad. A fill runs the two and a half seconds before Punch opens by itself.',
    },
    'phone/failed': {
      notice: 'What did not happen first: nothing was charged and no credit is held.',
      why: 'Every reason in plain words, with this time’s first and marked.',
      ways: 'The ways to pay that did not fail, each one tap into Checkout, and Back to the packs.',
    },
    'phone/reel': {
      overlay: 'Who, where and the score over the attempt, clear of whatever holds the tools.',
      actions: 'Like, comment, save, share and More. Rail stacks them in one column on the settings button’s axis; Split sends the counts up the right edge and the three tools to the foot.',
      progress: 'The clip’s own clock, slowing through the strike when Slow motion is on.',
    },
  }
  function secBlocks() {
    if (!PS()) return
    for (const host of qa('[data-ds-secblocks]')) {
      const [surface, page] = host.dataset.dsSecblocks.split('/')
      const why = WHY[host.dataset.dsSecblocks] || {}
      // data-ds-only names the sections a block shows, when it wants some of a page's rather than all of them
      const only = host.dataset.dsOnly ? host.dataset.dsOnly.split(',') : null
      host.innerHTML = PS().sections(surface, page).filter((s) => !only || only.includes(s.key)).map((s) => `<div class="ds-secblock">
        <p class="ds-secblock-t">${esc(s.label)}</p>
        ${why[s.key] ? `<p class="ds-note">${esc(why[s.key])}</p>` : ''}
        <div class="ds-picks" role="radiogroup" aria-label="${esc(s.label)} design" data-ds-secpick>${s.names.map((n, i) => `<button class="ds-pick" type="button" role="radio" aria-checked="false" data-psec="${surface}|${page}|${s.key}|${i}">${esc(n)}</button>`).join('')}</div>
      </div>`).join('')
      qa('[data-ds-secpick]', host).forEach(roving)
    }
    syncSecPicks()
  }
  function syncSecPicks() {
    if (!PS()) return
    for (const group of qa('[data-ds-secpick]')) {
      const b = group.querySelector('[data-psec]')
      if (!b) continue
      const [surface, page, key] = b.dataset.psec.split('|')
      const i = PS().get(surface, page, key)
      check(group, (x) => Number(x.dataset.psec.split('|')[3]) === i)
    }
  }

  // the live glasses of Your run and the Big score: a run pick shows that run, the replay starts the screen again
  const LIVE = {}
  function lives() {
    for (const frame of qa('[data-ds-live]')) {
      const key = frame.dataset.dsLive
      const sec = frame.closest('.ds-sec')
      const runs = q(`[data-ds-runs="${key}"]`)
      const cap = q(`[data-ds-livecap="${key}"]`)
      const first = runs && runs.querySelector('[aria-checked="true"]')
      const cur = { run: first ? first.dataset.run : 'karim', claimed: !first || first.dataset.claimed !== 'false', label: first ? first.textContent.trim() : '' }
      const show = () => {
        const w = LIVE[key] && LIVE[key]()
        if (!w) return
        w.showcase.mscreen(key, { from: 'ds', run: cur.run, claimed: cur.claimed })
        if (cap) cap.textContent = `Live: ${cur.label}. The picks beside it change it.`
      }
      LIVE[key] = liveGlass(frame, sec, show)
      if (runs) {
        check(runs, (b) => b === first)
        roving(runs)
        runs.addEventListener('click', (e) => {
          const b = e.target.closest('[data-run]')
          if (!b) return
          cur.run = b.dataset.run; cur.claimed = b.dataset.claimed !== 'false'; cur.label = b.textContent.trim()
          check(runs, (x) => x === b)
          show()
        })
      }
      const again = q(`[data-ds-replay="${key}"]`)
      if (again) again.addEventListener('click', show)
    }
  }

  /* ------------------------------------------------------------ the loader, drawn by its own markup and rules
     Round eleven cut the strength tester: the lockup, one bar and one line, so --lp scales the bar and nothing else. */
  function loader() {
    const host = q('[data-ds-ld]'), range = q('[data-ds-ldrange]'), out = q('#ds-ld-out'), play = q('[data-ds-ldplay]')
    const src = document.querySelector('#loader .ld')
    if (!host || !src) return
    const ld = src.cloneNode(true)
    ld.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'))
    host.replaceChildren(ld)
    const note = ld.querySelector('.loader-note')
    function set(c, done) {
      host.style.setProperty('--lp', c.toFixed(4))
      if (note) note.textContent = done ? 'Ready' : 'Loading the showcase'
      const pct = Math.round(c * 100)
      if (range) { range.value = String(pct); range.style.setProperty('--fill', `${pct}%`) }
      if (out) out.textContent = done ? 'Full' : `${pct}%`
    }
    let raf = 0
    set(1, true)
    if (range) range.addEventListener('input', () => {
      cancelAnimationFrame(raf)
      const c = Number(range.value) / 100
      set(c, c >= 1)
    })
    if (play) play.addEventListener('click', () => {
      cancelAnimationFrame(raf)
      if (reduced()) { set(1, true); return }
      // a fast load as the real one plays it: the bar creeps toward most of its length while the page fetches, then
      // runs out the rest once everything is in
      const t0 = performance.now(), dur = 1100
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / dur)
        if (t >= 1) { set(1, false); raf = requestAnimationFrame(() => set(1, true)); return }
        set(t < .7 ? .86 * (1 - Math.pow(1 - t / .7, 2)) : .86 + .14 * Math.pow((t - .7) / .3, 2), false)
        raf = requestAnimationFrame(tick)
      }
      set(0, false)
      raf = requestAnimationFrame(tick)
    })
  }

  /* ------------------------------------------------------------ start, once the other scripts have drawn the pages */
  function start() { wireBars(); secBlocks(); lives(); loader() }
  if (document.readyState !== 'loading') setTimeout(start, 0)
  else document.addEventListener('DOMContentLoaded', () => setTimeout(start, 80))
  document.addEventListener('psec', syncSecPicks)
  // back on show: the rows and picks catch up with anything Customise changed while the page was hidden
  new MutationObserver(() => { if (!stage.hidden) { paintBars(); paintCust(); syncSecPicks() } }).observe(stage, { attributes: true, attributeFilter: ['hidden'] })
})()
/* Round nine on the design system page (parts/ds.html): the strike in numbers (#ds-strike), a copy of the phone's own
   Stats section with its five numbers read from the hit on the phone (data-strike); the page header's one centre line,
   measured on the sample, and the credits chip with the phone's own count (#ds-header); the reel buttons (#ds-reel);
   and the punch videos (#ds-videos), read from assets/video/lib/manifest.json. The flow states' and the reel's section
   picks are the round seven blocks ([data-ds-secblocks]), so a pick here is the real choice. */
;(() => {
  'use strict'
  const root = document.documentElement
  const stage = document.getElementById('dsStage')
  const ds = document.getElementById('ds')
  if (!stage || !ds || root.dataset.embed === 'machine') return
  const q = (s, el = ds) => el.querySelector(s)
  const qa = (s, el = ds) => [...el.querySelectorAll(s)]
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const cap1 = (t) => t.charAt(0).toUpperCase() + t.slice(1)
  const SPELL = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']
  const spell = (n) => (n < SPELL.length ? SPELL[n] : String(n))
  const shown = () => !stage.hidden
  const hitPage = () => document.querySelector('.m-page[data-page="hit"]')

  /* ------------------------------------------------------------ the strike in numbers */
  // a copy of the Stats design on show, its ids renamed so the copy never answers for the original
  function copyStrike() {
    const host = q('[data-ds-strike]')
    const page = hitPage()
    const src = page && page.querySelector('[data-sec="stats"] > .yx-wrap')
    if (!host || !src) return
    const c = src.cloneNode(true)
    const ids = [...c.querySelectorAll('[id]')].map((el) => el.id)
    c.querySelectorAll('[id]').forEach((el) => { el.id = 'ds-' + el.id })
    if (ids.length) {
      c.querySelectorAll('*').forEach((n) => {
        for (const a of ['marker-end', 'marker-start', 'marker-mid', 'fill', 'stroke', 'href', 'clip-path', 'mask', 'filter']) {
          const v = n.getAttribute(a)
          if (v && ids.some((id) => v.includes('#' + id))) n.setAttribute(a, ids.reduce((s, id) => s.split('#' + id).join('#ds-' + id), v))
        }
      })
    }
    // the copy is a picture of the section: nothing in it takes focus
    c.querySelectorAll('button, a, [tabindex], input').forEach((el) => el.setAttribute('tabindex', '-1'))
    host.replaceChildren(c)
    const cap = q('[data-ds-strikecap]')
    const PS = window.PSec
    const sec = PS && PS.sections('phone', 'hit').find((s) => s.key === 'stats')
    if (cap && sec) cap.textContent = `${sec.names[PS.get('phone', 'hit', 'stats')] || sec.names[0]}, copied from the phone's Your hit as it is drawn now.`
  }
  function strike() {
    const page = hitPage()
    try { return page && page.dataset.strike ? JSON.parse(page.dataset.strike) : null } catch (e) { return null }
  }
  // the same wording as the phone (mpages/hit.js), so the list and the section never disagree
  function paintNums() {
    const d = strike()
    if (!d) return
    const set = (k, t) => { const el = q(`[data-ds-num="${k}"]`); if (el) el.textContent = t }
    set('kg', d.kg > d.bellKg ? `about ${d.kg} kg, ${d.past} past the bell` : d.kg === d.bellKg ? `about ${d.kg} kg, on the bell` : `about ${d.kg} kg`)
    set('change', !d.last || d.change === null ? 'First hit tonight' : d.same ? 'About the same as your last' : d.change > 0 ? `+${d.change} kg on your last` : `${-d.change} kg under your last`)
    set('best', !d.scanned || !d.best ? 'Scan to keep your best' : d.best.isNew ? 'This one, a new best' : `about ${d.best.kg} kg, ${d.best.where}`)
    set('band', `${d.bandLo} to ${d.bandHi} kg, ${String(d.band || '').toLowerCase()}`)
    set('kmh', d.kmhOk && d.kmh ? `about ${d.kmh} km/h` : 'Left out for this hit')
    set('reads', `${d.hand || 'Hand not read'}${d.stepped ? ', stepped in' : ''}`)
  }

  /* ------------------------------------------------------------ the page header and the credits chip */
  function paintHeader() {
    const h = q('[data-ds-hdr]'), out = q('[data-ds-hdrm]')
    if (!h || !out) return
    const t = h.querySelector('.m-title'), b = h.querySelector('.m-iconbtn')
    const tr = t.getBoundingClientRect(), br = b.getBoundingClientRect(), hr = h.getBoundingClientRect()
    if (!tr.height || !br.height) return
    const tc = tr.top + tr.height / 2, bc = br.top + br.height / 2
    h.style.setProperty('--ds-hdr-c', `${(tc - hr.top).toFixed(1)}px`)
    const d = Math.abs(tc - bc)
    out.textContent = d < 0.5 ? 'One centre line' : `Centres ${d.toFixed(1)} px apart`
  }
  function paintCredits() {
    const el = q('[data-ds-credits]')
    const n = window.punchApp ? Number(window.punchApp.credits) || 0 : 0
    if (el) el.textContent = n === 1 ? '1 credit' : `${n} credits`
  }

  /* ------------------------------------------------------------ the reel, full screen or as a grid */
  ds.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ds-reel]')
    if (!b || !window.showcase || !window.punchApp) return
    const grid = b.dataset.dsReel === 'grid'
    window.showcase.mode('mobile')
    window.punchApp.go('reel', grid ? {} : { full: true })
    // the grid through the reel's own switch, so the choice is kept as the viewer's
    if (grid) requestAnimationFrame(() => {
      const v = document.querySelector('.m-app [data-rview="grid"]')
      if (v && v.getAttribute('aria-pressed') !== 'true') v.click()
    })
  })

  /* ------------------------------------------------------------ the punch videos */
  const icon = (n) => (window.lucide ? window.lucide(n, { size: 16 }) : '')
  let vidsDone = false
  function videos() {
    if (vidsDone) return
    vidsDone = true
    const strip = q('[data-ds-videos]')
    if (!strip) return
    fetch('assets/video/lib/manifest.json').then((r) => r.json()).then((list) => {
      strip.innerHTML = list.map((e, i) => {
        const what = `${cap1(e.who)}, ${e.subject}`
        return `<li class="ds-vid">
          <button class="ds-vid-b" type="button" aria-pressed="false" aria-label="Play: ${esc(what)}" data-ds-vid="${i}">
            <img src="assets/video/lib/${esc(e.v_poster)}" alt="" loading="lazy" decoding="async" width="150" height="267" style="object-position:${esc(e.focal_v || '50% 50%')}">
            <span class="ds-vid-play" aria-hidden="true"><span class="ds-vid-i-play">${icon('play')}</span><span class="ds-vid-i-pause">${icon('pause')}</span></span>
          </button>
          <p class="ds-ph-s">${esc(cap1(e.subject))}</p>
          <p class="ds-ph-c"><a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.photographer)}</a>, ${esc(e.source || 'Pexels')}</p>
        </li>`
      }).join('')
      const secs = list.map((e) => e.duration).filter(Boolean)
      const lo = Math.floor(Math.min(...secs) * 10) / 10, hi = Math.ceil(Math.max(...secs) * 10) / 10
      const foot = q('[data-ds-vidfoot]')
      if (foot) foot.textContent = `${cap1(spell(list.length))} clips, all from Pexels under the Pexels License, each ${lo} to ${hi} seconds and cut twice: 720 × 1280 upright for the phone and 1080 × 1080 square for the glass. The photographer's name under each one links to the original. Clips with a legible brand, a logo or a tattoo were turned down.`
      const note = q('[data-ds-vidnote]')
      if (note) note.textContent = `${cap1(spell(list.length))} real punches, cut from licensed footage, for the reel on the phone and the Big score and New record on the glass. Press one to play it here.`
      strip.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-ds-vid]')
        if (!b) return
        const e = list[Number(b.dataset.dsVid)]
        const on = b.getAttribute('aria-pressed') === 'true'
        stopAll(b)
        if (on) { stop(b); return }
        let v = b.querySelector('video')
        if (!v) {
          v = document.createElement('video')
          v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'
          v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true')
          v.poster = `assets/video/lib/${e.v_poster}`
          v.src = `assets/video/lib/${e.v}`
          v.style.objectPosition = e.focal_v || '50% 50%'
          b.insertBefore(v, b.querySelector('.ds-vid-play'))
        }
        b.setAttribute('aria-pressed', 'true')
        b.setAttribute('aria-label', `Pause: ${cap1(e.who)}, ${e.subject}`)
        const p = v.play()
        if (p && p.catch) p.catch(() => {})
      })
      // out of view, or the design system put away: nothing keeps playing
      if ('IntersectionObserver' in window) new IntersectionObserver((en) => { if (!en[en.length - 1].isIntersecting) stopAll() }).observe(strip)
    }).catch(() => { strip.innerHTML = '<li class="ds-ph-none">The video library did not load.</li>' })
  }
  function stop(b) {
    const v = b.querySelector('video')
    if (v) { v.pause(); v.remove() }
    b.setAttribute('aria-pressed', 'false')
    b.setAttribute('aria-label', b.getAttribute('aria-label').replace(/^Pause: /, 'Play: '))
  }
  function stopAll(except) { qa('.ds-vid-b[aria-pressed="true"]').forEach((b) => { if (b !== except) stop(b) }) }

  /* ------------------------------------------------------------ start, and keep up */
  function paint() { if (!shown()) return; copyStrike(); paintNums(); paintHeader(); paintCredits() }
  function start() { videos(); paint() }
  if (document.readyState !== 'loading') setTimeout(start, 120)
  else document.addEventListener('DOMContentLoaded', () => setTimeout(start, 160))
  // hit.js redraws the section on these; the copy follows a frame later
  document.addEventListener('strike', () => requestAnimationFrame(() => { if (shown()) { copyStrike(); paintNums() } }))
  document.addEventListener('psec', (e) => {
    const d = e.detail || {}
    if (d.surface === 'phone' && d.page === 'hit' && d.sec === 'stats') requestAnimationFrame(() => { if (shown()) copyStrike() })
  })
  new MutationObserver(() => { if (shown()) requestAnimationFrame(paint); else stopAll() }).observe(stage, { attributes: true, attributeFilter: ['hidden'] })
  // the look changes the title's face and so its line box: measure again
  new MutationObserver(() => { if (shown()) requestAnimationFrame(paintHeader) }).observe(root, { attributes: true, attributeFilter: ['data-variant', 'data-appearance'] })
  if (document.fonts) document.fonts.ready.then(() => { if (shown()) paintHeader() })
  window.addEventListener('resize', () => { if (shown()) requestAnimationFrame(paintHeader) })
})()
