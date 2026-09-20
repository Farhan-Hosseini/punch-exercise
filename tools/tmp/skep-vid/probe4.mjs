import { open, sleep } from '../a11y/cdp.mjs'
import { writeFileSync } from 'node:fs'
const MOTION = process.env.MOTION || 'reduce'
const c = await open({ W: 1600, H: 1000, motion: MOTION, tag: 'skepvid4' })
await c.boot()
await c.js(`window.showcase.mode('animation'); 1`); await sleep(3500)
await c.key('Tab', { wait: 200 })
console.log('== MOTION=' + MOTION + ' hasFocus=' + await c.js('document.hasFocus()'))
console.log('controls attr now: ' + await c.js(`[...document.querySelectorAll('[data-anim-clip]')].map(v=>(v.closest('figure').className.split(' ').pop())+'='+v.controls).join(' ')`))

const cap = async (clip) => (await c.send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 } })).result.data
const rect = (sel) => c.jsn(`(()=>{const e=document.querySelector('${sel}');if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,w:r.width,h:r.height}})()`)

async function ringTest(sel, name) {
  const b = await rect(sel); if (!b) return console.log(name + ': MISSING')
  await c.js(`document.querySelector('${sel}').scrollIntoView({block:'center'});1`); await sleep(450)
  const clip = { x: Math.max(0, b.x - 24), y: Math.max(0, b.y - 24), width: b.w + 48, height: Math.min(b.h + 48, 240) }
  await c.js(`document.activeElement&&document.activeElement.blur&&document.activeElement.blur();1`); await sleep(250)
  const off = await cap(clip)
  let reached = false
  for (let i = 0; i < 150; i++) { await c.key('Tab', { wait: 38 }); if (await c.js(`!!(document.activeElement&&document.activeElement.matches&&document.activeElement.matches('${sel}'))`)) { reached = true; break } }
  if (!reached) { console.log(name + ': NOT TAB-REACHABLE (' + (b.w|0) + 'x' + (b.h|0) + ')'); return }
  const st = await c.js(`(()=>{const a=document.activeElement,cs=getComputedStyle(a);return 'fv='+a.matches(':focus-visible')+' outline='+cs.outlineStyle+' '+cs.outlineWidth+' off='+cs.outlineOffset})()`)
  await sleep(250)
  const on = await cap(clip)
  console.log(name + ': tab-reachable YES | ' + st + ' | ringPainted=' + (off !== on))
  writeFileSync(new URL('./' + name + '-on-' + MOTION + '.png', import.meta.url), Buffer.from(on, 'base64'))
}
await ringTest('.anim-fig-tall .anim-clip', 'reveal-tall')
await ringTest('.anim-fig-master .anim-clip', 'run-master')
await ringTest('.anim-fig-pres .anim-clip', 'run-pres')

// causal test: remove the wrapper clip and retry the tall one
if (MOTION === 'reduce') {
  await c.js(`(()=>{const s=document.createElement('style');s.textContent='.anim-glass{overflow:visible !important}';document.head.appendChild(s);return 1})()`)
  await sleep(300)
  await ringTest('.anim-fig-tall .anim-clip', 'reveal-tall-OVERFLOWVISIBLE')
  // and the UA control bar at the bottom of the tall clip
  const b = await rect('.anim-fig-tall .anim-clip')
  await c.js(`(()=>{const v=document.querySelector('.anim-fig-tall .anim-clip');const r=v.getBoundingClientRect();window.scrollBy(0,r.bottom-700);return 1})()`); await sleep(400)
  writeFileSync(new URL('./tall-bottombar.png', import.meta.url), Buffer.from(await cap({ x: b.x - 20, y: b.y + b.h - 200, width: b.w + 40, height: 230 }), 'base64'))
}
c.close()
