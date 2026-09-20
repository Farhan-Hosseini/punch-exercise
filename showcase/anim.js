// The Animation tab (anim.css): plays the whole flow on the phone and the live machine beside it (no captions under
// the screens: the two surfaces speak for themselves). It drives the phone only through window.punchApp; the machine follows the phone on its
// own (the punch-flow channel), and this script reads which screen the glass is on from the embedded page.
// It also carries the deep links of the brief drawer and the case study: [data-go-mscreen], [data-go-page] and
// [data-open-case] refine a [data-go-mode] button once app.js has switched the tab.
(() => {
  'use strict'
  if (document.documentElement.dataset.embed === 'machine') return
  const $ = (id) => document.getElementById(id)
  const stage = $('phoneStage'), frame = $('linkedFrame')
  const playBtn = $('animPlay'), resetBtn = $('animReset'), statusEl = $('animStatus'), stepsEl = $('animSteps')
  if (!stage || !playBtn) return
  // the flow's steps, in order (the Animation tab shows only Start and Reset; the status line reads them out)
  const ORDER = ['scan', 'link', 'pay', 'count', 'strike', 'read', 'score', 'hit']
  const steps = stepsEl ? [...stepsEl.querySelectorAll('[data-step]')] : []

  /* ------------------------------------------------------------ where each surface is */
  function phoneState() {
    const app = window.punchApp
    if (!app) return null
    const page = app.page
    if (page === 'scan') return document.querySelector('#mApp .m-scan.is-scanning') ? 'scanning' : 'scan'
    if (page === 'connect') return $('mConnect') && $('mConnect').dataset.state === 'done' ? 'linked' : 'connect'
    if (page === 'punch') return 'punch-' + (($('mPunch') && $('mPunch').dataset.state) || 'wait')
    return page
  }
  function machineState() {
    try {
      const doc = frame && frame.contentDocument
      const m = doc && doc.getElementById('machine')
      if (!m) return null
      return { key: m.dataset.mscreen }
    } catch (e) { return null }
  }
  // where the flow is, from the two surfaces together
  function stepOf(p, m) {
    if (p === 'hit') return 'hit'
    if (m && (m.key === 'record' || m.key === 'result') && p && p.startsWith('punch')) return 'score'
    if (p === 'punch-reading') return 'read'
    if (p === 'punch-landed') return 'strike'
    if (p === 'punch-wait' || p === 'punch-miss') return 'count'
    if (['topup', 'checkout', 'paid'].includes(p)) return 'pay'
    if (p === 'connect' || p === 'linked' || p === 'connected') return 'link'
    if (p === 'scan' || p === 'scanning') return 'scan'
    return null
  }
  const STATUS = {
    scan: 'Scanning the code on the glass.',
    link: 'Linking the phone. A credit is held for the turn.',
    pay: 'Topping up: the wallet was empty, so a pack of credits comes first.',
    count: 'Punch now. The machine counts twenty seconds; the strike lands a few seconds in.',
    strike: 'The strike landed. The phone buzzes.',
    read: 'The glass is reading the strike.',
    score: 'The score lands on the glass.',
    hit: 'Done: the hit is on the phone. Play it again, or scroll down for the clip.',
  }

  let playing = false, lastStep = null, poll = 0
  function tick() {
    const p = phoneState(), m = machineState()
    const step = playing || lastStep ? stepOf(p, m) : null
    if (step !== lastStep) {
      lastStep = step
      const at = ORDER.indexOf(step)
      steps.forEach((li, i) => {
        li.classList.toggle('is-now', i === at)
        li.classList.toggle('is-done', at > -1 && i < at)
        if (i === at) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current')
      })
      if (stepsEl) stepsEl.classList.toggle('is-live', at > -1)
      if (playing && step) statusEl.textContent = STATUS[step]
      if (step === 'hit') {
        steps.forEach((li) => { li.classList.add('is-done'); li.classList.remove('is-now') })
        if (steps.length) steps[steps.length - 1].classList.add('is-now')
        stopPlaying()
      }
    }
  }
  function stopPlaying() {
    playing = false
    if (window.punchApp) window.punchApp.autoplay = false
    playBtn.setAttribute('aria-pressed', 'false')
    playBtn.querySelector('[data-play-label]').textContent = 'Start again'
  }
  const isAnim = () => !stage.hidden && stage.classList.contains('is-anim')
  function watch() {
    const on = isAnim()
    if (on && !poll) { poll = setInterval(tick, 200); tick() }
    if (!on && poll) { clearInterval(poll); poll = 0 }
    // leaving the tab mid run hands the phone back to the visitor: nothing taps itself on the Mobile app tab
    if (!on && playing) stopPlaying()
    // the stage's own heading follows the tab it serves
    const h1 = stage.querySelector('h1')
    if (h1) h1.textContent = on ? 'Animation' : 'Mobile app'
    stage.setAttribute('aria-label', on ? 'The phone and the machine together' : 'PunchApp on a phone')
    clips(on)
  }
  new MutationObserver(watch).observe(stage, { attributes: true, attributeFilter: ['class', 'hidden'] })

  /* ------------------------------------------------------------ play and reset */
  playBtn.addEventListener('click', () => {
    const app = window.punchApp
    if (!app) return
    // an empty wallet plays the buying too, the way the home screen asks for it: the pay screens tap themselves
    // through (pay.js, punchApp.autoplay) until the hit lands, Reset is pressed or the tab changes
    const note = app.credits <= 0 ? ' The wallet is empty, so buying credits comes first.' : ''
    app.autoplay = true
    playing = true
    lastStep = '__'
    playBtn.setAttribute('aria-pressed', 'true')
    playBtn.querySelector('[data-play-label]').textContent = 'Playing'
    statusEl.textContent = 'Starting from the scan.' + note
    app.go('scan')
    app.later(() => { const b = $('mScanBtn'); if (b) b.click() }, 700)
  })
  resetBtn.addEventListener('click', () => {
    const app = window.punchApp
    if (!app) return
    playing = false
    app.autoplay = false
    playBtn.setAttribute('aria-pressed', 'false')
    playBtn.querySelector('[data-play-label]').textContent = 'Start'
    app.go('default')
    lastStep = '__'
    steps.forEach((li) => { li.classList.remove('is-now', 'is-done'); li.removeAttribute('aria-current') })
    if (stepsEl) stepsEl.classList.remove('is-live')
    lastStep = null
    statusEl.textContent = 'Reset. The phone is on its home screen and the glass is at rest.'
  })

  /* ------------------------------------------------------------ the reveal clips play while they are on screen */
  const vids = [...document.querySelectorAll('[data-anim-clip]')]
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)')
  let seen = new Set()
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    for (const e of entries) { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target) }
    clips(isAnim())
  }, { threshold: .35 }) : null
  vids.forEach((v) => { if (io) io.observe(v) })
  function clips(on) {
    for (const v of vids) {
      // reduced motion keeps the still and the controls: nothing starts by itself
      if (on && seen.has(v) && !calm.matches) { if (v.preload === 'none') v.preload = 'auto'; v.play().catch(() => {}) }
      else if (!v.paused && (!on || !seen.has(v))) v.pause()
    }
  }
  // with reduced motion the master still gets controls, so either clip can be played on request
  if (calm.matches) vids.forEach((v) => { v.controls = true })

  /* ------------------------------------------------------------ deep links from the brief and the case study */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-go-mscreen], [data-go-page], [data-open-case], [data-go-anchor]')
    if (!t) return
    // app.js has already closed the drawer and switched the tab on this same click; this finishes the trip
    setTimeout(() => {
      if (t.dataset.goMscreen && window.showcase) window.showcase.mscreen(t.dataset.goMscreen, { from: 'brief' })
      if (t.dataset.goPage && window.punchApp) window.punchApp.go(t.dataset.goPage, { player: 'me' })
      if (t.hasAttribute('data-open-case')) {
        const b = $('openCase')
        if (b) b.click()
        // the dialog slides in first, then the chapter comes to the top
        const id = t.dataset.openCase
        if (id) setTimeout(() => { if (window.caseStudy) window.caseStudy.jump(id) }, 520)
      }
      if (t.dataset.goAnchor) {
        const a = document.getElementById(t.dataset.goAnchor)
        if (a) a.scrollIntoView({ behavior: calm.matches ? 'auto' : 'smooth', block: 'start' })
      }
    }, 60)
  })
})()
