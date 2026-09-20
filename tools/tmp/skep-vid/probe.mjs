import { open, sleep } from '../a11y/cdp.mjs'
import { writeFileSync } from 'node:fs'
const MOTION = process.env.MOTION || 'reduce'
const c = await open({ W: 1600, H: 1000, motion: MOTION, tag: 'skepvid' })
await c.boot()
await c.js(`window.showcase.mode('animation'); 1`); await sleep(3500)

const desc = (sel) => c.js(`(()=>{const v=document.querySelector('${sel}');if(!v)return 'MISSING';
 const r=v.getBoundingClientRect();
 return JSON.stringify({controlsAttr:v.hasAttribute('controls'),controlsProp:v.controls,tabIndex:v.tabIndex,w:Math.round(r.width),h:Math.round(r.height),display:getComputedStyle(v).display,vis:getComputedStyle(v).visibility});})()`)
console.log('MOTION=' + MOTION)
console.log('matchMedia reduce ->', await c.js(`matchMedia('(prefers-reduced-motion: reduce)').matches`))
console.log('tall  ', await desc('.anim-fig-tall .anim-clip'))
console.log('pres  ', await desc('.anim-fig-pres .anim-clip'))
console.log('master', await desc('.anim-fig-master .anim-clip'))

// scroll it into view then tab from the top of the document
await c.js(`document.querySelector('.anim-fig-tall .anim-clip').scrollIntoView({block:'center'}); document.activeElement && document.activeElement.blur(); 1`)
await sleep(500)

let stops = 0, hit = null
for (let i = 0; i < 90; i++) {
  await c.key('Tab', { wait: 55 })
  stops++
  const info = await c.js(`(()=>{const a=document.activeElement;if(!a)return '';
    const sr=a.shadowRoot?a.shadowRoot.activeElement:null;
    return JSON.stringify({tag:a.tagName,cls:typeof a.className==='string'?a.className:'',
      inTall: !!(a.closest && a.closest('.anim-fig-tall')),
      shadowActive: sr?(sr.tagName+'.'+(sr.getAttribute('class')||'')+'|'+(sr.getAttribute('pseudo')||'')):null});})()`)
  const o = JSON.parse(info || '{}')
  if (o.inTall) { hit = { stops, ...o }; break }
}
console.log('landed on tall clip after', hit ? hit.stops : 'NEVER', 'tab presses ->', JSON.stringify(hit))

if (hit) {
  const probe = await c.js(`(()=>{const a=document.activeElement;const cs=getComputedStyle(a);
    const g=a.closest('.anim-glass');const gs=g?getComputedStyle(g):null;
    const sr=a.shadowRoot;
    let shadowFV=null, shadowRing=null;
    if(sr){ const sa=sr.activeElement; if(sa){ const scs=getComputedStyle(sa); shadowFV=sa.matches(':focus-visible'); shadowRing=scs.outlineStyle+' '+scs.outlineWidth+' '+scs.outlineColor; } }
    return JSON.stringify({
      activeTag:a.tagName, cls:a.className,
      matchesFocus:a.matches(':focus'), matchesFocusVisible:a.matches(':focus-visible'),
      outline: cs.outlineStyle+' '+cs.outlineWidth+' '+cs.outlineColor+' offset='+cs.outlineOffset,
      boxShadow: cs.boxShadow, focusVar: cs.getPropertyValue('--focus'),
      glassOverflow: gs?gs.overflow:null, glassOutline: gs?(gs.outlineStyle+' '+gs.outlineWidth):null,
      shadowActive: sr&&sr.activeElement?sr.activeElement.tagName:null, shadowFV, shadowRing,
      paused: a.paused, hasShadow: !!sr
    },null,1);})()`)
  console.log('FOCUS PROBE:', probe)

  // screenshot the figure region to see whether ANY ring is painted
  const box = await c.jsn(`(()=>{const f=document.querySelector('.anim-fig-tall');const r=f.getBoundingClientRect();return {x:Math.max(0,r.x-20),y:Math.max(0,r.y-20),w:r.width+40,h:Math.min(r.height+40,900)};})()`)
  const shot = await c.send('Page.captureScreenshot', { format: 'png', clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 1 }, captureBeyondViewport: false })
  writeFileSync(new URL('./tall-focus-' + MOTION + '.png', import.meta.url), Buffer.from(shot.result.data, 'base64'))
  console.log('shot written')

  // does Space do something?
  const before = await c.js(`document.querySelector('.anim-fig-tall .anim-clip').paused`)
  await c.key(' ', { wait: 900 })
  const after = await c.js(`(()=>{const v=document.querySelector('.anim-fig-tall .anim-clip');return JSON.stringify({paused:v.paused,t:v.currentTime,scrollY:window.scrollY});})()`)
  console.log('space: pausedBefore=' + before + ' after=' + after)
}
console.log('errors:', JSON.stringify(c.errs.slice(0, 5)))
c.close()
