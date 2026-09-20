import { open, sleep } from './cdp.mjs'
const c = await open({ W: 1440, H: 1000 })
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3000)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(7000)
await c.js(`window.showcase.mode('machine');1`); await sleep(600)
await c.js(`window.showcase.mscreen('result');1`); await sleep(1500)
for (const s of [999999, 500000, 1000, 0]) {
  await c.js(`(()=>{const el=document.getElementById('c-score'); el.value = ${s>=999999?1000:Math.round(s/1000)}; el.dispatchEvent(new Event('input',{bubbles:true})); return 1})()`)
  await sleep(700)
  const painted = await c.jsj(`[...document.querySelectorAll('[data-glass-rank]')].slice(0,4).map(e=>e.dataset.glassRank+'='+e.textContent)`)
  console.log(`score ${String(s).padStart(7)} -> punchApp.score=${await c.js('window.punchApp.score')}  ranks: ${JSON.stringify(painted)}`)
}
console.log('errors:', c.errs.slice(0,8).join(' | ')||'(none)')
c.close()
