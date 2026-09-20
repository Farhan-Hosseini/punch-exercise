import { open, sleep } from './cdp.mjs'
const c = await open({ W: 1600, H: 1000, tag: 'rd' })
await c.boot()
await c.js(`window.showcase.mode('mobile'); 1`); await sleep(2200)
await c.js(`document.getElementById('openCustom').click(); 1`); await sleep(1200)
const act = `document.activeElement.getAttribute('data-typeface')||document.activeElement.getAttribute('data-logo')||document.activeElement.getAttribute('data-device')||document.activeElement.tagName`
const dump = (sel, attr) => `JSON.stringify([...document.querySelectorAll('${sel}')].map(b=>({v:b.getAttribute('${attr}'),checked:b.getAttribute('aria-checked'),ti:b.tabIndex})))`
async function raw(k, code, vk) {
  await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
  await sleep(220)
}
const out = {}
for (const [name, sel, attr] of [['faces', '.faces [role=radio]', 'data-typeface'], ['logos', '.logos [role=radio]', 'data-logo'], ['devices', '.themes [role=radio]', 'data-device']]) {
  const before = JSON.parse(await c.js(dump(sel, attr)))
  await c.js(`document.querySelector('${sel}').focus(); 1`); await sleep(200)
  const focusedBefore = await c.js(act)
  await raw('ArrowRight', 'ArrowRight', 39)
  const focusedAfter = await c.js(act)
  const after = JSON.parse(await c.js(dump(sel, attr)))
  // does the group also respond to Home/End? and does Space activate?
  out[name] = { tabIndexes: before.map(b => b.ti), checkedBefore: before.map(b => b.checked), focusedBefore, focusedAfterArrowRight: focusedAfter, checkedAfterArrowRight: after.map(b => b.checked), arrowMovesFocus: focusedBefore !== focusedAfter }
}
// group roles / labels
out.groups = JSON.parse(await c.js(`JSON.stringify([...document.querySelectorAll('#custom [role=radiogroup], #custom .seg')].map(g=>({cls:g.className, role:g.getAttribute('role'), labelledby:g.getAttribute('aria-labelledby'), label:g.getAttribute('aria-label'), kids:[...g.children].map(k=>k.getAttribute('role')||k.tagName).join(',')})))`))
console.log(JSON.stringify(out, null, 1))
console.log('ERRORS', JSON.stringify(c.errs.slice(0,6)))
c.close()
