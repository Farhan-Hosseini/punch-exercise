import { open, sleep } from './cdp.mjs'
const URL = 'http://localhost:5770/'
const c = await open({ W: 1440, H: 1100 })
await c.send('Page.navigate', { url: URL }); await sleep(3000)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: URL }); await sleep(7000)
await c.js(`window.punchApp.credits = 3; 1`)
let clicks = 0
const problems = []
async function clickAll(label, scopeSel) {
  const n = await c.js(`document.querySelectorAll(${JSON.stringify(scopeSel)}).length`)
  for (let i = 0; i < n; i++) {
    const mark = c.errs.length
    const info = await c.js(`(()=>{const b=document.querySelectorAll(${JSON.stringify(scopeSel)})[${i}];
      if(!b||!b.checkVisibility()||b.disabled) return null;
      const t=(b.getAttribute('aria-label')||b.textContent||'').trim().slice(0,40);
      try{ b.click() }catch(e){ return t+' THREW '+e }
      return t })()`)
    if (info == null) continue
    clicks++
    await sleep(140)
    const fresh = c.errs.slice(mark)
    if (fresh.length || String(info).includes('THREW')) problems.push(`${label} [${i}] "${info}" :: ${fresh.join(' | ')}`)
  }
}
for (const m of ['mobile', 'machine', 'system', 'animation']) {
  await c.js(`window.showcase.mode('${m}');1`); await sleep(1500)
  await clickAll(m + ' topbar', '.topbar button')
  await clickAll(m + ' pagenav', '.pagenav button')
  if (m === 'mobile' || m === 'animation') {
    const PAGES = await c.jsj(`[...document.querySelectorAll('.m-page[data-page]')].map(e=>e.dataset.page)`)
    for (const p of PAGES) {
      await c.js(`window.punchApp.go(${JSON.stringify(p)});1`); await sleep(500)
      await clickAll(`${m}/${p}`, `.m-page[data-page="${p}"] button`)
      await c.js(`window.punchApp.credits = 3; 1`)
    }
  }
  if (m === 'machine') {
    const MS = await c.jsj(`[...document.querySelectorAll('.mscreen[data-mscreen]')].map(e=>e.dataset.mscreen)`)
    for (const k of MS) { await c.js(`window.showcase.mscreen(${JSON.stringify(k)});1`); await sleep(600); await clickAll(`machine/${k}`, `.mscreen[data-mscreen="${k}"] button`) }
    await c.js(`window.showcase.mscreen('result');1`); await sleep(800)
    await clickAll('machine/result', '#screen button')
  }
  if (m === 'system') { await clickAll('ds', '#dsStage button') }
}
// the Customise panel and the overlays
await c.js(`document.getElementById('openCustom').click();1`); await sleep(800)
await clickAll('customise', '#custom button')
await c.js(`document.getElementById('openCase').click();1`); await sleep(2500)
await clickAll('case', '#case button')
console.log('buttons clicked:', clicks)
console.log('--- problems ---')
console.log(problems.slice(0, 30).join('\n') || '(none)')
console.log('--- total errors ---', c.errs.length)
console.log(c.errs.slice(0, 20).join('\n') || '(none)')
c.close()
