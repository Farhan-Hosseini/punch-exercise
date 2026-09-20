/* Machine screen: attract, the leaderboard between players (parts/mscreen-attract.html, mscreens/attract.css).
   One frame, four sections (psec.js). This script draws the two board sections in the design chosen for each
   (PSec.get('machine', 'attract', 'top' | 'ranks')), fills the Title and the Call to play with the board on show, and
   runs the cycle: Global, National (players in the UAE), Dubai, every few seconds while the screen is up, with the time
   left on the board shown by the board switch, whose red segment drains (and by the ring in the Timer ring design).
   It starts on the "mscreen" event, stops when another screen opens, and redraws a section when its "psec" arrives.
   The players are the phone's own (window.punchApp.leaders()), joined by the venue's regulars so the National and
   Dubai boards fill out; scores go through window.PunchFormat. */
(() => {
  'use strict'
  const host = document.querySelector('.mscreen-attract')
  const frame = host && host.querySelector('.msa')
  if (!frame) return
  const PAGE = 'attract'
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

  const TOP_SCORE = 999999.999
  const CYCLE = 9000
  const SWAP = 340
  const SCOPES = [
    { key: 'global', name: 'Global', icon: 'globe', keep: () => true },
    { key: 'national', name: 'National', icon: 'flag', keep: (p) => /\bUAE$/.test(p.city) },
    { key: 'dubai', name: 'Dubai', icon: 'map-pin', keep: (p) => /^Dubai\b/.test(p.city) },
  ]
  const TOP_KINDS = ['cards', 'podium', 'champion', 'meter', 'tiles']
  const RANK_KINDS = ['rows', 'table', 'meter', 'tiles']

  const A = (n) => `assets/app/avatars/${n}.jpg`
  const F = (n) => `assets/app/feed/${n}.jpg`
  const L = (n) => `assets/photos/lib/${n}.jpg`
  // the phone's players, used only when the phone's script is not on the page. Each photo is the player's own "attract"
  // shot (mobile.js SHOTS), a shot no other screen uses
  const FALLBACK = [
    { id: 'me', name: 'Sara Malik', city: 'Dubai, UAE', score: 999999, delta: 8, ava: A('sara'), photo: F('7777436') },
    { id: 'zayd', name: 'Zayd Rahman', city: 'London, UK', score: 987654, delta: 3, ava: A('zayd'), photo: F('6295830') },
    { id: 'lina', name: 'Lina Castillo', city: 'Madrid, ES', score: 942108, delta: 1, ava: A('lina'), photo: F('6551177') },
    { id: 'omar', name: 'Omar Nasser', city: 'Dubai, UAE', score: 931440, delta: -2, ava: A('omar'), photo: F('4804040') },
    { id: 'noor', name: 'Noor Aziz', city: 'Dubai, UAE', score: 918220, delta: 10, ava: A('noor'), photo: F('8469884') },
    { id: 'rami', name: 'Rami Haddad', city: 'Beirut, LB', score: 902775, delta: 52, ava: A('rami'), photo: F('7289294') },
    { id: 'yusuf', name: 'Yusuf Idris', city: 'Sharjah, UAE', score: 876543, delta: 4, ava: A('yusuf'), photo: F('3926958') },
    { id: 'hana', name: 'Hana Sato', city: 'Tokyo, JP', score: 861200, delta: 0, ava: A('hana'), photo: F('8809981') },
    { id: 'adam', name: 'Adam Brooks', city: 'Tampa, US', score: 845990, delta: -1, ava: A('adam'), photo: F('8810065') },
    { id: 'leila', name: 'Leila Haddad', city: 'Dubai, UAE', score: 832405, delta: 2, ava: A('leila'), photo: F('8472149') },
    { id: 'karim', name: 'Karim Mansour', city: 'Abu Dhabi, UAE', score: 812940, delta: -3, ava: A('karim'), photo: F('6456231') },
  ]
  // the venue's regulars: below every phone player on the Global board, so they only show on National and Dubai. Each
  // tile photo is theirs alone (manifest.json tags it with their id) and no other screen shows it
  const LOCALS = [
    { id: 'hamad', name: 'Hamad Saeed', city: 'Dubai, UAE', score: 804310, delta: 5, ava: A('hamad'), photo: L('bag-strike-24'), pos: '62% 38%' },
    { id: 'yara', name: 'Yara Khalil', city: 'Dubai, UAE', score: 796122, delta: -1, ava: A('yara'), photo: L('boxer-1'), pos: '52% 38%' },
    { id: 'tariq', name: 'Tariq Saleh', city: 'Abu Dhabi, UAE', score: 788450, delta: 3, ava: A('tariq'), photo: L('boxer-6'), pos: '33% 30%' },
    { id: 'mia', name: 'Mia Tan', city: 'Dubai, UAE', score: 779905, delta: 0, ava: A('mia'), photo: L('boxer-7'), pos: '45% 22%' },
    { id: 'faris', name: 'Faris Amiri', city: 'Dubai, UAE', score: 771660, delta: 12, ava: A('faris'), photo: L('boxer-8'), pos: '38% 45%' },
    { id: 'amara', name: 'Amara Obi', city: 'Sharjah, UAE', score: 764300, delta: -2, ava: A('amara'), photo: L('fist-strike-26'), pos: '56% 34%' },
    { id: 'arjun', name: 'Arjun Mehta', city: 'Dubai, UAE', score: 752870, delta: 6, ava: A('arjun'), photo: L('bag-strike-1'), pos: '62% 30%' },
    { id: 'nadia', name: 'Nadia Farouk', city: 'Ajman, UAE', score: 741205, delta: 1, ava: A('nadia'), photo: L('bag-strike-2'), pos: '38% 32%' },
  ]
  // the phone players' shots are cut at their focal point (assets/app/feed), so one position frames them all
  const CROP = {}
  const SHOT_POS = '50% 30%'

  const PF = () => window.PunchFormat
  const scoreText = (n) => (PF() ? PF().score(n) : Math.floor(n).toLocaleString('en-US'))
  const scoreHTML = (n) => (PF() ? PF().scoreHTML(n) : Math.floor(n).toLocaleString('en-US'))
  const chars = (n) => (PF() ? PF().width(n, 0.46) : String(Math.floor(n)).length + 1)
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const ico = (name) => (window.lucide ? window.lucide(name) : '')
  let myScore = null

  function people() {
    let list = null
    try { list = window.punchApp && typeof window.punchApp.leaders === 'function' ? window.punchApp.leaders() : null } catch { list = null }
    if (!Array.isArray(list) || !list.length) list = FALLBACK
    const have = new Set(list.map((p) => p.id))
    return list.concat(LOCALS.filter((p) => !have.has(p.id)))
      .map((p) => {
        let s = p.id === 'me' && myScore != null ? myScore : Number(p.score) || 0
        // example players carry whole points; give them stable decimals so the full length reads true
        if (Number.isInteger(s) && PF()) s = PF().withDecimals(s, p.id || p.name)
        return { ...p, score: Math.max(0, Math.min(TOP_SCORE, s)), photo: p.photo || p.ava }
      })
      .sort((a, b) => b.score - a.score)
  }
  const board = (scope) => people().filter(scope.keep).map((p, i) => ({ ...p, rank: i + 1 }))
  const at = (list, i) => list[i] || { open: true, rank: i + 1 }

  /* ------------------------------------------------------------ the pieces every board uses */
  const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>'
  function move(d) {
    d |= 0
    if (d > 0) return `<span class="msa-move up" aria-hidden="true">${ARROW}<span>${d}</span></span>`
    if (d < 0) return `<span class="msa-move down" aria-hidden="true">${ARROW}<span>${-d}</span></span>`
    return '<span class="msa-move same" aria-hidden="true"></span>'
  }
  const moveWords = (d) => (d > 0 ? `up ${d}` : d < 0 ? `down ${-d}` : 'no change')
  const pts = (score, cls = 'msa-pts') => `<span class="${cls}" style="--chars:${chars(score).toFixed(2)}">${scoreHTML(score)}</span>`
  const ava = (p) => `<img class="msa-ava" src="${esc(p.ava)}" alt="" width="256" height="256" decoding="async">`
  const ghost = () => `<span class="msa-ghost" aria-hidden="true">${ico('user-round')}</span>`
  function pic(p) {
    const c = CROP[p.id] || {}
    const pos = c.pos || p.pos || SHOT_POS
    const zoom = c.zoom ? `transform:scale(${c.zoom});transform-origin:${pos};` : ''
    return `<img class="msa-pic" src="${esc(p.photo)}" alt="" loading="lazy" decoding="async" style="object-position:${pos};${zoom}">`
  }
  const first = (p) => esc(p.name.split(' ')[0])
  const name = (p, crown) => `<span class="msa-name">${crown ? ico('crown') : ''}<span>${esc(p.name)}</span></span>`
  const who = (p, crown) => `<span class="msa-who">${name(p, crown)}<span class="msa-city">${esc(p.city)}</span></span>`
  const openWho = (line = 'Punch today to take it') => `<span class="msa-who"><span class="msa-name msa-open-name"><span>Open spot</span></span><span class="msa-city msa-open-city">${line}</span></span>`
  const lab = (p) => (p.open ? `aria-label="Rank ${p.rank}, open spot"` : `aria-label="Rank ${p.rank}, ${esc(p.name)}, ${esc(p.city)}, ${scoreText(p.score)} points, ${moveWords(p.delta | 0)}"`)
  const li = (cls, p, i, body) => `<li class="${cls}${p.open ? ' is-open' : ''}" style="--i:${i}" ${lab(p)}>${body}</li>`

  /* ------------------------------------------------------------ Top three: the phone's five board styles */
  const TOP = {
    cards(list) {
      let h = ''
      for (let i = 0; i < 3; i++) {
        const p = at(list, i)
        h += li(`msa-card${i === 0 ? ' is-lead' : ''}`, p, i, p.open
          ? `<span class="msa-rk is-red">${p.rank}</span>${ghost()}${openWho()}<span class="msa-end"></span>`
          : `<span class="msa-rk is-red">${p.rank}</span>${ava(p)}${who(p, i === 0)}<span class="msa-end">${pts(p.score)}${move(p.delta)}</span>`)
      }
      return `<ol class="msa-cards">${h}</ol>`
    },
    podium(list) {
      const step = (i, cls) => {
        const p = at(list, i)
        if (p.open) return li(`msa-step ${cls}`, p, i, `<span class="msa-step-ring">${ghost()}</span><span class="msa-step-name msa-open-name">Open spot</span><span class="msa-block"><span class="msa-block-rk">${p.rank}</span></span>`)
        return li(`msa-step ${cls}`, p, i, `${i === 0 ? `<span class="msa-crown" aria-hidden="true">${ico('crown')}</span>` : ''}<span class="msa-step-ring">${ava(p)}</span>
          <span class="msa-step-name">${first(p)}</span>${pts(p.score)}
          <span class="msa-block"><span class="msa-block-rk">${p.rank}</span><span class="msa-block-city">${esc(p.city)}</span></span>`)
      }
      // the list keeps rank order for screen readers; the grid stands them second, first, third as the phone does
      return `<ol class="msa-podium">${step(0, 'first')}${step(1, 'second')}${step(2, 'third')}</ol>`
    },
    champion(list) {
      const c = at(list, 0)
      let h = c.open
        ? li('msa-champ-card', c, 0, `<span class="msa-champ-cap">${ico('crown')}Champion</span><span class="msa-champ-who">${ghost()}<span class="msa-champ-name">Open spot</span></span>`)
        : li('msa-champ-card', c, 0, `<span class="msa-champ-photo" aria-hidden="true">${pic(c)}</span>
          <span class="msa-champ-mark" aria-hidden="true">${ico('crown')}</span>
          <span class="msa-champ-cap">${ico('crown')}Champion</span>
          <span class="msa-champ-who">${ava(c)}<span class="msa-champ-name">${esc(c.name)}</span></span>
          ${pts(c.score)}
          <span class="msa-champ-foot">${ico('map-pin')}<span>${esc(c.city)}</span>${move(c.delta)}</span>`)
      for (let i = 1; i < 3; i++) {
        const p = at(list, i)
        h += li('msa-lite', p, i, p.open
          ? `<span class="msa-rk is-red">${p.rank}</span>${ghost()}${openWho()}<span class="msa-end"></span>`
          : `<span class="msa-rk is-red">${p.rank}</span>${ava(p)}${who(p)}<span class="msa-end">${pts(p.score)}${move(p.delta)}</span>`)
      }
      return `<ol class="msa-champ">${h}</ol>`
    },
    meter(list) {
      const top = list[0] ? list[0].score : TOP_SCORE
      let h = ''
      for (let i = 0; i < 3; i++) {
        const p = at(list, i)
        h += li(`msa-meter${i === 0 ? ' is-lead' : ''}`, p, i, `<span class="msa-meter-line"><span class="msa-rk is-red">${p.rank}</span>${p.open ? ghost() + openWho() + '<span class="msa-end"></span>' : ava(p) + who(p, i === 0) + `<span class="msa-end">${move(p.delta)}</span>`}</span>
          <span class="msa-meter-run"><span class="msa-bar" aria-hidden="true"><i style="--w:${p.open ? 0 : (p.score / top).toFixed(4)}"></i></span>${p.open ? '' : pts(p.score)}</span>`)
      }
      return `<ol class="msa-meters">${h}</ol>`
    },
    tiles(list) {
      let h = ''
      for (let i = 0; i < 3; i++) {
        const p = at(list, i)
        if (p.open) { h += li(`msa-tile${i === 0 ? ' is-lead' : ''}`, p, i, `${ghost()}${openWho()}`); continue }
        const body = i === 0
          ? `${who(p, true)}<span class="msa-tile-row">${pts(p.score)}${move(p.delta)}</span>`
          : `${who(p)}${pts(p.score)}`
        h += li(`msa-tile${i === 0 ? ' is-lead' : ''}`, p, i, `${pic(p)}<span class="msa-shade" aria-hidden="true"></span><span class="msa-rk is-red">${p.rank}</span>${body}`)
      }
      return `<ol class="msa-tiles">${h}</ol>`
    },
  }

  /* ------------------------------------------------------------ Ranks 4 to 10: five row styles */
  const seven = (list) => [3, 4, 5, 6, 7, 8, 9].map((i) => at(list, i))
  const RANKS = {
    rows(list) {
      const h = seven(list).map((p, k) => li('msa-row', p, k + 3, p.open
        ? `<span class="msa-rk">${p.rank}</span>${ghost()}${openWho()}<span class="msa-end"></span>`
        : `<span class="msa-rk">${p.rank}</span>${ava(p)}${who(p)}<span class="msa-end">${pts(p.score)}${move(p.delta)}</span>`)).join('')
      return `<ol class="msa-rows" start="4">${h}</ol>`
    },
    table(list) {
      const h = seven(list).map((p, k) => li('msa-tr', p, k + 3, p.open
        ? `<span class="msa-tr-rk">${p.rank}</span>${openWho()}`
        : `<span class="msa-tr-rk">${p.rank}</span>${who(p)}${move(p.delta)}${pts(p.score)}`)).join('')
      return `<div class="msa-table"><p class="msa-tr is-head" aria-hidden="true"><span>Rank</span><span class="msa-th-player">Player</span><span class="msa-th-pts">Points</span></p><ol class="msa-tbody" start="4">${h}</ol></div>`
    },
    meter(list) {
      const top = list[0] ? list[0].score : TOP_SCORE
      const h = seven(list).map((p, k) => li('msa-mrow', p, k + 3, `<span class="msa-mrow-line"><span class="msa-tr-rk">${p.rank}</span>${p.open
        ? ghost() + openWho() + '<span class="msa-end"></span>'
        : ava(p) + who(p) + `<span class="msa-end">${pts(p.score)}${move(p.delta)}</span>`}</span>
        <span class="msa-bar" aria-hidden="true"><i style="--w:${p.open ? 0 : (p.score / top).toFixed(4)}"></i></span>`)).join('')
      return `<ol class="msa-mrows" start="4">${h}</ol>`
    },
    tiles(list) {
      const h = seven(list).map((p, k) => {
        if (p.open) return li('msa-rtile', p, k + 3, `<span class="msa-rk">${p.rank}</span>${openWho('Take it today')}`)
        const body = k === 0
          ? `${who(p)}<span class="msa-end">${pts(p.score)}${move(p.delta)}</span>`
          : `<span class="msa-rtile-head"><span class="msa-rk is-red">${p.rank}</span><span class="msa-name"><span>${first(p)}</span></span></span>${move(p.delta)}${pts(p.score)}`
        return li('msa-rtile', p, k + 3, `${pic(p)}<span class="msa-shade" aria-hidden="true"></span>${k === 0 ? `<span class="msa-rk is-red">${p.rank}</span>` : ''}${body}`)
      }).join('')
      return `<ol class="msa-rtiles" start="4">${h}</ol>`
    },
  }

  /* ------------------------------------------------------------ painting the board on show */
  const topBody = frame.querySelector('[data-msa-top]')
  const ranksBody = frame.querySelector('[data-msa-ranks]')
  const pick = (sec) => (window.PSec ? window.PSec.get('machine', PAGE, sec) : 0)
  let idx = 0

  function paintTop(list) {
    const kind = TOP_KINDS[pick('top')] || 'cards'
    topBody.dataset.kind = kind
    topBody.innerHTML = TOP[kind](list)
  }
  function paintRanks(list) {
    const kind = RANK_KINDS[pick('ranks')] || 'rows'
    ranksBody.dataset.kind = kind
    ranksBody.innerHTML = RANKS[kind](list)
  }
  function paintTitle() {
    const scope = SCOPES[idx]
    frame.querySelectorAll('[data-msa-name]').forEach((el) => { el.textContent = scope.name })
    frame.querySelectorAll('[data-msa-next]').forEach((el) => { el.textContent = SCOPES[(idx + 1) % SCOPES.length].name })
    frame.querySelectorAll('[data-msa-icon]').forEach((el) => { el.dataset.lucide = scope.icon; if (window.paintLucide) window.paintLucide(el) })
    frame.querySelectorAll('.msa-scope').forEach((el) => {
      const k = SCOPES.findIndex((s) => s.key === el.dataset.scope)
      el.classList.toggle('is-on', k === idx)
      el.classList.toggle('is-done', k < idx)
    })
    frame.querySelectorAll('.msa-t-pics img').forEach((img) => img.classList.toggle('is-on', img.dataset.scope === scope.key))
    tick()
  }
  // the You row: what the next player needs to make this board's top ten, or the open place a smaller board still has
  function paintYou(list) {
    const scope = SCOPES[idx]
    const full = list.length >= 10
    const rank = full ? 10 : list.length + 1
    const need = full ? list[9].score : 0
    const top = list[0] ? list[0].score : TOP_SCORE
    frame.querySelectorAll('[data-msa-you-line]').forEach((el) => { el.textContent = full ? 'Top ten needs' : `Rank ${rank}` })
    frame.querySelectorAll('[data-msa-bar-line]').forEach((el) => { el.textContent = full ? 'Top ten needs this much' : `Any score takes rank ${rank}` })
    frame.querySelectorAll('[data-msa-you-score]').forEach((el) => { el.innerHTML = full ? pts(need) : '<span class="msa-you-open">Open</span>' })
    frame.querySelectorAll('[data-msa-open-rank]').forEach((el) => { el.textContent = String(rank) })
    frame.querySelectorAll('[data-msa-open-line]').forEach((el) => { el.textContent = `${scope.name} board` })
    frame.querySelectorAll('[data-msa-rank-line]').forEach((el) => { el.textContent = full ? 'Beat this score to take it' : 'Nobody holds it yet' })
    frame.querySelectorAll('[data-msa-rank-need]').forEach((el) => { el.innerHTML = full ? pts(need) : '<span class="msa-you-open">Any score</span>' })
    frame.querySelectorAll('.msa-you-bar').forEach((el) => el.style.setProperty('--cut', full ? Math.max(.05, Math.min(.95, need / top)).toFixed(3) : '.05'))
  }
  function paint() {
    const list = board(SCOPES[idx])
    frame.dataset.scope = SCOPES[idx].key
    paintTitle()
    paintTop(list)
    paintRanks(list)
    paintYou(list)
  }

  /* ------------------------------------------------------------ motion */
  let live = false, held = false, cycleTimer = 0, swapTimer = 0, tickTimer = 0, cycleStart = 0
  function enter(el) {
    if (!el) return
    el.classList.remove('is-entering')
    if (reduced.matches) return
    void el.offsetWidth
    el.classList.add('is-entering')
  }
  const active = (sec) => (window.PSec ? window.PSec.active('machine', PAGE, sec) : null)
  // the running fills follow the board's clock: a design that comes up halfway through picks up where the board is
  function restartFills(root) {
    frame.style.setProperty('--msa-lag', `${-Math.max(0, Math.round(performance.now() - cycleStart))}ms`)
    ;(root || frame).querySelectorAll('.msa-fill, .msa-ring-run').forEach((el) => {
      el.style.animation = 'none'
      void el.getBoundingClientRect()
      el.style.animation = ''
    })
  }
  function tick() {
    const left = live ? Math.min(CYCLE / 1000, Math.max(1, Math.ceil((CYCLE - (performance.now() - cycleStart)) / 1000))) : CYCLE / 1000
    frame.querySelectorAll('[data-msa-left]').forEach((el) => { if (el.textContent !== String(left)) el.textContent = String(left) })
    // the unit under the number in the ring: the short form, as the machine's other shot clocks write it
    frame.querySelectorAll('[data-msa-left-word]').forEach((el) => { if (el.textContent !== 'sec') el.textContent = 'sec' })
  }
  function schedule() {
    clearTimeout(cycleTimer)
    cycleStart = performance.now()
    if (!held) cycleTimer = setTimeout(() => { if (live) step() }, CYCLE)
  }
  function step() {
    idx = (idx + 1) % SCOPES.length
    if (reduced.matches) { paint(); schedule(); tick(); return }
    topBody.classList.add('is-leaving'); ranksBody.classList.add('is-leaving')
    swapTimer = setTimeout(() => {
      if (!live) return
      paint()
      for (const b of [topBody, ranksBody]) { b.classList.remove('is-leaving'); enter(b) }
      schedule()
      restartFills()
      tick()
    }, SWAP)
  }

  function start(opts) {
    stop()
    live = true
    if (typeof opts.score === 'number') myScore = opts.score
    idx = 0
    paint()
    host.classList.add('is-live'); frame.classList.add('is-live')
    schedule()
    restartFills()
    for (const b of [topBody, ranksBody, active('title'), active('cta')]) enter(b)
    clearInterval(tickTimer)
    tickTimer = setInterval(tick, 250)
    tick()
  }
  function stop() {
    live = false
    clearTimeout(cycleTimer); clearTimeout(swapTimer); clearInterval(tickTimer)
    host.classList.remove('is-live'); frame.classList.remove('is-live')
    frame.querySelectorAll('.is-entering, .is-leaving').forEach((el) => el.classList.remove('is-entering', 'is-leaving'))
  }

  // for checking a board by hand or by a script: hold one board up (0 Global, 1 National, 2 Dubai), then let it cycle again
  window.msAttract = {
    get scope() { return SCOPES[idx].key },
    hold(i) {
      held = true
      clearTimeout(cycleTimer); clearTimeout(swapTimer)
      idx = ((i | 0) % SCOPES.length + SCOPES.length) % SCOPES.length
      topBody.classList.remove('is-leaving'); ranksBody.classList.remove('is-leaving')
      paint(); schedule(); restartFills()
      return SCOPES[idx].key
    },
    resume() { held = false; if (live) schedule() },
  }

  paint()
  document.addEventListener('mscreen', (e) => {
    const { key, opts } = e.detail || {}
    if (key === PAGE) start(opts || {})
    else if (live) stop()
  })
  // a design chosen in Customise: the board sections redraw in it, the others come up where the board's clock is
  document.addEventListener('psec', (e) => {
    const d = e.detail || {}
    if (d.surface !== 'machine' || d.page !== PAGE) return
    const list = board(SCOPES[idx])
    if (d.sec === 'top') { paintTop(list); if (live) enter(topBody) }
    else if (d.sec === 'ranks') { paintRanks(list); if (live) enter(ranksBody) }
    else if (live && d.el) { enter(d.el); restartFills(d.el); tick() }
  })
  // the score format changed: redraw the board on show where it is in the cycle
  document.addEventListener('decimals', () => { paint() })
  // a hidden tab keeps the board where it was; coming back starts this board's time again
  document.addEventListener('visibilitychange', () => {
    if (!live) return
    if (document.hidden) { clearTimeout(cycleTimer); clearTimeout(swapTimer); topBody.classList.remove('is-leaving'); ranksBody.classList.remove('is-leaving') }
    else { schedule(); restartFills(); tick() }
  })
})()
