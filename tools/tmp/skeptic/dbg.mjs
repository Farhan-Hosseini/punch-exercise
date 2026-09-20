import { open, sleep } from '../a11y/cdp.mjs'
const c = await open({ W: 1440, H: 900, tag: 'db', motion: 'reduce' })
await c.boot()
await c.js(`document.getElementById('openCase').click(); 1`); await sleep(4500)
const H = await c.js(`document.getElementById('caseScroll').scrollHeight`)
for (let y=0;y<H;y+=900){ await c.js(`document.getElementById('caseScroll').scrollTo(0,${y});1`); await sleep(80) }
await c.js(`document.getElementById('caseScroll').scrollTop = 0; 1`); await sleep(2500)
console.log('#case .cd count        :', await c.js(`document.querySelectorAll('#case .cd').length`))
console.log('.cd-geo-note count     :', await c.js(`document.querySelectorAll('.cd-geo-note').length`))
console.log('matches "#case .cd *"  :', await c.js(`document.querySelectorAll('#case .cd .cd-geo-note-d').length`))
await c.js(`document.querySelectorAll('.cd-geo-note')[2].classList.add('is-current'); 1`); await sleep(800)
console.log(await c.js(`(()=>{const b=document.querySelectorAll('.cd-geo-note')[2];const d=b.querySelector('.cd-geo-note-d');const r=d.getBoundingClientRect();
 return JSON.stringify({cur:b.classList.contains('is-current'), btnBg:getComputedStyle(b).backgroundColor, color:getComputedStyle(d).color,
 rectW:Math.round(r.width), rectH:Math.round(r.height), ownTextLen:[...d.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').trim().length,
 vis:getComputedStyle(d).visibility, op:getComputedStyle(d).opacity, figIn: !!document.querySelector('.cs-diagram-light').classList.contains('is-in')})})()`))
c.close()
