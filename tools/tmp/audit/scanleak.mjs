import { open, sleep } from './cdp.mjs'
const URL = 'http://localhost:5770/'
const c = await open({ W: 1440, H: 1000 })
await c.send('Page.navigate', { url: URL }); await sleep(3000)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: URL }); await sleep(6000)
await c.js(`window.showcase.mode('mobile');1`); await sleep(1200)

async function docListeners() {
  const r = await c.send('Runtime.evaluate', { expression: 'document' })
  const objectId = r.result.result.objectId
  const l = await c.send('DOMDebugger.getEventListeners', { objectId, depth: 0 })
  const out = {}
  for (const e of l.result.listeners) out[e.type] = (out[e.type] || 0) + 1
  return out
}
const before = await docListeners()
const m0 = await c.metrics()
for (let i = 0; i < 10; i++) { await c.js(`window.punchApp.go('scan');1`); await sleep(260); await c.js(`window.punchApp.go('default');1`); await sleep(220) }
const after = await docListeners()
const m1 = await c.metrics()
const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()
console.log('document listeners, before -> after 10 visits to Scan:')
for (const k of keys) if ((before[k]||0) !== (after[k]||0)) console.log(`  ${k}: ${before[k]||0} -> ${after[k]||0}`)
console.log('unchanged types:', keys.filter(k=>(before[k]||0)===(after[k]||0)).join(', '))
console.log('metrics', JSON.stringify(m0), '->', JSON.stringify(m1))
// how many sliders exist on the recent rail markup right now
console.log('rails with data-sl-on in scan:', await c.js(`document.querySelectorAll('.m-page[data-page="scan"] [data-sl-on]').length`))
console.log('errors:', c.errs.slice(0,10).join('\n')||'(none)')
c.close()
