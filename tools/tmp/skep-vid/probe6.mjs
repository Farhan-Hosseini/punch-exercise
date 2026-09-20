import { open, sleep } from '../a11y/cdp.mjs'
import { writeFileSync } from 'node:fs'
const c = await open({ W: 1600, H: 1000, motion: 'reduce', tag: 'skepvid6' })
await c.boot()
await c.js(`window.showcase.mode('animation'); 1`); await sleep(3500)
await c.key('Tab', { wait: 250 })
const cap = async (clip) => (await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...clip, scale: 1 } })).result.data
const b = await c.jsn(`(()=>{const e=document.querySelector('.anim-fig-tall .anim-clip');const r=e.getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,w:r.width,h:r.height}})()`)
await c.js(`window.scrollTo(0,${Math.round(b.y - 200)});1`); await sleep(400)
// tab onto the video
for (let i = 0; i < 160; i++) { await c.key('Tab', { wait: 38 }); if (await c.js(`document.activeElement===document.querySelector('.anim-fig-tall .anim-clip')`)) break }
console.log('on video:', await c.js(`document.activeElement.tagName+' fv='+document.activeElement.matches(':focus-visible')`))
// bottom of the clip: is a UA control bar drawn inside the glass?
writeFileSync(new URL('./bar-focused.png', import.meta.url), Buffer.from(await cap({ x: b.x - 20, y: b.y + b.h - 180, width: b.w + 40, height: 210 }), 'base64'))
// what is the NEXT tab stop after the video?
await c.key('Tab', { wait: 250 })
console.log('next stop:', await c.js(`(()=>{const a=document.activeElement;return a.tagName+'|'+(typeof a.className==='string'?a.className:'')+'|'+(a.getAttribute('aria-label')||a.textContent||'').trim().slice(0,40)+'| sameVideo='+(a===document.querySelector('.anim-fig-tall .anim-clip'))})()`))
// ---- does the proposed wrapper fix actually paint?
await c.js(`window.scrollTo(0,${Math.round(b.y - 200)});1`); await sleep(300)
await c.js(`document.activeElement.blur();1`); await sleep(300)
const clip = { x: Math.max(0, b.x - 26), y: Math.max(0, b.y - 26), width: b.w + 52, height: 240 }
const off = await cap(clip)
for (let i = 0; i < 160; i++) { await c.key('Tab', { wait: 38 }); if (await c.js(`document.activeElement===document.querySelector('.anim-fig-tall .anim-clip')`)) break }
await c.js(`(()=>{const s=document.createElement('style');s.textContent='.anim-glass:focus-within{outline:2px solid #F2EFEA;outline-offset:3px}';document.head.appendChild(s);return 1})()`)
await c.js(`window.scrollTo(0,${Math.round(b.y - 200)});1`); await sleep(500)
const on = await cap(clip)
console.log('proposed .anim-glass:focus-within ring paints? ' + (off !== on))
writeFileSync(new URL('./fix-focuswithin.png', import.meta.url), Buffer.from(on, 'base64'))
c.close()
