import { open, sleep } from './cdp.mjs'
const c = await open({ W: 1600, H: 1000, tag: 'nm' })
await c.boot()
await c.send('Accessibility.enable')

const DESC = `(sel) => { const el = document.querySelector(sel); return el ? el.outerHTML.slice(0,160) : null }`

async function audit(label) {
  const { nodes } = await c.send('Accessibility.getFullAXTree').then(r => r.result)
  const bad = []
  const seen = new Set()
  for (const n of nodes) {
    if (n.ignored) continue
    const role = n.role?.value
    if (!['button', 'link', 'checkbox', 'radio', 'switch', 'tab', 'menuitem', 'combobox', 'slider', 'textbox', 'image', 'searchbox'].includes(role)) continue
    const name = (n.name?.value || '').trim()
    if (name) continue
    // resolve to a css-ish description
    let desc = ''
    try {
      const d = await c.send('DOM.resolveNode', { backendNodeId: n.backendDOMNodeId })
      const objectId = d.result.object.objectId
      const r = await c.send('Runtime.callFunctionOn', {
        objectId,
        functionDeclaration: `function(){ if(!this.getBoundingClientRect) return 'non-el'; const b=this.getBoundingClientRect(); const cs=getComputedStyle(this); return JSON.stringify({ tag:this.tagName, cls:(this.className&&this.className.baseVal!==undefined?this.className.baseVal:this.className)||'', id:this.id, html:(this.outerHTML||'').replace(/\s+/g,' ').slice(0,150), w:Math.round(b.width), h:Math.round(b.height), vis: cs.visibility!=='hidden'&&cs.display!=='none'&&b.width>0, path:(()=>{let p=[],e=this;while(e&&e.nodeType===1&&p.length<6){p.unshift(e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.classList&&e.classList[0]?'.'+e.classList[0]:''));e=e.parentElement}return p.join('>')})() }) }`,
        returnByValue: true
      })
      desc = r.result.result.value
    } catch (e) { desc = 'unresolved' }
    let o; try { o = JSON.parse(desc) } catch { continue }
    if (!o || !o.vis) continue
    const k = role + '|' + o.path + '|' + o.cls
    if (seen.has(k)) continue
    seen.add(k)
    bad.push({ role, ...o })
  }
  return { surface: label, count: bad.length, items: bad.slice(0, 40) }
}

const out = []
for (const mode of ['mobile', 'machine', 'animation', 'ds']) {
  await c.js(`window.showcase.mode('${mode}'); 1`); await sleep(2500)
  out.push(await audit(mode))
}
// customise panel open
await c.js(`window.showcase.mode('machine'); document.getElementById('openCustom').click(); 1`); await sleep(1200)
out.push(await audit('customise'))
await c.js(`document.getElementById('closeCustom').click(); 1`); await sleep(600)
for (const [id, name] of [['openBrief', 'brief'], ['openHelp', 'help'], ['openCase', 'case']]) {
  await c.js(`document.getElementById('${id}').click(); 1`); await sleep(3000)
  out.push(await audit(name))
  await c.js(`(document.querySelector('[data-close-help]')||{click(){}}).click(); document.dispatchEvent(new KeyboardEvent('keydown')); 1`)
  await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 })
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 })
  await sleep(900)
}
console.log(JSON.stringify(out, null, 1))
console.log('ERRORS', JSON.stringify(c.errs.slice(0, 8)))
c.close()
