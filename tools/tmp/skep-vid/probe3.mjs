import { open, sleep } from '../a11y/cdp.mjs'
import { writeFileSync } from 'node:fs'
const MOTION = process.env.MOTION || 'reduce'
const c = await open({ W: 1600, H: 1000, motion: MOTION, tag: 'skepvid3' })
await c.boot()
await c.js(`window.showcase.mode('animation'); 1`); await sleep(3500)
// establish real window focus with one real Tab
await c.key('Tab', { wait: 200 })
console.log('MOTION=' + MOTION + ' hasFocus=' + await c.js('document.hasFocus()'))

async function cap(clip) {
  const s = await c.send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 } })
  return s.result.data
}
// put the top of the tall clip at y=200 so the whole ring region is on screen
await c.js(`(()=>{const v=document.querySelector('.anim-fig-tall .anim-clip');const r=v.getBoundingClientRect();window.scrollBy(0, r.top-200);return 1})()`)
await sleep(600)
const box = await c.jsn(`(()=>{const v=document.querySelector('.anim-fig-tall .anim-clip');const r=v.getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,w:r.width,h:r.height}})()`)
console.log('tall clip rect', JSON.stringify(box))
const clip = { x: Math.max(0, box.x - 24), y: Math.max(0, box.y - 24), width: box.w + 48, height: 260 }

// blurred baseline
await c.js(`document.activeElement&&document.activeElement.blur&&document.activeElement.blur();1`); await sleep(300)
const off = await cap(clip)
// focus the video by REAL keyboard tab (walk until it lands)
let ok = false
for (let i = 0; i < 140; i++) {
  await c.key('Tab', { wait: 40 })
  if (await c.js(`!!(document.activeElement&&document.activeElement.matches&&document.activeElement.matches('.anim-fig-tall .anim-clip'))`)) { ok = true; break }
}
console.log('tabbed onto video:', ok, await c.js(`(()=>{const a=document.activeElement,cs=getComputedStyle(a);return a.tagName+' fv='+a.matches(':focus-visible')+' outline='+cs.outlineStyle+' '+cs.outlineWidth+' '+cs.outlineColor+' off='+cs.outlineOffset})()`))
await c.js(`(()=>{const v=document.querySelector('.anim-fig-tall .anim-clip');const r=v.getBoundingClientRect();window.scrollBy(0, r.top-200);return 1})()`); await sleep(400)
const on = await cap(clip)
console.log('VIDEO  focused-vs-blurred screenshots identical? ' + (off === on) + '  (bytes ' + off.length + ' vs ' + on.length + ')')
writeFileSync(new URL('./vid-off-' + MOTION + '.png', import.meta.url), Buffer.from(off, 'base64'))
writeFileSync(new URL('./vid-on-' + MOTION + '.png', import.meta.url), Buffer.from(on, 'base64'))

// POSITIVE CONTROL: the same treatment on a link that we know paints a ring
await c.js(`(()=>{const a=document.querySelector('.anim-piece-tall .anim-files a');a.scrollIntoView({block:'center'});return 1})()`); await sleep(500)
const lb = await c.jsn(`(()=>{const a=document.querySelector('.anim-piece-tall .anim-files a');const r=a.getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,w:r.width,h:r.height}})()`)
const lclip = { x: Math.max(0, lb.x - 16), y: Math.max(0, lb.y - 16), width: lb.w + 32, height: lb.h + 32 }
await c.js(`document.activeElement&&document.activeElement.blur&&document.activeElement.blur();1`); await sleep(250)
const loff = await cap(lclip)
for (let i = 0; i < 140; i++) { await c.key('Tab', { wait: 40 }); if (await c.js(`!!(document.activeElement&&document.activeElement.matches&&document.activeElement.matches('.anim-piece-tall .anim-files a'))`)) break }
await sleep(250)
const lon = await cap(lclip)
console.log('CONTROL link focused-vs-blurred identical? ' + (loff === lon))
writeFileSync(new URL('./link-off.png', import.meta.url), Buffer.from(loff, 'base64'))
writeFileSync(new URL('./link-on.png', import.meta.url), Buffer.from(lon, 'base64'))
c.close()
