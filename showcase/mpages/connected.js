/* Phone: Connected (parts/mpage-connected.html, mpages/connected.css). Round nine.
   mobile.js runs the page: it sets data-held (yes, or no on a practice go) and data-auto (run while Punch is about to
   open by itself, held when it waits for a tap), starts and stops the wait, and goes on to Punch on a tap. This file
   draws what follows from those two states and runs the page's motion:
   - the copy: every .cx-when-held / .cx-when-free and .cx-when-run / .cx-when-hold shows or hides by the hidden attribute
     (so each design keeps its own layout), and the status line for screen readers says the same
   - the page's name: #mConnectedTitle sits on the title of the Linked design on show (aria-labelledby follows it)
   - motion: the sections rise in when the page opens ("mpage"), a design rises in when Customise swaps it ("psec") */
(() => {
  'use strict'
  const page = document.querySelector('.m-page[data-page="connected"]')
  if (!page) return
  const root = page.querySelector('.mcx')
  const live = document.getElementById('mConnectedLive')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

  /* ------------------------------------------------------------ the two states */
  function sync() {
    const held = page.dataset.held !== 'no', run = page.dataset.auto === 'run'
    page.querySelectorAll('.cx-when-held').forEach((el) => { el.hidden = !held })
    page.querySelectorAll('.cx-when-free').forEach((el) => { el.hidden = held })
    page.querySelectorAll('.cx-when-run').forEach((el) => { el.hidden = !run })
    page.querySelectorAll('.cx-when-hold').forEach((el) => { el.hidden = run })
  }
  new MutationObserver(sync).observe(page, { attributes: true, attributeFilter: ['data-held', 'data-auto'] })

  function say() {
    if (!live) return
    const held = page.dataset.held !== 'no'
    live.textContent = `Connected to Machine 07 at Dubai Mall, Grand Atrium. ${held ? 'One credit held for this turn.' : 'A practice go, nothing is taken.'} Step up to the pad: the glass starts the count.`
  }

  /* ------------------------------------------------------------ the page's name follows the Linked design on show */
  function keepTitle() {
    const on = window.PSec ? window.PSec.active('phone', 'connected', 'linked') : null
    const title = on && on.querySelector('.cxl-title')
    const had = document.getElementById('mConnectedTitle')
    if (had === title || !title) return
    if (had) had.removeAttribute('id')
    title.id = 'mConnectedTitle'
  }

  /* ------------------------------------------------------------ motion */
  let enterTimer = 0
  function enter() {
    clearTimeout(enterTimer)
    root.classList.remove('is-entering')
    if (reduced.matches) return
    void root.offsetWidth
    root.classList.add('is-entering')
    enterTimer = setTimeout(() => root.classList.remove('is-entering'), 1400)
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
    if (d.page !== 'connected') { if (d.from === 'connected') { clearTimeout(enterTimer); root.classList.remove('is-entering') } return }
    sync(); keepTitle(); enter()
    // the status line is read once the page has settled, after the page change itself is announced
    if (live) { live.textContent = ''; setTimeout(say, 120) }
  })
  document.addEventListener('psec', (e) => {
    const d = e.detail || {}
    if (d.surface !== 'phone' || d.page !== 'connected') return
    if (d.sec === 'linked') keepTitle()
    if (!d.initial) swapped(d.el)
  })

  sync()
  keepTitle()
})()
