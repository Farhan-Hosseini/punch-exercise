import { open, sleep } from '../a11y/cdp.mjs'
import { writeFile } from 'node:fs/promises'
import { PNG } from 'pngjs'
const APPEAR = process.argv[2] || 'default'
const c = await open({ W: 1440, H: 900, tag: 'ck', motion: 'reduce' })  // reduce => NO autoplay, so nothing is a transient
await c.boot()
if (APPEAR !== 'default') { await c.js(`document.querySelector('[data-appearance-btn="${APPEAR}"]').click(); 1`); await sleep(1200) }
console.log('appearance attr:', await c.js(`document.documentElement.dataset.appearance || document.body.dataset.appearance || 'n/a'`))
await c.js(`document.getElementById('openCase').click(); 1`); await sleep(4500)
await c.js(`document.querySelector('.cd-geo-list').scrollIntoView({block:'center'}); 1`); await sleep(2500)
console.log('reduced-motion active:', await c.js(`matchMedia('(prefers-reduced-motion: reduce)').matches`))
console.log('current before click :', await c.js(`(document.querySelector('.cd-geo-note.is-current')||{dataset:{}}).dataset.step || 'none'`))
// click the "behind" note -- the longest, most argument-carrying one
const box = await c.jsn(`(() => { const b = document.querySelector('.cd-geo-note[data-step="behind"]').getBoundingClientRect(); return {x:Math.round(b.x+b.width/2), y:Math.round(b.y+10)} })()`)
for (const type of ['mousePressed','mouseReleased']) await c.send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 })
await sleep(3000)  // well past any .3s transition
// move the pointer far away so hover is not in play
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 })
await sleep(2500)
const g = await c.jsn(`(() => {
  const cur = document.querySelector('.cd-geo-note.is-current'); const d = cur.querySelector('.cd-geo-note-d')
  const b = d.getBoundingClientRect(), bb = cur.getBoundingClientRect()
  return { step: cur.dataset.step, pressed: cur.getAttribute('aria-pressed'), bg: getComputedStyle(cur).backgroundColor,
    hovered: cur.matches(':hover'), color: getComputedStyle(d).color, px: getComputedStyle(d).fontSize, w: getComputedStyle(d).fontWeight,
    box:{x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)},
    btn:{x:Math.round(bb.x),y:Math.round(bb.y)}, text: d.textContent.trim().slice(0,50) }
})()`)
console.log(JSON.stringify(g, null, 1))
const buf = Buffer.from((await c.send('Page.captureScreenshot',{format:'png'})).result.data,'base64')
await writeFile(`C:/Claude Database/punch-exercise/tools/tmp/skeptic/click-${APPEAR}.png`, buf)
const png = PNG.sync.read(buf); const at=(x,y)=>{const i=(png.width*y+x)<<2; return [png.data[i],png.data[i+1],png.data[i+2]]}
const tally=(x0,y0,x1,y1)=>{const m=new Map(); for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const k=at(x,y).join(',');m.set(k,(m.get(k)||0)+1)} return [...m].sort((a,b)=>b[1]-a[1]).slice(0,2)}
console.log('painted bg just above the note-d:', JSON.stringify(tally(g.box.x+2, g.box.y-4, g.box.x+60, g.box.y-1)))
let dark=[255,255,255],dl=1e9
for(let y=g.box.y;y<g.box.y+Math.min(g.box.h,20);y++)for(let x=g.box.x;x<g.box.x+g.box.w;x++){const p=at(x,y);const s=p[0]+p[1]+p[2];if(s<dl){dl=s;dark=p}}
console.log('darkest glyph pixel            :', dark.join(','))
const lin=v=>{v/=255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4)}
const L=p=>0.2126*lin(p[0])+0.7152*lin(p[1])+0.0722*lin(p[2])
const bgp = tally(g.box.x+2,g.box.y-4,g.box.x+60,g.box.y-1)[0][0].split(',').map(Number)
console.log('ratio from PAINTED pixels      :', (((Math.max(L(bgp),L(dark))+0.05)/(Math.min(L(bgp),L(dark))+0.05))).toFixed(3))
console.log('ERRORS', JSON.stringify(c.errs.slice(0,4)))
c.close()
