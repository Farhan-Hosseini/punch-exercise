/* Phone: the leaderboard (parts/mpage-ranks.html, mpages/ranks.css).
   mobile.js draws the Board and Your place and owns the scope and the search; this file runs the page around them:
   - the ids mSearch and mSearchClear follow the Header design on show, so "search punchers" from the feed lands in it
   - the list scrolls inside .lb-scroll, back to the top whenever the page opens
   - Your place is pinned above the tab bar: its height (--lb-you-h on the app) keeps the list's fade and the toast clear
   - Find me scrolls the board to your row and marks it
   - the sections rise in when the page opens ("mpage") and a design rises in when Customise swaps it ("psec"). */
(() => {
  'use strict'
  const page = document.querySelector('.m-page[data-page="ranks"]')
  const app = document.getElementById('mApp')
  if (!page || !app) return
  const scroller = page.querySelector('.lb-scroll')
  const you = page.querySelector('.lb-you')
  const board = document.getElementById('mBoard')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const active = (key) => (window.PSec ? window.PSec.active('phone', 'ranks', key) : null)

  /* ------------------------------------------------------------ the search on show owns the ids */
  function claimIds() {
    const head = active('header')
    if (!head) return
    page.querySelectorAll('#mSearch, #mSearchClear').forEach((el) => el.removeAttribute('id'))
    const field = head.querySelector('[data-lb-search]'), clear = head.querySelector('[data-lb-clear]')
    if (field) field.id = 'mSearch'
    if (clear) clear.id = 'mSearchClear'
  }

  /* ------------------------------------------------------------ Your place, pinned */
  function measure() {
    if (!you) return
    const h = you.firstElementChild ? you.firstElementChild.offsetHeight : 0
    app.style.setProperty('--lb-you-h', `${h}px`)
  }
  page.addEventListener('lbyou', () => requestAnimationFrame(measure))
  if (window.ResizeObserver && you) new ResizeObserver(() => measure()).observe(you)

  // Find me: your row on the board, scrolled into the clear space and marked for a moment
  let markTimer = 0
  function findMe() {
    let row = board.querySelector('.m-is-me')
    if (!row) {
      // a search that hides you is cleared first
      const clear = page.querySelector('#mSearchClear')
      if (clear && !clear.hidden) clear.click()
      row = board.querySelector('.m-is-me')
    }
    if (!row) return
    const sr = scroller.getBoundingClientRect(), rr = row.getBoundingClientRect()
    const scale = sr.height / (scroller.clientHeight || 1) || 1
    const top = scroller.scrollTop + (rr.top - sr.top) / scale - scroller.clientHeight * 0.3
    scroller.scrollTo({ top: Math.max(0, top), behavior: reduced.matches ? 'auto' : 'smooth' })
    row.classList.remove('lb-is-found')
    void row.offsetWidth
    row.classList.add('lb-is-found')
    clearTimeout(markTimer)
    markTimer = setTimeout(() => row.classList.remove('lb-is-found'), 2400)
    row.focus({ preventScroll: true })
  }
  page.addEventListener('click', (e) => { if (e.target.closest('[data-lb-find]')) findMe() })

  /* ------------------------------------------------------------ motion */
  const replay = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls) }
  let enterTimer = 0
  function start(opts) {
    claimIds()
    if (!opts.keepScroll) scroller.scrollTop = 0
    page.classList.add('is-live')
    requestAnimationFrame(measure)
    if (reduced.matches) return
    replay(page, 'is-entering')
    clearTimeout(enterTimer)
    enterTimer = setTimeout(() => page.classList.remove('is-entering'), 1200)
  }
  function stop() {
    clearTimeout(enterTimer)
    page.classList.remove('is-live', 'is-entering')
  }
  document.addEventListener('mpage', (e) => {
    const d = e.detail || {}
    if (d.page === 'ranks') start(d.opts || {})
    else if (d.from === 'ranks') stop()
  })
  document.addEventListener('psec', (e) => {
    const d = e.detail || {}
    if (d.surface !== 'phone' || d.page !== 'ranks') return
    if (d.sec === 'header') claimIds()
    if (d.sec === 'you') requestAnimationFrame(measure)
    if (d.initial || !page.classList.contains('is-live') || reduced.matches) return
    const shown = d.sec === 'you' ? you.firstElementChild : d.sec === 'header' ? d.el : null
    if (shown) { replay(shown, 'is-swap'); setTimeout(() => shown.classList.remove('is-swap'), 700) }
  })

  claimIds()
  if (window.punchApp && window.punchApp.page === 'ranks') start({ keepScroll: true })
})()
