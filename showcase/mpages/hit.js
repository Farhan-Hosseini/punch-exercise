/* Phone: Your hit (parts/mpage-hit.html, mpages/hit.css).
   Draws Where you rank from the live board (punchApp.leaders) in the design Customise has chosen (psec.js), hands every
   Punch again button to pay.js (#payAgainBtn decides between a second punch and a purchase), and runs the page's motion:
   the sections rise in when Your hit opens (the "mpage" event), a design rises in when Customise swaps it (the "psec"
   event), and the strike in numbers (drawn here from mobile.js strikeOf) fills once the page is up. Nothing loops, and
   reduced motion shows everything still.
   The score itself is painted by mobile.js (paintHit and countHit) through PunchFormat. */
(() => {
  'use strict'
  const page = document.querySelector('.m-page[data-page="hit"]')
  const app = document.getElementById('mApp')
  if (!page || !app) return
  const root = page.querySelector('.yh')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const L = (name) => `<span data-lucide="${name}"></span>`
  const fmt = (n) => Math.round(n).toLocaleString('en-US')
  const secEl = (key) => page.querySelector(`[data-sec="${key}"]`)
  const sel = (key) => (window.PSec ? window.PSec.get('phone', 'hit', key) : 0)

  /* ------------------------------------------------------------ where you rank: four boards, from this machine out */
  // the size of each board: the people a rank was measured against. The machine's board is tonight's
  const BOARDS = [
    { key: 'machine', label: 'This machine', short: 'Machine', icon: 'monitor', of: 38, when: 'tonight', scope: 'regional', where: 'at this machine tonight', test: (p) => /Dubai/.test(p.city) },
    { key: 'city', label: 'Dubai', short: 'Dubai', icon: 'building-2', of: 1204, when: 'this month', scope: 'regional', where: 'in Dubai', test: (p) => /Dubai/.test(p.city) },
    { key: 'country', label: 'United Arab Emirates', short: 'UAE', icon: 'flag', of: 8930, when: 'this month', scope: 'national', where: 'in the UAE', test: (p) => /UAE/.test(p.city) },
    { key: 'world', label: 'Worldwide', short: 'World', icon: 'globe', of: 412660, when: 'all time', scope: 'global', where: 'worldwide', test: () => true },
  ]
  function standings() {
    const all = window.punchApp ? window.punchApp.leaders() : []
    // the same ranks the glass shows (PunchFormat.ranks), so the phone and the machine never disagree
    const R = window.PunchFormat && window.PunchFormat.ranks && window.punchApp ? window.PunchFormat.ranks(window.punchApp.score) : null
    const RK = R ? { machine: R.machine, city: R.city, country: R.country, world: R.global } : {}
    return BOARDS.map((b) => {
      const list = all.filter(b.test)
      const rank = RK[b.key] || Math.max(1, list.findIndex((p) => p.id === 'me') + 1)
      const top = Math.max(1, Math.ceil((rank / b.of) * 100))
      return { ...b, rank, top, ahead: Math.max(0, b.of - rank) }
    })
  }
  const aria = (s) => `aria-label="Rank ${s.rank} of ${fmt(s.of)} ${s.where}. Open the leaderboard"`

  const RANKS = [
    // Tiles
    (S) => `<h3 class="yh-h">Where you rank</h3>
      <div class="yh-kt-grid">${S.map((s) => `
        <button class="yh-kt m-glass${s.rank === 1 ? ' is-first' : ''}" type="button" data-yh-scope="${s.scope}" ${aria(s)}>
          <span class="yh-kt-top"><span class="yh-kt-ico">${L(s.icon)}</span><span class="yh-kt-label">${s.label === 'United Arab Emirates' ? 'UAE' : s.label}</span></span>
          <span class="yh-kt-rank"><small>#</small>${s.rank}</span>
          <span class="yh-kt-of">of ${fmt(s.of)} ${s.when}</span>
        </button>`).join('')}</div>`,
    // Ladder
    (S) => `<h3 class="yh-h">Where you rank</h3>
      <div class="yh-kl m-glass">${S.map((s) => `
        <button class="yh-kl-row" type="button" data-yh-scope="${s.scope}" ${aria(s)}>
          <span class="yh-kl-ico">${L(s.icon)}</span>
          <span class="yh-kl-txt"><span class="yh-kl-name">${s.label}</span><span class="yh-kl-of">Out of ${fmt(s.of)}, ${s.when}</span></span>
          <span class="yh-kl-rank"><small>#</small>${s.rank}</span>
          <span class="yh-kl-chev">${L('chevron-right')}</span>
        </button>`).join('')}</div>`,
    // Skyline: a real night photograph of the city under the best of the four
    (S) => {
      const best = S.slice().sort((a, b) => a.rank / a.of - b.rank / b.of || b.of - a.of)[0]
      const head = best.rank === 1 ? `Number one ${best.where}` : `Rank ${best.rank} ${best.where}`
      return `<div class="yh-ks">
        <div class="yh-ks-photo">
          <img src="assets/photos/lib/dubai-night-3.jpg" alt="" loading="lazy" style="object-position:38% 40%">
          <p class="m-cap">${L('map-pin')}Dubai Mall, Ground Level</p>
          <p class="yh-ks-head">${head}</p>
        </div>
        <div class="yh-ks-row">${S.map((s) => `
          <button class="yh-ks-chip" type="button" data-yh-scope="${s.scope}" ${aria(s)}>${L(s.icon)}<span class="yh-ks-name">${s.short}</span><b><small>#</small>${s.rank}</b></button>`).join('')}</div>
      </div>`
    },
    // Percentile: how far along each board you stand
    (S) => `<h3 class="yh-h">Where you rank</h3>
      <div class="yh-kp m-glass">${S.map((s) => `
        <button class="yh-kp-row" type="button" data-yh-scope="${s.scope}" ${aria(s)}>
          <span class="yh-kp-top"><span class="yh-kp-name">${L(s.icon)}${s.label}</span><span class="yh-kp-pct">Top ${s.top}%</span></span>
          <span class="yh-kp-bar" aria-hidden="true"><i style="--p:${(1 - s.rank / s.of).toFixed(4)}"></i></span>
          <span class="yh-kp-sub">Ahead of ${fmt(s.ahead)} punchers, rank ${s.rank}</span>
        </button>`).join('')}</div>`,
    // Headline: the machine's rank large, the three wider boards as chips under it
    (S) => {
      const [m, ...rest] = S
      return `<div class="yh-kh m-glass">
        <button class="yh-kh-main" type="button" data-yh-scope="${m.scope}" ${aria(m)}>
          <span class="yh-kh-num"><small>#</small>${m.rank}</span>
          <span class="yh-kh-copy"><span class="m-cap">${L('monitor')}This machine</span><span class="yh-kh-line">Out of ${fmt(m.of)} punchers tonight</span></span>
        </button>
        <div class="yh-kh-row">${rest.map((s) => `
          <button class="yh-kh-chip" type="button" data-yh-scope="${s.scope}" ${aria(s)}>${L(s.icon)}<span>${s.short}</span><b><small>#</small>${s.rank}</b></button>`).join('')}</div>
      </div>`
    },
  ]
  function renderRanks() {
    const el = secEl('ranks')
    if (!el) return
    const i = Math.min(RANKS.length - 1, sel('ranks'))
    el.innerHTML = `<div class="yh-k">${RANKS[i](standings())}</div>`
  }

  /* ------------------------------------------------------------ the strike in numbers (docs/strategy/strike-in-numbers.md)
     Five numbers a walk-up player can picture, each tagged with where it came from, in the same place every time:
     peak force in kg (Measured, worded "about", rounded to 5), the change on the last hit and the best (Your history),
     the middle half of today's hits here (This machine), and hand speed in km/h (Camera estimate, a thinner line); the
     hand and the step are words (Camera read). The hit is mobile.js strikeOf, on the page as data-strike; until it has
     painted, Sara's bell hit. Every design handles past the bell, no speed, a first hit, not scanned, and a band that has
     not settled (then it is this week's). */
  const SARA = {
    kg: 315, bellKg: 300, past: 15, last: { kg: 285, day: 'Today', kmh: 30 }, change: 30, same: false,
    best: { kg: 285, where: 'Dubai Mall', isNew: true },
    line: [{ kg: 225, day: 'Earlier' }, { kg: 260, day: 'Earlier' }, { kg: 285, day: 'Today' }, { kg: 315, day: 'Now', now: true }],
    bandLo: 100, bandHi: 175, bandSettled: true, band: 'Well above', kmh: 31, kmhOk: true, hand: 'Right hand', stepped: true, scanned: true,
  }
  function strike() {
    try { return { ...SARA, ...JSON.parse(page.dataset.strike || '{}') } } catch { return SARA }
  }
  const TAGS = { measured: 'Measured', history: 'Your history', machine: 'This machine', camera: 'Camera estimate', read: 'Camera read' }
  const tag = (k) => `<span class="yx-tag" data-tag="${k}">${TAGS[k]}</span>`
  const hasSpeed = (d) => !!(d.kmhOk && d.kmh)
  const bandWhen = (d) => (d.bandSettled ? 'today' : 'this week')
  const changeT = (d) => (d.change === null || !d.last ? 'First hit tonight'
    : d.same ? 'About the same as your last' : d.change > 0 ? `+${d.change} kg on your last` : `${-d.change} kg under your last`)
  const bestT = (d) => (!d.scanned || !d.best ? 'Scan to keep your best' : d.best.isNew ? 'This one, a new best' : `Your best: about ${d.best.kg} kg, ${d.best.where}`)
  const bandT = (d) => `${d.band}: most hits here ${bandWhen(d)} land ${d.bandLo} to ${d.bandHi} kg`
  const bandSay = (d) => { const w = d.bandSettled ? "today's" : "this week's"; return d.band === 'Well above' ? `Well above the middle of ${w} hits here.` : d.band === 'In the middle' ? `In the middle of ${w} hits here.` : `On the way up to the middle of ${w} hits here.` }
  const readT = (d) => `${d.hand || 'Hand not read'}${d.stepped ? ', stepped in' : ''}`
  const kgHTML = (d, cls = '') => `<p class="yx-kg ${cls}"><span class="yx-about">about</span><b>${d.kg}</b><span class="yx-unit">kg</span></p>`
  const speedRow = (d) => (hasSpeed(d) ? `<div class="yx-row yx-speed"><p><span class="yx-name">Hand speed</span><b>about ${d.kmh} km/h</b></p>${tag('camera')}</div>` : '')
  const readRow = (d) => `<div class="yx-row yx-reads"><p><span class="yx-name">Seen on camera</span><b>${readT(d)}</b></p>${tag('read')}</div>`
  const bandRow = (d) => `<div class="yx-row"><p><span class="yx-name">${d.band}</span><b>Most hits here ${bandWhen(d)}: ${d.bandLo} to ${d.bandHi} kg</b></p>${tag('machine')}</div>`
  const pct = (v, max) => `${Math.max(0, Math.min(100, (v / max) * 100)).toFixed(2)}%`
  const H = (t) => `<h3 class="yh-h">${t}</h3>`

  // Kilo line: the kg large, one scale from zero to past the bell with today's band on it and a tick for the last hit
  function kiloLine(d) {
    const max = Math.max(d.bellKg * 1.15, d.kg * 1.06), over = d.kg > d.bellKg
    const vars = `--kg:${pct(d.kg, max)};--bell:${pct(d.bellKg, max)};--lo:${pct(d.bandLo, max)};--hi:${pct(d.bandHi, max)}${d.last ? `;--last:${pct(d.last.kg, max)}` : ''}`
    return `${H('The strike in numbers')}
      <div class="yx yx-kilo m-glass">
        <div class="yx-head"><p class="yx-cap">Peak force</p>${tag('measured')}</div>
        ${kgHTML(d, 'yx-kg-xl')}
        <p class="yx-help">For an instant, the pad took the push of ${d.kg} kg.</p>
        <div class="yx-scale${over ? ' is-over' : ''}" style="${vars}" aria-hidden="true">
          <span class="yx-bell-l">Bell</span>
          <span class="yx-track"><i class="yx-band"></i><i class="yx-fill"></i>${d.last ? '<i class="yx-last"></i>' : ''}<i class="yx-bell"></i></span>
          ${over ? `<span class="yx-over">${d.past} kg past the bell</span>` : ''}
        </div>
        <ul class="yx-keys">
          <li><i class="yx-key yx-key-band"></i>Most hits here ${bandWhen(d)}, ${d.bandLo} to ${d.bandHi} kg</li>
          ${d.last ? `<li><i class="yx-key yx-key-last"></i>Your last, ${d.last.kg} kg</li>` : ''}
        </ul>
        <p class="yx-say"><b>${changeT(d)}.</b> ${bestT(d)}. ${bandSay(d)}</p>
        ${speedRow(d)}${readRow(d)}
      </div>`
  }

  // Plate stack: the force as 25 kg plates on a gym stack; plates since the last hit light red, past the bell sit over the bar
  function plateStack(d) {
    const per = 25, bellN = Math.round(d.bellKg / per), n = Math.max(bellN, Math.ceil(d.kg / per))
    const since = d.last && d.change > 0 ? Math.floor(d.last.kg / per) : n
    let stack = ''
    for (let j = n; j >= 1; j--) {
      const f = Math.max(0, Math.min(1, (d.kg - (j - 1) * per) / per))
      const cls = f <= 0 ? '' : j > since ? ' is-new' : ' is-lit'
      stack += `<i class="yx-plate${cls}" style="--f:${f.toFixed(2)};--j:${j}"></i>`
      if (j === bellN + 1) stack += '<i class="yx-topbar"></i>'
    }
    if (n === bellN) stack = '<i class="yx-topbar"></i>' + stack
    return `${H('The strike in numbers')}
      <div class="yx yx-plates m-glass">
        <div class="yx-stack${n > bellN ? ' is-over' : ''}" aria-hidden="true"><span class="yx-rails">${stack}</span><span class="yx-stack-base"></span></div>
        <div class="yx-plates-copy">
          <div class="yx-head"><p class="yx-cap">Peak force</p>${tag('measured')}</div>
          ${kgHTML(d, 'yx-kg-lg')}
          <p class="yx-help">For an instant, the pad took the push of ${d.kg} kg.</p>
          <ul class="yx-facts">
            <li><i class="yx-key ${d.last && d.change > 0 ? 'yx-key-new' : 'yx-key-lit'}"></i><span class="yx-fact"><b>${changeT(d)}</b><span>${d.last && d.change > 0 ? 'The red plates, since your last hit' : 'Each lit plate is 25 kg'}</span></span></li>
            <li><i class="yx-key yx-key-bar"></i><span class="yx-fact"><b>${d.kg > d.bellKg ? `${d.past} kg past the bell` : d.kg === d.bellKg ? 'On the bell' : `${d.bellKg - d.kg} kg to the bell`}</b><span>The bar is the bell, ${d.bellKg} kg</span></span></li>
            <li><span class="yx-key-ico" data-lucide="trophy"></span><span class="yx-fact"><b>${bestT(d)}</b>${tag('history')}</span></li>
          </ul>
        </div>
        <div class="yx-plates-foot">${bandRow(d)}${speedRow(d)}${readRow(d)}</div>
      </div>`
  }

  // Lab slip: a printout of the reading, name and source on the left, value on the right; a row with nothing is not printed
  function labSlip(d) {
    const rows = [
      ['Peak force', 'measured', `about ${d.kg} kg`],
      d.kg > d.bellKg ? ['Past the bell', 'measured', `${d.past} kg`] : null,
      d.last ? ['On your last hit', 'history', d.same ? 'About the same' : d.change > 0 ? `+${d.change} kg` : `${-d.change} kg under`] : ['On your last hit', 'history', 'First hit tonight'],
      d.scanned && d.best ? ['Your best', 'history', d.best.isNew ? 'This one' : `about ${d.best.kg} kg`] : null,
      [`Most hits here ${bandWhen(d)}`, 'machine', `${d.bandLo} to ${d.bandHi} kg`],
      ['Where yours sits', 'machine', d.band],
      hasSpeed(d) ? ['Hand speed', 'camera', `about ${d.kmh} km/h`] : null,
      ['Hand', 'read', (d.hand || 'Not read').replace(/ hand$/, '')],
      d.stepped ? ['Front foot', 'read', 'Stepped in'] : null,
    ].filter(Boolean)
    return `${H('The strike in numbers')}
      <div class="yx yx-slip">
        <div class="yx-slip-head"><p class="yx-slip-t">Strike slip</p><p class="yx-slip-m">Machine 07, Dubai Mall</p></div>
        <dl class="yx-slip-rows">${rows.map(([n, k, v]) => `
          <div class="yx-slip-r${k === 'camera' || k === 'read' ? ' is-est' : ''}"><dt>${n}${tag(k)}</dt><dd>${v}</dd></div>`).join('')}
        </dl>
        ${!d.scanned ? '<p class="yx-slip-note">Scan to keep your best.</p>' : ''}
        <p class="yx-slip-foot">Force is rounded to 5 kg. A pad reads within about a tenth either way, and one hit to the next varies as much.</p>
      </div>`
  }

  // today's hits on this machine, for the plot: their middle half is the band (the quartiles of a logistic spread), and
  // speed follows force loosely. Fixed, so the dots stay put from one visit to the next
  function crowd(d) {
    let h = 11
    const rnd = () => { h = (h * 16807) % 2147483647; return h / 2147483647 }
    const mid = (d.bandLo + d.bandHi) / 2, half = (d.bandHi - d.bandLo) / 2, n = 36
    return Array.from({ length: n }, (_, i) => {
      const p = (i + 0.5) / n
      const kg = Math.max(35, Math.min(d.bellKg - 45, mid + (half * Math.log(p / (1 - p))) / Math.log(3)))
      return { kg, kmh: Math.max(16.5, Math.min(34, 20 + kg * 0.035 + (rnd() - 0.5) * 7)) }
    })
  }
  // Hard and fast: km/h across, kg up; today's hits here faint, the last hit a ring with an arrow to this one
  function hardFast(d) {
    if (!hasSpeed(d)) return kiloLine(d)
    const W = 340, Ht = 236, l = 36, r = 16, t = 18, b = 34
    const x0 = 15, x1 = 35, y1 = Math.ceil(Math.max(d.bellKg * 1.15, d.kg * 1.08) / 50) * 50
    const X = (v) => (l + ((v - x0) / (x1 - x0)) * (W - l - r)).toFixed(1)
    const Y = (v) => (t + (1 - v / y1) * (Ht - t - b)).toFixed(1)
    const dots = crowd(d).map((c) => `<circle cx="${X(c.kmh)}" cy="${Y(c.kg)}" r="3.6"/>`).join('')
    const gy = [100, 200].map((v) => `<path class="yx-p-grid" d="M${l} ${Y(v)}H${W - r}"/><text class="yx-p-t" x="${l - 8}" y="${Y(v)}" dy=".35em" text-anchor="end">${v}</text>`).join('')
    const gx = [20, 25, 30].map((v) => `<text class="yx-p-t" x="${X(v)}" y="${Ht - b + 18}" text-anchor="middle">${v}</text>`).join('')
    const nx = +X(d.kmh), ny = +Y(d.kg)
    const last = d.last ? { x: +X(d.last.kmh), y: +Y(d.last.kg) } : null
    // this hit's label goes on the side away from the last hit's; near an edge a label hangs inwards
    const up = !last || ny <= last.y
    const lab = (x) => (x > W - r - 34 ? 'end' : x < l + 34 ? 'start' : 'middle')
    let arrow = ''
    if (last) {
      const dx = nx - last.x, dy = ny - last.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len
      if (len > 20) arrow = `<path class="yx-p-arrow" d="M${(last.x + ux * 8).toFixed(1)} ${(last.y + uy * 8).toFixed(1)}L${(nx - ux * 11).toFixed(1)} ${(ny - uy * 11).toFixed(1)}" marker-end="url(#yxArrow)"/>`
    }
    return `${H('The strike in numbers')}
      <div class="yx yx-plot m-glass">
        <svg class="yx-p" viewBox="0 0 ${W} ${Ht}" aria-hidden="true" focusable="false">
          <defs><marker id="yxArrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1 7 4 1 7" class="yx-p-head"/></marker></defs>
          <rect class="yx-p-band" x="${l}" y="${Y(d.bandHi)}" width="${W - l - r}" height="${(+Y(d.bandLo) - +Y(d.bandHi)).toFixed(1)}"/>
          ${gy}
          <path class="yx-p-bell" d="M${l} ${Y(d.bellKg)}H${W - r}"/><text class="yx-p-t yx-p-bell-t" x="${l - 8}" y="${Y(d.bellKg)}" dy=".35em" text-anchor="end">Bell</text>
          <path class="yx-p-axis" d="M${l} ${t - 6}V${Ht - b}H${W - r}"/>
          ${gx}
          <text class="yx-p-u" x="${l}" y="${t - 10}" text-anchor="start" dx="6">kg</text>
          <text class="yx-p-u" x="${W - r}" y="${Ht - b + 18}" text-anchor="end">km/h</text>
          <g class="yx-p-dots">${dots}</g>
          ${last ? `<circle class="yx-p-last" cx="${last.x}" cy="${last.y}" r="6"/><text class="yx-p-l" x="${last.x}" y="${(last.y + (up ? 19 : -15)).toFixed(1)}" dy=".35em" text-anchor="${lab(last.x)}">Your last</text>` : ''}
          ${arrow}
          <circle class="yx-p-you" cx="${nx}" cy="${ny}" r="7"/>
          <text class="yx-p-l yx-p-l-you" x="${nx}" y="${(ny + (up ? -17 : 20)).toFixed(1)}" dy=".35em" text-anchor="${lab(nx)}">This hit</text>
        </svg>
        <p class="yx-cap-line">Each faint dot is a hit on this machine ${bandWhen(d)}. The band is where most of them land.</p>
        <div class="yx-pair">
          <div><div class="yx-head"><p class="yx-cap">Peak force</p>${tag('measured')}</div>${kgHTML(d, 'yx-kg-md')}</div>
          <div class="is-est"><div class="yx-head"><p class="yx-cap">Hand speed</p>${tag('camera')}</div><p class="yx-kg yx-kg-md"><span class="yx-about">about</span><b>${d.kmh}</b><span class="yx-unit">km/h</span></p></div>
        </div>
        <p class="yx-say"><b>${changeT(d)}.</b> ${bestT(d)}. ${bandSay(d)}</p>
        ${readRow(d)}
      </div>`
  }

  // Your line: Sara's own hits on this machine in kg, oldest to now; the old best a thin gold rule, the change on the last segment
  function yourLine(d) {
    const pts = (d.line && d.line.length ? d.line : [{ kg: d.kg, day: 'Now', now: true }])
    const W = 340, Ht = pts.length > 1 ? 190 : 120, l = 18, r = 18, t = 34, b = 30
    const kgs = pts.map((p) => p.kg).concat(d.best && !d.best.isNew ? [d.best.kg] : [])
    const lo = Math.max(0, Math.min(...kgs) - 30), hi = Math.max(...kgs) + 25
    const X = (i) => (pts.length === 1 ? W / 2 : l + (i / (pts.length - 1)) * (W - l - r))
    const Y = (v) => t + (1 - (v - lo) / (hi - lo)) * (Ht - t - b)
    const P = pts.map((p, i) => [X(i), Y(p.kg)])
    const path = P.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('')
    // the change sits over the last segment
    let seg = '', segBox = null
    if (P.length > 1 && d.last) {
      const [ax, ay] = P[P.length - 2], [bx, by] = P[P.length - 1], txt = d.same ? 'Same' : d.change > 0 ? `+${d.change} kg` : `${d.change} kg`
      const sx = (ax + bx) / 2, sy = Math.min(ay, by) - 10
      segBox = [sx - txt.length * 4.5, sy - 14, sx + txt.length * 4.5, sy + 4]
      seg = `<text class="yx-l-seg" x="${sx.toFixed(1)}" y="${sy.toFixed(1)}" text-anchor="middle">${txt}</text>`
    }
    // the best as a gold rule; its label takes the first corner that neither the line nor the change label runs through
    const bestKg = d.best ? d.best.kg : null
    let rule = ''
    if (bestKg !== null && d.scanned) {
      const label = `${d.best.isNew ? 'Old best' : 'Your best'}, ${bestKg} kg`, lw = label.length * 6.8, yb = Y(bestKg)
      const along = P.flatMap(([x, y], i) => (i ? Array.from({ length: 12 }, (_, k) => [P[i - 1][0] + ((x - P[i - 1][0]) * k) / 11, P[i - 1][1] + ((y - P[i - 1][1]) * k) / 11]) : [[x, y]]))
      const spots = [[l - 6, yb + 17, 'start'], [l - 6, yb - 8, 'start'], [W - r + 6, yb + 17, 'end'], [W - r + 6, yb - 8, 'end']]
      const clear = ([x, y, an]) => {
        const x0 = an === 'end' ? x - lw : x, box = [x0 - 6, y - 16, x0 + lw + 6, y + 6]
        const hit = ([px, py]) => px > box[0] && px < box[2] && py > box[1] && py < box[3]
        return !along.some(hit) && !(segBox && segBox[0] < box[2] && segBox[2] > box[0] && segBox[1] < box[3] && segBox[3] > box[1])
      }
      const [bx, by, ba] = spots.find(clear) || spots[0]
      rule = `<path class="yx-l-best" d="M${l - 6} ${yb.toFixed(1)}H${W - r + 6}"/><text class="yx-l-best-t" x="${bx}" y="${by.toFixed(1)}" text-anchor="${ba}">${label}</text>`
    }
    const dots = P.map(([x, y], i) => `<circle class="${pts[i].now ? 'yx-l-now' : 'yx-l-dot'}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${pts[i].now ? 7 : 4.5}"/>`).join('')
    const days = P.map(([x], i) => `<text class="yx-p-t${pts[i].now ? ' is-now' : ''}" x="${x.toFixed(1)}" y="${Ht - 8}" text-anchor="${P.length > 1 && i === 0 ? 'start' : P.length > 1 && i === P.length - 1 ? 'end' : 'middle'}" dx="${P.length > 1 && i === 0 ? -6 : P.length > 1 && i === P.length - 1 ? 6 : 0}">${pts[i].day}</text>`).join('')
    return `${H('The strike in numbers')}
      <div class="yx yx-line m-glass">
        <div class="yx-head"><p class="yx-cap">Your hits here</p>${tag('history')}</div>
        ${kgHTML(d, 'yx-kg-lg')}
        <svg class="yx-l" viewBox="0 0 ${W} ${Ht}" aria-hidden="true" focusable="false" style="--len:${Math.round(P.reduce((s, p, i) => s + (i ? Math.hypot(p[0] - P[i - 1][0], p[1] - P[i - 1][1]) : 0), 0))}">
          ${rule}
          ${P.length > 1 ? `<path class="yx-l-path" d="${path}"/>` : ''}
          ${seg}${dots}${days}
        </svg>
        ${!d.scanned || pts.length === 1 ? '<p class="yx-say"><b>Scan to keep your best.</b> Your next hits draw the line.</p>' : `<p class="yx-say"><b>${changeT(d)}.</b> ${bestT(d)}.</p>`}
        ${bandRow(d)}${speedRow(d)}${readRow(d)}
      </div>`
  }
  const STATS = [kiloLine, plateStack, labSlip, hardFast, yourLine]
  function renderStats() {
    const el = secEl('stats')
    const d = strike()
    if (el) el.innerHTML = `<div class="yx-wrap">${STATS[Math.min(STATS.length - 1, sel('stats'))](d)}</div>`
    // the Replay's Contact moment reads the same kg
    page.querySelectorAll('[data-yh-kg]').forEach((n) => { n.textContent = String(d.kg) })
    const c = page.querySelector('[data-yh-contact]')
    if (c) c.setAttribute('aria-label', `Open the replay in your reel, 6 seconds, peak force about ${d.kg} kilograms at contact`)
  }

  /* ------------------------------------------------------------ controls */
  page.addEventListener('click', (e) => {
    const k = e.target.closest('[data-yh-scope]')
    if (k) { window.punchApp && window.punchApp.go('ranks', { scope: k.dataset.yhScope }); return }
    // every Punch again is the pay.js button: a second punch while credits last, more credits once they run out
    const again = e.target.closest('[data-yh-again]')
    if (again) { const b = document.getElementById('payAgainBtn'); if (b) b.click() }
  })
  function syncAgain() {
    const n = window.punchApp ? window.punchApp.credits : 0
    const label = n > 0 ? `Punch again, ${n === 1 ? '1 credit' : `${n} credits`} left` : 'Out of credits, buy more to punch again'
    page.querySelectorAll('[data-yh-again]').forEach((b) => b.setAttribute('aria-label', label))
  }
  app.addEventListener('credits', syncAgain)

  /* ------------------------------------------------------------ motion */
  const replay = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls) }
  let enterTimer = 0, fillTimer = 0
  // the kg fill, the plates, the plot's dot and the line start empty only once armed, so a page shown without this
  // script still reads full
  function fill(on) {
    clearTimeout(fillTimer)
    if (!on || reduced.matches) { root.classList.remove('is-armed', 'is-filled'); return }
    root.classList.remove('is-filled')
    root.classList.add('is-armed')
    void root.offsetWidth
    fillTimer = setTimeout(() => root.classList.add('is-filled'), 420)
  }
  function start() {
    renderRanks()
    renderStats()
    syncAgain()
    root.classList.add('is-live')
    fill(true)
    if (reduced.matches) return
    replay(root, 'is-entering')
    clearTimeout(enterTimer)
    enterTimer = setTimeout(() => root.classList.remove('is-entering'), 1300)
  }
  function stop() {
    clearTimeout(enterTimer)
    root.classList.remove('is-live', 'is-entering')
    fill(false)
  }
  document.addEventListener('mpage', (e) => {
    const d = e.detail || {}
    if (d.page === 'hit') start()
    else if (d.from === 'hit') stop()
  })
  document.addEventListener('psec', (e) => {
    const d = e.detail || {}
    if (d.surface !== 'phone' || d.page !== 'hit') return
    if (d.sec === 'ranks') renderRanks()
    if (d.sec === 'stats') renderStats()
    if (d.initial || !root.classList.contains('is-live')) return
    const shown = d.sec === 'ranks' || d.sec === 'stats' ? d.section.firstElementChild : d.el
    if (d.sec === 'stats') fill(true)
    if (!reduced.matches && shown) { replay(shown, 'is-swap'); setTimeout(() => shown.classList.remove('is-swap'), 700) }
  })
  // the scores on the rank boards move with the score format and a new score
  document.addEventListener('decimals', () => { if (root.classList.contains('is-live')) renderRanks() })
  // a new hit (mobile.js strikeOf, painted with the score) redraws the numbers; the fill runs again only on a live page
  document.addEventListener('strike', () => { renderStats(); if (root.classList.contains('is-live')) fill(true) })

  renderRanks()
  renderStats()
  syncAgain()
  if (window.punchApp && window.punchApp.page === 'hit') start()
})()
