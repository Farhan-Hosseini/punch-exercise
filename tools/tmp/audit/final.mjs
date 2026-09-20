import { open, sleep } from './cdp.mjs'
const URL = 'http://localhost:5770/'
const c = await open({ W: 390, H: 844 })
await c.send('Page.navigate', { url: URL }); await sleep(3000)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: URL }); await sleep(7000)
console.log('--- 390px viewport ---')
for (const m of ['mobile','machine','animation','system']) {
  await c.js(`window.showcase.mode('${m}');1`); await sleep(2200)
  console.log(`  ${m.padEnd(10)} overflowX=${await c.js(`Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)`)}`)
}
console.log('  errors so far:', c.errs.length ? c.errs.slice(0,8).join(' | ') : '(none)')

console.log('--- the stats screen ---')
console.log('  .mscreen-stats nodes  :', await c.js(`document.querySelector('.mscreen-stats')?.querySelectorAll('*').length`))
console.log('  stats.js loaded       :', await c.js(`!!document.querySelector('script[src="mscreens/stats.js"]')`))
console.log('  reachable from bar    :', await c.js(`!!document.querySelector('.mpagebar [data-mscreen="stats"]')`))
console.log('  ds "Open Your run" btn:', await c.jsj(`(()=>{const b=document.querySelector('[data-go-mscreen="stats"]'); return b ? { text: b.textContent.trim(), visible: b.checkVisibility(), sectionHidden: !!b.closest('section[hidden]') } : null})()`))

console.log('--- the embedded machine page ---')
await c.send('Page.navigate', { url: URL + '?embed=machine' }); await sleep(6000)
console.log('  embed loaded, #machine screen =', await c.js(`document.getElementById('machine')?.dataset.mscreen`))
console.log('  embed errors:', c.errs.length ? c.errs.slice(0,8).join(' | ') : '(none)')
c.close()
