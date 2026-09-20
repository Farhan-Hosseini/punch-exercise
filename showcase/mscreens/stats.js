/* Machine screen: Your run (data-mscreen="stats"). Round seven rebuilt it from the expert panel's synthesis
   (docs/strategy/what-to-show-for-a-punch.md): stop describing the punch just thrown, point the player at the next one.
   ONE frame (.yr) of four sections (psec.js), top to bottom, each with five designs chosen in Customise:
     Next to beat    the gap to the next mark above this hit, with a name, as the one big number; the score small above
                     it; "Bell rung" at the top of the scale; the flip ("Omar needs 18,621 to pass you") when the player
                     leads. The only numerals on the screen.
     Crew            everyone in this run on a column by height, no numbers: colour tag and turn letter, the handle,
                     a crown on the leader, three attempt slots each, who goes next
     One fix         one change for the next hit, with a Camera read tag when the camera inferred it
     Today's crown   who holds it and since when in words, the crowd band with the player's mark, Unclaimed with the
                     run code, the takeover when this hit takes it
   The data are example runs (RUNS): Sara's (999,999.000, with Yousef and Mira), Karim's (412,380.250 chasing Omar at
   431,000.500, with Lina) and Karim's second hit, which leads the run (the flip). showcase.mscreen('stats', { run })
   picks one; without it the screen takes the live score (opts.score, window.punchApp.score, the Result screen's) and
   the run whose hit is nearest, with the live score as this hit, and works everything out again from the rules in
   the synthesis (the target list, the 15% limit, the rounding up, the crown). opts.claimed = false shows the crown
   as never scanned.
   Punch again closes the frame, the Results screens' shared section (parts/ms-again.html, mscreens/_again.css).
   Motion tells the story in the synthesis's reading order over about eight seconds: the gap lands, the crew overtake
   plays, the fix, the crown, Punch again (.is-play with --sd on each section's shown design, .is-settled when it is
   over). A change
   in Customise ("psec") replays that section alone. Reduced motion never adds .is-play: every design stands complete.
   The Big score (data-mscreen="score") has its own engine in score.js; nothing here touches it. */
