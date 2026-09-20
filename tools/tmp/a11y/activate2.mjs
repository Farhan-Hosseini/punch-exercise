import { open, sleep } from './cdp.mjs'
const c = await open({ W: 1600, H: 1000, tag: 'a2', motion: 'no-preference' })
await c.boot()
async function raw(k, code, vk, txt) {
  await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
  if (txt) await c.send('Input.dispatchKeyEvent', { type: 'char', text: txt, key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
  await sleep(400)
}
const ENTER = () => raw('Enter', 'Enter', 13, '\r')
const SPACE = () => raw(' ', 'Space', 32, ' ')
async function tabTo(pred, max = 90) {
  for (let i = 0; i < max; i++) {
    await c.key('Tab', { wait: 45 })
    if (await c.js(`(() => { const a = document.activeElement; return !!(${pred}) })()`)) return true
  }
  return false
}
const out = {}
// mode buttons (data-mode="system" is the Design system tab)
await c.js(`window.showcase.mode('machine'); document.activeElement.blur && document.activeElement.blur(); 1`); await sleep(1500)
out.reachedModeSystem = await tabTo(`a.classList.contains('mode') && a.dataset.mode === 'system'`)
await ENTER()
out.modeEnterSwitches = !(await c.js(`document.getElementById('dsStage').hidden`))
out.modeAriaPressed = await c.js(`document.querySelector('.mode[data-mode="system"]').getAttribute('aria-pressed')`)
await c.js(`window.showcase.mode('machine'); 1`); await sleep(1200)
out.reachedModeSpace = await tabTo(`a.classList.contains('mode') && a.dataset.mode === 'mobile'`)
await SPACE()
out.modeSpaceSwitches = !(await c.js(`document.getElementById('phoneStage').hidden`))
await c.js(`window.showcase.mode('machine'); 1`); await sleep(1000)

// the appearance seg, reached only by Tab
await c.js(`document.getElementById('openCustom').click(); 1`); await sleep(1500)
out.reachedAppearance = await tabTo(`a.getAttribute('data-appearance-btn') === 'light'`)
out.appearanceFocusedIs = await c.js(`document.activeElement.getAttribute('data-appearance-btn')`)
await ENTER()
out.appearanceEnterWorks = (await c.js(`document.documentElement.dataset.appearance`)) === 'light'
out.appearanceAriaPressed = await c.js(`document.querySelector('[data-appearance-btn="light"]').getAttribute('aria-pressed')`)
await c.js(`document.querySelector('[data-appearance-btn="dark"]').click(); 1`); await sleep(500)

// the wallet seg and the size seg
out.reachedSize = await tabTo(`a.id === 'readSize' || a.id === 'actualMachine'`, 60)
out.sizeFocused = await c.js(`document.activeElement.id`)
await SPACE()
out.sizePressedAfterSpace = await c.js(`document.getElementById('actualMachine').getAttribute('aria-pressed') + '/' + document.getElementById('readSize').getAttribute('aria-pressed')`)

// the logo radiogroup: Space/Enter on a radio
await c.js(`document.querySelector('.logo-tile[data-logo="fist"]').focus(); 1`); await sleep(200)
await raw('ArrowRight', 'ArrowRight', 39)
out.logoAfterArrow = await c.js(`document.activeElement.dataset.logo + ' checked=' + document.activeElement.getAttribute('aria-checked')`)
out.logoRootAttr = await c.js(`document.documentElement.dataset.logo`)

// reset button
out.reachedReset = await tabTo(`a.id === 'resetCustom'`, 60)
console.log(JSON.stringify(out, null, 1))
console.log('ERRORS', JSON.stringify(c.errs.slice(0, 6)))
c.close()
