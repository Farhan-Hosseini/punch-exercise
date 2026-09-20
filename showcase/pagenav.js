/* The page bars in two steps: a row of groups (Home, Play, Results on the machine; Default, Play, Pay, Your hits,
   Social on the phone), and under it the screens of the chosen group as a sub row. The screen buttons stay the ones
   app.js and mobile.js already drive ([data-mscreen], [data-page]); this only follows which one is current, lights its
   group and shows that group's screens. A group with one screen has no sub row. Picking a group opens the screen you
   last had in it, or its first. */
(() => {
  'use strict'
  if (document.documentElement.dataset.embed === 'machine') return
  for (const nav of document.querySelectorAll('.pagenav')) {
    const attr = nav.dataset.pagenav
    const groups = [...nav.querySelectorAll('.pagegroups [data-group]')]
    const sub = nav.querySelector('.pagesub')
    const pages = [...sub.querySelectorAll(`[data-${attr}]`)]
    const last = {}
    function sync() {
      const on = pages.find((b) => b.getAttribute('aria-current') === 'page')
      const g = on ? on.dataset.in : groups[0].dataset.group
      if (on) last[g] = on
      groups.forEach((b) => (b.dataset.group === g ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')))
      let n = 0
      pages.forEach((b) => { const mine = b.dataset.in === g; b.hidden = !mine; if (mine) n++ })
      sub.hidden = n < 2
      nav.dataset.group = g
    }
    groups.forEach((b) => b.addEventListener('click', () => {
      const g = b.dataset.group
      const target = last[g] || pages.find((p) => p.dataset.in === g)
      if (target) target.click()
      sync()
    }))
    new MutationObserver(sync).observe(sub, { subtree: true, attributes: true, attributeFilter: ['aria-current'] })
    sync()
  }
})()
