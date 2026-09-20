import { open, sleep } from './cdp.mjs'
const c = await open({ W: 1600, H: 1000, tag: 'vf' })
await c.boot()
await c.js(`window.showcase.mode('animation'); 1`); await sleep(3000)
await c.js(`document.querySelector('.anim-fig-tall .anim-clip').scrollIntoView({block:'center'}); 1`); await sleep(400)
console.log(await c.js(`(() => {
  const v = document.querySelector('.anim-fig-tall .anim-clip')
  const g = v.closest('.anim-glass')
  const r = (el) => { const cs = getComputedStyle(el); return el.className + ' :: outline=' + cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor + ' off=' + cs.outlineOffset + ' overflow=' + cs.overflow + ' focusVar=' + getComputedStyle(el).getPropertyValue('--focus') + ' tabIndex=' + el.tabIndex }
  const before = r(v)
  v.focus()
  const afterProg = r(v)
  return JSON.stringify({ before, afterProg, glass: r(g), matchesFV: v.matches(':focus-visible'), matchesF: v.matches(':focus'), controls: v.hasAttribute('controls') }, null, 1)
})()`))
// now via real Tab
await c.js(`document.activeElement.blur(); document.querySelector('.anim-fig-master .anim-clip') ? 1 : 1`)
console.log('--- keyboard tab focus ---')
// tab until we land on the tall clip
for (let i = 0; i < 60; i++) {
  await c.key('Tab', { wait: 45 })
  const on = await c.js(`document.activeElement.closest && document.activeElement.closest('.anim-fig-tall') ? document.activeElement.tagName : ''`)
  if (on) {
    console.log(await c.js(`(() => { const a = document.activeElement; const cs = getComputedStyle(a); return JSON.stringify({ tag:a.tagName, cls:a.className, fv:a.matches(':focus-visible'), outline: cs.outlineStyle+' '+cs.outlineWidth+' '+cs.outlineColor+' '+cs.outlineOffset, focusvar: cs.getPropertyValue('--focus') }) })()`))
    break
  }
}
c.close()
