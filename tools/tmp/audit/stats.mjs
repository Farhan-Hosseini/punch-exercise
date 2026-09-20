import { open, sleep } from './cdp.mjs'
const URL = 'http://localhost:5770/'
const c = await open({ W: 1440, H: 1400 })
await c.send('Page.navigate', { url: URL }); await sleep(3000)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: URL }); await sleep(6500)

// 1) direct call
await c.js(`window.showcase.mode('machine');1`); await sleep(800)
console.log("showcase.mscreen('stats') ->", await c.js(`(window.showcase.mscreen('stats'), document.getElementById('machine').dataset.mscreen)`))
console.log("   .mscreen-stats hidden  :", await c.js(`document.querySelector('.mscreen-stats').hidden`))
console.log("   .mscreen-stats rects   :", await c.js(`document.querySelector('.mscreen-stats').getClientRects().length`))
console.log("   #screen (Result) hidden:", await c.js(`document.getElementById('screen').hidden`))
console.log("showcase.mscreen('score') ->", await c.js(`(window.showcase.mscreen('score'), document.getElementById('machine').dataset.mscreen)`))

// 2) the design system's live glass for Your run
await c.js(`window.showcase.mode('system');1`); await sleep(2500)
const found = await c.js(`(()=>{const f=document.querySelector('[data-ds-live="stats"]'); if(!f) return 'no frame'; f.scrollIntoView({block:'center'}); return 'scrolled'})()`)
console.log('ds live stats frame:', found)
await sleep(9000)
console.log('  frame live flag :', await c.js(`document.querySelector('[data-ds-live="stats"]')?.dataset.live`))
console.log('  frame src       :', await c.js(`document.querySelector('[data-ds-live="stats"]')?.getAttribute('src')`))
console.log('  screen inside   :', await c.js(`(()=>{try{return document.querySelector('[data-ds-live="stats"]').contentDocument.getElementById('machine').dataset.mscreen}catch(e){return 'X '+e}})()`))
console.log('  caption         :', JSON.stringify((await c.js(`document.querySelector('[data-ds-livecap="stats"]')?.textContent||''`)).slice(0,90)))
console.log('  compare, score  :', await c.js(`(()=>{try{return document.querySelector('[data-ds-live="score"]').contentDocument.getElementById('machine').dataset.mscreen}catch(e){return 'X '+e}})()`))
console.log('errors:', c.errs.slice(0,10).join('\n')||'(none)')
c.close()
