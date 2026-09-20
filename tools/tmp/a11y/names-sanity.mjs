import { open, sleep } from './cdp.mjs'
const c = await open({ W: 1600, H: 1000, tag: 'ns' })
await c.boot()
await c.send('Accessibility.enable')
await c.js(`window.showcase.mode('ds'); 1`); await sleep(2500)
// negative control: strip the label off a real button and see if the sweep catches it
await c.js(`(()=>{const b=document.getElementById('openCustom'); b.removeAttribute('aria-label'); b.querySelectorAll('.btn-label').forEach(s=>s.remove()); return 1})()`)
await sleep(300)
const { nodes } = await c.send('Accessibility.getFullAXTree').then(r => r.result)
const roles = {}
let named = 0, unnamed = []
for (const n of nodes) {
  if (n.ignored) continue
  const role = n.role?.value || '?'
  roles[role] = (roles[role] || 0) + 1
  if (['button','link','radio','image','slider','checkbox','textbox'].includes(role)) {
    const nm = (n.name?.value||'').trim()
    if (nm) named++; else unnamed.push({ role, backend: n.backendDOMNodeId, props: (n.properties||[]).map(p=>p.name+'='+JSON.stringify(p.value?.value)).join(',') })
  }
}
console.log('total ax nodes', nodes.length)
console.log('top roles', JSON.stringify(Object.entries(roles).sort((a,b)=>b[1]-a[1]).slice(0,18)))
console.log('named interactive', named, 'unnamed', unnamed.length)
console.log(JSON.stringify(unnamed.slice(0,10), null, 1))
c.close()
