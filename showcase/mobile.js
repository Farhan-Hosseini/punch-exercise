/* The phone flow: the app's screens in a device frame, with the interactions between them.
   Scan the machine code, connect, punch on the machine, see your hit, find yourself on the leaderboard, post it to the
   feed, open profiles and play a player's reel of attempts.
   The shell (app.js) owns the mode switch, the score and the logo; this file owns everything inside the phone. */
(() => {
  'use strict'

  const $ = (id) => document.getElementById(id)
  const app = $('mApp')
  if (!app) return
  const device = $('device'), wrap = $('deviceWrap'), stage = $('phoneStage')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  // the live machine beside the phone is this same page in ?embed=machine: its phone never runs, saves or announces,
  // so it cannot spend a credit, start a second countdown or talk over the phone that drives it
  const EMBED = document.documentElement.dataset.embed === 'machine'

  /* ------------------------------------------------------------ icons */
  // two Lucide icons the punch step needs (assets/icons/lucide/footprints.svg, hand.svg), drawn like the rest at 1.75
  const LUCIDE = (d) => ({ vb: '0 0 24 24', svg: `<g class="ic" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${d.map((p) => `<path d="${p}"/>`).join('')}</g>` })
  const ICONS = {
    footprints: LUCIDE(['M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z', 'M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z', 'M16 17h4', 'M4 13h4']),
    pause: { vb: '0 0 24 24', svg: '<g class="ic" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></g>' },
    chevUp: LUCIDE(['m18 15-6-6-6 6']),
    chevDown: LUCIDE(['m6 9 6 6 6-6']),
    handsFree: LUCIDE(['M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2', 'M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2', 'M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8', 'M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15']),
    ...(window.APP_ICONS || {}),
  }
  const icon = (name) => { const i = ICONS[name]; return i ? `<svg viewBox="${i.vb}" aria-hidden="true" focusable="false">${i.svg}</svg>` : '' }
  const paintIcons = (root) => root.querySelectorAll('[data-icon]').forEach((el) => { if (!el.firstElementChild) el.innerHTML = icon(el.dataset.icon) })

  /* ------------------------------------------------------------ people and hits (example data) */
  const A = (n) => `assets/app/avatars/${n}.jpg`
  const F = (n) => `assets/app/feed/${n}.jpg`
  const P = {
    zayd:  { name: 'Zayd Rahman',   city: 'London, UK',     uae: false, dubai: false, score: 987654, delta: 3,  ava: A('zayd'),  punches: 412, followers: 18200 },
    lina:  { name: 'Lina Castillo', city: 'Madrid, ES',     uae: false, dubai: false, score: 942108, delta: 1,  ava: A('lina'),  punches: 256, followers: 9400 },
    omar:  { name: 'Omar Nasser',   city: 'Dubai, UAE',     uae: true,  dubai: true,  score: 931440, delta: -2, ava: A('omar'),  punches: 301, followers: 6100 },
    noor:  { name: 'Noor Aziz',     city: 'Dubai, UAE',     uae: true,  dubai: true,  score: 918220, delta: 10, ava: A('noor'),  punches: 188, followers: 4300 },
    rami:  { name: 'Rami Haddad',   city: 'Beirut, LB',     uae: false, dubai: false, score: 902775, delta: 52, ava: A('rami'),  punches: 97,  followers: 3900 },
    yusuf: { name: 'Yusuf Idris',   city: 'Sharjah, UAE',   uae: true,  dubai: false, score: 876543, delta: 4,  ava: A('yusuf'), punches: 233, followers: 2100 },
    hana:  { name: 'Hana Sato',     city: 'Tokyo, JP',      uae: false, dubai: false, score: 861200, delta: 0,  ava: A('hana'),  punches: 176, followers: 5600 },
    adam:  { name: 'Adam Brooks',   city: 'Tampa, US',      uae: false, dubai: false, score: 845990, delta: -1, ava: A('adam'),  punches: 120, followers: 1500 },
    leila: { name: 'Leila Haddad',  city: 'Dubai, UAE',     uae: true,  dubai: true,  score: 832405, delta: 2,  ava: A('leila'), punches: 88,  followers: 1200 },
    karim: { name: 'Karim Mansour', city: 'Abu Dhabi, UAE', uae: true,  dubai: false, score: 812940, delta: -3, ava: A('karim'), punches: 205, followers: 2600 },
    me:    { name: 'Sara Malik',    city: 'Dubai, UAE',     uae: true,  dubai: true,  score: 999999, delta: 8, ava: A('sara'), punches: 128, followers: 2400 },
  }
  // every player has a shoot of their own (assets/photos/lib/manifest.json tags each shot with its player, by Pexels id).
  // hits: their kept replays, best first; the feed post is the first of them and the reel plays all of them. Every other
  // place a player shows has a shot of its own, so no photograph appears twice: board (the phone's ranks), attract (the
  // machine's board), story (the feed's stories) and portrait (the profile's Portrait header)
  const SHOTS = {
    me:    { hits: ['7777435', '7777434', '7777431', '7777283', '7777272', '7777269', '7777432'], board: '7793229', attract: '7777436', story: '7793237', portrait: '7777428' },
    zayd:  { hits: ['6295785', '6295782', '6295832'], board: '6295797', attract: '6295830', story: '6295825', portrait: '6295786' },
    lina:  { hits: ['6551183', '6551191', '6551185'], board: '6551186', attract: '6551177', story: '6551190', portrait: '6551220' },
    omar:  { hits: ['4804079', '4804249', '4804248', '4804090', '4804043', '4804064', '4804039', '4804046', '4804070'], board: '4804095', attract: '4804040', story: '4804089', portrait: '4804034' },
    noor:  { hits: ['8478699', '8478705', '8472153'], board: '8469883', attract: '8469884', story: '8472146', portrait: '8472143' },
    rami:  { hits: ['7289296', '7289293', '7289301'], board: '7289298', attract: '7289294', story: '7289304', portrait: '7289306' },
    yusuf: { hits: ['3926995', '3927024', '3926965'], board: '3926980', attract: '3926958', story: '3926953', portrait: '3926949' },
    hana:  { hits: ['8809982', '8809985', '8809987'], board: '8809989', attract: '8809981', story: '8809991', portrait: '8809988' },
    adam:  { hits: ['8810074', '8810062', '8810064', '8810078', '8810069', '8810076'], board: '8810072', attract: '8810065', story: '8810073', portrait: '8810066' },
    leila: { hits: ['8469892', '8478707', '8472155'], board: '8478703', attract: '8472149', story: '8469890', portrait: '8478701' },
    karim: { hits: ['6456225', '6456230', '6456229'], board: '6456262', attract: '6456231', portrait: '6456232' },
  }
  const MORE = {}
  for (const [id, s] of Object.entries(SHOTS)) {
    const p = P[id]
    p.photo = F(s.hits[0])
    MORE[id] = s.hits.slice(1).map(F)
    for (const k of ['board', 'attract', 'story', 'portrait']) p[k] = s[k] ? F(s[k]) : p.photo
  }
  for (const [id, p] of Object.entries(P)) { p.id = id; p.handle = '@' + p.name.split(' ')[0].toLowerCase() + (id === 'me' ? '.hits' : '.punch') }
  // every score on the phone goes through PunchFormat (format.js): the brief's full length, 999,999.000, with the three
  // decimals set smaller, or whole points when Customise turns them off. The example players only have whole points, so
  // each gets stable decimals from their id, the same ones the machine's boards give them
  const PF = window.PunchFormat || { score: (n) => Math.floor(n).toLocaleString('en-US'), scoreHTML: (n) => Math.floor(n).toLocaleString('en-US'), width: (n) => Math.floor(n).toLocaleString('en-US').length, withDecimals: (n) => n, decimals: () => false }
  const ptsHTML = (n) => PF.scoreHTML(n)
  const ptsText = (n) => PF.score(n)
  for (const p of Object.values(P)) if (p.id !== 'me') p.score = PF.withDecimals(p.score, p.id)
  // a player's hits are stills from their own replays, each its own photograph from their own shoot (SHOTS above), cut
  // at the shot's focal point (assets/app/feed), so a hit is framed the same way everywhere it shows.
  // the phone's player is Sara, the same player the machine glass shows; nobody's grid ever borrows another player's face
  // the crops put each shot's focal point between a fifth and two fifths of the way down, so a wide tile holds the
  // faces a little above its middle
  const HIT_CROP = { pos: '50% 34%', z: 1 }
  const TILE_POS = '50% 30%'
  const fmt = (n) => Math.round(n).toLocaleString('en-US')
  const short = (n) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'K' : String(n))
  const gradeFor = (s) => (s >= 900000 ? 'Perfect punch' : s >= 600000 ? 'Heavy hitter' : s >= 300000 ? 'Solid strike' : 'Warm up')

  // the feed's hit posts, newest first. "top" is the comment shown under a post; Nearby is anyone in the UAE, Dubai
  // Mall is the community of the machine by the rink, and Following is read from the live follow list
  const POSTS = [
    { id: 'p1', who: 'noor', when: '2 min', where: 'Dubai Mall, Ground Level', photo: P.noor.photo, likes: 128, comments: 14, text: 'New personal best. The bell finally rang.', top: ['omar', 'Rematch at eight. Bring the gloves.'] },
    { id: 'p2', who: 'zayd', when: '18 min', where: 'Boxpark, London', photo: P.zayd.photo, likes: 2431, comments: 212, text: 'Top of the world board again. Come and take it.', top: ['lina', 'Madrid is coming for that spot.'] },
    // the sponsor: Monster Energy, clearly marked, with its own green call to action (its designs are in the markup)
    { id: 'ad-monster', ad: true, likes: 1840, comments: 96, text: 'Every Perfect punch at Dubai Mall this week earns a cold can at the Monster kiosk by the rink. Show your hit in the app.' },
    { id: 'p3', who: 'leila', when: '1 h', where: 'Dubai Mall, Ground Level', photo: P.leila.photo, likes: 342, comments: 31, text: 'Group run with the team, one code for all of us.', top: ['noor', 'Best group run yet. Same time next week?'] },
    { id: 'p7', who: 'yusuf', when: '2 h', where: 'Sahara Centre, Sharjah', photo: P.yusuf.photo, likes: 212, comments: 19, text: 'Sharjah has a machine now. First bell of the day.', top: ['karim', 'Driving up on Saturday.'] },
    { id: 'p4', who: 'rami', when: '3 h', where: 'ABC Verdun, Beirut', photo: P.rami.photo, likes: 901, comments: 77, text: 'Up fifty-two places this week. Seated, and still swinging.', top: ['zayd', 'Fifty-two places. Respect.'] },
    { id: 'p5', who: 'lina', when: '5 h', where: 'Madrid Rio', photo: P.lina.photo, likes: 1207, comments: 64, text: 'Slow motion does not lie. Hips first, then the glove.', top: ['hana', 'Hips first. Writing that down.'] },
    { id: 'p8', who: 'karim', when: '6 h', where: 'Yas Mall, Abu Dhabi', photo: P.karim.photo, likes: 380, comments: 27, text: 'Two tries, one bell. Abu Dhabi is on the board.', top: ['yusuf', 'See you at Yas.'] },
    { id: 'p6', who: 'omar', when: 'Yesterday', where: 'Dubai Mall, Ground Level', photo: P.omar.photo, likes: 455, comments: 48, text: 'Noor, rematch tomorrow. Same machine, same time.', top: ['noor', 'Eight o\'clock. Do not be late.'] },
  ]
  const STORIES = ['noor', 'leila', 'omar', 'zayd', 'lina', 'rami', 'hana', 'adam', 'yusuf']
  const SEEN = new Set(['hana', 'adam', 'leila'])

  /* ------------------------------------------------------------ settings owned by the phone */
  const KEY = 'punch-showcase.app.v2'
  const BOARD_STYLES = [
    { key: 'cards', name: 'Cards' },
    { key: 'champion', name: 'Champion' },
    { key: 'podium', name: 'Podium' },
    { key: 'tiles', name: 'Tiles' },
    { key: 'meter', name: 'Force meter' },
  ]
  // the linking screen's designs (parts/mpage-connect.html; the three after Brackets are drawn in mpages/connect.css)
  const CONNECT_STYLES = [
    { key: 'orbit', name: 'Orbit' },
    { key: 'brackets', name: 'Brackets' },
    { key: 'radar', name: 'Radar' },
    { key: 'beam', name: 'Beam' },
    { key: 'checklist', name: 'Checklist' },
  ]
  // round eight: the floating Pill is gone and Red glow (nav.css) takes its place as the first style and the default.
  // A pick is kept by index, so a saved Pill (index 0) opens on Red glow and every other saved pick keeps its style
  const NAV_STYLES = [
    { key: 'glow', name: 'Red glow' },
    { key: 'bar', name: 'Tab bar' },
    { key: 'dock', name: 'Dock' },
    { key: 'notch', name: 'Notch' },
    { key: 'line', name: 'Minimal' },
  ]
  let st = { page: 'default', device: 'iphone', board: 0, connect: 0, nav: 0, fit: false, fitV: 2, credits: 0, reelView: 'full' }
  try { st = { ...st, ...(JSON.parse(localStorage.getItem(KEY) || 'null') || {}) } } catch { /* storage unavailable */ }
  const save = () => { if (EMBED) return; try { localStorage.setItem(KEY, JSON.stringify(st)) } catch { /* private window */ } }
  // the phone opens at its actual size; a setting saved before that became the default moves once
  if (st.fitV !== 2) { st.fit = false; st.fitV = 2 }

  /* the machine code on the scan page is the one shared QR style (qr.js, PunchQR): nothing here draws a code */

  /* ------------------------------------------------------------ navigation */
  const ORDER = ['default', 'scan', 'connect', 'connected', 'topup', 'checkout', 'paid', 'failed', 'punch', 'hit', 'ranks', 'feed', 'profile', 'reel']
  const pages = Object.fromEntries([...app.querySelectorAll('.m-page')].map((p) => [p.dataset.page, p]))
  const navItems = [...app.querySelectorAll('.m-nav-item')]
  const pageBtns = [...document.querySelectorAll('.pagebar [data-page]')]
  const history = []
  let current = null, profileId = 'me', timers = []
  // reduced motion calms the animation, not the pace: every step still stays up long enough to read
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t }
  const clearTimers = () => { timers.forEach(clearTimeout); timers = [] }

  function go(page, opts = {}) {
    if (!pages[page]) return
    const prevPlayer = profileId
    if (page === 'profile') profileId = opts.player || 'me'
    if (page === current && page !== 'profile') return
    if (page === current && prevPlayer === profileId) return
    clearTimers()
    const from = current
    // a screen with its own clock (the punch countdown) stops it the moment it is left
    if (from && from !== page && LEAVE[from]) LEAVE[from](page)
    const backward = from && ORDER.indexOf(page) < ORDER.indexOf(from)
    if (from && !opts.back) history.push({ page: from, player: prevPlayer })
    if (history.length > 20) history.shift()
    const out = from && pages[from], inn = pages[page]
    // a control inside the outgoing screen had focus (Continue, Pay, a row): hand focus to the new screen, so the next
    // Tab starts there instead of at the top of the showcase
    const handOff = !!(out && out !== inn && out.contains(document.activeElement))
    if (out && out !== inn) {
      out.classList.toggle('is-left', !backward)
      out.classList.remove('is-on')
      out.setAttribute('aria-hidden', 'true')
      out.inert = true
    }
    inn.classList.toggle('is-left', !!backward)
    void inn.offsetWidth
    inn.classList.remove('is-left')
    inn.classList.add('is-on')
    inn.removeAttribute('aria-hidden')
    inn.inert = false
    current = page
    app.dataset.page = page
    st.page = page
    save()
    // a sheet or a toast belongs to the screen that opened it
    if (sheetOpen) closeSheet(true)
    clearToast()
    syncInert()
    // Saved opens from your own profile (its Saved row), so the Profile tab stays lit there
    const navKey = page === 'profile' && profileId !== 'me' ? null : page
    navItems.forEach((b) => (b.dataset.go === navKey ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')))
    const navIndex = navItems.findIndex((b) => b.dataset.go === navKey)
    app.style.setProperty('--nav-i', Math.max(0, navIndex))
    app.toggleAttribute('data-nav-none', navIndex < 0)
    pageBtns.forEach((b) => (b.dataset.page === page ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')))
    // the page bar scrolls when the stage is narrower than it (Customise open): keep the current page's pill in view
    const pill = pageBtns.find((b) => b.dataset.page === page), bar = pill && pill.parentElement
    if (bar && bar.scrollWidth > bar.clientWidth) {
      const br = bar.getBoundingClientRect(), r = pill.getBoundingClientRect()
      if (r.left < br.left + 6) bar.scrollLeft -= br.left + 6 - r.left
      else if (r.right > br.right - 6) bar.scrollLeft += r.right - br.right + 6
    }
    if (inn.classList.contains('m-scroll') && !opts.keepScroll) inn.scrollTop = 0
    if (window.PSec) window.PSec.apply('phone', page)
    ENTER[page] && ENTER[page](opts)
    announceFor(page, opts)
    ;(EXTRA_ENTER[page] || []).forEach((fn) => fn(opts))
    // a page's own script (mpages/KEY.js) starts its designs on this; the Customise panel follows it too
    document.dispatchEvent(new CustomEvent('mpage', { detail: { page, from, opts } }))
    const f = document.activeElement
    if (handOff && (!app.contains(f) || out.contains(f))) { inn.tabIndex = -1; inn.focus({ preventScroll: true }) }
  }
  const EXTRA_ENTER = {}
  const LEAVE = {}

  app.addEventListener('click', (e) => {
    const t = e.target.closest('[data-go]')
    if (!t || !app.contains(t)) return
    go(t.dataset.go, { player: t.dataset.player })
  })
  pageBtns.forEach((b) => b.addEventListener('click', () => go(b.dataset.page, { player: 'me' })))

  /* ------------------------------------------------------------ toast */
  let toastTimer = 0
  function toast(text) {
    const el = $('mToast')
    el.textContent = text
    el.classList.add('is-on')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 2200)
  }
  function clearToast() {
    clearTimeout(toastTimer)
    $('mToast').classList.remove('is-on')
  }

  /* ------------------------------------------------------------ what the keyboard can reach
     The tab bar slides away on the connect, punch and payment screens, so it leaves the tab order with them; an open
     sheet is modal, so everything else in the phone leaves it too. */
  const NO_NAV = ['connect', 'connected', 'punch', 'topup', 'checkout', 'paid', 'failed', 'reel']
  const nav = app.querySelector('.m-nav')
  let sheetOpen = false
  function syncInert() {
    for (const el of app.children) if (el !== nav && !el.classList.contains('m-sheet')) el.inert = sheetOpen
    nav.inert = sheetOpen || NO_NAV.includes(current)
  }

  /* ------------------------------------------------------------ scan
     The page is built from sections (parts/mpage-scan.html, mpages/scan.js), so every design carries its own controls:
     any [data-scan-go] starts the scan, every [data-scan-text] carries its status, and .m-scan and every code tile on
     the page (.pqr, the one QR style) take .is-scanning and .is-found. */
  const scan = app.querySelector('.m-scan')
  const SCAN_TEXT = { idle: 'Scan machine QR code', reading: 'Reading the code', found: 'Machine found' }
  function paintScan(state) {
    scan.querySelectorAll('[data-scan-text]').forEach((el) => { el.textContent = SCAN_TEXT[state] })
    for (const el of [scan, ...scan.querySelectorAll('.pqr')]) {
      el.classList.toggle('is-scanning', state !== 'idle')
      el.classList.toggle('is-found', state === 'found')
    }
  }
  function resetScan() { paintScan('idle') }
  function startScan() {
    if (current !== 'scan' || scan.classList.contains('is-scanning')) return
    paintScan('reading')
    later(() => paintScan('found'), 1100)
    later(() => go('connect', { flow: true }), 2600)
  }
  scan.addEventListener('click', (e) => {
    if (e.target.closest('[data-scan-go]')) startScan()
    const how = e.target.closest('[data-howto]')
    if (how) openSheet(how)
  })

  // how to use the code: a bottom sheet with five designs (the scan page's How-to sheet section, shown by scan.js)
  const sheet = $('mSheet')
  let sheetTimer = 0, sheetFrom = null
  const sheetDesign = () => sheet.querySelector('.hs:not([hidden])') || sheet
  const sheetStops = () => [...sheetDesign().querySelectorAll('button:not([disabled]), [tabindex="0"]')].filter((el) => !el.closest('[hidden]'))
  function openSheet(from) {
    clearTimeout(sheetTimer)
    sheetFrom = from && from.nodeType === 1 ? from : null
    sheet.hidden = false
    void sheet.offsetWidth
    sheet.classList.add('is-open')
    sheetOpen = true
    syncInert()
    sheet.dispatchEvent(new CustomEvent('sheet', { detail: { open: true } }))
    const first = sheetDesign().querySelector('[data-sheet-ok], [data-hs-next]') || sheetStops()[0]
    if (first) first.focus({ preventScroll: true })
  }
  // quiet: the screen is changing under the sheet, so focus is not handed back to the How to use button
  function closeSheet(quiet) {
    if (!sheetOpen) return
    sheetOpen = false
    sheet.classList.remove('is-open')
    syncInert()
    clearTimeout(sheetTimer)
    sheet.dispatchEvent(new CustomEvent('sheet', { detail: { open: false } }))
    if (quiet === true) { sheet.hidden = true; return }
    sheetTimer = setTimeout(() => { sheet.hidden = true }, 420)
    const back = sheetFrom && sheetFrom.isConnected && !sheetFrom.closest('[hidden]') ? sheetFrom
      : [...scan.querySelectorAll('[data-howto]')].find((b) => !b.closest('[hidden]'))
    if (back) back.focus({ preventScroll: true })
  }
  window.punchSheet = { open: openSheet, close: closeSheet, get isOpen() { return sheetOpen } }
  sheet.addEventListener('click', (e) => { if (e.target.closest('[data-sheet-ok]')) closeSheet() })
  $('mSheetScrim').addEventListener('click', () => closeSheet())
  // the sheet is modal: Tab cycles through the controls of the design on show, and Escape closes it wherever focus is
  sheet.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return
    const list = sheetStops()
    e.preventDefault()
    if (!list.length) return
    const i = list.indexOf(document.activeElement)
    const next = e.shiftKey ? (i <= 0 ? list.length - 1 : i - 1) : (i < 0 || i === list.length - 1 ? 0 : i + 1)
    list[next].focus({ preventScroll: true })
  })
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !sheetOpen || e.defaultPrevented) return
    const f = document.activeElement
    if (f && f !== document.body && !app.contains(f)) return
    e.preventDefault(); e.stopPropagation()
    closeSheet()
  })
  // drag the sheet down to close it
  const panel = sheet.querySelector('.m-sheet-panel')
  let dragY = null
  panel.addEventListener('pointerdown', (e) => { if (e.target.closest('button, .hs-rail')) return; dragY = e.clientY; panel.setPointerCapture(e.pointerId); panel.style.transition = 'none' })
  panel.addEventListener('pointermove', (e) => { if (dragY == null) return; panel.style.transform = `translateY(${Math.max(0, e.clientY - dragY)}px)` })
  panel.addEventListener('pointerup', (e) => {
    if (dragY == null) return
    const dy = e.clientY - dragY
    dragY = null
    panel.style.transition = ''
    panel.style.transform = ''
    if (dy > 70) closeSheet()
  })

  /* ------------------------------------------------------------ connect */
  const connect = $('mConnect')
  // the page carries the link's state too, for its Machine and Credit sections (mpages/connect.css): data-state
  // wait or done, data-held yes (a credit is held for this turn) or no (the wallet was empty)
  const connectPage = connect.closest('.m-page')
  // a first punch links the phone; a second one finds the machine already linked and only needs a moment
  let again = false
  function setConnect(state, held) {
    connect.dataset.state = connectPage.dataset.state = state
    connect.dataset.held = connectPage.dataset.held = held || ''
    connectPage.toggleAttribute('data-again', again)
    // an empty wallet says so from the start (mpages/connect.css), not "one credit for this turn" while it links
    connectPage.toggleAttribute('data-empty', state !== 'done' && st.credits <= 0)
    connect.querySelector('[data-connect-title]').innerHTML = again
      ? 'Machine <em>ready</em>'
      : state === 'done' ? 'Connected to <em>machine</em>' : 'Connect to <em>machine</em>'
    connect.querySelector('[data-connect-sub]').textContent = state === 'done' ? 'Get ready' : again ? 'Step up to the pad' : 'Please wait'
  }
  function finishConnect() {
    if (connect.dataset.state === 'done') return
    setConnect('done', st.credits > 0 ? 'yes' : 'no')
    if (st.credits <= 0) {
      // linked to the machine, but the wallet is empty: buy credits first, then come back here
      connect.querySelector('[data-connect-sub]').textContent = 'Add a credit to punch'
      later(() => go('topup', { from: 'connect' }), 2200)
      return
    }
    // the credit is held for this turn: a strike uses it, a cancel gives it back
    setCredits(st.credits - 1)
    reserved = true
    // linked and paid for: the tick lands, then Connected says so and sends the player to the pad (round nine)
    later(() => go('connected', { flow: true }), 800)
  }
  connect.addEventListener('click', finishConnect)

  /* ------------------------------------------------------------ connected (round nine)
     The link is made and the credit held: the page says so, names the machine and the next move, and goes on to Punch
     by itself after CONNECTED_MS, or at once on a tap anywhere but Cancel. It carries data-held (yes when a credit is
     held, no on a practice go from the page bar) and data-auto (run while it counts down, held while it waits for a tap:
     opened from the page bar, or held still while Customise changes one of its designs). mpages/connected.js draws the
     rest. Cancel frees the machine and gives the credit back, as it does on Punch. */
  const connectedPage = pages.connected
  const CONNECTED_MS = 2500
  connectedPage.style.setProperty('--cx-ms', `${CONNECTED_MS}ms`)
  function holdConnected() {
    clearTimers()
    connectedPage.dataset.auto = 'held'
  }
  connectedPage.addEventListener('click', (e) => {
    if (current !== 'connected' || e.target.closest('#mConnectedCancel')) return
    go('punch', { flow: true })
  })
  $('mConnectedCancel').addEventListener('click', () => freeMachine())

  /* ------------------------------------------------------------ punch on the machine
     Only the machine keeps time. The phone announces { start, seconds: 20, impactAt } and the glass counts the player
     down on its own; the phone shows no number, only where to look and that the link is live. The strike lands at
     impactAt (a simulation between five and twelve seconds in: the real machine reports its sensor), the phone jolts and
     shows the landed fist, then tells the glass to read the strike (its Reading screen, about two seconds) before the
     record or the result, and opens Your hit as the score comes up on the glass. Leaving stops every clock. */
  const punch = $('mPunch')
  const PUNCH_SECONDS = 20         // the machine's count; the phone keeps it only to know when time is up
  const TO_READING = 1200          // the landed fist, then the glass starts reading
  const READING = 2200 + 160 + 200 // the machine's Reading screen (loading.js: 2200 ms and a beat), and a breath
  const RECORD_HOLD = 6000         // how long the glass holds a new record before the result
  // the page says one thing (parts/mpage-punch.html): the title and its line, and in every design of the Machine
  // section the state of the link. No timer and no number: the glass has both. All copies follow the one state.
  const liveEl = $('mPunchLive'), cancelBtn = $('mPunchCancel')
  const each = (sel, fn) => punch.querySelectorAll(sel).forEach(fn)
  let reserved = false, run = null
  // round nine: the title "Punch on the machine" stays on screen through every state; only the line under it changes,
  // led by what just happened, and the link reads Connected while the machine waits for the strike
  const PUNCH_TITLE = 'Punch on the <em>machine</em>'
  const PUNCH_COPY = {
    wait: { sub: 'Look up at the glass and give the pad one full strike.', link: 'Connected' },
    landed: { sub: '<b>Great punch.</b> Keep your eyes up: your score comes up on the glass.', link: 'Hit received' },
    reading: { sub: '<b>Great punch.</b> The glass is reading your strike.', link: 'Reading your hit' },
    miss: { sub: '<b>Time is up.</b> No strike reached the pad, so your credit is kept.', link: 'Held for you' },
  }
  function setPunchState(state) {
    punch.dataset.state = state
    const c = PUNCH_COPY[state]
    each('[data-punch-title]', (el) => { if (el.innerHTML !== PUNCH_TITLE) el.innerHTML = PUNCH_TITLE })
    // a practice go (opened from the page bar, nothing held) has no credit to keep: the time-up line says nothing was charged
    const sub = state === 'miss' && !reserved ? '<b>Time is up.</b> No strike reached the pad. Nothing was charged.' : c.sub
    each('[data-punch-sub]', (el) => { el.innerHTML = sub })
    // nothing held on a practice go, so time up says the link is still there rather than holding a credit
    const link = state === 'miss' && !reserved ? 'Still connected' : c.link
    each('[data-punch-link]', (el) => { el.textContent = link })
    // after the strike there is nothing to cancel; after a miss the two buttons below say what happens next (and
    // Free the machine is the cancel), so Cancel shows only while waiting, held still by Customise or not
    cancelBtn.hidden = state !== 'wait'
  }
  // Customise is changing a design on this page: hold the page still so the choice can be seen, instead of letting the
  // strike carry the player on to Your hit. The page shows the wait (or stays at time up). Nothing is announced: the
  // glass keeps its own count. Try again, or opening the page again, starts a fresh run.
  document.addEventListener('psec', (e) => {
    const d = e.detail
    if (d.surface !== 'phone' || d.page !== 'punch' || d.initial || current !== 'punch') return
    if (run) { run.t.forEach(clearTimeout); run = null }
    punch.classList.remove('is-struck')
    setPunchState(punch.dataset.state === 'miss' ? 'miss' : 'wait')
  })
  function stopRun() {
    if (!run) return
    run.t.forEach(clearTimeout)
    run = null
  }
  function startRun(o = {}) {
    stopRun()
    const start = Date.now(), seconds = PUNCH_SECONDS
    // o.miss plays the time-up state: the simulation always lands, a real player sometimes walks away
    const impactAt = o.miss ? null : start + Math.round(5000 + Math.random() * 7000)
    run = { start, seconds, impactAt, t: [] }
    punch.classList.remove('is-struck')
    setPunchState('wait')
    announce('countdown', { start, seconds, impactAt })
    // the machine's clock is the one on show; the phone only needs to know the moment of the strike or of time up
    if (impactAt) run.t.push(setTimeout(strike, impactAt - start))
    run.t.push(setTimeout(miss, seconds * 1000 + 150))
    liveEl.textContent = 'Punch on the machine. Look up at the glass and give the pad one full strike.'
  }
  function strike() {
    if (!run) return
    run.t.forEach(clearTimeout)
    run.t = []
    // the strike uses the held credit
    reserved = false
    setPunchState('landed')
    punch.classList.remove('is-struck'); void punch.offsetWidth; punch.classList.add('is-struck')
    liveEl.textContent = 'Great punch. Your score comes up on the glass.'
    run.t.push(setTimeout(read, TO_READING))
  }
  function read() {
    if (!run) return
    const s = score
    // a record beats the best hit anyone else has landed on this machine (the Dubai board without Sara)
    const best = Math.max(0, ...Object.values(P).filter((p) => p.dubai && p.id !== 'me').map((p) => p.score))
    run.record = s > best
    setPunchState('reading')
    announce('loading', { next: run.record ? 'record' : 'result', score: s })
    run.t.push(setTimeout(land, READING))
  }
  function land() {
    const s = score, record = run && run.record
    stopRun()
    go('hit', { fresh: true, quiet: true })
    // the glass went from Reading to the record by itself; after the record it moves on to the result
    if (record) announceLater('result', { score: s }, RECORD_HOLD)
  }
  function miss() {
    if (!run) return
    stopRun()
    const hadFocus = punch.contains(document.activeElement)
    setPunchState('miss')
    // the machine keeps the turn for this phone while the player decides
    announce('scan', { page: 'punch', linked: true, holding: true, missed: true })
    liveEl.textContent = reserved ? 'No punch. The credit is kept.' : 'No punch. Nothing was charged.'
    if (hadFocus) $('mPunchRetry').focus({ preventScroll: true })
  }
  function freeMachine() {
    stopRun()
    const refund = reserved
    if (refund) { reserved = false; setCredits(st.credits + 1) }
    // back to the scan: that announces the scan screen, so the machine is free for the next in the queue
    go('scan')
    toast(refund ? 'Credit back in your wallet' : 'Machine free for the next player')
  }
  cancelBtn.addEventListener('click', freeMachine)
  $('mPunchFree').addEventListener('click', freeMachine)
  $('mPunchRetry').addEventListener('click', () => { startRun(); cancelBtn.focus({ preventScroll: true }) })

  /* ------------------------------------------------------------ your hit */
  let score = 999999, countRaf = 0
  // every design of the Score section (parts/mpage-hit.html) carries its own [data-app-score], grade and rank; they all
  // follow the one score, and the page's data-grade lights the Grade ladder
  const hitPage = pages.hit
  const scoreEls = [...hitPage.querySelectorAll('[data-app-score]')]
  const gradeKey = (s) => (s >= 900000 ? 'perfect' : s >= 600000 ? 'heavy' : s >= 300000 ? 'solid' : 'warm')
  /* the strike in numbers (docs/strategy/strike-in-numbers.md): one object per hit, which mpages/hit.js draws in the
     Stats section and the Replay's Contact moment. The pad's peak force in kg: the bell, 999,999, is 300 kg and the
     sensor reads on past it, so a bell hit keeps a kg of its own (Sara's is 315). Then the change on her last hit, her
     best before this one and where it was, her hits on this machine (from the same attempts her reel plays, hitsFor),
     the middle half of today's hits here, and the camera's reads. Rounded in one place: kg to 5, km/h to 1, and a change
     under a twentieth of the hit reads "about the same". Written to the page as data-strike, announced as "strike". */
  const BELL_KG = 300
  const kgOf = (s) => (s >= 999999 ? 315 : Math.round(((Math.max(0, s) / 999999) * BELL_KG) / 5) * 5)
  const kmhOf = (kg) => Math.round(20 + kg * 0.035)
  const dayOf = (when) => String(when).split(',')[0]
  function strikeOf(s) {
    const kg = kgOf(s)
    let hits = []
    try { hits = hitsFor(P.me) } catch { hits = [] }
    const here = hits[0] || { venue: 'Dubai Mall, Ground Level', machine: 'Machine by the ice rink' }
    const past = hits.slice(1).map((h) => ({ kg: kgOf(h.s), day: dayOf(h.when), venue: h.venue, here: h.venue === here.venue && h.machine === here.machine }))
    const last = past[0] || null
    const prev = past.reduce((b, h) => (!b || h.kg > b.kg ? h : b), null)
    const change = last ? kg - last.kg : null
    return {
      kg, bellKg: BELL_KG, past: Math.max(0, kg - BELL_KG),
      last: last ? { kg: last.kg, day: last.day, kmh: kmhOf(last.kg) } : null,
      change, same: change !== null && Math.abs(change) < kg / 20,
      best: prev ? { kg: prev.kg, where: prev.venue.split(',')[0], isNew: kg > prev.kg } : null,
      line: past.filter((h) => h.here).reverse().map((h) => ({ kg: h.kg, day: h.day })).concat([{ kg, day: 'Now', now: true }]),
      bandLo: 100, bandHi: 175, bandSettled: true, band: kg > 175 ? 'Well above' : kg >= 100 ? 'In the middle' : 'On the way up',
      kmh: kmhOf(kg), kmhOk: true, hand: 'Right hand', stepped: true, scanned: true,
    }
  }
  let strikeJSON = ''
  function paintStrike() {
    const json = JSON.stringify(strikeOf(score))
    if (json === strikeJSON) return
    strikeJSON = json
    hitPage.dataset.strike = json
    document.dispatchEvent(new CustomEvent('strike', { detail: JSON.parse(json) }))
  }
  function paintHit(value) {
    const html = ptsHTML(value), w = PF.width(score).toFixed(2)
    scoreEls.forEach((el) => { el.innerHTML = html; el.style.setProperty('--chars', w) })
    hitPage.querySelectorAll('[data-app-grade]').forEach((el) => { el.textContent = gradeFor(score) })
    hitPage.dataset.grade = gradeKey(score)
    app.style.setProperty('--charge', Math.max(0, Math.min(1, value / 1000000)))
    paintStrike()
  }
  function countHit() {
    cancelAnimationFrame(countRaf)
    // the size is set for the final score, so the number does not grow as it counts up
    const w = PF.width(score).toFixed(2)
    scoreEls.forEach((el) => el.style.setProperty('--chars', w))
    hitPage.querySelectorAll('[data-app-grade]').forEach((el) => { el.textContent = gradeFor(score) })
    hitPage.dataset.grade = gradeKey(score)
    paintStrike()
    if (reduced.matches) { paintHit(score); return }
    const start = performance.now(), dur = 1200
    app.style.setProperty('--charge', 0)
    const step = (now) => {
      const k = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - k, 3)
      const html = ptsHTML(score * e)
      scoreEls.forEach((el) => { el.innerHTML = html })
      if (k < 1) countRaf = requestAnimationFrame(step)
    }
    requestAnimationFrame(() => app.style.setProperty('--charge', Math.max(0, Math.min(1, score / 1000000))))
    countRaf = requestAnimationFrame(step)
    later(() => paintHit(score), dur + 300)
  }
  // every Replay design opens the reel of Sara's attempts on this hit: the video, the score, when and where
  hitPage.addEventListener('click', (e) => {
    const r = e.target.closest('[data-yh-replay]')
    if (r) { go('reel', { player: 'me', index: 0 }); return }
    const s = e.target.closest('[data-yh-share]')
    if (!s) return
    const how = s.dataset.yhShare
    if (how === 'feed') shareHit()
    else toast(how === 'story' ? 'Your hit is ready for your story' : how === 'link' ? 'Link to your hit copied' : how === 'save' ? 'Replay saved to your photos' : 'Dare sent. Link copied for your friends')
  })

  let shared = false
  function shareHit() {
    if (!shared) {
      shared = true
      POSTS.unshift({ id: 'mine', who: 'me', when: 'Just now', where: 'Dubai Mall, Ground Level', photo: P.me.photo, likes: 0, comments: 0, text: 'Rang the bell at Dubai Mall. Who is next?', following: true, nearby: true, fresh: true, mine: true })
    }
    feedFilter = 'all'
    syncFilters()
    go('feed')
    // bring the new post up under the header, so its score sits clear of the toast that confirms it
    const feed = pages.feed, post = $('mPosts').querySelector('[data-post="mine"]')
    if (post) feed.scrollTop = Math.max(0, post.offsetTop - parseFloat(getComputedStyle(feed).paddingTop))
    toast('Posted to your feed')
  }

  /* ------------------------------------------------------------ leaderboard */
  let scope = 'global', query = ''
  const board = $('mBoard')
  const inScope = (p) => (scope === 'global' ? true : scope === 'national' ? p.uae : p.dubai)
  const ranked = () => Object.values(P).filter(inScope).sort((a, b) => b.score - a.score).map((p, i) => ({ ...p, rank: i + 1 }))
  // the arrow carries the direction, the colour only repeats it; no movement shows nothing (the row's label says "no change")
  const delta = (d) => (d > 0 ? `<span class="m-delta up"><span data-icon="up"></span>${d}</span>` : d < 0 ? `<span class="m-delta down"><span data-icon="down"></span>${-d}</span>` : '<span class="m-delta same"></span>')
  const me = (p) => (p.id === 'me' ? ' m-is-me' : '')
  const deltaLabel = (d) => (d > 0 ? `up ${d}` : d < 0 ? `down ${-d}` : 'no change')
  const aria = (p) => `aria-label="Rank ${p.rank}, ${p.id === 'me' ? 'you, ' : ''}${p.name}, ${p.city}, ${ptsText(p.score)} points, ${deltaLabel(p.delta)}"`

  const ROW = {
    cards: (p) => `<button class="m-row m-rowbtn${p.rank <= 3 ? ' top' : ''}${me(p)}" type="button" data-go="profile" data-player="${p.id}" ${aria(p)}>
        <span class="m-rk">${p.rank}</span><img class="m-ava" src="${p.ava}" alt="" loading="lazy">
        <span class="m-who"><span class="m-name">${p.name}</span><span class="m-city">${p.city}</span></span>
        <span class="m-end"><span class="m-pts">${ptsHTML(p.score)}</span>${delta(p.delta)}</span></button>`,
    list: (p) => `<button class="m-row m-rowbtn${p.rank <= 3 ? ' top' : ''}${me(p)}" type="button" data-go="profile" data-player="${p.id}" ${aria(p)}>
        <span class="m-rk">${p.rank}</span><img class="m-ava" src="${p.ava}" alt="" loading="lazy">
        <span class="m-who"><span class="m-name">${p.name}</span><span class="m-city">${p.city}</span></span>
        <span class="m-end"><span class="m-pts">${ptsHTML(p.score)}</span>${delta(p.delta)}</span></button>`,
    tile: (p, cls = '') => `<button class="m-tile m-rowbtn${p.rank <= 3 ? ' top' : ''}${cls}${me(p)}" type="button" data-go="profile" data-player="${p.id}" ${aria(p)}>
        <img src="${p.board}" alt="" loading="lazy" style="object-position:${TILE_POS}"><span class="m-rk">${p.rank}</span>
        <span class="m-name">${p.name}</span><span class="m-city">${p.city}</span><span class="m-pts">${ptsHTML(p.score)}</span></button>`,
    meter: (p, top) => `<button class="m-row m-rowbtn${p.rank <= 3 ? ' top' : ''}${p.rank === 1 ? ' lead' : ''}${me(p)}" type="button" data-go="profile" data-player="${p.id}" ${aria(p)}>
        <span class="m-meter-top"><span class="m-rk">${p.rank}</span><span class="m-who"><span class="m-name">${p.name}</span><span class="m-city">${p.city}</span></span><span class="m-end"><span class="m-pts">${ptsHTML(p.score)}</span>${delta(p.delta)}</span></span>
        <span class="m-bar" aria-hidden="true"><i style="--w:${(p.score / top).toFixed(3)}"></i></span></button>`,
  }

  function renderBoard(animate) {
    const pick = window.PSec ? window.PSec.get('phone', 'ranks', 'board') : st.board
    const chosen = BOARD_STYLES[pick] ? BOARD_STYLES[pick].key : 'cards'
    const all = ranked()
    const q = query.trim().toLowerCase()
    const list = q ? all.filter((p) => p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q)) : all
    // search results keep the tiles and the meter; the champion banner and the podium stand for the top of the board,
    // so a search under those two lists its matches as cards
    const style = q && (chosen === 'champion' || chosen === 'podium') ? 'cards' : chosen
    board.dataset.style = style
    pages.ranks.querySelectorAll('[data-lb-clear]').forEach((c) => { c.hidden = !query })
    let html = ''
    if (!list.length) html = ''
    else if (style === 'cards') html = list.map(ROW.cards).join('')
    else if (style === 'champion') {
      const [c, ...rest] = list
      html = `<button class="m-champ m-rowbtn${me(c)}" type="button" data-go="profile" data-player="${c.id}" ${aria(c)}>
          <img class="m-ava" src="${c.ava}" alt="" loading="lazy">
          <span class="m-who"><span class="m-cap">${icon('crown').replace('<svg', '<svg width="16" height="16"')}Champion</span><span class="m-name">${c.name}</span><span class="m-pts">${ptsHTML(c.score)}</span><span class="m-city">${c.city}</span></span>
          <span class="m-champ-crown" data-icon="crown" aria-hidden="true"></span></button>` + rest.map(ROW.list).join('')
    } else if (style === 'podium') {
      const [a, b, c, ...rest] = list
      const step = (p, cls) => p ? `<button class="m-step m-rowbtn ${cls}${me(p)}" type="button" data-go="profile" data-player="${p.id}" ${aria(p)}>
          ${cls === 'first' ? '<span class="m-crown" data-icon="crown"></span>' : ''}<img class="m-ava" src="${p.ava}" alt="" loading="lazy">
          <span class="m-name">${p.name.split(' ')[0]}</span><span class="m-pts">${ptsHTML(p.score)}</span><span class="m-step-block">${p.rank}</span></button>` : '<span></span>'
      html = `<div class="m-podium">${step(b, 'second')}${step(a, 'first')}${step(c, 'third')}</div>` + rest.map(ROW.list).join('')
    } else if (style === 'tiles') {
      // only the leader of the board gets the wide tile, so a search never crowns someone further down
      html = list.map((p) => ROW.tile(p, p.rank === 1 ? ' first' : '')).join('')
    } else if (style === 'meter') {
      // every bar is measured against the leader of the board, searched or not
      const top = all[0].score
      html = list.map((p) => ROW.meter(p, top)).join('')
    }
    board.innerHTML = html
    paintIcons(board)
    $('mEmpty').hidden = list.length > 0
    if (animate && !reduced.matches) { board.classList.remove('is-changing'); void board.offsetWidth; board.classList.add('is-changing') }
    renderYou(all)
  }

  // Your place (a section of the page, Customise "This screen"): pinned above the tab bar in the design chosen for it.
  // The totals are the size of each board, so a rank reads against how many people it beat
  const SCOPE_TOTAL = { global: 412660, national: 8930, regional: 1204 }
  const SCOPE_RANK = { global: 'Global rank', national: 'United Arab Emirates rank', regional: 'Dubai rank' }
  const SCOPE_WHERE = { global: 'worldwide', national: 'in the UAE', regional: 'in Dubai' }
  const YOU_KINDS = ['row', 'gap', 'find', 'photo', 'pct']
  function renderYou(all) {
    const you = $('lbYou')
    if (!you) return
    const kind = YOU_KINDS[window.PSec ? window.PSec.get('phone', 'ranks', 'you') : 0] || 'row'
    const mine = all.find((p) => p.id === 'me'), i = all.indexOf(mine)
    const lead = i === 0, rival = lead ? all[1] : all[i - 1]
    const gap = rival ? Math.abs(rival.score - mine.score) : 0
    const total = SCOPE_TOTAL[scope], ahead = Math.max(0, total - mine.rank)
    const top = Math.max(1, Math.ceil((mine.rank / total) * 100))
    const label = `Your rank: ${mine.rank} ${SCOPE_WHERE[scope]}, ${ptsText(mine.score)} points. Open your profile`
    const btn = (cls, inner) => `<button class="lb-y ${cls}" type="button" data-go="profile" data-player="me" aria-label="${label}">${inner}</button>`
    let html
    if (kind === 'gap') {
      const first = rival ? rival.name.split(' ')[0] : ''
      html = btn('lb-y-gap', `<span class="lb-y-rank"><span class="m-cap">Rank</span><b>${mine.rank}</b></span>
        <span class="lb-y-copy"><b>${lead ? `Leading by <span class="m-pts">${ptsHTML(gap)}</span>` : `<span class="m-pts">${ptsHTML(gap)}</span> to pass ${first}`}</b>
          <span>${rival ? (lead ? `${rival.name} is closest behind` : `${rival.name} holds rank ${rival.rank}`) : 'Nobody else on this board yet'}</span></span>
        ${rival ? `<img class="m-ava lb-y-rival" src="${rival.ava}" alt="">` : ''}
        <span class="lb-y-race" aria-hidden="true"><i class="lb-y-race-you" style="--at:${lead ? 1 : 0.62}"><img src="${P.me.ava}" alt=""></i><i class="lb-y-race-them" style="--at:${lead ? 0.62 : 1}"></i></span>`)
    } else if (kind === 'find') {
      html = `<button class="lb-y lb-y-find" type="button" data-lb-find aria-label="Find your row on the board, rank ${mine.rank} ${SCOPE_WHERE[scope]}">
        <img class="m-ava" src="${P.me.ava}" alt=""><span class="lb-y-find-rk">${mine.rank}</span><span class="lb-y-find-t">Find me</span><span class="lb-y-find-i" data-lucide="locate-fixed"></span></button>`
    } else if (kind === 'photo') {
      html = btn('lb-y-photo', `<img class="lb-y-photo-img" src="assets/photos/header-sara.jpg" alt="">
        <span class="lb-y-photo-rk"><b>${mine.rank}</b></span>
        <span class="m-who"><span class="m-cap">${SCOPE_RANK[scope]}</span><span class="m-name">Sara Malik</span></span>
        <span class="m-end"><span class="m-pts">${ptsHTML(mine.score)}</span>${delta(mine.delta)}</span>`)
    } else if (kind === 'pct') {
      html = btn('lb-y-pct', `<span class="lb-y-top"><small>Top</small><b>${top}%</b></span>
        <span class="lb-y-copy"><b>Ahead of ${fmt(ahead)} punchers</b><span>Rank ${mine.rank} ${SCOPE_WHERE[scope]}</span></span>
        <span class="lb-y-scale" aria-hidden="true"><i style="--p:${(1 - mine.rank / total).toFixed(4)}"></i></span>`)
    } else {
      html = btn('lb-y-row', `<span class="m-rk">${mine.rank}</span><img class="m-ava" src="${P.me.ava}" alt="">
        <span class="m-who"><span class="m-name">You</span><span class="m-city">${SCOPE_RANK[scope]}</span></span>
        <span class="m-end"><span class="m-pts">${ptsHTML(mine.score)}</span>${delta(mine.delta)}</span>`)
    }
    you.dataset.kind = kind
    you.innerHTML = html
    paintIcons(you)
    you.dispatchEvent(new CustomEvent('lbyou', { bubbles: true }))
  }
  // scope and feed filters are one-of-three toggle buttons: the board below them is the same board, filtered. Every
  // Header design carries its own switch, and they all show the one scope
  function setScope(next, animate) {
    scope = next
    app.querySelectorAll('[data-scope]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.scope === scope)))
    renderBoard(animate)
    pages.ranks.dispatchEvent(new CustomEvent('lbscope', { detail: { scope, total: SCOPE_TOTAL[scope] } }))
  }
  app.querySelectorAll('[data-scope]').forEach((b) => b.addEventListener('click', () => setScope(b.dataset.scope, true)))
  // each Header design has its own search field; they keep one query between them
  const searches = () => [...pages.ranks.querySelectorAll('[data-lb-search]')]
  pages.ranks.addEventListener('input', (e) => {
    if (!e.target.matches('[data-lb-search]')) return
    query = e.target.value
    searches().forEach((f) => { if (f !== e.target) f.value = query })
    renderBoard(false)
  })
  // the clear button is the app's own, in the icon family, instead of the browser's cancel glyph
  pages.ranks.addEventListener('click', (e) => {
    const c = e.target.closest('[data-lb-clear]')
    if (!c) return
    query = ''
    searches().forEach((f) => { f.value = '' })
    renderBoard(false)
    const field = c.parentElement.querySelector('[data-lb-search]')
    if (field) field.focus({ preventScroll: true })
  })

  /* ------------------------------------------------------------ feed
     Stories, Filter, Posts and Sponsored each come in five designs (Customise, This screen). mpages/feed.js draws
     Stories and Posts from the model below (window.punchSocial.feed); Filter and Sponsored carry theirs in the markup.
     This file keeps the data and the state (the filter, likes, stories seen) and answers every tap but Save, which
     mpages/saved.js keeps for every screen. */
  let feedFilter = 'all'
  const liked = new Set()
  const first = (p) => p.name.split(' ')[0]
  function postScore(post) { return post.who === 'me' ? score : P[post.who].score }
  // For you is everything; Following reads the live follow list; Nearby is the UAE; Dubai Mall is the machine's own
  // community, everyone who punched by the rink
  const inFilter = (post) => (feedFilter === 'all' ? true
    : feedFilter === 'following' ? post.who === 'me' || following.has(post.who)
    : feedFilter === 'nearby' ? P[post.who].uae
    : /^Dubai Mall/.test(post.where))
  function feedPosts() {
    return POSTS.filter((post) => !post.ad && inFilter(post)).map((post) => {
      const p = P[post.who], s = postScore(post), on = liked.has(post.id), t = post.top && P[post.top[0]]
      return {
        id: post.id, player: p.id, mine: p.id === 'me', fresh: !!post.fresh,
        name: p.id === 'me' ? 'You' : p.name, first: p.id === 'me' ? 'You' : first(p), ava: p.ava,
        where: post.where, when: post.when, photo: post.photo, score: s, grade: gradeFor(s),
        // a post is its player's newest hit, so its save is that attempt's (mpages/saved.js marks it, key "who:0")
        likes: post.likes + (on ? 1 : 0), liked: on, saveKey: `${p.id}:0`, saved: savedHas(`${p.id}:0`), comments: post.comments, text: post.text,
        top: t ? { id: t.id, name: first(t), ava: t.ava, text: post.top[1] } : null,
        // three of the people who liked it, the same three every time for a post
        fans: Object.values(P).filter((q) => q.id !== p.id && q.id !== 'me').sort((a, b) => seedOf(post.id + a.id) - seedOf(post.id + b.id)).slice(0, 3).map((q) => ({ name: first(q), ava: q.ava })),
      }
    })
  }
  // a friend's story is their latest hit, told with a still of its own (their story shot), never the post's photo again
  function feedStories() {
    const latest = (id) => POSTS.find((x) => x.who === id)
    const me = { id: 'me', you: true, name: 'You', full: P.me.name, ava: P.me.ava, photo: P.me.story, score, when: 'Your hit', where: 'Dubai Mall, Ground Level', seen: false }
    return [me, ...STORIES.map((id) => {
      const p = P[id], post = latest(id)
      return { id, name: first(p), full: p.name, ava: p.ava, photo: p.story, score: p.score, when: post ? post.when : 'Today', where: post ? post.where : p.city, seen: SEEN.has(id) }
    })]
  }
  function renderStories() { if (window.punchFeedView) window.punchFeedView.stories() }
  function renderPosts() {
    if (window.punchFeedView) window.punchFeedView.posts()
    POSTS.forEach((p) => { p.fresh = false })
  }
  function toggleLike(id, force) {
    const on = force ?? !liked.has(id)
    on ? liked.add(id) : liked.delete(id)
    const post = POSTS.find((p) => p.id === id)
    if (!post) return
    const likes = post.likes + (on ? 1 : 0)
    // every design of a post carries its own like button (the sponsor's five sit in the markup): all of them follow
    $('mPosts').querySelectorAll(`[data-post="${id}"] [data-act="like"]`).forEach((btn) => {
      btn.classList.toggle('is-on', on)
      btn.setAttribute('aria-pressed', String(on))
      btn.setAttribute('aria-label', `Like, ${short(likes)} likes`)
      const ic = btn.querySelector('[data-icon]')
      if (ic) { ic.dataset.icon = on ? 'heartFill' : 'heart'; ic.innerHTML = icon(ic.dataset.icon) }
      btn.querySelectorAll('[data-likes]').forEach((n) => { n.textContent = short(likes) })
    })
  }
  $('mPosts').addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]'), holder = act && act.closest('[data-post]')
    if (!holder) return
    const id = holder.dataset.post
    if (act.dataset.act === 'like') toggleLike(id)
    // save (data-act="save" with data-save-key) is answered by mpages/saved.js before it reaches here
    else if (act.dataset.act === 'play') {
      // a replay still opens that player's reel at this hit
      const post = POSTS.find((p) => p.id === id)
      if (post && !post.ad) go('reel', { player: post.who, index: 0 })
    } else if (act.dataset.act === 'share') toast('Link to the replay copied')
    else if (act.dataset.act === 'comment') toast('Comments open in the full app')
    else if (act.dataset.act === 'claim') toast('Offer saved. Show it at the kiosk')
    else if (act.dataset.act === 'more') toast(id === 'ad-monster' ? 'Ad settings open in the full app' : 'Post options open in the full app')
  })
  // the feed header: search finds punchers on the leaderboard, notifications are for the full app
  $('mFeedSearch').addEventListener('click', () => {
    go('ranks')
    $('mSearch').focus({ preventScroll: true })
  })
  $('mBell').addEventListener('click', () => {
    const bell = $('mBell')
    bell.classList.remove('m-has-dot')
    bell.setAttribute('aria-label', 'Notifications')
    toast('Notifications open in the full app')
  })
  // double tap a photo to like it; a tap on a control inside the photo stays that control's
  $('mPosts').addEventListener('dblclick', (e) => {
    const media = e.target.closest('[data-like-target]')
    if (!media || e.target.closest('button')) return
    toggleLike(media.closest('[data-post]').dataset.post, true)
    const burst = media.querySelector('.m-burst')
    if (burst && !reduced.matches) { burst.classList.remove('go'); void burst.offsetWidth; burst.classList.add('go') }
  })
  function syncFilters() { app.querySelectorAll('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.filter === feedFilter))) }
  app.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => {
    feedFilter = b.dataset.filter
    syncFilters()
    renderPosts()
  }))
  // a friend's story, once opened, counts as seen
  $('mStories').addEventListener('click', (e) => {
    const b = e.target.closest('[data-player]')
    if (b && b.dataset.player !== 'me') SEEN.add(b.dataset.player)
  })
  // the drawing code for the feed and the profile (mpages/feed.js, mpages/profile.js) reads its models here
  window.punchSocial = {
    feed: () => ({ filter: feedFilter, stories: feedStories(), posts: feedPosts() }),
    profile: () => profileModel(),
    short,
    fmt,
  }

  /* ------------------------------------------------------------ profile
     Header, Stats, Hits and Badges each come in five designs (Customise, This screen), drawn by mpages/profile.js from
     profileModel() below (window.punchSocial.profile). This file keeps who is on show and who you follow, and answers
     the taps: a hit opens the reel, Follow and Challenge sit in every header design. */
  const following = new Set(['noor', 'leila', 'omar', 'rami'])
  // what each badge asks for (a score, a streak of days, attempts, or shares of a replay), with a Lucide icon and a
  // photograph from the library for the designs that show one (each one no other screen uses)
  const BADGES = [
    { icon: 'zap', name: 'Perfect punch', text: 'Rang the bell with a full charge.', kind: 'score', need: 900000, photo: 'boxer-67.jpg', pos: '58% 38%' },
    { icon: 'flame', name: 'Hot streak', text: 'A hit every day for a week.', kind: 'streak', need: 7, photo: 'dark-smoke-1.jpg', pos: '55% 70%' },
    { icon: 'crown', name: 'Machine king', text: 'Top of a machine for a whole day.', kind: 'score', need: 950000, photo: 'gloves-1.jpg', pos: '50% 55%' },
    { icon: 'hand-fist', name: 'Century', text: 'A hundred attempts on the machine.', kind: 'punches', need: 100, photo: 'gloves-wrap-1.jpg', pos: '45% 35%' },
    { icon: 'medal', name: 'City podium', text: 'Top three in your city.', kind: 'score', need: 890000, photo: 'dubai-night-14.jpg', pos: '50% 45%' },
    { icon: 'clapperboard', name: 'Slow motion star', text: 'A replay shared a hundred times.', kind: 'shares', need: 100, photo: 'phone-hand-3.jpg', pos: '45% 40%' },
  ]
  // the cover behind a player's header, one per player and used nowhere else: their city at night for the players
  // in Dubai and Abu Dhabi, a gym, an arcade or a texture from the photo library for everyone else
  const COVERS = {
    me: ['dubai-night-15.jpg', '50% 50%'], omar: ['dubai-night-26.jpg', '50% 40%'], noor: ['dubai-night-24.jpg', '50% 50%'],
    leila: ['dubai-night-17.jpg', '50% 50%'], yusuf: ['dubai-night-25.jpg', '50% 40%'], karim: ['city-day-1.jpg', '50% 50%'],
    zayd: ['gym-interior-1.jpg', '50% 40%'], lina: ['dark-floodlight-1.jpg', '25% 45%'], rami: ['dark-bokeh-1.jpg', '50% 50%'],
    hana: ['gym-interior-3.jpg', '35% 40%'], adam: ['gloves-wrap-3.jpg', '50% 40%'],
  }
  /* a player's attempts, newest first: the still from each replay, the score, when and where (the venue and which
     machine in it). Real venues in each player's city; dates count back from today, so "Today" is always today */
  const SPOTS = {
    me:    [['Dubai Mall, Ground Level', 'Machine by the ice rink'], ['Mall of the Emirates', 'Machine at Magic Planet'], ['City Walk, Dubai', 'Machine at Hub Zero']],
    zayd:  [['Boxpark Shoreditch, London', 'Machine by the east stairs'], ['Westfield Stratford City', 'Machine on the upper level'], ['Westfield London', 'Machine by the cinema']],
    lina:  [['Xanadú, Madrid', 'Machine by the snow dome'], ['Plenilunio, Madrid', 'Machine in the leisure zone'], ['La Vaguada, Madrid', 'Machine on the lower floor']],
    omar:  [['Dubai Mall, Ground Level', 'Machine by the ice rink'], ['Ibn Battuta Mall, Dubai', 'Machine in China Court'], ['Mall of the Emirates', 'Machine at Magic Planet']],
    noor:  [['Dubai Mall, Ground Level', 'Machine by the ice rink'], ['Dubai Festival City Mall', 'Machine on the waterfront'], ['City Walk, Dubai', 'Machine at Hub Zero']],
    rami:  [['ABC Verdun, Beirut', 'Machine on the top floor'], ['City Centre Beirut', 'Machine at Magic Planet'], ['Beirut Souks', 'Machine by the cinema']],
    yusuf: [['Sahara Centre, Sharjah', 'Machine at Adventureland'], ['City Centre Sharjah', 'Machine by the food court'], ['Dubai Mall, Ground Level', 'Machine by the ice rink']],
    hana:  [['Round1 Ikebukuro, Tokyo', 'Machine on the third floor'], ['Shibuya Parco, Tokyo', 'Machine on the rooftop'], ['Odaiba Decks, Tokyo', 'Machine at the arcade']],
    adam:  [['International Plaza, Tampa', 'Machine by the food court'], ['Westshore Plaza, Tampa', 'Machine at the arcade'], ['Ybor City, Tampa', 'Machine at the games bar']],
    leila: [['Dubai Mall, Ground Level', 'Machine by the ice rink'], ['Dubai Marina Mall', 'Machine by the cinema'], ['Mall of the Emirates', 'Machine at Magic Planet']],
    karim: [['Yas Mall, Abu Dhabi', 'Machine at the family zone'], ['The Galleria, Al Maryah Island', 'Machine on the ground floor'], ['Dubai Mall, Ground Level', 'Machine by the ice rink']],
  }
  const SPOT_OF = [0, 0, 1, 0, 2, 1, 0, 2, 1]
  // minutes back from the attempt before: a second go the same evening, then days and weeks apart
  const GAPS = [0, 47, 1260, 2950, 4300, 4420, 7100, 12500, 19800]
  const seedOf = (t) => { let h = 0; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h }
  const two = (n) => String(n).padStart(2, '0')
  // newest first, counted back from now and kept inside mall hours (ten in the morning to eleven at night), so the
  // order always holds and nothing lands at four in the morning; Sara's newest is the hit she has just landed
  function timeline(p, seed) {
    let t = Date.now() - (p.id === 'me' ? 3 : 55 + (seed % 90)) * 60000
    return GAPS.map((g, i) => {
      t -= (g + (g ? seed % 37 : 0)) * 60000
      const d = new Date(t)
      if (!(p.id === 'me' && i === 0)) {
        if (d.getHours() < 10) { d.setDate(d.getDate() - 1); d.setHours(21, d.getMinutes()) } else if (d.getHours() >= 23) d.setHours(22, d.getMinutes())
      }
      t = d.getTime()
      return d
    })
  }
  function whenOf(d) {
    const day0 = new Date(); day0.setHours(0, 0, 0, 0)
    const dayD = new Date(d); dayD.setHours(0, 0, 0, 0)
    const back = Math.round((day0 - dayD) / 86400000), time = `${two(d.getHours())}:${two(d.getMinutes())}`
    if (back <= 0) return `Today, ${time}`
    if (back === 1) return `Yesterday, ${time}`
    const day = `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`
    return back < 7 ? `${day}, ${time}` : day
  }
  function hitsFor(p) {
    const best = p.id === 'me' ? score : p.score
    // one hit per photograph in their shoot (three, six or nine), so no hit repeats another's still
    const pics = [p.photo, ...(MORE[p.id] || [])].slice(0, GAPS.length)
    const seed = seedOf(p.id), spots = SPOTS[p.id] || SPOTS.me, dates = timeline(p, seed)
    return pics.map((photo, i) => {
      const whole = Math.round(best * (1 - i * 0.043 - (i % 3) * 0.011) / 10) * 10
      const [venue, machine] = spots[SPOT_OF[i]]
      return {
        key: `${p.id}:${i}`, photo, crop: HIT_CROP,
        s: i === 0 ? best : PF.withDecimals(whole, `${p.id}:${i}`),
        when: whenOf(dates[i]), t: dates[i].getTime(),
        venue, machine,
        likes: Math.round(p.followers * 0.07 / (1 + i * 0.4)) + (seed % 37),
      }
    })
  }
  // a mirrored crop turns about the tile's centre line, so the flipped photo still covers the whole tile
  const cropStyle = (c) => `object-position:${c.pos};transform-origin:${c.flip ? '50% ' + c.pos.split(' ')[1] : c.pos};transform:scale(${c.flip ? -c.z : c.z}, ${c.z})`
  // everything the profile's designs show for the player on show
  function profileModel() {
    const p = P[profileId] || P.me, mine = p.id === 'me', best = mine ? score : p.score, seed = seedOf(p.id)
    const board = Object.values(P).sort((a, b) => (b.id === 'me' ? score : b.score) - (a.id === 'me' ? score : a.score))
    const rank = board.findIndex((x) => x.id === p.id) + 1
    const cityRank = board.filter((x) => x.city === p.city).findIndex((x) => x.id === p.id) + 1
    const isFollowing = following.has(p.id)
    const streak = mine ? 6 : 1 + (seed % 9)
    // the last seven days, oldest first: the streak fills the end, the day before it is a miss, earlier days vary
    const week = Array.from({ length: 7 }, (_, i) => { const back = 6 - i; return back < streak || (back > streak && ((seed >> back) & 1) === 1) })
    const shares = Math.round(p.followers / 40)
    const have = { score: best, streak, punches: p.punches, shares }
    const badges = BADGES.map((b) => {
      const v = have[b.kind], got = v >= b.need, gap = Math.max(0, b.need - v)
      const left = got ? 'Earned' : b.kind === 'score' ? `${fmt(gap)} points to go` : b.kind === 'streak' ? (gap === 1 ? 'One more day' : `${gap} more days`) : b.kind === 'punches' ? `${gap} more attempts` : `${gap} more shares`
      return { ...b, got, pct: Math.max(0, Math.min(1, v / b.need)), left }
    })
    const hits = hitsFor(p).map((h, i) => ({ ...h, i, top: i === 0, grade: gradeFor(h.s), style: cropStyle(h.crop) }))
    const cover = COVERS[p.id] || COVERS.me
    return {
      id: p.id, mine, name: p.name, first: first(p), handle: p.handle, city: p.city, ava: p.ava, photo: p.portrait,
      cover: { src: `assets/photos/lib/${cover[0]}`, pos: cover[1] },
      rank, cityRank, best, grade: gradeFor(best), punches: p.punches, followers: p.followers + (isFollowing && !mine ? 1 : 0),
      following: isFollowing, streak, week, hits, badges, credits: st.credits,
    }
  }
  // the bar is this file's; the sections are drawn by mpages/profile.js (all of them, or only the one named)
  function renderProfile(only) {
    const p = P[profileId] || P.me
    $('mProfileHandle').textContent = p.handle
    $('mProfileBack').style.visibility = history.length ? 'visible' : 'hidden'
    if (window.punchProfileView) window.punchProfileView.draw(only)
  }
  // each hit opens the reel of this player's attempts at that hit
  $('mHits').addEventListener('click', (e) => {
    const b = e.target.closest('[data-reel]')
    if (b) go('reel', { player: profileId, index: +b.dataset.reel })
  })
  // Follow (Edit profile on your own) and Challenge (Share profile) are drawn in every header design
  pages.profile.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pact]')
    if (!b) return
    const p = P[profileId]
    if (b.dataset.pact === 'challenge') { toast(!p || p.id === 'me' ? 'Profile link copied' : `Challenge sent to ${first(p)}`); return }
    if (!p || p.id === 'me') { toast('Editing opens in the full app'); return }
    const had = document.activeElement === b
    following.has(p.id) ? following.delete(p.id) : following.add(p.id)
    renderProfile('header')
    if (had) pages.profile.querySelector('[data-pact="follow"]')?.focus({ preventScroll: true })
    toast(following.has(p.id) ? `You follow ${first(p)}` : `Unfollowed ${first(p)}`)
  })
  $('mProfileBack').addEventListener('click', () => {
    const prev = history.pop()
    if (prev) go(prev.page, { player: prev.player, back: true, keepScroll: true })
  })
  $('mProfileMore').addEventListener('click', () => {
    const p = P[profileId]
    toast(!p || p.id === 'me' ? 'Settings open in the full app' : 'Profile options open in the full app')
  })

  /* ------------------------------------------------------------ the reel
     Attempts full screen, one per screen, without end: the player's own attempts first (opened from a hit on a profile
     or from the replay card on Your hit), then everyone's, more loading as you near the end. The feed is a scroll snap
     list, so a touch swipe scrolls natively; the wheel, a mouse drag and the arrow keys move one attempt at a time.
     Every attempt is drawn from the page's three sections (Customise, This screen): Overlay (the player, the score,
     when and where), Actions (like, comment, share, the three dots) and Progress (the clip and its slow motion). One
     animation per clip drives the registered property --rp from 0 to 1, and every progress design reads it.
     The settings sheet, the three dots menu and the comments live in mpages/reel.js and reach the feed through
     window.punchReel; the settings arrive here as data attributes on #mReel (data-autoplay, data-slowmo, ...).
     Round nine: punch videos (it.video) play in place of a still, on their own clock; the header's view switch shows
     the same list as a grid (the fourth section, Grid); a save on the rail belongs to mpages/saved.js (data-save-key),
     and a save marks the attempt for later (mpages/saved.js, data-save-key). */
  const reelEl = $('mReel'), feed = $('mReelTrack'), reelLive = $('mReelLive')
  const reelLiked = new Set(), reelHidden = new Set(), reelAdded = {}, reelExtra = []
  let reel = null
  const REEL_BATCH = 8
  const REEL_SEC = {
    overlay: ['veil', 'card', 'headline', 'ticket', 'corner'],
    actions: ['rail', 'bubbles', 'capsule', 'bar', 'split'],
    progress: ['scrubber', 'ramp', 'phases', 'ring', 'edge'],
    grid: ['tiles', 'cards', 'mosaic', 'strip', 'sheet'],
  }
  const reelKey = (sec) => REEL_SEC[sec][window.PSec ? window.PSec.get('phone', 'reel', sec) : 0] || REEL_SEC[sec][0]
  const rpref = (k) => reelEl.dataset[k] !== 'off'
  // the full screen keeps each replay's framing but pushes in half as far as the small tile does
  const reelCrop = (c) => ({ ...c, z: 1 + (c.z - 1) * 0.5 })
  // the clip: the wind up at real speed, the strike, the strike again at a quarter speed, then the score. Slow motion
  // off plays it straight through in half the time
  const PHASES = {
    slow: [['wind', 'Wind up', 0, 0.3], ['strike', 'Strike', 0.3, 0.12], ['slow', 'Slow motion', 0.42, 0.42], ['score', 'Score', 0.84, 0.16]],
    real: [['wind', 'Wind up', 0, 0.45], ['strike', 'Strike', 0.45, 0.2], ['score', 'Score', 0.65, 0.35]],
  }
  const CAPTION = { wind: '[the crowd counts down]', strike: '[glove hits the pad]', slow: '[the bell rings]', score: '[cheering]' }
  const clipMs = () => (rpref('slowmo') ? 6000 : 3000)
  const phasesNow = () => PHASES[rpref('slowmo') ? 'slow' : 'real']
  const clock = (ms) => `0:${two(Math.min(9, Math.floor(ms / 1000)))}`
  // a punch video (assets/video/lib, added by mpages/reel.js) plays its own footage: the phases are read off the clip
  // around its strike, and with slow motion on the strike itself plays at a quarter speed. The progress follows the
  // video's own clock, so the bar slows through the slow motion stretch as the picture does
  const SLOW_RATE = 0.25
  function vidPhases(vd) {
    const d = vd.dur, s = Math.min(Math.max(vd.strike, 0.5), d - 0.5)
    if (rpref('slowmo')) {
      const a = Math.max(0.2, s - 0.35), b = Math.max(a + 0.1, s - 0.05), c = Math.min(d - 0.2, s + 0.6)
      return [['wind', 'Wind up', 0, a / d], ['strike', 'Strike', a / d, (b - a) / d], ['slow', 'Slow motion', b / d, (c - b) / d], ['score', 'Score', c / d, (d - c) / d]]
    }
    const a = Math.max(0.2, s - 0.2), c = Math.min(d - 0.2, s + 0.35)
    return [['wind', 'Wind up', 0, a / d], ['strike', 'Strike', a / d, (c - a) / d], ['score', 'Score', c / d, (d - c) / d]]
  }
  const phasesOf = (it) => (it && it.video ? vidPhases(it.video) : phasesNow())
  // seconds on the viewer's clock for a point in the video: the slow stretch takes four times as long to watch
  function vidWall(it, t) {
    const d = it.video.dur, sl = phasesOf(it).find((x) => x[0] === 'slow')
    if (!sl) return t
    const a = sl[2] * d, b = (sl[2] + sl[3]) * d
    return t < a ? t : t < b ? a + (t - a) / SLOW_RATE : a + (b - a) / SLOW_RATE + (t - b)
  }
  const clipLenMs = (it) => (it && it.video ? vidWall(it, it.video.dur) * 1000 : clipMs())
  const COMMENT_LINES = [
    'That bell never stood a chance.', 'Hips first, then the glove. Textbook.', 'Rematch on Friday, same machine?',
    'The slow motion on this one is unreal.', 'How is that only a warm up?', 'Teach me that stance.',
    'Ground Level is going to need a new pad.', 'Watched it five times. Still flinching.', 'Clean. Straight through the target.',
  ]

  // everyone's attempts come after the player's own: the people on the board, then the reel's own crowd from the photo
  // library (mpages/reel.js). Every attempt is a photograph of its own from that player's shoot, so nobody's replay
  // borrows another face and no still repeats: each pass deals every strike in the pool once, in a fresh order, never
  // the same player twice running, and nothing comes round again until the whole pool (some fifty strikes) has played
  function reelOwn(p) {
    return hitsFor(p).map((h, k) => ({ ...h, p, own: true, best: k === 0, comments: Math.round(h.likes * 0.09) + 2 + (seedOf(h.key) % 5) }))
  }
  // hits whose still is a guard or a curl rather than a strike: they stay on the profile and in that player's own reel,
  // and everyone else's attempts play strikes only
  const GUARD = new Set(['7777432', '6456229', '8472153', '3927024', '7289296', '7289293', '7289301'])
  const idOf = (src) => src.replace(/^.*\/|\.jpg$/g, '')
  const strikesOf = (p) => p.shots || [p.photo, ...(MORE[p.id] || [])].filter((src) => !GUARD.has(idOf(src))).map((photo) => ({ photo, crop: HIT_CROP }))
  // seedOf keeps near strings near, so the deal scrambles it (a 32 bit finaliser) before it orders the cards
  const mix = (h) => { h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); return (h ^ (h >>> 16)) >>> 0 }
  // the punch videos take every other place in a pass while they last, so the moving clips run through the stills
  function reelDeal(round) {
    const cards = []
    for (const p of [...Object.values(P), ...reelExtra]) {
      if (p.id !== reel.p.id) strikesOf(p).forEach((s, k) => cards.push({ p, ...s, seed: mix(seedOf(`${p.id}/${k}/${round}`)) }))
    }
    cards.sort((a, b) => a.seed - b.seed)
    const vids = cards.filter((c) => c.video), stills = cards.filter((c) => !c.video), out = []
    while (vids.length || stills.length) { if (vids.length) out.push(vids.shift()); if (stills.length) out.push(stills.shift()) }
    return out
  }
  function reelEveryone(c) {
    const last = reel.items.length ? reel.items[reel.items.length - 1].p.id : reel.p.id
    const pick = () => {
      const k = reel.queue.findIndex((x) => !reelHidden.has(x.p.id) && x.p.id !== last)
      return k >= 0 ? k : reel.queue.findIndex((x) => !reelHidden.has(x.p.id))
    }
    let k = pick()
    if (k < 0) { reel.queue = reelDeal(reel.round++); k = pick() }
    if (k < 0) return null
    const card = reel.queue.splice(k, 1)[0], round = Math.max(0, reel.round - 1)
    return attemptOf(card, c, round)
  }
  // one of everyone's attempts from a card of the deal: c is its place in the feed (how long ago it was), round the pass
  function attemptOf(card, c, round) {
    // the key names the attempt by its player, its still or clip and the pass, so a save or a like finds the same
    // attempt again in any later reel
    const p = card.p, key = `${p.id}@${idOf(card.video ? card.video.poster : card.photo)}.${round}`, seed = seedOf(key)
    const best = p.id === 'me' ? score : p.score
    const whole = Math.max(120000, Math.round(best * (1 - round * 0.027 - (seed % 11) * 0.011) / 10) * 10)
    const spots = p.spots || SPOTS[p.id] || SPOTS.me
    const [venue, machine] = spots[seed % spots.length]
    // counted back from now, kept inside mall hours
    const d = new Date(Date.now() - (25 + c * 71 + (seed % 55)) * 60000)
    if (d.getHours() < 10) { d.setDate(d.getDate() - 1); d.setHours(21, d.getMinutes()) } else if (d.getHours() >= 23) d.setHours(22, d.getMinutes())
    const likes = Math.round((p.followers || 1500) * 0.06 / (1 + round * 0.35)) + (seed % 140)
    return {
      key, p, photo: card.photo, crop: card.crop, video: card.video || null,
      s: PF.withDecimals(Math.min(whole, 999990), key), when: whenOf(d), t: d.getTime(), venue, machine,
      likes, comments: Math.round(likes * 0.07) + (seed % 9), own: false, best: false,
    }
  }
  function reelComments(it) {
    const seed = seedOf(it.key)
    const people = [...Object.values(P), ...reelExtra].filter((x) => x.id !== it.p.id && x.id !== 'me')
    const base = [0, 1, 2, 3].map((k) => {
      const who = people[(seed + k * 5) % people.length]
      return { name: who.name, ava: who.ava, avaStyle: who.avaStyle || '', mono: who.mono || '', text: COMMENT_LINES[(seed + k * 4) % COMMENT_LINES.length], when: `${(k + 1) * 7 + (seed % 5)} min` }
    })
    return [...(reelAdded[it.key] || []), ...base]
  }
  const reelCount = (it) => it.comments + (reelAdded[it.key] || []).length

  /* the three sections' designs */
  function reelWho(it) {
    const p = it.p, onBoard = !!P[p.id], f = following.has(p.id)
    const ava = `<span class="rl-ava" data-mono="${p.mono || ''}"><img src="${p.ava}" alt="" style="${p.avaStyle || ''}"></span>`
    const names = `<span class="rl-names"><span class="rl-name">${p.name}</span><span class="rl-handle">${p.handle}</span></span>`
    const who = onBoard
      ? `<button class="rl-who" type="button" data-ract="profile" aria-label="Open the profile of ${p.name}">${ava}${names}</button>`
      : `<span class="rl-who">${ava}${names}</span>`
    const follow = p.id === 'me' ? '' : `<button class="rl-follow${f ? ' is-on' : ''}" type="button" data-ract="follow" aria-pressed="${f}"><span>${f ? 'Following' : 'Follow'}</span></button>`
    return `<div class="rl-byline">${who}${follow}</div>`
  }
  const rlScore = (it) => `<p class="rl-score" style="--chars:${PF.width(it.s).toFixed(2)}">${ptsHTML(it.s)}</p>`
  const rlGrade = (it) => `<p class="rl-grade">${gradeFor(it.s)}</p>`
  const rlBest = (it) => (it.best ? '<p class="rl-best"><span data-icon="crown"></span>Personal best</p>' : '')
  const rlMeta = (it) => `<ul class="rl-meta"><li><span data-icon="clock"></span><span>${it.when}</span></li><li><span data-icon="pin"></span><span>${it.venue}<span class="rl-machine">${it.machine}</span></span></li></ul>`
  const spotOf = (m) => { const s = m.replace(/^Machine /, ''); return s.charAt(0).toUpperCase() + s.slice(1) }
  function reelOverlay(it) {
    const k = reelKey('overlay')
    if (k === 'card') {
      return `<div class="rl-ov rl-ov-card" data-part="overlay"><div class="rl-card">${reelWho(it)}<div class="rl-card-score">${rlBest(it)}${rlGrade(it)}${rlScore(it)}</div>
        <dl class="rl-fields"><div><dt>When</dt><dd>${it.when}</dd></div><div><dt>Where</dt><dd>${it.venue}<span class="rl-machine">${it.machine}</span></dd></div></dl></div></div>`
    }
    if (k === 'headline') {
      return `<div class="rl-ov rl-ov-head" data-part="overlay"><div class="rl-head-top">${reelWho(it)}
        <div class="rl-chips"><span class="rl-chip"><span data-icon="clock"></span>${it.when}</span><span class="rl-chip"><span data-icon="pin"></span>${it.venue}</span><span class="rl-chip rl-chip-quiet">${it.machine}</span></div></div>
        <div class="rl-head-foot">${rlBest(it)}${rlGrade(it)}${rlScore(it)}</div></div>`
    }
    if (k === 'ticket') {
      return `<div class="rl-ov rl-ov-ticket" data-part="overlay">${reelWho(it)}<div class="rl-ticket"><div class="rl-t-main">${rlBest(it)}${rlGrade(it)}${rlScore(it)}</div>
        <dl class="rl-t-stub"><div><dt>When</dt><dd>${it.when}</dd></div><div><dt>Venue</dt><dd>${it.venue}</dd></div><div><dt>Machine</dt><dd>${spotOf(it.machine)}</dd></div></dl></div></div>`
    }
    if (k === 'corner') return `<div class="rl-ov rl-ov-corner" data-part="overlay">${reelWho(it)}<div class="rl-corner">${rlBest(it)}${rlGrade(it)}${rlScore(it)}${rlMeta(it)}</div></div>`
    return `<div class="rl-ov rl-ov-veil" data-part="overlay">${reelWho(it)}${rlBest(it)}${rlGrade(it)}${rlScore(it)}${rlMeta(it)}</div>`
  }
  function reelLikeHTML(it) {
    const on = reelLiked.has(it.key), likes = it.likes + (on ? 1 : 0)
    return `<button class="rl-act${on ? ' is-on' : ''}" type="button" data-ract="like" aria-pressed="${on}" aria-label="Like, ${short(likes)} likes"><span class="rl-act-i" data-icon="${on ? 'heartFill' : 'heart'}"></span><span class="rl-act-n">${short(likes)}</span></button>`
  }
  // save for later (mpages/saved.js answers the tap); every save button carries data-save-key
  const savedHas = (key) => !!(window.punchSaved && window.punchSaved.has(key))
  function reelSaveHTML(it) {
    const on = savedHas(it.key)
    return `<button class="rl-act rl-act-save${on ? ' is-on' : ''}" type="button" data-ract="save" data-save-key="${it.key}" aria-pressed="${on}" aria-label="${on ? 'Saved. Tap to remove' : 'Save this hit for later'}"><span class="rl-act-i" data-lucide="bookmark"></span><span class="rl-act-n" data-save-label>${on ? 'Saved' : 'Save'}</span></button>`
  }
  // one column of equal cells: the icon, then its count or its name under it, the same for all five
  function reelActions(it) {
    const n = reelCount(it)
    return `<div class="rl-acts rl-acts-${reelKey('actions')}" data-part="actions">${reelLikeHTML(it)}
      <button class="rl-act" type="button" data-ract="comment" aria-haspopup="dialog" aria-label="Comments, ${n}"><span class="rl-act-i" data-lucide="message-circle"></span><span class="rl-act-n">${short(n)}</span></button>
      ${reelSaveHTML(it)}
      <button class="rl-act" type="button" data-ract="share" aria-label="Share this attempt"><span class="rl-act-i" data-lucide="share-2"></span><span class="rl-act-n">Share</span></button>
      <button class="rl-act rl-act-more" type="button" data-ract="more" aria-haspopup="dialog" aria-label="More for this attempt"><span class="rl-act-i" data-lucide="circle-ellipsis"></span><span class="rl-act-n">More</span></button></div>`
  }
  // the slow motion dip of the speed ramp, drawn where the clip's slow stretch falls (0 to 100 across the plot)
  function rampPath(slow) {
    if (!slow) return 'M0 6 H100'
    const r = (n) => Math.round(Math.min(100, Math.max(0, n)) * 10) / 10
    const x1 = slow[2] * 100, x2 = (slow[2] + slow[3]) * 100
    return `M0 6 H${r(x1 - 15)} C${r(x1 - 9)} 6 ${r(x1 - 7)} 25 ${r(x1)} 25 H${r(x2 - 1)} C${r(x2 + 4)} 25 ${r(x2 + 5)} 6 ${r(x2 + 11)} 6 H100`
  }
  function reelProgress(it) {
    const k = reelKey('progress'), ph = phasesOf(it), total = clock(clipLenMs(it)), slow = ph.find((x) => x[0] === 'slow')
    const style = slow ? `--sa:${slow[2]};--sw:${slow[3]}` : '--sa:0;--sw:0'
    const play = '<button class="rl-play" type="button" data-ract="play" aria-label="Pause the replay"><span data-icon="pause"></span></button>'
    const now = '<span class="rl-now">0:00</span>', tot = `<span class="rl-tot">${total}</span>`
    const speed = '<span class="rl-speed"><span data-lucide="timer"></span><span class="rl-speed-t">1x</span></span>'
    if (k === 'ramp') {
      const d = rampPath(slow)
      const svg = (c) => `<svg class="${c}" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="rl-ramp-area" d="${d} V30 H0 Z"/><path class="rl-ramp-line" d="${d}" vector-effect="non-scaling-stroke"/></svg>`
      return `<div class="rl-prog rl-prog-ramp" data-part="progress" style="${style}">${play}<div class="rl-ramp"><span class="rl-ramp-y" aria-hidden="true"><i>1x</i>${slow ? '<i>0.25x</i>' : ''}</span>
        <span class="rl-ramp-plot">${svg('rl-ramp-dim')}<span class="rl-ramp-lit">${svg('')}</span><span class="rl-ramp-head"></span></span></div><span class="rl-ramp-t">${now}${tot}</span></div>`
    }
    if (k === 'phases') {
      return `<div class="rl-prog rl-prog-phases" data-part="progress" style="${style}">${play}<ol class="rl-phases" aria-label="The clip">${ph.map(([key, name, a, w]) => `<li data-ph="${key}" style="--a:${a};--w:${w}"><span class="rl-ph-bar"><i></i></span><span class="rl-ph-name">${name}</span></li>`).join('')}</ol></div>`
    }
    if (k === 'ring') {
      const c = (cls, extra = '') => `<circle class="${cls}" cx="28" cy="28" r="25" pathLength="100"${extra}/>`
      return `<div class="rl-prog rl-prog-ring" data-part="progress" style="${style}"><span class="rl-ringwrap"><svg class="rl-ring" viewBox="0 0 56 56" aria-hidden="true" focusable="false">${c('rl-ring-track')}${slow ? c('rl-ring-slow', ` stroke-dasharray="${slow[3] * 100} 100" stroke-dashoffset="${-slow[2] * 100}"`) : ''}${c('rl-ring-fill')}</svg>${play}</span>
        <span class="rl-ring-txt">${now}<span class="rl-of">of ${total}</span></span>${speed}</div>`
    }
    if (k === 'edge') return `<div class="rl-prog rl-prog-edge" data-part="progress" style="${style}">${play}${now}${speed}<span class="rl-edge" aria-hidden="true"><span class="rl-edge-slow"></span><span class="rl-edge-fill"></span></span></div>`
    return `<div class="rl-prog rl-prog-scrub" data-part="progress" style="${style}">${play}${now}<span class="rl-bar" aria-hidden="true"><span class="rl-bar-slow"></span><span class="rl-bar-fill"></span><span class="rl-bar-knob"></span></span>${tot}${speed}</div>`
  }
  // a still, or a punch video: muted, looping, inline, nothing loaded until it comes into view (the poster is the strike)
  function reelMedia(it, i) {
    const p = it.p
    if (it.video) {
      return `<div class="m-reel-media is-video"><video class="rl-video" muted loop playsinline disablepictureinpicture preload="none" poster="${it.video.poster}" src="${it.video.v}" style="object-position:${it.video.focal}" aria-label="${p.name} throwing a punch"></video></div>`
    }
    return `<div class="m-reel-media"><img src="${it.photo}" alt="${p.name} at the punch machine" loading="${Math.abs(i - Math.max(0, reel.i)) > 1 ? 'lazy' : 'eager'}" decoding="async" style="${cropStyle(reelCrop(it.crop))}"></div>`
  }
  function reelSlide(it, i) {
    const p = it.p
    return `<article class="m-reel-slide" data-i="${i}" data-who="${p.id}"${it.video ? ' data-video' : ''} aria-roledescription="slide" aria-label="${p.name}, ${ptsText(it.s)} points" aria-hidden="true" inert>
      ${reelMedia(it, i)}
      <span class="m-reel-veil" aria-hidden="true"></span>
      <span class="m-reel-big" aria-hidden="true"><span data-icon="play"></span></span>
      <span class="m-burst" data-icon="heartFill" aria-hidden="true"></span>
      <p class="rl-cap" aria-hidden="true"></p>
      <p class="rl-saver" aria-hidden="true"><span data-lucide="arrow-down-to-line"></span>Tap play to load the replay</p>
      ${reelOverlay(it)}${reelActions(it)}${reelProgress(it)}
    </article>`
  }
  function reelDesigns() {
    reelEl.dataset.ov = reelKey('overlay')
    reelEl.dataset.ra = reelKey('actions')
    reelEl.dataset.rp = reelKey('progress')
  }
  // a design change (Customise) or a setting that changes the clip redraws the three parts of every attempt in place;
  // the photos, the likes and the place in the feed stay as they are
  function reelRedraw() {
    if (!reel) return
    reelDesigns()
    ;[...feed.children].forEach((el) => {
      const it = reel.items[+el.dataset.i]
      el.querySelectorAll('[data-part]').forEach((n) => n.remove())
      el.insertAdjacentHTML('beforeend', reelOverlay(it) + reelActions(it) + reelProgress(it))
      el.dataset.phase = ''
    })
    paintIcons(feed)
    reelGridDraw()
    const el = feed.children[reel.i]
    if (el) {
      reelPlayUI(el, reel.playing)
      reelTick()
      // the new design settles into place on the attempt in view (mpages/reel.css, rl-in)
      el.classList.remove('rl-fresh'); void el.offsetWidth; el.classList.add('rl-fresh')
      clearTimeout(reel.freshT)
      reel.freshT = setTimeout(() => el.classList.remove('rl-fresh'), 450)
    }
  }

  /* the grid: the same endless list, two to a row, about four on screen (Customise, This screen, Grid). A tap opens the
     full view at that attempt; the videos in view play muted while autoplay allows it. The view is kept per viewer */
  const reelGrid = $('mReelGrid'), reelGridList = $('mReelGridList')
  const gridFirst = (p) => (p.id === 'me' ? 'You' : p.name.split(' ')[0])
  function reelTile(it, i) {
    const p = it.p
    const media = it.video
      ? `<video class="rg-video" muted loop playsinline disablepictureinpicture preload="none" poster="${it.video.poster}" src="${it.video.v}" style="object-position:${it.video.focal}" aria-hidden="true"></video>`
      : `<img src="${it.photo}" alt="" loading="lazy" decoding="async" style="${cropStyle(it.crop)}">`
    const mark = it.video ? '<span class="rg-mark" aria-hidden="true"><span data-lucide="play"></span></span>' : ''
    return `<li class="rg-item" data-i="${i}"><button class="rg-tile" type="button" data-rg="${i}"${i === reel.i ? ' aria-current="true"' : ''} aria-label="${p.name}, ${ptsText(it.s)} points, ${it.when}${it.video ? ', video' : ''}. Open full screen">
      <span class="rg-media">${media}</span><span class="rg-shade" aria-hidden="true"></span>${mark}
      <span class="rg-who"><span class="rg-ava" data-mono="${p.mono || ''}"><img src="${p.ava}" alt="" style="${p.avaStyle || ''}"></span><span class="rg-name">${gridFirst(p)}</span></span>
      <span class="rg-foot"><span class="rg-grade">${gradeFor(it.s)}</span><span class="rg-score" style="--chars:${PF.width(it.s).toFixed(2)}">${ptsHTML(it.s)}</span><span class="rg-when">${it.when}</span></span>
    </button></li>`
  }
  const gridCanPlay = () => reelEl.dataset.view === 'grid' && current === 'reel' && rpref('autoplay') && reelEl.dataset.saver !== 'on' && !reduced.matches
  const gridIO = 'IntersectionObserver' in window ? new IntersectionObserver((ents) => {
    for (const e of ents) {
      const v = e.target
      if (e.isIntersecting && gridCanPlay()) { v.preload = 'auto'; const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}) } else v.pause()
    }
  }, { root: reelGrid, threshold: 0.6 }) : null
  function gridWatch(root) { if (gridIO) root.querySelectorAll('video').forEach((v) => gridIO.observe(v)) }
  function gridPauseAll() { reelGridList.querySelectorAll('video').forEach((v) => v.pause()) }
  // the tiles in view start again when the grid comes back (the observer only speaks when a tile crosses the edge)
  function gridPlayVisible() {
    if (!gridCanPlay()) { gridPauseAll(); return }
    const gr = reelGrid.getBoundingClientRect()
    reelGridList.querySelectorAll('video').forEach((v) => {
      const r = v.getBoundingClientRect(), seen = Math.min(r.bottom, gr.bottom) - Math.max(r.top, gr.top)
      if (seen > r.height * 0.6) { v.preload = 'auto'; const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}) } else v.pause()
    })
  }
  function reelGridAdd(from) {
    if (!reel) return
    reelGridList.dataset.design = reelKey('grid')
    reelGridList.insertAdjacentHTML('beforeend', reel.items.slice(from).map((it, k) => reelTile(it, from + k)).join(''))
    paintIcons(reelGridList)
    gridWatch(reelGridList)
  }
  function reelGridDraw() {
    if (!reel) return
    const top = reelGrid.scrollTop
    reelGridList.innerHTML = ''
    reelGridAdd(0)
    reelGrid.scrollTop = top
    if (reelEl.dataset.view === 'grid') gridPlayVisible()
  }
  function gridMark() {
    reelGridList.querySelectorAll('[aria-current]').forEach((b) => b.removeAttribute('aria-current'))
    const b = reelGridList.querySelector(`[data-rg="${reel.i}"]`)
    if (b) b.setAttribute('aria-current', 'true')
    return b
  }
  function reelSetView(v, o = {}) {
    if (!reel) return
    const grid = v === 'grid'
    const was = reelEl.dataset.view || 'full'
    reelEl.dataset.view = grid ? 'grid' : 'full'
    reelGrid.hidden = !grid
    feed.inert = grid
    reelEl.querySelectorAll('[data-rview]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.rview === reelEl.dataset.view)))
    // only the switch itself keeps the choice; opening an attempt from a tile or from elsewhere does not
    if (!o.quiet && st.reelView !== reelEl.dataset.view) { st.reelView = reelEl.dataset.view; save() }
    if (grid) {
      if (was !== 'grid') { reel.gridHeld = reel.playing; setPlaying(false) }
      const b = gridMark()
      if (b) { const li = b.parentElement; reelGrid.scrollTop = Math.max(0, li.offsetTop - reelGrid.clientHeight / 2 + li.offsetHeight / 2) }
      gridPlayVisible()
      if (!o.quiet) reelLive.textContent = 'Grid view. Pick an attempt to watch it full screen.'
    } else {
      gridPauseAll()
      if (was === 'grid' && reel.gridHeld != null) { setPlaying(reel.gridHeld); reel.gridHeld = null }
      if (!o.quiet) reelLive.textContent = 'Full screen view.'
    }
  }
  // a tile opens the full view at its attempt
  function reelOpenTile(i) {
    reelSetView('full', { quiet: true })
    if (i !== reel.i) {
      feed.scrollTop = i * feed.clientHeight
      reelShow(i)
    }
    const el = feed.children[reel.i]
    const f = el && el.querySelector('.rl-play')
    if (f) f.focus({ preventScroll: true }); else feed.focus({ preventScroll: true })
  }
  reelGrid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rg]')
    if (b && reel) reelOpenTile(+b.dataset.rg)
  })
  // the grid never ends either: more attempts load as its foot comes near
  reelGrid.addEventListener('scroll', () => {
    if (reel && reelGrid.scrollTop + reelGrid.clientHeight > reelGrid.scrollHeight - 700) reelMore(REEL_BATCH)
  }, { passive: true })
  reelEl.querySelectorAll('[data-rview]').forEach((b) => b.addEventListener('click', () => reelSetView(b.dataset.rview)))

  /* a saved attempt is kept as a snapshot (mpages/saved.js), so it opens again in any later reel just as it was */
  function reelSnap(it) {
    const p = it.p
    return {
      key: it.key, who: p.id, name: p.name, handle: p.handle || '', ava: p.ava, avaStyle: p.avaStyle || '', mono: p.mono || '', city: p.city || '',
      photo: it.photo, crop: it.crop || HIT_CROP, video: it.video || null, s: it.s, when: it.when, t: it.t || 0, venue: it.venue, machine: it.machine,
      likes: it.likes || 0, comments: it.comments || 0, best: !!it.best,
    }
  }
  function fromSnap(x) {
    const p = P[x.who] || reelExtra.find((q) => q.id === x.who) || { id: x.who, name: x.name, handle: x.handle, ava: x.ava, avaStyle: x.avaStyle, mono: x.mono, city: x.city }
    return {
      key: x.key, p, photo: x.photo, crop: x.crop || HIT_CROP, video: x.video || null, s: x.s, when: x.t ? whenOf(new Date(x.t)) : x.when, t: x.t,
      venue: x.venue, machine: x.machine, likes: x.likes || 0, comments: x.comments || 0, own: true, best: !!x.best,
    }
  }
  function snapByKey(key) {
    if (reel) { const it = reel.items.find((x) => x.key === key); if (it) return reelSnap(it) }
    const m = /^([a-z]+):(\d+)$/.exec(key || '')
    if (m && P[m[1]]) { const it = reelOwn(P[m[1]])[+m[2]]; if (it) return reelSnap(it) }
    return null
  }

  function reelMore(n) {
    const from = reel.items.length
    for (let k = 0; k < n; k++) {
      const it = reel.ownLeft.length ? reel.ownLeft.shift() : reelEveryone(reel.c++)
      if (!it) break
      reel.items.push(it)
    }
    feed.insertAdjacentHTML('beforeend', reel.items.slice(from).map((it, k) => reelSlide(it, from + k)).join(''))
    paintIcons(feed)
    reelGridAdd(from)
  }
  // o.player and o.index open a player's reel at one of their hits, and everyone's attempts follow it the same way
  function renderReel(o = {}) {
    stopReel()
    const title = ''
    const p = P[o.player] || P[profileId] || P.me
    const own = reelOwn(p).filter((it) => !reelHidden.has(it.p.id) || it.p.id === p.id)
    const i = Math.max(0, Math.min(own.length - 1, (o.index ?? 0) | 0))
    reel = { p, title, total: own.length, items: [], ownLeft: own, c: 0, queue: [], round: 0, i: -1, playing: o.playing ?? true, anims: [], iv: 0, raf: 0, vid: null, lock: -1, lockT: 0 }
    feed.innerHTML = ''
    feed.classList.remove('is-dragging')
    reelGridList.innerHTML = ''
    reelDesigns()
    reelMore(Math.max(REEL_BATCH, i + 5))
    feed.scrollTop = i * feed.clientHeight
    reelShow(i, true)
    // the viewer's last view, unless this entry opens one attempt on purpose (a hit, a post, a saved item): that plays
    reelSetView(st.reelView === 'grid' && !o.full && o.index == null && !o.key ? 'grid' : 'full', { quiet: true })
  }
  function stopReel() {
    if (!reel) return
    reel.anims.forEach((a) => a.cancel())
    reel.anims = []
    clearInterval(reel.iv)
    cancelAnimationFrame(reel.raf)
    if (reel.vid) { reel.vid.pause(); reel.vid.playbackRate = 1 }
    reel.vid = null
  }
  function reelHeader(it) {
    const own = it.own, p = reel.p, n = reel.total
    $('mReelTitle').textContent = !own ? 'More hits' : p.id === 'me' ? 'Your reel' : `${p.name.split(' ')[0]}'s reel`
    // short enough to stay whole beside the view switch on the narrower phone in every look
    $('mReelSub').textContent = !own ? 'From everyone' : `${p.handle}, newest first`
  }
  // an attempt comes into view: it becomes the one the keyboard and the reader reach, and its clip starts
  function reelShow(i, first) {
    if (!reel) return
    const n = feed.children.length
    i = Math.max(0, Math.min(n - 1, i))
    if (i === reel.i && !first) return
    const was = feed.children[reel.i]
    // focus on the attempt that leaves (its like, its menu) moves to the feed, so the arrow keys keep working
    if (was && was.contains(document.activeElement)) feed.focus({ preventScroll: true })
    if (was) { was.classList.remove('is-on'); was.inert = true; was.setAttribute('aria-hidden', 'true'); was.querySelectorAll('.is-target').forEach((t) => t.classList.remove('is-target')) }
    reel.i = i
    const el = feed.children[i], it = reel.items[i]
    el.classList.add('is-on')
    el.inert = false
    el.removeAttribute('aria-hidden')
    if (first) el.dataset.loaded = '1'
    // autoplay decides for every attempt after the first; data saver waits for a tap before a replay loads. Under
    // reduced motion a punch video waits on its strike frame until play is pressed
    let play = first ? reel.playing : rpref('autoplay') && (reelEl.dataset.saver !== 'on' || !!el.dataset.loaded)
    if (it.video && reduced.matches && !el.dataset.played) play = false
    reelPlay(play)
    // the clip after this one starts loading, so a swipe lands on a moving picture
    const next = feed.children[i + 1] && feed.children[i + 1].querySelector('video')
    if (next && reelEl.dataset.saver !== 'on' && next.preload === 'none') next.preload = 'auto'
    reelHeader(it)
    if (!first) reelLive.textContent = `${it.p.name}. ${ptsText(it.s)} points, ${it.when}, ${it.venue}.`
    if (reel.items.length - i <= 4) reelMore(REEL_BATCH)
    document.dispatchEvent(new CustomEvent('reelshow', { detail: { index: i } }))
  }
  // the clip plays from the start whenever an attempt comes into view; a pause holds it where it is
  function reelPlay(play) {
    stopReel()
    const el = feed.children[reel.i]
    if (!el) return
    const it = reel.items[reel.i], v = el.querySelector('video')
    el.dataset.phase = ''
    if (v) {
      // a video keeps its own clock: the progress reads it every frame, and the slow stretch slows the picture
      reel.vid = v
      if (reelEl.dataset.saver !== 'on' || el.dataset.loaded) v.preload = 'auto'
      try { v.currentTime = 0 } catch { /* not loaded yet */ }
      const loop = () => {
        if (!reel || reel.vid !== v) return
        const d = v.duration && isFinite(v.duration) ? v.duration : it.video.dur, t = v.currentTime || 0
        const sl = phasesOf(it).find((x) => x[0] === 'slow')
        const rate = sl && t >= sl[2] * d && t < (sl[2] + sl[3]) * d ? SLOW_RATE : 1
        if (v.playbackRate !== rate) v.playbackRate = rate
        el.style.setProperty('--rp', Math.min(1, t / d).toFixed(4))
        reel.raf = requestAnimationFrame(loop)
      }
      reel.raf = requestAnimationFrame(loop)
    } else {
      el.style.removeProperty('--rp')
      const ms = clipMs()
      reel.anims.push(el.animate([{ '--rp': 0 }, { '--rp': 1 }], { duration: ms, iterations: Infinity, easing: 'linear' }))
      // the push in is the movement reduced motion and data saver drop; the progress still says the clip is playing
      if (!reduced.matches && reelEl.dataset.saver !== 'on') reel.anims.push(el.querySelector('.m-reel-media img').animate([{ scale: '1' }, { scale: '1.07' }], { duration: ms, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }))
    }
    reel.iv = setInterval(reelTick, 150)
    setPlaying(play)
    reelTick()
  }
  function reelTick() {
    if (!reel || (!reel.anims[0] && !reel.vid)) return
    const el = feed.children[reel.i], it = reel.items[reel.i]
    if (!el || !it) return
    let t, wall
    if (reel.vid) {
      const v = reel.vid, d = v.duration && isFinite(v.duration) ? v.duration : it.video.dur
      t = Math.min(1, (v.currentTime || 0) / d)
      wall = vidWall(it, t * it.video.dur) * 1000
    } else {
      const ms = clipMs()
      t = ((reel.anims[0].currentTime || 0) % ms) / ms
      wall = t * ms
    }
    const phs = phasesOf(it), ph = phs.find(([, , a, w]) => t >= a && t < a + w) || phs[phs.length - 1]
    if (el.dataset.phase !== ph[0]) {
      el.dataset.phase = ph[0]
      el.querySelectorAll('.rl-speed-t').forEach((s) => { s.textContent = ph[0] === 'slow' ? '0.25x' : '1x' })
      el.querySelector('.rl-cap').textContent = CAPTION[ph[0]]
    }
    const txt = clock(wall)
    el.querySelectorAll('.rl-now').forEach((s) => { if (s.textContent !== txt) s.textContent = txt })
  }
  function reelPlayUI(el, play) {
    el.classList.toggle('is-paused', !play)
    const btn = el.querySelector('.rl-play')
    if (!btn) return
    btn.setAttribute('aria-label', play ? 'Pause the replay' : 'Play the replay')
    btn.innerHTML = `<span data-icon="${play ? 'pause' : 'play'}"></span>`
    paintIcons(btn)
  }
  function setPlaying(play) {
    if (!reel) return
    reel.playing = play
    reel.anims.forEach((a) => (play ? a.play() : a.pause()))
    const el = feed.children[reel.i]
    if (!el) return
    if (play) el.dataset.loaded = '1'
    if (reel.vid) {
      if (play) { reel.vid.preload = 'auto'; el.dataset.played = '1'; const p = reel.vid.play(); if (p && p.catch) p.catch(() => {}) } else reel.vid.pause()
    }
    reelPlayUI(el, play)
  }
  // scroll to an attempt: the feed takes the smooth way, the attempt becomes current at once, and the scroll events
  // on the way there do not pull it back
  function reelGo(i) {
    if (!reel) return
    if (i >= feed.children.length) reelMore(REEL_BATCH)
    i = Math.max(0, Math.min(feed.children.length - 1, i))
    reel.lock = i
    clearTimeout(reel.lockT)
    reel.lockT = setTimeout(() => { if (reel) { reel.lock = -1; feed.classList.remove('is-dragging') } }, 900)
    feed.scrollTo({ top: i * feed.clientHeight, behavior: reduced.matches ? 'instant' : 'smooth' })
    reelShow(i)
  }
  function stepReel(dir) {
    if (!reel) return
    const to = reel.i + dir
    if (to < 0) { nudge(); return }
    reelGo(to)
  }
  // at the top the reel gives a little and springs back, so a swipe up past the first attempt still answers
  function nudge() {
    if (reduced.matches) return
    feed.animate([{ transform: 'none' }, { transform: 'translateY(28px)' }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2, .7, .2, 1)' })
  }
  let reelScrollRaf = 0
  const reelSettle = () => {
    reelScrollRaf = 0
    if (!reel || reelDrag) return
    const h = feed.clientHeight || 1
    if (reel.lock >= 0) {
      if (Math.abs(feed.scrollTop - reel.lock * h) > 2) return
      reel.lock = -1
      feed.classList.remove('is-dragging')
    }
    reelShow(Math.round(feed.scrollTop / h))
  }
  feed.addEventListener('scroll', () => { if (!reelScrollRaf) reelScrollRaf = requestAnimationFrame(reelSettle) }, { passive: true })
  feed.addEventListener('scrollend', () => { if (reel) { reel.lock = -1; feed.classList.remove('is-dragging') } reelSettle() })
  // a new phone size (Customise, Phone) keeps the same attempt in view
  if (window.ResizeObserver) new ResizeObserver(() => { if (reel && current === 'reel') feed.scrollTop = reel.i * feed.clientHeight }).observe(feed)

  function paintLike(el, it) {
    const btn = el.querySelector('[data-ract="like"]')
    if (!btn) return
    const had = document.activeElement === btn
    btn.outerHTML = reelLikeHTML(it)
    paintIcons(el)
    if (had) el.querySelector('[data-ract="like"]').focus({ preventScroll: true })
  }
  function likeReel(el, force) {
    const it = reel.items[+el.dataset.i]
    const on = force ?? !reelLiked.has(it.key)
    on ? reelLiked.add(it.key) : reelLiked.delete(it.key)
    paintLike(el, it)
  }
  function followReel(id) {
    const on = !following.has(id)
    on ? following.add(id) : following.delete(id)
    feed.querySelectorAll(`.m-reel-slide[data-who="${id}"] [data-ract="follow"]`).forEach((b) => {
      b.classList.toggle('is-on', on)
      b.setAttribute('aria-pressed', String(on))
      b.firstElementChild.textContent = on ? 'Following' : 'Follow'
    })
    const it = reel.items[reel.i]
    toast(on ? `Following ${it.p.name.split(' ')[0]}` : `Unfollowed ${it.p.name.split(' ')[0]}`)
  }
  feed.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ract]')
    if (!b || !reel) return
    const el = b.closest('.m-reel-slide'), it = reel.items[+el.dataset.i]
    const a = b.dataset.ract
    if (a === 'like') likeReel(el)
    else if (a === 'share') toast('Link to the replay copied')
    else if (a === 'play') setPlaying(!reel.playing)
    else if (a === 'follow') followReel(it.p.id)
    else if (a === 'profile') go('profile', { player: it.p.id })
    else if (a === 'unhide') window.punchReel.unhide(it.p.id)
    else if (a === 'next') stepReel(1)
    // comment and more open their sheets in mpages/reel.js
  })
  $('mReelClose').addEventListener('click', () => {
    const prev = history.pop()
    go(prev ? prev.page : 'profile', { player: prev ? prev.player : 'me', back: true, keepScroll: true })
  })
  // a mouse drags the feed the way a finger swipes it (a touch scrolls it natively). A tap plays or pauses, a double
  // tap likes, as on the feed
  let reelDrag = null, lastTap = 0, tapTimer = 0
  feed.addEventListener('pointerdown', (e) => {
    if (!reel || e.button > 0 || e.target.closest('button, a, input')) return
    reelDrag = { y: e.clientY, top: feed.scrollTop, id: e.pointerId, moved: false, mouse: e.pointerType === 'mouse' }
    if (reelDrag.mouse) { try { feed.setPointerCapture(e.pointerId) } catch { /* a synthetic pointer */ } }
  })
  feed.addEventListener('pointermove', (e) => {
    if (!reelDrag || e.pointerId !== reelDrag.id) return
    const dy = e.clientY - reelDrag.y
    if (!reelDrag.moved && Math.abs(dy) > 8) { reelDrag.moved = true; if (reelDrag.mouse) feed.classList.add('is-dragging') }
    // the device is drawn at a scale: the drag follows the pointer in the phone's own pixels
    if (reelDrag.moved && reelDrag.mouse) feed.scrollTop = reelDrag.top - dy * (feed.clientHeight / (feed.getBoundingClientRect().height || feed.clientHeight))
  })
  const endDrag = (e) => {
    if (!reelDrag || e.pointerId !== reelDrag.id) return
    const d = reelDrag
    reelDrag = null
    if (d.moved) {
      if (!d.mouse) return
      const h = feed.clientHeight, dy = (d.top - feed.scrollTop) / h
      reelGo(reel.i + (dy < -1 / 6 ? 1 : dy > 1 / 6 ? -1 : 0))
      return
    }
    if (e.type === 'pointercancel') return
    const el = feed.children[reel.i]
    if (!el || !el.contains(e.target)) return
    const now = performance.now()
    if (now - lastTap < 300) {
      clearTimeout(tapTimer)
      lastTap = 0
      likeReel(el, true)
      const burst = el.querySelector('.m-burst')
      burst.classList.remove('go'); void burst.offsetWidth; burst.classList.add('go')
      return
    }
    lastTap = now
    tapTimer = setTimeout(() => setPlaying(!reel.playing), 260)
  }
  feed.addEventListener('pointerup', endDrag)
  feed.addEventListener('pointercancel', endDrag)
  let wheelLock = 0, wheelSum = 0
  feed.addEventListener('wheel', (e) => {
    e.preventDefault()
    if (performance.now() < wheelLock) return
    wheelSum += e.deltaY
    if (Math.abs(wheelSum) < 40) return
    stepReel(wheelSum > 0 ? 1 : -1)
    wheelSum = 0
    wheelLock = performance.now() + 550
  }, { passive: false })
  reelEl.addEventListener('keydown', (e) => {
    if (!reel || e.defaultPrevented || e.target.closest('.m-rsheet, input')) return
    // the grid scrolls as a page does: the arrow keys and K are the full view's
    if (reelEl.dataset.view === 'grid') { if (e.key === 'Escape') { e.preventDefault(); $('mReelClose').click() } return }
    const dir = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 }[e.key]
    if (dir) { e.preventDefault(); stepReel(dir); return }
    if (e.key === 'k' || e.key === 'K') { e.preventDefault(); setPlaying(!reel.playing) }
    if (e.key === 'Escape') { e.preventDefault(); $('mReelClose').click() }
  })
  // with nothing focused (the reel opened from the page bar or a reload), the arrow keys still move the reel
  document.addEventListener('keydown', (e) => {
    if (!reel || current !== 'reel' || e.defaultPrevented || (stage && stage.hidden) || reelEl.dataset.view === 'grid') return
    const a = document.activeElement
    if (a && a !== document.body && a !== document.documentElement) return
    const dir = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 }[e.key]
    if (!dir) return
    e.preventDefault()
    feed.focus({ preventScroll: true })
    stepReel(dir)
  })
  // the page's sections: a new design redraws every attempt in place
  document.addEventListener('psec', (e) => {
    const d = e.detail || {}
    if (d.surface !== 'phone' || d.page !== 'reel' || d.initial) return
    // a grid design only redraws the grid; the full view's three sections redraw every attempt
    if (d.sec === 'grid') reelGridDraw(); else reelRedraw()
  })
  // the reel's own settings (mpages/reel.js): slow motion changes the clip, so it redraws and starts again
  document.addEventListener('reelprefs', (e) => {
    if (!reel) return
    const k = e.detail && e.detail.key
    if (k === 'slowmo') { reelRedraw(); if (reelEl.dataset.view !== 'grid') reelPlay(reel.playing) } else if (k === 'saver') { if (reelEl.dataset.view !== 'grid') reelPlay(reel.playing) }
    if (reelEl.dataset.view === 'grid') gridPlayVisible()
  })
  // what mpages/reel.js needs from the feed: the attempt on screen, a pause while a sheet is open, hiding a player,
  // the comments, and more players from the photo library
  let heldPlaying = null
  window.punchReel = {
    get item() { return reel ? reel.items[reel.i] : null },
    get index() { return reel ? reel.i : -1 },
    get count() { return reel ? reel.items.length : 0 },
    get items() { return reel ? reel.items.map((it) => ({ key: it.key, who: it.p.id, name: it.p.name, own: it.own, s: it.s, when: it.when, venue: it.venue, photo: it.photo })) : [] },
    itemOf(node) { const s = node && node.closest('.m-reel-slide'); return s && reel ? reel.items[+s.dataset.i] : null },
    go: reelGo,
    step: stepReel,
    hold(on) {
      if (!reel) return
      if (on) { if (heldPlaying === null) heldPlaying = reel.playing; setPlaying(false) } else if (heldPlaying !== null) { setPlaying(heldPlaying); heldPlaying = null }
    },
    hide(id) {
      if (!reel) return
      reelHidden.add(id)
      const i = reel.i
      // the attempts still to come from this player leave the feed; the one on screen says so and offers them back
      ;[...feed.children].slice(i + 1).forEach((n) => n.remove())
      reel.items = reel.items.slice(0, i + 1).concat(reel.items.slice(i + 1).filter((it) => it.p.id !== id))
      reel.ownLeft = reel.ownLeft.filter((it) => it.p.id !== id)
      feed.insertAdjacentHTML('beforeend', reel.items.slice(i + 1).map((it, k) => reelSlide(it, i + 1 + k)).join(''))
      if (reel.items.length - i <= 4) reelMore(REEL_BATCH)
      reelGridDraw()
      const el = feed.children[i], it = reel.items[i]
      el.classList.add('is-hidden')
      el.insertAdjacentHTML('beforeend', `<div class="rl-hidden"><span class="rl-hidden-i" data-lucide="eye-off"></span><p><b>${it.p.name} is hidden</b>You will not see their hits in your reels.</p>
        <div class="rl-hidden-row"><button class="m-btn rl-hidden-btn" type="button" data-ract="next">Next attempt</button><button class="rl-hidden-undo" type="button" data-ract="unhide">Show again</button></div></div>`)
      paintIcons(feed)
      setPlaying(false)
      heldPlaying = null
      el.querySelector('.rl-hidden-btn').focus({ preventScroll: true })
    },
    unhide(id) {
      reelHidden.delete(id)
      const had = !!(document.activeElement && document.activeElement.closest('.rl-hidden'))
      feed.querySelectorAll(`.m-reel-slide[data-who="${id}"] .rl-hidden`).forEach((n) => { n.parentElement.classList.remove('is-hidden'); n.remove() })
      if (had) feed.focus({ preventScroll: true })
      setPlaying(true)
      toast('Shown in your reels again')
    },
    comments: reelComments,
    comment(it, text) {
      ;(reelAdded[it.key] = reelAdded[it.key] || []).unshift({ name: P.me.name, ava: P.me.ava, text, when: 'Now', mine: true })
      feed.querySelectorAll('.m-reel-slide').forEach((el) => {
        if (reel.items[+el.dataset.i] !== it) return
        const b = el.querySelector('[data-ract="comment"]'), n = reelCount(it)
        b.setAttribute('aria-label', `Comments, ${n}`)
        b.querySelector('.rl-act-n').textContent = short(n)
      })
    },
    commentCount: reelCount,
    addPlayers(list) {
      const fresh = []
      for (const p of list) if (!P[p.id] && !reelExtra.some((x) => x.id === p.id)) { reelExtra.push(p); fresh.push(p) }
      // a reel already dealing a pass takes the newcomers into it, so each of their stills still plays exactly once
      if (reel && reel.round) for (const p of fresh) strikesOf(p).forEach((s, k) => reel.queue.splice(mix(seedOf(`${p.id}/${k}`)) % (reel.queue.length + 1), 0, { p, ...s }))
    },
    redraw: reelRedraw,
    toast,
    get playing() { return reel ? reel.playing : false },
    // Saved (mpages/saved.js): the snapshot of an attempt by its key, and a sample attempt of any player for the lists
    // a first visit starts with
    snap: snapByKey,
    snapOf: (it) => (it ? reelSnap(it) : null),
    sample(id, k = 0, c = 3) {
      const p = P[id] || reelExtra.find((x) => x.id === id)
      if (!p) return null
      if (P[id]) { const own = reelOwn(p)[k]; return own ? reelSnap(own) : null }
      const shots = strikesOf(p)
      return shots[k] ? reelSnap(attemptOf({ p, ...shots[k] }, c, 0)) : null
    },
    get view() { return reelEl.dataset.view || 'full' },
    setView: (v) => reelSetView(v),
    open: reelOpenTile,
  }

  /* ------------------------------------------------------------ entering each page */
  const ENTER = {
    scan: () => { resetScan() },
    connect: (o) => {
      again = !!o.again
      setConnect('wait')
      // the link finishes on its own, whether the screen came from a scan or straight from the page bar
      later(finishConnect, again ? 1600 : 2600)
    },
    hit: (o) => {
      const here = Object.values(P).filter((p) => p.dubai).sort((a, b) => b.score - a.score).findIndex((p) => p.id === 'me') + 1
      hitPage.querySelectorAll('[data-app-rank]').forEach((el) => { el.textContent = `#${here} at this machine` })
      if (o.fresh) countHit(); else paintHit(score)
    },
    // from the link (opts.flow) the page counts down to Punch; from the page bar it waits for a tap. The fill restarts
    // from empty on every opening
    connected: (o) => {
      connectedPage.dataset.held = reserved ? 'yes' : 'no'
      connectedPage.dataset.auto = 'held'
      if (!o.flow) return
      void connectedPage.offsetWidth
      connectedPage.dataset.auto = 'run'
      later(() => go('punch', { flow: true }), CONNECTED_MS)
    },
    // from connected (opts.flow), from the page bar or from Try again: every entry starts a fresh countdown
    punch: (o) => startRun(o),
    // a rank on Your hit opens its own board (opts.scope)
    ranks: (o) => { if (o.scope && o.scope !== scope) setScope(o.scope, false); else renderBoard(false) },
    feed: () => renderPosts(),
    profile: () => renderProfile(),
    reel: (o) => renderReel(o),
  }
  // walking away before a strike (the tab bar is hidden, but the page bar and code can leave) keeps the credit too
  LEAVE.punch = () => {
    stopRun()
    punch.classList.remove('is-struck')
    if (reserved) { reserved = false; setCredits(st.credits + 1) }
  }
  LEAVE.reel = () => { stopReel(); gridPauseAll(); reel = null }
  // the link holds the credit a moment before the countdown opens: leaving for anywhere but Connected or the punch step
  // gives it back, and so does leaving Connected for anywhere but the punch step
  LEAVE.connect = (to) => {
    if (to !== 'punch' && to !== 'connected' && reserved) { reserved = false; setCredits(st.credits + 1) }
  }
  LEAVE.connected = (to) => {
    connectedPage.dataset.auto = 'held'
    if (to !== 'punch' && reserved) { reserved = false; setCredits(st.credits + 1) }
  }
  // leaving the Mobile mode stops the flow where a person would: a scan or a link in progress, or a countdown nobody is
  // watching, goes back to the scan with the held credit returned, so no punch lands behind the machine or the system
  if (stage && !EMBED && window.MutationObserver) new MutationObserver(() => {
    if (!stage.hidden) return
    if (current === 'connect' || current === 'connected' || (current === 'punch' && run && punch.dataset.state === 'wait')) go('scan')
    else if (current === 'scan' && scan.classList.contains('is-scanning')) { clearTimers(); resetScan() }
  }).observe(stage, { attributes: true, attributeFilter: ['hidden'] })

  /* ------------------------------------------------------------ wallet: credits buy attempts */
  function setCredits(n) {
    st.credits = Math.max(0, Math.round(n))
    save()
    app.dataset.credits = String(st.credits)
    app.querySelectorAll('[data-credits]').forEach((el) => { el.textContent = st.credits === 1 ? '1 credit' : `${st.credits} credits` })
    $('walletEmpty')?.setAttribute('aria-pressed', String(st.credits === 0))
    $('walletFull')?.setAttribute('aria-pressed', String(st.credits > 0))
    app.dispatchEvent(new CustomEvent('credits', { detail: st.credits }))
  }
  $('walletEmpty')?.addEventListener('click', () => { setCredits(0); toast('Wallet emptied') })
  $('walletFull')?.addEventListener('click', () => { setCredits(3); toast('Three credits added') })

  /* ------------------------------------------------------------ device, fit and the settings panel rows */
  function setDevice(d) {
    st.device = d === 'android' ? 'android' : 'iphone'
    device.dataset.device = st.device
    app.querySelector('[data-clock]').textContent = st.device === 'android' ? '10:30' : '9:41'
    // a radio group is one Tab stop: only the checked tile is in the tab order, the arrow keys move between them
    document.querySelectorAll('.dev-tile').forEach((b) => { const on = b.dataset.device === st.device; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1 })
    save(); fit()
  }
  function fit() {
    if (!stage || stage.hidden) return
    // the frame's own size, from its tokens: 440 x 956 plus a 12 px bezel, or 412 x 915 plus 9
    const android = st.device === 'android'
    const h = (android ? 933 : 980) + 16, w = (android ? 430 : 464) + 24
    const top = wrap.getBoundingClientRect().top + window.scrollY
    const availH = window.innerHeight - Math.min(top, 190) - 44
    const availW = document.documentElement.clientWidth - 32
    const z = st.fit ? Math.max(.4, Math.min(1, availH / h, availW / w)) : Math.min(1, availW / w)
    wrap.style.setProperty('--pz', z.toFixed(3))
    $('phoneFit')?.setAttribute('aria-pressed', String(st.fit))
    $('phoneActual')?.setAttribute('aria-pressed', String(!st.fit))
  }
  document.querySelectorAll('.dev-tile').forEach((b, i, all) => {
    b.addEventListener('click', () => setDevice(b.dataset.device))
    b.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
      if (!step) return
      e.preventDefault()
      const next = all[(i + step + all.length) % all.length]
      setDevice(next.dataset.device); next.focus()
    })
  })
  $('phoneFit')?.addEventListener('click', () => { st.fit = true; save(); fit() })
  $('phoneActual')?.addEventListener('click', () => { st.fit = false; save(); fit() })
  $('replayFlow')?.addEventListener('click', () => { history.length = 0; go('scan'); later(startScan, 700) })
  window.addEventListener('resize', () => requestAnimationFrame(fit))
  window.addEventListener('load', () => requestAnimationFrame(fit))
  if (document.fonts) document.fonts.ready.then(() => requestAnimationFrame(fit))

  const chevron = (d) => `<svg class="ico" viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${d.startsWith('M12.5') ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'}"/></svg>`
  // the leaderboard, the linking screen and the tab bar are sections (psec.js); their designs are drawn here
  const STYLE_AT = { board: ['phone', 'ranks', 'board'], connect: ['phone', 'connect', 'connect'], nav: ['global', 'all', 'tabbar'] }
  function applyStyles() {
    const P2 = window.PSec
    if (!P2) return
    connect.dataset.style = (CONNECT_STYLES[P2.get('phone', 'connect', 'connect')] || CONNECT_STYLES[0]).key
    app.dataset.nav = (NAV_STYLES[P2.get('global', 'all', 'tabbar')] || NAV_STYLES[0]).key
  }
  document.addEventListener('psec', (e) => {
    const d = e.detail || {}
    if (d.surface === 'phone' && d.page === 'ranks' && (d.sec === 'board' || d.sec === 'you')) renderBoard(d.sec === 'board')
    else if (d.surface === 'phone' && d.page === 'connect' && d.sec === 'connect') applyStyles()
    // Customise is changing a design on Connected: hold the page still so the choice can be seen; a tap goes on
    else if (d.surface === 'phone' && d.page === 'connected' && !d.initial && current === 'connected') holdConnected()
    else if (d.surface === 'global' && d.sec === 'tabbar') { applyStyles(); if (NO_NAV.includes(current) && !EMBED) go('default') }
  })
  // a first visit after this change carries its old picks over into the sections
  if (window.PSec) {
    const had = window.PSec.state
    if (!had['phone/ranks'] && st.board) window.PSec.set('phone', 'ranks', 'board', st.board, true)
    if (!had['phone/connect'] && st.connect) window.PSec.set('phone', 'connect', 'connect', st.connect, true)
    if (!had.global && st.nav) window.PSec.set('global', 'all', 'tabbar', st.nav, true)
  }

  /* ------------------------------------------------------------ the machine follows the phone
     Each phone screen tells the machine what to show (the live machine beside the phone listens on this channel):
     scanning and paying keep the glass on its scan screen, the punch step starts its countdown, the hit lands on the
     result, and the social screens send it back to the leaderboard it shows between players. */
  const flowChannel = !EMBED && 'BroadcastChannel' in window ? new BroadcastChannel('punch-flow') : null
  let lastSaid = null, pendingSay = 0
  function announce(key, opts = {}) {
    // anything the phone says next replaces what it had lined up (a record's hand over to the result)
    clearTimeout(pendingSay)
    if (!flowChannel) return
    lastSaid = { type: 'mscreen', key, opts }
    flowChannel.postMessage(lastSaid)
  }
  // one message the phone lines up for later, outside the screen timers, so opening Your hit does not cancel it
  function announceLater(key, opts, ms) {
    clearTimeout(pendingSay)
    if (!flowChannel) return
    pendingSay = setTimeout(() => announce(key, opts), ms)
  }
  // a machine that opens late (the panel loads lazily) can ask where the flow is: the countdown carries absolute
  // times, so a late machine still lands on the same second as the phone
  if (flowChannel) flowChannel.addEventListener('message', (e) => { if (e.data && e.data.type === 'hello' && lastSaid) flowChannel.postMessage(lastSaid) })
  // the machine beside the phone loads after the phone has already said where it is: tell it again once it is up
  const linkedFrame = document.getElementById('linkedFrame')
  if (flowChannel && linkedFrame) linkedFrame.addEventListener('load', () => { if (lastSaid) flowChannel.postMessage(lastSaid) })
  const MACHINE_FOR = { default: 'default', scan: 'scan', connect: 'scan', connected: 'scan', topup: 'scan', checkout: 'scan', paid: 'scan', failed: 'scan', punch: 'countdown', hit: 'result', ranks: 'attract', feed: 'attract', profile: 'attract', reel: 'attract', saved: 'attract' }
  function announceFor(page, opts) {
    // the punch step announces its own countdown and landing (with the start time), so both screens count together;
    // the hit it opens is quiet, because the landing has already told the machine what to show
    if (page === 'punch' || opts.quiet) return
    const key = MACHINE_FOR[page]
    if (key) announce(key, { page, linked: page !== 'scan', holding: ['topup', 'checkout', 'paid'].includes(page), score })
  }

  /* ------------------------------------------------------------ the score format changed (Customise, Score format) */
  document.addEventListener('decimals', () => {
    if (current === 'hit') { cancelAnimationFrame(countRaf); paintHit(score) }
    else if (current === 'ranks') renderBoard(false)
    else if (current === 'feed') renderPosts()
    else if (current === 'profile') renderProfile()
    else if (current === 'reel' && reel) reelRedraw()
  })

  /* ------------------------------------------------------------ boot */
  st.board = Math.min(Math.max(0, st.board | 0), BOARD_STYLES.length - 1)
  st.connect = Math.min(Math.max(0, st.connect | 0), CONNECT_STYLES.length - 1)
  paintIcons(app)
  renderStories()
  applyStyles()
  Object.values(pages).forEach((p) => { p.inert = true; p.setAttribute('aria-hidden', 'true') })
  setDevice(st.device)
  setCredits(st.credits | 0)
  // a reload mid countdown starts again from the scan: the machine has long since moved on
  if (!EMBED) go(pages[st.page] && st.page !== 'punch' ? st.page : 'default')

  window.punchApp = {
    announce,
    // everyone on the board, best first, with the phone's own player (Sara, id "me") at the live score. The photo is the
    // shot the machine's board shows (SHOTS attract), one the phone never uses
    leaders() {
      return Object.values(P).map((p) => ({ id: p.id, name: p.name, city: p.city, score: p.id === 'me' ? score : p.score, delta: p.delta, ava: p.ava, photo: p.attract }))
        .sort((a, b) => b.score - a.score).map((p, i) => ({ ...p, rank: i + 1 }))
    },
    go,
    fit,
    back() { const prev = history.pop(); if (prev) go(prev.page, { player: prev.player, back: true, keepScroll: true }); else go('default') },
    toast,
    icon,
    paint: paintIcons,
    later,
    fmt,
    get credits() { return st.credits },
    set credits(n) { setCredits(n) },
    get device() { return st.device },
    get score() { return score },
    // other files add behaviour when a screen opens: punchApp.onEnter('topup', (opts) => ...)
    onEnter(page, fn) { (EXTRA_ENTER[page] = EXTRA_ENTER[page] || []).push(fn); if (current === page) fn({}) },
    setScore(value) {
      score = value
      P.me.score = value
      if (current === 'hit') paintHit(value)
      if (current === 'ranks') renderBoard(false)
      if (current === 'feed') renderPosts()
      if (current === 'profile') renderProfile()
    },
    get page() { return current },
    get state() { return { ...st } },
    // a style by index, as Customise picks it (kept for the render harness): board, connect or nav
    style(key, i) { const at = STYLE_AT[key]; if (at && window.PSec) window.PSec.set(at[0], at[1], at[2], i) },
    device: setDevice,
  }
})()
