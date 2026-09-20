/* The credit flow in the phone: out of credits, pick a pack, pay, punch.
   Revenue is attempts, so every screen here points at the next punch: the three pack is preselected (a group run),
   paying from the machine drops the player straight back into the punch, and the hit page keeps the credits left
   and a Punch again button in view. Uses window.punchApp from mobile.js.

   The pages are built from sections (psec.js, parts/phone-pay.html). Two of them are drawn here in the design Customise
   has chosen, both as radio groups: Packs on Buy credits (List, Tiles, Photo cards, Dial, Per punch) and Pay with on the
   checkout (List, Wallet first, Tiles, Card, Tabs). The rest are markup, and this file fills every copy of their
   fields: [data-pay-f] on the checkout, [data-paid-f] on the paid screen, [data-claw] wherever the sponsor signs.
   The Group run carries the Monster Energy bundle (a cold can for each of its three punches, at the Ice Rink kiosk):
   every Offer design picks it, and the order and the confirmation show the cans while it is the pack.
   Round eight: every Packs design ends with a Custom pack (a stepper from 1 to 50 punches, each punch at the rate of
   the biggest pack the number reaches), which flows through checkout and paid exactly like a fixed pack; and the
   checkout's Secure checkout button opens a bottom sheet in five designs (the How-to sheet's pattern). */
