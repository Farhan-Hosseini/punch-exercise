/* Phone: a player's profile (parts/mpage-profile.html, mpages/profile.css).
   Four sections, each with five designs chosen in Customise under This screen (psec.js): Header (photo, name, city,
   follow), Stats (best hit, attempts, rank, streak), Hits (the kept replays, each opening the reel) and Badges. All four
   are drawn here from window.punchSocial.profile(), the model mobile.js keeps for the player on show; mobile.js answers
   the taps ([data-pact] follow and challenge, [data-reel] a hit, [data-go] the wallet). Motion: the sections rise in
   when the profile opens ("mpage"), a design rises in when Customise swaps it ("psec") and is brought into view, the
   meters and the trend fill once; nothing moves under reduced motion. Scores re-render on the "decimals" event. */
(() => {
  'use strict'
  const page = document.querySelector('.m-page[data-page="profile"]')
  const app = document.getElementById('mApp')
  if (!page || !app) return
  const root = page.querySelector('.mp')
  const el = {
    header: document.getElementById('mProfileHeader'),
    stats: document.getElementById('mProfileStats'),
    hits: document.getElementById('mHits'),
    badges: document.getElementById('mBadges'),
  }
  if (!root || Object.values(el).some((x) => !x)) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const PF = window.PunchFormat || { score: (n) => Math.floor(n).toLocaleString('en-US'), scoreHTML: (n) => Math.floor(n).toLocaleString('en-US') }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const L = (n) => `<span data-lucide="${n}"></span>`
  const social = () => window.punchSocial
  const short = (n) => (social() ? social().short(n) : String(n))
  const pts = (n, cls = '') => `<span class="m-pts${cls}">${PF.scoreHTML(n)}</span>`
  const sel = (key) => (window.PSec ? window.PSec.get('phone', 'profile', key) : 0)
  const force = (s) => Math.max(0, Math.min(1, s / 1000000))
  const credits = (n) => (n === 1 ? '1 credit' : `${n} credits`)

  /* ------------------------------------------------------------ Header: photo, name, city, follow */
  const nameH = (m, cls = '') => `<h2 class="mp-name${cls}" id="mProfileName">${esc(m.name)}</h2>`
  const facts = (m) => `<p class="mp-facts"><span>${L('map-pin')}${esc(m.city)}</span><span>${L('users-round')}${short(m.followers)} followers</span></p>`
  const btns = (m, cls = '') => {
    const follow = m.mine
      ? `<button class="m-btn m-btn-red mp-btn" type="button" data-pact="follow">${L('user-round')}Edit profile</button>`
      : `<button class="m-btn ${m.following ? 'm-btn-glass' : 'm-btn-red'} mp-btn" type="button" data-pact="follow" aria-pressed="${m.following}">${L(m.following ? 'user-check' : 'user-plus')}${m.following ? 'Following' : 'Follow'}</button>`
    const two = `<button class="m-btn m-btn-glass mp-btn" type="button" data-pact="challenge">${L(m.mine ? 'share-2' : 'swords')}${m.mine ? 'Share profile' : 'Challenge'}</button>`
    return `<div class="mp-btns${cls}">${follow}${two}</div>`
  }
  // your own profile carries the wallet: what is left, and the way to buy more credits
  const wallet = (m) => (m.mine ? `<div class="mp-own">
      <button class="mp-wallet" type="button" data-go="topup" aria-label="Wallet, ${credits(m.credits)}. Buy credits">
      <span class="mp-wallet-ico">${L('wallet')}</span><span class="mp-wallet-t"><b>Wallet</b><span data-credits>${credits(m.credits)}</span></span><span class="mp-wallet-go">Buy credits${L('chevron-right')}</span></button>
    </div>` : '')
  const HEADER = [
    // Centred: the face in its red ring. The world rank lives in Stats, which shows it in every design, so no header
    // but Rank card repeats it
    (m) => `<div class="mp-h mp-h-centred">
        <div class="mp-ava-ring"><img class="m-ava" src="${m.ava}" alt=""></div>
        ${nameH(m)}
        ${facts(m)}
        ${btns(m)}
        ${wallet(m)}
      </div>`,
    // Cover photo: where they punch behind them, the face overlapping it, everything read from the left
    (m) => `<div class="mp-h mp-h-cover">
        <div class="mp-cover"><img src="${m.cover.src}" alt="" style="object-position:${m.cover.pos}"></div>
        <div class="mp-cover-row"><img class="m-ava mp-cover-ava" src="${m.ava}" alt=""></div>
        ${nameH(m)}
        ${facts(m)}
        ${btns(m)}
        ${wallet(m)}
      </div>`,
    // Side by side: the face on the left, who they are beside it, the actions full width below
    (m) => `<div class="mp-h mp-h-side">
        <div class="mp-side">
          <img class="m-ava mp-side-ava" src="${m.ava}" alt="">
          <div class="mp-side-t">${nameH(m)}<span class="mp-handle">${esc(m.handle)}</span>${facts(m)}</div>
        </div>
        ${btns(m, ' is-wide')}
        ${wallet(m)}
      </div>`,
    // Portrait: their hit photo as the whole header, the name set on it
    (m) => `<div class="mp-h mp-h-portrait">
        <div class="mp-portrait mf-onphoto">
          <img src="${m.photo}" alt="" style="object-position:50% 28%">
          <div class="mp-portrait-t">${nameH(m, ' is-xl')}${facts(m)}</div>
        </div>
        ${btns(m, ' is-wide')}
        ${wallet(m)}
      </div>`,
    // Rank card: the place on the board is the headline, the person beside it
    (m) => `<div class="mp-h mp-h-rankcard">
        <div class="mp-rc m-glass">
          <div class="mp-rc-num"><span class="mp-rc-big"><span class="mp-rc-hash">#</span>${m.rank}</span><span class="mp-rc-cap">in the world</span><span class="mp-rc-city">${L('map-pin')}#${m.cityRank} in ${esc(m.city.split(',')[0])}</span></div>
          <div class="mp-rc-who"><img class="m-ava" src="${m.ava}" alt="">${nameH(m)}<span class="mp-handle">${esc(m.handle)}</span><span class="mp-rc-f">${L('users-round')}${short(m.followers)} followers</span></div>
        </div>
        ${btns(m, ' is-wide')}
        ${wallet(m)}
      </div>`,
  ]

  /* ------------------------------------------------------------ Stats: best, attempts, rank, streak */
  const days = (n) => (n === 1 ? '1 day' : `${n} days`)
  const trio = (m) => `<div class="mp-trio">
      <div><span class="mp-v">${m.punches}</span><span class="mp-l">${L('hand-fist')}Attempts</span></div>
      <div><span class="mp-v">#${m.rank}</span><span class="mp-l">${L('crown')}Rank</span></div>
      <div><span class="mp-v">${days(m.streak)}</span><span class="mp-l">${L('flame')}Streak</span></div>
    </div>`
  const weekLetters = () => Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toLocaleDateString('en-GB', { weekday: 'narrow' }) })
  const weekNames = () => Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return i === 6 ? 'today' : d.toLocaleDateString('en-GB', { weekday: 'long' }) })
  const STATS = [
    // Tiles: four equal tiles, an icon for each
    (m) => `<div class="mp-tiles">
        <div class="mp-tile m-glass"><span class="mp-ico">${L('trophy')}</span><span class="mp-tile-v">${pts(m.best)}</span><span class="mp-l">Best hit</span></div>
        <div class="mp-tile m-glass"><span class="mp-ico">${L('hand-fist')}</span><span class="mp-tile-v"><span class="mp-v">${m.punches}</span></span><span class="mp-l">Attempts</span></div>
        <div class="mp-tile m-glass"><span class="mp-ico">${L('crown')}</span><span class="mp-tile-v"><span class="mp-v">#${m.rank}</span><span class="mp-unit">world</span></span><span class="mp-l">Rank</span></div>
        <div class="mp-tile m-glass"><span class="mp-ico">${L('flame')}</span><span class="mp-tile-v"><span class="mp-v">${m.streak}</span><span class="mp-unit">${m.streak === 1 ? 'day' : 'days'}</span></span><span class="mp-l">Streak</span></div>
      </div>`,
    // Headline: the best hit large with the force it took, the rest in a row under it
    (m) => `<div class="mp-head m-glass">
        <span class="mp-head-cap">${L('trophy')}Best hit<span class="mp-grade">${esc(m.grade)}</span></span>
        ${pts(m.best, ' mp-head-pts')}
        <span class="mp-meter" aria-hidden="true"><i style="--w:${force(m.best).toFixed(3)}"></i></span>
        ${trio(m)}
      </div>`,
    // List: one row per figure, the label on the left, the figure on the right
    (m) => `<div class="mp-list">
        <div class="mp-row m-glass"><span class="mp-ico">${L('trophy')}</span><span class="mp-row-l">Best hit</span>${pts(m.best, ' mp-row-v')}</div>
        <div class="mp-row m-glass"><span class="mp-ico">${L('hand-fist')}</span><span class="mp-row-l">Attempts</span><span class="mp-v mp-row-v">${m.punches}</span></div>
        <div class="mp-row m-glass"><span class="mp-ico">${L('crown')}</span><span class="mp-row-l">World rank</span><span class="mp-v mp-row-v">#${m.rank}</span></div>
        <div class="mp-row m-glass"><span class="mp-ico">${L('flame')}</span><span class="mp-row-l">Streak</span><span class="mp-v mp-row-v">${days(m.streak)}</span></div>
      </div>`,
    // Streak week: the last seven days, a lit cell for each day with a hit
    (m) => {
      const letters = weekLetters(), names = weekNames()
      return `<div class="mp-week m-glass">
        <div class="mp-week-top"><span class="mp-week-flame">${L('flame')}</span><span class="mp-week-t"><b>${days(m.streak)} in a row</b><span>${m.streak >= 7 ? 'A full week. Keep it going.' : `${7 - m.streak === 1 ? 'One more day' : `${7 - m.streak} more days`} for Hot streak.`}</span></span></div>
        <ol class="mp-days" aria-label="The last seven days">${m.week.map((on, i) => `<li class="${on ? 'is-on' : ''}${i === 6 ? ' is-today' : ''}" aria-label="${names[i]}, ${on ? 'punched' : 'no hit'}"><span class="mp-day-cell">${on ? L('check') : ''}</span><span class="mp-day-l" aria-hidden="true">${letters[i]}</span></li>`).join('')}</ol>
        <div class="mp-week-foot"><span>${L('trophy')}Best ${pts(m.best)}</span><span>${L('hand-fist')}${m.punches} attempts</span><span>${L('crown')}#${m.rank}</span></div>
      </div>`
    },
    // Trend: the last nine attempts as bars, oldest on the left, the best in red
    (m) => {
      const list = [...m.hits].reverse(), max = Math.max(...list.map((h) => h.s)), min = Math.min(...list.map((h) => h.s))
      const floor = Math.max(0, min - (max - min) * 0.6)
      const topAt = list.findIndex((h) => h.s === max)
      return `<div class="mp-trend m-glass">
        <div class="mp-trend-top"><span class="mp-head-cap">${L('chart-column-increasing')}Last ${list.length} attempts</span>${pts(m.best, ' mp-trend-best')}</div>
        <div class="mp-bars" role="img" aria-label="${esc(`Scores of the last ${list.length} attempts, from ${PF.score(min)} to ${PF.score(max)} points; the best is the newest`)}">${list.map((h, i) => `<i class="${i === topAt ? 'is-top' : ''}" style="--h:${(0.12 + 0.88 * (h.s - floor) / (max - floor || 1)).toFixed(3)};--i:${i}"></i>`).join('')}</div>
        <div class="mp-bars-axis" aria-hidden="true"><span>Oldest</span><span>Newest</span></div>
        ${trio(m)}
      </div>`
    },
  ]

  /* ------------------------------------------------------------ Hits: the kept replays, each opens the reel */
  const hitLabel = (h) => `Play attempt, ${PF.score(h.s)} points, ${h.when}, ${h.venue}`
  const img = (h, cls = '') => `<img class="mp-hit-img${cls}" src="${h.photo}" alt="" loading="lazy" style="${h.style}">`
  const bestTag = (h) => (h.top ? `<span class="mp-best">${L('crown')}Best</span>` : '')
  const hitsHead = (m) => `<div class="mp-sh"><h3 class="mp-sh-h" id="mHitsH">Hits</h3><span class="mp-sh-note">${L('film')}${m.hits.length} replays kept</span><button class="mp-link" type="button" data-reel="0">${L('circle-play')}Play all</button></div>`
  const dayOf = (when) => when.split(',')[0]
  const timeOf = (when) => (when.includes(',') ? when.split(',').slice(1).join(',').trim() : '')
  const HITS = [
    // Grid: three across, the best outlined
    (m) => `<div class="mp-grid">${m.hits.map((h) => `
        <button class="mp-hit mf-onphoto${h.top ? ' is-best' : ''}" type="button" data-reel="${h.i}" aria-label="${esc(hitLabel(h))}">${img(h)}${bestTag(h)}<span class="mp-hit-play">${L('play')}</span>${pts(h.s, ' mp-hit-pts')}</button>`).join('')}</div>`,
    // Best first: the best hit takes a big square, the rest fill around it
    (m) => `<div class="mp-mosaic">${m.hits.map((h) => `
        <button class="mp-hit mf-onphoto${h.top ? ' is-best' : ''}" type="button" data-reel="${h.i}" aria-label="${esc(hitLabel(h))}">${img(h)}${h.top ? `<span class="mp-mo-t"><span class="mp-grade">${esc(h.grade)}</span>${pts(h.s, ' mp-mo-pts')}<span class="mp-mo-w">${esc(h.when)}</span></span><span class="mp-hit-play is-big">${L('play')}</span>` : `${pts(h.s, ' mp-hit-pts')}<span class="mp-hit-play">${L('play')}</span>`}</button>`).join('')}</div>`,
    // List: when and where beside each score
    (m) => `<div class="mp-hlist">${m.hits.map((h) => `
        <button class="mp-hrow m-glass${h.top ? ' is-best' : ''}" type="button" data-reel="${h.i}" aria-label="${esc(hitLabel(h))}">
          <span class="mp-hrow-th mf-onphoto">${img(h)}</span>
          <span class="mp-hrow-t">${pts(h.s, ' mp-hrow-pts')}<span class="mp-hrow-w">${L('clock')}${esc(h.when)}</span><span class="mp-hrow-w">${L('map-pin')}${esc(h.venue)}</span></span>
          <span class="mp-hrow-go">${h.top ? L('crown') : ''}${L('circle-play')}</span>
        </button>`).join('')}</div>`,
    // Carousel: big cards to swipe through
    (m) => `<div class="mf-rail mp-carousel">${m.hits.map((h) => `
        <button class="mp-cc mf-onphoto${h.top ? ' is-best' : ''}" type="button" data-reel="${h.i}" aria-label="${esc(hitLabel(h))}">${img(h)}${bestTag(h)}<span class="mp-hit-play">${L('play')}</span>
          <span class="mp-cc-t"><span class="mp-grade">${esc(h.grade)}</span>${pts(h.s, ' mp-cc-pts')}<span class="mp-cc-w">${esc(h.when)}</span><span class="mp-cc-w">${esc(h.venue)}</span></span></button>`).join('')}</div>`,
    // Timeline: by day, newest first, each hit at its time
    (m) => {
      const groups = []
      for (const h of m.hits) { const d = dayOf(h.when), g = groups[groups.length - 1]; if (g && g.day === d) g.items.push(h); else groups.push({ day: d, items: [h] }) }
      return `<div class="mp-tl">${groups.map((g) => `
        <div class="mp-tl-g"><p class="mp-tl-day">${L('calendar-days')}${esc(g.day)}</p>${g.items.map((h) => `
          <button class="mp-tl-item${h.top ? ' is-best' : ''}" type="button" data-reel="${h.i}" aria-label="${esc(hitLabel(h))}">
            <span class="mp-tl-dot" aria-hidden="true"></span>
            <span class="mp-tl-th mf-onphoto">${img(h)}<span class="mp-hit-play">${L('play')}</span></span>
            <span class="mp-tl-t">${timeOf(h.when) ? `<span class="mp-tl-time">${esc(timeOf(h.when))}</span>` : ''}${pts(h.s, ' mp-tl-pts')}<span class="mp-tl-w">${esc(h.venue)}</span>${h.top ? `<span class="mp-best is-inline">${L('crown')}Best</span>` : ''}</span>
          </button>`).join('')}</div>`).join('')}</div>`
    },
  ]

  /* ------------------------------------------------------------ Badges: achievements with icons */
  const badgesHead = (m) => { const n = m.badges.filter((b) => b.got).length; return `<div class="mp-sh"><h3 class="mp-sh-h" id="mBadgesH">Badges</h3><span class="mp-sh-note">${L('award')}${n} of ${m.badges.length} earned</span></div>` }
  const state = (b) => (b.got ? `<span class="mp-bstate is-got">${L('badge-check')}Earned</span>` : `<span class="mp-bstate">${L('lock')}${esc(b.left)}</span>`)
  const BADGES = [
    // Cards: two across, the icon, the name and what it takes
    (m) => `<div class="mp-bcards">${m.badges.map((b) => `
        <div class="mp-bcard m-glass${b.got ? '' : ' is-locked'}"><span class="mp-bico">${L(b.icon)}</span><b>${esc(b.name)}</b><p>${esc(b.text)}</p>${state(b)}</div>`).join('')}</div>`,
    // Medals: round medallions three across
    (m) => `<ul class="mp-medals">${m.badges.map((b) => `
        <li class="mp-medal${b.got ? '' : ' is-locked'}"><span class="mp-medal-o" style="--p:${b.pct.toFixed(3)}" aria-hidden="true"><span class="mp-medal-i">${L(b.icon)}</span>${b.got ? '' : `<span class="mp-medal-lock">${L('lock')}</span>`}</span><b>${esc(b.name)}</b><span class="mp-medal-s">${b.got ? 'Earned' : `${Math.round(b.pct * 100)}% there`}</span><span class="mp-sr">${esc(b.text)}${b.got ? '' : ` ${esc(b.left)}.`}</span></li>`).join('')}</ul>`,
    // Progress list: how far along each one is
    (m) => `<div class="mp-plist">${m.badges.map((b) => `
        <div class="mp-prow m-glass${b.got ? '' : ' is-locked'}"><span class="mp-bico">${L(b.icon)}</span><span class="mp-prow-t"><b>${esc(b.name)}</b><span>${esc(b.text)}</span><span class="mp-pbar" aria-hidden="true"><i style="--w:${b.pct.toFixed(3)}"></i></span></span>${state(b)}</div>`).join('')}</div>`,
    // Next up: the badge closest to earning, large, and the earned ones in a row
    (m) => {
      const locked = m.badges.filter((b) => !b.got).sort((a, b) => b.pct - a.pct)
      const next = locked[0], got = m.badges.filter((b) => b.got)
      const big = next ? `<div class="mp-next m-glass">
          <span class="mp-next-ring" style="--p:${next.pct.toFixed(3)}"><span>${L(next.icon)}</span></span>
          <span class="mp-next-t"><span class="mp-next-cap">Next up</span><b>${esc(next.name)}</b><span>${esc(next.text)}</span><span class="mp-next-left">${L('target')}${esc(next.left)}</span></span>
        </div>` : `<div class="mp-next m-glass"><span class="mp-next-ring" style="--p:1"><span>${L('award')}</span></span><span class="mp-next-t"><span class="mp-next-cap">Every badge</span><b>All earned</b><span>Nothing left to win on this machine.</span></span></div>`
      return `${big}<p class="mp-next-sub">Earned</p><ul class="mp-chips">${got.map((b) => `<li class="mp-chip"><span class="mp-bico" aria-hidden="true">${L(b.icon)}</span><span>${esc(b.name)}</span></li>`).join('') || '<li class="mp-chip is-none">None yet. The first one is a Perfect punch.</li>'}</ul>`
    },
    // Photo tiles: each badge on a photograph of what it is for
    (m) => `<div class="mp-bphotos">${m.badges.map((b) => `
        <div class="mp-bphoto mf-onphoto${b.got ? '' : ' is-locked'}"><img src="assets/photos/lib/${b.photo}" alt="" loading="lazy" style="object-position:${b.pos}"><span class="mp-bico">${L(b.got ? b.icon : 'lock')}</span><span class="mp-bphoto-t"><b>${esc(b.name)}</b>${state(b)}</span></div>`).join('')}</div>`,
  ]

  /* ------------------------------------------------------------ drawing */
  const DRAW = {
    header: (m) => (HEADER[sel('header')] || HEADER[0])(m),
    stats: (m) => (STATS[sel('stats')] || STATS[0])(m),
    hits: (m) => hitsHead(m) + (HITS[sel('hits')] || HITS[0])(m),
    badges: (m) => badgesHead(m) + (BADGES[sel('badges')] || BADGES[0])(m),
  }
  function draw(only) {
    const m = social() && social().profile()
    if (!m) return
    for (const key of only ? [only] : Object.keys(DRAW)) el[key].innerHTML = DRAW[key](m)
  }

  /* ------------------------------------------------------------ motion */
  const replay = (node, cls) => { if (!node) return; node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls) }
  let enterTimer = 0
  function start() {
    root.classList.add('is-live')
    ;[...root.children].forEach((s, i) => s.style.setProperty('--i', i))
    if (reduced.matches) return
    replay(root, 'is-entering')
    clearTimeout(enterTimer)
    enterTimer = setTimeout(() => root.classList.remove('is-entering'), 1400)
  }
  function stop() { root.classList.remove('is-live', 'is-entering') }
  function reveal(sec) {
    if (!sec || !page.classList.contains('is-on')) return
    const pr = page.getBoundingClientRect(), r = sec.getBoundingClientRect()
    const k = pr.height / (page.offsetHeight || pr.height) || 1
    const y = (r.top - pr.top) / k
    if (y > 96 && y < page.clientHeight - 220) return
    page.scrollTo({ top: Math.max(0, page.scrollTop + y - 110), behavior: reduced.matches ? 'auto' : 'smooth' })
  }

  /* ------------------------------------------------------------ events */
  // mobile.js draws the page as it opens (renderProfile); this starts its motion
  document.addEventListener('mpage', (e) => {
    const d = e.detail || {}
    if (d.page === 'profile') start(); else stop()
  })
  document.addEventListener('psec', (e) => {
    const d = e.detail || {}
    if (d.surface !== 'phone' || d.page !== 'profile' || d.initial || !DRAW[d.sec]) return
    draw(d.sec)
    reveal(el[d.sec])
    if (!reduced.matches) { const n = el[d.sec]; replay(n, 'is-swap'); setTimeout(() => n.classList.remove('is-swap'), 900) }
  })
  document.addEventListener('decimals', () => draw())
  app.addEventListener('credits', () => { if (page.classList.contains('is-on')) draw('header') })
  page.addEventListener('focusin', (e) => {
    const rail = e.target.closest('.mf-rail')
    if (rail && e.target !== rail) e.target.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  })

  window.punchProfileView = { draw }
  draw()
  if (page.classList.contains('is-on')) start()
})()
