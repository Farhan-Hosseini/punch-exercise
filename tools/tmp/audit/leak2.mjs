import { open, sleep } from './cdp.mjs'
const URL = 'http://localhost:5770/'
const c = await open({ W: 1440, H: 1000 })
await c.send('Page.navigate', { url: URL }); await sleep(3000)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: URL }); await sleep(6000)
await c.js(`window.showcase.mode('mobile');1`); await sleep(1500)

const MP = await c.jsj(`[...document.querySelectorAll('.m-page[data-page]')].map(e=>e.dataset.page)`)
const out = []
for (const p of MP) {
  // warm: go there once and back to default
  await c.js(`window.punchApp.go('default');1`); await sleep(200)
  await c.js(`window.punchApp.go(${JSON.stringify(p)});1`); await sleep(400)
  await c.js(`window.punchApp.go('default');1`); await sleep(300)
  const a = await c.metrics()
  for (let i = 0; i < 6; i++) { await c.js(`window.punchApp.go(${JSON.stringify(p)});1`); await sleep(160); await c.js(`window.punchApp.go('default');1`); await sleep(160) }
  const b = await c.metrics()
  out.push({ page: p, dListeners: b.listeners - a.listeners, dNodes: b.nodes - a.nodes, dHeapMB: +(b.heapMB - a.heapMB).toFixed(1) })
  console.log(p, JSON.stringify(out[out.length-1]))
}
console.log('\n--- per-page over 8 round trips ---')
console.table(out)
console.log('errors:', c.errs.slice(0,20).join('\n') || '(none)')
c.close()
