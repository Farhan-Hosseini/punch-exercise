import { open, sleep } from './cdp.mjs'
const W = Number(process.argv[2] || 1440), H = Number(process.argv[3] || 900)
const c = await open({ W, H, tag: 'skb' })
await c.boot()
async function raw(k, vk, n = 1) {
  for (let i = 0; i < n; i++) {
    await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code: k, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
    await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
    await sleep(220)
  }
}
const act = `(() => { const a = document.activeElement; return a ? a.tagName + (a.id ? '#' + a.id : '') + (typeof a.className === 'string' && a.className ? '.' + a.className.trim().split(/\s+/).join('.') : '') : 'none' })()`
const tops = `JSON.stringify({ scroll: document.querySelector('.bf-scroll')?.scrollTop, panel: document.querySelector('.brief-panel')?.scrollTop, brief: document.getElementById('brief')?.scrollTop, doc: document.scrollingElement.scrollTop })`
const o = {}
o.viewport = `${W}x${H}`
o.mode = await c.js(`document.documentElement.dataset.mode || document.body.dataset.mode || 'unknown'`)
o.reducedMotion = await c.js(`matchMedia('(prefers-reduced-motion: reduce)').matches`)
// open the brief the way a keyboard user does: focus the trigger, press Enter
await c.js(`document.getElementById('openBrief').focus(); 1`)
o.triggerFocus = await c.js(act)
await c.key('Enter', { wait: 1400 })
o.afterEnter_focus = await c.js(act)
o.afterEnter_isOpen = await c.js(`document.getElementById('brief').classList.contains('is-open')`)
o.closeBtnInsideScroller = await c.js(`!!document.querySelector('.bf-scroll')?.contains(document.getElementById('closeBrief'))`)
o.scrollerGeom = await c.js(`(() => { const s = document.querySelector('.bf-scroll'); return JSON.stringify({ scrollH: s.scrollHeight, clientH: s.clientHeight, overflow: s.scrollHeight - s.clientHeight, tabindex: s.getAttribute('tabindex'), role: s.getAttribute('role') }) })()`)
o.bodyOverflow = await c.js(`getComputedStyle(document.body).overflow`)
o.panelOverflow = await c.js(`getComputedStyle(document.querySelector('.brief-panel')).overflow`)
o.before = await c.js(tops)
await raw('PageDown', 34, 3); o.after3PageDown = await c.js(tops)
await raw('ArrowDown', 40, 8); o.after8ArrowDown = await c.js(tops)
await raw('End', 35, 1); o.afterEnd = await c.js(tops)
await raw('Space', 32, 2); o.afterSpace_focus = await c.js(act); o.afterSpace = await c.js(tops); o.stillOpenAfterSpace = await c.js(`document.getElementById('brief').classList.contains('is-open')`)
// if space activated the close button, reopen
if (!o.stillOpenAfterSpace) { await sleep(900); await c.js(`document.getElementById('openBrief').click(); 1`); await sleep(1400) }
await c.key('Tab', { wait: 400 })
o.focusAfter1Tab = await c.js(act)
await raw('PageDown', 34, 2); o.afterTabThen2PageDown = await c.js(tops)
console.log(JSON.stringify(o, null, 1))
console.log('ERRORS', JSON.stringify(c.errs.slice(0, 6)))
c.close()
