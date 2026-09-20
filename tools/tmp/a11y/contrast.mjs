/* Contrast, measured from computed colours and composited by hand.
   Deliberately NOT sampled from a screenshot: antialiasing and the scaled machine panel would both lie.
   Limits, stated up front and enforced in code:
     - any element whose background stack contains a gradient / image, a backdrop-filter, a filter,
       a mix-blend-mode, or an ancestor transform+overlap is reported as UNMEASURABLE, never as a pass.
     - ancestor opacity is folded into the text colour.
     - colours are converted to sRGB in JS (oklab/oklch/lab/lch/color()), never through a canvas. */
import { open, sleep } from './cdp.mjs'
const c = await open({ W: 1440, H: 900, tag: 'ct', motion: 'no-preference' })
await c.boot()
if (process.argv[2] === 'light') { await c.js(`document.querySelector('[data-appearance-btn="light"]').click(); 1`); await sleep(900) }

const LIB = `
const srgbLin = (v) => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
const linSrgb = (v) => v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055
function oklabToSrgb(L, a, bb) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * bb
  const m_ = L - 0.1055613458 * a - 0.0638541728 * bb
  const s_ = L - 0.0894841775 * a - 1.2914855480 * bb
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3
  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  return [linSrgb(r), linSrgb(g), linSrgb(b)].map((x) => Math.max(0, Math.min(1, x)) * 255)
}
function labToSrgb(L, a, bb) {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - bb / 200
  const f = (t) => t > 6 / 29 ? t ** 3 : 3 * (6 / 29) ** 2 * (t - 4 / 29)
  const X = 0.9642956 * f(fx), Y = 1.0 * f(fy), Z = 0.8251046 * f(fz)
  const r = 3.1338561 * X - 1.6168667 * Y - 0.4906146 * Z
  const g = -0.9787684 * X + 1.9161415 * Y + 0.0334540 * Z
  const b = 0.0719453 * X - 0.2289914 * Y + 1.4052427 * Z
  return [linSrgb(r), linSrgb(g), linSrgb(b)].map((x) => Math.max(0, Math.min(1, x)) * 255)
}
// returns [r,g,b,a] in 0-255 / 0-1, or null when the string is a form we refuse to guess at
function parse(str) {
  if (!str) return null
  str = str.trim()
  if (str === 'transparent') return [0, 0, 0, 0]
  let m = str.match(/^rgba?\\(([^)]+)\\)$/)
  if (m) { const p = m[1].split(/[,\\/\\s]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1] }
  m = str.match(/^color\\(srgb ([^)]+)\\)$/)
  if (m) { const p = m[1].split(/[\\/\\s]+/).filter(Boolean).map(Number); return [p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1] }
  m = str.match(/^oklab\\(([^)]+)\\)$/)
  if (m) { const p = m[1].split(/[\\/\\s]+/).filter(Boolean).map((x) => parseFloat(x) * (x.includes('%') ? 0.01 : 1)); const [r, g, b] = oklabToSrgb(p[0], p[1], p[2]); return [r, g, b, p.length > 3 ? p[3] : 1] }
  m = str.match(/^oklch\\(([^)]+)\\)$/)
  if (m) { const p = m[1].split(/[\\/\\s]+/).filter(Boolean).map((x) => parseFloat(x) * (x.includes('%') && x !== m[1].split(/[\\/\\s]+/)[1] ? 0.01 : 1))
    const L = parseFloat(m[1].split(/[\\/\\s]+/)[0]) * (m[1].includes('%') ? 0.01 : 1), C = p[1], h = (p[2] || 0) * Math.PI / 180
    const [r, g, b] = oklabToSrgb(L, C * Math.cos(h), C * Math.sin(h)); return [r, g, b, p.length > 3 ? p[3] : 1] }
  m = str.match(/^lab\\(([^)]+)\\)$/)
  if (m) { const p = m[1].split(/[\\/\\s]+/).filter(Boolean).map(parseFloat); const [r, g, b] = labToSrgb(p[0], p[1], p[2]); return [r, g, b, p.length > 3 ? p[3] : 1] }
  m = str.match(/^lch\\(([^)]+)\\)$/)
  if (m) { const p = m[1].split(/[\\/\\s]+/).filter(Boolean).map(parseFloat); const h = (p[2] || 0) * Math.PI / 180; const [r, g, b] = labToSrgb(p[0], p[1] * Math.cos(h), p[1] * Math.sin(h)); return [r, g, b, p.length > 3 ? p[3] : 1] }
  return null
}
const over = (fg, bg) => { const a = fg[3]; return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1] }
const lum = (c) => 0.2126 * srgbLin(c[0] / 255) + 0.7152 * srgbLin(c[1] / 255) + 0.0722 * srgbLin(c[2] / 255)
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) }
`

