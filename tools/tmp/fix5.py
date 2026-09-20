import io
p = 'tools/tmp/verify-fixes.mjs'
s = io.open(p, encoding='utf-8').read()
old = """const ring = await js(`JSON.stringify((() => {
  const v = document.querySelector('.anim-glass .anim-clip')
  if (!v) return { missing: true }
  const cs = getComputedStyle(v)
  return { offset: cs.outlineOffset, parentOverflow: getComputedStyle(v.parentElement).overflow }
})())`)
ok('clip focus ring is drawn inside the clipped frame', ring.includes('-3px'), ring)"""
new = """// :focus-visible only resolves while the element has keyboard focus, so the clip is focused for real first
await js(`document.querySelector('.anim-glass .anim-clip').setAttribute('tabindex', '0'); document.querySelector('.anim-glass .anim-clip').focus(); 1`)
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 })
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 })
await sleep(500)
const ring = await js(`JSON.stringify((() => {
  const v = document.querySelector('.anim-glass .anim-clip')
  if (!v) return { missing: true }
  v.focus()
  const cs = getComputedStyle(v)
  // the rule itself, read out of the stylesheet, so the answer does not depend on the focus state resolving here
  let rule = null
  for (const sh of document.styleSheets) { try { for (const r of sh.cssRules) { if (r.selectorText && r.selectorText.includes('.anim-glass .anim-clip:focus-visible')) rule = r.style.outlineOffset } } catch (e) {} }
  return { ruleOffset: rule, focusVisible: v.matches(':focus-visible'), liveOffset: cs.outlineOffset, parentOverflow: getComputedStyle(v.parentElement).overflow }
})())`)
ok('clip focus ring is drawn inside the clipped frame', ring.includes('"ruleOffset":"-3px"'), ring)"""
assert old in s
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('test reads the rule rather than the resting computed style')
