import { open, sleep } from '../a11y/cdp.mjs'
import { writeFileSync } from 'node:fs'
const MOTION = process.env.MOTION || 'reduce'
const c = await open({ W: 1600, H: 1000, motion: MOTION, tag: 'skepvid5' })
await c.boot()
await c.js(`window.showcase.mode('animation'); 1`); await sleep(3500)
await c.key('Tab', { wait: 250 })
const FREEZE = `(async()=>{const vs=[...document.querySelectorAll('video')];for(const v of vs){try{v.pause();if(Math.abs(v.currentTime-0.5)>0.01){v.currentTime=0.5;await new Promise(r=>{v.addEventListener('seeked',r,{once:true});setTimeout(r,700)})}}catch(e){}}return vs.length})()`
const STATE = (sel) => `(()=>{const a=document.activeElement,e=document.querySelector('${sel}');const cs=a?getComputedStyle(a):null;
 return JSON.stringify({hasFocus:document.hasFocus(),isTarget:a===e,tag:a?a.tagName:null,
  f:a?a.matches(':focus'):null,fv:a?a.matches(':focus-visible'):null,
  outline:cs?cs.outlineStyle+' '+cs.outlineWidth+' off='+cs.outlineOffset+' '+cs.outlineColor:null});})()`
const cap = async (clip) => (await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...clip, scale: 1 } })).result.data

async function test(sel, name) {
  const b = await c.jsn(`(()=>{const e=document.querySelector('${sel}');if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,w:r.width,h:r.height}})()`)
  if (!b) return console.log(name + ' MISSING')
  const clip = { x: Math.max(0, b.x - 26), y: Math.max(0, b.y - 26), width: b.w + 52, height: Math.min(b.h + 52, 240) }
  await c.js(`document.activeElement&&document.activeElement.blur&&document.activeElement.blur();window.scrollTo(0,${Math.round(b.y - 200)});1`)
  await c.js(FREEZE); await sleep(500)
  const off = await cap(clip)
  let reached = false
  for (let i = 0; i < 160; i++) { await c.key('Tab', { wait: 38 }); if (await c.js(`document.activeElement===document.querySelector('${sel}')`)) { reached = true; break } }
  const sBefore = await c.js(STATE(sel))
  if (!reached) return console.log(name.padEnd(12) + ' NOT TAB-REACHABLE  ' + sBefore)
  await c.js(`window.scrollTo(0,${Math.round(b.y - 200)});1`); await c.js(FREEZE); await sleep(500)
  const sAfter = await c.js(STATE(sel))
  const on = await cap(clip)
  console.log(name.padEnd(12) + ' reachable | before=' + sBefore + '\n' + ' '.repeat(13) + 'atCapture=' + sAfter + '\n' + ' '.repeat(13) + 'RING PAINTED = ' + (off !== on))
  writeFileSync(new URL(`./${name}-${MOTION}-on.png`, import.meta.url), Buffer.from(on, 'base64'))
  writeFileSync(new URL(`./${name}-${MOTION}-off.png`, import.meta.url), Buffer.from(off, 'base64'))
}
console.log('== MOTION=' + MOTION + ' controls: ' + await c.js(`[...document.querySelectorAll('[data-anim-clip]')].map(v=>v.closest('figure').className.split(' ').pop()+'='+v.controls).join(' ')`))
await test('.anim-piece-tall .anim-files a', 'CTRL-link')
await test('.anim-fig-tall .anim-clip', 'reveal-tall')
await test('.anim-fig-master .anim-clip', 'run-master')
await test('.anim-fig-pres .anim-clip', 'run-pres')
c.close()
