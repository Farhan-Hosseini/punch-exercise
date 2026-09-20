import { open, sleep } from './cdp.mjs'
const W = Number(process.argv[2] || 1440), H = Number(process.argv[3] || 900)
const c = await open({ W, H, tag: 'skb2' })
await c.boot()
async function raw(k, vk, n = 1) { for (let i = 0; i < n; i++) { await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code: k, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }); await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }); await sleep(200) } }
const act = `(() => { const a = document.activeElement; return a ? a.tagName + (a.id ? '#' + a.id : '') + (typeof a.className === 'string' && a.className ? '.' + a.className.trim().split(/\s+/)[0] : '') : 'none' })()`
const o = { viewport: `${W}x${H}` }
// ---- BRIEF, keyboard open
await c.js(`document.getElementById('openBrief').focus(); 1`); await c.key('Enter', { wait: 1500 })
o.brief_focus = await c.js(act)
o.brief_focusVisible = await c.js(`document.activeElement.matches(':focus-visible')`)
o.brief_overflow = await c.js(`(s => s.scrollHeight - s.clientHeight)(document.querySelector('.bf-scroll'))`)
await raw('PageDown', 34, 3); o.brief_afterPD = await c.js(`document.querySelector('.bf-scroll').scrollTop`)
// tab sweep: does focus stay inside the overlay?
const seen = []
for (let i = 0; i < 14; i++) { await c.key('Tab', { wait: 160 }); seen.push(await c.js(act + ` + '|' + (document.getElementById('brief').contains(document.activeElement) ? 'in' : 'OUT')`)) }
o.brief_tabSweep = seen
await raw('Escape', 27, 1); await sleep(1200)
// ---- CASE, keyboard open
await c.js(`document.getElementById('openCase').focus(); 1`); await c.key('Enter', { wait: 4500 })
o.case_focus = await c.js(act)
o.case_closeInsideScroller = await c.js(`!!document.getElementById('caseScroll').contains(document.getElementById('closeCase'))`)
o.case_overflow = await c.js(`(s => s.scrollHeight - s.clientHeight)(document.getElementById('caseScroll'))`)
await raw('PageDown', 34, 3); o.case_afterPD = await c.js(`document.getElementById('caseScroll').scrollTop`)
await raw('Escape', 27, 1); await sleep(1200)
// ---- HELP, keyboard open
await c.js(`document.getElementById('openHelp').focus(); 1`); await c.key('Enter', { wait: 1500 })
o.help_focus = await c.js(act)
o.help_closeInsideScroller = await c.js(`!!document.querySelector('.help-card').contains(document.getElementById('closeHelp'))`)
o.help_overflow = await c.js(`(s => s.scrollHeight - s.clientHeight)(document.querySelector('.help-card'))`)
await raw('PageDown', 34, 3); o.help_afterPD = await c.js(`document.querySelector('.help-card').scrollTop`)
console.log(JSON.stringify(o, null, 1))
console.log('ERRORS', JSON.stringify(c.errs.slice(0, 6)))
c.close()
