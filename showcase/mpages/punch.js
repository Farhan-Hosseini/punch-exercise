/* Phone: punch on the machine (parts/mpage-punch.html, mpages/punch.css).
   The flow itself (the held credit, the strike, time up, what the glass is told) lives in mobile.js, which writes the
   page's copy into every design and puts the state on #mPunch. This file runs the page's motion: the sections rise in
   when the page opens (the "mpage" event) and loop only while it is open (.is-live), a design rises in when Customise
   swaps it (the "psec" event), and everything stops the moment another page opens. Reduced motion shows it all still. */
(() => {
  'use strict'
  const root = document.getElementById('mPunch')
  if (!root) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  let t = 0

  function open() {
    clearTimeout(t)
    root.classList.add('is-live')
    if (reduced.matches) return
    root.classList.remove('is-entering')
    void root.offsetWidth
    root.classList.add('is-entering')
    t = setTimeout(() => root.classList.remove('is-entering'), 800)
  }
  function close() {
    clearTimeout(t)
    root.classList.remove('is-live', 'is-entering')
  }

  document.addEventListener('mpage', (e) => { if (e.detail.page === 'punch') open(); else close() })
  document.addEventListener('psec', (e) => {
    const d = e.detail
    if (d.surface !== 'phone' || d.page !== 'punch' || d.initial || !d.el || reduced.matches) return
    d.el.classList.remove('is-swap')
    void d.el.offsetWidth
    d.el.classList.add('is-swap')
    setTimeout(() => d.el.classList.remove('is-swap'), 600)
  })
  if (window.punchApp && window.punchApp.page === 'punch') open()
})()
