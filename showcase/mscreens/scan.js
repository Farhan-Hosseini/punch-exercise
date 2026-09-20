/* Machine screen: Scan (parts/mscreen-scan.html, mscreens/scan.css). One frame of three sections (psec.js): Status,
   Code, How to. This script writes the state on the frame (.scn[data-state]) and every line of copy from the opts the
   flow sends with the "mscreen" event:
     waiting (no opts)   the code waits for a phone, its scan line running
     linked              the phone has scanned it: the player's photo and name, the code behind its tick
     holding             linked, and the player is topping up on the phone; the machine holds the turn
     missed              no punch landed; the machine holds the turn for another go
   Motion (CSS, under .is-live) runs only while this screen is up, and a section restarts from its first beat when
   Customise changes its design ("psec"). The QR tiles are the shared PunchQR (qr.js); they are mounted on load. */
(() => {
  'use strict'
  const host = document.querySelector('.mscreen-scan')
  if (!host) return
  const frame = host.querySelector('.scn')
  if (!frame) return
  const PAGE = 'scan'
  let last = {}

  function player() {
    let list = null
    try { list = window.punchApp && typeof window.punchApp.leaders === 'function' ? window.punchApp.leaders() : null } catch { list = null }
    const me = Array.isArray(list) ? list.find((p) => p.id === 'me') : null
    const name = (me && me.name) || 'Sara Malik'
    return { name, first: name.split(' ')[0], ava: (me && me.ava) || 'assets/app/avatars/sara.jpg' }
  }

  function stateOf(opts) {
    const o = opts || {}
    if (o.missed) return 'missed'
    if (o.linked && o.holding) return 'holding'
    if (o.linked) return 'linked'
    return 'wait'
  }

  // the way in, and which step is lit per state
  const STEPS = ['scan', 'app', 'credit', 'punch']
  const ACTIVE = { wait: 'scan', linked: 'punch', holding: 'credit', missed: 'punch' }

  function copy(s, who) {
    const f = who.first
    return {
      kicker: { wait: 'Next player', linked: 'Player linked', holding: 'Player linked', missed: 'Still your turn' }[s],
      t1: { wait: 'Scan', linked: 'Welcome,', holding: 'Hold tight,', missed: 'Go again,' }[s],
      t2: { wait: 'to play', linked: f, holding: f, missed: f }[s],
      line: {
        wait: 'Waiting for\nyour phone',
        linked: 'Get ready to punch',
        holding: 'Topping up on your phone',
        missed: 'No punch landed, your turn is held',
      }[s],
      who: s === 'wait' ? 'Scan to play' : who.name,
      phrase: { wait: 'Scan the code to play', linked: `${f} is in`, holding: `${f} is topping up`, missed: `Go again, ${f}` }[s],
      crowd: { wait: "Scan to join tonight's board", linked: `${f} joins tonight's board`, holding: `${f} joins once topped up`, missed: `${f} is still up` }[s],
      first: f,
      short: { wait: 'Linked', linked: 'Linked', holding: 'Topping up', missed: 'Go again' }[s],
    }
  }
  function stepText(s, who) {
    const linked = s !== 'wait'
    return {
      scan: linked ? 'Scanned' : 'Point your camera at it',
      app: linked ? `Linked to ${who.first}'s phone` : 'Your phone links here',
      credit: s === 'holding' ? 'Topping up now' : linked ? 'Credit ready' : 'One credit, one punch',
      punch: s === 'missed' ? 'No punch yet, go again' : linked ? 'Get ready to strike' : 'The glass counts you in',
    }
  }

  function paint(opts) {
    last = opts || {}
    const s = stateOf(last)
    const who = player()
    const text = copy(s, who)
    const steps = stepText(s, who)
    frame.dataset.state = s
    frame.querySelectorAll('[data-scn]').forEach((el) => {
      const v = text[el.dataset.scn]
      if (v != null && el.textContent !== v) el.textContent = v
    })
    frame.querySelectorAll('[data-scn-step]').forEach((el) => {
      const v = steps[el.dataset.scnStep]
      if (v != null && el.textContent !== v) el.textContent = v
    })
    frame.querySelectorAll('[data-scn-ava]').forEach((img) => { if (img.getAttribute('src') !== who.ava) img.src = who.ava })
    const on = STEPS.indexOf(ACTIVE[s])
    frame.querySelectorAll('.scn-step').forEach((li) => {
      const i = STEPS.indexOf(li.dataset.step)
      li.classList.toggle('is-done', i < on)
      li.classList.toggle('is-on', i === on)
    })
    frame.style.setProperty('--scn-progress', String(on / (STEPS.length - 1)))
    // the shared code tiles: a linked phone puts the tick over the code; the phone's own view scans while it waits
    frame.querySelectorAll('.pqr').forEach((q) => {
      q.classList.toggle('is-found', s !== 'wait')
      q.classList.toggle('is-scanning', s === 'wait' && q.classList.contains('scd-mock-qr'))
    })
  }

  // restart the CSS motion: drop the live class, force a style pass, put it back (no rAF: a hidden pane never ticks)
  function start() {
    host.classList.remove('is-live')
    void host.offsetWidth
    host.classList.add('is-live')
  }
  function stop() { host.classList.remove('is-live') }

  if (window.PunchQR) window.PunchQR.mountAll(host)
  paint({})
  if (!host.hidden) start()

  document.addEventListener('mscreen', (e) => {
    const { key, opts } = e.detail || {}
    if (key === PAGE) { paint(opts || {}); start() } else stop()
  })
  document.addEventListener('psec', (e) => {
    const d = e.detail || {}
    if (d.surface !== 'machine' || d.page !== PAGE) return
    if (d.el && window.PunchQR) window.PunchQR.mountAll(d.el)
    paint(last)
    if (!host.hidden) start()
  })
})()
