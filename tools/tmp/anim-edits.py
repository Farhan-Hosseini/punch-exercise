# The Animation tab: the phone clip loses the strip of page above the handset that the capture kept, and the machine
# piece takes the same shape as the phone piece above it: words on top, then the clips row.
import io, re

def rw(p): return io.open(p, encoding="utf-8").read()
def wr(p, s): io.open(p, "w", encoding="utf-8", newline="\n").write(s)

# ---- the phone clip: 58 of the capture's 1960 rows are the page above the handset; the frame shows the rest
p = "showcase/anim.css"
s = rw(p)
old = ".anim-phone { height: calc((100cqw - 40px) * .4442); aspect-ratio: 928 / 1960; border-radius: calc((100cqw - 40px) * .0335); }"
new = """.anim-phone { height: calc((100cqw - 40px) * .4442); aspect-ratio: 928 / 1902; border-radius: calc((100cqw - 40px) * .0335); }
/* the capture kept 58 rows of page above the handset; the frame is that much shorter and the clip sits at its foot,
   so the handset's top edge is the frame's top edge */
.anim-phone .anim-clip { height: calc(100% * 1960 / 1902); object-position: 50% 100%; }"""
assert old in s
s = s.replace(old, new, 1)

# ---- the machine piece: the same two-column clips row as the phone piece, the beats where the phone has its cut
old = s[s.index("/* the machine piece: the panel is the only thing in its clip"):s.index("/* what happens, in order, beside the clip")]
new = """/* the machine piece follows the phone piece above it: words on top, then a clips row with the panel on the left
   at a third of its size and the beats on the right, where the phone piece has its presentation cut */
.anim-piece-tall .anim-clips { grid-template-columns: auto minmax(0, 1fr); align-items: start; }
.anim-fig-tall { width: clamp(300px, calc(100cqw * .3), 360px); }
.anim-fig-tall .anim-glass { width: 100%; height: auto; }
.anim-beats-col { display: grid; gap: 24px; align-content: start; min-width: 0; padding-top: 4px; }
"""
s = s.replace(old, new, 1)
s = s.replace("""  .anim-piece-tall { grid-template-columns: minmax(0, 1fr); }
  .anim-beats > div { grid-template-columns: minmax(0, 1fr); }
  .anim-tall-text { position: static; }
  .anim-fig-tall { width: min(100%, 320px); justify-self: center; }""",
"""  .anim-piece-tall .anim-clips { grid-template-columns: minmax(0, 1fr); }
  .anim-beats > div { grid-template-columns: minmax(0, 1fr); }
  .anim-fig-tall { width: min(100%, 320px); justify-self: center; }""")
wr(p, s)
print("anim.css: phone clip cropped, machine piece shaped like the phone piece")

# ---- the markup: head, then the clips row, then the files, as the phone piece is laid out
p = "showcase/index.html"
s = rw(p)
i = s.index('    <article class="anim-piece anim-piece-tall" aria-labelledby="animOneTitle">')
j = s.index('    </article>', i) + len('    </article>\n')
new = '''    <article class="anim-piece anim-piece-tall" aria-labelledby="animOneTitle">
      <div class="anim-extra-head">
        <p class="anim-k">The Punch Machine</p>
        <h3 class="anim-piece-title" id="animOneTitle">The score reveal</h3>
        <p class="anim-p">The panel alone, at its own size, with nothing else in frame. Every part of it is the live component, not a mock-up.</p>
      </div>
      <div class="anim-clips">
        <figure class="anim-fig anim-fig-tall">
          <div class="anim-glass"><video class="anim-clip" data-anim-clip src="assets/motion/reveal-live-1080x3840.mp4" poster="assets/motion/reveal-live-1080x3840-poster.jpg" muted loop playsinline preload="none" aria-label="The score reveal on the live machine panel at its own size, 1080 by 3840"></video></div>
        </figure>
        <div class="anim-beats-col">
          <dl class="anim-beats">
            <div><dt>Punch now</dt><dd>The count's last seconds, and it speeds up as the time drains.</dd></div>
            <div><dt>The strike</dt><dd>The count breaks the moment the bag moves.</dd></div>
            <div><dt>Reading the strike</dt><dd>No number yet. One line draws the hit as the sensor felt it.</dd></div>
            <div><dt>New record</dt><dd>The name at the top flaps over, and the machine best rolls up to hers.</dd></div>
            <div><dt>Big score</dt><dd>The number again, as wide as the panel, for the back of the queue.</dd></div>
            <div><dt>Why it counts</dt><dd>One reason to care, and only one: this hit took today's crown.</dd></div>
            <div><dt>The still</dt><dd>Then the strike itself, so the number has a face.</dd></div>
          </dl>
        </div>
      </div>
      <p class="anim-files">
        <a href="assets/motion/reveal-live-1080x3840.mp4" download>Master MP4</a>
      </p>
    </article>
'''
s = s[:i] + new + s[j:]
wr(p, s)
print("index.html: machine piece restructured")
