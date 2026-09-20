import { open, sleep } from '../a11y/cdp.mjs'
const APPEAR = process.argv[2] || 'default'
const c = await open({ W: 1440, H: 900, tag: 'sk2', motion: 'no-preference' })
await c.boot()
if (APPEAR !== 'default') { await c.js(`document.querySelector('[data-appearance-btn="${APPEAR}"]').click(); 1`); await sleep(1200) }
await c.js(`document.getElementById('openCase').click(); 1`); await sleep(4500)
const H = await c.js(`document.getElementById('caseScroll').scrollHeight`)
for (let y = 0; y < H; y += 900) { await c.js(`document.getElementById('caseScroll').scrollTo(0, ${y}); 1`); await sleep(70) }
await c.js(`document.getElementById('caseScroll').scrollTop = 0; 1`); await sleep(2000)
await c.js(`document.querySelector('.cd-geo-list').scrollIntoView({block:'center'}); 1`); await sleep(2500)
const r = await c.jsn(`(() => {
  const out = []
  for (const el of document.querySelectorAll('.cd-geo-note-d')) {
    const btn = el.closest('.cd-geo-note')
    const chain = []
    let e = el
    while (e && e.nodeType === 1 && chain.length < 12) {
      const s = getComputedStyle(e)
      chain.push({ tag: e.tagName.toLowerCase() + '.' + (e.classList[0]||''), bc: s.backgroundColor, bi: s.backgroundImage.slice(0,40), op: s.opacity })
      if (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent') break
      e = e.parentElement
    }
    out.push({ current: btn.classList.contains('is-current'), step: btn.dataset.step, color: getComputedStyle(el).color, chain })
  }
  return out
})()`)
console.log(JSON.stringify(r, null, 1))
c.close()
