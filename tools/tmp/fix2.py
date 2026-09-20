import io

# the typeface tiles sit inside the Customise panel, which is always light: they were painted with the dark shell's
# pill tokens, which left the samples at 1.9:1. They follow the logo tiles beside them now.
p = 'showcase/styles.css'
s = io.open(p, encoding='utf-8').read()
old = """.face-tile {
  appearance: none; border: 0; cursor: pointer; display: grid; gap: 6px; justify-items: center;
  padding: 16px 8px 12px; border-radius: 12px;
  background: var(--shell-pill, rgba(0, 0, 0, .05)); color: inherit;
  box-shadow: inset 0 0 0 1px transparent;
}
.face-tile[aria-checked="true"] { box-shadow: inset 0 0 0 2px var(--panel-ink); }
.face-tile-s { font-size: 22px; line-height: 1; font-variant-numeric: tabular-nums; }
.face-tile-n { font: 500 12px/1 "Barlow", sans-serif; opacity: .7; }"""
new = """.face-tile {
  appearance: none; cursor: pointer; display: grid; gap: 6px; justify-items: center;
  padding: 16px 8px 12px; border-radius: 12px;
  background: #FFFFFF; border: 2px solid var(--panel-line); color: var(--panel-ink);
  transition: border-color .15s ease, box-shadow .15s ease;
}
.face-tile:hover { border-color: color-mix(in oklab, var(--panel-ink) 30%, transparent); }
.face-tile[aria-checked="true"] { border-color: var(--panel-ink); box-shadow: 0 8px 18px -12px rgba(0, 0, 0, .5); }
.face-tile:focus-visible { outline: 2px solid var(--panel-ink); outline-offset: 3px; }
.face-tile-s { font-size: 22px; line-height: 1; font-variant-numeric: tabular-nums; color: var(--panel-ink); }
.face-tile-n { font: 500 12px/1 "Barlow", sans-serif; color: var(--panel-mute); }"""
assert old in s
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('styles.css: typeface tiles take the panel palette')

# the typeface picker is a radiogroup like the two beside it, so it takes arrows and one tab stop
p = 'showcase/app.js'
s = io.open(p, encoding='utf-8').read()
old = """    document.querySelectorAll('[data-typeface]').forEach((b) => { if (b.tagName === 'BUTTON') b.setAttribute('aria-checked', String(b.dataset.typeface === state.typeface)) })"""
new = """    document.querySelectorAll('[data-typeface]').forEach((b) => {
      if (b.tagName !== 'BUTTON') return
      const on = b.dataset.typeface === state.typeface
      b.setAttribute('aria-checked', String(on))
      b.tabIndex = on ? 0 : -1
    })"""
assert old in s
s = s.replace(old, new)

old2 = """  document.querySelectorAll('button[data-typeface]').forEach((b) => b.addEventListener('click', () => {
    state.typeface = b.dataset.typeface
    apply(); save(); fitScreen()
    if (window.designSystem) requestAnimationFrame(() => window.designSystem.refresh())
    live.textContent = 'Typeface: ' + (b.querySelector('.face-tile-n') || {}).textContent
  }))"""
new2 = """  const faceBtns = [...document.querySelectorAll('button[data-typeface]')]
  faceBtns.forEach((b, i) => {
    const pick = (btn, focus) => {
      state.typeface = btn.dataset.typeface
      apply(); save(); fitScreen()
      if (window.designSystem) requestAnimationFrame(() => window.designSystem.refresh())
      live.textContent = 'Typeface: ' + (btn.querySelector('.face-tile-n') || {}).textContent
      if (focus) btn.focus()
    }
    b.addEventListener('click', () => pick(b, false))
    // the same roving tab stop and arrow keys as the logo and device radiogroups under it
    b.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
      if (!step) return
      e.preventDefault()
      pick(faceBtns[(i + step + faceBtns.length) % faceBtns.length], true)
    })
  })"""
assert old2 in s
s = s.replace(old2, new2)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('app.js: typeface picker gets a roving tab stop and arrow keys')
