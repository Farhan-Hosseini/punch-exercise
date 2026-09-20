import { open, sleep } from '../a11y/cdp.mjs'
import { writeFile } from 'node:fs/promises'
import { PNG } from 'pngjs'
const APPEAR = process.argv[2] || 'default'
const SCROLLALL = process.argv[3] === 'scrollall'
const c = await open({ W: 1440, H: 900, tag: 'px', motion: 'no-preference' })
await c.boot()
if (APPEAR !== 'default') { await c.js(`document.querySelector('[data-appearance-btn="${APPEAR}"]').click(); 1`); await sleep(1200) }
await c.js(`document.getElementById('openCase').click(); 1`); await sleep(4500)
// state at load, BEFORE any scrolling or clicking
const atLoad = await c.jsn(`[...document.querySelectorAll('.cd-geo-note')].map(b => ({ step: b.dataset.step, cur: b.classList.contains('is-current'), pressed: b.getAttribute('aria-pressed') }))`)
console.log('appearance=' + APPEAR + '  is-current at load (no interaction):', JSON.stringify(atLoad))
if (SCROLLALL) { const H = await c.js(`document.getElementById('caseScroll').scrollHeight`); for (let y=0;y<H;y+=900){ await c.js(`document.getElementById('caseScroll').scrollTo(0,${y});1`); await sleep(70) } }
await c.js(`document.querySelector('.cd-geo-list').scrollIntoView({block:'center'}); 1`); await sleep(2500)
const geo = await c.jsn(`(() => {
  const cur = document.querySelector('.cd-geo-note.is-current') || document.querySelector('.cd-geo-note')
  const d = cur.querySelector('.cd-geo-note-d'); const b = d.getBoundingClientRect(); const bb = cur.getBoundingClientRect()
  const other = [...document.querySelectorAll('.cd-geo-note:not(.is-current)')][0]
  const od = other.querySelector('.cd-geo-note-d'); const ob = od.getBoundingClientRect()
  return { step: cur.dataset.step, cur: cur.classList.contains('is-current'),
    curBg: getComputedStyle(cur).backgroundColor, color: getComputedStyle(d).color,
    fontSize: getComputedStyle(d).fontSize, fontWeight: getComputedStyle(d).fontWeight,
    box: {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)},
    btnBox: {x:Math.round(bb.x),y:Math.round(bb.y),w:Math.round(bb.width),h:Math.round(bb.height)},
    otherBox: {x:Math.round(ob.x),y:Math.round(ob.y),w:Math.round(ob.width),h:Math.round(ob.height)},
    text: d.textContent.trim().slice(0,46) }
})()`)
console.log(JSON.stringify(geo, null, 1))
const shot = await c.send('Page.captureScreenshot', { format: 'png' })
const buf = Buffer.from(shot.result.data, 'base64')
await writeFile(`C:/Claude Database/punch-exercise/tools/tmp/skeptic/pix-${APPEAR}.png`, buf)
const png = PNG.sync.read(buf)
const at = (x,y) => { const i = (png.width*y + x) << 2; return [png.data[i],png.data[i+1],png.data[i+2]] }
const tally = (x0,y0,x1,y1) => { const m = new Map(); for (let y=y0;y<y1;y++) for (let x=x0;x<x1;x++) { const k = at(x,y).join(','); m.set(k,(m.get(k)||0)+1) } return [...m].sort((a,b)=>b[1]-a[1]).slice(0,3) }
// background inside the CURRENT note's padding, left of the text
console.log('current-note bg, inside button padding  :', JSON.stringify(tally(geo.btnBox.x+9, geo.btnBox.y+4, geo.btnBox.x+17, geo.btnBox.y+12)))
console.log('current-note bg, 3px above the note-d   :', JSON.stringify(tally(geo.box.x+2, geo.box.y-4, geo.box.x+40, geo.box.y-1)))
console.log('NON-current-note bg, same offsets       :', JSON.stringify(tally(geo.otherBox.x+2, geo.otherBox.y-4, geo.otherBox.x+40, geo.otherBox.y-1)))
// darkest ink pixel inside the current note-d (the glyph core)
let dark = [255,255,255], dl = 1e9
for (let y=geo.box.y; y<geo.box.y+Math.min(geo.box.h,20); y++) for (let x=geo.box.x; x<geo.box.x+geo.box.w; x++) { const p=at(x,y); const s=p[0]+p[1]+p[2]; if (s<dl){dl=s;dark=p} }
console.log('darkest glyph pixel in current note-d   :', dark.join(','))
console.log('ERRORS', JSON.stringify(c.errs.slice(0,4)))
c.close()
