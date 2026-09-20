/* Phone: Default, the app's home (parts/mpage-default.html, mpages/default.css).
   Draws Machines near you (on a slider, round nine) and From your friends in the design Customise has chosen
   (psec.js), and runs the page's motion: the sections rise in when Home opens (the "mpage" event), a design rises
   in when Customise swaps it (the "psec" event), and nothing loops while Home is away. Scores go through PunchFormat and
   re-render on the "decimals" event. */
(() => {
  'use strict'
  const page = document.querySelector('.m-page[data-page="default"]')
  const app = document.getElementById('mApp')
  if (!page || !app) return
  const root = page.querySelector('.mh')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const PF = window.PunchFormat || { score: (n) => Math.floor(n).toLocaleString('en-US'), scoreHTML: (n) => Math.floor(n).toLocaleString('en-US'), width: (n) => Math.floor(n).toLocaleString('en-US').length }
  const L = (name) => `<span data-lucide="${name}"></span>`
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const toast = (t) => window.punchApp && window.punchApp.toast(t)
  const go = (p, o) => window.punchApp && window.punchApp.go(p, o)
  const sel = (key) => (window.PSec ? window.PSec.get('phone', 'default', key) : 0)
  const secEl = (key) => page.querySelector(`[data-sec="${key}"]`)
  const gradeFor = (s) => (s >= 900000 ? 'Perfect punch' : s >= 600000 ? 'Heavy hitter' : s >= 300000 ? 'Solid strike' : 'Warm up')
  const pts = (n) => `<span class="mh-pts" style="--mh-w:${PF.width(n)}">${PF.scoreHTML(n)}</span>`

  /* ------------------------------------------------------------ the venues (real photographs, assets/photos/lib) */
  const LIB = (f) => `assets/photos/lib/${f}`
  const VENUES = [
    { id: 'dxb', name: 'Dubai Mall', spot: 'Ground Level, by the Ice Rink', dist: '350 m', photo: LIB('dubai-night-1.jpg'), pos: '50% 62%', x: 66, y: 47 },
    { id: 'walk', name: 'City Walk', spot: 'The arcade, Building 8', dist: '3.1 km', photo: LIB('mall-night-1.jpg'), pos: '50% 45%', x: 57, y: 33 },
    { id: 'moe', name: 'Mall of the Emirates', spot: 'Level 1, the games hall', dist: '14 km', photo: LIB('arcade-neon-1.jpg'), pos: '50% 60%', x: 33, y: 64 },
    { id: 'marina', name: 'Dubai Marina Mall', spot: 'Level 1, by the cinema', dist: '22 km', photo: LIB('dubai-night-2.jpg'), pos: '55% 45%', x: 17, y: 78 },
  ]
  // round nine: no queue counts on any machine card ("no need"); the distance is the one fact a card carries
  const dist = (v) => `<span class="mh-v-dist">${L('navigation')}${v.dist}</span>`
  const img = (v, extra = '') => `<img class="mh-v-img" src="${v.photo}" alt="" loading="lazy" draggable="false" style="object-position:${v.pos}"${extra}>`
  const vLabel = (v) => `${v.name}, ${v.spot}. ${v.dist} away`
  const nearest = `<span class="mh-badge">${L('locate-fixed')}Nearest</span>`
  // round eleven: Home carries no slider chrome, the rail is swiped and it advances on its own
  const live = '<p class="sr-only" data-sl-live aria-live="polite"></p>'

  const NEAR = [
    // Carousel: photo cards on a slider that bleeds to the screen edge, dots and the three buttons under it
    () => `<div class="mh-slider" data-slider>
      <div class="mh-rail mh-track" data-sl-track role="group" aria-roledescription="carousel" aria-label="Machines near you">${VENUES.map((v, i) => `
        <button class="mh-venue mh-vc" type="button" data-venue="${v.id}" aria-roledescription="slide" aria-label="${esc(vLabel(v))}">
          <span class="mh-vc-media">${img(v)}${i === 0 ? nearest : ''}</span>
          <span class="mh-vc-body"><span class="mh-v-name">${v.name}</span><span class="mh-v-spot">${v.spot}</span><span class="mh-v-meta">${dist(v)}</span></span>
        </button>`).join('')}</div>${live}
    </div>`,
    // List
    () => `<div class="mh-vlist">${VENUES.map((v, i) => `
      <button class="mh-venue mh-vl" type="button" data-venue="${v.id}" aria-label="${esc(vLabel(v))}">
        ${img(v)}
        <span class="mh-vl-txt"><span class="mh-v-name">${v.name}</span><span class="mh-v-spot">${v.spot}</span><span class="mh-v-meta">${dist(v)}${i === 0 ? `<span class="mh-v-near">${L('locate-fixed')}Nearest</span>` : ''}</span></span>
        <span class="mh-chev">${L('chevron-right')}</span>
      </button>`).join('')}</div>`,
    // Map: a pin per venue over the drawn coast, and the venues' cards on a slider under it; a pin and its card move together
    () => `<div class="mh-slider mh-mapsl" data-slider>
      <div class="mh-map">
        <svg class="mh-map-art" viewBox="0 0 400 226" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
          <rect class="mh-map-land" width="400" height="226"/>
          <path class="mh-map-sea" d="M0 0H300C282 20 262 30 238 44C204 64 178 78 146 104C116 128 88 150 58 176C40 192 22 208 0 222Z"/>
          <path class="mh-map-road" d="M20 226C80 176 150 124 222 86C270 60 322 30 400 6"/>
          <path class="mh-map-road is-small" d="M120 226C170 186 230 150 300 118C340 100 372 90 400 84"/>
          <path class="mh-map-road is-small" d="M236 0C244 40 256 90 268 140C276 176 280 200 282 226"/>
          <path class="mh-map-road is-small" d="M60 226C90 200 110 186 140 172"/>
        </svg>
        <span class="mh-map-label" style="left:7%;top:12%">The Gulf</span>
        <span class="mh-map-label" style="left:74%;top:86%">Al Quoz</span>
        <span class="mh-map-label is-area" style="left:71%;top:60%">Downtown</span>
        <span class="mh-map-label is-area" style="left:6%;top:87%">Marina</span>
        <span class="mh-map-label is-area" style="left:37%;top:73%">Al Barsha</span>
        <span class="mh-me" style="--x:70%;--y:52%" role="img" aria-label="You are here"></span>
        ${VENUES.map((p, i) => `<button class="mh-pin" type="button" data-pin="${p.id}" data-sl-dot="${i}" style="--x:${p.x}%;--y:${p.y}%" aria-pressed="${i === 0}" aria-label="${esc(p.name)}, ${p.dist}"><span class="mh-pin-dot">${L('hand-fist')}</span></button>`).join('')}
      </div>
      <div class="mh-track mh-map-track" data-sl-track role="group" aria-roledescription="carousel" aria-label="Machines on the map">${VENUES.map((v) => `
        <div class="mh-map-card" aria-roledescription="slide" aria-label="${esc(vLabel(v))}">
          ${img(v)}
          <span class="mh-map-card-txt"><span class="mh-v-name">${v.name}</span><span class="mh-v-spot">${v.spot}</span>
            <span class="mh-map-card-row"><span class="mh-v-meta">${dist(v)}</span><button class="mh-link" type="button" data-venue="${v.id}" aria-label="Directions to ${esc(v.name)}">Directions${L('chevron-right')}</button></span>
          </span>
        </div>`).join('')}</div>${live}
    </div>`,
    // Spotlight: one venue at a time, full width, a bar per venue that fills while the slides run
    () => `<div class="mh-slider mh-spot" data-slider>
      <div class="mh-track mh-spot-track" data-sl-track role="group" aria-roledescription="carousel" aria-label="Machines near you">${VENUES.map((v, i) => `
        <div class="mh-vhero" aria-roledescription="slide" aria-label="${esc(vLabel(v))}">${img(v)}${i === 0 ? nearest : ''}
          <span class="mh-vhero-txt"><span class="mh-v-name">${v.name}</span><span class="mh-v-spot">${v.spot}</span><span class="mh-v-meta">${dist(v)}</span></span>
          ${i === 0
            ? `<button class="m-btn m-btn-red m-btn-sm mh-vhero-play" type="button" data-go="scan">${L('scan-qr-code')}Play here</button>`
            : `<button class="m-btn m-btn-sm mh-btn-photo mh-vhero-play" type="button" data-venue="${v.id}">${L('navigation')}Directions</button>`}
        </div>`).join('')}</div>${live}
    </div>`,
    // Grid
    () => `<div class="mh-vgrid">${VENUES.map((v, i) => `
      <button class="mh-venue mh-vg" type="button" data-venue="${v.id}" aria-label="${esc(vLabel(v))}">
        ${img(v)}
        ${i === 0 ? `<span class="mh-vg-top">${nearest}</span>` : ''}
        <span class="mh-vg-txt"><span class="mh-v-name">${v.name}</span>${dist(v)}</span>
      </button>`).join('')}</div>`,
  ]

  /* ------------------------------------------------------------ the slider
     Round nine, "Machines near you does not work as a slider: make it a slider and let it move". A native scroller
     (scroll snap, and the finger's own swipe) with what a slider needs on top: a mouse drag that throws to the nearest
     card, previous and next (they wrap), dots or bars that follow, arrow keys, Home and End, and a gentle advance every
     few seconds while nobody is using it. It holds still on hover, on focus, for a while after any touch, when the pause
     button is pressed, while Home is away or the section is off screen, and always under reduced motion. A plain rail
     (From your friends) gets the drag alone. */
  const STEP = 5200
  const RESUME = 7000
  function slider(root, { auto = true, onChange, page: host } = {}) {
    const track = root.matches('[data-sl-track]') ? root : root.querySelector('[data-sl-track]')
    if (!track) return null
    const slides = () => [...track.children]
    const dots = [...root.querySelectorAll('[data-sl-dot]')]
    const pauseBtn = root.querySelector('[data-sl-pause]')
    const liveEl = root.querySelector('[data-sl-live]')
    let at = -1, timer = 0, raf = 0, hold = 0, hover = false, focus = false, paused = false, seen = true, dead = false
    let drag = null, dragged = false, settle = 0
    const scale = () => (track.getBoundingClientRect().width / track.offsetWidth) || 1
    const max = () => Math.max(0, track.scrollWidth - track.clientWidth)
    const padL = () => parseFloat(getComputedStyle(track).scrollPaddingLeft) || 0
    const target = (i) => Math.min(max(), Math.max(0, slides()[i].offsetLeft - padL()))
    const smooth = () => (reduced.matches ? 'auto' : 'smooth')
    const nearestIndex = () => {
      const x = track.scrollLeft, list = slides()
      if (x >= max() - 2) return list.length - 1
      let best = 0, d = Infinity
      list.forEach((_, i) => { const dd = Math.abs(target(i) - x); if (dd < d) { d = dd; best = i } })
      return best
    }
    function restartBar() {
      const on = root.querySelector('[data-sl-dot].is-on b')
      if (!on) return
      on.style.animation = 'none'; void on.offsetWidth; on.style.animation = ''
    }
    function paint(i, announce) {
      if (i === at) return
      at = i
      // a dot, a bar or a map pin names its card by data-sl-dot (the map has both pins and dots)
      dots.forEach((d) => {
        const on = +d.dataset.slDot === i
        d.classList.toggle('is-on', on)
        if (d.hasAttribute('aria-pressed')) d.setAttribute('aria-pressed', String(on))
      })
      slides().forEach((sl, k) => sl.classList.toggle('is-at', k === i))
      if (onChange) onChange(i)
      if (announce && liveEl) liveEl.textContent = slides()[i].getAttribute('aria-label') || ''
      restartBar()
    }
    // while a programmatic glide runs, the scroll listener waits for it to land instead of painting every card it passes
    function glide(i) {
      track.scrollTo({ left: target(i), behavior: smooth() })
      clearTimeout(settle)
      settle = setTimeout(() => { settle = 0 }, reduced.matches ? 0 : 700)
    }
    function go(i, announce = true) {
      const n = slides().length
      if (!n) return
      i = ((i % n) + n) % n
      glide(i)
      paint(i, announce)
    }
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => { raf = 0; if (!drag && !settle) paint(nearestIndex(), false) })
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    track.addEventListener('scrollend', () => { if (!drag) { clearTimeout(settle); settle = 0; paint(nearestIndex(), false) } })

    // the mouse drag: a finger already swipes the native scroller, a mouse gets the same by dragging
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      drag = { x: e.clientX, left: track.scrollLeft, id: e.pointerId, from: at }
      dragged = false
      touchHold()
    })
    track.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return
      const dx = (e.clientX - drag.x) / scale()
      if (!dragged && Math.abs(dx) < 6) return
      if (!dragged) {
        dragged = true
        clearTimeout(freeT)
        track.classList.add('is-dragging', 'is-free')
        try { track.setPointerCapture(drag.id) } catch { /* the pointer has gone */ }
      }
      track.scrollLeft = drag.left - dx
      e.preventDefault()
    })
    // snap stays off while the drag and the glide that ends it run, or the browser snaps back to the card it left
    let freeT = 0
    const endDrag = (e) => {
      if (!drag || (e && e.pointerId !== drag.id)) return
      const d = drag
      drag = null
      track.classList.remove('is-dragging')
      if (!dragged) return
      const dx = track.scrollLeft - d.left
      const n = slides().length
      let i = nearestIndex()
      // a short throw still turns one card
      if (Math.abs(dx) > 36 && i === d.from) i = Math.max(0, Math.min(n - 1, d.from + Math.sign(dx)))
      go(i)
      clearTimeout(freeT)
      freeT = setTimeout(() => track.classList.remove('is-free'), reduced.matches ? 30 : 720)
      touchHold()
    }
    track.addEventListener('pointerup', endDrag)
    track.addEventListener('pointercancel', endDrag)
    track.addEventListener('lostpointercapture', endDrag)
    // a drag is not a tap: the click that ends it opens nothing
    track.addEventListener('click', (e) => {
      if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; return }
      // a tap on a card that only peeks in from the edge brings it to the front instead of acting on it
      const card = e.target.closest('[data-sl-track] > *')
      if (!card || card.parentElement !== track || card.classList.contains('is-at')) return
      const c = card.getBoundingClientRect(), t = track.getBoundingClientRect()
      if (c.left >= t.left - 2 && c.right <= t.right + 2) return
      e.preventDefault(); e.stopPropagation()
      go(slides().indexOf(card))
      touchHold()
    }, true)
    track.addEventListener('dragstart', (e) => e.preventDefault())

    // keys: the arrows move a card at a time, and focus follows when it was on a card
    root.addEventListener('keydown', (e) => {
      const k = e.key
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(k)) return
      const n = slides().length
      const i = k === 'Home' ? 0 : k === 'End' ? n - 1 : at + (k === 'ArrowRight' ? 1 : -1)
      e.preventDefault()
      const onCard = e.target.closest('[data-sl-track] > *')
      go(i)
      touchHold()
      if (onCard) {
        const card = slides()[((i % n) + n) % n]
        const f = card.matches('button, a') ? card : card.querySelector('button:not([tabindex="-1"]), a')
        if (f) f.focus({ preventScroll: true })
      }
    })

    const prev = root.querySelector('[data-sl-prev]'), next = root.querySelector('[data-sl-next]')
    if (prev) prev.addEventListener('click', () => { go(at - 1); touchHold() })
    if (next) next.addEventListener('click', () => { go(at + 1); touchHold() })
    dots.forEach((d) => { if (d.matches('button')) d.addEventListener('click', () => { go(+d.dataset.slDot); touchHold() }) })
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        paused = !paused
        pauseBtn.setAttribute('aria-pressed', String(paused))
        pauseBtn.setAttribute('aria-label', paused ? 'Play the slides' : 'Pause the slides')
        state()
      })
    }

    // the advance
    function touchHold() { hold = Date.now() + RESUME; state() }
    const running = () => auto && !dead && !paused && !hover && !focus && !drag && seen && !reduced.matches &&
      !document.hidden && !!window.punchApp && window.punchApp.page === 'default'
    function state() {
      if (dead) return
      const on = running() && Date.now() >= hold
      root.classList.toggle('is-auto', on)
      root.classList.toggle('is-held', !on)
      clearTimeout(timer)
      if (!auto) return
      if (on) timer = setTimeout(() => { if (running() && Date.now() >= hold) go(at + 1, false); state() }, STEP)
      else timer = setTimeout(state, Math.max(500, hold - Date.now()))
    }
    root.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hover = true; state() } })
    root.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hover = false; state() } })
    // focus holds the slides when it is keyboard focus; a mouse click on next leaves focus there without meaning to read
    root.addEventListener('focusin', (e) => { focus = e.target.matches(':focus-visible'); state() })
    root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) { focus = false; state() } })
    track.addEventListener('touchstart', touchHold, { passive: true })
    track.addEventListener('wheel', (e) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) touchHold() }, { passive: true })
    let io = null
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((es) => { seen = es[es.length - 1].isIntersecting; state() }, { root: host || page, threshold: 0.6 })
      io.observe(track)
    }
    const onMotion = () => state()
    reduced.addEventListener('change', onMotion)
    document.addEventListener('visibilitychange', onMotion)
    paint(0, false)
    if (auto) state()
    return {
      go, state,
      get at() { return at },
      destroy() {
        dead = true; clearTimeout(timer); clearTimeout(settle); if (io) io.disconnect()
        reduced.removeEventListener('change', onMotion); document.removeEventListener('visibilitychange', onMotion)
      },
    }
  }
  let nearSl = null
  let railSl = []

  /* ------------------------------------------------------------ friends (the feed's own players) */
  // each friend's card has a shot of its own from that player's shoot (manifest.json), one no other screen shows
  const F = (n) => `assets/app/feed/${n}.jpg`
  const FRIENDS = [
    { id: 'noor', when: '2 min', where: 'Dubai Mall', photo: F('8469886') },
    { id: 'leila', when: '1 h', where: 'Dubai Mall', photo: F('8469888') },
    { id: 'rami', when: '3 h', where: 'Beirut', photo: F('7289310') },
    { id: 'omar', when: 'Yesterday', where: 'Dubai Mall', photo: F('4804042') },
    { id: 'yusuf', when: 'Yesterday', where: 'Sharjah', photo: F('3927025') },
  ]
  const SEEN = new Set(['omar', 'yusuf'])
  function friends() {
    const all = (window.punchApp && window.punchApp.leaders()) || []
    const by = Object.fromEntries(all.map((p) => [p.id, p]))
    return FRIENDS.filter((f) => by[f.id]).map((f) => ({ ...by[f.id], ...f, first: by[f.id].name.split(' ')[0] }))
  }
  const whenText = (f) => (/^\d/.test(f.when) ? `${f.when} ago` : f.when.toLowerCase())

  const FRIEND_DESIGNS = [
    // Hit cards
    (list) => `<div class="mh-rail">${list.map((f) => `
      <button class="mh-friend mh-fc" type="button" data-go="feed" aria-label="${esc(f.name)}, ${PF.score(f.score)}, ${esc(whenText(f))}">
        <img class="mh-v-img" src="${f.photo}" alt="" loading="lazy">
        <img class="m-ava" src="${f.ava}" alt="">
        <span class="mh-fc-txt"><span class="mh-f-name">${f.first}</span>${pts(f.score)}<span class="mh-f-when">${f.where}, ${whenText(f)}</span></span>
      </button>`).join('')}</div>`,
    // Stories
    (list) => `<div class="mh-stories">${list.map((f) => `
      <button class="mh-friend mh-story${SEEN.has(f.id) ? ' is-seen' : ''}" type="button" data-go="feed" aria-label="${esc(f.name)}'s hit, ${esc(whenText(f))}">
        <span class="mh-story-ring"><img class="m-ava" src="${f.ava}" alt="">${f.score >= 900000 ? `<span class="mh-story-grade">${L('zap')}</span>` : ''}</span>
        <span class="mh-f-name">${f.first}</span><span class="mh-f-when">${f.when}</span>
      </button>`).join('')}</div>`,
    // Activity
    (list) => `<div class="mh-act m-glass">${list.slice(0, 4).map((f) => `
      <button class="mh-friend mh-ar" type="button" data-go="feed" aria-label="${esc(f.name)}, ${gradeFor(f.score)} at ${esc(f.where)}, ${PF.score(f.score)}">
        <img class="m-ava" src="${f.ava}" alt="">
        <span class="mh-ar-txt"><span class="mh-f-name">${f.name}</span><span class="mh-f-when">${gradeFor(f.score)}, ${f.where}</span></span>
        ${pts(f.score)}
      </button>`).join('')}</div>`,
    // Mosaic
    (list) => `<div class="mh-mosaic">${list.slice(0, 3).map((f) => `
      <button class="mh-friend mh-mt" type="button" data-go="feed" aria-label="${esc(f.name)}, ${PF.score(f.score)}">
        <img class="mh-v-img" src="${f.photo}" alt="" loading="lazy">
        <span class="mh-mt-txt"><span class="mh-mt-who"><img class="m-ava" src="${f.ava}" alt=""><span class="mh-f-name">${f.first}</span></span>${pts(f.score)}</span>
      </button>`).join('')}</div>`,
    // Rivalry: the friend closest behind the player
    (list) => {
      const me = window.punchApp ? window.punchApp.score : 999999
      const behind = list.filter((f) => f.score <= me).sort((a, b) => b.score - a.score)[0] || list[0]
      const gap = Math.max(0, me - behind.score)
      return `<div class="mh-riv">
        <div class="mh-riv-face">
          <button class="mh-friend mh-riv-side is-you" type="button" data-go="profile" data-player="me" aria-label="You, ${PF.score(me)}">
            <img class="m-ava" src="assets/app/avatars/sara.jpg" alt=""><span class="mh-f-name">You</span>${pts(me)}
          </button>
          <span class="mh-riv-mid" aria-hidden="true">${L('zap')}</span>
          <button class="mh-friend mh-riv-side is-them" type="button" data-go="profile" data-player="${behind.id}" aria-label="${esc(behind.name)}, ${PF.score(behind.score)}">
            <img class="m-ava" src="${behind.ava}" alt=""><span class="mh-f-name">${behind.first}</span>${pts(behind.score)}
          </button>
        </div>
        <p class="mh-riv-line"><b>${behind.first}</b> punched ${whenText(behind)} at ${behind.where} and sits <b>${PF.score(gap)}</b> behind you.</p>
        <div class="mh-riv-row"><button class="m-btn m-btn-glass m-btn-sm" type="button" data-go="feed">${L('users-round')}See the feed</button><button class="m-btn m-btn-red m-btn-sm" type="button" data-go="scan">${L('hand-fist')}Defend it</button></div>
      </div>`
    },
  ]

  /* ------------------------------------------------------------ drawing */
  function drawNear() {
    const body = secEl('near').querySelector('[data-mh-body]')
    if (nearSl) nearSl.destroy()
    nearSl = null
    body.innerHTML = (NEAR[sel('near')] || NEAR[0])()
    const root = body.querySelector('[data-slider]')
    if (root) nearSl = slider(root)
    return body
  }
  function drawFriends() {
    const body = secEl('friends').querySelector('[data-mh-body]')
    railSl.forEach((r) => r.destroy())
    body.innerHTML = (FRIEND_DESIGNS[sel('friends')] || FRIEND_DESIGNS[0])(friends())
    // a rail of friends drags like the slider, without the controls or the advance
    railSl = [...body.querySelectorAll('.mh-rail, .mh-stories')].map((r) => { r.setAttribute('data-sl-track', ''); return slider(r, { auto: false }) }).filter(Boolean)
    return body
  }
  // Your last hit says Replay in every design (round nine), so only the greeting's board chip reads the live standing
  function paintLast() {
    const leaders = (window.punchApp && window.punchApp.leaders()) || []
    const me = leaders.find((p) => p.id === 'me')
    const rank = me ? me.rank : 1
    page.querySelectorAll('[data-mh-rank-text]').forEach((el) => { el.textContent = rank === 1 ? 'Top of the board' : `#${rank} on the board` })
  }
  function paintCredits(n) {
    if (typeof n !== 'number') n = window.punchApp ? window.punchApp.credits : 0
    page.querySelectorAll('[data-mh-credit-count]').forEach((el) => { el.textContent = String(n) })
    page.querySelectorAll('[data-mh-credit-unit]').forEach((el) => { el.textContent = n === 1 ? 'credit' : 'credits' })
  }
  function paintGreeting() {
    const h = new Date().getHours()
    const part = h < 5 ? 'evening' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
    page.querySelectorAll('[data-greet]').forEach((el) => { el.textContent = `Good ${part}` })
    page.querySelectorAll('[data-greet-short]').forEach((el) => { el.textContent = part[0].toUpperCase() + part.slice(1) })
  }
  function draw() { paintGreeting(); paintCredits(); paintLast(); drawNear(); drawFriends() }

  /* ------------------------------------------------------------ motion */
  const replay = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls) }
  let enterTimer = 0
  function start() {
    root.classList.add('is-live')
    if (nearSl) nearSl.state()
    ;[...root.children].forEach((s, i) => s.style.setProperty('--i', i))
    if (reduced.matches) return
    replay(root, 'is-entering')
    clearTimeout(enterTimer)
    enterTimer = setTimeout(() => root.classList.remove('is-entering'), 1200)
    const promo = window.PSec && window.PSec.active('phone', 'default', 'promo')
    replay(promo, 'is-rip')
  }
  function stop() {
    root.classList.remove('is-live', 'is-entering')
    if (nearSl) nearSl.state()
  }

  /* ------------------------------------------------------------ events */
  document.addEventListener('mpage', (e) => {
    const d = e.detail || {}
    if (d.page === 'default') { draw(); start() } else stop()
  })
  document.addEventListener('psec', (e) => {
    const d = e.detail || {}
    if (d.surface !== 'phone' || d.page !== 'default' || d.initial) return
    let shown = d.el
    if (d.sec === 'near') shown = drawNear()
    else if (d.sec === 'friends') shown = drawFriends()
    else if (d.sec === 'last') paintLast()
    else if (d.sec === 'promo' && !reduced.matches) replay(d.el, 'is-rip')
    if (!reduced.matches && shown) { replay(shown, 'is-swap'); setTimeout(() => shown.classList.remove('is-swap'), 700) }
  })
  document.addEventListener('decimals', () => { paintLast(); drawNear(); drawFriends() })
  app.addEventListener('credits', (e) => paintCredits(e.detail))

  page.addEventListener('click', (e) => {
    // a pin is the map slider's dot: slider() moves the cards to it
    if (e.target.closest('[data-pin]')) return
    const venue = e.target.closest('[data-venue]')
    if (venue) {
      const v = VENUES.find((x) => x.id === venue.dataset.venue)
      if (v) toast(`Directions to ${v.name} open in Maps`)
      return
    }
    if (e.target.closest('[data-mh-bell]')) { toast('Noor liked your hit. Omar wants a rematch'); return }
    if (e.target.closest('[data-mh-share]')) { toast('Link to the replay copied'); return }
    const claim = e.target.closest('[data-mh-claim]')
    if (claim) toast(claim.dataset.mhToast || 'Offer saved. Show it at the kiosk')
  })

  // a card reached with Tab inside a rail slides fully into view, clear of the screen edge
  page.addEventListener('focusin', (e) => {
    const card = e.target.closest('.mh-rail > *, .mh-stories > *, .mh-track > *')
    if (card) card.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduced.matches ? 'auto' : 'smooth' })
  })

  // the rails on the other pages (Scan's last punches and its how-to cards) take the same engine: a mouse drags them,
  // the arrow keys turn them, and a card that only peeks in comes to the front when it is tapped
  window.punchSlider = (el, opts = {}) => {
    if (!el || el.dataset.slOn) return null
    el.dataset.slOn = '1'
    if (!el.matches('[data-sl-track]')) el.setAttribute('data-sl-track', '')
    return slider(el, { auto: false, ...opts })
  }

  // mobile.js opened the first page before this file loaded: catch up if Home is already on show
  draw()
  if (window.punchApp && window.punchApp.page === 'default') start()
})()
