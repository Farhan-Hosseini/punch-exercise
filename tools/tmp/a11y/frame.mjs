import { open, sleep } from './cdp.mjs'
const c = await open({ W: 1600, H: 1000, tag: 'fm', motion: 'no-preference' })
await c.boot()
await c.send('Accessibility.enable')
await c.js(`window.showcase.mode('animation'); 1`); await sleep(4000)
const doc = await c.send('DOM.getDocument', { depth: -1, pierce: false })
const n = await c.send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '#linkedFrame' })
const ax = await c.send('Accessibility.getPartialAXTree', { nodeId: n.result.nodeId, fetchRelatives: false })
console.log('#linkedFrame AX:', JSON.stringify(ax.result.nodes.map(x => ({ role: x.role?.value, name: x.name?.value, ignored: x.ignored, why: (x.ignoredReasons || []).map(r => r.name) }))))
console.log('wrapper:', await c.js(`(() => { const f = document.getElementById('linkedFrame'); const a = f.closest('#linked'); const b = f.getBoundingClientRect()
  return JSON.stringify({ frameTitle: f.getAttribute('title'), frameTab: f.getAttribute('tabindex'), asideLabel: a.getAttribute('aria-label'), asideHidden: a.getAttribute('aria-hidden'), inert: a.inert, w: Math.round(b.width), h: Math.round(b.height) }) })()`))
await c.js(`document.activeElement.blur && document.activeElement.blur(); 1`)
let inFrame = false; const seen = []
for (let i = 0; i < 80; i++) {
  await c.key('Tab', { wait: 45 })
  const t = await c.js(`(() => { const a = document.activeElement; return a.tagName + (a.id ? '#' + a.id : '') })()`)
  seen.push(t)
  if (t === 'IFRAME#linkedFrame') { inFrame = true; break }
}
console.log('tab ever lands on #linkedFrame:', inFrame)
console.log('openCase attrs:', await c.js(`(() => { const b = document.getElementById('openCase'); return JSON.stringify({ haspopup: b.getAttribute('aria-haspopup'), controls: b.getAttribute('aria-controls'), expanded: b.getAttribute('aria-expanded') }) })()`))
await c.js(`window.showcase.mode('machine'); document.getElementById('openCase').click(); 1`); await sleep(4500)
console.log('cd-btn attrs:', await c.js(`JSON.stringify([...document.querySelectorAll('.cd-btn')].map(b => ({ label: b.getAttribute('aria-label'), text: b.textContent.trim(), pressed: b.getAttribute('aria-pressed'), expanded: b.getAttribute('aria-expanded') })))`))
console.log('cd-scroller:', await c.js(`(() => { const s = document.querySelector('.cd-scroller'); return JSON.stringify({ role: s.getAttribute('role'), label: s.getAttribute('aria-label'), tabindex: s.getAttribute('tabindex'), overflowX: s.scrollWidth - s.clientWidth }) })()`))
console.log('ERRORS', JSON.stringify(c.errs.slice(0, 6)))
c.close()
