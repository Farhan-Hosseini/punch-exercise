import io

p = 'showcase/anim.css'
s = io.open(p, encoding='utf-8').read()

# the two free columns that let the clip row span the stage also brought two extra column gaps, which pushed the pair
# past the window at the narrowest width the desktop gate allows. The gap between the two screens is the pair's own now.
old = """  display: grid; align-items: start;
  column-gap: clamp(32px, 4vw, 64px); row-gap: 16px;"""
new = """  display: grid; align-items: start;
  /* no column gap: the free columns beside the pair would each take one, and at 768 that pushed the pair off the
     window. The space between the phone and the machine is the machine's own margin instead. */
  column-gap: 0; row-gap: 16px;"""
assert old in s
s = s.replace(old, new)

old2 = """.phone-stage.is-anim .linked { grid-area: machine; margin: 0; display: grid; justify-items: start; align-self: start; width: max(var(--linked-w, 270px), 240px); }"""
new2 = """.phone-stage.is-anim .linked { grid-area: machine; margin: 0 0 0 clamp(32px, 4vw, 64px); display: grid; justify-items: start; align-self: start; width: max(var(--linked-w, 270px), 240px); }"""
assert old2 in s
s = s.replace(old2, new2)

old3 = """.phone-stage[data-anim-layout="stack"] .linked { justify-self: center; margin-top: 28px; }"""
new3 = """.phone-stage[data-anim-layout="stack"] .linked { justify-self: center; margin: 28px 0 0; }"""
assert old3 in s
s = s.replace(old3, new3)

# the clips fill a wrapper that hides its overflow, so a ring drawn outside the video never shows
old4 = """.anim-clip:focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; }"""
new4 = """.anim-clip:focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; }
/* inside the glass and the phone the clip fills a frame that clips its overflow, so the ring goes on the inside edge */
.anim-glass .anim-clip:focus-visible, .anim-phone .anim-clip:focus-visible { outline-offset: -3px; }"""
assert old4 in s
s = s.replace(old4, new4)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('anim.css: stage gap moved onto the pair, focus ring drawn inside the clipped frames')
