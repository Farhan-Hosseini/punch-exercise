/* Phone: the reel's settings sheet, the three dots menu and the comments. The feed itself is drawn in mobile.js (the
   reel block); this file owns the sheets and the reel's own settings, and reaches the feed through window.punchReel.
   Settings live in localStorage ("punch-reel.v1") and on #mReel as data-autoplay, data-slowmo, data-captions,
   data-saver and data-audience, which the feed and mpages/reel.css read; a change fires the document event
   "reelprefs" { key }. Show scores with decimals is the showcase's own Score format, so it follows and sets that.
   It also adds the photo library's players (assets/photos/lib/manifest.json) and the punch video players
   (assets/video/lib/manifest.json, document event "reelvideos" once they are in) to everyone's attempts, and the three
   dots' "Save to a list" hands the attempt to Saved (mpages/saved.js). */
(() => {
  'use strict'
  const $ = (id) => document.getElementById(id)
  const reelEl = $('mReel'), feed = $('mReelTrack')
  if (!reelEl || !feed) return
  const top = reelEl.querySelector('.m-reel-top')
  const EMBED = document.documentElement.dataset.embed === 'machine'
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const R = () => window.punchReel
  const toast = (t) => { if (window.punchApp) window.punchApp.toast(t) }
  const say = (t) => { const l = $('mReelLive'); if (l) l.textContent = t }

  /* ------------------------------------------------------------ settings */
  const KEY = 'punch-reel.v1'
  const DEF = { autoplay: true, slowmo: true, captions: false, saver: false, audience: 'everyone' }
  let prefs = { ...DEF }
  try { prefs = { ...DEF, ...(JSON.parse(localStorage.getItem(KEY) || 'null') || {}) } } catch { /* storage unavailable */ }
  const save = () => { if (EMBED) return; try { localStorage.setItem(KEY, JSON.stringify(prefs)) } catch { /* private window */ } }
  const AUD = {
    everyone: 'Anyone on PunchApp can watch your replays.',
    followers: 'Only the people who follow you can watch your replays.',
    me: 'Your replays stay private. Your scores still count on the boards.',
  }
  const decimalsOn = () => document.documentElement.dataset.decimals !== 'off'
  function applyPrefs(changed) {
    for (const k of ['autoplay', 'slowmo', 'captions', 'saver']) reelEl.dataset[k] = prefs[k] ? 'on' : 'off'
    reelEl.dataset.audience = prefs.audience
    reelEl.querySelectorAll('[data-rpref]').forEach((i) => { i.checked = i.dataset.rpref === 'decimals' ? decimalsOn() : !!prefs[i.dataset.rpref] })
    reelEl.querySelectorAll('[data-raud]').forEach((b) => {
      const on = b.dataset.raud === prefs.audience
      b.setAttribute('aria-checked', String(on))
      b.tabIndex = on ? 0 : -1
    })
    $('mReelWhoNote').textContent = AUD[prefs.audience] || AUD.everyone
    if (changed) document.dispatchEvent(new CustomEvent('reelprefs', { detail: { key: changed, prefs: { ...prefs } } }))
  }
  const SAID = {
    autoplay: ['Replays start as they come into view', 'Replays wait for a tap'],
    slowmo: ['The strike plays in slow motion', 'Replays play at real speed'],
    captions: ['Captions on', 'Captions off'],
    saver: ['Data saver on. Replays load when you tap play', 'Data saver off'],
  }
  reelEl.querySelectorAll('[data-rpref]').forEach((input) => input.addEventListener('change', () => {
    const k = input.dataset.rpref
    if (k === 'decimals') {
      // the showcase's Score format: its own button keeps the choice and tells every screen
      const btn = document.querySelector(`[data-decimals-btn="${input.checked ? 'on' : 'off'}"]`)
      if (btn) btn.click()
      else if (window.showcase && window.showcase.decimals) window.showcase.decimals(input.checked)
      say(input.checked ? 'Scores show three decimals' : 'Scores show whole points')
      return
    }
    prefs[k] = input.checked
    save()
    applyPrefs(k)
    // the switch shows the choice; the reader hears what it means
    say(SAID[k][input.checked ? 0 : 1])
  }))
  const auds = [...reelEl.querySelectorAll('[data-raud]')]
  function pickAudience(b, focus) {
    prefs.audience = b.dataset.raud
    save()
    applyPrefs('audience')
    if (focus) b.focus()
  }
  auds.forEach((b, i) => {
    b.addEventListener('click', () => { pickAudience(b); say(AUD[prefs.audience]) })
    b.addEventListener('keydown', (e) => {
      const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1 }[e.key]
      if (to === undefined) return
      e.preventDefault()
      pickAudience(auds[(to + auds.length) % auds.length], true)
    })
  })
  document.addEventListener('decimals', () => applyPrefs())
  applyPrefs('init')

  /* ------------------------------------------------------------ the sheets */
  let open = null, opener = null, closeT = 0
  const focusables = (el) => [...el.querySelectorAll('.m-sheet-panel button, .m-sheet-panel input, .m-sheet-panel [tabindex="0"]')]
    .filter((n) => !n.disabled && !n.closest('[hidden]') && n.tabIndex !== -1 && n.getClientRects().length)
  function openSheet(el, from) {
    if (open && open !== el) closeSheet(true)
    clearTimeout(closeT)
    opener = from || document.activeElement
    open = el
    el.hidden = false
    void el.offsetWidth
    el.classList.add('is-open')
    feed.inert = true
    top.inert = true
    if (R()) R().hold(true)
    const first = focusables(el)[0]
    if (first) first.focus({ preventScroll: true })
  }
  function closeSheet(quiet) {
    if (!open) return
    const el = open
    open = null
    el.classList.remove('is-open')
    closeT = setTimeout(() => { if (open !== el) el.hidden = true }, reduced.matches ? 0 : 420)
    feed.inert = false
    top.inert = false
    if (R()) R().hold(false)
    if (!quiet && opener && opener.isConnected) opener.focus({ preventScroll: true })
  }
  reelEl.querySelectorAll('[data-rsheet-close]').forEach((b) => b.addEventListener('click', () => closeSheet()))
  reelEl.addEventListener('keydown', (e) => {
    if (!open) return
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSheet(); return }
    if (e.key !== 'Tab') return
    const f = focusables(open)
    if (!f.length) return
    const i = f.indexOf(document.activeElement)
    e.preventDefault()
    f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus({ preventScroll: true })
  }, true)
  $('mReelGear').addEventListener('click', (e) => { applyPrefs(); openSheet($('mReelSettings'), e.currentTarget) })
  // leaving the reel takes its sheets with it
  document.addEventListener('mpage', (e) => { if (e.detail && e.detail.page !== 'reel') { closeSheet(true); if (open === null) reelEl.querySelectorAll('.m-rsheet').forEach((s) => { s.classList.remove('is-open'); s.hidden = true }) } })

  /* ------------------------------------------------------------ the three dots */
  let menuItem = null
  const first = (name) => name.split(' ')[0]
  function openMenu(it, from) {
    menuItem = it
    const mine = it.p.id === 'me'
    $('mReelMenuAva').src = it.p.ava
    $('mReelMenuAva').setAttribute('style', it.p.avaStyle || '')
    $('mReelMenuAva').parentElement.dataset.mono = it.p.mono || ''
    $('mReelMenuTitle').textContent = mine ? 'Your attempt' : it.p.name
    const PF = window.PunchFormat
    $('mReelMenuSub').textContent = `${PF ? PF.score(it.s) : it.s} points, ${it.when}`
    $('mReelMenuList').hidden = false
    $('mReelReport').hidden = true
    reelEl.querySelector('[data-rmenu="hide"]').hidden = mine
    reelEl.querySelector('[data-rmenu="report"]').hidden = mine
    reelEl.querySelector('[data-rmenu="audience"]').hidden = !mine
    openSheet($('mReelMenu'), from)
  }
  $('mReelMenuList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-rmenu]')
    if (!b || !menuItem) return
    const it = menuItem, a = b.dataset.rmenu
    if (a === 'report') {
      $('mReelMenuList').hidden = true
      $('mReelReport').hidden = false
      const f = focusables($('mReelMenu'))
      if (f[0]) f[0].focus({ preventScroll: true })
      return
    }
    if (a === 'audience') { closeSheet(true); openSheet($('mReelSettings'), feed.querySelector('.m-reel-slide.is-on [data-ract="more"]')); $('mReelSettings').querySelector('[aria-checked="true"]').focus({ preventScroll: true }); return }
    closeSheet()
    if (a === 'save') toast('Clip downloaded to your phone')
    else if (a === 'share') toast(`Sharing ${it.p.id === 'me' ? 'your' : `${first(it.p.name)}'s`} hit`)
    else if (a === 'link') {
      const url = `${location.origin}/r/${encodeURIComponent(it.key)}`
      try { navigator.clipboard && navigator.clipboard.writeText(url).catch(() => {}) } catch { /* no clipboard here */ }
      toast('Link copied')
    } else if (a === 'hide') { R().hide(it.p.id); toast(`${first(it.p.name)} is hidden from your reels`) }
  })
  $('mReelReport').addEventListener('click', (e) => {
    const b = e.target.closest('[data-rreason]')
    if (!b) return
    closeSheet()
    toast('Thanks. We will look at this attempt.')
  })

  /* ------------------------------------------------------------ comments */
  let comItem = null
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
  function paintComments() {
    const list = R().comments(comItem)
    $('mReelComList').innerHTML = list.map((c) => `<li><span class="m-rcom-ava" data-mono="${c.mono || ''}"><img src="${c.ava}" alt="" style="${c.avaStyle || ''}"></span><div><b>${esc(c.name)}</b><time>${esc(c.when)}</time><p>${esc(c.text)}</p></div></li>`).join('')
    const n = R().commentCount(comItem)
    $('mReelComTitle').textContent = `Comments, ${n.toLocaleString('en-US')}`
  }
  function openComments(it, from) {
    comItem = it
    paintComments()
    $('mReelComInput').value = ''
    openSheet($('mReelComments'), from)
  }
  $('mReelComForm').addEventListener('submit', (e) => {
    e.preventDefault()
    const input = $('mReelComInput'), text = input.value.trim()
    if (!text || !comItem) { input.focus(); return }
    R().comment(comItem, text.slice(0, 120))
    input.value = ''
    paintComments()
    $('mReelComList').scrollTop = 0
    say('Comment posted')
  })

  // the feed's own buttons: comment and the three dots open their sheets here
  feed.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ract="more"], [data-ract="comment"]')
    if (!b || !R()) return
    const it = R().itemOf(b)
    if (!it) return
    if (b.dataset.ract === 'more') openMenu(it, b)
    else openComments(it, b)
  })

  /* ------------------------------------------------------------ Customise points at a section */
  // the three sections are drawn on every attempt, so the rows' marks land on the attempt in view
  const carriers = [...reelEl.querySelectorAll('.m-reel-secs [data-sec]')]
  const mirror = () => {
    const cur = feed.querySelector('.m-reel-slide.is-on')
    if (!cur) return
    for (const c of carriers) cur.querySelectorAll(`[data-part="${c.dataset.sec}"]`).forEach((p) => p.classList.toggle('is-target', c.classList.contains('is-target')))
    // the Grid row points at the grid itself
    const grid = $('mReelGridList'), gc = carriers.find((c) => c.dataset.sec === 'grid')
    if (grid && gc) grid.classList.toggle('is-target', gc.classList.contains('is-target'))
  }
  if (window.MutationObserver) {
    const mo = new MutationObserver(mirror)
    carriers.forEach((c) => mo.observe(c, { attributes: true, attributeFilter: ['class'] }))
  }

  /* ------------------------------------------------------------ more players from the photo library */
  // the reel's own crowd: every group of shots manifest.json tags "crowd-..." is one person with a shoot of their own,
  // their avatar cut from their own photo, so no face stands in for anyone else. Only their strikes join everyone's
  // attempts, one still per attempt. The board's players and the machine's regulars carry their own tags and never
  // turn up here under a second name; a library shot with no tag is page imagery and stays out of the reel.
  // Names follow who is in the photos
  const NAMES = {
    woman: [['Maya Kareem', 'Dubai, UAE'], ['Elena Petrova', 'Sofia, BG'], ['Aisha Bello', 'Lagos, NG'], ['Farah Qasim', 'Amman, JO'], ['Zoe Martin', 'Lyon, FR'], ['Priya Nair', 'Abu Dhabi, UAE'], ['Hiba Saleh', 'Riyadh, SA'], ['Mei Tanaka', 'Osaka, JP']],
    man: [['Jonah Reyes', 'Manila, PH'], ['Kenji Mori', 'Osaka, JP'], ['Luca Romano', 'Milan, IT'], ['Samir Khoury', 'Beirut, LB'], ['Idris Cole', 'Manchester, UK'], ['Mateo Silva', 'Lisbon, PT'], ['Oscar Lind', 'Stockholm, SE'], ['Bilal Anwar', 'Dubai, UAE']],
  }
  const VENUES = [
    ['Dubai Mall, Ground Level', 'Machine by the ice rink'], ['Mall of the Emirates', 'Machine at Magic Planet'], ['City Walk, Dubai', 'Machine at Hub Zero'],
    ['Yas Mall, Abu Dhabi', 'Machine at the family zone'], ['Dubai Festival City Mall', 'Machine on the waterfront'], ['Ibn Battuta Mall, Dubai', 'Machine in China Court'],
  ]
  const hash = (t) => { let h = 0; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h }
  const focalOf = (f) => {
    if (typeof f === 'string') { const m = f.match(/(-?[\d.]+)%?\s+(-?[\d.]+)%?/); if (m) return [+m[1], +m[2]] }
    if (f && typeof f === 'object') return [f.x <= 1 ? f.x * 100 : f.x, f.y <= 1 ? f.y * 100 : f.y]
    return [50, 35]
  }
  const focal = (m) => focalOf(m.focal).map((v) => Math.round(Math.min(100, Math.max(0, v))))
  function libPlayers(man) {
    const list = Array.isArray(man) ? man : (man && (man.photos || man.items || man.images)) || []
    const groups = new Map()
    for (const m of list) {
      if (!m.file || /\//.test(m.file) || !/^crowd-/.test(m.player || '')) continue
      if (!groups.has(m.player)) groups.set(m.player, [])
      groups.get(m.player).push(m)
    }
    const used = { woman: 0, man: 0 }
    const out = []
    for (const [gid, shots] of groups) {
      const tags = shots.flatMap((m) => [].concat(m.tags || []))
      const sex = tags.includes('woman') ? 'woman' : tags.includes('man') ? 'man' : null
      const strikes = shots.filter((m) => /strike/i.test(m.subject || ''))
      if (!sex || !strikes.length || used[sex] >= NAMES[sex].length) continue
      const [name, city] = NAMES[sex][used[sex]++]
      const seed = hash(gid)
      // a strike frames the fist, not the face: a player with no portrait in their shoot wears their initials
      const face = shots.find((m) => /boxer/i.test(m.subject || ''))
      const avaFrom = face || strikes[0], [ax, ay] = focal(avaFrom)
      const cut = strikes.map((m) => { const [fx, fy] = focal(m); return { photo: `assets/photos/lib/${m.file}`, crop: { pos: `${fx}% ${fy}%`, z: 1.1 } } })
      out.push({
        mono: face ? '' : name.split(' ').map((w) => w[0]).join(''),
        id: `lib-${gid}`, name, city, handle: '@' + name.split(' ')[0].toLowerCase() + '.punch',
        ava: `assets/photos/lib/${avaFrom.file}`, avaStyle: `object-position:${ax}% ${ay}%;transform:scale(2.2);transform-origin:${ax}% ${ay}%`,
        photo: cut[0].photo, crop: cut[0].crop, shots: cut,
        score: window.PunchFormat ? window.PunchFormat.withDecimals(640000 + (seed % 330000), `lib:${gid}`) : 640000 + (seed % 330000),
        followers: 400 + (seed % 5200), spots: [VENUES[seed % VENUES.length], VENUES[(seed + 2) % VENUES.length], VENUES[(seed + 4) % VENUES.length]],
      })
    }
    return out
  }
  if (!EMBED && window.fetch) {
    fetch('assets/photos/lib/manifest.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((man) => { if (man && R()) R().addPlayers(libPlayers(man)) })
      .catch(() => { /* the library is optional: the board's players still fill the reel */ })
  }

  /* ------------------------------------------------------------ the punch videos */
  // assets/video/lib/manifest.json: thirteen vertical clips (720 x 1280, muted, looping, a poster at the strike frame).
  // Each shoot is one person, so the clips of one shoot are one player's attempts and nobody else's; their avatar is cut
  // from their own poster where the face shows, and their initials stand in where it does not. The reel deals the clips
  // into everyone's attempts, every other place while they last (mobile.js reelDeal)
  const VID = 'assets/video/lib/'
  const VIDEO_PLAYERS = [
    { id: 'vid-tessa', name: 'Tessa Grant', city: 'Dubai, UAE', clips: ['jab-pass', 'fist-cam'] },
    { id: 'vid-yara', name: 'Yara Mansoor', city: 'Dubai, UAE', clips: ['bag-backlit', 'bag-shadow', 'pads-below'] },
    { id: 'vid-amira', name: 'Amira Said', city: 'Sharjah, UAE', clips: ['pads-guard'], face: ['pads-guard', 57, 30, 2.2] },
    { id: 'vid-daniel', name: 'Daniel Price', city: 'Abu Dhabi, UAE', clips: ['cross-cam'] },
    { id: 'vid-nikola', name: 'Nikola Horvat', city: 'Dubai, UAE', clips: ['shadow-low'], face: ['shadow-low', 83, 60, 2.4] },
    { id: 'vid-tariq', name: 'Tariq Hamdan', city: 'Dubai, UAE', clips: ['bag-dark'] },
    { id: 'vid-sofia', name: 'Sofia Laurent', city: 'Dubai, UAE', clips: ['pads-window'] },
    { id: 'vid-marcus', name: 'Marcus Hale', city: 'Dubai, UAE', clips: ['bag-duo'] },
    { id: 'vid-andre', name: 'Andre Mensah', city: 'Dubai, UAE', clips: ['gloves-pov'], face: ['gloves-pov', 85, 39, 2.4] },
    { id: 'vid-kofi', name: 'Kofi Boateng', city: 'Abu Dhabi, UAE', clips: ['shadow-bars'], face: ['shadow-bars', 17, 30, 2.4] },
  ]
  // the face is moved towards the middle of the circle and scaled up (face: clip, x %, y %, scale); it moves only as far
  // as the scaled picture still covers the circle, so a face near the frame's edge sits a little off centre
  function faceStyle([, fx, fy, k]) {
    const cx = Math.min(100 - 50 / k, Math.max(50 / k, fx))
    return `object-position:${cx}% ${fy}%;transform-origin:${cx}% ${fy}%;transform:translate(${(50 - cx).toFixed(1)}%, ${(50 - fy).toFixed(1)}%) scale(${k})`
  }
  function videoPlayers(man) {
    const by = new Map((Array.isArray(man) ? man : []).map((m) => [m.name, m]))
    const out = []
    for (const def of VIDEO_PLAYERS) {
      const clips = def.clips.map((n) => by.get(n)).filter((m) => m && m.v && m.v_poster)
      if (!clips.length) continue
      const seed = hash(def.id)
      const shots = clips.map((m) => ({
        photo: VID + m.v_poster, crop: { pos: m.focal_v || '50% 50%', z: 1 },
        video: { name: m.name, v: VID + m.v, poster: VID + m.v_poster, dur: +m.duration || 4, strike: +m.strike || 1, focal: m.focal_v || '50% 50%' },
      }))
      const face = def.face && by.get(def.face[0])
      out.push({
        id: def.id, name: def.name, city: def.city, handle: '@' + def.name.split(' ')[0].toLowerCase() + '.punch',
        mono: face ? '' : def.name.split(' ').map((w) => w[0]).join(''),
        ava: face ? VID + face.v_poster : shots[0].photo,
        avaStyle: face ? faceStyle(def.face) : '',
        photo: shots[0].photo, crop: shots[0].crop, shots,
        score: window.PunchFormat ? window.PunchFormat.withDecimals(700000 + (seed % 280000), def.id) : 700000 + (seed % 280000),
        followers: 900 + (seed % 6400), spots: [VENUES[seed % VENUES.length], VENUES[(seed + 1) % VENUES.length], VENUES[(seed + 3) % VENUES.length]],
      })
    }
    return out
  }
  if (!EMBED && window.fetch) {
    fetch(VID + 'manifest.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((man) => {
        if (!man || !R()) return
        R().addPlayers(videoPlayers(man))
        document.dispatchEvent(new CustomEvent('reelvideos'))
      })
      .catch(() => { /* no videos: the stills still fill the reel */ })
  }
})()
