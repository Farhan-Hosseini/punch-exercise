/* Machine screen: the Big score (data-mscreen="score"), for the back of the queue at 3 m: the number as the event.
   Round seven rebuilt it from scratch. ONE frame (.bs) of four sections (psec.js), each with five designs chosen in
   Customise, every one drawn here from the hit on show (the fourth, Punch again, is static markup, parts/ms-again.html):
     Score          the number at the brief's full length (999,999.000, the decimals smaller) and whose hit it is:
                    Poster, Red field, Flap board, Scoreboard, Pole
     Why it counts  one reason to care, picked in this order: the crown this hit took from today's holder; the gap to
                    the next mark (a friend above in this run, the flip when the player leads it, the player's own best,
                    today's top ten, the next band, the machine's own mark), never more than 15% of the score away:
                    Statement, Versus, Measure, Band, Headline
     Video          round nine: "the hit is not an image, it's a video reel of the punch, which also autoplays". The
                    player's own clip from the punch video library (assets/video/lib), muted and looping, playing from
                    the section's beat while its design is on show and in view; reduced motion never plays it and the
                    poster (the strike frame) stands. The Loupe's glass and the outer Slices are canvases painted from
                    the one video on every frame it presents, so they never drift from it:
                    Bleed, Framed, Circle, Loupe, Slices
     Punch again    round nine: the next move, as on the Result, in its own section at the foot:
                    Full button, Button pair, Countdown, Code handoff, Big pad
   The hits are the example runs Your run shows (stats.js RUNS, the same people, scores and crown): Sara's 999,999.000
   (takes today's crown from Hamad), Karim's 412,380.250 (18,621 to pass Omar) and Karim's second hit, 449,621.000
   (he leads the run, Omar needs 18,621). showcase.mscreen('score', { run }) picks one; without it the screen takes the
   live score (opts.score, window.punchApp.score, the Result screen's) and the run whose hit is nearest, with the live
   score as this hit, exactly as Your run does, so the two screens never disagree.
   Motion: the number counts up in the Score section's design (through window.PunchFormat, so the decimals count too),
   lands (.is-landed), then the reason arrives, then the reel, then Punch again (.is-play with --sd on each section's shown design,
   .is-settled when the entrance is over). A change in Customise ("psec") replays that section alone. Reduced motion
   never adds .is-play: every design stands complete with the final number. Big type is fitted to its box in its own
   face (fitBox: the widest line and the block's height against the box, at a reference size), again when the look
   changes, a face loads, or a design is first shown. */
