/* Page sections. Every page on the phone and on the machine is built from sections, and each section pages through its
   own designs (at least five), chosen in Customise under "This screen". The Result screen keeps its older engine
   (app.js, .sec[data-slot] > .vars > .var); everything else uses this one.

   The contract, for anyone building a page:
   - a SECTION is any element with data-sec="key" and data-sec-label="Label" inside a page root:
       machine  article.mscreen[data-mscreen="KEY"]      phone  section.m-page[data-page="KEY"]
   - its DESIGNS are its direct children with data-sv="Design name". The engine shows the chosen one and sets hidden on
     the rest. A section that a script draws itself lists its names instead, data-sv-names="Cards|Podium|Tiles", and has
     no [data-sv] children; the script reads PSec.get(surface, page, key) and renders.
   - the engine sets data-sv-index and data-sv-name on every section, so CSS can follow the choice.
   - data-sec-scope="global" makes a section shared by every page that carries it (the machine's header and sponsor
     strip, the phone's tab bar): one choice, applied to every copy, listed under "Across every screen". Add
     data-sec-for="machine" or "phone" so the row shows only while that surface is on show.
   - document event "psec", detail { surface, page, sec, index, name, el, section, initial }: el is the design now shown
     (or the section itself when it is drawn by a script). It fires when a choice changes; a page's own script also
     starts its designs when its page opens (the "mscreen" event on the machine, "mpage" on the phone).
   State lives in localStorage ("punch-psec.v2"), per page: { "machine/scan": { code: 2 }, "global": { tabbar: 1 } }.
   The embedded machine (?embed=machine) never writes; it follows the page around it through the storage event. */
(() => {
  'use strict'
  const KEY = 'punch-psec.v2'
  const EMBED = document.documentElement.dataset.embed === 'machine'
  let state = {}
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {} } catch { state = {} }
  if (!state || typeof state !== 'object') state = {}
  let timer = 0
  const save = () => {
    if (EMBED) return
    clearTimeout(timer)
    timer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* private window */ } }, 60)
  }

  const ROOT = {
    machine: (page) => document.querySelector(`.mscreen[data-mscreen="${page}"]`),
    phone: (page) => document.querySelector(`.m-page[data-page="${page}"]`),
  }
  const bucket = (surface, page) => (surface === 'global' ? 'global' : `${surface}/${page}`)
  const designsOf = (el) => [...el.children].filter((c) => c.hasAttribute('data-sv'))
  const namesOf = (el) => (el.hasAttribute('data-sv-names')
    ? el.dataset.svNames.split('|').map((s) => s.trim()).filter(Boolean)
    : designsOf(el).map((d, i) => d.dataset.sv || `Design ${i + 1}`))

  // the page's sections in document order, one entry per key (a key may repeat, as the global chrome does)
  function sections(surface, page) {
    let els
    if (surface === 'global') els = [...document.querySelectorAll('[data-sec][data-sec-scope="global"]')]
    else {
      const root = ROOT[surface] && ROOT[surface](page)
      els = root ? [...root.querySelectorAll('[data-sec]:not([data-sec-scope="global"])')] : []
    }
    const byKey = new Map()
    for (const el of els) {
      const key = el.dataset.sec
      if (!byKey.has(key)) byKey.set(key, { key, label: el.dataset.secLabel || key, names: namesOf(el), els: [] })
      byKey.get(key).els.push(el)
    }
    return [...byKey.values()]
  }
  const find = (surface, page, sec) => sections(surface, page).find((s) => s.key === sec)

  function get(surface, page, sec) {
    const s = find(surface, page, sec)
    const n = s ? s.names.length : 0
    const i = ((state[bucket(surface, page)] || {})[sec]) | 0
    return n ? Math.min(Math.max(0, i), n - 1) : 0
  }

  function show(el, i, name) {
    designsOf(el).forEach((d, n) => { d.hidden = n !== i })
    el.dataset.svIndex = String(i)
    el.dataset.svName = name || ''
    return designsOf(el)[i] || el
  }
  function applyOne(surface, page, s, emit, initial) {
    const i = get(surface, page, s.key)
    for (const el of s.els) {
      const shown = show(el, i, s.names[i])
      if (emit) {
        document.dispatchEvent(new CustomEvent('psec', {
          detail: { surface, page, sec: s.key, index: i, name: s.names[i], el: shown, section: el, initial: !!initial },
        }))
      }
    }
  }
  // show the chosen design of every section of a page (quietly, unless emit)
  function apply(surface, page, emit) {
    for (const s of sections(surface, page)) applyOne(surface, page, s, emit, true)
  }
  // quiet: apply and keep the choice without telling anyone (a migration, a reset before a page opens)
  function set(surface, page, sec, i, quiet) {
    const s = find(surface, page, sec)
    if (!s || !s.names.length) return ''
    const n = s.names.length
    i = ((i % n) + n) % n
    const b = bucket(surface, page)
    state[b] = { ...(state[b] || {}), [sec]: i }
    save()
    applyOne(surface, page, s, !quiet, false)
    return s.names[i]
  }
  const step = (surface, page, sec, dir) => set(surface, page, sec, get(surface, page, sec) + dir)
  // the design element now showing in a section (the first copy of it), or the section itself when a script draws it
  function active(surface, page, sec) {
    const s = find(surface, page, sec)
    if (!s) return null
    return designsOf(s.els[0])[get(surface, page, sec)] || s.els[0]
  }
  function pagesOf(surface) {
    const sel = surface === 'machine' ? '.mscreen[data-mscreen]' : '.m-page[data-page]'
    return [...document.querySelectorAll(sel)].map((el) => el.dataset.mscreen || el.dataset.page)
  }
  function applyAll(emit) {
    for (const surface of ['machine', 'phone']) for (const page of pagesOf(surface)) apply(surface, page, emit)
    apply('global', 'all', emit)
  }
  // every choice back to the first design
  function reset() {
    state = {}
    save()
    applyAll(true)
  }

  // the embedded machine follows the page around it: only the sections whose choice moved are told
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return
    let next = {}
    try { next = JSON.parse(e.newValue || '{}') || {} } catch { return }
    const before = state
    state = next
    for (const surface of ['machine', 'phone', 'global']) {
      for (const page of surface === 'global' ? ['all'] : pagesOf(surface)) {
        const b = bucket(surface, page), was = before[b] || {}, now = state[b] || {}
        for (const s of sections(surface, page)) if ((was[s.key] | 0) !== (now[s.key] | 0)) applyOne(surface, page, s, true, false)
      }
    }
  })

  window.PSec = { sections, get, set, step, apply, applyAll, active, reset, pages: pagesOf, get state() { return JSON.parse(JSON.stringify(state)) } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => applyAll(false))
  else applyAll(false)
})()
