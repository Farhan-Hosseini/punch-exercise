import { open, sleep } from './cdp.mjs'
const URL = 'http://localhost:5770/'
const c = await open({ W: 1440, H: 1000 })
await c.send('Page.navigate', { url: URL }); await sleep(3000)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: URL }); await sleep(6000)

const MS = await c.jsj(`[...document.querySelectorAll('.mscreen[data-mscreen]')].map(e=>e.dataset.mscreen)`)
const MP = await c.jsj(`[...document.querySelectorAll('.m-page[data-page]')].map(e=>e.dataset.page)`)
console.log('machine screens', MS)
console.log('phone pages', MP)

const rows = []
async function mark(label) { const m = await c.metrics(); rows.push({ label, ...m }); console.log(label, JSON.stringify(m)) }

await c.js(`window.showcase.mode('machine');1`); await sleep(1500)
await mark('baseline-machine')
for (let pass = 1; pass <= 6; pass++) {
  for (const k of MS) { await c.js(`window.showcase.mscreen(${JSON.stringify(k)});1`); await sleep(220) }
  if (pass % 2 === 0) await mark('machine-pass' + pass)
}
await c.js(`window.showcase.mode('mobile');1`); await sleep(1500)
await mark('baseline-phone')
for (let pass = 1; pass <= 6; pass++) {
  for (const k of MP) { await c.js(`window.punchApp.go(${JSON.stringify(k)});1`); await sleep(200) }
  if (pass % 2 === 0) await mark('phone-pass' + pass)
}
await mark('before-modes')
for (let i = 0; i < 10; i++) {
  for (const m of ['mobile', 'machine', 'animation', 'system']) { await c.js(`window.showcase.mode('${m}');1`); await sleep(260) }
}
await c.js(`window.showcase.mode('mobile');1`); await sleep(1500)
await mark('after-40-mode-switches')

console.log('\n--- errors ---')
console.log(c.errs.slice(0, 40).join('\n') || '(none)')
console.log('\n--- table ---')
console.table(rows)
c.close()
