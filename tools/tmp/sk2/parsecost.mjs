/* What the HTTP cache does NOT save: parsing, styling and executing the duplicate copies.
   Same-origin iframes share the renderer, so Performance.getMetrics on the page captures both. */
import { open, sleep } from './cdp.mjs'
const c = await open({ w: 1600, h: 1000 })
await c.send('Performance.enable')
const snap = async () => Object.fromEntries((await c.send('Performance.getMetrics')).result.metrics.map(m => [m.name, m.value]))
const dt = (a, b, k) => ((b[k] - a[k]) * 1000).toFixed(0) + ' ms'
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(7000)
const m0 = await snap()
console.log('top frame alone: Script', (m0.ScriptDuration*1000).toFixed(0)+' ms', '| RecalcStyle', (m0.RecalcStyleDuration*1000).toFixed(0)+' ms', '| Layout', (m0.LayoutDuration*1000).toFixed(0)+' ms', '| Task', (m0.TaskDuration*1000).toFixed(0)+' ms', '| Nodes', m0.Nodes, '| JSHeap', (m0.JSHeapUsedSize/1048576).toFixed(1)+' MB')
// time the embed from src set to load
const t = await c.js(`(async () => {
  const f = document.getElementById('linkedFrame')
  if (f.getAttribute('src')) return 'already warmed'
  const t0 = performance.now()
  window.showcase.mode('animation')
  await new Promise(r => f.addEventListener('load', r, { once: true }))
  return Math.round(performance.now() - t0)
})()`)
console.log('animation tab: iframe src -> load event:', t, 'ms')
await sleep(6000)
const m1 = await snap()
console.log('delta for ONE embedded copy: Script', dt(m0,m1,'ScriptDuration'), '| RecalcStyle', dt(m0,m1,'RecalcStyleDuration'), '| Layout', dt(m0,m1,'LayoutDuration'), '| Task', dt(m0,m1,'TaskDuration'), '| Nodes +' + (m1.Nodes-m0.Nodes), '| JSHeap', (m1.JSHeapUsedSize/1048576).toFixed(1)+' MB', '| Documents', m1.Documents)
// now the case study, which adds two more
const t2 = Date.now()
await c.js(`document.getElementById('openCase').click(); 1`); await sleep(2000)
await c.js(`(()=>{const d=document.getElementById('case'); const s=d.querySelector('.cs-scroll')||d; return s.scrollHeight})()`)
await sleep(8000)
const srcs = await c.js(`JSON.stringify([...document.querySelectorAll('#case iframe[data-embed]')].map(f=>f.getAttribute('src')))`)
console.log('case embeds WITHOUT scrolling, 10s after open:', srcs)
const m2 = await snap()
console.log('delta for the case study (2 more copies): Script', dt(m1,m2,'ScriptDuration'), '| RecalcStyle', dt(m1,m2,'RecalcStyleDuration'), '| Layout', dt(m1,m2,'LayoutDuration'), '| Task', dt(m1,m2,'TaskDuration'), '| Nodes +' + (m2.Nodes-m1.Nodes), '| JSHeap', (m2.JSHeapUsedSize/1048576).toFixed(1)+' MB', '| Documents', m2.Documents)
console.log('errors:', c.errs.slice(0,6))
c.close()
