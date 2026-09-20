/* Phone: Payment failed (parts/mpage-failed.html, mpages/failed.css). Round nine.
   A payment that did not go through: what happened (nothing charged, no credit held), why in plain words (the bank
   declined it, it was cancelled before it finished, or the connection dropped) and what to do (Try again, Pay another
   way, Back to the packs). pay.js owns the purchase and hands this page window.punchPay: failure() says what failed, with
   which pack and way to pay; retry(), payWith(key) and topup() run the buttons, so Try again is the same checkout with
   the same pack. This file fills every design's words on the "mpage" event, redraws What to do (a script-drawn section)
   on "psec", and runs the Why tabs. */
(() => {
  'use strict'

  const A = window.punchApp
  const page = document.querySelector('.m-page[data-page="failed"]')
  if (!A || !page) return
  const pay = () => window.punchPay
  const waysEl = page.querySelector('#mfxWays')
  const pick = (sec) => (window.PSec ? window.PSec.get('phone', 'failed', sec) : 0)
  const L = (name) => `<span data-lucide="${name}"></span>`
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

  /* ------------------------------------------------------------ the three reasons, in plain words */
  const ORDER = ['declined', 'cancelled', 'offline']
  const ICON = { declined: 'credit-card', cancelled: 'circle-x', offline: 'wifi-off' }
  function reasons(f) {
    // what was closed, for the way the player tried to pay
    const check = f.method === 'paypal' ? 'The PayPal window was closed before you approved it'
      : f.method === 'wallet' ? (f.device === 'android' ? 'The fingerprint check was closed before the payment finished' : 'The Face ID check was closed before the payment finished')
        : 'The check on your card was closed before the payment finished'
    return {
      declined: {
        head: 'Your bank declined it', short: 'Declined by your bank', brief: 'The bank said no to this payment',
        text: 'Banks say no for a daily limit, a card that is new, blocked or out of date, or a security check. Your bank can tell you which, or you can pay another way.',
        clause: 'when the bank says no',
      },
      cancelled: {
        head: 'It was cancelled', short: 'Cancelled before it finished', brief: 'Closed before it finished',
        text: `${check}, so nothing was sent to your bank. Try again when you are ready.`,
        clause: 'when it is cancelled before it finishes',
      },
      offline: {
        head: 'The connection dropped', short: 'No connection', brief: 'The phone lost its signal part way',
        text: 'Your phone lost its signal part way, so the payment never reached your bank. Find a stronger signal or the mall Wi-Fi and try again.',
        clause: 'when the phone loses its signal part way',
      },
    }
  }

  // a lucide icon is painted when its element is added, so a changed icon is a new element
  function setIcon(el, name) {
    if (el.dataset.lucide === name && el.firstElementChild) return
    const n = document.createElement('span')
    n.dataset.lucide = name
    for (const a of ['data-why-f', 'class']) if (el.hasAttribute(a)) n.setAttribute(a, el.getAttribute(a))
    el.replaceWith(n)
  }
  function fillWhy(root, key, R) {
    const r = R[key]
    root.querySelectorAll('[data-why-f]').forEach((el) => {
      const k = el.dataset.whyF
      if (k === 'icon') setIcon(el, ICON[key])
      else if (k in r) el.textContent = k === 'head' && root.closest('.mfw-plain') ? `${r.head}.` : r[k]
    })
  }

  /* ------------------------------------------------------------ fill the page from the failure */
  let F = null, R = null, tabNow = 'declined'
  function render() {
    if (!pay()) return
    F = pay().failure()
    R = reasons(F)
    const now = F.reason in R ? F.reason : 'declined'
    const rest = ORDER.filter((k) => k !== now)
    page.dataset.reason = now
    const p = F.pack
    const lead = F.linked
      ? `Your ${p.price} payment did not go through, so your punch at ${F.place} has not started.`
      : `Your ${p.price} payment for the ${p.custom ? `custom pack of ${p.creditsText}` : p.name} did not go through.`
    const V = {
      lead, leadHeld: F.linked ? `${lead.replace(/\.$/, '')}, and no credit is held for it.` : `${lead.replace(/\.$/, '')}, and no credit is held.`,
      short: R[now].short, price: p.price, pack: p.custom ? 'Custom pack' : p.name, creditsText: p.creditsText, paidWith: F.paidWith,
      balance: String(F.balance), balanceUnit: F.balance === 1 ? 'credit' : 'credits',
    }
    page.querySelectorAll('[data-fail-f]').forEach((el) => { const k = el.dataset.failF; if (k in V) el.textContent = V[k] })
    page.querySelector('#failRetry').setAttribute('aria-label', `Try again, ${p.price} with ${F.paidWith}`)

    // Why: every row, tab and question in its own reason's words; this time's first, open and marked
    page.querySelectorAll('.mfw-list, .mfw-faq').forEach((list) => {
      const items = [...list.children].filter((c) => c.dataset.why)
      items.sort((a, b) => (a.dataset.why === now ? -1 : b.dataset.why === now ? 1 : ORDER.indexOf(a.dataset.why) - ORDER.indexOf(b.dataset.why)))
      items.forEach((it) => {
        list.appendChild(it)
        it.classList.toggle('is-now', it.dataset.why === now)
        fillWhy(it, it.dataset.why, R)
        if (it.tagName === 'DETAILS') it.open = it.dataset.why === now
      })
    })
    const likely = page.querySelector('.mfw-likely')
    fillWhy(likely.querySelector('[data-why-slot="now"]'), now, R)
    rest.forEach((k, i) => fillWhy(likely.querySelector(`[data-why-slot="rest${i}"]`), k, R))
    const plain = page.querySelector('.mfw-plain')
    fillWhy(plain.querySelector('.mfw-plain-now'), now, R)
    plain.querySelector('[data-why-f="rest"]').textContent = `A payment can also fail ${R[rest[0]].clause}, or ${R[rest[1]].clause}.`
    setTab(now, false)
    drawWays()
  }

  /* ------------------------------------------------------------ Why, Tabs: arrow keys move between the three */
  const tabs = [...page.querySelectorAll('.mfw-tablist [role="tab"]')]
  const panel = page.querySelector('#mfwPanel')
  function setTab(key, focus) {
    tabNow = key
    const now = page.dataset.reason
    tabs.forEach((t) => {
      const on = t.dataset.why === key
      t.setAttribute('aria-selected', String(on))
      t.tabIndex = on ? 0 : -1
      t.classList.toggle('is-now', t.dataset.why === now)
      if (on && focus) t.focus()
    })
    panel.setAttribute('aria-labelledby', `mfwTab-${key}`)
    panel.classList.toggle('is-now', key === now)
    if (R) {
      fillWhy(panel, key, R)
      panel.querySelector('[data-why-f="tag"]').textContent = key === now ? 'What happened this time' : 'It can also happen'
    }
  }
  tabs.forEach((t) => t.addEventListener('click', () => setTab(t.dataset.why, false)))
  page.querySelector('.mfw-tablist').addEventListener('keydown', (e) => {
    const step = { ArrowRight: 1, ArrowLeft: -1, Home: -9, End: 9 }[e.key]
    if (!step) return
    e.preventDefault()
    const i = ORDER.indexOf(tabNow)
    const n = Math.abs(step) === 9 ? (step < 0 ? 0 : ORDER.length - 1) : (i + step + ORDER.length) % ORDER.length
    setTab(ORDER[n], true)
  })

  /* ------------------------------------------------------------ What to do: five designs, drawn here
     Each offers the ways to pay that did not fail (straight into the checkout with that way picked) and Back to the packs;
     Try again stays the footer's one red button. */
  // "Use another card" is already a verb: its label is "Pay with another card instead", never "Pay with Use another card"
  const payLabel = (m) => `Pay with ${m.name.replace(/^Use /, '')} instead`
  const rowBtn = (m) => `<button class="mfa-row" type="button" data-fail-pay="${m.key}" aria-label="${payLabel(m)}">${m.mark}<span class="pay-copy"><span class="pay-name">${m.name}</span><span class="pay-sub">${m.sub}</span></span><span class="mfa-chev">${L('chevron-right')}</span></button>`
  const backBtn = (cls = 'mfa-back') => `<button class="${cls}" type="button" data-fail-go="topup">${L('arrow-left')}<span>Back to the packs</span></button>`
  const WAYS = [
    // Ways: the other ways to pay in one card, a row each, and Back to the packs under it
    (f) => `<div class="mfa-rows">${f.others.map(rowBtn).join('')}</div>${backBtn()}`,
    // Chips: the other ways two by two, the fourth chip changes the pack
    (f) => `<div class="mfa-chips">${f.others.map((m) => `<button class="mfa-chip" type="button" data-fail-pay="${m.key}" aria-label="${payLabel(m)}">${m.markSm}<span>${m.short}</span></button>`).join('')}
        <button class="mfa-chip mfa-chip-back" type="button" data-fail-go="topup"><span class="mfa-chip-ico">${L('arrow-left')}</span><span>Change pack</span></button></div>`,
    // Buttons: the pack is kept, said once, then the two other ways out side by side
    (f) => `<p class="mfa-kept">${L('circle-check')}<span>Your pack is kept: <b>${f.pack.custom ? `custom, ${f.pack.creditsText}` : f.pack.name}</b>, ${f.pack.price}</span></p>
        <div class="mfa-pair"><button class="m-btn m-btn-glass" type="button" data-fail-pay="">${L('credit-card')}<span>Pay another way</span></button>${backBtn('m-btn m-btn-glass')}</div>`,
    // Wallet first: the phone's own wallet large (or the saved card, when the wallet is what failed), the rest quiet
    (f) => {
      const hero = f.method === 'wallet' ? f.others.find((m) => m.key === 'visa') : f.wallet
      const rest = f.others.filter((m) => m.key !== hero.key).map((m) => m.short).join(' or ')
      return `<button class="mfa-hero" type="button" data-fail-pay="${hero.key}">${hero.mark}<span class="pay-copy"><span class="pay-name">Pay with ${hero.name} instead</span><span class="pay-sub">${hero.sub}</span></span><span class="mfa-chev">${L('arrow-right')}</span></button>
        <div class="mfa-links"><button class="mfa-link" type="button" data-fail-pay="">${L('credit-card')}<span>${rest}</span></button>${backBtn('mfa-link')}</div>`
    },
    // Pack kept: the pack on its photograph, not charged, with Change pack; Pay another way under it
    (f) => `<div class="mfa-pack">
        <span class="mfa-pack-pic"><img src="assets/photos/lib/${f.pack.photo}" alt="" style="object-position: ${f.pack.pos}" loading="lazy" decoding="async"></span>
        <span class="mfa-pack-copy"><span class="m-cap">Kept for you</span><b>${f.pack.custom ? 'Custom pack' : f.pack.name}</b><span>${f.pack.creditsText}, ${f.pack.price}, not charged</span></span>
        <button class="pay-link mfa-pack-change" type="button" data-fail-go="topup" aria-label="Change the pack, back to the packs">Change</button>
      </div>
      <button class="m-btn m-btn-glass mfa-wide" type="button" data-fail-pay="">${L('credit-card')}<span>Pay another way</span></button>`,
  ]
  function drawWays() {
    if (!F) return
    const i = Math.min(WAYS.length - 1, pick('ways'))
    waysEl.dataset.look = ['ways', 'chips', 'buttons', 'wallet', 'pack'][i]
    waysEl.innerHTML = WAYS[i](F)
    A.paint(waysEl)
  }

  /* ------------------------------------------------------------ the buttons */
  page.addEventListener('click', (e) => {
    const go = e.target.closest('[data-fail-go]'), way = e.target.closest('[data-fail-pay]')
    if (!pay()) return
    if (go) { if (go.dataset.failGo === 'retry') pay().retry(); else pay().topup() }
    else if (way) pay().payWith(way.dataset.failPay || null)
  })

  // a design swapped in Customise rises into place, as every other page's do
  function swapIn(el) {
    if (!el || reduced.matches) return
    el.classList.remove('is-swap'); void el.offsetWidth; el.classList.add('is-swap')
    setTimeout(() => el.classList.remove('is-swap'), 600)
  }
  document.addEventListener('mpage', (e) => {
    const d = e.detail
    if (!d || d.page !== 'failed') return
    // a fresh failure starts at the top, like every pay page; coming back keeps the place
    if (!(d.opts && d.opts.back)) page.querySelector('.pay-body').scrollTop = 0
    render()
  })
  document.addEventListener('psec', (e) => {
    const d = e.detail
    if (d.surface !== 'phone' || d.page !== 'failed') return
    if (d.sec === 'ways') drawWays()
    if (!d.initial) swapIn(d.sec === 'ways' ? waysEl : d.el)
  })
  // the device frame can change under the page: Apple Pay and Google Pay swap places
  new MutationObserver(() => { if (A.page === 'failed') render() })
    .observe(document.getElementById('device') || page, { attributes: true, attributeFilter: ['data-device'] })
  document.getElementById('mApp')?.addEventListener('credits', () => { if (A.page === 'failed') render() })
  // a reload on this page: mobile.js opened it before this file ran
  if (A.page === 'failed') render()
})()
