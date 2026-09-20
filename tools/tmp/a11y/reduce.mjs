import { open, sleep } from './cdp.mjs'
const MOTION = process.argv[2] === 'reduce' ? 'reduce' : 'no-preference'
const c = await open({ W: 1440, H: 900, tag: 'rr', motion: MOTION })
await c.boot()
console.log('motion =', MOTION, 'matchMedia reduce =', await c.js(`matchMedia('(prefers-reduced-motion: reduce)').matches`))

// effective visibility: walk ancestors for opacity/visibility, and count elements that carry their own text
const HIDDEN = `(() => {
  const out = []
  const eff = (el) => { let o = 1, e = el
    while (e && e.nodeType === 1) { const cs = getComputedStyle(e)
      if (cs.display === 'none' || cs.visibility === 'hidden') return { o: 0, why: cs.display === 'none' ? 'display' : 'visibility' }
      o *= parseFloat(cs.opacity); e = e.parentElement }
    return { o, why: 'opacity' } }
  for (const el of document.querySelectorAll('h1,h2,h3,h4,p,li,dd,dt,b,span,button,a,figcaption')) {
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').trim()
    if (own.length < 4) continue
    if (el.closest('[hidden]') || el.closest('.loader') || el.closest('.deskgate')) continue
    const v = eff(el)
    if (v.o > 0.06) continue
    const b = el.getBoundingClientRect()
    out.push({ sel: el.tagName.toLowerCase() + (el.classList[0] ? '.' + el.classList[0] : ''), text: own.slice(0, 44), opacity: +v.o.toFixed(3), why: v.why, y: Math.round(b.top) })
  }
  return out
})()`
const res = {}
for (const mode of ['mobile', 'machine', 'animation', 'ds']) {
  await c.js(`window.showcase.mode('${mode}'); 1`); await sleep(3000)
  res[mode] = await c.jsn(HIDDEN)
}
// case study: scroll all of it first
await c.js(`window.showcase.mode('machine'); document.getElementById('openCase').click(); 1`); await sleep(4500)
const H = await c.js(`document.getElementById('caseScroll').scrollHeight`)
for (let y = 0; y < H; y += 700) { await c.js(`document.getElementById('caseScroll').scrollTo(0, ${y}); 1`); await sleep(70) }
await sleep(1800)
res.case = await c.jsn(HIDDEN)
// also: do any css animations/transitions remain running under reduce?
res.runningAnimations = await c.jsn(`document.getAnimations().filter(a => a.playState === 'running').map(a => (a.effect && a.effect.target ? (a.effect.target.tagName||'') + '.' + ((a.effect.target.classList||[])[0]||'') : '?') + ' ' + (a.animationName || (a.transitionProperty || ''))).slice(0, 25)`)
console.log(JSON.stringify(Object.fromEntries(Object.entries(res).map(([k, v]) => [k, Array.isArray(v) ? { n: v.filter(x=>x.why==='opacity').length, items: v.filter(x=>x.why==='opacity').slice(0, 20) } : v])), null, 1))
console.log('ERRORS', JSON.stringify(c.errs.slice(0, 6)))
c.close()
