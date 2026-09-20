import { open, sleep } from '../a11y/cdp.mjs'
import { writeFileSync } from 'node:fs'
const MOTION = process.env.MOTION || 'reduce'
const FOCUSEMU = process.env.FOCUSEMU === '1'
const c = await open({ W: 1600, H: 1000, motion: MOTION, tag: 'skepvid2' })
if (FOCUSEMU) { try { await c.send('Emulation.setFocusEmulationEnabled', { enabled: true }) } catch (e) { console.log('focusemu fail', e.message) } }
await c.boot()
if (FOCUSEMU) { try { await c.send('Emulation.setFocusEmulationEnabled', { enabled: true }) } catch {} }
await c.js(`window.showcase.mode('animation'); 1`); await sleep(3500)
console.log(`--- MOTION=${MOTION} FOCUSEMU=${FOCUSEMU} hasFocus=${await c.js('document.hasFocus()')} reduce=${await c.js(`matchMedia('(prefers-reduced-motion: reduce)').matches`)}`)

const M = `(()=>{const a=document.activeElement;if(!a)return null;const cs=getComputedStyle(a);
 const b=a.getBoundingClientRect();
 return JSON.stringify({tag:a.tagName,cls:(typeof a.className==='string'?a.className:'').slice(0,40),
  label:(a.getAttribute('aria-label')||a.textContent||'').trim().slice(0,45),
  f:a.matches(':focus'),fv:a.matches(':focus-visible'),
  outline:cs.outlineStyle+' '+cs.outlineWidth+' '+cs.outlineColor+' off='+cs.outlineOffset,
  box:cs.boxShadow.slice(0,50), x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)});})()`

async function shot(name, clip) {
  const s = await c.send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 } })
  writeFileSync(new URL('./' + name + '.png', import.meta.url), Buffer.from(s.result.data, 'base64'))
}

// ---- CONTROL: a plain button in the same section, same run
await c.js(`document.querySelector('#animPlay,.anim-play,button').scrollIntoView({block:'center'}); 1`); await sleep(400)
await c.js(`(()=>{const b=document.querySelector('#animPlay')||document.querySelector('main:not([hidden]) button');b.focus();return b.id||b.className})()`)
await sleep(200)
console.log('CONTROL button, programmatic focus:', await c.js(M))
// control via real Tab: shift-tab back one then tab forward
await c.key('Tab', { wait: 120 }); 
console.log('CONTROL after real Tab        :', await c.js(M))
const cb = JSON.parse(await c.js(M))
await shot('control-' + MOTION + (FOCUSEMU ? '-fe' : ''), { x: Math.max(0, cb.x - 12), y: Math.max(0, cb.y - 12), width: Math.min(cb.w + 24, 600), height: Math.min(cb.h + 24, 200) })

// ---- TARGET: the tall reveal clip, top edge in view
await c.js(`(()=>{const v=document.querySelector('.anim-fig-tall .anim-clip');const r=v.getBoundingClientRect();window.scrollBy(0, r.top - 120);return 1})()`)
await sleep(500)
await c.js(`document.activeElement&&document.activeElement.blur&&document.activeElement.blur();1`)
let found = false
for (let i = 0; i < 120; i++) {
  await c.key('Tab', { wait: 45 })
  if (await c.js(`!!(document.activeElement&&document.activeElement.matches&&document.activeElement.matches('.anim-fig-tall .anim-clip'))`)) { found = true; console.log('reached tall clip on tab #' + (i + 1)); break }
}
if (!found) console.log('TALL CLIP IS NOT REACHABLE BY TAB in this state')
else {
  console.log('TARGET video after real Tab   :', await c.js(M))
  const tb = JSON.parse(await c.js(M))
  await shot('tall-top-' + MOTION + (FOCUSEMU ? '-fe' : ''), { x: Math.max(0, tb.x - 30), y: Math.max(0, tb.y - 30), width: tb.w + 60, height: 220 })
  // bottom edge / controls bar
  await c.js(`(()=>{const v=document.querySelector('.anim-fig-tall .anim-clip');const r=v.getBoundingClientRect();window.scrollBy(0, r.bottom - 800);return 1})()`)
  await sleep(400)
  const tb2 = JSON.parse(await c.js(M))
  console.log('after scroll, still focused?  :', JSON.stringify({ f: tb2.f, fv: tb2.fv, outline: tb2.outline }))
  await shot('tall-bottom-' + MOTION + (FOCUSEMU ? '-fe' : ''), { x: Math.max(0, tb2.x - 30), y: Math.max(0, tb2.y + tb2.h - 190), width: tb2.w + 60, height: 220 })
}
// what does a link report, for a second control
await c.js(`(()=>{const a=document.querySelector('.anim-files a');a.scrollIntoView({block:'center'});a.focus();return 1})()`); await sleep(250)
console.log('CONTROL link, programmatic     :', await c.js(M))
console.log('errors:', JSON.stringify(c.errs.slice(0, 4)))
c.close()
