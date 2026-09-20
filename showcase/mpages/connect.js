/* Phone: Connecting to the machine (parts/mpage-connect.html, mpages/connect.css).
   mobile.js runs the link (setConnect, finishConnect) and draws the Linking designs by data-style; it puts the link's
   state on the page (data-state wait or done, data-held yes or no), which the Machine and Credit designs follow in CSS.
   This file draws the one design CSS cannot (Credit, Coin row: the wallet as coins, this turn's coin lit) and runs the
   page's motion: the Machine and Credit sections rise in when the page opens ("mpage"), a design rises in when
   Customise swaps it ("psec"). */
(() => {
  'use strict'
  const page = document.querySelector('.m-page[data-page="connect"]')
  const app = document.getElementById('mApp')
  if (!page || !app) return
  const root = page.querySelector('.pc')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const credits = () => (window.punchApp ? window.punchApp.credits : 0)

  /* ------------------------------------------------------------ Credit: Coin row */
  const MAX = 8
  function renderPips() {
    const row = page.querySelector('[data-pc-pips]'), note = page.querySelector('[data-pc-pips-note]')
    if (!row) return
    const done = page.dataset.state === 'done', held = page.dataset.held
    // before the hold the wallet is whole; once held, the held coin sits first among what the wallet had
    const had = done && held === 'yes' ? credits() + 1 : credits()
    const coin = '<span data-lucide="coins"></span>'
    let html = ''
    if (had <= 0) html = `<span class="pcc-pip is-empty" aria-hidden="true">${coin}</span>`
    else {
      for (let i = 0; i < Math.min(had, MAX); i++) html += `<span class="pcc-pip${i === 0 ? ' is-turn' : ''}" aria-hidden="true">${i === 0 ? '<span data-lucide="lock"></span>' : coin}</span>`
      if (had > MAX) html += `<span class="pcc-more">and ${had - MAX} more</span>`
    }
    row.innerHTML = html
    const left = Math.max(0, had - 1)
    const text = had <= 0 ? 'Your wallet is empty' : done && held === 'yes' ? `One held, ${left} left` : `One of ${had} for this turn`
    if (note) note.textContent = text
    row.setAttribute('aria-label', text)
    row.setAttribute('role', 'img')
    if (window.paintLucide) window.paintLucide(row)
  }
  app.addEventListener('credits', renderPips)
  new MutationObserver(renderPips).observe(page, { attributes: true, attributeFilter: ['data-state', 'data-held'] })

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
  document.addEventListener('mpage', (e) => { if (e.detail && e.detail.page === 'connect') { renderPips(); enter() } })
  document.addEventListener('psec', (e) => {
    const d = e.detail || {}
    if (d.surface !== 'phone' || d.page !== 'connect' || d.initial) return
    if (d.sec === 'credit') renderPips()
    swapped(d.sec === 'connect' ? d.section : d.el)
  })

  renderPips()
})()
