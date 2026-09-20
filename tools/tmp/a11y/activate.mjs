/* Can every control be OPERATED from the keyboard, not just reached?
   Each case: focus by real Tab (so :focus-visible and keyboard modality are genuine),
   press the key, then assert the observable effect. */
import { open, sleep } from './cdp.mjs'
const c = await open({ W: 1600, H: 1000, tag: 'ac', motion: 'no-preference' })
await c.boot()
async function raw(k, code, vk, txt) {
  await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
  if (txt) await c.send('Input.dispatchKeyEvent', { type: 'char', text: txt, key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
  await sleep(350)
}
const ENTER = () => raw('Enter', 'Enter', 13, '\r')
const SPACE = () => raw(' ', 'Space', 32, ' ')
const ESC = () => raw('Escape', 'Escape', 27)
// tab until activeElement matches a predicate
async function tabTo(pred, max = 90) {
  for (let i = 0; i < max; i++) {
    await c.key('Tab', { wait: 45 })
    if (await c.js(`(() => { const a = document.activeElement; return !!(${pred}) })()`)) return true
  }
  return false
}
const out = {}

// --- Customise: a section arrow, a segmented control, an accordion summary
await c.js(`window.showcase.mode('machine'); document.getElementById('openCustom').click(); 1`); await sleep(1500)
out.reachedSecBtn = await tabTo(`a.classList.contains('sec-btn') && /Next/.test(a.getAttribute('aria-label')||'')`)
const before = await c.js(`document.querySelector('#globalRows .sec-row .sec-design b, #pageRows .sec-row .sec-design b').textContent`)
await ENTER()
const afterEnter = await c.js(`document.querySelector('#globalRows .sec-row .sec-design b, #pageRows .sec-row .sec-design b').textContent`)
out.secBtnEnterChanged = before !== afterEnter
await SPACE()
out.secBtnSpaceChanged = afterEnter !== await c.js(`document.querySelector('#globalRows .sec-row .sec-design b, #pageRows .sec-row .sec-design b').textContent`)

// the appearance segmented control
await c.js(`document.querySelector('[data-appearance-btn="light"]').focus(); 1`); await sleep(150)
out.reachedAppearance = await tabTo(`a.getAttribute('data-appearance-btn') === 'light'`, 5) || await c.js(`document.activeElement.getAttribute('data-appearance-btn') === 'light'`)
await ENTER()
out.appearanceEnterWorks = (await c.js(`document.documentElement.dataset.appearance`)) === 'light'
await c.js(`document.querySelector('[data-appearance-btn="dark"]').click(); 1`); await sleep(400)

// the accordion
out.accIsNativeDetails = await c.js(`(() => { const s = document.querySelector('.acc-sum'); return s.tagName === 'SUMMARY' && s.parentElement.tagName === 'DETAILS' })()`)
await c.js(`document.querySelector('[data-acc="shared"] .acc-sum').focus(); 1`); await sleep(150)
const openBefore = await c.js(`document.querySelector('[data-acc="shared"]').open`)
await ENTER()
out.accEnterToggles = openBefore !== await c.js(`document.querySelector('[data-acc="shared"]').open`)
await c.js(`document.querySelector('[data-acc="shared"]').open = true; document.getElementById('closeCustom').click(); 1`); await sleep(800)

// --- the top bar mode buttons
out.reachedMode = await tabTo(`a.classList.contains('mode') && a.dataset.mode === 'ds'`)
await ENTER()
out.modeEnterSwitches = !(await c.js(`document.getElementById('dsStage').hidden`))
await c.js(`window.showcase.mode('machine'); 1`); await sleep(1200)

// --- case study: the chapter links and the localnav
await c.js(`document.getElementById('openCase').click(); 1`); await sleep(4500)
out.caseReachedChapter = await tabTo(`a.tagName === 'A' && a.closest('.cs-chapters')`)
const scrollBefore = await c.js(`document.getElementById('caseScroll').scrollTop`)
const href = await c.js(`document.activeElement.getAttribute('href')`)
await ENTER()
await sleep(900)
out.caseChapterHref = href
out.caseChapterJumped = (await c.js(`document.getElementById('caseScroll').scrollTop`)) !== scrollBefore
out.caseFocusAfterJump = await c.js(`document.activeElement.tagName + '.' + (typeof document.activeElement.className === 'string' ? document.activeElement.className : '') + '#' + document.activeElement.id`)
// the geometry diagram's own controls
out.caseReachedGeoBtn = await tabTo(`a.classList.contains('cd-btn')`)
const gBefore = await c.js(`document.activeElement.textContent.trim()`)
await ENTER()
out.geoBtnLabelChanged = gBefore !== await c.js(`document.activeElement.textContent.trim()`)
out.geoBtnPressedAttr = await c.js(`document.activeElement.getAttribute('aria-pressed') + '/' + document.activeElement.getAttribute('aria-label')`)
out.reachedGeoNote = await tabTo(`a.classList.contains('cd-geo-note')`)
const litBefore = await c.js(`document.querySelectorAll('.cd-geo-note.is-on, .cd-geo-note[aria-pressed="true"], .cd-geo-note[aria-current]').length`)
await ENTER()
out.geoNoteEnterChanged = litBefore !== await c.js(`document.querySelectorAll('.cd-geo-note.is-on, .cd-geo-note[aria-pressed="true"], .cd-geo-note[aria-current]').length`)
out.geoNoteState = await c.js(`(() => { const n = document.querySelector('.cd-geo-note'); return JSON.stringify({ pressed: n.getAttribute('aria-pressed'), cur: n.getAttribute('aria-current'), cls: n.className }) })()`)
await ESC()
await sleep(900)
out.escapeClosedCase = await c.js(`!document.getElementById('case').classList.contains('is-open')`)
out.focusAfterCaseClose = await c.js(`document.activeElement.id`)
console.log(JSON.stringify(out, null, 1))
console.log('ERRORS', JSON.stringify(c.errs.slice(0, 6)))
c.close()
