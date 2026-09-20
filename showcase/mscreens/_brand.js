// The machine header's clock (parts/ms-brand.html, [data-ms-clock]): the venue's time, 24 hour, set on load and kept
// to the minute. Only the Venue and clock and Crest designs show it; it costs one timer a minute.
(() => {
  'use strict'
  const fmt = () => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  function tick() {
    const t = fmt()
    document.querySelectorAll('[data-ms-clock]').forEach((el) => { if (el.textContent !== t) el.textContent = t })
  }
  tick()
  const next = () => setTimeout(() => { tick(); next() }, 60000 - (Date.now() % 60000) + 50)
  next()
})()
