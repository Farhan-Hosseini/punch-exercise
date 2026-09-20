/* Phone: the feed (parts/mpage-feed.html, mpages/feed.css).
   Four sections, each with five designs chosen in Customise under This screen (psec.js): Stories, Filter, Posts and
   Sponsored. Filter and Sponsored carry their designs in the markup; Stories and Posts are drawn here from
   window.punchSocial.feed(), the model mobile.js keeps (players, posts, likes, saves, the filter). mobile.js answers every
   tap (data-act, data-filter, data-go); this file draws, and runs the page's motion: the sections rise in when the feed
   opens ("mpage"), a design rises in when Customise swaps it ("psec") and is brought into view, and nothing moves under
   reduced motion. Scores go through PunchFormat and re-render on the "decimals" event. */
(() => {
  'use strict'
  const page = document.querySelector('.m-page[data-page="feed"]')
  if (!page) return
  const root = page.querySelector('.mf')
  const storiesEl = document.getElementById('mStories')
  const partA = page.querySelector('.mf-list[data-part="a"]')
  const partB = page.querySelector('.mf-list[data-part="b"]')
  const empty = document.getElementById('mFeedEmpty')
  if (!root || !storiesEl || !partA || !partB) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const PF = window.PunchFormat || { score: (n) => Math.floor(n).toLocaleString('en-US'), scoreHTML: (n) => Math.floor(n).toLocaleString('en-US') }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const L = (n) => `<span data-lucide="${n}"></span>`
  const I = (n) => `<span data-icon="${n}"></span>`
  const social = () => window.punchSocial
  const short = (n) => (social() ? social().short(n) : String(n))
  const pts = (n, cls = '') => `<span class="m-pts${cls}">${PF.scoreHTML(n)}</span>`
  const sel = (key) => (window.PSec ? window.PSec.get('phone', 'feed', key) : 0)
  const paint = (el) => { if (window.punchApp && window.punchApp.paint) window.punchApp.paint(el) }
  const force = (s) => Math.max(0, Math.min(1, s / 1000000))

  /* ------------------------------------------------------------ Stories: a friend's latest hit, newest first */
  const storyLabel = (s) => (s.you ? 'Your hit' : `${s.full}, latest hit ${PF.score(s.score)} points, ${s.when}`)
  const storyGo = (s) => (s.you ? 'data-go="hit"' : `data-go="profile" data-player="${s.id}"`)
  const seen = (s) => (s.seen ? ' is-seen' : '') + (s.you ? ' is-you' : '')
  const STORY = [
    // Rings: the avatar in a red ring while the hit is new, grey once seen
    (list) => `<div class="mf-rail mf-rings">${list.map((s) => `
      <button class="mf-ring${seen(s)}" type="button" ${storyGo(s)} aria-label="${esc(storyLabel(s))}">
        <span class="mf-ring-o"><img class="m-ava" src="${s.ava}" alt="" loading="lazy">${s.you ? `<span class="mf-ring-badge">${L('play')}</span>` : ''}</span>
        <span class="mf-ring-n">${esc(s.name)}</span>
      </button>`).join('')}</div>`,
    // Hit cards: the still of the hit, the face in the corner, the score at the foot
    (list) => `<div class="mf-rail mf-cards">${list.map((s) => `
      <button class="mf-card${seen(s)}" type="button" ${storyGo(s)} aria-label="${esc(storyLabel(s))}">
        <img class="mf-card-img" src="${s.photo}" alt="" loading="lazy">
        <span class="mf-card-ava"><img class="m-ava" src="${s.ava}" alt=""></span>
        <span class="mf-card-foot"><span class="mf-card-n">${esc(s.name)}</span>${pts(s.score)}</span>
      </button>`).join('')}</div>`,
    // Force rings: the ring fills as far as the hit went towards a million
    (list) => `<div class="mf-rail mf-force">${list.map((s) => `
      <button class="mf-fr${seen(s)}" type="button" ${storyGo(s)} aria-label="${esc(storyLabel(s))}" style="--f:${force(s.score).toFixed(3)}">
        <span class="mf-fr-o"><img class="m-ava" src="${s.ava}" alt="" loading="lazy"></span>
        <span class="mf-fr-n">${esc(s.name)}</span>${pts(s.score, ' mf-fr-pts')}
      </button>`).join('')}</div>`,
    // Live pills: a face, a name and how long ago, a live dot while unseen
    (list) => `<div class="mf-rail mf-pills">${list.map((s) => `
      <button class="mf-pill${seen(s)}" type="button" ${storyGo(s)} aria-label="${esc(storyLabel(s))}">
        <span class="mf-pill-ava"><img class="m-ava" src="${s.ava}" alt="" loading="lazy">${s.seen || s.you ? '' : '<i class="mf-live"></i>'}</span>
        <span class="mf-pill-t"><span class="mf-pill-n">${esc(s.name)}</span><span class="mf-pill-w">${esc(s.when)}</span></span>
      </button>`).join('')}</div>`,
    // Spotlight: the newest unseen hit large, with its replay one tap away; everyone else in a row of faces
    (list) => {
      const top = list.find((s) => !s.you && !s.seen) || list.find((s) => !s.you) || list[0]
      const rest = list.filter((s) => s !== top)
      return `<div class="mf-spot">
        <button class="mf-spot-card" type="button" data-story-reel="${top.id}" data-player="${top.id}" aria-label="${esc(`Watch ${top.full}'s latest hit, ${PF.score(top.score)} points, ${top.when}`)}">
          <span class="mf-spot-media"><img src="${top.photo}" alt="" loading="lazy"><span class="mf-spot-play">${L('play')}</span></span>
          <span class="mf-spot-txt">
            <span class="mf-spot-kick">${L('flame')}Latest hit, ${esc(top.when)}</span>
            <span class="mf-spot-who"><img class="m-ava" src="${top.ava}" alt="">${esc(top.full)}</span>
            ${pts(top.score, ' mf-spot-pts')}
            <span class="mf-spot-where">${L('map-pin')}${esc(top.where)}</span>
          </span>
        </button>
        <div class="mf-rail mf-spot-rest">${rest.map((s) => `<button class="mf-dot${seen(s)}" type="button" ${storyGo(s)} aria-label="${esc(storyLabel(s))}"><img class="m-ava" src="${s.ava}" alt="" loading="lazy"></button>`).join('')}</div>
      </div>`
    },
  ]

  /* ------------------------------------------------------------ Posts: how a hit shows in the feed */
  const avaBtn = (x, size = 40) => `<button class="mf-ava-btn" type="button" data-go="profile" data-player="${x.player}" aria-label="${esc(x.mine ? 'Open your profile' : `Open ${x.name}'s profile`)}"><img class="m-ava" src="${x.ava}" alt="" width="${size}" height="${size}"></button>`
  const more = () => `<button class="mf-more" type="button" data-act="more" aria-label="More options">${I('more')}</button>`
  const who = (x) => `<div class="mf-who"><span class="m-name">${esc(x.name)}</span><span class="m-city">${esc(x.where)}, ${esc(x.when)}</span></div>`
  const head = (x) => `<div class="mf-head">${avaBtn(x)}${who(x)}${more()}</div>`
  const likeBtn = (x) => `<button class="m-act mf-act${x.liked ? ' is-on' : ''}" type="button" data-act="like" aria-pressed="${x.liked}" aria-label="Like, ${short(x.likes)} likes">${I(x.liked ? 'heartFill' : 'heart')}<span data-likes>${short(x.likes)}</span></button>`
  const commentBtn = (x) => `<button class="m-act mf-act" type="button" data-act="comment" aria-label="${x.comments} comments">${I('comment')}<span>${short(x.comments)}</span></button>`
  const shareBtn = () => `<button class="m-act mf-act" type="button" data-act="share" aria-label="Share">${I('share')}</button>`
  // save for later: mpages/saved.js answers the tap (a hold opens the lists) by data-save-key
  const saveBtn = (x) => `<button class="m-act mf-act mf-save${x.saved ? ' is-on' : ''}" type="button" data-act="save" data-save-key="${x.saveKey || `${x.player}:0`}" aria-pressed="${x.saved}" aria-label="${x.saved ? 'Saved. Hold to change the list' : 'Save for later. Hold to choose a list'}">${I('save')}</button>`
  const actions = (x) => `<div class="mf-actions">${likeBtn(x)}${commentBtn(x)}${shareBtn()}${saveBtn(x)}</div>`
  const cap = (x) => `<p class="mf-cap"><b>${esc(x.first)}</b> ${esc(x.text)}</p>`
  const topComment = (x) => (x.top ? `<button class="mf-top" type="button" data-act="comment" aria-label="${esc(`All ${x.comments} comments. ${x.top.name} says: ${x.top.text}`)}"><img class="m-ava" src="${x.top.ava}" alt=""><span class="mf-top-t"><b>${esc(x.top.name)}</b> ${esc(x.top.text)}</span><span class="mf-top-n">${L('message-circle')}${short(x.comments)}</span></button>` : '')
  // who liked it: three faces and two names, so the post reads as seen by people you know
  const fans = (x) => (x.fans && x.fans.length > 1 ? `<p class="mf-fans"><span class="mf-fans-faces" aria-hidden="true">${x.fans.map((f) => `<img src="${f.ava}" alt="">`).join('')}</span><span>Liked by <b>${esc(x.fans[0].name)}</b>, <b>${esc(x.fans[1].name)}</b> and others</span></p>` : '')
  const burst = '<span class="m-burst" data-icon="heartFill"></span>'
  const alt = (x) => `${x.mine ? 'Your' : `${x.first}'s`} hit at the punch machine`
  const playLabel = (x) => `Play ${x.mine ? 'your' : `${x.first}'s`} replay, ${PF.score(x.score)} points`
  const grade = (x, icon) => `<span class="mf-grade">${icon ? L(icon) : ''}${esc(x.grade)}</span>`
  const fresh = (x) => (x.fresh ? ' is-new' : '')
  // the replay's four moments, cropped from the still the way the reel frames them
  const FRAMES = [['Wind up', '50% 28%', 1.2], ['Strike', '34% 42%', 1.55], ['Contact', '64% 38%', 1.85], ['Score', '50% 62%', 1.12]]
  const POST = [
    // Photo card: the still first, the score laid on it, then the reactions and the talk underneath
    (x) => `<article class="mf-post mf-p-card${fresh(x)}" data-post="${x.id}">
        ${head(x)}
        <div class="mf-media mf-onphoto" data-like-target>
          <img src="${x.photo}" alt="${esc(alt(x))}" loading="lazy">
          <button class="mf-tag mf-tag-play" type="button" data-act="play" aria-label="${esc(playLabel(x))}">${L('circle-play')}Replay</button>
          <div class="mf-score">${grade(x)}${pts(x.score)}</div>
          <span class="mf-meter" aria-hidden="true"><i style="--w:${force(x.score).toFixed(3)}"></i></span>
          ${burst}
        </div>
        ${actions(x)}${fans(x)}${cap(x)}${topComment(x)}
      </article>`,
    // Score first: the number is the headline, the force it took under it, the replay below
    (x) => `<article class="mf-post mf-p-score${fresh(x)}" data-post="${x.id}">
        ${head(x)}
        <div class="mf-sf">
          ${grade(x, 'zap')}
          ${pts(x.score, ' mf-sf-pts')}
          <span class="mf-sf-meter" aria-hidden="true"><i style="--w:${force(x.score).toFixed(3)}"></i></span>
        </div>
        <button class="mf-sf-media mf-onphoto" type="button" data-act="play" aria-label="${esc(playLabel(x))}">
          <img src="${x.photo}" alt="" loading="lazy">
          <span class="mf-playdisc">${L('play')}</span>
          <span class="mf-tag mf-sf-time">${L('clock')}0:06, slow motion</span>
        </button>
        ${actions(x)}${fans(x)}${cap(x)}
      </article>`,
    // Replay strip: the still with its play button, and the four moments of the replay underneath
    (x) => `<article class="mf-post mf-p-strip${fresh(x)}" data-post="${x.id}">
        ${head(x)}
        <div class="mf-st-main mf-onphoto" data-like-target>
          <img src="${x.photo}" alt="${esc(alt(x))}" loading="lazy">
          <button class="mf-playdisc mf-st-play" type="button" data-act="play" aria-label="${esc(playLabel(x))}">${L('play')}</button>
          <span class="mf-tag">${L('film')}0:06</span>
          <div class="mf-score">${grade(x)}${pts(x.score)}</div>
          ${burst}
        </div>
        <div class="mf-frames">${FRAMES.map(([name, pos, z]) => `
          <button class="mf-frame mf-onphoto" type="button" data-act="play" aria-label="${esc(`${playLabel(x)}, from the ${name.toLowerCase()}`)}">
            <img src="${x.photo}" alt="" loading="lazy" style="object-position:${pos};transform-origin:${pos};transform:scale(${z})">
            <span>${name}</span>
          </button>`).join('')}</div>
        ${actions(x)}${fans(x)}${cap(x)}
      </article>`,
    // Compact: a thumbnail and the facts beside it, for scanning a busy feed
    (x) => `<article class="mf-post mf-p-compact${fresh(x)}" data-post="${x.id}">
        <div class="mf-cp">
          <button class="mf-cp-thumb mf-onphoto" type="button" data-act="play" aria-label="${esc(playLabel(x))}"><img src="${x.photo}" alt="" loading="lazy"><span class="mf-cp-play">${L('play')}</span></button>
          <div class="mf-cp-body">
            <div class="mf-cp-who">${avaBtn(x, 28)}<span class="m-name">${esc(x.name)}</span>${more()}</div>
            ${grade(x)}
            ${pts(x.score, ' mf-cp-pts')}
            <span class="m-city">${L('map-pin')}${esc(x.where)}, ${esc(x.when)}</span>
          </div>
        </div>
        <p class="mf-cap mf-cp-cap">${esc(x.text)}</p>
        ${actions(x)}
      </article>`,
    // Immersive: the whole post is the photograph, the controls float on glass over it
    (x) => `<article class="mf-post mf-p-full${fresh(x)}" data-post="${x.id}">
        <div class="mf-full mf-onphoto" data-like-target>
          <img src="${x.photo}" alt="${esc(alt(x))}" loading="lazy">
          <div class="mf-full-head">${avaBtn(x)}${who(x)}${more()}</div>
          <div class="mf-full-foot">
            ${grade(x, 'zap')}
            <div class="mf-full-row">${pts(x.score, ' mf-full-pts')}<button class="mf-full-play" type="button" data-act="play" aria-label="${esc(playLabel(x))}">${L('play')}</button></div>
            <p class="mf-full-cap">${esc(x.text)}</p>
            <div class="mf-full-bar">${likeBtn(x)}${commentBtn(x)}${shareBtn()}${saveBtn(x)}</div>
          </div>
          ${burst}
        </div>
      </article>`,
  ]

  /* ------------------------------------------------------------ two columns: a hit as a portrait tile, as the reel's grid
     draws it. The tile is the post's play action, so mobile.js opens that player's reel at this hit */
  const tile = (x) => `<article class="mf-gt${fresh(x)}" data-post="${x.id}">
      <button class="mf-gt-tile" type="button" data-act="play" aria-label="${esc(`${x.mine ? 'Your' : `${x.name}'s`} hit, ${PF.score(x.score)} points, ${x.when}. Open the reel`)}">
        <span class="mf-gt-media"><img src="${x.photo}" alt="" loading="lazy" decoding="async"></span>
        <span class="mf-gt-shade" aria-hidden="true"></span>
        <span class="mf-gt-mark" aria-hidden="true">${L('play')}</span>
        <span class="mf-gt-who"><img class="m-ava" src="${x.ava}" alt=""><span class="mf-gt-name">${esc(x.first)}</span></span>
        <span class="mf-gt-foot"><span class="m-pts" style="--chars:${(PF.width ? PF.width(x.score) : 9).toFixed(2)}">${PF.scoreHTML(x.score)}</span><span class="mf-gt-when">${esc(x.when)}</span></span>
      </button>
    </article>`

  /* the view: one column in the chosen design, or two columns of tiles; kept per viewer */
  const VIEW_KEY = 'punch-feed-view.v1'
  const posts = document.getElementById('mPosts')
  const switchEl = page.querySelector('.mf-view')
  let view = 'list'
  try { if (localStorage.getItem(VIEW_KEY) === 'grid') view = 'grid' } catch { /* storage unavailable */ }
  function setView(v, o = {}) {
    view = v === 'grid' ? 'grid' : 'list'
    if (posts) posts.dataset.view = view
    if (switchEl) switchEl.querySelectorAll('[data-fview]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.fview === view)))
    if (o.save) { try { localStorage.setItem(VIEW_KEY, view) } catch { /* private window */ } }
  }

  /* ------------------------------------------------------------ drawing */
  function drawStories() {
    const m = social() && social().feed()
    if (!m) return null
    storiesEl.innerHTML = (STORY[sel('stories')] || STORY[0])(m.stories)
    paint(storiesEl)
    return storiesEl.firstElementChild
  }
  // the sponsored post sits after the second post, so the list is drawn in two parts around it
  function drawPosts() {
    const m = social() && social().feed()
    if (!m) return null
    // in two columns the tiles stand in for the post design; one column shows the design chosen in Customise
    const d = view === 'grid' ? tile : (POST[sel('posts')] || POST[0])
    partA.innerHTML = m.posts.slice(0, 2).map(d).join('')
    partB.innerHTML = m.posts.slice(2).map(d).join('')
    partB.hidden = m.posts.length <= 2
    if (empty) empty.hidden = m.posts.length > 0
    paint(partA)
    paint(partB)
    return partA
  }

  /* ------------------------------------------------------------ motion */
  const replay = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls) }
  let enterTimer = 0
  function start() {
    root.classList.add('is-live')
    ;[...root.children].forEach((s, i) => s.style.setProperty('--i', i))
    if (reduced.matches) return
    replay(root, 'is-entering')
    clearTimeout(enterTimer)
    enterTimer = setTimeout(() => root.classList.remove('is-entering'), 1300)
  }
  function stop() { root.classList.remove('is-live', 'is-entering') }
  // a design Customise has just picked is brought into view, so the change is seen (the device may be scaled to fit)
  function reveal(sec) {
    if (!sec || !page.classList.contains('is-on')) return
    const pr = page.getBoundingClientRect(), r = sec.getBoundingClientRect()
    const k = pr.height / (page.offsetHeight || pr.height) || 1
    const y = (r.top - pr.top) / k
    if (y > 96 && y < page.clientHeight - 220) return
    page.scrollTo({ top: Math.max(0, page.scrollTop + y - 110), behavior: reduced.matches ? 'auto' : 'smooth' })
  }

  /* ------------------------------------------------------------ events */
  document.addEventListener('mpage', (e) => {
    const d = e.detail || {}
    if (d.page === 'feed') { drawStories(); start() } else stop()
  })
  document.addEventListener('psec', (e) => {
    const d = e.detail || {}
    if (d.surface !== 'phone' || d.page !== 'feed' || d.initial) return
    let shown = d.el
    if (d.sec === 'stories') shown = drawStories()
    else if (d.sec === 'posts') {
      // the list is one section in two parts: draw once, on the first part's event
      if (d.section !== partA) return
      shown = drawPosts()
    }
    reveal(d.section)
    if (!reduced.matches && shown) { replay(shown, 'is-swap'); setTimeout(() => shown.classList.remove('is-swap'), 700) }
  })
  document.addEventListener('decimals', () => { drawStories(); drawPosts() })
  // the Spotlight card plays the hit it shows
  storiesEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-story-reel]')
    if (b && window.punchApp) window.punchApp.go('reel', { player: b.dataset.storyReel, index: 0 })
  })
  // a card reached with Tab inside a rail scrolls fully into view
  page.addEventListener('focusin', (e) => {
    const rail = e.target.closest('.mf-rail, .mf-ad-cards')
    if (rail && e.target !== rail) e.target.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  })

  if (switchEl) switchEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fview]')
    if (!b || b.dataset.fview === view) return
    setView(b.dataset.fview, { save: true })
    drawPosts()
    if (!reduced.matches && posts) { replay(posts, 'is-swap'); setTimeout(() => posts.classList.remove('is-swap'), 700) }
  })

  window.punchFeedView = { stories: drawStories, posts: drawPosts, view: (v) => { if (v) { setView(v, { save: true }); drawPosts() } return view } }
  setView(view)
  drawStories()
  drawPosts()
  if (page.classList.contains('is-on')) start()
})()
