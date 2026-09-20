import { open, sleep } from './cdp.mjs'
const URL = 'http://localhost:5770/'
const c = await open({ W: 1440, H: 1000 })
await c.send('Page.navigate', { url: URL }); await sleep(3000)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: URL }); await sleep(6500)
const PAGES = await c.jsj(`[...document.querySelectorAll('.m-page[data-page]')].map(e=>e.dataset.page)`)
const install = (sel) => `(()=>{ if(window.__mo) window.__mo.disconnect(); window.__n=0;
  window.__mo=new MutationObserver((ms)=>{window.__n+=ms.length});
  window.__mo.observe(document.querySelector(${JSON.stringify(sel)}), {subtree:true,attributes:true,childList:true,characterData:true}); return 1})()`
console.log('mutations inside #mApp over 3s while the MACHINE tab is showing:')
await c.js(`window.punchApp.credits = 3;1`)
for (const k of PAGES) {
  await c.js(`window.showcase.mode('mobile');1`); await sleep(500)
  await c.js(`window.punchApp.go(${JSON.stringify(k)});1`); await sleep(1500)
  await c.js(`window.showcase.mode('machine');1`); await sleep(1200)
  await c.js(install('#mApp')); await sleep(3000)
  const n = await c.js(`window.__n`)
  if (n > 20) console.log(`  ${k.padEnd(10)} ${String(n).padStart(6)}  <-- still animating while hidden`)
  else console.log(`  ${k.padEnd(10)} ${String(n).padStart(6)}`)
}
console.log('errors:', c.errs.slice(0,10).join('\n')||'(none)')
c.close()
