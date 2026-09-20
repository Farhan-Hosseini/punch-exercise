import { open, sleep } from './cdp.mjs'
const URL = 'http://localhost:5770/'
const c = await open({ W: 1440, H: 1000 })
await c.send('Page.navigate', { url: URL }); await sleep(3000)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: URL }); await sleep(6500)
const SCREENS = await c.jsj(`[...document.querySelectorAll('.mscreen[data-mscreen]')].map(e=>e.dataset.mscreen)`)
const install = `(()=>{ if(window.__mo) window.__mo.disconnect();
  window.__n = 0;
  window.__mo = new MutationObserver((ms)=>{ window.__n += ms.length });
  window.__mo.observe(document.getElementById('machine'), { subtree:true, attributes:true, childList:true, characterData:true });
  return 1 })()`
console.log('mutations inside #machine over 3s while the MOBILE tab is showing:')
for (const k of SCREENS) {
  await c.js(`window.showcase.mode('machine');1`); await sleep(500)
  await c.js(`window.showcase.mscreen(${JSON.stringify(k)});1`); await sleep(1600)
  await c.js(`window.showcase.mode('mobile');1`); await sleep(1200)
  await c.js(install); await sleep(3000)
  const n = await c.js(`window.__n`)
  console.log(`  ${k.padEnd(10)} ${String(n).padStart(6)}  ${n > 20 ? '<-- still animating while hidden' : ''}`)
}
console.log('errors:', c.errs.slice(0,10).join('\n')||'(none)')
c.close()
