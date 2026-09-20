/* Phone: Scan the machine code (parts/mpage-scan.html, mpages/scan.css).
   mobile.js runs the scan itself ([data-scan-go], [data-scan-text], .is-scanning and .is-found) and the How-to sheet
   ([data-howto], [data-sheet-ok], window.punchSheet). This file draws what belongs to the page's designs:
   - Your last punch (the section keyed "recent"): each machine played and the last punch landed there, in the design
     Customise has chosen (psec.js, data-sv-names), with real venue photographs
   - the How-to sheet's five designs (the marker [data-sec="howto"]): the chosen one shows inside #mSheet, and choosing
     one in Customise while Scan is open opens the sheet on it; the Walkthrough pages step by step
   - the torch (Viewfinder and Tools), and the ids other scripts reach for, kept on the designs on show
   - motion: the sections rise in when Scan opens ("mpage"), a design rises in when Customise swaps it ("psec"). */
(() => {
  'use strict'
  const page = document.querySelector('.m-page[data-page="scan"]')
  const sheet = document.getElementById('mSheet')
  if (!page || !sheet) return
  const root = page.querySelector('.ps')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const PF = window.PunchFormat || { scoreHTML: (n) => Math.floor(n).toLocaleString('en-US'), score: (n) => Math.floor(n).toLocaleString('en-US'), withDecimals: (n) => n }
  const L = (name) => `<span data-lucide="${name}"></span>`
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const sel = (key) => (window.PSec ? window.PSec.get('phone', 'scan', key) : 0)
  const secEl = (key) => page.querySelector(`[data-sec="${key}"]`)
  const toast = (t) => window.punchApp && window.punchApp.toast(t)
  const isOn = () => window.punchApp && window.punchApp.page === 'scan'

  /* ------------------------------------------------------------ Your last punch: the machines Sara has played, each with
     the last punch she landed there (round nine: "Where you played" becomes the last punch at each machine). Newest
     first; the score is the content, so it leads every design, in the look's numeral face through PunchFormat. */
  // each venue has a photograph of its own here; the home page's Near you list shows the same venues in others
  const LIB = (f) => `assets/photos/lib/${f}`
  const PLAYED = [
    { id: 'dxb', name: 'Dubai Mall', spot: 'Ground Level, Grand Atrium', when: 'Tonight', photo: LIB('dubai-night-20.jpg'), pos: '50% 40%', live: true },
    { id: 'walk', name: 'City Walk', spot: 'Hub Zero, Building 8', when: 'Last Friday', last: 688102, photo: LIB('dubai-night-5.jpg'), pos: '50% 55%' },
    { id: 'moe', name: 'Mall of the Emirates', spot: 'Magic Planet, Level 1', when: 'Two weeks ago', last: 655930, photo: LIB('arcade-neon-2.jpg'), pos: '50% 50%' },
    { id: 'marina', name: 'Marina Mall', spot: 'Level 1, by the cinema', when: 'In August', last: 512340, photo: LIB('dubai-night-6.jpg'), pos: '50% 55%' },
  ]
  // tonight's punch at Dubai Mall is the phone's own live score; the others keep stable decimals
  const lastOf = (v) => (v.live ? (window.punchApp ? window.punchApp.score : 999999) : PF.withDecimals(v.last, `last:${v.id}`))
  const gradeOf = (s) => (s >= 900000 ? 'Perfect punch' : s >= 600000 ? 'Heavy hitter' : s >= 300000 ? 'Solid strike' : 'Warm up')
  const num = (v, cls = '') => `<span class="psr-num ${cls}">${PF.scoreHTML(lastOf(v))}</span>`
  const img = (v) => `<img class="psr-img" src="${v.photo}" alt="" loading="lazy" style="object-position:${v.pos}">`
  const label = (v) => `${v.name}, ${v.spot}. Last punch ${v.when.toLowerCase()}: ${PF.score(lastOf(v))}, ${gradeOf(lastOf(v))}`
  const btn = (v, cls, inner) => `<button class="psr-btn ${cls}" type="button" data-played="${v.id}" aria-label="${esc(label(v))}">${inner}</button>`
  const head = (title, sub) => `<div class="ps-head"><h3 class="ps-h">${title}</h3>${sub ? `<span class="ps-h-sub">${sub}</span>` : ''}</div>`
  const TITLE = 'Your last punch'

  const RECENT = [
    // Score rail: a card per machine, the last punch set on its photograph
    () => head(TITLE) + `<div class="psr-rail">${PLAYED.map((v, i) => btn(v, 'psr-rc', `
      <span class="psr-rc-media">${img(v)}${i === 0 ? `<span class="psr-tag">${L('history')}${v.when}</span>` : ''}
        <span class="psr-rc-score"><small>${gradeOf(lastOf(v))}</small>${num(v)}</span></span>
      <span class="psr-name">${v.name}</span>
      <span class="psr-meta">${i === 0 ? `<span>${L('map-pin')}Ground Level</span>` : `<span>${L('clock')}${v.when}</span>`}</span>`)).join('')}</div>`,
    // List: the machine on the left, its last punch set right
    () => head(TITLE, 'Newest first') + `<div class="psr-list">${PLAYED.map((v) => btn(v, 'psr-row', `
      <span class="psr-thumb">${img(v)}</span>
      <span class="psr-row-txt"><span class="psr-name">${v.name}</span><span class="psr-meta"><span>${v.when}</span></span></span>
      <span class="psr-row-score">${num(v)}<small>${gradeOf(lastOf(v))}</small></span>`)).join('')}</div>`,
    // Latest: tonight's machine large, the ones before it in a short list under it
    () => { const [v, ...rest] = PLAYED; return head(TITLE, 'Newest first') + btn(v, 'psr-hero', `
      ${img(v)}<span class="psr-tag">${L('history')}${v.when}</span>
      <span class="psr-hero-txt">
        <span class="psr-hero-cap">Last punch here</span>${num(v, 'psr-hero-num')}
        <span class="psr-name">${v.name}</span><span class="psr-meta"><span>${L('map-pin')}${v.spot}</span></span>
      </span>`) + `<p class="psr-before">Before that</p><div class="psr-mini">${rest.map((w) => btn(w, 'psr-mrow', `
      <span class="psr-mthumb">${img(w)}</span>
      <span class="psr-row-txt"><span class="psr-name">${w.name}</span><span class="psr-meta"><span>${w.when}</span></span></span>
      ${num(w)}`)).join('')}</div>` },
    // Grid: two by two, each tile its machine and its last punch
    () => head(TITLE) + `<div class="psr-grid">${PLAYED.map((v, i) => btn(v, 'psr-tile', `
      ${img(v)}<span class="psr-tile-when${i === 0 ? ' is-now' : ''}">${v.when}</span>
      <span class="psr-tile-txt"><span class="psr-name">${v.name}</span>${num(v)}</span>`)).join('')}</div>`,
    // Timeline: when, then where and the punch, down one line from tonight
    () => head(TITLE, 'Newest first') + `<ol class="psr-line">${PLAYED.map((v) => `<li>${btn(v, 'psr-tl', `
      <span class="psr-tl-when">${v.when}</span>
      <span class="psr-tl-row"><span class="psr-mthumb">${img(v)}</span>
        <span class="psr-row-txt"><span class="psr-name">${v.name}</span><span class="psr-meta"><span>${gradeOf(lastOf(v))}</span></span></span>
        ${num(v)}</span>`)}</li>`).join('')}</ol>`,
  ]
  function renderRecent() {
    const el = secEl('recent')
    if (!el) return
    el.innerHTML = (RECENT[sel('recent')] || RECENT[0])()
    if (window.paintLucide) window.paintLucide(el)
    rails(el)
  }
  // every rail on this page slides the way Home's carousel does: a mouse drags it, the arrow keys turn it
  function rails(root) {
    if (!window.punchSlider || !root) return
    root.querySelectorAll('.psr-rail, .hs-rail').forEach((r) => {
      if (r.scrollWidth > r.clientWidth + 8) window.punchSlider(r, { page })
    })
  }
  page.addEventListener('click', (e) => {
    const b = e.target.closest('[data-played]')
    if (!b) return
    const v = PLAYED.find((p) => p.id === b.dataset.played)
    if (v) toast(v.live ? `${v.name}: scan its code to punch again` : `${v.name}, ${v.spot}`)
  })

  /* ------------------------------------------------------------ the torch */
  page.addEventListener('click', (e) => {
    const t = e.target.closest('[data-torch]')
    if (!t) return
    const on = root.dataset.torch !== 'on'
    root.dataset.torch = on ? 'on' : 'off'
    page.querySelectorAll('[data-torch]').forEach((b) => {
      b.setAttribute('aria-pressed', String(on))
      const ico = b.querySelector('[data-lucide]')
      if (ico) ico.dataset.lucide = on ? 'flashlight-off' : 'flashlight'
    })
    if (window.paintLucide) window.paintLucide(page)
    toast(on ? 'Torch on' : 'Torch off')
  })
  function torchOff() {
    if (root.dataset.torch !== 'on') return
    root.dataset.torch = 'off'
    page.querySelectorAll('[data-torch]').forEach((b) => {
      b.setAttribute('aria-pressed', 'false')
      const ico = b.querySelector('[data-lucide]')
      if (ico) ico.dataset.lucide = 'flashlight'
    })
    if (window.paintLucide) window.paintLucide(page)
  }

  /* ------------------------------------------------------------ the ids other scripts reach for
     anim.js and app.js click #mScanBtn, the how-to renderer measures it: they always find the code on show */
  function keepIds() {
    const move = (id, el) => {
      const had = document.getElementById(id)
      if (had === el) return
      if (had) had.removeAttribute('id')
      if (el) el.id = id
    }
    const code = window.PSec ? window.PSec.active('phone', 'scan', 'code') : null
    const hint = window.PSec ? window.PSec.active('phone', 'scan', 'hint') : null
    move('mScanBtn', code && code.querySelector('[data-scan-go]'))
    move('mHowTo', hint && hint.querySelector('[data-howto]'))
    move('mScanText', hint && hint.querySelector('[data-scan-text]'))
  }

  /* ------------------------------------------------------------ the How-to sheet */
  const designs = [...sheet.querySelectorAll('.hs')]
  function showSheetDesign() {
    const i = Math.min(sel('howto'), designs.length - 1)
    designs.forEach((d, n) => { d.hidden = n !== i })
    const title = designs[i] && designs[i].querySelector('.hs-title, .m-sheet-title')
    if (title) sheet.setAttribute('aria-labelledby', title.id || 'mSheetTitle')
    sheet.dataset.hs = designs[i] ? designs[i].dataset.hs : ''
    walkTo(0)
    const rail = sheet.querySelector('.hs-rail')
    if (rail) { rail.scrollLeft = 0; rails(sheet) }
  }
  // the Walkthrough: Back and Next page the three moves; Next on the last one closes the sheet
  const walk = sheet.querySelector('.hs-walk')
  let step = 0
  function walkTo(n) {
    if (!walk) return
    const slides = [...walk.querySelectorAll('.hs-slide')]
    step = Math.max(0, Math.min(slides.length - 1, n))
    slides.forEach((s, k) => { s.hidden = k !== step; s.classList.toggle('is-on', k === step) })
    walk.querySelectorAll('.hs-dots i').forEach((d, k) => d.classList.toggle('is-on', k === step))
    const back = walk.querySelector('[data-hs-back]'), next = walk.querySelector('[data-hs-next]')
    back.disabled = step === 0
    const last = step === slides.length - 1
    next.textContent = last ? 'Got it' : 'Next'
    next.toggleAttribute('data-sheet-ok', last)
    // the heading of the page on show names the dialog
    slides.forEach((s) => { const h = s.querySelector('.hs-title'); if (h) h.removeAttribute('id') })
    const h = slides[step].querySelector('.hs-title')
    if (h) h.id = 'mSheetTitle2'
  }
  if (walk) {
    walk.addEventListener('click', (e) => {
      const next = e.target.closest('[data-hs-next]'), back = e.target.closest('[data-hs-back]')
      // the last Next carries data-sheet-ok, so mobile.js closes the sheet on it
      // (paging stops here: the Next that has just become the last one must not close the sheet on the same click)
      if (next && !next.hasAttribute('data-sheet-ok')) { e.stopPropagation(); walkTo(step + 1); next.focus({ preventScroll: true }) }
      else if (back && !back.disabled) {
        e.stopPropagation()
        walkTo(step - 1)
        ;(step === 0 ? walk.querySelector('[data-hs-next]') : back).focus({ preventScroll: true })
      }
    })
  }
  // every opening starts the Walkthrough from its first move and the cards from the first card
  sheet.addEventListener('sheet', (e) => { if (e.detail && e.detail.open) { walkTo(0); const r = sheet.querySelector('.hs-rail'); if (r) r.scrollLeft = 0 } })

  /* ------------------------------------------------------------ motion */
  let enterTimer = 0
  function enter() {
    clearTimeout(enterTimer)
    root.classList.remove('is-entering')
    if (reduced.matches) return
    void root.offsetWidth
    root.classList.add('is-entering')
    enterTimer = setTimeout(() => root.classList.remove('is-entering'), 900)
  }
  function swapped(el) {
    if (!el || reduced.matches) return
    el.classList.remove('is-swapped')
    void el.offsetWidth
    el.classList.add('is-swapped')
    setTimeout(() => el.classList.remove('is-swapped'), 600)
  }

  document.addEventListener('mpage', (e) => {
    const d = e.detail || {}
    if (d.page === 'scan') { renderRecent(); keepIds(); enter() }
    else if (d.from === 'scan') torchOff()
  })
  document.addEventListener('psec', (e) => {
    const d = e.detail || {}
    if (d.surface !== 'phone' || d.page !== 'scan') return
    if (d.sec === 'recent') { renderRecent(); if (!d.initial) swapped(secEl('recent')) }
    else if (d.sec === 'howto') {
      showSheetDesign()
      // a new sheet design is only seen with the sheet open: open it when the choice is made on Scan
      if (!d.initial && isOn() && window.punchSheet && !window.punchSheet.isOpen) window.punchSheet.open()
    } else {
      keepIds()
      if (!d.initial) swapped(d.el)
    }
  })
  document.addEventListener('decimals', () => renderRecent())

  renderRecent()
  showSheetDesign()
  keepIds()
})()
