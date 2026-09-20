import { open, sleep } from './cdp.mjs'
const c = await open({ W: 1440, H: 900, tag: 'im', motion: process.env.MOTION || 'no-preference' })
await c.boot()

const IMG = `(() => {
  const out = { missingAlt: [], emptyAltButLinked: [], svgNoTitle: [], iframes: [], videos: [] }
  for (const im of document.querySelectorAll('img')) {
    const b = im.getBoundingClientRect()
    if (im.closest('[hidden]') || b.width < 2 || getComputedStyle(im).display === 'none') continue
    const alt = im.getAttribute('alt')
    const d = { src: (im.getAttribute('src') || '').split('/').slice(-1)[0], w: Math.round(b.width), h: Math.round(b.height), cls: im.className, parent: im.parentElement ? im.parentElement.className : '' }
    if (alt === null) out.missingAlt.push(d)
    else if (alt.trim() === '') { const a = im.closest('a[href],button'); if (a && !a.textContent.trim() && !a.getAttribute('aria-label')) out.emptyAltButLinked.push({ ...d, host: a.tagName + '.' + a.className }) }
  }
  for (const s of document.querySelectorAll('svg')) {
    const b = s.getBoundingClientRect()
    if (b.width < 2 || s.closest('[hidden]')) continue
    const hidden = s.getAttribute('aria-hidden') === 'true'
    const named = s.getAttribute('aria-label') || s.querySelector('title') || s.getAttribute('role') === 'presentation' || s.getAttribute('role') === 'none'
    const inNamed = s.closest('[aria-label],button,a')
    if (!hidden && !named && !inNamed) out.svgNoTitle.push({ cls: (s.className && s.className.baseVal) || '', w: Math.round(b.width), h: Math.round(b.height), parent: s.parentElement ? s.parentElement.tagName + '.' + (s.parentElement.className.baseVal !== undefined ? s.parentElement.className.baseVal : s.parentElement.className) : '' })
  }
  for (const f of document.querySelectorAll('iframe')) {
    const b = f.getBoundingClientRect()
    out.iframes.push({ title: f.getAttribute('title'), ariaLabel: f.getAttribute('aria-label'), tabindex: f.getAttribute('tabindex'), src: (f.getAttribute('src') || '').slice(0, 60), w: Math.round(b.width), h: Math.round(b.height), hidden: !!f.closest('[hidden]') })
  }
  for (const v of document.querySelectorAll('video')) {
    const b = v.getBoundingClientRect()
    if (b.width < 2) continue
    out.videos.push({ cls: v.className, label: v.getAttribute('aria-label'), controls: v.hasAttribute('controls') || v.controls, tabIndex: v.tabIndex, track: v.querySelectorAll('track').length, w: Math.round(b.width), h: Math.round(b.height), parentOverflow: v.parentElement ? getComputedStyle(v.parentElement).overflow : '' })
  }
  return out
})()`

const res = {}
for (const mode of ['mobile', 'machine', 'animation', 'ds']) {
  await c.js(`window.showcase.mode('${mode}'); 1`); await sleep(2800)
  res[mode] = await c.jsn(IMG)
}
await c.js(`window.showcase.mode('machine'); document.getElementById('openCase').click(); 1`); await sleep(4500)
const H = await c.js(`document.getElementById('caseScroll').scrollHeight`)
for (let y = 0; y < H; y += 900) { await c.js(`document.getElementById('caseScroll').scrollTo(0, ${y}); 1`); await sleep(60) }
await sleep(1500)
res.case = await c.jsn(IMG)
const trim = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { n: v.length, items: v.slice(0, 8) }]))
console.log(JSON.stringify(Object.fromEntries(Object.entries(res).map(([k, v]) => [k, trim(v)])), null, 1))
console.log('ERRORS', JSON.stringify(c.errs.slice(0, 6)))
c.close()