(() => {
  'use strict'
  const KEY = 'stats'
  const root = document.querySelector(`.mscreen[data-mscreen="${KEY}"]`)
  const frame = root && root.querySelector('.yr')
  if (!frame) return

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const PF = () => window.PunchFormat
  const TOP = 999999, MAX = 999999.999
  const clamp = (n) => Math.max(0, Math.min(MAX, Number(n) || 0))
  const int = (n) => Math.round(n).toLocaleString('en-US')
  const htm = (n) => (PF() ? PF().scoreHTML(n) : int(Math.floor(n)))
  const txt = (n) => (PF() ? PF().score(n) : int(Math.floor(n)))
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const svgIcon = (name) => (window.lucide ? window.lucide(name) : '')
  const I = (name, cls) => `<span class="yr-ico${cls ? ' ' + cls : ''}" aria-hidden="true">${svgIcon(name)}</span>`
  const AVA = (p, cls) => `<img class="yr-ava${cls ? ' ' + cls : ''}" src="assets/app/avatars/${p.ava}.jpg" alt="" width="256" height="256" decoding="async">`

  /* ------------------------------------------------------------ this machine today */
  // the column's five quiet bands, set per machine (percentiles of its last 30 days); Monster is the sponsor's band
  const BANDS = [
    { name: 'Warm-up', from: 0 }, { name: 'Solid', from: 200000 }, { name: 'Thunder', from: 450000 },
    { name: 'Monster', from: 700000, sponsor: true }, { name: 'Bell', from: 900000 },
  ]
  const bandAt = (s) => { let i = BANDS.length - 1; while (i > 0 && s < BANDS[i].from) i--; return i }
  // a score's height on the column: each band takes a fifth, the score placed within its band
  function height(s) {
    s = clamp(s)
    const i = bandAt(s), lo = BANDS[i].from, hi = i < BANDS.length - 1 ? BANDS[i + 1].from : MAX
    return Math.min(1, (i + Math.min(1, (s - lo) / (hi - lo))) / BANDS.length)
  }
  const TODAY = {
    // today's hits on this machine as quantiles (it falls back to the last seven days until about 30 hits)
    q: [[0, 60000], [.1, 190000], [.25, 300000], [.4, 390000], [.5, 440000], [.6, 490000], [.75, 580000], [.9, 700000], [.97, 900000], [1, 999999]],
    topTen: 812400,
    // the 40th percentile of hit one to hit two, for this score band: roughly a 60% chance to clear
    improve: .045,
    crown: { key: 'hamad', name: 'Hamad', ava: 'hamad', score: 874310.662, since: 'lunch', photo: 'assets/photos/lib/fist-strike-2.jpg', pos: '30% 45%' },
    // the day from opening to now, in words: the reign ribbon's marks
    marks: [{ at: 0, w: 'Opening' }, { at: .32, w: 'Lunch' }, { at: .78, w: 'Now' }],
    reigns: [{ name: 'Rami', from: .02, to: .32 }, { name: 'Hamad', from: .32, to: null }],
  }
  function pctOf(s) {
    const q = TODAY.q
    if (s <= q[0][1]) return 0
    for (let i = 1; i < q.length; i++) if (s <= q[i][1]) return q[i - 1][0] + (q[i][0] - q[i - 1][0]) * (s - q[i - 1][1]) / (q[i][1] - q[i - 1][1])
    return 1
  }

  /* ------------------------------------------------------------ the example runs, players in turn order */
  const RUNS = {
    sara: {
      label: 'Sara',
      you: 'sara', next: 'yousef',
      crew: [
        { key: 'sara', name: 'Sara', ava: 'sara', hits: [931440.482, 999999] },
        { key: 'yousef', name: 'Yousef', ava: 'yusuf', hits: [742118.406] },
        { key: 'mira', name: 'Mira', ava: 'maya', hits: [538660.215] },
      ],
      photo: { src: 'assets/mscreens/replay-sara-tall.jpg', pos: '58% 26%', alt: 'Sara’s jab at full reach, the frame of her crown hit' },
      fix: {
        kind: 'hand', word: 'Now your left', camera: true, seen: 'Right hand seen', line: 'Nobody has a left today',
        slot: { kind: 'ring', word: 'Now your left', line: 'Your right landed dead centre', dot: [0, 0] },
      },
    },
    karim: {
      label: 'Karim',
      you: 'karim', next: 'lina',
      crew: [
        { key: 'lina', name: 'Lina', ava: 'lina', hits: [356420.75] },
        { key: 'omar', name: 'Omar', ava: 'omar', hits: [431000.5] },
        { key: 'karim', name: 'Karim', ava: 'karim', hits: [412380.25] },
      ],
      // Karim's own shoot (manifest.json); the score screen's stills of this run are two other shots of his
      photo: { src: 'assets/photos/lib/bag-strike-22.jpg', pos: '62% 30%', alt: 'Karim squares up beside the bag before his hit' },
      fix: {
        kind: 'foot', word: 'Step in', camera: true, seen: 'Front foot stayed back', line: 'Players who step in hit harder here',
        slot: { kind: 'trace', word: 'Snap it', line: 'A short sharp hit reads higher than a shove' },
      },
    },
    // Karim's second hit: he leads the run now, so the section flips; the camera is not sure, so the fix is generic
    lead: {
      label: 'Karim, second hit',
      you: 'karim', next: 'lina',
      crew: [
        { key: 'lina', name: 'Lina', ava: 'lina', hits: [356420.75, 371208.064] },
        { key: 'omar', name: 'Omar', ava: 'omar', hits: [431000.5, 402775.93] },
        { key: 'karim', name: 'Karim', ava: 'karim', hits: [412380.25, 449621] },
      ],
      photo: { src: 'assets/photos/lib/bag-strike-23.jpg', pos: '55% 28%', alt: 'Karim at the bag, the frame of his second hit' },
      fix: {
        kind: 'through', word: 'Punch through', camera: false, seen: '', line: 'Aim past the pad, not at it',
        slot: { kind: 'ring', word: 'Aim lower', line: 'It landed high on the pad', dot: [.36, -.5] },
      },
    },
  }
  const LETTERS = 'ABCD', COLORS = ['a', 'b', 'c', 'd']
  const gapUp = (d) => Math.max(1, Math.ceil(d - 1e-6))

  // everything the designs show, worked out from a run and this hit
  function model(runKey, hitOverride, claimed) {
    const run = RUNS[runKey]
    const players = run.crew.map((p, i) => {
      const hits = p.key === run.you && hitOverride != null ? [...p.hits.slice(0, -1), hitOverride] : p.hits.slice()
      return { ...p, hits, letter: LETTERS[i], color: COLORS[i], best: Math.max(...hits), used: Math.min(3, hits.length), you: p.key === run.you }
    })
    const you = players.find((p) => p.you)
    const hit = you.hits[you.hits.length - 1]
    const prevBest = you.hits.length > 1 ? Math.max(...you.hits.slice(0, -1)) : 0
    const others = players.filter((p) => !p.you)
    const ranked = players.slice().sort((a, b) => b.best - a.best)
    const leader = ranked[0]
    // the leader before this hit, to move the crown when it was earned
    const before = players.map((p) => ({ p, b: p.you ? prevBest : p.best })).sort((a, b) => b.b - a.b)[0].p
    // the friends this hit climbed past on its way up the column
    const passed = others.filter((p) => p.best < hit)
    // the column for this run: every band keeps its name, the bands the crew stands in get four times the room, so
    // friends of a similar strength do not sit on top of each other
    const w = BANDS.map((b, i) => (players.some((p) => bandAt(p.best) === i) ? 4 : 1)), total = w.reduce((a, b) => a + b, 0)
    const spans = []
    w.reduce((lo, x, i) => { spans.push({ i, lo: lo / total, size: x / total, name: BANDS[i].name, sponsor: !!BANDS[i].sponsor }); return lo + x }, 0)
    const h = (s) => {
      s = clamp(s)
      const i = bandAt(s), lo = BANDS[i].from, hi = i < BANDS.length - 1 ? BANDS[i + 1].from : MAX
      return Math.min(1, spans[i].lo + spans[i].size * Math.min(1, (s - lo) / (hi - lo)))
    }
    for (const p of players) { p.f = h(p.best); p.leader = p === leader; p.passed = passed.includes(p) }

    /* the target, in the synthesis's order: a person beats a line, nothing further than 15% of the score */
    const near = (g) => g <= .15 * hit
    let t = null
    if (hit >= TOP) t = { kind: 'bell' }
    if (!t) {
      const above = others.filter((p) => p.best > hit).sort((a, b) => a.best - b.best)[0]
      if (above && near(above.best - hit)) t = { kind: 'person', who: above, gap: gapUp(above.best - hit), mark: above.best }
      if (!t && !above) {
        const below = others.filter((p) => p.best <= hit).sort((a, b) => b.best - a.best)[0]
        if (below && near(hit - below.best)) t = { kind: 'flip', who: below, gap: gapUp(hit - below.best), mark: below.best }
      }
      if (!t && prevBest > hit && near(prevBest - hit)) t = { kind: 'own', gap: gapUp(prevBest - hit), mark: prevBest }
      if (!t && TODAY.topTen > hit && near(TODAY.topTen - hit)) t = { kind: 'topten', gap: gapUp(TODAY.topTen - hit), mark: TODAY.topTen }
      const edge = BANDS[bandAt(hit) + 1]
      if (!t && edge && near(edge.from - hit)) t = { kind: 'tier', band: edge.name, gap: gapUp(edge.from - hit), mark: edge.from }
      if (!t) { const g = Math.ceil(hit * TODAY.improve / 10) * 10; t = { kind: 'machine', gap: g, mark: hit + g } }
    }
    // the words around the number
    const W = {
      bell: { name: 'Bell rung', pre: '', head: ['Bell', 'rung'], upper: 'The bell', left: '' },
      person: { name: t.who && t.who.name, pre: 'to pass', head: ['Pass', t.who && t.who.name], upper: `${t.who && t.who.name}’s mark`, left: `left to pass ${t.who && t.who.name}` },
      flip: { name: t.who && t.who.name, pre: '', head: ['Ahead of', t.who && t.who.name], upper: 'Your hit', left: `for ${t.who && t.who.name} to pass you` },
      own: { name: 'your best', pre: 'to pass', head: ['Pass', 'your best'], upper: 'Your best', left: 'left to pass your best', icon: 'history' },
      topten: { name: 'the top ten', pre: 'to make', head: ['Make', 'the top ten'], upper: 'Top ten line', left: 'left to make the top ten', icon: 'trophy' },
      tier: { name: t.band, pre: 'to reach', head: ['Reach', t.band], upper: `${t.band} starts at`, left: `left to reach ${t.band}`, icon: 'chevrons-up' },
      machine: { name: 'beat this', pre: 'Next:', head: ['Beat', 'this'], upper: 'Next mark', left: 'Next: beat this', icon: 'target' },
    }[t.kind]
    Object.assign(t, W)
    t.say = t.kind === 'bell' ? `Bell rung. Only a tie can catch this. Your hit ${txt(hit)}.`
      : t.kind === 'flip' ? `${t.name} needs ${int(t.gap)} to pass you. Your hit ${txt(hit)}.`
        : t.kind === 'machine' ? `Next: beat this, ${int(t.gap)} more. Your hit ${txt(hit)}.`
          : `${int(t.gap)} ${t.pre} ${t.name}. Your hit ${txt(hit)}.`

    /* today's crown: the day's best on this machine; this hit takes it when it is higher (a tie at the top shares it) */
    const c = TODAY.crown
    const takes = hit >= c.score
    const crown = takes
      ? { takes, holder: you, name: you.name, since: 'from this hit', score: hit, photo: run.photo, was: c, claimed: claimed !== false }
      : { takes, holder: c, name: c.name, since: `since ${c.since}`, score: c.score, photo: { src: c.photo, pos: c.pos, alt: `${c.name}’s crown hit` }, claimed: claimed !== false }
    const pct = pctOf(hit)
    const next = players.find((p) => p.key === run.next) || others[0]
    return { run, runKey, players, you, hit, prevBest, others, ranked, leader, before, passed, moved: before !== leader, spans, h, t, crown, pct, flatter: pct >= .6, next, fix: run.fix }
  }

  /* ------------------------------------------------------------ shared pieces */
  const anchor = (m) => `<p class="yr-anchor"><span class="yr-k">Your hit</span><span class="yr-anchor-n">${htm(m.hit)}</span></p>`
  // who or what the number is about: an avatar for a person, an icon for a line
  const badge = (t, m) => (t.who ? AVA(t.who) : t.kind === 'own' ? AVA(m.you) : `<span class="yr-badge">${I(t.icon || 'target')}</span>`)
  const sr = (s) => `<p class="sr-only">${esc(s)}</p>`
  // the colour tag with the turn letter; the leader wears the crown on it (and the one who lost it, while it moves)
  const crownOf = (p, m) => (p.leader ? 'is-on' : m && m.moved && p === m.before ? 'is-was' : '')
  const tagChip = (p, m) => `<span class="yr-tag yr-c-${p.color}${p.you ? ' is-you' : ''}" aria-hidden="true">${p.letter}${m ? crownIco(crownOf(p, m)) : ''}</span>`
  const slots = (p) => `<span class="yr-slots" aria-hidden="true">${[0, 1, 2].map((i) => `<i${i < p.used ? ' class="is-on"' : ''}></i>`).join('')}</span>`
  const crownIco = (cls) => `<span class="yr-crown${cls ? ' ' + cls : ''}" aria-hidden="true">${svgIcon('crown')}</span>`
  const said = (p) => `${p.name}${p.you ? ', this hit' : ''}${p.leader ? ', leads the run' : ''}, ${['no', 'one', 'two', 'three'][p.used]} of three attempts used`
  const crewSay = (m) => `Crew, highest first: ${m.ranked.map(said).join('; ')}. Next up: ${m.next.name}.`
  const nextUp = (m, extra) => `<div class="yr-nextup-row"><p class="yr-nextup"><span class="yr-k">Next up</span>${tagChip(m.next)}<span class="yr-nextup-n">${esc(m.next.name)}</span></p>${extra || ''}</div>`
  // the band names on a column's edge, each in its own span of the column
  const bandsCol = (m) => m.spans.map((b) => `<span class="yr-bandname${b.sponsor ? ' is-sponsor' : ''}" style="--b0: ${b.lo.toFixed(4)}; --bh: ${b.size.toFixed(4)}">${esc(b.name)}</span>`).join('')
  // a leader line from a mark at y to its label at ly, dx across
  const lead = (y, ly, dx) => { const dy = ly - y; return `--len: ${Math.hypot(dx, dy).toFixed(1)}px; --ang: ${Math.atan2(dy, dx).toFixed(4)}rad` }
  // the camera's tag: a viewfinder, not a pill
  const camTag = (label, icon) => `<span class="yr-cam"><i class="yr-cam-c" aria-hidden="true"></i>${I(icon || 'scan-face')}<span>${label}</span></span>`
  // spread labels apart so none collide: centres at least gap apart, kept inside lo..hi, each as near its mark as it can
  function spread(ys, gap, lo, hi) {
    const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y)
    const v = order.map((o) => o.y)
    for (let k = 0; k < 60; k++) {
      for (let i = 1; i < v.length; i++) {
        const d = v[i] - v[i - 1]
        if (d < gap) { const p = (gap - d) / 2; v[i - 1] -= p; v[i] += p }
      }
      for (let i = 0; i < v.length; i++) v[i] = Math.max(lo, Math.min(hi, v[i]))
    }
    const out = []
    order.forEach((o, k) => { out[o.i] = v[k] })
    return out
  }
  // the crew as the column shows them, lowest first to draw the player's mark last (on top)
  const drawOrder = (m) => m.players.slice().sort((a, b) => (a.you ? 1 : b.you ? -1 : a.best - b.best))

  /* ------------------------------------------------------------ Next to beat */
  const NEXT = {
    // the gap at about 300 px cap height, set left, the name at half size under it, the score small above
    'yr-slab'(el, m) {
      const t = m.t
      let body
      if (t.kind === 'bell') {
        body = `<div class="yr-slab-bell"><span class="yr-bellmark">${I('bell-ring')}</span><p class="yr-slab-bw" data-fit data-fit-lines><span>Bell</span> <span>rung</span></p></div>
          <p class="yr-slab-line">Only a tie can catch this</p>`
      } else if (t.kind === 'flip') {
        body = `<p class="yr-who is-top">${badge(t, m)}<span class="yr-who-n" data-fit>${esc(t.name)}</span><span class="yr-who-k">needs</span></p>
          <p class="yr-gap" data-fit>${int(t.gap)}</p>
          <p class="yr-slab-line">to pass you</p>`
      } else {
        body = `<p class="yr-gap" data-fit>${int(t.gap)}</p>
          <p class="yr-who"><span class="yr-who-k">${esc(t.pre)}</span>${badge(t, m)}<span class="yr-who-n" data-fit>${esc(t.name)}</span></p>`
      }
      el.innerHTML = `${anchor(m)}<div class="yr-slab-body${t.kind === 'flip' ? ' is-flip' : ''}" aria-hidden="true">${body}</div>${sr(t.say)}`
    },
    // this hit's plate and the target's, the gap hung in the space between them
    'yr-plates'(el, m) {
      const t = m.t
      const mine = `<div class="yr-pl is-you"><span class="yr-pl-who">${AVA(m.you)}<span class="yr-pl-n">You</span></span><span class="yr-pl-v">${htm(m.hit)}</span></div>`
      let upper, lower, mid
      if (t.kind === 'bell') {
        upper = `<div class="yr-pl is-bell"><span class="yr-pl-who"><span class="yr-badge">${I('bell-ring')}</span><span class="yr-pl-n">The bell</span></span><span class="yr-pl-v">Top of the scale</span></div>`
        lower = mine
        mid = `<div class="yr-pl-mid is-bell"><p class="yr-pl-bw" data-fit>Bell rung</p><p class="yr-pl-line">Only a tie can catch this</p></div>`
      } else {
        const theirs = `<div class="yr-pl"><span class="yr-pl-who">${badge(t, m)}<span class="yr-pl-n">${esc(t.kind === 'machine' ? 'Next mark' : t.kind === 'own' ? 'Your best' : t.name)}</span></span><span class="yr-pl-v">${htm(t.mark)}</span></div>`
        upper = t.kind === 'flip' ? mine : theirs
        lower = t.kind === 'flip' ? theirs : mine
        const words = t.kind === 'flip' ? `${esc(t.name)} needs this to pass you` : t.kind === 'machine' ? 'Next: beat this' : `${esc(t.pre)} ${esc(t.name)}`
        mid = `<div class="yr-pl-mid"><i class="yr-pl-dim"></i><div class="yr-pl-fig"><p class="yr-gap" data-fit>${int(t.gap)}</p><p class="yr-pl-line">${words}</p></div></div>`
      }
      el.classList.toggle('is-bell', t.kind === 'bell')
      el.innerHTML = `<div class="yr-pl-stack" aria-hidden="true">${upper}${t.kind === 'bell' ? lower + mid : mid + lower}</div>${sr(t.say)}`
    },
    // the sum, and the figure runs down from the mark above to what is left
    'yr-count'(el, m) {
      const t = m.t
      let rows, fig
      if (t.kind === 'bell') {
        rows = [['The bell', TOP], ['Your hit', m.hit]]
        fig = `<div class="yr-cd-bell"><span class="yr-bellmark">${I('bell-ring')}</span><p class="yr-cd-bw" data-fit>Bell rung</p></div><p class="yr-cd-left">Only a tie can catch this</p>`
      } else {
        rows = t.kind === 'flip' ? [['Your hit', m.hit], [`${t.name}’s mark`, t.mark]] : [[t.upper, t.mark], ['Your hit', m.hit]]
        fig = `<p class="yr-gap yr-cd-n" data-fit data-count-from="${Math.floor(t.kind === 'flip' ? m.hit : t.mark)}" data-count-to="${t.gap}">${int(t.gap)}</p><p class="yr-cd-left">${esc(t.left)}</p>`
      }
      el.innerHTML = `<div class="yr-cd-sum" aria-hidden="true">${rows.map(([k, v], i) => `<p class="yr-cd-row" style="--i: ${i}"><span class="yr-cd-k">${esc(k)}</span><span class="yr-cd-v">${htm(v)}</span></p>`).join('')}</div>
        <div class="yr-cd-fig" aria-hidden="true">${fig}</div>${sr(t.say)}`
    },
    // the name set across the full width, the gap as one smaller line under it
    'yr-name'(el, m) {
      const t = m.t
      const line = t.kind === 'bell' ? 'Only a tie can catch this'
        : t.kind === 'flip' ? `<b>${int(t.gap)}</b> for ${esc(t.name)} to pass you`
          : t.kind === 'machine' ? `Next: <b>${int(t.gap)}</b> more than this hit`
            : `<b>${int(t.gap)}</b> to go`
      el.innerHTML = `${anchor(m)}<p class="yr-nf-head" data-fit aria-hidden="true"><span class="yr-nf-v">${esc(t.head[0])}</span> ${esc(t.head[1])}</p>
        <p class="yr-nf-line" aria-hidden="true">${t.kind === 'bell' ? I('bell-ring') : ''}${line}</p>${sr(t.say)}`
    },
    // a measuring tape unrolls from the lower mark to the upper one, the gap on its end tab
    'yr-tape'(el, m) {
      const t = m.t
      const lowMark = t.kind === 'bell' ? 0 : t.kind === 'flip' ? t.mark : m.hit
      const highMark = t.kind === 'bell' ? TOP : t.kind === 'flip' ? m.hit : t.mark
      // the tier edges the tape crosses get a named tick
      const ticks = t.kind === 'bell'
        ? BANDS.slice(1).map((b) => ({ at: height(b.from), name: b.name }))
        : BANDS.filter((b) => b.from > lowMark && b.from < highMark).map((b) => ({ at: (b.from - lowMark) / (highMark - lowMark), name: b.name }))
      let last = 9
      ticks.sort((a, b) => b.at - a.at).forEach((k) => { if (last - k.at >= .45) last = k.at; else k.name = '' })
      const tab = t.kind === 'bell' ? `<p class="yr-tp-bell">${I('bell-ring')}<span class="yr-tp-bw" data-fit>Bell rung</span></p>` : `<p class="yr-gap" data-fit>${int(t.gap)}</p>`
      const under = t.kind === 'bell' ? '<p class="yr-tp-under">Only a tie can catch this</p>'
        : t.kind === 'flip' ? `<p class="yr-tp-under">${badge(t, m)}<span>${esc(t.name)} needs this to pass you</span></p>`
          : t.kind === 'machine' ? `<p class="yr-tp-under">${badge(t, m)}<span>Next: beat this</span></p>`
            : `<p class="yr-tp-under"><span class="yr-k">${esc(t.pre)}</span>${badge(t, m)}<span class="yr-tp-n" data-fit>${esc(t.name)}</span></p>`
      const base = t.kind === 'flip'
        ? `<p class="yr-tp-base">${AVA(t.who)}<span class="yr-k">${esc(t.name)}</span><span class="yr-tp-v">${htm(t.mark)}</span></p>`
        : `<p class="yr-tp-base"><span class="yr-k">Your hit</span><span class="yr-tp-v">${htm(m.hit)}</span></p>`
      const mine = t.kind === 'flip' ? `<p class="yr-tp-mine"><span class="yr-k">Your hit</span><span class="yr-tp-v">${htm(m.hit)}</span></p>` : ''
      el.innerHTML = `<div class="yr-tp" aria-hidden="true">
          <div class="yr-tp-tape"><i class="yr-tp-body"></i>${ticks.map((k) => `<i class="yr-tp-tick" style="--at: ${k.at.toFixed(3)}">${k.name ? `<span>${esc(k.name)}</span>` : ''}</i>`).join('')}</div>
          <div class="yr-tp-tab">${tab}</div>
          <div class="yr-tp-side">${under}${mine}${base}</div>
        </div>${sr(t.say)}`
    },
  }

  /* ------------------------------------------------------------ Crew */
  // the column's scale inside each design, in glass pixels (the CSS draws the same numbers)
  const GEO = { col: { top: 50, h: 760 }, faces: { top: 110, h: 660 }, over: { top: 120, h: 640 } }
  const yOf = (g, f) => g.top + (1 - f) * g.h
  // how far the player's mark climbs (px) and when it passes each friend (ms), for the overtake
  const CLIMB = 2200
  function climb(m, g, p) {
    const from = 0, to = m.you.f
    const rise = (to - from) * g.h
    const at = to > from ? Math.max(0, Math.min(1, (p.f - from) / (to - from))) : 0
    return { rise, pass: Math.round(300 + at * CLIMB) }
  }
  const CREW = {
    // a slim column, each friend a tick at true height with colour tag and turn letter, three slots, the crown
    'yr-col'(el, m) {
      const g = GEO.col
      const ps = drawOrder(m)
      const ly = spread(ps.map((p) => yOf(g, p.f)), 118, 84, g.top + g.h + 30)
      el.innerHTML = `<div class="yr-col-scale" aria-hidden="true">
          <div class="yr-col-bands">${bandsCol(m)}</div>
          <div class="yr-col-track">${m.spans.map((b) => `<i style="--b0: ${b.lo.toFixed(4)}; --bh: ${b.size.toFixed(4)}"${b.sponsor ? ' class="is-sponsor"' : ''}></i>`).join('')}</div>
          ${ps.map((p, i) => {
            const y = yOf(g, p.f), c = p.you ? climb(m, g, p) : m.passed.includes(p) ? climb(m, g, p) : { rise: 0, pass: 0 }
            return `<div class="yr-col-mark${p.you ? ' is-you' : ''}${p.passed ? ' is-passed' : ''}${p.leader ? ' is-leader' : ''}" style="--y: ${y.toFixed(1)}px; --ly: ${ly[i].toFixed(1)}px; --rise: ${(p.you ? c.rise : 0).toFixed(1)}px; --pass: ${c.pass}ms; ${lead(y, ly[i], 46)}">
                <i class="yr-col-tick yr-c-${p.color}"></i><i class="yr-col-lead yr-c-${p.color}"></i>
                <p class="yr-col-lab">${tagChip(p, m)}<span class="yr-col-n">${esc(p.name)}</span>${slots(p)}</p>
              </div>`
          }).join('')}
        </div>${nextUp(m)}${sr(crewSay(m))}`
    },
    // one plate per player in rank order, its length set by the score, three notches cut in its end
    'yr-stack'(el, m) {
      const n = m.ranked.length, you = m.ranked.indexOf(m.you)
      el.innerHTML = `<div class="yr-st-rows" aria-hidden="true" style="--n: ${n}">
          <div class="yr-st-guides">${m.spans.slice(1).map((b) => `<i style="--b0: ${b.lo.toFixed(4)}"></i>`).join('')}</div>
          ${m.ranked.map((p, i) => {
            // the player's row climbs from the foot of the stack; each friend it passed steps down one
            const from = p.you ? n - 1 - i : p.passed ? -1 : 0
            return `<div class="yr-st-row${p.you ? ' is-you' : ''}${p.passed ? ' is-passed' : ''}${p.leader ? ' is-leader' : ''}" style="--i: ${i}; --f: ${Math.max(.04, p.f).toFixed(3)}; --from: ${from}; --pass: ${p.passed ? climbPass(m, p) : 0}ms">
                <p class="yr-st-who">${tagChip(p, m)}<span class="yr-st-n">${esc(p.name)}</span></p>
                <div class="yr-st-plate yr-c-${p.color}"><i class="yr-st-bar"></i><span class="yr-st-notch">${[0, 1, 2].map((k) => `<i${k < p.used ? ' class="is-on"' : ''}></i>`).join('')}</span></div>
              </div>`
          }).join('')}
          <p class="yr-st-axis">${m.spans.map((b) => `<span style="--b0: ${b.lo.toFixed(4)}; --bh: ${b.size.toFixed(4)}" class="${b.sponsor ? 'is-sponsor' : ''}${b.size * 904 < 150 ? ' is-tight' : ''}">${esc(b.name)}</span>`).join('')}</p>
        </div>${nextUp(m)}${sr(crewSay(m))}`
      el.style.setProperty('--you-i', String(you))
    },
    // each face pinned at its height, the leader in a gold rim, the camera's frame tag
    'yr-faces'(el, m) {
      const g = GEO.faces
      const ps = drawOrder(m)
      const ly = spread(ps.map((p) => yOf(g, p.f)), 250, 170, g.top + g.h - 40)
      el.innerHTML = `<div class="yr-fc" aria-hidden="true">
          <div class="yr-fc-bands">${bandsCol(m)}</div>
          <i class="yr-fc-spine"></i>
          ${ps.map((p, i) => {
            const y = yOf(g, p.f), c = p.you ? climb(m, g, p) : p.passed ? climb(m, g, p) : { rise: 0, pass: 0 }
            return `<div class="yr-fc-mark${p.you ? ' is-you' : ''}${p.passed ? ' is-passed' : ''}${p.leader ? ' is-leader' : ''}" style="--y: ${y.toFixed(1)}px; --ly: ${ly[i].toFixed(1)}px; --rise: ${(p.you ? c.rise : 0).toFixed(1)}px; --pass: ${c.pass}ms; ${lead(y, ly[i], 88)}">
                <i class="yr-fc-tick yr-c-${p.color}"></i><i class="yr-fc-lead yr-c-${p.color}"></i>
                <div class="yr-fc-face yr-c-${p.color}">${AVA(p, 'yr-fc-img')}${crownIco(crownOf(p, m) + ' yr-fc-crown')}</div>
                <div class="yr-fc-lab"><p class="yr-fc-who">${tagChip(p)}<span class="yr-fc-n">${esc(p.name)}</span></p>${slots(p)}</div>
              </div>`
          }).join('')}
          <p class="yr-fc-tag">${camTag('Camera frame', 'camera')}<span class="yr-fc-note">Live run only</span></p>
        </div>${nextUp(m)}${sr(crewSay(m))}`
    },
    // players left to right in turn order, each bar filled to its best; the next player's bar outlined, Your go
    'yr-turns'(el, m) {
      el.innerHTML = `<div class="yr-tn" aria-hidden="true" style="--n: ${m.players.length}">
          <div class="yr-tn-bands">${bandsCol(m)}</div>
          <div class="yr-tn-bars">${m.players.map((p) => `
            <div class="yr-tn-col${p.you ? ' is-you' : ''}${p === m.next ? ' is-next' : ''}${p.leader ? ' is-leader' : ''}${p.passed ? ' is-passed' : ''}" style="--f: ${p.f.toFixed(3)}; --pass: ${p.passed ? climbPass(m, p) : 0}ms">
              <div class="yr-tn-track">${m.spans.slice(1).map((b) => `<i class="yr-tn-edge" style="--b0: ${b.lo.toFixed(4)}"></i>`).join('')}<i class="yr-tn-fill yr-c-${p.color}"></i>${crownIco(crownOf(p, m) + ' yr-tn-crown')}${p === m.next ? '<span class="yr-tn-go">Your go</span>' : ''}</div>
              <p class="yr-tn-who">${tagChip(p)}<span class="yr-tn-n" data-fit>${esc(p.name)}</span></p>${slots(p)}
            </div>`).join('')}
          </div>
        </div>${sr(crewSay(m))}`
    },
    // the player's mark enters low and climbs past each friend it beat, dimming each passed name; the crown moves
    'yr-over'(el, m) {
      const g = GEO.over
      const others = m.others.slice().sort((a, b) => b.best - a.best)
      const ly = spread(others.map((p) => yOf(g, p.f)), 128, g.top - 20, g.top + g.h + 20)
      const c = climb(m, g, m.you)
      el.innerHTML = `<div class="yr-ov" aria-hidden="true">
          <div class="yr-ov-lane">${m.spans.map((b) => `<i style="--b0: ${b.lo.toFixed(4)}; --bh: ${b.size.toFixed(4)}"${b.sponsor ? ' class="is-sponsor"' : ''}></i>`).join('')}</div>
          ${others.map((p, i) => { const y = yOf(g, p.f); return `<div class="yr-ov-rung${p.passed ? ' is-passed' : ''}${p.leader ? ' is-leader' : ''}" style="--y: ${y.toFixed(1)}px; --ly: ${ly[i].toFixed(1)}px; --pass: ${climb(m, g, p).pass}ms; ${lead(y, ly[i], -40)}">
              <i class="yr-ov-tick yr-c-${p.color}"></i><i class="yr-ov-lead yr-c-${p.color}"></i>
              <div class="yr-ov-lab"><p class="yr-ov-who"><span class="yr-ov-n">${esc(p.name)}</span>${tagChip(p, m)}</p>${slots(p)}</div>
            </div>` }).join('')}
          <div class="yr-ov-you${m.you.leader ? ' is-leader' : ''}${m.moved && m.you.leader ? ' took-crown' : ''}" style="--y: ${yOf(g, m.you.f).toFixed(1)}px; --rise: ${c.rise.toFixed(1)}px">
            <i class="yr-ov-chev"></i>
            <div class="yr-ov-me"><span class="yr-ov-face">${AVA(m.you)}${crownIco(crownOf(m.you, m))}</span><div><p class="yr-ov-mn" data-fit>${esc(m.you.name)}</p>${slots(m.you)}</div></div>
          </div>
        </div>${nextUp(m)}${sr(crewSay(m))}`
    },
  }
  // when a friend is passed in the designs that do not measure a column (plates, bars): the same clock as climb()
  function climbPass(m, p) {
    const to = m.you.f
    return Math.round(300 + (to > 0 ? Math.max(0, Math.min(1, p.f / to)) : 0) * CLIMB)
  }

  /* ------------------------------------------------------------ One fix */
  // the order is set as large as its column and the room allow, on one, two or three lines (fitWord)
  const fixText = (fx, word, line, tag, wide) => `<div class="yr-fx-text">
      ${tag ? `<p class="yr-fx-tag">${tag}${wide && fx.seen && !fx.slotTag ? `<span class="yr-fx-seen">${esc(fx.seen)}</span>` : ''}</p>` : ''}
      <p class="yr-fx-word" data-words="${esc(word)}" data-w="${wide ? 904 : 456}" data-h="${wide ? (tag ? 320 : 390) : (tag ? 250 : 320)}">${esc(word)}</p>
      <p class="yr-fx-line">${esc(line)}</p>
    </div>`
  const camOf = (fx) => (fx.camera ? camTag('Camera read') : '')
  const fixSay = (fx, word, line, tagWord) => `One fix for the next hit: ${word}. ${line}.${tagWord ? ` ${tagWord}${fx.seen ? `: ${fx.seen.toLowerCase()}` : ''}.` : ''}`
  // a shoe print, toe up, centred on 0,0
  const FOOT = 'M0 -58 C22 -58 27 -30 25 -8 C23 16 17 30 17 42 C17 54 9 60 0 60 C-9 60 -17 54 -17 42 C-17 30 -23 16 -25 -8 C-27 -30 -22 -58 0 -58 Z'
  const foot = (x, y, r, cls) => `<path class="${cls}" d="${FOOT}" transform="translate(${x} ${y}) rotate(${r}) scale(1.3)"/>`
  const arrowHead = (id) => `<marker id="${id}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="context-stroke"/></marker>`
  function stanceSVG(fx) {
    const id = 'yrA' + fx.kind
    const pad = '<rect class="yr-sd-pad" x="96" y="14" width="228" height="46" rx="14"/><text class="yr-sd-k" x="336" y="50">Pad</text>'
    let body
    if (fx.kind === 'foot') {
      body = `${foot(292, 372, 26, 'yr-sd-foot')}${foot(176, 322, -10, 'yr-sd-foot is-hollow')}${foot(190, 150, -10, 'yr-sd-foot is-ghost')}
        <path class="yr-sd-arrow" d="M86 372 L92 178" marker-end="url(#${id})"/>`
    } else if (fx.kind === 'hand') {
      body = `${foot(292, 380, 26, 'yr-sd-foot')}${foot(176, 332, -10, 'yr-sd-foot')}
        <circle class="yr-sd-fist is-on" cx="262" cy="98" r="34"/><text class="yr-sd-k" x="310" y="112">Right</text>
        <circle class="yr-sd-fist is-hollow" cx="150" cy="214" r="34"/><text class="yr-sd-k" x="20" y="226">Left</text>
        <path class="yr-sd-arrow" d="M150 168 L150 104" marker-end="url(#${id})"/>`
    } else {
      body = `${foot(292, 380, 26, 'yr-sd-foot')}${foot(176, 332, -10, 'yr-sd-foot')}
        <circle class="yr-sd-fist is-on" cx="232" cy="136" r="34"/>
        <path class="yr-sd-arrow" d="M232 92 L232 -6" marker-end="url(#${id})"/>`
    }
    return `<svg class="yr-sd-svg" viewBox="0 0 420 460" aria-hidden="true" focusable="false"><defs>${arrowHead(id)}</defs>${pad}${body}</svg>`
  }
  // a flat figure from the replay: guard, the punch on its way, the frame the fix is about (held)
  function figure(p) {
    const limb = (pts, cls) => `<polyline class="${cls || 'yr-sil-limb'}" points="${pts}"/>`
    return `${limb(`${p.n} ${p.h}`, 'yr-sil-torso')}<circle class="yr-sil-head" cx="${p.head[0]}" cy="${p.head[1]}" r="36"/>
      ${limb(p.rear)}<circle class="yr-sil-fist" cx="${p.rf[0]}" cy="${p.rf[1]}" r="24"/>
      ${limb(p.front)}<circle class="yr-sil-fist" cx="${p.ff[0]}" cy="${p.ff[1]}" r="24"/>`
  }
  const LEGS = `<polyline class="yr-sil-leg" points="170,262 136,346 112,426"/><polyline class="yr-sil-leg" points="170,262 212,346 232,426"/>
    <line class="yr-sil-foot" x1="90" y1="436" x2="138" y2="436"/><line class="yr-sil-foot" x1="222" y1="436" x2="276" y2="436"/>`
  const POSES = {
    guard: { n: '184,128', h: '170,262', head: [192, 88], rear: '176,146 196,214 222,160', rf: [222, 160], front: '194,146 234,206 250,142', ff: [250, 142] },
    mid: { n: '196,130', h: '170,262', head: [206, 92], rear: '188,148 238,176 290,160', rf: [290, 160], front: '204,148 240,206 256,146', ff: [256, 146] },
    hit: { n: '206,134', h: '170,262', head: [218, 98], rear: '196,152 270,158 344,156', rf: [344, 156], front: '212,150 246,206 262,150', ff: [262, 150] },
  }
  function silhouetteSVG(fx) {
    const id = 'yrS' + fx.kind
    const note = fx.kind === 'foot'
      ? `<circle class="yr-sil-ring" cx="249" cy="436" r="42"/><line class="yr-sil-ghost" x1="296" y1="436" x2="350" y2="436"/><path class="yr-sil-arrow" d="M258 470 L330 470" marker-end="url(#${id})"/>`
      : fx.kind === 'hand'
        ? `<circle class="yr-sil-ring" cx="262" cy="150" r="42"/><polyline class="yr-sil-ghost" points="212,150 280,188 350,196"/>`
        : `<circle class="yr-sil-ring" cx="344" cy="156" r="42"/><path class="yr-sil-arrow" d="M392 156 L452 156" marker-end="url(#${id})"/>`
    return `<svg class="yr-sil-svg" viewBox="0 0 470 490" aria-hidden="true" focusable="false"><defs>${arrowHead(id)}</defs>
      <rect class="yr-sil-pad" x="368" y="64" width="34" height="250" rx="14"/>
      <g class="yr-sil-body">${LEGS}
        <g class="yr-sil-pose is-guard">${figure(POSES.guard)}</g>
        <g class="yr-sil-pose is-mid">${figure(POSES.mid)}</g>
        <g class="yr-sil-pose is-hit">${figure(POSES.hit)}</g>
      </g>
      <g class="yr-sil-note">${note}</g></svg>`
  }
  // a boxing glove, thumb to the left
  const GLOVE = `<path class="yr-gl-body" d="M58 132 C54 70 86 26 134 26 C182 26 206 62 204 112 L200 160 C198 182 184 194 162 194 L86 194 C68 194 58 182 58 164 Z"/>
    <path class="yr-gl-body" d="M62 128 C40 118 22 132 24 154 C26 176 46 188 68 178"/>
    <rect class="yr-gl-body" x="80" y="192" width="112" height="52" rx="12"/><line class="yr-gl-lace" x1="84" y1="218" x2="188" y2="218"/>`
  const glove = (on, mirror) => `<svg class="yr-gl-svg${on ? ' is-on' : ''}" viewBox="0 0 230 260" aria-hidden="true" focusable="false"><g${mirror ? ' transform="translate(230 0) scale(-1 1)"' : ''}>${GLOVE}</g></svg>`
  function slotPanel(slot) {
    if (slot.kind === 'trace') {
      return `<p class="yr-sl-k">${I('activity')}Force trace</p>
        <svg class="yr-sl-svg" viewBox="0 0 440 300" aria-hidden="true" focusable="false">
          <line class="yr-sl-base" x1="20" y1="262" x2="420" y2="262"/>
          <path class="yr-sl-ghost" d="M40 262 C150 262 172 250 190 44 C206 250 226 262 400 262"/>
          <path class="yr-sl-trace" pathLength="1" d="M40 262 C120 260 150 122 220 120 C290 118 320 260 400 262"/>
          <text class="yr-sl-t is-snap" x="208" y="40">Snap</text><text class="yr-sl-t" x="268" y="104">Yours</text>
        </svg>`
    }
    const [dx, dy] = slot.dot
    return `<p class="yr-sl-k">${I('crosshair')}Where it landed</p>
      <svg class="yr-sl-svg" viewBox="0 0 440 300" aria-hidden="true" focusable="false">
        <circle class="yr-sl-ring" cx="220" cy="150" r="138"/><circle class="yr-sl-ring" cx="220" cy="150" r="92"/><circle class="yr-sl-ring is-in" cx="220" cy="150" r="46"/>
        <path class="yr-sl-cross" d="M220 4V296M74 150H366"/>
        <circle class="yr-sl-halo" cx="${220 + dx * 138}" cy="${150 + dy * 138}" r="34"/><circle class="yr-sl-dot" cx="${220 + dx * 138}" cy="${150 + dy * 138}" r="18"/>
      </svg>`
  }
  const FIX = {
    'yr-order'(el, m) {
      const fx = m.fix
      el.innerHTML = `<div aria-hidden="true">${fixText(fx, fx.word, fx.line, camOf(fx), true)}</div>${sr(fixSay(fx, fx.word, fx.line, fx.camera && 'Camera read'))}`
    },
    'yr-stance'(el, m) {
      const fx = m.fix
      el.innerHTML = `<div class="yr-fx-grid" aria-hidden="true"><div class="yr-fx-pic yr-sd">${stanceSVG(fx)}</div>${fixText(fx, fx.word, fx.line, camOf(fx))}</div>${sr(fixSay(fx, fx.word, fx.line, fx.camera && 'Camera read'))}`
    },
    'yr-sil'(el, m) {
      const fx = m.fix
      el.innerHTML = `<div class="yr-fx-grid" aria-hidden="true"><div class="yr-fx-pic yr-sil-pic">${silhouetteSVG(fx)}<span class="yr-sil-k">${I('rewind')}Your replay</span></div>${fixText(fx, fx.word, fx.line, camOf(fx))}</div>${sr(fixSay(fx, fx.word, fx.line, fx.camera && 'Camera read'))}`
    },
    'yr-gloves'(el, m) {
      const fx = m.fix
      // the used glove filled, the other outlined; the hand fix asks for the other one
      const word = fx.word, line = fx.kind === 'hand' ? fx.line : fx.kind === 'foot' ? 'Same right hand, one step closer' : fx.line
      el.innerHTML = `<div class="yr-fx-grid is-flip${fx.kind === 'hand' ? ' is-hand' : ''}" aria-hidden="true">${fixText(fx, word, line, camOf(fx))}
          <div class="yr-fx-pic yr-gl"><figure class="yr-gl-one is-left">${glove(false, true)}<figcaption>Left</figcaption></figure><figure class="yr-gl-one is-right">${glove(true, false)}<figcaption>Right</figcaption></figure></div>
        </div>${sr(fixSay(fx, word, line, fx.camera && 'Camera read'))}`
    },
    'yr-slot'(el, m) {
      const fx = m.fix, s = fx.slot
      el.innerHTML = `<div class="yr-fx-grid is-flip" aria-hidden="true">${fixText({ ...fx, slotTag: true }, s.word, s.line, camTag('Pad read', 'activity'))}
          <div class="yr-fx-pic yr-sl">${slotPanel(s)}</div>
        </div>${sr(fixSay(fx, s.word, s.line, 'Pad read'))}`
    },
  }

  /* ------------------------------------------------------------ Today's crown */
  const holderAva = (c) => (c.holder.ava ? AVA(c.holder) : '')
  const crownSay = (m) => {
    const c = m.crown
    return (c.takes ? `New crown. Your hit plays here today.` : `Today's crown: ${c.name}, ${c.since}.`) + (m.flatter ? ' Harder than most today.' : '') + (c.claimed ? '' : ' Unclaimed. Scan to claim it.')
  }
  // today's hits as a soft band: the density of the quantiles, smoothed, mirrored about its middle
  function crowdPath(w, h) {
    const q = TODAY.q, N = 120, raw = []
    for (let k = 0; k < N; k++) {
      const s = (k + .5) / N * MAX
      let d = 0
      for (let i = 1; i < q.length; i++) if (s <= q[i][1] || i === q.length - 1) { d = (q[i][0] - q[i - 1][0]) / Math.max(1, q[i][1] - q[i - 1][1]); break }
      raw.push(d)
    }
    const sm = raw.map((_, k) => { let a = 0, wsum = 0; for (let j = -8; j <= 8; j++) { const v = raw[k + j]; if (v == null) continue; const wt = Math.exp(-(j * j) / 18); a += v * wt; wsum += wt } return a / wsum })
    const top = Math.max(...sm), mid = h / 2
    const pts = sm.map((v, k) => [(k + .5) / N * w, (v / top) * (h / 2 - 6)])
    const up = pts.map(([x, a]) => `${x.toFixed(1)},${(mid - a).toFixed(1)}`).join(' ')
    const dn = pts.slice().reverse().map(([x, a]) => `${x.toFixed(1)},${(mid + a).toFixed(1)}`).join(' ')
    return `M0,${mid} L${up} L${w},${mid} L${dn} Z`
  }
  const CROWN = {
    // a thin gold rule across the full width at the crown's height, the holder and how long at its end
    'yr-cline'(el, m) {
      const c = m.crown
      // the room's scale: the rule at the top, the floor at the foot, the player's mark between by height
      // below the rule, the player's mark at its share of the crown's score (a takeover: the old rule, and the move up)
      const fy = Math.max(.08, 1 - m.hit / c.score)
      el.classList.toggle('is-takes', c.takes)
      el.innerHTML = `<div class="yr-cl" aria-hidden="true">
          <p class="yr-cl-k">${I('crown')}Today’s crown</p>
          <div class="yr-cl-rule"><i class="yr-cl-line"></i><p class="yr-cl-who">${holderAva(c)}<span class="yr-cl-n">${esc(c.name)}</span><span class="yr-cl-since">${c.takes ? 'new crown' : esc(c.since)}</span></p></div>
          ${c.takes
            ? `<div class="yr-cl-old"><i class="yr-cl-oline"></i><p class="yr-cl-ow">${esc(c.was.name)} held it since ${esc(c.was.since)}</p><i class="yr-cl-up"></i></div>
               <p class="yr-cl-new">${AVA(m.you)}<span>Your hit plays here today</span></p>`
            : `<div class="yr-cl-you" style="--y: ${fy.toFixed(3)}"><i class="yr-cl-tick"></i><p class="yr-cl-me">${AVA(m.you)}<span>You</span></p></div>`}
        </div>${sr(crownSay(m))}`
    },
    // a soft band of today's hits, the player's mark on it, the flattering line only when it is true
    'yr-crowd'(el, m) {
      const c = m.crown, W = 904, H = 200
      const x = (s) => Math.max(0, Math.min(1, s / MAX))
      el.innerHTML = `<div class="yr-cw" aria-hidden="true">
          <p class="yr-cw-head">${crownIco('is-on')}<span class="yr-k">${c.takes ? 'New crown' : 'Crown'}</span>${holderAva(c)}<span class="yr-cw-n">${esc(c.name)}</span>${c.takes ? '' : `<span class="yr-cw-since">${esc(c.since)}</span>`}</p>
          <div class="yr-cw-band">
            <svg class="yr-cw-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" focusable="false"><path d="${crowdPath(W, H)}"/></svg>
            <i class="yr-cw-crown" style="--x: ${x(c.takes ? c.was.score : c.score).toFixed(4)}">${c.takes ? '' : svgIcon('crown')}</i>
            <div class="yr-cw-you" style="--x: ${x(m.hit).toFixed(4)}"><i class="yr-cw-mark"></i><span class="yr-cw-me">${AVA(m.you)}<span>You</span></span></div>
          </div>
          <p class="yr-cw-axis"><span>Softer</span><span>Today on this machine</span><span>Harder</span></p>
          ${m.flatter ? `<p class="yr-cw-line">${I('flame')}Harder than most today</p>` : ''}
        </div>${sr(crownSay(m))}`
    },
    // a hit that takes the crown floods the section and holds its impact frame; otherwise the holder's frame waits
    'yr-take'(el, m) {
      const c = m.crown, ph = c.photo
      el.classList.toggle('is-takes', c.takes)
      el.innerHTML = `<div class="yr-tk" aria-hidden="true">
          <figure class="yr-tk-shot"><img class="yr-tk-img" src="${ph.src}" alt="" decoding="async" style="--pos: ${ph.pos}"><figcaption class="yr-tk-cap">${I('camera')}Impact frame</figcaption></figure>
          <div class="yr-tk-text">
            ${crownIco('is-on yr-tk-crown')}
            <p class="yr-tk-h" data-fit>${c.takes ? 'New crown' : esc(c.name)}</p>
            <p class="yr-tk-since">${c.takes ? `${esc(c.name)}, from this hit` : `Today’s crown ${esc(c.since)}`}</p>
            <p class="yr-tk-line">${c.takes ? 'Your hit plays here today' : 'Take it and your hit plays here'}</p>
          </div>
        </div>${sr(crownSay(m))}`
      const img = el.querySelector('img')
      if (img) img.alt = ''
    },
    // an empty crown beside the run code; it fills when the holder scans
    'yr-claim'(el, m) {
      const c = m.crown
      el.classList.toggle('is-claimed', c.claimed)
      el.innerHTML = `<div class="yr-cm" aria-hidden="true">
          <div class="yr-cm-text">
            <span class="yr-cm-crown">${svgIcon('crown')}${c.claimed && c.holder.ava ? AVA(c.holder, 'yr-cm-ava') : ''}</span>
            ${c.claimed
              ? `<p class="yr-cm-h" data-fit>${esc(c.name)}</p><p class="yr-cm-line">${c.takes ? 'New crown, claimed' : `Claimed ${esc(c.since)}`}</p><p class="yr-cm-scan">${I('scan-qr-code')}Scan to keep your run</p>`
              : `<p class="yr-cm-h" data-fit>Unclaimed</p><p class="yr-cm-line">${c.takes ? 'Your hit took it' : `The best hit ${esc(c.since)}`}</p><p class="yr-cm-scan">${I('scan-qr-code')}Scan to claim it</p>`}
          </div>
          <div class="pqr yr-cm-qr" data-pqr data-pqr-label="Run code" style="--pqr-size: 340px"></div>
        </div>${sr(crownSay(m) + ' The run code is beside it.')}`
      if (window.PunchQR) window.PunchQR.mount(el.querySelector('.yr-cm-qr'), { label: 'Run code' })
    },
    // a ribbon grows from the crown for as long as it is held, snaps when it is taken, resets at opening
    'yr-reign'(el, m) {
      const c = m.crown, now = TODAY.marks[TODAY.marks.length - 1].at
      const reigns = TODAY.reigns.map((r) => ({ ...r, to: r.to == null ? now : r.to, live: r.to == null && !c.takes, snap: r.to != null || c.takes }))
      el.innerHTML = `<div class="yr-rb" aria-hidden="true">
          <p class="yr-rb-head">${crownIco('is-on')}${holderAva(c)}<span class="yr-rb-n">${esc(c.name)}</span><span class="yr-rb-since">${c.takes ? 'New crown' : esc(c.since)}</span></p>
          <div class="yr-rb-track" style="--now: ${now}">
            ${reigns.map((r, i) => `<div class="yr-rb-seg${r.live ? ' is-live' : ''}${r.snap ? ' is-snap' : ''}" style="--a: ${r.from}; --b: ${r.to}; --i: ${i}"><span>${esc(r.name)}</span></div>`).join('')}
            ${c.takes ? `<div class="yr-rb-seg is-live is-new" style="--a: ${now}; --b: ${Math.min(1, now + .17)}"><span>${esc(c.name)}</span></div>` : ''}
            <i class="yr-rb-head-crown" style="--x: ${c.takes ? Math.min(1, now + .17) : now}">${svgIcon('crown')}</i>
            <p class="yr-rb-marks">${TODAY.marks.map((k) => `<span style="--x: ${k.at}">${esc(k.w)}</span>`).join('')}</p>
          </div>
          <p class="yr-rb-line">${c.takes ? 'Your hit plays here until it is beaten' : 'Take it and your hit plays here'}</p>
        </div>${sr(crownSay(m) + (c.takes ? ` It ends ${c.was.name}’s reign since ${c.was.since}.` : ''))}`
    },
  }

  const RENDER = { next: NEXT, crew: CREW, fix: FIX, crown: CROWN }

  /* ------------------------------------------------------------ fitting type to its column */
  // a text's advance in ems, in its own face; the decimals at the .dec size
  const DEC = .46
  const pen = document.createElement('canvas').getContext('2d')
  function emOf(el) {
    const cs = getComputedStyle(el)
    const fs = parseFloat(cs.fontSize) || 100
    const ls = (parseFloat(cs.letterSpacing) || 0) / fs
    const up = cs.textTransform === 'uppercase'
    pen.font = `${cs.fontWeight} 100px ${cs.fontFamily}`
    let em = 0
    const walk = (node, k) => {
      for (const n of node.childNodes) {
        if (n.nodeType === 3) { const t = up ? n.textContent.toUpperCase() : n.textContent; em += (pen.measureText(t).width / 100 + t.length * ls) * k }
        else if (n.nodeType === 1 && !n.classList.contains('sr-only')) walk(n, n.classList.contains('dec') ? k * DEC : k)
      }
    }
    walk(el, 1)
    return em
  }
  // the fix's order: every way of setting its words on one to three lines, the largest that fits the column and the room
  function fitWord(el) {
    const words = (el.dataset.words || el.textContent).split(' ').filter(Boolean)
    const W = Number(el.dataset.w) || 904
    const cs = getComputedStyle(el)
    const LH = (parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)) || .88
    // a design on show measures its column (layout sizes: glass pixels at any zoom, and blind to an entrance's
    // transforms); a hidden one keeps its budget
    let H = Number(el.dataset.h) || 300
    const col = el.parentElement
    if (col && col.offsetHeight > 0) {
      const gap = parseFloat(getComputedStyle(col).rowGap) || 0
      const others = [...col.children].filter((c) => c !== el).reduce((a, c) => a + c.offsetHeight, 0)
      H = Math.min(H + 60, col.offsetHeight - others - gap * (col.children.length - 1) - 14)
    }
    const cap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cap')) || .8
    const capFont = 230 / cap
    const ls = (parseFloat(cs.letterSpacing) || 0) / (parseFloat(cs.fontSize) || 100)
    const up = cs.textTransform === 'uppercase'
    pen.font = `${cs.fontWeight} 100px ${cs.fontFamily}`
    const em = (t) => { const u = up ? t.toUpperCase() : t; return pen.measureText(u).width / 100 + u.length * ls }
    const splits = (arr, k) => {
      if (k === 1) return [[arr.join(' ')]]
      const out = []
      for (let i = 1; i <= arr.length - k + 1; i++) for (const rest of splits(arr.slice(i), k - 1)) out.push([arr.slice(0, i).join(' '), ...rest])
      return out
    }
    let best = null
    for (let k = 1; k <= Math.min(3, words.length); k++) {
      for (const lines of splits(words, k)) {
        const size = Math.min(capFont, W / (Math.max(...lines.map(em)) * 1.04), H / (k * LH))
        // another line only when it buys a clearly larger size
        if (!best || size > best.size * 1.08) best = { size, lines }
      }
    }
    if (!best) return
    el.innerHTML = best.lines.map((l) => `<span>${esc(l)}</span>`).join('')
    el.style.fontSize = `${best.size.toFixed(1)}px`
  }
  function fit(scope) {
    scope.querySelectorAll('.yr-fx-word').forEach(fitWord)
    scope.querySelectorAll('[data-fit]').forEach((el) => {
      // a count runs through wider figures than the one it lands on: size for the widest
      const from = el.dataset.countFrom, keep = from ? el.textContent : null
      if (from) el.textContent = int(Number(from))
      // a block set on several lines is as wide as its widest line
      const em = el.hasAttribute('data-fit-lines') ? Math.max(...[...el.children].map(emOf)) : emOf(el)
      if (from) el.textContent = keep
      if (em > 0) el.style.setProperty('--em', (em * 1.03).toFixed(3))
      const cs = getComputedStyle(el), face = `${cs.fontWeight} 100px ${cs.fontFamily}`
      if (document.fonts && !document.fonts.check(face, 'ABC0123456789')) {
        document.fonts.load(face, 'ABC0123456789').then(() => fit(scope)).catch(() => {})
      }
    })
  }

  // fit now, and again once the lines around it have settled (a face that is still on its way sets them differently)
  let refit = 0
  function fitSoon(scope) {
    fit(scope)
    clearTimeout(refit)
    refit = setTimeout(() => { if (open) fit(frame) }, 400)
  }

  /* ------------------------------------------------------------ the screen */
  // the four story sections and the shared Punch again at the foot (parts/ms-again.html, .ag-sec)
  const secs = () => [...frame.querySelectorAll(':scope > :is(.yr-sec, .ag-sec)[data-sec]')]
  const shown = (sec) => [...sec.children].find((c) => c.hasAttribute('data-sv') && !c.hidden) || null
  // the reading order over about eight seconds: the gap lands, the crew overtake, the fix, the crown, and Punch again
  // last, as on the Big score and New record
  const BEAT = { next: 80, crew: 1300, fix: 4300, crown: 5700, again: 6900 }
  const SETTLE = { next: 2800, crew: 3400, fix: 3000, crown: 2600, again: 1800 }
  const CLS = ['is-play', 'is-settled', 'is-landed']
  const loader = document.querySelector('.loader')
  let open = null, waiting = null
  const timers = new Map(), rafs = new Map()

  function liveScore(opts) {
    const given = Number(opts.score)
    if (opts.score != null && Number.isFinite(given)) return clamp(given)
    const app = window.punchApp && Number(window.punchApp.score)
    if (Number.isFinite(app) && window.punchApp.score != null) return clamp(app)
    const res = document.querySelector('#screenContent [data-bind="score"]')
    const read = res && parseFloat(res.textContent.replace(/,/g, ''))
    return Number.isFinite(read) ? clamp(read) : TOP
  }
  // the run the screen shows: the one asked for, else the one nearest the live score, with that score as this hit
  function choose(opts) {
    if (opts.run && RUNS[opts.run]) return model(opts.run, null, opts.claimed)
    const live = liveScore(opts)
    let best = null
    for (const k of Object.keys(RUNS)) {
      const r = RUNS[k], you = r.crew.find((p) => p.key === r.you), h = you.hits[you.hits.length - 1]
      const d = Math.abs(h - live)
      if (!best || d < best.d) best = { k, d, h }
    }
    return model(best.k, best.d < .0005 ? null : live, opts.claimed)
  }

  function renderAll() {
    if (!open) return
    for (const sec of secs()) {
      const set = RENDER[sec.dataset.sec] || {}
      sec.querySelectorAll(':scope > [data-sv]').forEach((d) => {
        const k = Object.keys(set).find((c) => d.classList.contains(c))
        if (k) set[k](d, open.m)
      })
    }
    root.dataset.run = open.m.runKey
    fitSoon(frame)
  }

  function clearSec(sec) {
    ;(timers.get(sec) || []).forEach(clearTimeout)
    timers.set(sec, [])
    cancelAnimationFrame(rafs.get(sec) || 0)
    sec.querySelectorAll(':scope > [data-sv]').forEach((d) => { d.classList.remove(...CLS); d.style.removeProperty('--sd') })
  }
  function stop() {
    if (waiting) { waiting.disconnect(); waiting = null }
    secs().forEach(clearSec)
    open = null
  }
  // the Count down design: the figure runs down from the mark above to what is left
  function countDown(sec, el, delay) {
    const n = el.querySelector('[data-count-from]')
    if (!n) return
    const from = Number(n.dataset.countFrom), to = Number(n.dataset.countTo), dur = 1500, wait = delay + 450
    const start = performance.now() + wait
    const paint = (v) => { n.textContent = int(v) }
    paint(from)
    const tick = (now) => {
      const p = Math.max(0, Math.min(1, (now - start) / dur)), k = 1 - Math.pow(1 - p, 3)
      paint(from + (to - from) * k)
      if (p < 1) rafs.set(sec, requestAnimationFrame(tick))
    }
    rafs.set(sec, requestAnimationFrame(tick))
    // a hidden tab runs no frames: land it on time regardless
    timers.get(sec).push(setTimeout(() => { cancelAnimationFrame(rafs.get(sec) || 0); paint(to); el.classList.add('is-landed') }, wait + dur + 40))
  }
  function play(sec, delay) {
    if (!open) return
    clearSec(sec)
    const el = shown(sec)
    if (!el || reduced.matches) return
    el.style.setProperty('--sd', `${delay}ms`)
    void el.offsetWidth
    el.classList.add('is-play')
    if (el.classList.contains('yr-count')) countDown(sec, el, delay)
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
    secs().forEach((sec) => play(sec, BEAT[sec.dataset.sec] ?? 0))
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
    if (sec && frame.contains(sec)) { fitSoon(sec); play(sec, 0) }
  })
  // the score format changed: every number is drawn again, nothing replays
  document.addEventListener('decimals', () => {
    if (!open) return
    open.m = choose(open.opts)
    secs().forEach((sec) => { (timers.get(sec) || []).forEach(clearTimeout); timers.set(sec, []); cancelAnimationFrame(rafs.get(sec) || 0) })
    renderAll()
    frame.querySelectorAll(':is(.yr-sec, .ag-sec) > .is-play').forEach((el) => el.classList.add('is-landed', 'is-settled'))
  })
  // the look changed: the typefaces did too, so the fitted type is measured again
  new MutationObserver(() => { if (open) fit(frame) }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-variant', 'data-appearance'] })
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (open) fit(frame) })
  // a face that arrives later (a look's own, asked for when the look changes) changes every line it sets: fit again
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => { if (open) fit(frame) })

  // for the render harness: the model the screen is showing
  window.yourRun = { runs: Object.keys(RUNS), get model() { return open && open.m }, height, pctOf, fit: () => fit(frame) }
})()
