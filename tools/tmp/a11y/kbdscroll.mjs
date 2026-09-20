import { open, sleep } from './cdp.mjs'
const c = await open({ W: 1440, H: 900, tag: 'ks' })
await c.boot()
async function raw(k, code, vk, n = 1) {
  for (let i = 0; i < n; i++) {
    await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
    await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
    await sleep(160)
  }
}
const act = `document.activeElement.tagName + '.' + (typeof document.activeElement.className === 'string' ? document.activeElement.className : '') + '#' + document.activeElement.id`
const out = {}
await c.js(`window.showcase.mode('machine'); document.getElementById('openCase').click(); 1`); await sleep(4500)
out.caseInitialFocus = await c.js(act)
out.caseScrollHeight = await c.js(`document.getElementById('caseScroll').scrollHeight`)
out.caseClientHeight = await c.js(`document.getElementById('caseScroll').clientHeight`)
out.caseBodyOverflow = await c.js(`getComputedStyle(document.body).overflow`)
out.before = await c.js(`document.getElementById('caseScroll').scrollTop`)
await raw('PageDown', 'PageDown', 34, 3)
out.afterPageDown = await c.js(`document.getElementById('caseScroll').scrollTop`)
await raw('ArrowDown', 'ArrowDown', 40, 6)
out.afterArrowDown = await c.js(`document.getElementById('caseScroll').scrollTop`)
await raw('End', 'End', 35, 1)
out.afterEnd = await c.js(`document.getElementById('caseScroll').scrollTop`)
out.docScrollTop = await c.js(`document.scrollingElement.scrollTop`)
await c.key('Tab', { wait: 250 })
out.focusAfterTab = await c.js(act)
await raw('PageDown', 'PageDown', 34, 2)
out.afterTabThenPageDown = await c.js(`document.getElementById('caseScroll').scrollTop`)
await raw('Escape', 'Escape', 27, 1); await sleep(1000)
// brief: positive control, scroller is tabindex=0
await c.js(`document.getElementById('openBrief').click(); 1`); await sleep(2500)
out.briefInitialFocus = await c.js(act)
out.briefBefore = await c.js(`document.querySelector('.bf-scroll').scrollTop`)
await raw('PageDown', 'PageDown', 34, 2)
out.briefAfterPageDownNoTab = await c.js(`document.querySelector('.bf-scroll').scrollTop`)
await c.key('Tab', { wait: 250 })
out.briefFocusAfterTab = await c.js(act)
await raw('PageDown', 'PageDown', 34, 2)
out.briefAfterTabPageDown = await c.js(`document.querySelector('.bf-scroll').scrollTop`)
console.log(JSON.stringify(out, null, 1))
console.log('ERRORS', JSON.stringify(c.errs.slice(0,6)))
c.close()
