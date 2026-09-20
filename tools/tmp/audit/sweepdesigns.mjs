import { open, sleep } from './cdp.mjs'
const URL = 'http://localhost:5770/'
const c = await open({ W: 1440, H: 1000 })
await c.send('Page.navigate', { url: URL }); await sleep(3000)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: URL }); await sleep(6000)

const MS = await c.jsj(`[...document.querySelectorAll('.mscreen[data-mscreen]')].map(e=>e.dataset.mscreen)`)
const MP = await c.jsj(`[...document.querySelectorAll('.m-page[data-page]')].map(e=>e.dataset.page)`)
let total = 0
const log = []
async function sweep(surface, page, openIt) {
  const secs = await c.jsj(`window.showcase.sections(${JSON.stringify(surface)}, ${JSON.stringify(page)})`)
  if (!secs || !secs.length) return
  await openIt(); await sleep(450)
  for (const s of secs) {
    for (let i = 0; i < s.names.length; i++) {
      const mark = c.errs.length
      const r = await c.js(`(()=>{try{ window.showcase.sec(${JSON.stringify(surface)},${JSON.stringify(page)},${JSON.stringify(s.key)},${i}); return 'ok'}catch(e){return 'THROW '+e}})()`)
      await sleep(190)
      total++
      const fresh = c.errs.slice(mark)
      if (r !== 'ok' || fresh.length) log.push(`${surface}/${page} ${s.key}[${i}] ${s.names[i]}  -> ${r}  ${fresh.join(' | ')}`)
    }
    // leave on the last design of the section, then reset to 0
    await c.js(`window.showcase.sec(${JSON.stringify(surface)},${JSON.stringify(page)},${JSON.stringify(s.key)},0);1`); await sleep(120)
  }
}
await c.js(`window.showcase.mode('machine');1`); await sleep(1200)
for (const k of MS) await sweep('machine', k, () => c.js(`window.showcase.mscreen(${JSON.stringify(k)});1`))
await c.js(`window.showcase.mode('mobile');1`); await sleep(1200)
for (const k of MP) await sweep('phone', k, () => c.js(`window.punchApp.go(${JSON.stringify(k)});1`))
// global sections, on both surfaces
await sweep('global', 'all', () => c.js(`window.showcase.mode('machine');1`))
await c.js(`window.showcase.mode('mobile');1`); await sleep(600)
await sweep('global', 'all', () => c.js(`window.punchApp.go('default');1`))
console.log('design changes exercised:', total)
console.log('--- problems ---')
console.log(log.join('\n') || '(none)')
console.log('--- all errors seen ---')
console.log(c.errs.slice(0,40).join('\n') || '(none)')
c.close()
