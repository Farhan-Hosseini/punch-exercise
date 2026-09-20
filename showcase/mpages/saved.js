/* Phone: saving a hit for later.

   Round eleven cut the Saved page and its lists: a save is now one mark on the attempt, nothing to manage. Every save
   button on the phone carries data-save-key (the reel's rail, the feed's posts, Your hit's header); a tap marks the
   attempt or takes the mark off, and says so. The marks live in localStorage
   "punch-saved.v2" ({ keys: [] }) so they survive a reload, and the document event "saved" { key } tells the pages
   drawing those buttons to repaint. API: window.punchSaved (has, save, remove, paint). */
(() => {
  'use strict'
  const app = document.getElementById('mApp')
  if (!app) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const KEY = 'punch-saved.v2'
  let keys = []
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && Array.isArray(s.keys)) keys = s.keys } catch { /* storage unavailable: the marks live for this visit */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ keys })) } catch { /* nothing to keep it in */ } }
  const has = (key) => keys.includes(key)
  const A = () => window.punchApp

  function paintButtons(root = document) {
    root.querySelectorAll('[data-save-key]').forEach((b) => {
      const on = has(b.dataset.saveKey)
      b.classList.toggle('is-on', on)
      b.setAttribute('aria-pressed', String(on))
      b.setAttribute('aria-label', on ? 'Saved. Tap to remove' : 'Save this hit for later')
      const l = b.querySelector('[data-save-label]')
      if (l) l.textContent = on ? 'Saved' : 'Save'
    })
  }
  const changed = (key) => {
    save()
    paintButtons()
    document.dispatchEvent(new CustomEvent('saved', { detail: { key } }))
  }
  const pop = (b) => {
    if (reduced.matches) return
    const i = b.querySelector('svg')
    if (i && i.animate) i.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.2, 1.6, .4, 1)' })
  }
  const toast = (t) => { if (A() && A().toast) A().toast(t) }

  function tap(b) {
    const key = b.dataset.saveKey
    if (!key) return
    if (has(key)) {
      keys = keys.filter((k) => k !== key)
      changed(key)
      toast('Removed from your saved hits')
      return
    }
    keys.push(key)
    changed(key)
    pop(b)
    toast('Saved for later')
  }

  app.addEventListener('click', (e) => {
    const b = e.target.closest('[data-save-key]')
    if (!b || !app.contains(b)) return
    e.preventDefault()
    e.stopPropagation()
    tap(b)
  }, true)

  window.punchSaved = { has, save: (key) => { if (!has(key)) { keys.push(key); changed(key) } }, remove: (key) => { keys = keys.filter((k) => k !== key); changed(key) }, paint: paintButtons, keys: () => [...keys] }
  paintButtons()
})()
