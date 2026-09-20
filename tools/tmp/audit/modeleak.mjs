import { open, sleep } from './cdp.mjs'
const URL = 'http://localhost:5770/'
const c = await open({ W: 1440, H: 1000 })
await c.send('Page.navigate', { url: URL }); await sleep(3000)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: URL }); await sleep(6000)
for (const target of ['machine', 'animation', 'system']) {
  await c.js(`window.showcase.mode('mobile');1`); await sleep(800)
  await c.js(`window.showcase.mode('${target}');1`); await sleep(2500)
  await c.js(`window.showcase.mode('mobile');1`); await sleep(1500)
  const a = await c.metrics()
  for (let i = 0; i < 6; i++) { await c.js(`window.showcase.mode('${target}');1`); await sleep(900); await c.js(`window.showcase.mode('mobile');1`); await sleep(700) }
  await sleep(1500)
  const b = await c.metrics()
  console.log(target, JSON.stringify({ dDocs: b.docs-a.docs, dNodes: b.nodes-a.nodes, dListeners: b.listeners-a.listeners, dHeapMB:+(b.heapMB-a.heapMB).toFixed(1) }))
}
console.log('errors:', c.errs.slice(0,15).join('\n')||'(none)')
c.close()
