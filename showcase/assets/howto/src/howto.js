/* How to use the QR code: the scene's runtime. Picks the look from ?a=, points each phone at its captured screen,
   scales each machine glass from its native 1080 px, draws the beam between the two codes, then sets
   window.__howtoReady for render.mjs. */
(() => {
  'use strict'
  const root = document.documentElement
  const look = new URLSearchParams(location.search).get('a') === 'light' ? 'light' : 'dark'
  root.dataset.appearance = look

  /* ---------------------------------------------------------------- the machine's glass, at native 1080 px */
  const GLASS = {
    // the Steps scan design: brand, Next player, Scan to play, the code in the red brackets, waiting
    scan: { eyebrow: 'Next player', title: 'Scan<br>to play', size: 244, found: false, status: 'Waiting for your phone' },
    // linked: the As drawn design's welcome, the tile's own found state
    linked: { eyebrow: 'Connected', title: 'Welcome,<br>Sara', size: 226, found: true, status: 'Step up and punch' },
  }
  document.querySelectorAll('.col[data-glass]').forEach((col) => {
    const g = GLASS[col.dataset.glass] || GLASS.scan
    col.innerHTML = `<div class="col-glass"><div class="gl">
      <div class="gl-brand"><img class="mark" src="assets/logos/fist-circle.svg" alt=""><img class="word on-dark" src="assets/logos/punchapp-wordmark.svg" alt="PunchApp"><img class="word on-light" src="assets/logos/punchapp-wordmark-dark.svg" alt="PunchApp"></div>
      <p class="gl-eyebrow"><i></i>${g.eyebrow}</p>
      <h2 class="gl-title" style="font-size:${g.size}px">${g.title}</h2>
      <div class="gl-code"><div class="pqr" data-pqr data-pqr-glow="off" ${g.found ? 'data-pqr-found' : ''}></div><i class="brk tl"></i><i class="brk tr"></i><i class="brk bl"></i><i class="brk br"></i></div>
      <p class="gl-status"><i></i>${g.status}</p>
    </div></div>`
    const glass = col.querySelector('.col-glass')
    glass.style.setProperty('--k', glass.clientWidth / 1080)
  })

  /* ---------------------------------------------------------------- the phone and the right hand holding it
     Drawn in phone units: the body is 100 x 210.4 (the screen's 440 x 956 inside a 3-unit bezel). The palm, wrist and
     sleeve sit behind the phone; the four fingertips wrap its left edge and the thumb crosses its right edge in front. */
  // the palm's right edge follows the thumb's base: high for the resting thumb, low when the thumb reaches across
  const PALM_RIGHT = {
    hold: 'L87.5 248 C100 240 110 232 112.6 222 C116.6 200 114 166 103 136 L50 146 Z',
    tap: 'L87.5 248 C99 241 110 233 113 221 C115.4 208 112 192 100.5 176 L50 176 Z',
  }
  function handBack(grip) {
    return `<svg class="hand-back" viewBox="0 0 100 210.4" aria-hidden="true">
      <path class="sleeve" d="M38.5 268 L90 251 L156 436 L94 458 Z"/>
      <path class="sleeve-hi" d="M38.5 268 L46 265.5 L104 454 L94 458 Z"/>
      <path class="cuff" d="M38.2 267.2 L89.6 250.2 L91.6 256.2 L40.2 273.2 Z"/>
      <path class="skin" d="M36 264.5 L87.2 247.4 L90 256 L38.8 273 Z"/>
      <path class="skin" d="M2 86 C-8 87 -13.5 94 -13.5 104 L-12.5 168 C-11 192 -4 210 9 227 C20 241 30 252 36 265 ${PALM_RIGHT[grip] || PALM_RIGHT.hold}"/>
      <path class="skin-lo" d="M-12.5 168 C-11 192 -4 210 9 227 C20 241 30 252 36 265 L43 262.6 C36 250 27 238 18 224 C8 208 1 190 -1 170 Z" opacity=".8"/>
    </svg>`
  }
  // the thumb and the mound at its base, in front of the phone: resting up the right edge, or reaching the fist button
  const THUMB = {
    hold: {
      d: 'M112 226 C117.5 196 114 160 104 132 C101 122 98 114.5 94.2 110.6 C90.4 106.8 84.8 109.4 85.8 115.8 C87.8 128 92.8 146 94.8 162 C96 176 95.2 191 93 207 C94 214 100 222 104 230 Z',
      edge: 'M85.8 115.8 C87.8 128 92.8 146 94.8 162 C96 176 95.2 191 93 207',
      hi: 'M113 213 C117.5 190 113.5 160 104 132 C107.6 150 110.6 174 109.4 198 Z',
      nail: [90.6, 117.2, 3.7, 5.2, -17], crease: 'M93.2 141.5 q4.8 1.3 9.6 .3',
    },
    tap: {
      d: 'M114 222 C111 199 104.5 188 92 185 C80 182 66 182 56 183.6 C48.6 184.8 46.6 192 49.8 196.4 C52.8 200.6 60 200.2 66 199.6 C78 198.8 88 202 96.5 212.5 C98 218 102 224 106 228 Z',
      edge: 'M49.8 196.4 C52.8 200.6 60 200.2 66 199.6 C78 198.8 88 202 96.5 212.5',
      hi: 'M115 214 C111 199 104.5 188 92 185 C100 190.5 105.5 199 107.6 212 Z',
      nail: [55.8, 188.6, 5.3, 3.7, -4], crease: 'M71.5 183.4 q1.3 8 .2 16',
    },
  }
  function handFront(grip) {
    // index at the top, pinky at the bottom; each tip wraps onto the left bezel, the knuckle side in shade
    const fingers = [[162, 20, -13, 5], [141, 23, -15.5, 6.3], [119, 24, -16, 6.8], [96.5, 23.5, -15.5, 6.5]]
    const f = fingers.map(([cy, h, x0, x1]) => {
      const w = x1 - x0
      return `<rect x="${x0}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="url(#fg-${grip})" stroke="var(--skin-lo)" stroke-width=".6" transform="rotate(-5 ${x1} ${cy})"/>`
    }).join('')
    const t = THUMB[grip] || THUMB.hold
    const [nx, ny, rx, ry, rot] = t.nail
    const thumb = `<path class="skin" d="${t.d}"/><path class="skin-hi" d="${t.hi}" opacity=".6"/><path class="skin-edge" d="${t.edge}"/>` +
      `<ellipse class="nail" cx="${nx}" cy="${ny}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${nx} ${ny})"/><path class="skin-line" d="${t.crease}"/>`
    const tap = grip === 'tap' ? `<circle class="tap" cx="50" cy="192.8" r="13.5" stroke-width="1.4" opacity=".95"/><circle class="tap" cx="50" cy="192.8" r="20" stroke-width=".8" opacity=".45"/>` : ''
    const defs = `<defs><linearGradient id="fg-${grip}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:var(--skin-lo)"/><stop offset=".5" style="stop-color:var(--skin)"/><stop offset="1" style="stop-color:var(--skin-hi)"/></linearGradient></defs>`
    return `<svg class="hand-front" viewBox="0 0 100 210.4" aria-hidden="true">${defs}<g class="fingers">${f}</g>${tap}<g class="thumb">${thumb}</g></svg>`
  }
  document.querySelectorAll('.phone[data-screen]').forEach((ph) => {
    ph.innerHTML = handBack(ph.dataset.grip) +
      `<div class="ph-body"></div><div class="ph-screen"><img data-phone="${ph.dataset.screen}" alt=""></div>` +
      `<div class="ph-qr"><i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c4"></i></div>` + handFront(ph.dataset.grip)
  })
  document.querySelectorAll('img[data-phone]').forEach((img) => { img.src = `assets/howto/src/phone-${look}-${img.dataset.phone}.png` })

  /* ---------------------------------------------------------------- the glove: step up and punch (points left) */
  document.querySelectorAll('.glove-slot').forEach((slot) => {
    slot.innerHTML = `<svg class="glove" viewBox="0 0 230 120" aria-hidden="true">
      <g class="speed"><path d="M168 40 H222" stroke-width="3.2" opacity=".9"/><path d="M176 58 H214" stroke-width="3.2" opacity=".6"/><path d="M166 76 H226" stroke-width="3.2" opacity=".75"/></g>
      <g class="speed impact"><path d="M14 44 L3 38" stroke-width="3" /><path d="M11 62 H-2" stroke-width="3"/><path d="M14 80 L3 86" stroke-width="3"/></g>
      <rect x="118" y="30" width="40" height="60" rx="9" fill="var(--sleeve)"/>
      <rect x="130" y="30" width="6" height="60" fill="#F5F3EF" opacity=".92"/>
      <path d="M24 60 C20 32 42 13 72 13 C98 13 114 23 121 37 L124 83 C114 97 92 104 68 104 C40 104 26 88 24 60 Z" fill="#EB1110"/>
      <path d="M24 60 C26 88 40 104 68 104 C92 104 114 97 124 83 L123.4 74 C112 86 92 92 70 92 C46 92 30 80 24 60 Z" fill="#B30D0C"/>
      <path d="M58 102 C60 86 78 77 97 80 C108 82 116 90 114 99 C102 106 78 108 58 102 Z" fill="#C80F0E" stroke="#8E0A0A" stroke-width="1.4"/>
      <ellipse cx="60" cy="31" rx="27" ry="9" fill="#FF6A67" opacity=".55" transform="rotate(-8 60 31)"/>
      <path d="M40 30 C33 42 32 58 36 72" fill="none" stroke="#8E0A0A" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>
    </svg>`
  })

  const centre = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2] }
  // Graham scan: the outline of a handful of points
  function hull(pts) {
    pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    const lo = [], hi = []
    for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p) }
    for (const p of pts.reverse()) { while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p) }
    return lo.slice(0, -1).concat(hi.slice(0, -1))
  }
  // The beam: the band between the glass's code and the phone's code. Drawn under the phone, over the glass, so the
  // phone hides its own end and the band reads as light travelling from the code on the glass into the camera.
  function beam() {
    document.querySelectorAll('svg.beam[data-from][data-to]').forEach((svg) => {
      const scene = svg.closest('.scene').getBoundingClientRect()
      const from = document.querySelector(svg.dataset.from), to = document.querySelector(svg.dataset.to)
      if (!from || !to) return
      const f = from.getBoundingClientRect()
      const m = [[f.left, f.top], [f.right, f.top], [f.right, f.bottom], [f.left, f.bottom]]
      const p = [...to.querySelectorAll('i')].map(centre)
      const rel = (q) => [q[0] - scene.left, q[1] - scene.top]
      // only the glass code's right edge: the band leaves the code rather than crossing its face
      const pts = [m[1], m[2], ...p].map(rel)
      const h = hull(pts)
      const d = 'M' + h.map((q) => q.map((v) => v.toFixed(2)).join(' ')).join('L') + 'Z'
      const [x0] = rel(m[1]), x1 = Math.max(...p.map((q) => rel(q)[0]))
      svg.setAttribute('viewBox', `0 0 ${scene.width} ${scene.height}`)
      svg.innerHTML = `<defs><linearGradient id="bm" gradientUnits="userSpaceOnUse" x1="${x0}" y1="0" x2="${x1}" y2="0">` +
        `<stop offset="0" style="stop-color:var(--beam)"/><stop offset="1" style="stop-color:var(--beam-2)"/></linearGradient></defs>` +
        `<path d="${d}" fill="url(#bm)"/>` +
        [[m[1], p[0]], [m[2], p[3]]].map(([a, b]) => { const A = rel(a), B = rel(b); return `<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" stroke="var(--beam-line)" stroke-width=".8" stroke-dasharray="2.2 2.6" stroke-linecap="round"/>` }).join('')
    })
  }

  const imgs = [...document.images].map((im) => (im.complete ? Promise.resolve() : new Promise((r) => { im.onload = im.onerror = r })))
  Promise.all([document.fonts.ready, ...imgs]).then(() => {
    if (window.PunchQR) window.PunchQR.mountAll()
    document.querySelectorAll('[data-pqr-found]').forEach((el) => el.classList.add('is-found'))
    requestAnimationFrame(() => requestAnimationFrame(() => {
      beam()
      const glowImgs = [...document.querySelectorAll('.pqr-glow')].map((im) => (im.complete ? Promise.resolve() : new Promise((r) => { im.onload = im.onerror = r })))
      Promise.all(glowImgs).then(() => { window.__howtoReady = true })
    }))
  })
})()