(() => {
  'use strict'

  const A = window.punchApp
  const app = document.getElementById('mApp')
  if (!A || !app) return
  const $ = (id) => document.getElementById(id)
  const L = (name) => `<span data-lucide="${name}"></span>`
  const pageEl = (key) => app.querySelector(`.m-page[data-page="${key}"]`)
  const pick = (page, sec) => (window.PSec ? window.PSec.get('phone', page, sec) : 0)

  const PLACE = 'Dubai Mall, Ground Level'
  const PACKS = [
    { credits: 1, price: 10, name: 'One punch', text: 'Just the one go', photo: 'fist-closeup-1.jpg', pos: '62% 50%' },
    { credits: 3, price: 25, was: 30, name: 'Group run', text: 'Three goes for your crew', tag: 'Best for a group run', photo: 'friends-1.jpg', pos: '50% 30%', cans: 3 },
    { credits: 10, price: 70, was: 100, name: 'Regular', text: 'Ten goes, any day', photo: 'boxer-66.jpg', pos: '50% 38%' },
  ]
  const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
  const spell = (n) => WORDS[n] || String(n)
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  const credits = (n) => (n === 1 ? '1 credit' : `${n} credits`)
  const unit = (n) => (n === 1 ? 'punch' : 'punches')
  // whole dirhams print whole (AED 25); a custom pack can land on fils (AED 33.33), which always print two places
  const money = (n, cents) => (cents || !Number.isInteger(n) ? n.toFixed(2) : String(n))
  const aed = (n, cents) => `AED ${money(n, cents)}`
  const priceHTML = (n, cents) => `<small>AED</small>${money(n, cents)}`
  const perPunch = (p) => p.price / p.credits
  const saving = (p) => (p.was ? Math.round((1 - p.price / p.was) * 100) : 0)
  const vat = (p) => p.price - p.price / 1.05
  const device = () => (A.state.device === 'android' ? 'android' : 'iphone')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

  // the Custom pack: any number from 1 to 50. Each punch costs the rate of the biggest pack the number reaches (One
  // punch AED 10, Group run AED 8.33, Regular AED 7), so a custom three costs exactly the Group run and a custom ten
  // exactly the Regular. "was" is the same number at the single punch price, as the fixed packs show theirs, so the
  // saving reads the same way. Nine at the Group run rate (AED 75) would cost more than the Regular's ten (AED 70):
  // the stepper says so, and offers the ten.
  const CUSTOM_MIN = 1, CUSTOM_MAX = 50
  const tierOf = (n) => [...PACKS].reverse().find((p) => n >= p.credits) || PACKS[0]
  function customPack(n) {
    const t = tierOf(n), rate = t.price / t.credits, single = PACKS[0].price
    return {
      custom: true, credits: n, price: Math.round(n * rate * 100) / 100, was: rate < single ? n * single : 0, tier: t,
      name: 'Custom pack', text: `Any number, ${CUSTOM_MIN} to ${CUSTOM_MAX}`, photo: 'gym-regular-6.jpg', pos: '30% 35%',
    }
  }
  // a fixed pack that gives more punches for no more money than this custom number
  const betterThan = (p) => (p.custom ? PACKS.find((q) => q.credits > p.credits && q.price <= p.price) : null)

  // the sponsor's claw: three torn scratches, drawn for this project (the same mark as mscreens/_ads.css), never a logo file
  const CLAW = '<svg class="mon-claw" viewBox="0 0 60 80" aria-hidden="true" focusable="false"><path d="M22 2 18.3 8.5 13.3 14.7 10.6 21.5 9.9 28.7 6.9 35.4 5.4 42.5 5 49.8 3.9 56.9 3.2 64.2 5 72 9.2 65.6 9.1 58.2 13 51.7 13.6 44.4 14.8 37.3 17.6 30.6 19 23.5 19.1 16.1 21.6 9.3Z M40 0 35.3 7.3 29.7 14.5 26.7 22.2 26.2 30.5 22.8 38.1 21.5 46.3 20.9 54.5 19.6 62.7 20.6 71.3 22 80 25.4 72.4 26.3 64.2 29.8 56.5 32 48.6 33.1 40.5 34.9 32.5 36.9 24.5 37.1 16.2 40.1 8.4Z M57 5 52.9 11.3 49 17.7 45.9 24.2 44 31.1 41.9 37.9 40 44.7 39.7 52 37.8 58.8 38.7 66.4 40 74 43.8 67.6 43.8 60.3 46.9 53.7 49.6 47.1 49.7 39.8 52.7 33.2 53.7 26.2 54.7 19.1 56.9 12.3Z"/></svg>'
  const claws = (root) => root.querySelectorAll('[data-claw]').forEach((el) => { if (!el.firstElementChild) el.innerHTML = CLAW })

  // one purchase at a time: where it started, the pack, the method, and what it came to
  // pack is an index into PACKS, or 'custom' for the Custom pack of flow.custom punches
  const flow = { from: null, pack: 1, custom: 5, method: 'wallet', receipt: null }
  const packNow = () => (flow.pack === 'custom' ? customPack(flow.custom) : PACKS[flow.pack])
  const linked = (from = flow.from) => from === 'connect' || from === 'hit'
  const bundle = (p = packNow()) => !!p.cans
  const toTop = (page, o) => { if (!o.back) pageEl(page).querySelector('.pay-body').scrollTop = 0 }
  // a design swapped in Customise rises into place, as every other page's do
  function swapIn(el) {
    if (!el || reduced.matches) return
    el.classList.remove('is-swap'); void el.offsetWidth; el.classList.add('is-swap')
    setTimeout(() => el.classList.remove('is-swap'), 600)
  }
  function tokens(total, fresh, max = 10) {
    const shown = Math.min(total, max), f = Math.min(fresh, shown)
    return Array.from({ length: shown }, (_, i) => `<span class="pay-token${i >= shown - f ? ' is-new' : ''}" style="--i:${i - (shown - f)}">${L('hand-fist')}</span>`).join('') +
      (total > max ? `<span class="pay-token pay-token-more">+${total - max}</span>` : '')
  }

  /* ------------------------------------------------------------ radio groups (packs, methods) */
  function radioGroup(root, choose) {
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[role="radio"]')
      if (b && root.contains(b)) choose(b)
    })
    root.addEventListener('keydown', (e) => {
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]
      if (!step) return
      const all = [...root.querySelectorAll('[role="radio"]')]
      const i = all.indexOf(document.activeElement)
      if (i < 0) return
      e.preventDefault()
      const next = all[(i + step + all.length) % all.length]
      choose(next)
      next.focus()
    })
  }
  const check = (root, on) => root.querySelectorAll('[role="radio"]').forEach((b) => {
    b.setAttribute('aria-checked', String(b === on))
    b.tabIndex = b === on ? 0 : -1
  })

  /* ------------------------------------------------------------ buy credits: Packs, in five designs
     Each design ends with the Custom pack. A radio button can hold no other control, so the custom pack is a card
     (.pk-cu) holding its radio (data-pack="custom") and, beside it, the stepper: minus and plus (44 px) and the typed
     number. Any use of the stepper picks the custom pack; syncPack fills every [data-cu] field from customPack(). */
  const packsEl = $('payPacks')
  const packLabel = (p) => `${p.name}, ${p.credits} ${unit(p.credits)}, ${aed(p.price)}${p.was ? `, was ${aed(p.was)}` : ''}${p.tag ? `. ${p.tag}` : ''}`
  const radio = (cls, i, p, inner) => `<button class="${cls}${p.tag ? ' has-tag' : ''}" type="button" role="radio" aria-checked="false" data-pack="${i}" aria-label="${packLabel(p)}">${inner}</button>`
  const TICK = `<span class="pk-tick" aria-hidden="true">${L('check')}</span>`
  // the custom pack's parts; the numbers in them are filled by syncPack, so a redraw never shows a stale price
  const cuRadio = (cls, inner) => `<button class="${cls}" type="button" role="radio" aria-checked="false" data-pack="custom" aria-label="Custom pack">${inner}</button>`
  const cuStepper = () => `<div class="pk-step" role="group" aria-label="Punches in your custom pack">
      <button class="pk-step-btn" type="button" data-cu-step="-1" aria-label="One punch fewer">${L('minus')}</button>
      <input class="pk-step-n" type="number" inputmode="numeric" min="${CUSTOM_MIN}" max="${CUSTOM_MAX}" step="1" value="${flow.custom}" data-cu-input aria-label="Punches in your custom pack, ${CUSTOM_MIN} to ${CUSTOM_MAX}">
      <button class="pk-step-btn" type="button" data-cu-step="1" aria-label="One punch more">${L('plus')}</button>
    </div>`
  const cuNote = () => '<p class="pk-cu-note" data-cu="note" aria-live="polite"></p>'
  // round nine: the better deal gets a band of its own under the stepper, full width in every design, instead of a
  // link squeezed into the rate line beside it. It stays empty (and takes no room) until a fixed pack gives more punches
  // for no more money than the custom number: nine at the Group run rate is AED 75, the Regular's ten are AED 70
  const cuBetter = () => '<div class="pk-better" data-cu="better" aria-live="polite"></div>'
  const PACK_VIEWS = [
    // List: a row a pack, the count in a badge, the price on the right; the custom row carries its stepper under it
    () => PACKS.map((p, i) => radio('pay-pack', i, p, `
        <span class="pay-pack-n"><b>${p.credits}</b><i>${unit(p.credits)}</i></span>
        <span class="pay-copy"><span class="pay-name">${p.name}</span><span class="pay-sub">${p.text}</span></span>
        <span class="pay-pack-price"><span class="pay-price">${priceHTML(p.price)}</span>${p.was ? `<s>${aed(p.was)}</s>` : ''}</span>
        ${p.tag ? `<span class="pay-pack-tag" aria-hidden="true">${L('users')}${p.tag}</span>` : ''}`)).join('') +
      `<div class="pk-cu pk-cu-list">${cuRadio('pay-pack pk-cu-radio', `
        <span class="pay-pack-n"><b data-cu="n"></b><i data-cu="u"></i></span>
        <span class="pay-copy"><span class="pay-name">Custom pack</span><span class="pay-sub">Pick your own number</span></span>
        <span class="pay-pack-price"><span class="pay-price" data-cu="price"></span><s data-cu="was"></s></span>`)}
        <div class="pk-cu-foot">${cuStepper()}${cuNote()}</div>${cuBetter()}</div>`,
    // Tiles: three side by side, the count big; the custom tile runs the full width under them
    () => `<div class="pk-tiles">${PACKS.map((p, i) => radio('pk-tile', i, p, `
        ${p.tag ? `<span class="pk-tile-tag" aria-hidden="true">${L('users')}Groups</span>` : ''}
        <span class="pk-tile-n">${p.credits}</span><span class="pk-tile-u">${unit(p.credits)}</span>
        <span class="pk-tile-name">${p.name}</span>
        <span class="pk-tile-price"><span class="pay-price">${priceHTML(p.price)}</span>${p.was ? `<s>${aed(p.was)}</s>` : '<s class="pk-blank">&nbsp;</s>'}</span>
        ${TICK}`)).join('')}</div>
      <div class="pk-cu pk-cu-tile">${cuRadio('pk-cu-radio', `
        <span class="pk-cu-tile-count"><span class="pk-tile-n" data-cu="n"></span><span class="pk-tile-u" data-cu="u"></span></span>
        <span class="pk-cu-tile-copy"><span class="pk-tile-name">Custom pack</span><span class="pk-tile-price"><span class="pay-price" data-cu="price"></span></span></span>`)}
        <div class="pk-cu-foot">${cuStepper()}${cuNote()}</div>${cuBetter()}</div>`,
    // Photo cards: each pack on a real photograph of who it is for; the custom card has its stepper on a solid strip
    () => PACKS.map((p, i) => radio('pk-photo', i, p, `
        <img src="assets/photos/lib/${p.photo}" alt="" style="object-position: ${p.pos}" decoding="async">
        <span class="pk-photo-shade" aria-hidden="true"></span>
        <span class="pk-photo-copy"><span class="pk-photo-n"><b>${p.credits}</b>${unit(p.credits)}</span><span class="pk-photo-name">${p.name}</span><span class="pk-photo-sub">${p.text}</span></span>
        <span class="pk-photo-price"><span class="pay-price">${priceHTML(p.price)}</span>${p.was ? `<s>${aed(p.was)}</s>` : ''}</span>
        ${p.tag ? `<span class="pk-photo-tag" aria-hidden="true">${L('users')}${p.tag}</span>` : ''}
        ${TICK}`)).join('') +
      `<div class="pk-cu pk-cu-photo">${cuRadio('pk-photo pk-cu-radio', `
        <img src="assets/photos/lib/${customPack(1).photo}" alt="" style="object-position: ${customPack(1).pos}" decoding="async">
        <span class="pk-photo-shade" aria-hidden="true"></span>
        <span class="pk-photo-copy"><span class="pk-photo-n"><b data-cu="n"></b><span data-cu="u"></span></span><span class="pk-photo-name">Custom pack</span><span class="pk-photo-sub">Pick your own number</span></span>
        <span class="pk-photo-price"><span class="pay-price" data-cu="price"></span><s data-cu="was"></s></span>
        ${TICK}`)}
        <div class="pk-cu-foot">${cuStepper()}${cuNote()}</div>${cuBetter()}</div>`,
    // Dial: the chosen pack large in a ring, four stops under it (the fourth is the custom number, set just below)
    () => `<div class="pk-dial" aria-hidden="true">
        <span class="pk-dial-ring"><svg viewBox="0 0 120 120" focusable="false"><circle class="pk-dial-track" cx="60" cy="60" r="52" pathLength="10"/><circle class="pk-dial-fill" data-pk="ring" cx="60" cy="60" r="52" pathLength="10"/></svg>
          <span class="pk-dial-read"><b data-pk="n">3</b><span data-pk="u">punches</span></span></span>
        <span class="pk-dial-copy"><span class="pk-dial-name" data-pk="name">Group run</span><span class="pk-dial-sub" data-pk="text">Three goes for your crew</span>
          <span class="pk-dial-price"><span class="pay-price" data-pk="price"><small>AED</small>25</span><s data-pk="was">AED 30</s></span></span>
      </div>
      <div class="pk-seg">${PACKS.map((p, i) => radio('pk-stop', i, p, `<b>${p.credits}</b><span>${unit(p.credits)}</span>`)).join('')}${cuRadio('pk-stop pk-cu-radio', '<b data-cu="n"></b><span>custom</span>')}</div>
      <div class="pk-cu pk-cu-dial"><div class="pk-cu-foot"><span class="pk-cu-label">Your number</span>${cuStepper()}</div>${cuNote()}${cuBetter()}</div>`,
    // Per punch: what one go costs in each pack, and what the bigger packs save (only a saving gets a chip)
    () => PACKS.map((p, i) => radio('pk-per', i, p, `
        <span class="pk-per-main"><span class="pk-per-price"><small>AED</small>${perPunch(p).toFixed(2)}</span><span class="pk-per-u">a punch</span></span>
        <span class="pay-copy"><span class="pay-name">${p.name}</span><span class="pay-sub">${p.credits} ${unit(p.credits)} for ${aed(p.price)}</span></span>
        ${saving(p) ? `<span class="pk-save">Save ${saving(p)}%</span>` : '<span></span>'}
        <span class="pay-radio" aria-hidden="true"></span>`)).join('') +
      `<div class="pk-cu pk-cu-per">${cuRadio('pk-per pk-cu-radio', `
        <span class="pk-per-main"><span class="pk-per-price"><small>AED</small><span data-cu="per"></span></span><span class="pk-per-u">a punch</span></span>
        <span class="pay-copy"><span class="pay-name">Custom pack</span><span class="pay-sub" data-cu="sub"></span></span>
        <span data-cu="save"></span>
        <span class="pay-radio" aria-hidden="true"></span>`)}
        <div class="pk-cu-foot">${cuStepper()}${cuNote()}</div>${cuBetter()}</div>`,
  ]
  function renderPacks() {
    const i = Math.min(PACK_VIEWS.length - 1, pick('topup', 'packs'))
    packsEl.dataset.look = ['list', 'tiles', 'photo', 'dial', 'per'][i]
    packsEl.innerHTML = PACK_VIEWS[i]()
    A.paint(packsEl)
  }
  // every copy of the custom pack's numbers, the stepper's bounds and its note; typing leaves the field alone
  function syncCustom(typing) {
    const c = customPack(flow.custom), better = betterThan(c)
    const F = {
      n: String(c.credits), u: unit(c.credits), was: c.was ? aed(c.was) : '', per: perPunch(c).toFixed(2),
      sub: `${c.credits} ${unit(c.credits)} for ${aed(c.price)}`,
    }
    packsEl.querySelectorAll('[data-cu]').forEach((el) => {
      const k = el.dataset.cu
      if (k === 'price') el.innerHTML = priceHTML(c.price)
      else if (k === 'save') el.innerHTML = saving(c) ? `<span class="pk-save">Save ${saving(c)}%</span>` : ''
      else if (k === 'note') {
        // the rate it is priced at, always: the better deal has its own band under it
        const html = `<span>AED ${money(Math.round(perPunch(c) * 100) / 100)} a punch${c.tier !== PACKS[0] ? `, the ${c.tier.name} rate` : ''}</span>`
        if (el.dataset.html !== html) { el.innerHTML = html; el.dataset.html = html }
      } else if (k === 'better') {
        // the saving in one line, and the bigger pack as a secondary button that says what it takes and what it costs;
        // shown only while the custom pack is the pick (once the ten is taken it has nothing left to offer)
        const more = better ? better.credits - c.credits : 0, less = better ? Math.round((c.price - better.price) * 100) / 100 : 0
        const html = better && flow.pack === 'custom'
          ? `<p class="pk-better-line"><span class="pk-better-ico" aria-hidden="true">${L('badge-percent')}</span><span><b>${more === 1 ? 'One more punch' : `${cap(spell(more))} more punches`}${less > 0 ? ` for ${aed(less)} less` : ' for the same price'}</b></span></p>` +
            `<button class="pk-better-btn" type="button" data-cu-take="${PACKS.indexOf(better)}" aria-label="Take the ${better.name} pack, ${better.credits} ${unit(better.credits)} for ${aed(better.price)}"><span>Take ${better.credits} for ${aed(better.price)}</span>${L('arrow-right')}</button>`
          : ''
        // only when it changes: the field's change event on blur must not swap the Take button out from under a click
        if (el.dataset.html !== html) {
          el.innerHTML = html
          el.dataset.html = html
          el.classList.toggle('is-on', !!html)
          if (html) swapIn(el)
        }
      } else if (k in F) el.textContent = F[k]
    })
    packsEl.querySelectorAll('[data-cu-input]').forEach((el) => { if (!(typing && el === document.activeElement)) el.value = String(c.credits) })
    packsEl.querySelectorAll('[data-cu-step]').forEach((b) => {
      const edge = Number(b.dataset.cuStep) < 0 ? c.credits <= CUSTOM_MIN : c.credits >= CUSTOM_MAX
      b.setAttribute('aria-disabled', String(edge))
    })
    const r = packsEl.querySelector('[role="radio"][data-pack="custom"]')
    if (r) r.setAttribute('aria-label', packLabel(c))
  }
  function syncPack(typing) {
    const p = packNow()
    syncCustom(typing)
    check(packsEl, packsEl.querySelector(`[role="radio"][data-pack="${flow.pack}"]`))
    packsEl.querySelectorAll('.pk-cu').forEach((el) => el.classList.toggle('is-on', flow.pack === 'custom'))
    // the Dial's readout follows the chosen stop; a custom number fills its ring out of the fifty it can reach
    const pk = (k) => packsEl.querySelector(`[data-pk="${k}"]`)
    if (pk('n')) {
      pk('n').textContent = String(p.credits); pk('u').textContent = unit(p.credits)
      pk('name').textContent = p.name; pk('text').textContent = p.custom ? `At the ${p.tier.name} rate` : p.text
      pk('price').innerHTML = priceHTML(p.price)
      pk('was').textContent = p.was ? aed(p.was) : ''
      pk('ring').style.strokeDasharray = `${p.custom ? (p.credits / CUSTOM_MAX) * 10 : p.credits} 10`
    }
    $('payContinuePrice').textContent = aed(p.price)
    $('payContinue').setAttribute('aria-label', `Continue with ${p.custom ? `a custom pack of ${credits(p.credits)}` : p.name}, ${aed(p.price)}`)
    const now = A.credits, after = now + p.credits
    const note = $('payTopupNote')
    note.querySelector('[data-icon]').dataset.icon = linked() ? 'bolt' : 'wallet'
    note.querySelector('[data-icon]').innerHTML = ''
    A.paint(note)
    note.lastElementChild.textContent = linked()
      ? (after - 1 > 0 ? `One credit starts your punch now. ${cap(spell(after - 1))} stay in your wallet${p.credits === 3 ? ' for the group' : ''}.` : 'Your punch starts as soon as you pay.')
      : `Your balance after this purchase: ${credits(after)}.`
    // the Offer section: on while the Group run is the pack
    const on = bundle(p)
    pageEl('topup').dataset.offer = on ? 'on' : 'off'
    pageEl('topup').querySelectorAll('[data-pay-offer]').forEach((b) => {
      b.setAttribute('aria-disabled', String(on))
      b.setAttribute('aria-label', on ? 'Included: three Monster Energy cans come with your Group run' : 'Pick the Group run and get three free Monster Energy cans')
    })
  }
  radioGroup(packsEl, (b) => { flow.pack = b.dataset.pack === 'custom' ? 'custom' : Number(b.dataset.pack); syncPack() })
  // the stepper: minus and plus, a typed number (kept while it is being typed, clamped to 1 to 50 when it is left),
  // and the note's offer of a bigger pack that costs no more
  function setCustom(n, typing) {
    flow.custom = Math.min(CUSTOM_MAX, Math.max(CUSTOM_MIN, Math.round(n) || CUSTOM_MIN))
    flow.pack = 'custom'
    syncPack(typing)
  }
  packsEl.addEventListener('click', (e) => {
    const s = e.target.closest('[data-cu-step]')
    if (s) { if (s.getAttribute('aria-disabled') !== 'true') setCustom(flow.custom + Number(s.dataset.cuStep)); return }
    const t = e.target.closest('[data-cu-take]')
    if (t) {
      flow.pack = Number(t.dataset.cuTake)
      syncPack()
      const r = packsEl.querySelector(`[role="radio"][data-pack="${flow.pack}"]`)
      if (r) r.focus({ preventScroll: true })
      A.toast(`${packNow().name} picked, ${credits(packNow().credits)}`)
    }
  })
  packsEl.addEventListener('input', (e) => {
    const f = e.target.closest('[data-cu-input]')
    if (!f) return
    const v = Number(f.value)
    if (Number.isInteger(v) && v >= CUSTOM_MIN && v <= CUSTOM_MAX) setCustom(v, true)
  })
  packsEl.addEventListener('change', (e) => {
    const f = e.target.closest('[data-cu-input]')
    if (f) setCustom(f.value === '' ? flow.custom : Number(f.value))
  })
  packsEl.addEventListener('keydown', (e) => {
    const f = e.target.closest('[data-cu-input]')
    if (f && e.key === 'Enter') { e.preventDefault(); setCustom(f.value === '' ? flow.custom : Number(f.value)) }
  })
  pageEl('topup').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pay-offer]')
    if (!b || bundle()) return
    flow.pack = PACKS.findIndex((p) => p.cans)
    syncPack()
    A.toast('Group run picked, three cans included')
  })

  function enterTopup(o) {
    toTop('topup', o)
    if (!o.back) flow.from = o.from || null
    const on = linked()
    $('payLinked').hidden = !on
    $('mTopupTitle').textContent = on ? 'Out of credits' : 'Buy credits'
    $('payTopupLead').textContent = flow.from === 'connect'
      ? 'The machine is linked and holding your turn. Add credits and your punch starts as soon as you pay.'
      : flow.from === 'hit'
        ? 'That was your last credit. Buy credits and beat that score while the machine is still linked.'
        : 'One credit is one punch, on any PunchApp machine.'
    const back = $('payTopupBack')
    back.setAttribute('aria-label', on ? 'Close, and free the machine' : 'Back')
    back.firstElementChild.dataset.icon = on ? 'close' : 'back'
    back.firstElementChild.innerHTML = ''
    A.paint(back)
    syncPack()
  }
  $('payTopupBack').addEventListener('click', () => {
    // leaving an out of credits screen frees the machine for the queue: start again from the scan
    if (linked()) { flow.from = null; A.go('scan') } else A.back()
  })
  $('payContinue').addEventListener('click', () => A.go('checkout', { flow: true }))

  /* ------------------------------------------------------------ checkout: Pay with, in five designs */
  const methodsEl = $('payMethods')
  const KEYS = ['wallet', 'visa', 'paypal', 'card']
  const METHOD = {
    wallet: (d) => (d === 'android'
      ? { name: 'Google Pay', short: 'Google Pay', sub: 'Confirm with your fingerprint', mark: 'gpay', note: 'Your fingerprint confirms it. The card stays in Google Wallet.' }
      : { name: 'Apple Pay', short: 'Apple Pay', sub: 'Confirm with Face ID', mark: 'apay', note: 'Face ID confirms it. The card stays in Apple Wallet.' }),
    visa: () => ({ name: 'Visa ending 4242', short: 'Visa 4242', sub: 'Saved card', mark: 'visa', note: 'Your saved card, confirmed with Face ID or your fingerprint.' }),
    paypal: () => ({ name: 'PayPal', short: 'PayPal', sub: 'Approve in your PayPal account', mark: 'paypal', note: 'You approve it in PayPal. PunchApp never sees your login.' }),
    card: () => ({ name: 'Use another card', short: 'New card', sub: 'Debit or credit card', mark: 'add', note: 'Type the card in below. It is checked before anything is charged.' }),
  }
  const methodName = (key, d = device()) => (key === 'card' ? 'Card' : METHOD[key](d).name)
  function mark(kind, small) {
    const cls = `pay-mark pay-mark-${kind}${small ? ' pay-mark-sm' : ''}`
    if (kind === 'apay') return `<span class="${cls}" aria-hidden="true">Apple Pay</span>`
    if (kind === 'gpay') return `<span class="${cls}" aria-hidden="true"><b>G</b>Pay</span>`
    if (kind === 'visa') return `<span class="${cls}" aria-hidden="true">VISA</span>`
    if (kind === 'paypal') return `<span class="${cls}" aria-hidden="true"><b>Pay</b><i>Pal</i></span>`
    // a new card is drawn as a card; the plus belongs only to the Use another card row, where it means add
    if (kind === 'card') return `<span class="${cls}" aria-hidden="true">${L('credit-card')}</span>`
    return `<span class="${cls}" aria-hidden="true">${L('plus')}</span>`
  }
  const mRadio = (cls, key, m, inner) => `<button class="${cls}" type="button" role="radio" aria-checked="false" data-method="${key}" aria-label="${m.name}, ${m.sub}">${inner}</button>`
  // the Card design draws the chosen method as the thing itself
  function cardFace(key, d) {
    const m = METHOD[key](d)
    if (key === 'wallet') return `<span class="pm-face pm-face-wallet">${mark(m.mark)}<span class="pm-face-num">Visa ending 4242</span><span class="pm-face-name">In your ${d === 'android' ? 'Google' : 'Apple'} Wallet</span>${L(d === 'android' ? 'fingerprint' : 'scan-face')}</span>`
    if (key === 'visa') return `<span class="pm-face pm-face-visa"><span class="pm-emv"></span><span class="pm-face-num">4242</span><span class="pm-face-name">Sara Malik</span>${mark('visa')}</span>`
    if (key === 'paypal') return `<span class="pm-face pm-face-paypal">${mark('paypal')}<span class="pm-face-num">Sara Malik</span><span class="pm-face-name">Approve in the PayPal app</span></span>`
    return `<span class="pm-face pm-face-new">${L('credit-card')}<span class="pm-face-num">Add a card</span><span class="pm-face-name">Debit or credit, checked before any charge</span></span>`
  }
  function detail(key, d) {
    const m = METHOD[key](d)
    return `${mark(m.mark)}<span class="pay-copy"><span class="pay-name">${m.name}</span><span class="pay-sub">${m.note}</span></span>`
  }
  const METHOD_VIEWS = [
    // List
    (d) => KEYS.map((key) => {
      const m = METHOD[key](d)
      return mRadio(`pay-method${key === 'card' ? ' pay-method-add' : ''}`, key, m, `${mark(m.mark)}
          <span class="pay-copy"><span class="pay-name">${m.name}</span><span class="pay-sub">${m.sub}</span></span>
          <span class="pay-radio" aria-hidden="true"></span>`)
    }).join(''),
    // Wallet first: the phone's own wallet large, the rest a quiet list under it
    (d) => {
      const w = METHOD.wallet(d)
      return mRadio(`pm-hero pm-hero-${w.mark}`, 'wallet', w, `${mark(w.mark)}<span class="pay-copy"><span class="pay-name">Pay with ${w.name}</span><span class="pay-sub">${w.sub}, no card details</span></span><span class="pay-radio" aria-hidden="true"></span>`) +
        `<p class="pm-or">Or pay another way</p><div class="pm-mini">${KEYS.slice(1).map((key) => {
          const m = METHOD[key](d)
          return mRadio('pm-mini-row', key, m, `${mark(m.mark, true)}<span class="pay-name">${m.name}</span><span class="pay-radio" aria-hidden="true"></span>`)
        }).join('')}</div>`
    },
    // Tiles: two by two
    (d) => `<div class="pm-tiles">${KEYS.map((key) => {
      const m = METHOD[key](d)
      return mRadio('pm-tile', key, m, `${mark(m.mark)}<span class="pay-name">${m.short}</span><span class="pay-sub">${m.sub}</span><span class="pay-radio" aria-hidden="true"></span>`)
    }).join('')}</div>`,
    // Card: the chosen method drawn as a card, the four as chips under it
    (d) => `<div class="pm-cardview" data-pm-view="card" aria-hidden="true"></div><div class="pm-chips">${KEYS.map((key) => {
      const m = METHOD[key](d)
      return mRadio('pm-chip', key, m, `${mark(m.mark, true)}<span>${m.short}</span>`)
    }).join('')}</div>`,
    // Tabs: four marks across, the chosen one explained under them
    (d) => `<div class="pm-tabs">${KEYS.map((key) => {
      const m = METHOD[key](d)
      return mRadio('pm-tab', key, m, `${mark(m.mark, true)}<span>${m.short}</span>`)
    }).join('')}</div><div class="pm-detail m-glass" data-pm-view="detail"></div>`,
  ]
  function renderMethods() {
    const d = device(), i = Math.min(METHOD_VIEWS.length - 1, pick('checkout', 'method'))
    methodsEl.dataset.look = ['list', 'wallet', 'tiles', 'card', 'tabs'][i]
    methodsEl.innerHTML = METHOD_VIEWS[i](d)
    A.paint(methodsEl)
    syncMethod()
  }
  function syncMethod() {
    const d = device()
    check(methodsEl, methodsEl.querySelector(`[role="radio"][data-method="${flow.method}"]`))
    const card = methodsEl.querySelector('[data-pm-view="card"]'), det = methodsEl.querySelector('[data-pm-view="detail"]')
    if (card) { card.innerHTML = cardFace(flow.method, d); A.paint(card) }
    if (det) { det.innerHTML = detail(flow.method, d); A.paint(det) }
    $('payNewCard').hidden = flow.method !== 'card'
    if (flow.method !== 'card') cardError('')
  }
  radioGroup(methodsEl, (b) => {
    const was = flow.method
    flow.method = b.dataset.method
    syncMethod()
    if (flow.method === 'card' && was !== 'card') A.later(() => { reveal($('payNewCard')); $('payCardNo').focus({ preventScroll: true }) }, 60)
  })
  // scroll the checkout body just far enough to show a block whole (scrollIntoView would also move the phone's screen)
  function reveal(el) {
    const body = el.closest('.pay-body'), b = body.getBoundingClientRect(), r = el.getBoundingClientRect()
    const zoom = b.height / body.clientHeight || 1
    const over = (r.bottom - b.bottom) / zoom + 28
    if (over > 0) body.scrollTo({ top: body.scrollTop + over, behavior: reduced.matches ? 'auto' : 'smooth' })
  }

  /* ------------------------------------------------------------ checkout: every copy of the Summary */
  function syncOrder() {
    const p = packNow(), page = pageEl('checkout'), on = linked()
    const F = {
      n: String(p.credits), unit: unit(p.credits), name: p.name, credits: credits(p.credits),
      where: on ? `At ${PLACE}` : 'Any PunchApp machine', whereShort: on ? PLACE : 'Any machine',
      price: aed(p.price, true), vat: aed(vat(p), true), now: String(A.credits), after: String(A.credits + p.credits),
    }
    page.querySelectorAll('[data-pay-f]').forEach((el) => {
      const k = el.dataset.payF
      if (k === 'total') el.innerHTML = priceHTML(p.price, true)
      else if (k in F) el.textContent = F[k]
    })
    page.querySelectorAll('[data-pay-cans]').forEach((el) => { el.hidden = !bundle(p) })
    page.querySelectorAll('[data-pay-photo]').forEach((img) => { img.src = `assets/photos/lib/${p.photo}`; img.style.objectPosition = p.pos })
    $('payNowText').textContent = `Pay ${aed(p.price)}`
  }
  function enterCheckout(o) {
    // straight from the page bar: a fresh checkout for the preselected pack
    if (!o.flow && !o.back) flow.from = null
    toTop('checkout', o)
    closeSheet(true)
    ssClose(true)
    renderMethods()
    syncOrder()
    // the title's line: what happens the moment the payment goes through (back from a failed payment: that nothing was
    // charged, and the same pack is waiting)
    $('mCheckoutLead').textContent = o.retry
      ? 'Nothing was charged last time. Same pack, pay when you are ready.'
      : linked()
        ? 'The machine is holding your turn. Your punch starts as soon as you pay.'
        : 'Your credits land in your wallet the moment you pay.'
    $('payNow').disabled = false
    // Pay another way: bring Pay with into view and put focus on the way that is picked, so the next arrow key changes it
    if (o.other) {
      A.later(() => {
        const on = methodsEl.querySelector('[role="radio"][aria-checked="true"]') || methodsEl.querySelector('[role="radio"]')
        const body = pageEl('checkout').querySelector('.pay-body'), label = $('payWithLabel')
        const z = body.getBoundingClientRect().height / body.clientHeight || 1
        const top = body.scrollTop + (label.getBoundingClientRect().top - body.getBoundingClientRect().top) / z - 16
        body.scrollTo({ top: Math.max(0, top), behavior: reduced.matches ? 'auto' : 'smooth' })
        if (on) on.focus({ preventScroll: true })
        A.toast('Pick another way to pay')
      }, 420)
    }
  }
  $('payCheckoutBack').addEventListener('click', () => A.back())
  pageEl('checkout').addEventListener('click', (e) => { if (e.target.closest('[data-pay-change]')) A.go('topup', { from: flow.from }) })

  /* ------------------------------------------------------------ checkout: the Secure checkout sheet
     How the payment is protected, in the How-to sheet's pattern (mobile.js openSheet / closeSheet): it rises over a
     scrim, everything behind it on the page goes inert, Tab cycles through the controls of the design on show, Escape,
     the scrim, Got it or a drag down close it, and focus goes back to the Secure checkout button. The five designs are
     this page's Secure sheet section (the panel carries data-sec, so psec.js shows the chosen one); choosing one in
     Customise while Checkout is open opens the sheet on it. One drawing, made here from the look's tokens, is the art
     of every design that has one, so it holds in all four looks; the Walkthrough lights the part of it each promise is
     about. The wallet words follow the device: Apple Pay and Face ID, or Google Pay and your fingerprint. */
  const ss = $('paySecure'), ssBtn = $('paySecureBtn'), ssPanel = ss.querySelector('.pay-ss-panel')
  const ssWalkEl = ss.querySelector('.pss-walk')
  let ssOpen = false, ssTimer = 0, ssStep = 0
  const lu = (name, x, y, s, cls) => `<svg class="${cls}" x="${x}" y="${y}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${(window.LUCIDE || {})[name] || ''}</svg>`
  // the scene: a bank card whose number is locked away, the phone paying with a shield on its glass, the punch credit
  // held in a dashed ring for your turn, and the arrow that brings it back if the machine fails. "phone" crops to the phone
  function secureArt(crop) {
    const dots = (x0, y) => [0, 1, 2, 3].map((g) => [0, 1, 2, 3].map((k) => `<circle cx="${x0 + g * 22 + k * 4.6}" cy="${y}" r="1.7"/>`).join('')).join('')
    const only = crop === 'phone'
    return `<svg class="psa${only ? ' psa-only' : ''}" viewBox="${only ? '138 8 116 188' : '0 0 360 200'}" aria-hidden="true" focusable="false">
      <ellipse class="psa-floor" cx="190" cy="190" rx="150" ry="7"/>
      <g class="psa-g psa-card"><g transform="rotate(-11 98 136)">
        <rect class="psa-card-body" x="36" y="98" width="124" height="78" rx="11"/>
        <rect class="psa-chip" x="50" y="114" width="20" height="15" rx="3.5"/>
        <g class="psa-dots">${dots(50, 152)}</g>
        <rect class="psa-card-line" x="50" y="162" width="44" height="3" rx="1.5"/>
      </g>
        <circle class="psa-badge" cx="114" cy="94" r="14"/>${lu('lock', 105, 85, 18, 'psa-badge-ico')}
      </g>
      <g class="psa-g psa-phone">
        <rect class="psa-phone-body" x="146" y="14" width="100" height="176" rx="21"/>
        <rect class="psa-screen" x="153" y="21" width="86" height="162" rx="15"/>
        <rect class="psa-island" x="181" y="28" width="30" height="9" rx="4.5"/>
        <path class="psa-shield" d="M196 56 222 66V89C222 106 210 117 196 123 182 117 170 106 170 89V66Z"/>
        <path class="psa-check" d="M184 90 193 99 209 81"/>
        <rect class="psa-pay" x="162" y="138" width="68" height="24" rx="12"/>
        <text class="psa-pay-t" x="196" y="154" text-anchor="middle" data-ss-f="walletMark">Apple Pay</text>
      </g>
      <g class="psa-g psa-hold">
        <circle class="psa-ring" cx="298" cy="70" r="36"/>
        <circle class="psa-token" cx="298" cy="70" r="26"/>${lu('hand-fist', 285, 57, 26, 'psa-token-ico')}
      </g>
      <g class="psa-g psa-refund">
        <path class="psa-arrow" d="M312 112C318 146 296 170 262 170"/>
        <path class="psa-arrow" d="M271 161 261 170 271 179"/>
      </g>
    </svg>`
  }
  ss.querySelectorAll('[data-ss-art]').forEach((el) => { el.innerHTML = secureArt(el.dataset.ssArt) })
  const ssDesign = () => [...ssPanel.children].find((d) => d.hasAttribute('data-sv') && !d.hidden) || ssPanel
  const ssStops = () => [...ssDesign().querySelectorAll('button:not([disabled]), [tabindex="0"]')].filter((el) => !el.closest('[hidden]'))
  const ssBehind = () => [...ss.closest('.m-page').children].filter((el) => el !== ss)
  function ssFill() {
    const apple = device() !== 'android'
    const F = {
      wallet: apple ? 'Apple Pay' : 'Google Pay',
      walletMark: apple ? 'Apple Pay' : 'Google Pay',
      confirmLine: apple ? 'Face ID confirms it. PunchApp never sees your card.' : 'Your fingerprint confirms it. PunchApp never sees your card.',
      confirmShort: apple ? 'Confirmed with Face ID' : 'Confirmed with your fingerprint',
      chip: apple ? 'Apple Pay with Face ID' : 'Google Pay with your fingerprint',
    }
    ss.querySelectorAll('[data-ss-f]').forEach((el) => { const k = el.dataset.ssF; if (k in F) el.textContent = F[k] })
    ss.querySelectorAll('[data-ss-bio]').forEach((el) => { el.dataset.lucide = apple ? 'scan-face' : 'fingerprint' })
    if (window.paintLucide) window.paintLucide(ss)
  }
  // the Walkthrough: Back and Next page the four promises and light the part of the scene each is about; Next on the
  // last one is Got it
  function ssWalk(n) {
    if (!ssWalkEl) return
    const slides = [...ssWalkEl.querySelectorAll('.pss-slide')]
    ssStep = Math.max(0, Math.min(slides.length - 1, n))
    slides.forEach((s, k) => { s.hidden = k !== ssStep; s.classList.toggle('is-on', k === ssStep) })
    ssWalkEl.querySelectorAll('.pss-dots i').forEach((d, k) => d.classList.toggle('is-on', k === ssStep))
    ssWalkEl.querySelector('.pss-stage').dataset.ssFocus = slides[ssStep].dataset.focus
    const back = ssWalkEl.querySelector('[data-ss-back]'), next = ssWalkEl.querySelector('[data-ss-next]')
    back.disabled = ssStep === 0
    const last = ssStep === slides.length - 1
    next.textContent = last ? 'Got it' : 'Next'
    next.toggleAttribute('data-ss-ok', last)
    // the heading of the page on show names the dialog
    slides.forEach((s) => s.querySelector('.pss-title').removeAttribute('id'))
    slides[ssStep].querySelector('.pss-title').id = 'payssTitle1'
  }
  function ssLabel() {
    const t = ssDesign().querySelector('.pss-title[id]')
    if (t) ss.setAttribute('aria-labelledby', t.id)
  }
  const ssFirst = () => ssDesign().querySelector('[data-ss-ok], [data-ss-next]') || ssStops()[0]
  function ssOpenSheet() {
    clearTimeout(ssTimer)
    ssFill()
    ssWalk(0)
    ssLabel()
    ss.hidden = false
    void ss.offsetWidth
    ss.classList.add('is-open')
    ssOpen = true
    ssBehind().forEach((el) => { el.inert = true })
    ssBtn.setAttribute('aria-expanded', 'true')
    const first = ssFirst()
    if (first) first.focus({ preventScroll: true })
  }
  // quiet: the screen is changing under the sheet, so focus is not handed back to the button
  function ssClose(quiet) {
    if (!ssOpen) { if (quiet === true) ss.hidden = true; return }
    ssOpen = false
    ss.classList.remove('is-open')
    ssBehind().forEach((el) => { el.inert = false })
    ssBtn.setAttribute('aria-expanded', 'false')
    clearTimeout(ssTimer)
    if (quiet === true) { ss.hidden = true; return }
    ssTimer = setTimeout(() => { ss.hidden = true }, 420)
    ssBtn.focus({ preventScroll: true })
  }
  ssBtn.setAttribute('aria-expanded', 'false')
  ssBtn.addEventListener('click', () => ssOpenSheet())
  if (ssWalkEl) {
    ssWalkEl.addEventListener('click', (e) => {
      const next = e.target.closest('[data-ss-next]'), back = e.target.closest('[data-ss-back]')
      // the Next that has just become the last one must not close the sheet on the same click
      if (next && !next.hasAttribute('data-ss-ok')) { e.stopPropagation(); ssWalk(ssStep + 1); next.focus({ preventScroll: true }) }
      else if (back && !back.disabled) {
        e.stopPropagation()
        ssWalk(ssStep - 1)
        ;(ssStep === 0 ? ssWalkEl.querySelector('[data-ss-next]') : back).focus({ preventScroll: true })
      }
    })
  }
  ss.addEventListener('click', (e) => { if (e.target.closest('[data-ss-ok], [data-ss-close]')) ssClose() })
  // the sheet is modal: Tab cycles through the controls of the design on show, Escape closes it wherever focus is
  ss.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); ssClose(); return }
    if (e.key !== 'Tab') return
    const list = ssStops()
    e.preventDefault()
    if (!list.length) return
    const i = list.indexOf(document.activeElement)
    const next = e.shiftKey ? (i <= 0 ? list.length - 1 : i - 1) : (i < 0 || i === list.length - 1 ? 0 : i + 1)
    list[next].focus({ preventScroll: true })
  })
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !ssOpen || e.defaultPrevented) return
    const f = document.activeElement
    if (f && f !== document.body && !app.contains(f)) return
    e.preventDefault()
    ssClose()
  })
  // drag the sheet down to close it
  let ssDragY = null
  ssPanel.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, input, a')) return
    ssDragY = e.clientY
    ssPanel.setPointerCapture(e.pointerId)
    ssPanel.style.transition = 'none'
  })
  ssPanel.addEventListener('pointermove', (e) => { if (ssDragY != null) ssPanel.style.transform = `translateY(${Math.max(0, e.clientY - ssDragY)}px)` })
  const ssDragEnd = (e) => {
    if (ssDragY == null) return
    const dy = e.clientY - ssDragY
    ssDragY = null
    ssPanel.style.transition = ''
    ssPanel.style.transform = ''
    if (dy > 70) ssClose()
  }
  ssPanel.addEventListener('pointerup', ssDragEnd)
  ssPanel.addEventListener('pointercancel', ssDragEnd)
  // leaving the checkout takes the sheet with it
  document.addEventListener('mpage', (e) => { if (e.detail && e.detail.from === 'checkout' && e.detail.page !== 'checkout') ssClose(true) })

  // another card: light formatting and the checks a real form would make before charging
  const cardNo = $('payCardNo'), cardExp = $('payCardExp'), cardCvc = $('payCardCvc')
  cardNo.addEventListener('input', () => { cardNo.value = cardNo.value.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ') })
  cardExp.addEventListener('input', (e) => {
    const d = cardExp.value.replace(/\D/g, '').slice(0, 4)
    cardExp.value = d.length > 2 || (d.length === 2 && e.inputType !== 'deleteContentBackward') ? `${d.slice(0, 2)} / ${d.slice(2)}` : d
  })
  cardCvc.addEventListener('input', () => { cardCvc.value = cardCvc.value.replace(/\D/g, '').slice(0, 4) })
  function cardError(text, field) {
    const el = $('payCardError')
    el.textContent = text
    el.hidden = !text
    ;[cardNo, cardExp, cardCvc].forEach((f) => f.setAttribute('aria-invalid', String(f === field)))
    if (field) { field.focus({ preventScroll: true }); reveal($('payNewCard')) }
  }
  function cardOk() {
    const n = cardNo.value.replace(/\D/g, ''), x = cardExp.value.replace(/\D/g, '')
    if (n.length < 13) { cardError('Enter the long number on the front of your card.', cardNo); return false }
    if (x.length !== 4 || +x.slice(0, 2) < 1 || +x.slice(0, 2) > 12) { cardError('Enter the expiry as month and year.', cardExp); return false }
    if (cardCvc.value.length < 3) { cardError('Enter the security code from the back of your card.', cardCvc); return false }
    cardError('')
    return true
  }
  const cardEnding = () => cardNo.value.replace(/\D/g, '').slice(-4)

  /* ------------------------------------------------------------ the wallet sheet: confirm, check, process, done */
  const sheet = $('paySheet')
  let run = 0, sheetTimer = 0
  const TICKSVG = '<span class="pay-tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>'
  const FAILSVG = '<span class="pay-failx"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M7 7l10 10M17 7 7 17"/></svg></span>'
  const SIDE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2.5" width="12" height="19" rx="3"/><path d="M20.5 7v5"/></svg>'
  const GLYPH = {
    side: () => SIDE,
    face: () => '<span data-icon="face"></span>',
    finger: () => '<span data-icon="fingerprint"></span>',
    spin: () => '<span class="pay-spin"></span>',
    done: () => TICKSVG,
    fail: () => FAILSVG,
  }
  function steps(method, d) {
    const bio = d === 'android' ? { glyph: 'finger', ask: 'Touch the fingerprint sensor', ok: 'Fingerprint recognised' } : { glyph: 'face', ask: 'Confirm with Face ID', ok: 'Face ID' }
    if (method === 'wallet' && d === 'iphone') return [
      { glyph: 'side', text: 'Confirm with side button', ms: 1600 },
      { glyph: 'face', text: 'Face ID', ms: 1400 },
      { glyph: 'spin', text: 'Processing', ms: 1400 },
      { glyph: 'done', text: 'Done', ms: 1200 },
    ]
    if (method === 'wallet') return [
      { glyph: 'finger', text: bio.ask, ms: 1600 },
      { glyph: 'spin', text: 'Processing', ms: 1400 },
      { glyph: 'done', text: 'Payment complete', ms: 1200 },
    ]
    if (method === 'paypal') return [
      { glyph: 'spin', text: 'Opening PayPal', ms: 1600 },
      { glyph: 'spin', text: 'Waiting for PayPal to approve', ms: 1600 },
      { glyph: 'done', text: 'Approved by PayPal', ms: 1200 },
    ]
    return [
      { glyph: bio.glyph, text: bio.ask, ms: 1600 },
      { glyph: 'spin', text: 'Contacting your bank', ms: 1600 },
      { glyph: 'done', text: 'Paid', ms: 1200 },
    ]
  }
  function sheetRows(method, d) {
    const p = packNow()
    const card = method === 'card' ? `Card ending ${cardEnding()}` : 'Visa ending 4242'
    const first = method === 'paypal'
      ? '<div><dt>Account</dt><dd>Sara Malik</dd></div>'
      : `<div><dt>Card</dt><dd>${method === 'card' ? mark('card', true) : mark('visa', true)}<span>${card}${method === 'wallet' ? `<small>In your ${d === 'android' ? 'Google' : 'Apple'} Wallet</small>` : ''}</span></dd></div>`
    return first +
      `<div><dt>Pay</dt><dd><span>PunchApp<small>${p.name}, ${credits(p.credits)}</small></span></dd></div>` +
      `<div><dt>Total</dt><dd><span class="pay-price">${priceHTML(p.price, true)}</span></dd></div>`
  }
  function setStep(s) {
    sheet.dataset.glyph = s.glyph
    const g = $('paySheetGlyph')
    g.innerHTML = GLYPH[s.glyph]()
    A.paint(g)
    $('paySheetStatus').textContent = s.text
  }
  const behind = () => [...sheet.closest('.m-page').children].filter((el) => el !== sheet)
  function openSheet() {
    const d = device(), method = flow.method
    const head = method === 'wallet' ? (d === 'android' ? 'gpay' : 'apay') : method === 'visa' ? 'visa' : method
    $('paySheetMark').innerHTML = mark(head)
    A.paint($('paySheetMark'))
    $('paySheetTitle').textContent = `Confirm ${aed(packNow().price)} with ${methodName(method, d)}`
    $('paySheetRows').innerHTML = sheetRows(method, d)
    A.paint($('paySheetRows'))
    clearTimeout(sheetTimer)
    sheet.hidden = false
    void sheet.offsetWidth
    sheet.classList.add('is-open')
    behind().forEach((el) => { el.inert = true })
    $('paySheetCancel').focus({ preventScroll: true })
    // a failure the demo row asked for runs the method's own first steps, then says what went wrong
    const fail = failNext
    failNext = null
    const list = fail ? failSteps(steps(method, d), fail) : steps(method, d), token = ++run
    let i = 0
    const next = () => {
      if (token !== run) return
      const s = list[i++]
      if (!s) { if (fail) finishFail(fail); else finishPay(); return }
      setStep(s)
      A.later(next, s.ms)
    }
    next()
  }
  function closeSheet(now) {
    run++
    sheet.classList.remove('is-open')
    behind().forEach((el) => { el.inert = false })
    clearTimeout(sheetTimer)
    if (now) { sheet.hidden = true; return }
    sheetTimer = setTimeout(() => { sheet.hidden = true }, 420)
    $('payNow').focus({ preventScroll: true })
  }
  $('paySheetCancel').addEventListener('click', () => { closeSheet(); A.toast('Payment cancelled, nothing was charged') })
  sheet.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); closeSheet(); A.toast('Payment cancelled, nothing was charged') }
    if (e.key === 'Tab') { e.preventDefault(); $('paySheetCancel').focus() }
  })
  $('payNow').addEventListener('click', () => {
    if (flow.method === 'card' && !cardOk()) return
    openSheet()
  })

  /* ------------------------------------------------------------ a failed payment (round nine)
     The checkout's demo row makes the next payment fail in one of three plain ways: the bank declines it, it is
     cancelled before it finishes, or the connection drops. The wallet sheet runs the method's own first steps, says what
     went wrong, and the Payment failed page opens (parts/mpage-failed.html, drawn by mpages/failed.js from
     window.punchPay.failure()). Nothing is charged and no credit is held: the wallet is left exactly as it was, and the
     pack and the way to pay are kept, so Try again is one tap back to the same checkout. */
  const FAIL_SHEET = { declined: 'Declined by your bank', cancelled: 'Cancelled before it finished', offline: 'No connection' }
  let failNext = null
  function failSteps(list, reason) {
    const base = list.filter((s) => s.glyph !== 'done')
    // cancelled: it stops at the confirmation, before anything is sent
    const kept = reason === 'cancelled' ? base.filter((s, i) => s.glyph !== 'spin' || i === 0).slice(0, 2) : base
    return [...kept, { glyph: 'fail', text: FAIL_SHEET[reason], ms: 1700 }]
  }
  const paidWithNow = (d = device()) => (flow.method === 'card' ? (cardEnding() ? `Card ending ${cardEnding()}` : 'New card') : flow.method === 'visa' ? 'Visa ending 4242' : methodName(flow.method, d))
  function finishFail(reason) {
    flow.fail = { reason, pack: packNow(), method: flow.method, from: flow.from, paidWith: paidWithNow() }
    closeSheet(true)
    A.go('failed', { flow: true })
  }
  pageEl('checkout').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pay-fail]')
    if (!b) return
    if (flow.method === 'card' && !cardOk()) return
    failNext = b.dataset.payFail
    openSheet()
  })
  // straight from the page bar there was no checkout: the page shows a declined payment for the pack and way to pay
  // that are picked now, and the wallet is left as it is
  function enterFailed(o) {
    if (!(o.flow && flow.fail) && !(o.back && flow.fail)) {
      flow.fail = { reason: 'declined', pack: packNow(), method: flow.method, from: null, paidWith: paidWithNow(), preview: true }
    }
  }
  const methodView = (key, d = device()) => { const m = METHOD[key](d); return { key, name: m.name, short: m.short, sub: m.sub, note: m.note, mark: mark(m.mark), markSm: mark(m.mark, true) } }
  // what the Payment failed page draws from, and what its buttons do
  window.punchPay = {
    failure() {
      const f = flow.fail || { reason: 'declined', pack: packNow(), method: flow.method, from: flow.from, paidWith: paidWithNow() }
      const p = f.pack, on = linked(f.from), d = device()
      return {
        reason: f.reason, method: f.method, paidWith: f.paidWith, linked: on, place: PLACE, balance: A.credits,
        pack: { name: p.name, credits: p.credits, unit: unit(p.credits), creditsText: credits(p.credits), price: aed(p.price), priceCents: aed(p.price, true), custom: !!p.custom, photo: p.photo, pos: p.pos },
        wallet: methodView('wallet', d), others: KEYS.filter((k) => k !== f.method).map((k) => methodView(k, d)),
        device: d,
      }
    },
    // Try again: the same checkout, the same pack and way to pay
    retry() { flow.fail = null; A.go('checkout', { flow: true, retry: true }) },
    // Pay another way: a way picked on the page goes straight in; without one, the checkout opens on Pay with
    payWith(key) {
      flow.fail = null
      if (key && KEYS.includes(key)) { flow.method = key; A.go('checkout', { flow: true, retry: true }) }
      else A.go('checkout', { flow: true, retry: true, other: true })
    },
    // Back to the packs: the packs again, still linked to the machine if the player came from it
    topup() { const from = flow.fail ? flow.fail.from : flow.from; flow.fail = null; A.go('topup', { from }) },
  }

  function finishPay() {
    const p = packNow(), d = device()
    A.credits = A.credits + p.credits
    flow.receipt = {
      pack: p, from: flow.from, balance: A.credits,
      paidWith: flow.method === 'card' ? `Card ending ${cardEnding()}` : flow.method === 'visa' ? 'Visa ending 4242' : methodName(flow.method, d),
    }
    closeSheet(true)
    A.go('paid', { flow: true })
  }

  /* ------------------------------------------------------------ paid: every copy of the Confirmation */
  let receiptNow = null
  const previewPaidWith = () => (flow.method === 'visa' ? 'Visa ending 4242' : methodName(flow.method === 'card' ? 'wallet' : flow.method))
  function enterPaid(o) {
    let r
    if (o.flow && flow.receipt) r = flow.receipt
    else if (o.back && receiptNow) r = receiptNow
    else {
      // straight from the page bar there was no checkout: the screen fills the wallet with the preselected pack, so every
      // line on it is true and Punch now finds the credits; a wallet that already holds the pack is not topped up again
      const p = packNow()
      A.credits = Math.max(A.credits, p.credits)
      r = { preview: true, pack: p, from: null, balance: A.credits, paidWith: previewPaidWith() }
    }
    renderPaid(r, o)
  }
  function renderPaid(r, o) {
    receiptNow = r
    toTop('paid', o)
    const p = r.pack, on = linked(r.from), page = pageEl('paid')
    const F = {
      title: `${credits(p.credits)} added`,
      lead: on
        ? `The machine at ${PLACE} is ready. Step up and throw your punch.`
        : p.credits === 1 ? 'It is in your wallet. Scan any PunchApp machine to use it.' : 'They are in your wallet. Scan any PunchApp machine to use them.',
      balance: String(r.balance), unit: r.balance === 1 ? 'credit' : 'credits',
      added: String(p.credits), addedUnit: unit(p.credits),
      use: on ? PLACE : 'Any PunchApp machine',
      next: on ? 'The machine is ready for you' : 'Your nearest machine',
      // the Receipt section's designs
      pack: p.name, price: aed(p.price, true), paidWith: r.paidWith, vatAmt: aed(vat(p), true),
    }
    page.querySelectorAll('[data-paid-f]').forEach((el) => { const k = el.dataset.paidF; if (k in F) el.textContent = F[k] })
    page.querySelectorAll('[data-paid-tokens]').forEach((el) => { el.innerHTML = tokens(r.balance, p.credits) })
    page.dataset.linked = on ? 'yes' : 'no'
    // the Monster cans section shows only with a pack that carries them; every Receipt design takes the same lines
    $('payCans').hidden = !bundle(p)
    const lines =
      `<div><dt>${p.name}</dt><dd>${credits(p.credits)}</dd></div>` +
      (bundle(p) ? '<div><dt>Monster Energy</dt><dd>Three cans, free</dd></div>' : '') +
      `<div><dt>Paid with</dt><dd>${r.paidWith}</dd></div>` +
      (on ? `<div><dt>Machine</dt><dd>${PLACE}</dd></div>` : '') +
      `<div class="is-total"><dt>Total, includes VAT</dt><dd>${aed(p.price, true)}</dd></div>`
    $('payReceipt').innerHTML = lines
    page.querySelectorAll('[data-paid-list]').forEach((el) => { el.innerHTML = lines })
    $('payReceipt').hidden = true
    $('payReceiptBtn').setAttribute('aria-expanded', 'false')
    $('payPunchNow').setAttribute('aria-label', on ? `Punch now at ${PLACE}` : 'Punch now, scan a machine')
  }
  $('payReceiptBtn').addEventListener('click', () => {
    const open = $('payReceipt').hidden
    $('payReceipt').hidden = !open
    $('payReceiptBtn').setAttribute('aria-expanded', String(open))
  })
  $('payPunchNow').addEventListener('click', () => {
    const on = receiptNow && linked(receiptNow.from)
    flow.from = null
    flow.receipt = null
    // back to the machine that is waiting: the connect screen finds the credits, spends one and shows the hit
    if (on) A.go('connect', { flow: true, again: true })
    else A.go('scan')
  })
  $('payToFeed').addEventListener('click', () => A.go('feed'))
  $('payPaidClose').addEventListener('click', () => A.go('feed'))

  /* ------------------------------------------------------------ your hit: the second and third punch */
  function syncAgain() {
    const n = A.credits
    const again = $('payAgain')
    if (!again) return
    again.toggleAttribute('data-empty', n === 0)
    $('payAgainSub').textContent = n > 0 ? 'Machine still linked' : 'Buy credits to go again'
    const btn = $('payAgainBtn')
    btn.textContent = n > 0 ? 'Punch again' : 'Buy credits'
    btn.setAttribute('aria-label', n > 0 ? `Punch again, ${credits(n)} left` : 'Out of credits, buy more to punch again')
  }
  $('payAgainBtn')?.addEventListener('click', () => {
    if (A.credits > 0) A.go('connect', { flow: true, again: true })
    else A.go('topup', { from: 'hit' })
  })

  /* ------------------------------------------------------------ wiring */
  app.addEventListener('credits', () => {
    syncAgain()
    if (A.page === 'topup') syncPack()
    if (A.page === 'checkout') syncOrder()
  })
  // Customise changed a design on one of these pages: redraw the drawn ones, and let the new design rise in
  document.addEventListener('psec', (e) => {
    const d = e.detail
    if (d.surface !== 'phone' || !['topup', 'checkout', 'paid'].includes(d.page)) return
    if (d.page === 'topup' && d.sec === 'packs') { renderPacks(); syncPack() }
    if (d.page === 'checkout' && d.sec === 'method') renderMethods()
    if (d.page === 'topup' && d.sec === 'offer') syncPack()
    if (d.page === 'checkout' && d.sec === 'secure') {
      ssWalk(0)
      ssLabel()
      // a new sheet design is only seen with the sheet open: open it when the choice is made on Checkout
      if (!d.initial && A.page === 'checkout') {
        if (!ssOpen) ssOpenSheet()
        else { const f = ssFirst(); if (f) f.focus({ preventScroll: true }) }
      }
    }
    if (!d.initial) swapIn(d.sec === 'packs' ? packsEl : d.sec === 'method' ? methodsEl : d.el)
  })
  // the device frame can change under an open checkout: Apple Pay and Google Pay swap places
  new MutationObserver(() => {
    ssFill()
    if (A.page === 'checkout') { closeSheet(true); renderMethods() }
    if (A.page === 'paid' && receiptNow && receiptNow.preview) renderPaid({ ...receiptNow, paidWith: previewPaidWith() }, { back: true })
  }).observe(document.getElementById('device') || app, { attributes: true, attributeFilter: ['data-device'] })

  ;['topup', 'checkout', 'paid'].forEach((k) => claws(pageEl(k)))
  renderPacks()
  renderMethods()
  syncPack()
  ssFill()
  ssWalk(0)
  ssLabel()
  syncAgain()
  A.onEnter('topup', enterTopup)
  A.onEnter('checkout', enterCheckout)
  A.onEnter('paid', enterPaid)
  A.onEnter('failed', enterFailed)
  A.onEnter('hit', syncAgain)

  // The Animation tab plays the whole flow by itself. With punchApp.autoplay on, each of these screens moves on after a
  // beat, the way a player taps through them: the preselected Group run, Apple or Google Pay, then Punch now, which
  // links the machine again and starts its count. The timers are the page's own, so leaving the page cancels them.
  if (!('autoplay' in A)) A.autoplay = false
  const AUTO_MS = 2600
  const autoTap = (id) => { if (A.autoplay) A.later(() => { if (A.autoplay) $(id)?.click() }, AUTO_MS) }
  A.onEnter('topup', () => autoTap('payContinue'))
  A.onEnter('checkout', () => {
    // a half typed new card would hold the flow up: the autoplay pays with the wallet instead
    if (A.autoplay && flow.method === 'card') pageEl('checkout').querySelector('[data-method="wallet"]')?.click()
    autoTap('payNow')
  })
  A.onEnter('paid', () => autoTap('payPunchNow'))
})()
