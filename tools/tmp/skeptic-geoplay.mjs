/* Skeptic check: does the geometry play/pause button really lack a state signal,
   and does the accessible NAME change reach the platform accessibility tree? */
import { open, sleep } from './a11y/cdp.mjs'
const c = await open({ W: 1600, H: 1000, tag: 'sk', motion: 'no-preference' })
await c.boot()
const out = {}

await c.js(`document.getElementById('openCase').click(); 1`); await sleep(4500)
// scroll the geometry diagram into view so its IntersectionObserver fires
await c.js(`document.querySelector('.cd-geometry').scrollIntoView({block:'center'}); 1`); await sleep(2500)

out.geoExists = await c.js(`!!document.querySelector('.cd-geometry [data-cd-play]')`)
out.motionClass = await c.js(`document.querySelector('.cd-geometry').className`)
out.reducedMotionMatches = await c.js(`matchMedia('(prefers-reduced-motion: reduce)').matches`)

const snap = () => c.jsn(`(() => {
  const b = document.querySelector('.cd-geometry [data-cd-play]')
  const all = document.querySelector('.cd-geometry [data-cd-all]')
  const note = document.querySelector('.cd-geometry .cd-geo-note')
  const g = (el) => el ? ({ tag: el.tagName, aria: el.getAttribute('aria-label'), pressed: el.getAttribute('aria-pressed'),
    state: el.dataset.state, role: el.getAttribute('role'), text: el.textContent.trim(), disabled: el.disabled,
    visible: !!el.offsetParent, rect: (r=>({w:Math.round(r.width),h:Math.round(r.height)}))(el.getBoundingClientRect()) }) : null
  return { play: g(b), allBtn: g(all), firstNote: g(note), step: document.querySelector('.cd-geometry').dataset.step,
           focusIsPlay: document.activeElement === b }
})()`)

out.before = await snap()

// AX node before
await c.send('Accessibility.enable')
async function ax(sel) {
  const ev = await c.send('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(sel)})` })
  const objectId = ev.result.result.objectId
  const res = await c.send('Accessibility.getPartialAXTree', { objectId, fetchRelatives: false })
  const n = res.result.nodes[0]
  return { role: n.role?.value, name: n.name?.value, props: (n.properties||[]).map(p => p.name + '=' + JSON.stringify(p.value?.value)) }
}
out.axPlayBefore = await ax('.cd-geometry [data-cd-play]')
out.axAllBefore  = await ax('.cd-geometry [data-cd-all]')
out.axNoteBefore = await ax('.cd-geometry .cd-geo-note')

// focus the play button for real, then activate with the keyboard
await c.js(`document.querySelector('.cd-geometry [data-cd-play]').focus(); 1`); await sleep(300)
out.focused = await c.js(`document.activeElement === document.querySelector('.cd-geometry [data-cd-play]')`)
await c.key('Enter', { wait: 600 })
out.afterEnter1 = await snap()
out.axPlayAfter1 = await ax('.cd-geometry [data-cd-play]')
await c.key('Enter', { wait: 600 })
out.afterEnter2 = await snap()
out.axPlayAfter2 = await ax('.cd-geometry [data-cd-play]')

// the run diagram's transport button, for comparison of house pattern
out.axRunPlay = await ax('.cd-run [data-cd-play]').catch(() => null)
out.runLabels = await c.jsn(`(() => { const b=document.querySelector('.cd-run [data-cd-play]'); return b?{aria:b.getAttribute('aria-label'),pressed:b.getAttribute('aria-pressed'),state:b.dataset.state}:null })()`)
// state diagram's replay button
out.stateReplay = await c.jsn(`(() => { const b=document.querySelector('.cd-state [data-cd-replay],.cd-state .cd-btn'); return b?{aria:b.getAttribute('aria-label'),pressed:b.getAttribute('aria-pressed'),text:b.textContent.trim()}:null })()`)

// every aria-pressed in the case overlay, to see whether the house uses it for transport anywhere
out.pressedCensus = await c.jsn(`[...document.querySelectorAll('#case [aria-pressed]')].map(e=>({cls:e.className,t:e.textContent.trim().slice(0,32),p:e.getAttribute('aria-pressed')})).slice(0,40)`)
out.errs = c.errs.slice(0, 10)
console.log(JSON.stringify(out, null, 1))
c.close()
