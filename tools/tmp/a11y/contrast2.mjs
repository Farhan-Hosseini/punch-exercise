/* re-measure the suspects, settled, and cross-check the background against a real screenshot pixel */
import { open, sleep } from './cdp.mjs'
import { writeFile, mkdir } from 'node:fs/promises'
const c = await open({ W: 1440, H: 900, tag: 'c2', motion: process.env.MOTION || 'no-preference' })
await c.boot()
await mkdir('build/a11y', { recursive: true })

const STACK = (sel) => `(() => {
  const el = document.querySelector(${JSON.stringify(sel)})
  if (!el) return { missing: true }
  const chain = []
  let e = el, alpha = 1
  while (e && e.nodeType === 1) {
    const s = getComputedStyle(e)
    alpha *= parseFloat(s.opacity)
    chain.push({ tag: e.tagName.toLowerCase() + (e.classList[0] ? '.' + e.classList[0] : ''), bg: s.backgroundColor, bgImg: s.backgroundImage === 'none' ? '' : s.backgroundImage.slice(0, 40), op: s.opacity, pos: s.position, filter: s.filter, bd: s.backdropFilter, blend: s.mixBlendMode, transform: s.transform === 'none' ? '' : s.transform.slice(0, 40) })
    e = e.parentElement
  }
  const cs = getComputedStyle(el)
  const b = el.getBoundingClientRect()
  return { color: cs.color, fontSize: cs.fontSize, fontWeight: cs.fontWeight, effAlpha: +alpha.toFixed(3), rect: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)], chain: chain.slice(0, 8) }
})()`

async function sampleNear(sel, dx, dy) {
  const r = await c.jsn(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height } })()`)
  if (!r) return null
  await sleep(700)
  const r2 = await c.jsn(`(() => { const b = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height } })()`)
  const clip = { x: Math.round(r2.x + dx), y: Math.round(r2.y + dy), width: 4, height: 4, scale: 1 }
  const s = await c.send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: false })
  await writeFile('build/a11y/sample.png', Buffer.from(s.result.data, 'base64'))
  // decode the 4x4 png via the page itself
  const px = await c.js(`(async () => {
    const img = new Image(); img.src = 'data:image/png;base64,${s.result.data}'
    await img.decode()
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height
    const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0)
    const d = cx.getImageData(0, 0, img.width, img.height).data
    return [d[0], d[1], d[2], d[3]].join(',')
  })()`)
  return { clip, px }
}

// 1) the case study hero, settled at the top
await c.js(`window.showcase.mode('machine'); document.getElementById('openCase').click(); 1`); await sleep(5000)
await c.js(`document.getElementById('caseScroll').scrollTop = 0; 1`); await sleep(2500)
console.log('HERO settled at top:')
for (const sel of ['.cs-hero-h1', '.cs-hero-lead', '.cs-hero-by', '.cs-actions a.cs-btn']) {
  const s = await c.jsn(STACK(sel))
  console.log(' ', sel, 'effAlpha=' + s.effAlpha, s.color, s.fontSize, JSON.stringify(s.chain.filter(x => x.op !== '1').map(x => x.tag + ' op=' + x.op)))
}
// same, scrolled away then back (the state the first sweep caught)
await c.js(`document.getElementById('caseScroll').scrollTop = 9000; 1`); await sleep(1200)
const away = await c.jsn(STACK('.cs-hero-h1'))
console.log('HERO while scrolled away: effAlpha =', away.effAlpha)

// 2) .cd-geo-note-d
await c.js(`document.getElementById('caseScroll').scrollTop = 0; 1`); await sleep(800)
const note = await c.jsn(STACK('.cd-geo-note-d'))
console.log('\\n.cd-geo-note-d', JSON.stringify(note, null, 1))
console.log('screenshot pixel just left of the text:', JSON.stringify(await sampleNear('.cd-geo-note-d', -6, 4)))

// 3) .face-tile-n in the Customise panel
await c.js(`document.getElementById('closeCase').click(); 1`); await sleep(1000)
await c.js(`document.getElementById('openCustom').click(); 1`); await sleep(1500)
const face = await c.jsn(STACK('.face-tile-n'))
console.log('\\n.face-tile-n', JSON.stringify(face, null, 1))
console.log('screenshot pixel inside the tile, above the label:', JSON.stringify(await sampleNear('.face-tile-n', 4, -6)))
console.log('ERRORS', JSON.stringify(c.errs.slice(0, 6)))
c.close()
