import { open, sleep } from './cdp.mjs'
const URL = 'http://localhost:5770/'
const c = await open({ W: 1440, H: 1000 })
await c.send('Page.navigate', { url: URL }); await sleep(3000)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: URL }); await sleep(7000)
async function docListeners() {
  const r = await c.send('Runtime.evaluate', { expression: 'document' })
  const l = await c.send('DOMDebugger.getEventListeners', { objectId: r.result.result.objectId, depth: 0 })
  const out = {}; for (const e of l.result.listeners) out[e.type] = (out[e.type]||0)+1; return out
}
async function cycle(name, on, off, n = 8, settle = 700) {
  await c.js(on); await sleep(2500); await c.js(off); await sleep(1200)
  const a = await c.metrics(); const la = await docListeners()
  for (let i = 0; i < n; i++) { await c.js(on); await sleep(settle); await c.js(off); await sleep(settle) }
  await sleep(1500)
  const b = await c.metrics(); const lb = await docListeners()
  const diff = Object.keys({...la,...lb}).filter(k=>(la[k]||0)!==(lb[k]||0)).map(k=>`${k} ${la[k]||0}->${lb[k]||0}`)
  console.log(name, JSON.stringify({ dNodes:b.nodes-a.nodes, dListeners:b.listeners-a.listeners, dDocs:b.docs-a.docs, dHeapMB:+(b.heapMB-a.heapMB).toFixed(1) }), diff.join(', ')||'')
}
await c.js(`window.showcase.mode('mobile');1`); await sleep(1000)
await cycle('case overlay', `document.getElementById('openCase').click();1`, `document.getElementById('closeCase').click();1`, 6, 1200)
await cycle('brief overlay', `document.getElementById('briefBtn')?.click();1`, `document.querySelector('#brief [data-close-brief]')?.click();1`, 6, 800)
await cycle('help overlay', `document.getElementById('helpBtn')?.click();1`, `document.querySelector('#help [data-close-help]')?.click();1`, 6, 700)
await cycle('customise panel', `document.getElementById('openCustom').click();1`, `document.getElementById('closeCustom').click();1`, 8, 600)
await cycle('decimals', `window.showcase.decimals(false);1`, `window.showcase.decimals(true);1`, 8, 500)
await cycle('appearance', `window.showcase.appearance('light');1`, `window.showcase.appearance('dark');1`, 8, 500)
console.log('errors:', c.errs.slice(0,20).join('\n')||'(none)')
c.close()
