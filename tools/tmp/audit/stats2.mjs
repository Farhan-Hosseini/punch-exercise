import { open, sleep } from './cdp.mjs'
const URL = 'http://localhost:5770/'
const c = await open({ W: 1440, H: 1400 })
await c.send('Page.navigate', { url: URL }); await sleep(3000)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: URL }); await sleep(6500)
await c.js(`window.showcase.mode('system');1`); await sleep(3000)
// walk down the page so the lazy sections build and the live glasses come into view
for (let y = 0; y < 30; y++) { await c.js(`window.scrollBy(0, 900);1`); await sleep(350) }
await c.js(`document.querySelector('[data-ds-live="stats"]')?.scrollIntoView({block:'center'});1`); await sleep(9000)
for (const k of ['stats','score']) {
  console.log(k, 'live=', await c.js(`document.querySelector('[data-ds-live="${k}"]')?.dataset.live`),
    'src=', await c.js(`document.querySelector('[data-ds-live="${k}"]')?.getAttribute('src')`),
    'screen=', await c.js(`(()=>{try{return document.querySelector('[data-ds-live="${k}"]').contentDocument.getElementById('machine').dataset.mscreen}catch(e){return 'X'}})()`),
    'ready=', await c.js(`document.querySelector('[data-ds-live="${k}"]')?.classList.contains('is-ready')`))
}
console.log('errors:', c.errs.slice(0,10).join('\n')||'(none)')
c.close()
