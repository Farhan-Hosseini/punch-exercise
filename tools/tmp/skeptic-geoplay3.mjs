/* 1. Is the aria-pressed group next door a SINGLE-SELECT set (a different pattern) or a set of independent toggles?
   2. What does the reporter's proposed fix do to WCAG 2.5.3 Label in Name? Apply it in the live DOM and measure. */
import { open, sleep } from './a11y/cdp.mjs'
const c = await open({ W: 1600, H: 1000, tag: 'sk3', motion: 'no-preference' })
await c.boot()
const out = {}
await c.js(`document.getElementById('openCase').click(); 1`); await sleep(4500)
await c.js(`document.querySelector('.cd-geometry').scrollIntoView({block:'center'}); 1`); await sleep(2000)
// stop the autoplay so the group is stable
await c.js(`document.querySelector('.cd-geometry [data-cd-play]').dataset.state === 'pause' && document.querySelector('.cd-geometry [data-cd-play]').click(); 1`); await sleep(500)

const groupSnap = () => c.jsn(`(() => {
  const g = [...document.querySelectorAll('.cd-geometry [aria-pressed]')]
  return { total: g.length, trueCount: g.filter(e=>e.getAttribute('aria-pressed')==='true').length,
           which: g.filter(e=>e.getAttribute('aria-pressed')==='true').map(e=>e.dataset.step || (e.hasAttribute('data-cd-all')?'all':'?')),
           step: document.querySelector('.cd-geometry').dataset.step }
})()`)
out.group0 = await groupSnap()
await c.js(`document.querySelector('.cd-geo-note[data-step="far"]').click(); 1`); await sleep(500)
out.group1 = await groupSnap()
await c.js(`document.querySelector('.cd-geometry [data-cd-all]').click(); 1`); await sleep(500)
out.group2 = await groupSnap()
out.singleSelect = [out.group0, out.group1, out.group2].every(g => g.trueCount === 1)

// --- simulate the proposed fix: fixed name + aria-pressed
async function ax(sel) {
  const e = await c.send('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(sel)})` })
  const t = await c.send('Accessibility.getPartialAXTree', { objectId: e.result.result.objectId, fetchRelatives: false })
  const n = t.result.nodes[0]
  return { name: n.name?.value, props: (n.properties||[]).map(p => p.name + '=' + JSON.stringify(p.value?.value)) }
}
await c.send('Accessibility.enable')
out.axNow = await ax('.cd-geometry [data-cd-play]')
out.labelInNameNow = await c.jsn(`(() => { const b=document.querySelector('.cd-geometry [data-cd-play]'); const v=b.querySelector('.cd-play-t').textContent.trim(); return {visible:v, accName:b.getAttribute('aria-label'), pass: b.getAttribute('aria-label').toLowerCase().includes(v.toLowerCase())} })()`)

await c.js(`(() => { const b=document.querySelector('.cd-geometry [data-cd-play]'); b.setAttribute('aria-label','Animate the viewing positions'); b.setAttribute('aria-pressed','false'); return 1 })()`)
await sleep(300)
out.axProposedPaused = await ax('.cd-geometry [data-cd-play]')
out.labelInNameProposedPaused = await c.jsn(`(() => { const b=document.querySelector('.cd-geometry [data-cd-play]'); const v=b.querySelector('.cd-play-t').textContent.trim(); return {visible:v, accName:b.getAttribute('aria-label'), pass: b.getAttribute('aria-label').toLowerCase().includes(v.toLowerCase())} })()`)
// press play: the app still rewrites the visible text to "Pause"
await c.js(`document.querySelector('.cd-geometry [data-cd-play]').click(); 1`); await sleep(500)
await c.js(`(() => { const b=document.querySelector('.cd-geometry [data-cd-play]'); b.setAttribute('aria-label','Animate the viewing positions'); b.setAttribute('aria-pressed','true'); return 1 })()`)
await sleep(300)
out.axProposedPlaying = await ax('.cd-geometry [data-cd-play]')
out.labelInNameProposedPlaying = await c.jsn(`(() => { const b=document.querySelector('.cd-geometry [data-cd-play]'); const v=b.querySelector('.cd-play-t').textContent.trim(); return {visible:v, accName:b.getAttribute('aria-label'), pass: b.getAttribute('aria-label').toLowerCase().includes(v.toLowerCase())} })()`)

out.errs = c.errs.slice(0,8)
console.log(JSON.stringify(out, null, 1))
c.close()
