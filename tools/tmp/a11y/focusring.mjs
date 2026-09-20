import { open, sleep } from './cdp.mjs'
const MODE = process.argv[2] || 'mobile'
const OPEN = process.argv[3] || ''
const N = Number(process.argv[4] || 160)
const c = await open({ W: 1600, H: 1000, tag: 'fr', motion: process.env.MOTION || 'no-preference' })
await c.boot()

// a signature of every paint-affecting property, on the element, its descendants, and both pseudos
const SIG = `(() => {
  const a = document.activeElement
  if (!a || a === document.body || a === document.documentElement) return null
  const props = ['boxShadow','borderColor','borderWidth','borderStyle','backgroundColor','backgroundImage','color','opacity','filter','transform','textDecorationLine','content','visibility','scale']
  const one = (el, pe) => { const cs = getComputedStyle(el, pe)
    const paints = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 && !/rgba\([^)]*,\s*0\)/.test(cs.outlineColor)
    const out = paints ? cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor + ' ' + cs.outlineOffset : 'NOOUTLINE'
    return out + '|' + props.map(p => cs[p]).join('|') }
  const nodes = [a, ...a.querySelectorAll('*')].slice(0, 60)
  const sig = nodes.map(n => one(n, null) + '//' + one(n, '::before') + '//' + one(n, '::after')).join('~~')
  const path = (e) => { const p = []; while (e && e.nodeType === 1 && p.length < 5) { p.unshift(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.classList && e.classList[0] ? '.' + e.classList[0] : '')); e = e.parentElement } return p.join('>') }
  const b = a.getBoundingClientRect()
  return { sig, path: path(a), label: (a.getAttribute('aria-label') || a.textContent || '').slice(0, 40).trim(),
           w: Math.round(b.width), h: Math.round(b.height), t: Math.round(b.top), l: Math.round(b.left) }
})()`

await c.js(`window.showcase.mode('${MODE}'); 1`); await sleep(2500)
if (OPEN === 'custom') { await c.js(`document.getElementById('openCustom').click(); 1`); await sleep(1200) }
if (OPEN === 'case') { await c.js(`document.getElementById('openCase').click(); 1`); await sleep(4500) }
if (OPEN === 'brief') { await c.js(`document.getElementById('openBrief').click(); 1`); await sleep(2500) }
if (process.env.NEGCTL) await c.js(`(()=>{const s=document.createElement('style');s.textContent='*:focus-visible,*:focus,*:focus-visible *,*:focus *{outline:none !important;box-shadow:none !important}';document.head.appendChild(s);return 1})()`)
await c.js(`document.activeElement && document.activeElement.blur && document.activeElement.blur(); 1`)

const seen = new Set(); const noRing = []; let stops = 0; let first = null
for (let i = 0; i < N; i++) {
  await c.key('Tab', { wait: 55 })
  const f = await c.jsn(SIG)
  if (!f) continue
  const k = f.path + '|' + f.label + '|' + f.t + ',' + f.l
  if (first === null) first = k
  else if (k === first) break
  if (seen.has(k)) continue
  seen.add(k); stops++
  // blur and re-measure the same element
  const after = await c.jsn(`(() => { const a = document.activeElement; if (!a || !a.blur) return null; window.__last = a; a.blur(); return 1 })()`)
  await sleep(40)
  const u = await c.jsn(`(() => { const a = window.__last; if (!a) return null
    const props = ['boxShadow','borderColor','borderWidth','borderStyle','backgroundColor','backgroundImage','color','opacity','filter','transform','textDecorationLine','content','visibility','scale']
    const one = (el, pe) => { const cs = getComputedStyle(el, pe)
    const paints = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 && !/rgba\([^)]*,\s*0\)/.test(cs.outlineColor)
    const out = paints ? cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor + ' ' + cs.outlineOffset : 'NOOUTLINE'
    return out + '|' + props.map(p => cs[p]).join('|') }
    const nodes = [a, ...a.querySelectorAll('*')].slice(0, 60)
    return nodes.map(n => one(n, null) + '//' + one(n, '::before') + '//' + one(n, '::after')).join('~~') })()`)
  if (u !== null && u === f.sig) noRing.push({ path: f.path, label: f.label, size: f.w + 'x' + f.h })
}
console.log(JSON.stringify({ mode: MODE, open: OPEN, tabStops: stops, noVisibleFocusChange: noRing.length, items: noRing }, null, 1))
console.log('ERRORS', JSON.stringify(c.errs.slice(0, 6)))
c.close()
