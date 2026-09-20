import { open, sleep } from './cdp.mjs'
const URL = 'http://localhost:5770/'
const c = await open({ W: 1440, H: 1000 })
await c.send('Page.navigate', { url: URL }); await sleep(3000)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: URL }); await sleep(6500)

const spin = `document.querySelector('.mscreen-countdown .cdn')?.style.getPropertyValue('--spin')`
await c.js(`window.showcase.mode('machine');1`); await sleep(800)
await c.js(`window.showcase.mscreen('countdown');1`); await sleep(1500)
console.log('machine tab, countdown running. --spin samples 1.5s apart:')
const a1 = await c.js(spin); await sleep(1500); const a2 = await c.js(spin)
console.log('  ', a1, '->', a2, a1 !== a2 ? '(moving)' : '(still)')
console.log('   glass hidden?', await c.js(`document.getElementById('stage').hidden`))

await c.js(`window.showcase.mode('mobile');1`); await sleep(1500)
console.log('switched to Mobile tab. stage hidden =', await c.js(`document.getElementById('stage').hidden`))
const b1 = await c.js(spin); await sleep(2000); const b2 = await c.js(spin)
console.log('  --spin', b1, '->', b2, b1 !== b2 ? '(STILL MOVING while hidden)' : '(stopped)')
console.log('   countdown root state:', await c.js(`document.querySelector('.mscreen-countdown .cdn')?.dataset.state`))
console.log('   glass clientRects:', await c.js(`document.querySelector('.mscreen-countdown .cdn')?.getClientRects().length`))

// how many rAF callbacks fire per second overall while on the Mobile tab
const rate = await c.js(`new Promise((res)=>{let n=0;const t0=performance.now();const f=()=>{n++;if(performance.now()-t0<2000)requestAnimationFrame(f);else res(Math.round(n/((performance.now()-t0)/1000)))};requestAnimationFrame(f)})`)
console.log('   page rAF rate while on Mobile tab:', rate, 'fps')

// the machine "default" screen intervals
await c.js(`window.showcase.mode('machine');1`); await sleep(600)
await c.js(`window.showcase.mscreen('default');1`); await sleep(1200)
await c.js(`window.showcase.mode('mobile');1`); await sleep(500)
const on = () => c.js(`[...document.querySelectorAll('.mscreen-default [data-mdf-best] .is-on')].map(e=>e.className).join('|')`)
const d1 = await on(); await sleep(5200); const d2 = await on()
console.log('machine Home strip highlight while on Mobile tab:', d1 === d2 ? 'frozen' : 'STILL CYCLING')
console.log('errors:', c.errs.slice(0,10).join('\n')||'(none)')
c.close()