(() => {
  'use strict'
  const KEY = 'score'
  const root = document.querySelector(`.mscreen[data-mscreen="${KEY}"]`)
  const frame = root && root.querySelector('.bs')
  if (!frame) return

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const PF = () => window.PunchFormat
  const TOP = 999999, MAX = 999999.999
  const clamp = (n) => Math.max(0, Math.min(MAX, Number(n) || 0))
  const int = (n) => Math.round(n).toLocaleString('en-US')
  const txt = (n) => (PF() ? PF().score(n) : int(Math.floor(n)))
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const svgIcon = (name) => (window.lucide ? window.lucide(name) : '')
  const I = (name, cls) => `<span class="bs-ico${cls ? ' ' + cls : ''}" aria-hidden="true">${svgIcon(name)}</span>`
  const AVA = (p, cls) => `<img class="bs-ava${cls ? ' ' + cls : ''}" src="assets/app/avatars/${p.ava}.jpg" alt="" width="256" height="256" decoding="async">`
  const sr = (s) => `<p class="sr-only">${esc(s)}</p>`

  /* ------------------------------------------------------------ this machine today (as stats.js has it) */
  const BANDS = [
    { name: 'Warm-up', from: 0 }, { name: 'Solid', from: 200000 }, { name: 'Thunder', from: 450000 },
    { name: 'Monster', from: 700000 }, { name: 'Bell', from: 900000 },
  ]
  const bandAt = (s) => { let i = BANDS.length - 1; while (i > 0 && s < BANDS[i].from) i--; return i }
  // a score's height on the column: each band a fifth, the score placed within its band
  function height(s) {
    s = clamp(s)
    const i = bandAt(s), lo = BANDS[i].from, hi = i < BANDS.length - 1 ? BANDS[i + 1].from : MAX
    return Math.min(1, (i + Math.min(1, (s - lo) / (hi - lo))) / BANDS.length)
  }
  const CROWN = { name: 'Hamad', ava: 'hamad', best: 874310.662, since: 'lunch' }
  const TOPTEN = 812400, IMPROVE = .045

  /* ------------------------------------------------------------ the example runs */
  // round nine: the hit is a reel, each player's own clip from the punch video library (assets/video/lib/manifest.json,
  // the player matched by who is in it): Sara is the young woman working the heavy bag against a hard backlight
  // (bag-backlit, her hair tied back as in her face); Karim the young man punching straight at the lens (gloves-pov) for
  // his first hit, and the young man shadowboxing shot from the floor (shadow-low) for his second, so the second hit is
  // not his first one's reel (bag-dark, the young man on the heavy bag, read too dark on the glass). The square cut (NAME-sq.mp4, 1080 x 1080, the rooms here are near square),
  // framed at the manifest's focal_sq; its poster is the strike frame. fist is where the strike lands in that frame (the
  // point the Loupe magnifies), as shares of it
  const LIB = 'assets/video/lib/'
  const REELS = {
    sara: { clip: 'bag-backlit', pos: '50% 50%', fist: [.71, .56], zoom: 1.6, lens: 'Contact', alt: 'Sara drives her right hand into the heavy bag against the light' },
    karim: { clip: 'gloves-pov', pos: '55% 65%', fist: [.88, .7], zoom: 1.3, lens: 'At full speed', alt: 'Karim punches straight at the camera' },
    karim2: { clip: 'shadow-low', pos: '50% 60%', fist: [.5, .34], zoom: 1.5, lens: 'At full speed', alt: 'Karim throws his punches over the camera, shot from the floor' },
  }
  const SARA = { key: 'sara', name: 'Sara', ava: 'sara' }, KARIM = { key: 'karim', name: 'Karim', ava: 'karim' }
  const RUNS = {
    sara: { you: SARA, hits: [931440.482, 999999], others: [{ name: 'Yousef', ava: 'yusuf', best: 742118.406 }, { name: 'Mira', ava: 'maya', best: 538660.215 }], reel: REELS.sara },
    karim: { you: KARIM, hits: [412380.25], others: [{ name: 'Lina', ava: 'lina', best: 356420.75 }, { name: 'Omar', ava: 'omar', best: 431000.5 }], reel: REELS.karim },
    lead: { you: KARIM, hits: [412380.25, 449621], others: [{ name: 'Lina', ava: 'lina', best: 371208.064 }, { name: 'Omar', ava: 'omar', best: 431000.5 }], reel: REELS.karim2 },
  }
  const gapUp = (d) => Math.max(1, Math.ceil(d - 1e-6))

  // the one reason to care, and the words every design needs for it
  function reason(hit, prevBest, others) {
    const near = (g) => g <= .15 * hit
    let t = null
    if (hit >= CROWN.best) t = { kind: 'crown', icon: 'crown', other: CROWN, mark: CROWN.best }
    if (!t) {
      const above = others.filter((p) => p.best > hit).sort((a, b) => a.best - b.best)[0]
      if (above && near(above.best - hit)) t = { kind: 'person', icon: 'target', other: above, gap: gapUp(above.best - hit), mark: above.best }
      if (!t && !above) {
        const below = others.filter((p) => p.best <= hit).sort((a, b) => b.best - a.best)[0]
        if (below && near(hit - below.best)) t = { kind: 'flip', icon: 'trending-up', other: below, gap: gapUp(hit - below.best), mark: below.best }
      }
      if (!t && prevBest > hit && near(prevBest - hit)) t = { kind: 'own', icon: 'history', gap: gapUp(prevBest - hit), mark: prevBest }
      if (!t && TOPTEN > hit && near(TOPTEN - hit)) t = { kind: 'topten', icon: 'trophy', gap: gapUp(TOPTEN - hit), mark: TOPTEN }
      const edge = BANDS[bandAt(hit) + 1]
      if (!t && edge && near(edge.from - hit)) t = { kind: 'tier', icon: 'chevrons-up', band: edge.name, gap: gapUp(edge.from - hit), mark: edge.from }
      if (!t) { const g = Math.ceil(hit * IMPROVE / 10) * 10; t = { kind: 'machine', icon: 'target', gap: g, mark: hit + g } }
    }
    const o = t.other && t.other.name
    Object.assign(t, {
      crown: { verb: 'New', obj: 'crown', head: 'New crown', figWords: '', line: `Today’s best on this machine. ${o} held it since ${CROWN.since}`, markName: o, vsWord: 'Takes the crown' },
      person: { verb: 'Pass', obj: o, head: `${int(t.gap)} to pass ${o}`, figWords: `to pass ${o}`, line: `${o} is the next mark above you in this run`, markName: o, vsWord: 'to pass' },
      flip: { verb: 'Leads', obj: 'the run', head: 'Leads the run', figWords: `for ${o} to pass you`, line: `${o} needs ${int(t.gap)} to pass you`, markName: o, vsWord: 'to pass' },
      own: { verb: 'Pass', obj: 'your best', head: `${int(t.gap)} to pass your best`, figWords: 'to pass your best', line: 'Your best so far in this run', markName: 'Your best', vsWord: 'to pass' },
      topten: { verb: 'Make', obj: 'the top ten', head: `${int(t.gap)} to make the top ten`, figWords: 'to make the top ten', line: 'Today’s top ten on this machine', markName: 'Top ten', vsWord: 'to make it' },
      tier: { verb: 'Reach', obj: t.band, head: `${int(t.gap)} to reach ${t.band}`, figWords: `to reach ${t.band}`, line: 'The next band up on this machine', markName: t.band, vsWord: 'to reach' },
      machine: { verb: 'Beat', obj: 'this', head: `${int(t.gap)} to the next mark`, figWords: 'to the next mark', line: 'Set by the machine for your next go', markName: 'Next mark', vsWord: 'to beat' },
    }[t.kind])
    return t
  }

  function model(runKey, hitOverride) {
    const run = RUNS[runKey]
    const hits = hitOverride != null ? [...run.hits.slice(0, -1), hitOverride] : run.hits.slice()
    const hit = clamp(hits[hits.length - 1])
    const prevBest = hits.length > 1 ? Math.max(...hits.slice(0, -1)) : 0
    const why = reason(hit, prevBest, run.others)
    const say = why.kind === 'crown' ? `New crown: today’s best on this machine, taken from ${why.other.name}`
      : why.kind === 'flip' ? `Leads the run: ${why.other.name} needs ${int(why.gap)} to pass`
        : why.head
    return { runKey, you: run.you, hit, prevBest, why, reel: run.reel, f: height(hit), band: BANDS[bandAt(hit)].name, bell: hit >= TOP, say }
  }
  function liveScore(opts) {
    const given = Number(opts.score)
    if (opts.score != null && Number.isFinite(given)) return clamp(given)
    const app = window.punchApp && Number(window.punchApp.score)
    if (Number.isFinite(app) && window.punchApp.score != null) return clamp(app)
    const res = document.querySelector('#screenContent [data-bind="score"]')
    const read = res && parseFloat(res.textContent.replace(/,/g, ''))
    return Number.isFinite(read) ? clamp(read) : TOP
  }
  // the run on show: the one asked for, else the one nearest the live score, with that score as this hit
  function choose(opts) {
    if (opts.run && RUNS[opts.run]) return model(opts.run, null)
    const live = liveScore(opts)
    let best = null
    for (const k of Object.keys(RUNS)) {
      const h = RUNS[k].hits[RUNS[k].hits.length - 1], d = Math.abs(h - live)
      if (!best || d < best.d) best = { k, d }
    }
    return model(best.k, best.d < .0005 ? null : live)
  }

  /* ------------------------------------------------------------ the number, as groups the designs lay out */
  // n drawn in the target's shape: the target's thousands groups, the digits still to come as dim zeros (an odometer
  // shows them so), the decimals at the end; so a count never changes the layout
  function parts(n, target) {
    const T = txt(target), dT = T.indexOf('.')
    const lens = (dT < 0 ? T : T.slice(0, dT)).split(',').map((g) => g.length)
    const total = lens.reduce((a, b) => a + b, 0)
    const t = txt(Math.min(n, target)), d = t.indexOf('.')
    const digs = (d < 0 ? t : t.slice(0, d)).replace(/,/g, '')
    const lit = Math.min(digs.length, total), dimN = total - lit
    const padded = '0'.repeat(dimN) + digs.slice(-total)
    let at = 0
    const groups = lens.map((len, i) => {
      const s = padded.slice(at, at + len), dim = Math.max(0, Math.min(len, dimN - at))
      at += len
      return { s, dim, comma: i < lens.length - 1 }
    })
    return { groups, dec: d < 0 ? '' : t.slice(d + 1) }
  }
  // one group as text with its dim digits wrapped; its comma dims with it
  const groupHTML = (g) => {
    const c = g.comma ? '<span class="bs-c">,</span>' : ''
    if (!g.dim) return g.s + c
    if (g.dim === g.s.length) return `<span class="bs-z">${g.s}${c}</span>`
    return `<span class="bs-z">${g.s.slice(0, g.dim)}</span>${g.s.slice(g.dim)}${c}`
  }
  // a stack of lines, one per group, the decimals on a line of their own at the .dec size. The comma keeps a column of
  // its own: every other line ends in an unseen one, so the digits line up whichever side the stack is set to (set
  // right, a comma would otherwise hang over the next line's last digit)
  const GHOST = '<span class="bs-c is-ghost" aria-hidden="true">,</span>'
  const lineHTML = (g, ghost) => groupHTML(g) + (ghost && !g.comma ? GHOST : '')
  const decHTML = (dec, ghost) => (dec ? `.${dec}${ghost ? GHOST : ''}` : '')
  const stackHTML = (m) => {
    const p = parts(m.hit, m.hit), ghost = p.groups.length > 1
    return `<div class="bs-num" data-lines aria-hidden="true">${p.groups.map((g, i) => `<p class="bs-line" data-g="${i}">${lineHTML(g, ghost)}</p>`).join('')}${p.dec ? `<p class="bs-line bs-decl" data-dec>${decHTML(p.dec, ghost)}</p>` : ''}</div>`
  }
  function paintStack(el, n, target) {
    const p = parts(n, target), ghost = p.groups.length > 1
    el.querySelectorAll('[data-g]').forEach((line) => { const g = p.groups[+line.dataset.g]; if (g) line.innerHTML = lineHTML(g, ghost) })
    const dec = el.querySelector('[data-dec]')
    if (dec) dec.innerHTML = decHTML(p.dec, ghost)
  }
  const scoreSay = (m) => `${m.you.name}, ${txt(m.hit)}. ${m.say}.`

  /* ------------------------------------------------------------ fitting */
  // a box and the block in it: the block is set at --F 100px, its widest line and its height measured in layout
  // pixels (the glass's own, whatever the zoom), and --F set so it fills the box; data-cap caps the cap height (px)
  function fitBox(box) {
    const inner = box.firstElementChild
    if (!inner) return
    const W = box.clientWidth, H = box.clientHeight
    if (!W) return
    inner.style.setProperty('--F', '100px')
    let w = 0
    // a block of lines (data-lines) is as wide as its widest line; a single line is measured whole
    const lines = inner.hasAttribute('data-lines') ? [...inner.children].filter((c) => !c.hidden && c.offsetWidth) : [inner]
    for (const c of lines) w = Math.max(w, c.offsetWidth)
    const h = inner.offsetHeight
    if (!w) return
    let k = W / w
    if (box.dataset.fitbox !== 'w' && H && h) k = Math.min(k, H / h)
    let F = 100 * k * .985
    const capPx = parseFloat(box.dataset.cap)
    if (capPx) F = Math.min(F, capPx / (parseFloat(getComputedStyle(inner).getPropertyValue('--cap')) || .8))
    inner.style.setProperty('--F', `${Math.max(10, Math.floor(F))}px`)
  }
  function fit(el) {
    if (!el || !el.offsetWidth) return
    el.querySelectorAll('[data-fitbox]').forEach(fitBox)
    const f = FIT[kind(el)]
    if (f) f(el)
  }
  const fitShown = () => secs().forEach((sec) => fit(shown(sec)))

  /* ------------------------------------------------------------ Score designs */
  const S = {}
  // Poster: type alone, left. The name and face at the top, then the number stacked a group a line, as large as the
  // glass is wide; the decimals under it, smaller
  S['bs-poster'] = {
    render: (m) => `
      <div class="bs-who">${AVA(m.you)}<div class="bs-who-n" data-fitbox="w" data-cap="118"><p class="bs-name">${esc(m.you.name)}</p></div></div>
      <div class="bs-numbox" data-fitbox>${stackHTML(m)}</div>${sr(scoreSay(m))}`,
    paint: paintStack,
  }
  // Red field: the room a field of the strike colour to the glass's edges, the number cut out of it (set in the
  // ground's colour) and set right, the name signed at its foot
  S['bs-field'] = {
    render: (m) => `
      <div class="bs-field-in">
        <div class="bs-numbox" data-fitbox>${stackHTML(m)}</div>
        <div class="bs-sign">${AVA(m.you)}<div class="bs-sign-n" data-fitbox="w" data-cap="104"><p class="bs-name">${esc(m.you.name)}</p></div><img class="bs-sign-mark" data-logo-img src="assets/logos/fist-circle.svg" alt="" width="96" height="96"></div>
      </div>${sr(scoreSay(m))}`,
    paint: paintStack,
    delay: 520,
  }
  // Flap board: a split-flap board, the name on a row of letter tiles, the number a group a row (rows right-set, blank
  // tiles before a short group), the decimals on small tiles; the tiles flap as the number lands
  // a comma drawn for the board and the marquee: a dot and its tail
  const COMMA = '<svg viewBox="0 0 22 40" aria-hidden="true" focusable="false"><path d="M11 1a10 10 0 0 1 10 10c0 11-6 21-14 28l-4-3.5c4-4 7-9 7.5-14.8A10 10 0 0 1 11 1z"/></svg>'
  const tiles = (s, len, cls) => {
    const pad = Math.max(0, len - s.length)
    return Array.from({ length: pad }, () => `<span class="bs-tile is-blank${cls ? ' ' + cls : ''}"><b></b></span>`).join('')
      + [...s].map((ch, i) => `<span class="bs-tile${cls ? ' ' + cls : ''}" style="--i: ${pad + i}"><b>${esc(ch)}</b></span>`).join('')
  }
  S['bs-flap'] = {
    render: (m) => {
      const p = parts(m.hit, m.hit)
      const rows = p.groups.map((g, i) => `<div class="bs-flap-row" data-g="${i}">${tiles(g.s, 3)}<span class="bs-flap-sep">${g.comma ? `<i class="bs-comma">${COMMA}</i>` : ''}</span></div>`).join('')
      const name = m.you.name.toUpperCase()
      return `
        <div class="bs-flap-name" style="--n: ${name.length}" aria-hidden="true">${tiles(name, name.length, 'is-letter')}</div>
        <div class="bs-board" aria-hidden="true">${rows}${p.dec ? `<div class="bs-flap-dec"><span class="bs-flap-pt"><i></i></span>${tiles(p.dec, 3, 'is-dec')}</div>` : ''}</div>${sr(scoreSay(m))}`
    },
    paint(el, n, target) {
      const p = parts(n, target)
      el.querySelectorAll('.bs-flap-row').forEach((row) => {
        const g = p.groups[+row.dataset.g]
        if (!g) return
        const cells = [...row.querySelectorAll('.bs-tile:not(.is-blank)')]
        cells.forEach((c, i) => { c.firstElementChild.textContent = g.s[i] || ''; c.classList.toggle('is-z', i < g.dim) })
      })
      const dec = [...el.querySelectorAll('.bs-tile.is-dec')]
      dec.forEach((c, i) => { c.firstElementChild.textContent = p.dec[i] || '' })
    },
    delay: 420,
    dur: 2000,
  }
  // Scoreboard: an arcade marquee. Seven-segment digits in a black panel ringed with bulbs, the unlit segments showing
  // faintly as they do on a real board; the bulbs chase while the number counts and all light when it lands; the name
  // runs on the strip at the foot
  const SEG = (() => {
    const t = 18, W = 100, H = 184, g = 3.5
    const hz = (y, x1, x2) => `${x1},${y} ${x1 + t / 2},${y - t / 2} ${x2 - t / 2},${y - t / 2} ${x2},${y} ${x2 - t / 2},${y + t / 2} ${x1 + t / 2},${y + t / 2}`
    const vt = (x, y1, y2) => `${x},${y1} ${x + t / 2},${y1 + t / 2} ${x + t / 2},${y2 - t / 2} ${x},${y2} ${x - t / 2},${y2 - t / 2} ${x - t / 2},${y1 + t / 2}`
    const L = t / 2, R = W - t / 2, T = t / 2, M = H / 2, B = H - t / 2
    return {
      a: hz(T, L + g, R - g), b: vt(R, T + g, M - g), c: vt(R, M + g, B - g), d: hz(B, L + g, R - g),
      e: vt(L, M + g, B - g), f: vt(L, T + g, M - g), g: hz(M, L + g, R - g),
    }
  })()
  const LIT = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' }
  const segDigit = (cls) => `<svg class="bs-seg${cls ? ' ' + cls : ''}" viewBox="-14 -2 128 188" aria-hidden="true" focusable="false"><g transform="skewX(-5)">${Object.keys(SEG).map((k) => `<polygon data-s="${k}" points="${SEG[k]}"/>`).join('')}</g></svg>`
  const setSeg = (svg, ch, dim) => {
    const on = LIT[ch] || ''
    svg.classList.toggle('is-z', !!dim)
    svg.querySelectorAll('polygon').forEach((p) => p.classList.toggle('on', on.includes(p.dataset.s)))
  }
  const BULBS = 44
  // a bulb's place on the panel's rim, walking round it from the top left (the panel is the room, 904 by 1480, less
  // the rim's inset), in shares of the rim's box
  const bulbAt = (i) => {
    const w = 844, h = 1420, t = ((i + .5) / BULBS) * 2 * (w + h)
    const [x, y] = t < w ? [t, 0] : t < w + h ? [w, t - w] : t < 2 * w + h ? [w - (t - w - h), h] : [0, h - (t - 2 * w - h)]
    return [(x / w * 100).toFixed(2), (y / h * 100).toFixed(2)]
  }
  S['bs-led'] = {
    render: (m) => {
      const p = parts(m.hit, m.hit)
      const rows = p.groups.map((g, i) => `<div class="bs-led-row" data-g="${i}">${Array.from({ length: 3 }, (_, k) => segDigit(k < 3 - g.s.length ? 'is-blank' : '')).join('')}<span class="bs-led-sep">${g.comma ? `<i class="bs-led-comma">${COMMA}</i>` : ''}</span></div>`).join('')
      const bulbs = Array.from({ length: BULBS }, (_, i) => { const [x, y] = bulbAt(i); return `<i style="left: ${x}%; top: ${y}%"></i>` }).join('')
      return `
        <div class="bs-led-panel" aria-hidden="true">
          <div class="bs-bulbs">${bulbs}</div>
          <div class="bs-led-in">
            <div class="bs-led-rows">${rows}${p.dec ? `<div class="bs-led-dec"><i class="bs-led-pt"></i>${segDigit('is-dec')}${segDigit('is-dec')}${segDigit('is-dec')}</div>` : ''}</div>
            <div class="bs-led-strip"><span class="bs-led-lamp"></span><div class="bs-led-n" data-fitbox="w" data-cap="92"><p class="bs-name">${esc(m.you.name)}</p></div></div>
          </div>
        </div>${sr(scoreSay(m))}`
    },
    paint(el, n, target) {
      const p = parts(n, target)
      el.querySelectorAll('.bs-led-row').forEach((row) => {
        const g = p.groups[+row.dataset.g]
        if (!g) return
        const cells = [...row.querySelectorAll('.bs-seg:not(.is-blank)')]
        cells.forEach((c, i) => setSeg(c, g.s[i], i < g.dim))
      })
      el.querySelectorAll('.bs-seg.is-dec').forEach((c, i) => setSeg(c, p.dec[i]))
    },
    // the bulbs chase round the panel while the count runs: a lit run travelling with the count, and every eleventh
    // bulb with it; all of them light when the number lands (CSS, once .is-counting goes)
    progress(el, k) {
      const pos = Math.floor(k * BULBS * 2.5) % BULBS
      el.querySelectorAll('.bs-bulbs i').forEach((b, i) => b.classList.toggle('on', (i - pos + BULBS) % BULBS < 9 || i % 11 === pos % 11))
    },
    delay: 360,
    dur: 2000,
  }
  // Pole: the machine's own strength tester. The column rises with the count to this hit's height (each band a fifth,
  // as on the machine) and rings the bell at the top of the scale; the number hangs off the puck on a line, set to the
  // right of the column, the name above it
  S['bs-pole'] = {
    render: (m) => `
      <div class="bs-pole-col" aria-hidden="true">
        <span class="bs-bell">${svgIcon('bell-ring')}</span>
        <div class="bs-tube"><i class="bs-tube-fill"></i>${BANDS.slice(1).map((b, i) => `<i class="bs-tube-tick" style="--at: ${(i + 1) / BANDS.length}"></i>`).join('')}<i class="bs-puck"></i></div>
      </div>
      <i class="bs-pole-ptr" aria-hidden="true" style="--charge: ${m.f.toFixed(4)}"></i>
      <div class="bs-pole-side">
        <div class="bs-pole-n" data-fitbox="w" data-cap="118"><p class="bs-name">${esc(m.you.name)}</p></div>
        <p class="bs-pole-band" aria-hidden="true">${I(m.bell ? 'bell-ring' : 'chevrons-up')}${esc(m.bell ? 'Rang the bell' : `${m.band} band`)}</p>
        <div class="bs-numbox" data-fitbox>${stackHTML(m)}</div>
      </div>${sr(`${scoreSay(m)} ${m.bell ? 'It rang the bell.' : `In ${m.band} on the column.`}`)}`,
    paint: paintStack,
    progress(el, k, n) {
      el.style.setProperty('--charge', height(n).toFixed(4))
      if (k < 1) el.classList.remove('is-full')
    },
    land(el) { el.classList.toggle('is-full', !!(open && open.m.bell)) },
    delay: 380,
    dur: 2100,
  }

  /* ------------------------------------------------------------ Why it counts */
  const W = {}
  // the badge for the reason: a face when it is about a person, the reason's own icon otherwise
  const badge = (t, cls) => (t.other && t.kind === 'person' ? `<span class="bs-badge is-face${cls ? ' ' + cls : ''}">${AVA(t.other)}${I(t.icon, 'bs-badge-chip')}</span>`
    : `<span class="bs-badge${t.kind === 'crown' ? ' is-taken' : ''}${cls ? ' ' + cls : ''}">${I(t.icon)}</span>`)
  const fig = (t) => `<span class="bs-fig">${int(t.gap)}</span>`
  const headHTML = (t) => (t.kind === 'crown' ? `<p class="bs-head is-taken">${esc(t.head)}</p>`
    : t.kind === 'flip' ? `<p class="bs-head">${esc(t.head)}</p>`
      : `<div class="bs-head-stack" data-lines><p class="bs-head">${fig(t)}</p><p class="bs-head bs-head-sub">${esc(t.figWords)}</p></div>`)
  // Statement: the badge, the reason as a line of display type, and one plain line under it
  W['bs-state'] = {
    render: (m) => {
      const t = m.why
      return `${badge(t)}
        <div class="bs-state-text">
          <div class="bs-state-h" data-fitbox="w" data-cap="${t.kind === 'crown' || t.kind === 'flip' ? 150 : 128}">${headHTML(t)}</div>
          <p class="bs-line-s">${esc(t.line)}</p>
        </div>${sr(m.say)}`
    },
  }
  // Versus: two people and what passes between them. The crown moves from the holder to this hit; the gap runs from
  // the player up to the friend above, or from the friend below up to the player who leads
  W['bs-vs'] = {
    render: (m) => {
      const t = m.why, you = m.you
      const side = (p, cls, word) => `<div class="bs-vs-p ${cls}">${p.ava ? AVA(p) : `<span class="bs-badge">${I(t.icon)}</span>`}<div class="bs-vs-nb" data-fitbox="w" data-cap="54"><p class="bs-vs-n">${esc(p.name)}</p></div><p class="bs-vs-k">${esc(word)}</p></div>`
      const other = t.other || { name: t.markName }
      const pair = t.kind === 'crown' ? [side(other, 'is-was', `Since ${CROWN.since}`), side(you, 'is-you is-crowned', 'New crown')]
        : t.kind === 'flip' ? [side(other, 'is-them', 'Chasing'), side(you, 'is-you', 'Leads the run')]
          : [side(you, 'is-you', 'This hit'), side(other, 'is-them', { person: 'Next above', own: 'This run', topten: 'Today', tier: 'Next band', machine: 'By the machine' }[t.kind] || 'The mark')]
      const mid = t.kind === 'crown'
        ? `<p class="bs-vs-crown">${I('crown')}</p><p class="bs-vs-w is-taken">Takes the crown</p>`
        : `<p class="bs-vs-fig">${int(t.gap)}</p><p class="bs-vs-w">${esc(t.vsWord)}</p>`
      return `${pair[0]}<div class="bs-vs-mid"><div class="bs-vs-over">${mid}</div><i class="bs-vs-arrow" aria-hidden="true"></i></div>${pair[1]}${sr(m.say)}`
    },
  }
  // Measure: a stretch of the machine's scale between the two marks, the lower on the left, the gap bracketed over it
  W['bs-ruler'] = {
    render: (m) => {
      const t = m.why, you = m.you
      const other = t.other || { name: t.markName }
      const youHigh = t.kind === 'crown' || t.kind === 'flip'
      const lo = youHigh ? other : you, hi = youHigh ? you : other
      const mark = (p, at, cls) => `<div class="bs-mk ${cls}" style="--at: ${at}"><span class="bs-mk-face">${p.ava ? AVA(p) : I(t.icon)}${cls.includes('is-top') && t.kind === 'crown' ? I('crown', 'bs-mk-crown') : ''}</span><i class="bs-mk-tick"></i><div class="bs-mk-nb" data-fitbox="w" data-cap="50"><p class="bs-mk-n">${esc(p.name)}</p></div></div>`
      const label = t.kind === 'crown' ? `<p class="bs-br-w is-taken">${I('crown')}<span>New crown</span></p>` : `<p class="bs-br-w"><span class="bs-br-fig">${int(t.gap)}</span><span>${esc(t.figWords)}</span></p>`
      const ticks = Array.from({ length: 25 }, (_, i) => `<i style="--at: ${i / 24}"></i>`).join('')
      return `<div class="bs-rule" aria-hidden="true">
          <div class="bs-rule-ticks">${ticks}</div>
          ${mark(lo, .16, `is-lo${lo === you ? ' is-you' : ''}`)}${mark(hi, .84, `is-top${hi === you ? ' is-you' : ''}`)}
          <div class="bs-br">${label}<i class="bs-br-line"></i></div>
        </div>${sr(m.say)}`
    },
  }
  // Band: a band of colour to the glass's edges with the reason in it at display size; the plain line under it.
  // The crown floods it the same red
  W['bs-band'] = {
    render: (m) => {
      const t = m.why
      const inBand = t.kind === 'crown' ? `<p class="bs-band-h">${esc(t.head)}</p>`
        : t.kind === 'flip' ? `<p class="bs-band-h">${esc(t.head)}</p>`
          : `<p class="bs-band-h">${int(t.gap)} <span class="bs-band-w">${esc(t.figWords)}</span></p>`
      return `<div class="bs-band-bar${t.kind === 'crown' ? ' is-taken' : ''}">${I(t.icon, 'bs-band-ico')}<div class="bs-band-box" data-fitbox data-cap="190">${inBand}</div></div>
        <p class="bs-line-s bs-band-line">${esc(t.line)}</p>${sr(m.say)}`
    },
  }
  // Headline: the reason in two words, one above the other, as large as the width allows; the figure or the plain line
  // in a strip at the foot
  W['bs-words'] = {
    render: (m) => {
      const t = m.why
      const foot = t.kind === 'crown' || t.kind === 'flip'
        ? `<p class="bs-line-s">${esc(t.line)}</p>`
        : `<p class="bs-words-fig"><span class="bs-fig">${int(t.gap)}</span><span class="bs-line-s">${esc(t.kind === 'machine' ? 'more to go' : 'to go')}</span></p>`
      return `<div class="bs-words-box" data-fitbox><div data-lines class="bs-words-in${t.kind === 'crown' ? ' is-crown' : ''}"><p>${esc(t.verb)}</p><p>${esc(t.obj)}</p></div></div>
        <div class="bs-words-foot">${I(t.icon, 'bs-words-ico')}${foot}</div>${sr(m.say)}`
    },
  }

  /* ------------------------------------------------------------ Video: the strike as a reel */
  const P = {}
  // the reel: muted, looping, inline, the poster (the strike frame) first and only the metadata loaded until it plays;
  // it never autoplays by attribute, reels() plays it from the section's beat while its design is on show
  const vid = (r, cls) => `<video class="bs-img bs-vid${cls ? ' ' + cls : ''}" src="${LIB}${r.clip}-sq.mp4" poster="${LIB}${r.clip}-sq.jpg" width="1080" height="1080" muted loop playsinline disablepictureinpicture disableremoteplayback preload="metadata" aria-label="${esc(r.alt)}" style="--pos: ${r.pos}"></video>`
  // a canvas that shows part of the reel, painted from the design's one video (mirror below)
  const cv = (cls, i) => `<canvas class="bs-cv${cls ? ' ' + cls : ''}"${i != null ? ` data-i="${i}"` : ''} aria-hidden="true"></canvas>`
  const tag = (icon, words, cls) => `<p class="bs-tag${cls ? ' ' + cls : ''}">${I(icon)}${esc(words)}</p>`
  // Bleed: the reel to the glass's edges
  P['bs-bleed'] = { render: (m) => `<figure class="bs-fig-box">${vid(m.reel)}</figure>${tag('circle-play', 'Replay')}` }
  // Framed: a level print on the gutters, the caption on its paper
  P['bs-framed'] = {
    render: (m) => `<figure class="bs-print"><div class="bs-print-img">${vid(m.reel)}</div>
      <figcaption class="bs-print-cap">${I('film')}<span class="bs-print-t">The strike that did it</span><span class="bs-print-src">From the replay camera</span></figcaption></figure>`,
  }
  // Circle: the reel in a round window that runs off the glass's left edge, ringed in the strike colour
  P['bs-circle'] = { render: (m) => `<figure class="bs-disc">${vid(m.reel)}</figure>${tag('circle-play', 'Replay', 'is-right')}` }
  // Loupe: the reel on the gutters, and a round glass that magnifies the spot where the fist lands; the glass is a
  // canvas painted from the reel, so the fist arrives in it on the very frame it arrives in the reel
  P['bs-loupe'] = {
    render: (m) => `<figure class="bs-fig-box bs-loupe-main">${vid(m.reel)}</figure>
      <i class="bs-loupe-ring" aria-hidden="true"></i><i class="bs-loupe-lead" aria-hidden="true"></i>
      <div class="bs-loupe-glass" aria-hidden="true">${cv('bs-loupe-cv')}</div>${tag('crosshair', m.reel.lens || 'Contact', 'is-loupe')}`,
  }
  // Slices: the reel cut into three, the middle slice knocked up by the hit and printed in the strike colour; the
  // middle is the video itself, the outer two canvases painted from it
  P['bs-slices'] = {
    render: (m) => `<figure class="bs-slice-set">${[0, 1, 2].map((i) => `<div class="bs-slice" style="--i: ${i}">${i === 1 ? vid(m.reel) : cv('bs-slice-cv', i)}</div>`).join('')}</figure>${tag('circle-play', 'Replay')}`,
  }

  // the reel's canvases: FIT sets el._paint(source, width, height) for the design's geometry; mirror paints it from the
  // design's video on every frame the video presents (requestVideoFrameCallback, or the frame loop), and from the
  // poster while the video has not played (so the glass and the slices show the strike frame the video shows)
  function mirror(el) {
    const v = el.querySelector('video')
    if (!v || !el._paint) return
    const draw = () => {
      if (!el._paint || !v.isConnected) return
      if (v.readyState >= 2 && v.played.length && v.videoWidth) { el._paint(v, v.videoWidth, v.videoHeight); return }
      const p = v._poster || (v._poster = Object.assign(new Image(), { src: v.poster }))
      if (p.complete && p.naturalWidth) el._paint(p, p.naturalWidth, p.naturalHeight)
      else p.addEventListener('load', draw, { once: true })
    }
    draw()
    if (v._mirror) return
    v._mirror = true
    ;['loadeddata', 'seeked', 'playing', 'pause'].forEach((t) => v.addEventListener(t, draw))
    if (v.requestVideoFrameCallback) { const cb = () => { if (!v.isConnected) return; draw(); v.requestVideoFrameCallback(cb) }; v.requestVideoFrameCallback(cb) }
    else { const tick = () => { if (!v.isConnected) return; if (!v.paused) draw(); requestAnimationFrame(tick) }; requestAnimationFrame(tick) }
  }
  // a canvas's backing store at the size it is laid out (glass pixels, whatever the zoom)
  const size = (c, w, h) => { const W = Math.max(1, Math.round(w)), H = Math.max(1, Math.round(h)); if (c.width !== W) c.width = W; if (c.height !== H) c.height = H }

  /* ------------------------------------------------------------ fitting a design's own geometry */
  const FIT = {}
  // the loupe: where the fist lands in the reel as it is cropped (object-fit: cover at --pos), the ring on it, the glass
  // opposite it magnifying the same spot, and the lead between them
  FIT['bs-loupe'] = (el) => {
    const m = open && open.m
    if (!m) return
    const box = el.querySelector('.bs-loupe-main'), c = el.querySelector('.bs-loupe-cv')
    const Wb = box ? box.clientWidth : 0, Hb = box ? box.clientHeight : 0
    if (!Wb || !c) return
    const r = m.reel, VW = 1080, VH = 1080
    const s = Math.max(Wb / VW, Hb / VH), iw = VW * s, ih = VH * s
    const [px, py] = r.pos.split(' ').map((v) => parseFloat(v) / 100)
    const ox = (Wb - iw) * px, oy = (Hb - ih) * py
    const fx = ox + r.fist[0] * iw, fy = oy + r.fist[1] * ih
    const D = Math.round(Math.min(460, Wb * .5, Hb * .62)), R = D / 2, Z = r.zoom || 1.6
    // the glass sits low on the side away from the fist, overlapping the reel's lower edge
    const gx = r.fist[0] > .5 ? 36 + R : Wb - 36 - R, gy = Hb - R - 36
    el.style.setProperty('--fx', `${fx.toFixed(1)}px`); el.style.setProperty('--fy', `${fy.toFixed(1)}px`)
    el.style.setProperty('--gx', `${gx.toFixed(1)}px`); el.style.setProperty('--gy', `${gy.toFixed(1)}px`); el.style.setProperty('--gd', `${D}px`)
    size(c, D, D)
    // the glass shows the frame round the fist Z times larger than the reel shows it
    el._paint = (src, w, h) => {
      const g = c.getContext('2d'), k = w / VW, rr = (R / (s * Z)) * k
      g.fillStyle = '#0B0B0C'; g.fillRect(0, 0, c.width, c.height)
      g.drawImage(src, r.fist[0] * w - rr, r.fist[1] * h - rr, 2 * rr, 2 * rr, 0, 0, c.width, c.height)
    }
    mirror(el)
    // the tag names what the glass shows: over the glass, unless the ring is there (a fist high in the frame), then
    // in the first top corner clear of the ring
    const tag = el.querySelector('.bs-tag.is-loupe')
    if (tag && tag.offsetWidth) {
      const tw = tag.offsetWidth, th = tag.offsetHeight
      const clear = ([x, y]) => {
        const nx = Math.max(x, Math.min(fx, x + tw)), ny = Math.max(y, Math.min(fy, y + th))
        return Math.hypot(fx - nx, fy - ny) > 66 + 24 && x >= 0 && x + tw <= Wb
      }
      const spots = [[gx - R + 20, gy - R - 36 - th], [32, 32], [Wb - 32 - tw, 32]]
      const [tx, ty] = spots.find(clear) || spots[0]
      tag.style.left = `${tx.toFixed(1)}px`; tag.style.top = `${ty.toFixed(1)}px`; tag.style.bottom = 'auto'
    }
    // the lead runs from the ring's edge to the glass's edge
    const dx = gx - fx, dy = gy - fy, len = Math.hypot(dx, dy)
    el.style.setProperty('--ll', `${Math.max(0, len - R - 60).toFixed(1)}px`)
    el.style.setProperty('--la', `${Math.atan2(dy, dx).toFixed(4)}rad`)
  }
  // slices: each slice shows its third of one reel cropped for the whole set (the video in the middle by CSS, the
  // outer two painted with the same crop)
  FIT['bs-slices'] = (el) => {
    const set = el.querySelector('.bs-slice-set'), m = open && open.m
    if (!set || !set.clientWidth || !m) return
    const W = set.clientWidth, H = set.clientHeight, Hc = H - 80, gap = 20, sw = (W - 2 * gap) / 3
    set.style.setProperty('--sw', `${W}px`)
    set.style.setProperty('--sh', `${H}px`)
    const [px, py] = m.reel.pos.split(' ').map((v) => parseFloat(v) / 100)
    const cvs = [...el.querySelectorAll('.bs-slice-cv')]
    cvs.forEach((c) => size(c, sw, Hc))
    el._paint = (src, w, h) => {
      const s = Math.max(W / w, Hc / h), ox = (W - w * s) * px, oy = (Hc - h * s) * py
      cvs.forEach((c) => {
        const x0 = +c.dataset.i * (sw + gap)
        c.getContext('2d').drawImage(src, (x0 - ox) / s, -oy / s, sw / s, Hc / s, 0, 0, c.width, c.height)
      })
    }
    mirror(el)
  }

  // the Band's reason on one line while the figure stays large; a long reason ("to make the top ten") stacks its words
  // under the figure instead, so neither shrinks to a label
  FIT['bs-band'] = (el) => {
    const box = el.querySelector('.bs-band-box'), h = box && box.querySelector('.bs-band-h')
    if (!h || !h.querySelector('.bs-band-w')) return
    h.classList.remove('is-stack'); fitBox(box)
    if (parseFloat(h.style.getPropertyValue('--F')) < 150) { h.classList.add('is-stack'); fitBox(box) }
  }
  // the Headline's words and its foot as one group in the middle of the room: a long reason set to the width leaves
  // slack under the words, shared above the words and below the foot
  FIT['bs-words'] = (el) => {
    const box = el.querySelector('.bs-words-box'), inner = box && box.firstElementChild
    if (!inner) return
    el.style.setProperty('--slack', `${Math.max(0, (box.clientHeight - inner.offsetHeight) / 2).toFixed(1)}px`)
  }
  // the Poster's group in the middle of its room: the slack its fitted number leaves, shared above and below
  FIT['bs-poster'] = (el) => {
    const box = el.querySelector('.bs-numbox'), num = box && box.firstElementChild
    if (!num) return
    el.style.setProperty('--slack', `${Math.max(0, (box.clientHeight - num.offsetHeight) / 2).toFixed(1)}px`)
  }

  // Punch again is static markup (parts/ms-again.html): nothing to draw, only its beat
  const DESIGNS = { score: S, why: W, photo: P, again: {} }

  /* ------------------------------------------------------------ the screen */
  const loader = document.querySelector('.loader')
  const secs = () => [...frame.querySelectorAll(':scope > [data-sec]')]
  const shown = (sec) => (sec ? [...sec.children].find((c) => c.hasAttribute('data-sv') && !c.hidden) || null : null)
  const kind = (el) => [...el.classList].find((c) => c !== 'bs-d' && c.startsWith('bs-')) || ''
  const ctl = (el) => { const sec = el.closest('[data-sec]'); return (DESIGNS[sec && sec.dataset.sec] || {})[kind(el)] || null }
  const CLS = ['is-play', 'is-landed', 'is-settled', 'is-counting', 'is-full']
  // the story: the number counts and lands, then the reason, then the reel, then Punch again; the reason waits for the
  // landing of whichever Score design is on show (they count at their own pace)
  const BEAT = { score: 80, why: 2600, photo: 3300, again: 3900 }
  function beats() {
    const el = shown(frame.querySelector(':scope > [data-sec="score"]')), c = el && ctl(el)
    const land = BEAT.score + ((c && c.delay) ?? 320) + ((c && c.dur) ?? 1800) + 60
    return { score: BEAT.score, why: land + 280, photo: land + 980, again: land + 1680 }
  }
  const SETTLE = { score: 3900, why: 2400, photo: 2600, again: 2200 }
  let open = null, waiting = null
  const timers = new Map(), rafs = new Map()

  function renderAll() {
    if (!open) return
    for (const sec of secs()) {
      sec.querySelectorAll(':scope > [data-sv]').forEach((d) => {
        const c = ctl(d)
        if (!c) return
        d.innerHTML = c.render(open.m)
        d.dataset.k = open.m.why.kind
        restScore(d)
      })
    }
    root.dataset.run = open.m.runKey
    root.dataset.why = open.m.why.kind
    fitShown()
  }
  // a Score design at rest: the final number, the column full to its height
  function restScore(d) {
    const c = ctl(d)
    if (!c || !c.paint || !open) return
    const n = open.m.hit
    c.paint(d, n, n)
    if (c.progress) c.progress(d, 1, n)
    if (c.land) c.land(d)
  }
  function clearSec(sec) {
    ;(timers.get(sec) || []).forEach(clearTimeout)
    timers.set(sec, [])
    cancelAnimationFrame(rafs.get(sec) || 0)
    sec.querySelectorAll(':scope > [data-sv]').forEach((d) => { d.classList.remove(...CLS); d.style.removeProperty('--sd') })
    reels(sec, false)
  }
  function stop() {
    if (waiting) { waiting.disconnect(); waiting = null }
    secs().forEach(clearSec)
    open = null
  }
  // the reels: a section's videos play while it is wanted (its beat has come), its design is the one on show, the
  // screen is open and the video is in view (a glass off screen, or the machine not on show, plays nothing); reduced
  // motion never plays them, so the poster, the strike frame, stands
  const seen = window.IntersectionObserver ? new IntersectionObserver((entries) => {
    for (const en of entries) { en.target._seen = en.isIntersecting; drive(en.target) }
  }) : null
  function drive(v) {
    const d = v.closest('[data-sv]')
    const go = v._want && (v._seen ?? true) && !!open && !reduced.matches && !root.hidden && !!d && !d.hidden
    v.muted = true
    if (go && v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}) }
    else if (!go && !v.paused) v.pause()
  }
  function reels(sec, want) {
    sec.querySelectorAll('video').forEach((v) => {
      v._want = want
      if (seen && !v._watched) { v._watched = true; seen.observe(v) }
      drive(v)
    })
  }
  // the count: from nothing to this hit through PunchFormat, the design painting each frame; a hidden tab runs no
  // frames, so the number lands on time regardless
  function count(sec, el, delay) {
    const c = ctl(el), target = open.m.hit
    const wait = delay + (c.delay ?? 320), dur = c.dur ?? 1800
    el.classList.add('is-counting')
    c.paint(el, 0, target)
    if (c.progress) c.progress(el, 0, 0)
    const start = performance.now() + wait
    const ease = (p) => 1 - Math.pow(1 - p, 3.4)
    const tick = (now) => {
      const p = Math.max(0, Math.min(1, (now - start) / dur)), k = ease(p)
      c.paint(el, target * k, target)
      if (c.progress) c.progress(el, k, target * k)
      if (p < 1) rafs.set(sec, requestAnimationFrame(tick))
    }
    rafs.set(sec, requestAnimationFrame(tick))
    timers.get(sec).push(setTimeout(() => {
      cancelAnimationFrame(rafs.get(sec) || 0)
      c.paint(el, target, target)
      if (c.progress) c.progress(el, 1, target)
      el.classList.remove('is-counting'); el.classList.add('is-landed')
      if (c.land) c.land(el)
    }, wait + dur + 60))
  }
  function play(sec, delay) {
    if (!open) return
    clearSec(sec)
    const el = shown(sec)
    if (!el) return
    const isScore = sec.dataset.sec === 'score'
    restScore(el)
    if (reduced.matches) return
    el.style.setProperty('--sd', `${delay}ms`)
    void el.offsetWidth
    el.classList.add('is-play')
    // the reel starts from its first frame as its design arrives
    if (el.querySelector('video')) timers.get(sec).push(setTimeout(() => reels(sec, true), delay))
    if (isScore) count(sec, el, delay)
    else timers.get(sec).push(setTimeout(() => el.classList.add('is-landed'), delay + 900))
    // never leave a design mid entrance if the page's timeline is frozen
    timers.get(sec).push(setTimeout(() => el.classList.add('is-settled'), delay + (SETTLE[sec.dataset.sec] || 3000)))
  }
  function start(opts) {
    stop()
    open = { opts, m: choose(opts) }
    renderAll()
    if (reduced.matches) return
    // opened behind the page loader (a saved screen at load): hold the final state and play once the loader lifts
    if (loader && !loader.classList.contains('is-done') && getComputedStyle(loader).display !== 'none' && window.MutationObserver) {
      const was = open
      waiting = new MutationObserver(() => {
        if (!loader.classList.contains('is-done')) return
        waiting.disconnect(); waiting = null
        if (!root.hidden && open === was) start(opts)
      })
      waiting.observe(loader, { attributes: true, attributeFilter: ['class'] })
      return
    }
    const at = beats()
    secs().forEach((sec) => play(sec, at[sec.dataset.sec] ?? 0))
  }

  document.addEventListener('mscreen', (e) => {
    const d = e.detail || {}
    if (d.key === KEY) start(d.opts || {})
    else if (open) stop()
  })
  // Customise changed one of this screen's sections: replay that section alone
  document.addEventListener('psec', (e) => {
    const d = e.detail || {}
    if (d.surface !== 'machine' || d.page !== KEY || d.initial || !open || root.hidden) return
    const sec = d.section && d.section.closest('[data-sec]')
    if (sec && frame.contains(sec)) { fit(shown(sec)); play(sec, 0) }
  })
  // the score format changed: every number is drawn again at rest, nothing replays
  document.addEventListener('decimals', () => {
    if (!open) return
    secs().forEach((sec) => { (timers.get(sec) || []).forEach(clearTimeout); timers.set(sec, []); cancelAnimationFrame(rafs.get(sec) || 0) })
    open.m = choose(open.opts)
    renderAll()
    frame.querySelectorAll('.bs-sec > .is-play').forEach((el) => { el.classList.remove('is-counting'); el.classList.add('is-landed', 'is-settled') })
    secs().forEach((sec) => reels(sec, true))
  })
  // reduced motion switched while the screen is open: draw it again (a reel that played shows its poster again)
  const onReduce = () => { if (open && !root.hidden) start(open.opts) }
  if (reduced.addEventListener) reduced.addEventListener('change', onReduce)
  // the look changed: the faces did too, so the fitted type is measured again
  new MutationObserver(() => { if (open) fitShown() }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-variant', 'data-appearance'] })
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (open) fitShown() })
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => { if (open) fitShown() })
  // a design measures nothing while it is hidden: fit it when it first takes up room (chosen, or the glass shown)
  if (window.ResizeObserver) {
    const ro = new ResizeObserver((entries) => { if (!open) return; for (const en of entries) if (en.contentRect.width) fit(en.target) })
    frame.querySelectorAll('.bs-sec > [data-sv]').forEach((d) => ro.observe(d))
  }

  // for the render harness: the hit on show and its reason
  window.bigScore = { runs: Object.keys(RUNS), get model() { return open && open.m }, height, fit: fitShown, reels: REELS }
})()
