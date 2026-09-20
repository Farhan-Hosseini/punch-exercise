/* Does the accessible-name flip actually reach the platform a11y layer as an event?
   Chrome serialises AX changes to IA2/UIA; CDP Accessibility.nodesUpdated is that same feed. */
import { open, sleep } from './a11y/cdp.mjs'
const c = await open({ W: 1600, H: 1000, tag: 'sk2', motion: 'no-preference' })
await c.boot()
const out = {}
await c.js(`document.getElementById('openCase').click(); 1`); await sleep(4500)
await c.js(`document.querySelector('.cd-geometry').scrollIntoView({block:'center'}); 1`); await sleep(2500)

// what diagrams exist at all
out.diagrams = await c.jsn(`[...document.querySelectorAll('.cd[data-cd]')].map(d=>d.dataset.cd)`)
out.transportButtons = await c.jsn(`[...document.querySelectorAll('[data-cd-play]')].map(b=>({inside:b.closest('.cd').dataset.cd, aria:b.getAttribute('aria-label'), pressed:b.getAttribute('aria-pressed'), state:b.dataset.state, text:b.textContent.trim()}))`)
out.otherCaseButtons = await c.jsn(`[...document.querySelectorAll('#case .cd-btn')].map(b=>({cd:b.closest('.cd')?.dataset.cd, aria:b.getAttribute('aria-label'), pressed:b.getAttribute('aria-pressed'), text:b.textContent.trim().slice(0,30)}))`)

// --- listen for AX node updates on the play button
const backendIds = []
await c.send('Accessibility.enable')
const ev = await c.send('Runtime.evaluate', { expression: `document.querySelector('.cd-geometry [data-cd-play]')` })
const objectId = ev.result.result.objectId
const tree = await c.send('Accessibility.getPartialAXTree', { objectId, fetchRelatives: false })
const nodeId = tree.result.nodes[0].nodeId
out.watchedNodeId = nodeId

const updates = []
// hook raw ws messages by re-using send's listener is not exposed; poll instead but ALSO record via CDP events
// simplest honest measurement: poll the AX tree right after the keypress and diff the serialised name
await c.js(`document.querySelector('.cd-geometry [data-cd-play]').focus(); 1`); await sleep(400)
async function axName() {
  const e2 = await c.send('Runtime.evaluate', { expression: `document.querySelector('.cd-geometry [data-cd-play]')` })
  const t = await c.send('Accessibility.getPartialAXTree', { objectId: e2.result.result.objectId, fetchRelatives: false })
  const n = t.result.nodes[0]
  return { nodeId: n.nodeId, name: n.name?.value, from: n.name?.sources?.map(s=>s.type+':'+(s.attribute||'')+'='+(s.value?.value??'')).join(' | ') }
}
out.n0 = await axName()
await c.key('Enter', { wait: 400 })
out.n1 = await axName()
await c.key('Enter', { wait: 400 })
out.n2 = await axName()
out.axNodeIdStable = out.n0.nodeId === out.n1.nodeId && out.n1.nodeId === out.n2.nodeId
out.axNameFlipped = out.n0.name !== out.n1.name && out.n1.name !== out.n2.name

// --- WCAG 2.5.3 label-in-name on the reporter's PROPOSED fix
out.visibleTextStates = await c.jsn(`(() => { const b=document.querySelector('.cd-geometry [data-cd-play]'); const v=b.querySelector('.cd-play-t').textContent; return {visible:v, accName:b.getAttribute('aria-label'), contained:b.getAttribute('aria-label').toLowerCase().includes(v.toLowerCase())} })()`)
await c.key('Enter', { wait: 400 })
out.visibleTextStates2 = await c.jsn(`(() => { const b=document.querySelector('.cd-geometry [data-cd-play]'); const v=b.querySelector('.cd-play-t').textContent; return {visible:v, accName:b.getAttribute('aria-label'), contained:b.getAttribute('aria-label').toLowerCase().includes(v.toLowerCase())} })()`)

out.errs = c.errs.slice(0,10)
console.log(JSON.stringify(out, null, 1))
c.close()
