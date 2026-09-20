import { open, sleep } from '../a11y/cdp.mjs'
import { writeFile } from 'node:fs/promises'
const APPEAR = process.argv[2] || 'default'
const c = await open({ W: 1440, H: 900, tag: 'sk', motion: 'no-preference' })
await c.boot()
if (APPEAR !== 'default') { await c.js(`document.querySelector('[data-appearance-btn="${APPEAR}"]').click(); 1`); await sleep(1200) }
await c.js(`document.getElementById('openCase').click(); 1`); await sleep(4500)
// scroll everything so lazy pieces run, then park the geometry board in view
const H = await c.js(`document.getElementById('caseScroll').scrollHeight`)
for (let y = 0; y < H; y += 900) { await c.js(`document.getElementById('caseScroll').scrollTo(0, ${y}); 1`); await sleep(70) }
await c.js(`document.getElementById('caseScroll').scrollTop = 0; 1`); await sleep(2000)
await c.js(`document.querySelector('.cd-geo-list').scrollIntoView({block:'center'}); 1`); await sleep(2500)

const REPORT = `(() => {
  const lin = (v) => v <= 0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4)
  const lum = (c) => 0.2126*lin(c[0]/255)+0.7152*lin(c[1]/255)+0.0722*lin(c[2]/255)
  const ratio = (a,b) => { const l1=lum(a), l2=lum(b); return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05) }
  const p = (s) => { const m = String(s).match(/rgba?\(([^)]+)\)/); if(!m) return null; const q = m[1].split(/[,\/\s]+/).filter(Boolean).map(Number); return [q[0],q[1],q[2], q.length>3?q[3]:1] }
  const over = (f,b) => [f[0]*f[3]+b[0]*(1-f[3]), f[1]*f[3]+b[1]*(1-f[3]), f[2]*f[3]+b[2]*(1-f[3]), 1]
  function bgOf(el) {
    let stack = [], e = el, note = ''
    while (e && e.nodeType === 1) {
      const s = getComputedStyle(e)
      if (s.backgroundImage !== 'none') { note = 'image:'+s.backgroundImage.slice(0,24); break }
      const q = p(s.backgroundColor)
      if (q && q[3] > 0) { stack.unshift(q); if (q[3] >= 0.999) break }
      e = e.parentElement
    }
    let composed = [255,255,255,1]
    for (const l of stack) composed = over(l, composed)
    return { composed, note }
  }
  const fig = document.querySelector('.cs-diagram-light') || document.querySelector('.cs-diagram')
  const chapter = fig && fig.closest('.cs-sec')
  const rows = []
  for (const sel of ['.cd-geo-note-d', '.cd-geo-note-t', '.cd-geo-spec-d']) {
    for (const el of document.querySelectorAll(sel)) {
      const cs = getComputedStyle(el)
      const b = el.getBoundingClientRect()
      const btn = el.closest('.cd-geo-note')
      const { composed, note } = bgOf(el)
      const fg = over(p(cs.color), composed)
      rows.push({ sel, px:+parseFloat(cs.fontSize).toFixed(1), w:parseInt(cs.fontWeight)||400,
        color: cs.color, bg:'rgb('+composed.slice(0,3).map(Math.round).join(',')+')',
        ratio:+ratio(fg, composed).toFixed(3), current: btn ? btn.classList.contains('is-current') : null,
        step: btn ? btn.dataset.step : null, imgBg: note,
        rect: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) },
        text: el.textContent.trim().slice(0, 34) })
    }
  }
  return { chapterClass: chapter ? chapter.className : null,
    figClass: fig ? fig.className : null,
    soft: chapter ? getComputedStyle(chapter).getPropertyValue('--soft').trim() : null,
    cdbg: fig ? getComputedStyle(fig).getPropertyValue('--cd-bg').trim() : null,
    boardBg: (() => { const g = document.querySelector('.cd-geometry'); return g ? bgOf(g).composed.slice(0,3).map(Math.round).join(',') : null })(),
    appearance: document.documentElement.getAttribute('data-appearance') || document.body.getAttribute('data-appearance') || 'n/a',
    rows }
})()`
const r = await c.jsn(REPORT)
console.log('appearance arg:', APPEAR, '| page appearance attr:', r.appearance)
console.log('chapter:', r.chapterClass, '| fig:', r.figClass)
console.log('--soft:', r.soft, '| --cd-bg:', r.cdbg, '| .cd-geometry composited bg:', r.boardBg)
for (const row of r.rows) console.log(
  (row.ratio < 4.5 ? 'FAIL ' : 'pass ') + String(row.ratio).padEnd(6),
  row.sel.padEnd(16), (row.px+'px/'+row.w).padEnd(10),
  (row.color+' on '+row.bg).padEnd(42),
  'cur=' + row.current, 'step=' + row.step, ' "' + row.text + '"')

// real pixel sample from a screenshot, inside the first geo note's description box
const shot = await c.send('Page.captureScreenshot', { format: 'png' })
await writeFile('C:/Claude Database/punch-exercise/tools/tmp/skeptic/geo-' + APPEAR + '.png', Buffer.from(shot.result.data, 'base64'))
console.log('ERRORS', JSON.stringify(c.errs.slice(0, 5)))
c.close()