const SWEEP = `(() => {
  ${LIB}
  const out = []
  const unmeasurable = []
  const seenColors = new Set()
  const els = [...document.querySelectorAll('h1,h2,h3,h4,h5,p,li,dt,dd,span,b,i,a,button,label,summary,output,figcaption,td,th,small,strong,em')]
  for (const el of els) {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim()
    if (own.length < 3) continue
    if (el.closest('[hidden]') || el.closest('[aria-hidden="true"]') || el.closest('.loader') || el.closest('.deskgate')) continue
    if (el.matches(':disabled') || el.closest(':disabled')) continue
    const b = el.getBoundingClientRect()
    if (b.width < 3 || b.height < 3) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') continue
    seenColors.add(cs.color)
    // fold ancestor opacity into the text alpha
    let alpha = 1, e = el, blocked = ''
    while (e && e.nodeType === 1) {
      const s = getComputedStyle(e)
      alpha *= parseFloat(s.opacity)
      if (s.filter !== 'none') blocked = blocked || 'filter'
      if (s.backdropFilter && s.backdropFilter !== 'none') blocked = blocked || 'backdrop-filter'
      if (s.mixBlendMode !== 'normal') blocked = blocked || 'mix-blend-mode'
      e = e.parentElement
    }
    if (alpha < 0.02) continue
    // composite the background stack
    let bg = null, stack = [], gradient = ''
    e = el
    while (e && e.nodeType === 1) {
      const s = getComputedStyle(e)
      if (s.backgroundImage !== 'none') { gradient = s.backgroundImage.slice(0, 30); break }
      const p = parse(s.backgroundColor)
      if (!p) { gradient = 'unparsed:' + s.backgroundColor; break }
      if (p[3] > 0) { stack.unshift(p); if (p[3] >= 0.999) { bg = p; break } }
      e = e.parentElement
    }
    if (gradient) { unmeasurable.push({ sel: el.tagName.toLowerCase() + (el.classList[0] ? '.' + el.classList[0] : ''), text: own.slice(0, 32), why: gradient }); continue }
    if (!bg) bg = [0, 0, 0, 1]
    let composed = bg
    for (const layer of stack) composed = over(layer, composed)
    const fg = parse(cs.color)
    if (!fg) { unmeasurable.push({ sel: el.tagName.toLowerCase(), text: own.slice(0, 32), why: 'color ' + cs.color }); continue }
    const text = over([fg[0], fg[1], fg[2], fg[3] * alpha], composed)
    const r = ratio(text, composed)
    const size = parseFloat(cs.fontSize), weight = parseInt(cs.fontWeight) || 400
    const large = size >= 24 || (size >= 18.66 && weight >= 700)
    const need = large ? 3 : 4.5
    if (r + 0.02 < need) out.push({ sel: el.tagName.toLowerCase() + (el.classList[0] ? '.' + el.classList[0] : ''),
      path: (() => { let p = [], x = el; while (x && x.nodeType === 1 && p.length < 4) { p.unshift(x.tagName.toLowerCase() + (x.classList && x.classList[0] ? '.' + x.classList[0] : '')); x = x.parentElement } return p.join('>') })(),
      text: own.slice(0, 40), ratio: +r.toFixed(2), need, px: +size.toFixed(1), weight,
      color: cs.color, alpha: +alpha.toFixed(2), bg: 'rgb(' + composed.slice(0, 3).map(Math.round).join(',') + ')' })
  }
  return { fails: out, unmeasurable, colorForms: [...seenColors].slice(0, 12) }
})()`

const res = {}
for (const mode of ['mobile', 'machine', 'animation', 'ds']) {
  await c.js(`window.showcase.mode('${mode}'); 1`); await sleep(3000)
  res[mode] = await c.jsn(SWEEP)
}
await c.js(`window.showcase.mode('machine'); document.getElementById('openCase').click(); 1`); await sleep(4500)
const H = await c.js(`document.getElementById('caseScroll').scrollHeight`)
for (let y = 0; y < H; y += 900) { await c.js(`document.getElementById('caseScroll').scrollTo(0, ${y}); 1`); await sleep(60) }
await c.js(`document.getElementById('caseScroll').scrollTop = 0; 1`); await sleep(2500)
res.case = await c.jsn(SWEEP)
await c.js(`document.getElementById('closeCase').click(); 1`); await sleep(900)
await c.js(`document.getElementById('openCustom').click(); 1`); await sleep(1200)
res.custom = await c.jsn(SWEEP)

for (const [k, v] of Object.entries(res)) {
  const worst = v.fails.sort((a, b) => a.ratio - b.ratio)
  console.log('\\n== ' + k + ' == fails:' + v.fails.length + ' unmeasurable:' + v.unmeasurable.length)
  console.log('  colour forms seen: ' + JSON.stringify(v.colorForms.slice(0, 5)))
  for (const u of v.unmeasurable.slice(0, 6)) console.log('  ? ' + u.sel + ' "' + u.text + '" ' + u.why)
  for (const f of worst.slice(0, 10)) console.log('  ' + f.ratio + '/' + f.need + '  ' + f.px + 'px w' + f.weight + '  ' + f.color + ' a=' + f.alpha + ' on ' + f.bg + '  ' + f.path + '  "' + f.text + '"')
}
console.log('ERRORS', JSON.stringify(c.errs.slice(0, 6)))
c.close()
