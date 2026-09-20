/* Machine screen: Default, the glass at rest (parts/mscreen-default.html, mscreens/default.css).
   Fills the drawn pieces (the Monster cans and claws), draws the five designs of "Today's best" from one list with every
   score through window.PunchFormat, and runs the little motion that needs a clock: the film strip's walking highlight
   and the spotlight's turn. It starts when the screen opens ("mscreen" with key "default"), stops when another opens,
   restarts a section when Customise changes its design ("psec"), and redraws the scores on "decimals".
   Reduced motion: no timers; the first player holds the spotlight and the strip's highlight rests on the day's best. */
(() => {
  'use strict'
  const PAGE = 'default'
  const root = document.querySelector(`.mscreen[data-mscreen="${PAGE}"]`)
  if (!root) return
  const PF = window.PunchFormat || { scoreHTML: (n) => Math.floor(n).toLocaleString('en-US'), score: (n) => Math.floor(n).toLocaleString('en-US'), withDecimals: (n) => n }
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
  const icon = (name) => `<span data-lucide="${name}"></span>`

  /* ------------------------------------------------------------ the drawn pieces: an original claw of three torn
     scratches (the same drawing as the sponsor strip's, mscreens/_ads.css), and a can to carry it */
  const CLAW = [
    'M22.0 2.0 18.3 8.5 13.3 14.7 10.6 21.5 9.9 28.7 6.9 35.4 5.4 42.5 5.0 49.8 3.9 56.9 3.2 64.2 5.0 72.0 9.2 65.6 9.1 58.2 13.0 51.7 13.6 44.4 14.8 37.3 17.6 30.6 19.0 23.5 19.1 16.1 21.6 9.3Z',
    'M40.0 0.0 35.3 7.3 29.7 14.5 26.7 22.2 26.2 30.5 22.8 38.1 21.5 46.3 20.9 54.5 19.6 62.7 20.6 71.3 22.0 80.0 25.4 72.4 26.3 64.2 29.8 56.5 32.0 48.6 33.1 40.5 34.9 32.5 36.9 24.5 37.1 16.2 40.1 8.4Z',
    'M57.0 5.0 52.9 11.3 49.0 17.7 45.9 24.2 44.0 31.1 41.9 37.9 40.0 44.7 39.7 52.0 37.8 58.8 38.7 66.4 40.0 74.0 43.8 67.6 43.8 60.3 46.9 53.7 49.6 47.1 49.7 39.8 52.7 33.2 53.7 26.2 54.7 19.1 56.9 12.3Z',
  ]
  root.querySelectorAll('[data-mdf-claw]').forEach((el) => {
    el.innerHTML = `<svg viewBox="0 0 60 80" preserveAspectRatio="none" focusable="false">${CLAW.map((d, i) => `<path d="${d}" pathLength="1" style="--i: ${i}"/>`).join('')}</svg>`
  })
  root.querySelectorAll('[data-mdf-can]').forEach((el) => {
    el.innerHTML = `<span class="mdf-can-shine"></span><svg class="mdf-can-claw" viewBox="0 0 60 80" preserveAspectRatio="none" focusable="false"><path d="${CLAW.join(' ')}"/></svg><span class="mdf-can-name">Monster</span><span class="mdf-can-band">Energy</span>`
  })
  // a how-to drawing that cannot load leaves its icons showing, never a broken image
  root.querySelectorAll('img[data-mdf-img]').forEach((img) => {
    const miss = () => { img.hidden = true }
    const got = () => { img.parentElement.dataset.art = '1' }
    if (img.complete) (img.naturalWidth ? got : miss)()
    img.addEventListener('error', miss)
    img.addEventListener('load', got)
  })

  /* ------------------------------------------------------------ today's best (example data: the phone's own players,
     each with a real photo from their own shoot, a shot no other screen uses (assets/photos/lib/manifest.json); the
     scores are today's, below their all-time best). The shots are cut at their focal point, so they sit at 50% 30% */
  const A = (n) => `assets/app/avatars/${n}.jpg`
  const F = (n) => `assets/app/feed/${n}.jpg`
  const TODAY = [
    { id: 'noor', name: 'Noor Aziz', city: 'Dubai', score: 884210, time: '11:42', ava: A('noor'), photo: F('8469889'), pos: '50% 30%' },
    { id: 'omar', name: 'Omar Nasser', city: 'Dubai', score: 871455, time: '10:18', ava: A('omar'), photo: F('4804087'), pos: '50% 30%' },
    { id: 'leila', name: 'Leila Haddad', city: 'Dubai', score: 859020, time: '12:05', ava: A('leila'), photo: F('8478706'), pos: '50% 30%' },
    { id: 'karim', name: 'Karim Mansour', city: 'Abu Dhabi', score: 842776, time: '09:51', ava: A('karim'), photo: F('6456263'), pos: '50% 30%' },
    { id: 'lina', name: 'Lina Castillo', city: 'Madrid', score: 836130, time: '11:07', ava: A('lina'), photo: F('6551180'), pos: '50% 30%' },
  ].map((p, i) => ({ ...p, rank: i + 1, score: PF.withDecimals(p.score, p.id) }))
  const first = (p) => p.name.split(' ')[0]
  const pic = (p, cls = '') => `<img class="${cls}" src="${p.photo}" alt="" style="object-position: ${p.pos}" loading="lazy" decoding="async">`
  const ava = (p) => `<img class="mdf-ava" src="${p.ava}" alt="" loading="lazy" decoding="async">`
  const score = (p) => `<b class="mdf-score">${PF.scoreHTML(p.score)}</b>`
  const said = (p) => `${p.name}, ${p.city}, ${PF.score(p.score)} points at ${p.time}`

  const DRAW = {
    podium: () => TODAY.slice(0, 3).map((p, i) => `
      <li data-rank="${p.rank}" style="--d: ${[1, 0, 2][i]}" aria-label="Number ${p.rank}: ${said(p)}">
        <span class="mdf-rank" aria-hidden="true">${p.rank}</span>
        ${p.rank === 1 ? `<span class="mdf-crown" aria-hidden="true">${icon('crown')}</span>` : ''}
        <span class="mdf-photo" aria-hidden="true">${pic(p)}</span>
        <span class="mdf-on-photo" aria-hidden="true"><span class="mdf-name">${first(p)}</span>${score(p)}</span>
      </li>`).join(''),
    lead: () => {
      const [top, ...rest] = TODAY
      return `
      <div class="mdf-photo" aria-label="Best hit today: ${said(top)}" role="img">
        ${pic(top)}
        <span class="mdf-flag" aria-hidden="true">${icon('crown')}Best hit today</span>
        <span class="mdf-on-photo" aria-hidden="true"><span class="mdf-name">${top.name}</span>${score(top)}<span class="mdf-meta">${icon('clock')}${top.time}, ${top.city}</span></span>
      </div>
      <ol>${rest.map((p, i) => `
        <li class="mdf-card" style="--d: ${i}" aria-label="Number ${p.rank}: ${said(p)}">
          <span class="mdf-no" aria-hidden="true">${p.rank}</span>${ava(p)}
          <span class="mdf-who" aria-hidden="true"><span class="mdf-name">${first(p)}</span>${score(p)}</span>
        </li>`).join('')}
      </ol>`
    },
    strip: () => `
      <ol class="mdf-strip-row">${TODAY.map((p, i) => `
        <li${i === 0 ? ' class="is-on"' : ''} aria-label="Number ${p.rank}: ${said(p)}">
          <span class="mdf-photo" aria-hidden="true"><span class="mdf-rank">${p.rank}</span>${pic(p)}</span>
        </li>`).join('')}
      </ol>
      <div class="mdf-strip-cap mdf-card" aria-hidden="true">${TODAY.map((p, i) => `
        <div class="mdf-slide${i === 0 ? ' is-on' : ''}">
          <span class="mdf-rank">${p.rank}</span>
          <span class="mdf-who"><span class="mdf-name">${p.name}</span><span class="mdf-meta">${icon('clock')}${p.time}<span class="mdf-gap"></span>${icon('map-pin')}${p.city}</span></span>
          ${score(p)}
        </div>`).join('')}
      </div>`,
    board: () => TODAY.map((p, i) => `
      <li class="mdf-card" style="--d: ${i}" aria-label="Number ${p.rank}: ${said(p)}">
        <span class="mdf-no" aria-hidden="true">${p.rank}</span>${ava(p)}
        <span class="mdf-who" aria-hidden="true"><span class="mdf-name">${p.name}</span><span class="mdf-meta">${icon('clock')}${p.time}<span class="mdf-gap"></span>${icon('map-pin')}${p.city}</span></span>
        ${score(p).replace('<b ', '<b aria-hidden="true" ')}
      </li>`).join(''),
    spot: () => `
      <div class="mdf-spot-info mdf-card">
        <span class="mdf-bars" aria-hidden="true">${TODAY.map((_, i) => `<i${i === 0 ? ' class="is-on"' : ''}></i>`).join('')}</span>
        <div class="mdf-slides">${TODAY.map((p, i) => `
          <div class="mdf-slide${i === 0 ? ' is-on' : ''}" aria-label="Number ${p.rank}: ${said(p)}" role="group">
            <span class="mdf-spot-rank" aria-hidden="true">${icon(p.rank === 1 ? 'crown' : 'medal')}Number ${p.rank} today</span>
            <span class="mdf-name" aria-hidden="true">${p.name}</span>
            ${score(p).replace('<b ', '<b aria-hidden="true" ')}
            <span class="mdf-meta" aria-hidden="true">${icon('clock')}${p.time}, ${p.city}</span>
          </div>`).join('')}
        </div>
      </div>
      <div class="mdf-shots" aria-hidden="true">${TODAY.map((p, i) => pic(p, i === 0 ? 'is-on' : '')).join('')}</div>`,
  }
  function drawBest() {
    for (const [key, fn] of Object.entries(DRAW)) {
      const el = root.querySelector(`[data-mdf-best="${key}"]`)
      if (el) el.innerHTML = fn()
    }
    root.querySelectorAll('[data-mdf-offer]').forEach((el) => { el.innerHTML = PF.scoreHTML(800000) })
    root.querySelectorAll('[data-mdf-offer-text]').forEach((el) => { el.textContent = PF.score(800000) })
  }

  /* ------------------------------------------------------------ the clock: the strip's highlight and the spotlight */
  const SPOT = 4500, STRIP = 3000
  let timers = []
  let live = false
  const clear = () => { timers.forEach(clearInterval); timers = [] }
  const activeDesign = () => (window.PSec ? window.PSec.active('machine', PAGE, 'best') : null)
  function step(list, sel, i) {
    const items = [...list.querySelectorAll(sel)]
    items.forEach((el, n) => el.classList.toggle('is-on', n === i))
    return items.length
  }
  function runBest() {
    clear()
    const d = activeDesign()
    if (!d) return
    const strip = d.querySelector('[data-mdf-best="strip"]')
    const spot = d.querySelector('[data-mdf-best="spot"]')
    if (strip) { step(strip, '.mdf-strip-row > li', 0); step(strip, '.mdf-strip-cap > .mdf-slide', 0) }
    if (spot) {
      step(spot, '.mdf-slide', 0); step(spot, '.mdf-shots img', 0)
      spot.querySelectorAll('.mdf-bars i').forEach((b, n) => { b.classList.toggle('is-on', n === 0); b.classList.remove('is-done') })
      spot.style.setProperty('--spot', `${SPOT}ms`)
    }
    if (!live || reduce.matches) return
    if (strip) {
      let i = 0
      timers.push(setInterval(() => { i = (i + 1) % TODAY.length; step(strip, '.mdf-strip-row > li', i); step(strip, '.mdf-strip-cap > .mdf-slide', i) }, STRIP))
    }
    if (spot) {
      let i = 0
      timers.push(setInterval(() => {
        i = (i + 1) % TODAY.length
        step(spot, '.mdf-slide', i); step(spot, '.mdf-shots img', i)
        spot.querySelectorAll('.mdf-bars i').forEach((b, n) => {
          b.classList.remove('is-on')
          b.classList.toggle('is-done', n < i)
          if (n === i) { void b.offsetWidth; b.classList.add('is-on') }
        })
      }, SPOT))
    }
  }

  function start() { live = true; runBest() }
  function stop() { live = false; clear() }

  drawBest()
  document.addEventListener('mscreen', (e) => { if (e.detail && e.detail.key === PAGE) start(); else stop() })
  document.addEventListener('psec', (e) => {
    const d = e.detail || {}
    if (d.surface !== 'machine' || d.page !== PAGE) return
    if (d.sec === 'best') runBest()
  })
  document.addEventListener('decimals', () => { drawBest(); runBest() })
  reduce.addEventListener('change', runBest)
})()
