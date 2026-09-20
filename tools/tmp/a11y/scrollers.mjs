import { open, sleep } from './cdp.mjs'
const c = await open({ W: 1440, H: 900, tag: 'sc' })
await c.boot()
const probe = `(() => {
  const out = []
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el)
    const scrolls = (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight - el.clientHeight > 12
    const scrollsX = (cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth - el.clientWidth > 12
    if (!scrolls && !scrollsX) continue
    const b = el.getBoundingClientRect()
    if (b.width < 8 || b.height < 8) continue
    const focusable = el.tabIndex >= 0
    const inner = el.querySelector('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])')
    out.push({ sel: el.tagName.toLowerCase() + (el.id ? '#'+el.id : '') + (el.classList[0] ? '.'+el.classList[0] : ''),
      over: (el.scrollHeight - el.clientHeight) + 'v/' + (el.scrollWidth - el.clientWidth) + 'h',
      tabIndex: el.tabIndex, role: el.getAttribute('role'), label: el.getAttribute('aria-label'),
      keyboardReachable: focusable || !!inner, hasInnerFocusable: !!inner })
  }
  return out
})()`
const res = {}
for (const [name, setup] of [
  ['machine', `window.showcase.mode('machine')`],
  ['mobile', `window.showcase.mode('mobile')`],
  ['ds', `window.showcase.mode('ds')`],
  ['help', `window.showcase.mode('machine'); document.getElementById('openHelp').click()`],
  ['brief', `document.getElementById('closeHelp').click(); document.getElementById('openBrief').click()`],
  ['case', `document.getElementById('closeBrief').click(); document.getElementById('openCase').click()`],
]) {
  await c.js(setup + '; 1'); await sleep(3200)
  res[name] = (await c.jsn(probe))
}
console.log(JSON.stringify(res, null, 1))
console.log('ERRORS', JSON.stringify(c.errs.slice(0,6)))
c.close()
