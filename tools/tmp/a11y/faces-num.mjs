import { open, sleep } from './cdp.mjs'
const c = await open({ W: 1440, H: 950, tag: 'fn', motion: 'no-preference' })
await c.boot()
await c.js(`window.showcase.mode('machine'); document.getElementById('openCustom').click(); 1`); await sleep(1800)
console.log(await c.js(`(() => {
  const srgbLin = (v) => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  const lum = (c) => 0.2126 * srgbLin(c[0]/255) + 0.7152 * srgbLin(c[1]/255) + 0.0722 * srgbLin(c[2]/255)
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05) }
  const over = (fg, bg) => { const a = fg[3]; return [fg[0]*a+bg[0]*(1-a), fg[1]*a+bg[1]*(1-a), fg[2]*a+bg[2]*(1-a), 1] }
  const rgb = (s) => { const p = s.match(/[0-9.]+/g).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1] }
  const panel = rgb(getComputedStyle(document.querySelector('.custom-body')).backgroundColor)
  const tile = document.querySelector('.face-tile')
  const chip = over(rgb(getComputedStyle(tile).backgroundColor), panel)
  const rows = []
  for (const sel of ['.face-tile-s', '.face-tile-n']) {
    const el = tile.querySelector(sel), cs = getComputedStyle(el)
    const ink = rgb(cs.color); ink[3] *= parseFloat(cs.opacity)
    rows.push({ sel, color: cs.color, opacity: cs.opacity, px: cs.fontSize, weight: cs.fontWeight,
      ratio: +ratio(over(ink, chip), chip).toFixed(2),
      need: (parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && parseInt(cs.fontWeight) >= 700)) ? 3 : 4.5 })
  }
  return JSON.stringify({ appearance: document.documentElement.dataset.appearance,
    shellPill: getComputedStyle(document.documentElement).getPropertyValue('--shell-pill').trim(),
    panelBg: 'rgb(' + panel.slice(0,3).map(Math.round).join(',') + ')',
    tileBgDeclared: getComputedStyle(tile).backgroundColor,
    chipComposited: 'rgb(' + chip.slice(0,3).map(Math.round).join(',') + ')', rows }, null, 1)
})()`))
c.close()
