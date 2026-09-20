# The round's edits that wait on nothing: the HIT word, the Customise accordion, the how-to title, the case study's
# hero, timeline page, motion section, geometry notes, the Figma icon, the notes chapter and the AI chapter, and the
# Animation tab's deliverable width.  python tools/tmp/batch-edits.py
import io, re

def rw(path):
    return io.open(path, encoding="utf-8").read()

def wr(path, s):
    io.open(path, "w", encoding="utf-8", newline="\n").write(s)

def sub1(s, old, new, label):
    assert old in s, "missing: " + label
    return s.replace(old, new, 1)

# ---------------------------------------------------------------- 3. the how-to sheet title, and the pill that opens it
p = "showcase/parts/phone.html"
s = rw(p)
assert s.count("How to use QR code") >= 2
s = s.replace("How to use QR code", "How to play")
wr(p, s)
p = "showcase/parts/mpage-scan.html"
s = rw(p)
n = s.count("How to use?")
s = s.replace("How to use?", "How to play?")
wr(p, s)
print("phone.html + mpage-scan.html: 'How to play' (%d pills)" % n)

# ---------------------------------------------------------------- 4. the case study
p = "showcase/parts/case.html"
s = rw(p)

# the hero: the cover's key visual as one drawing, no button
old = s[s.index('          <div class="cs-hero-stage" data-hero-stage aria-hidden="true">'):s.index("        </div>\n      </section>\n\n      <!-- ============ environment")]
new = '''          <div class="cs-hero-stage" data-hero-stage aria-hidden="true">
            <img class="cs-hero-kv" src="assets/case/hero-key-visual.svg" alt="" width="839" height="993" decoding="async" fetchpriority="high">
          </div>
'''
s = s.replace(old, new, 1)
old = s[s.index('            <p class="cs-actions cs-rise" data-rise style="--d: 4">'):s.index('          </div>\n\n          <div class="cs-hero-stage"')]
s = s.replace(old, "", 1)

# the second page: what it is, how long each part took
old = s[s.index('      <!-- ============ environment'):s.index('      <!-- ============ chapter: the problem')]
new = '''      <!-- ============ the overview and the time it took, over a full-bleed photograph -->
      <section class="cs-sec cs-env" data-ground="dark" aria-labelledby="csEnv">
        <div class="cs-env-media" data-scale-in>
          <img src="assets/case/hero-bag.jpg" alt="A boxer drives a straight punch into a teardrop bag in a bright gym" width="1800" height="1200" loading="lazy" decoding="async">
        </div>
        <div class="cs-env-copy">
          <p class="cs-env-k cs-rise" data-rise>Overview</p>
          <h2 id="csEnv" class="cs-rise" data-rise style="--d: 1">Make your mark on the machine. Take the glory to your phone.</h2>
          <p class="cs-rise" data-rise style="--d: 2">A punch machine for a mall floor and the app that carries the hit home, designed as one turn. Both surfaces run live in this showcase, every screen and every design of them, and the Figma file behind them is built the same way.</p>
          <dl class="cs-time cs-rise" data-rise style="--d: 3">
            <div><dt>Two hours</dt><dd>The Figma base: type, colour, spacing, the first screens.</dd></div>
            <div><dt>Two hours</dt><dd>Expanding the Figma, screen by screen.</dd></div>
            <div><dt>Four hours</dt><dd>Working with AI on the designs and the variants of every section.</dd></div>
            <div><dt>Two hours</dt><dd>Expanding those and moving them into Figma with AI.</dd></div>
            <div><dt>One day</dt><dd>Expanding the work and polishing the designs.</dd></div>
          </dl>
        </div>
      </section>

'''
s = s.replace(old, new, 1)

# the geometry figure: its heading stays, its caption shrinks
s = sub1(s, "<p>Where people stand, and how much of the panel each of them can actually read from there.</p>",
         "<p>Where each person stands, and what they can read from there.</p>", "geo caption")

# the motion chapter: shorter, both clips on a dark bezel, the machine larger
old = s[s.index('      <!-- ============ chapter: motion.'):s.index('      <!-- ============ chapter: the system both surfaces are built from')]
new = '''      <!-- ============ chapter: motion. The two clips, each on the surface it was cut for -->
      <section class="cs-sec cs-dark cs-motion" id="case-motion" data-ground="dark" data-chapter="case-motion" aria-labelledby="csMotion">
        <div class="cs-wrap cs-head">
          <h2 id="csMotion" class="cs-h2 cs-rise cs-chapter" data-rise tabindex="-1">Neither clip is a screen recording.</h2>
          <p class="cs-lead cs-rise" data-rise style="--d: 1">Each one is rendered a frame at a time from the running screens, so the timing is exactly what they play.</p>
        </div>

        <div class="cs-wrap cs-motion-pair">
          <figure class="cs-motion-fig cs-rise" data-rise>
            <div class="cs-motion-tall">
              <video src="assets/motion/reveal-live-1080x3840.mp4" poster="assets/motion/reveal-live-1080x3840-poster.jpg" muted loop playsinline preload="none" aria-label="The score reveal on the Punch Machine, ten seconds"></video>
            </div>
            <figcaption><b>The reveal</b><span>Ten seconds on the Punch Machine.</span></figcaption>
          </figure>
          <figure class="cs-motion-fig cs-rise" data-rise style="--d: 1">
            <div class="cs-motion-phone">
              <video src="assets/motion/run-live-928x1960.mp4" poster="assets/motion/run-live-928x1960-poster.jpg" muted loop playsinline preload="none" aria-label="One turn on the phone, seventeen seconds"></video>
            </div>
            <figcaption><b>The run</b><span>Seventeen seconds on the phone.</span></figcaption>
          </figure>
        </div>

        <p class="cs-wrap cs-actions cs-rise" data-rise style="--d: 2">
          <button class="cs-btn" type="button" data-go-mode="animation">
            <svg class="cs-ico" width="20" height="20" aria-hidden="true" focusable="false"><use href="#cs-i-clapperboard"/></svg>
            Watch them together
          </button>
        </p>
      </section>

'''
s = s.replace(old, new, 1)

# the Figma mark, from Simple Icons (CC0), in place of the hand-drawn one, both places
FIGMA = ('<svg class="cs-ico" width="18" height="18" aria-hidden="true" focusable="false" viewBox="0 0 24 24">'
         '<path d="M15.852 8.981h-4.588V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491zM12.735 7.51h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.355-3.019-3.019-3.019h-3.117V7.51zm0 1.471H8.148c-2.476 0-4.49-2.014-4.49-4.49S5.672 0 8.148 0h4.588v8.981zm-4.587-7.51c-1.665 0-3.019 1.355-3.019 3.019s1.354 3.02 3.019 3.02h3.117V1.471H8.148zm4.587 15.019H8.148c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v8.98zM8.148 8.981c-1.665 0-3.019 1.355-3.019 3.019s1.355 3.019 3.019 3.019h3.117V8.981H8.148zM8.172 24c-2.489 0-4.515-2.014-4.515-4.49s2.014-4.49 4.49-4.49h4.588v4.441c0 2.503-2.047 4.539-4.563 4.539zm-.024-7.51a3.023 3.023 0 0 0-3.019 3.019c0 1.665 1.365 3.019 3.044 3.019 1.705 0 3.093-1.376 3.093-3.068v-2.97H8.148zm7.704 0h-.098c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h.098c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.49-4.49 4.49zm-.097-7.509c-1.665 0-3.019 1.355-3.019 3.019s1.355 3.019 3.019 3.019h.098c1.665 0 3.019-1.355 3.019-3.019s-1.355-3.019-3.019-3.019h-.098z"/></svg>')
n = len(re.findall(r'<svg class="cs-ico" width="18" height="18" aria-hidden="true" focusable="false" viewBox="0 0 38 57">.*?</svg>', s, re.S))
s = re.sub(r'<svg class="cs-ico" width="18" height="18" aria-hidden="true" focusable="false" viewBox="0 0 38 57">.*?</svg>', FIGMA, s, flags=re.S)
assert n == 2, n

# the notes chapter goes, with its nav entry
old = s[s.index('      <!-- ============ chapter: notes.'):s.index('      <!-- ============ how AI was used')]
s = s.replace(old, "", 1)
s = sub1(s, '            <li><a href="#case-notes" data-case-jump>Changes</a></li>\n', "", "notes nav")

# the AI chapter, half the size
old = s[s.index('      <!-- ============ how AI was used'):s.index('      <!-- ============ closing:')]
new = '''      <!-- ============ how AI was used -->
      <section class="cs-sec cs-dark cs-ai" id="case-ai" data-ground="dark" data-chapter="case-ai" aria-labelledby="csAI">
        <div class="cs-wrap cs-ai-grid">
          <div class="cs-ai-head">
            <h2 id="csAI" class="cs-h2 cs-rise" data-rise>How AI was used.</h2>
            <p class="cs-lead cs-rise" data-rise style="--d: 1">Claude in Claude Code worked as a design team, and every step had a reviewer.</p>
          </div>
          <ul class="cs-ai-list">
            <li class="cs-rise" data-rise><h3 class="cs-h4">An audit, then five directions.</h3><p>Five directions scored by judges working apart, then three skeptics who reshaped the work around the run.</p></li>
            <li class="cs-rise" data-rise><h3 class="cs-h4">Builders on a shared contract.</h3><p>Agents built the Figma file through its API, rendered the clips from code and gathered the photo library.</p></li>
            <li class="cs-rise" data-rise><h3 class="cs-h4">Then a pass that only cut.</h3><p>A critic on every screen, and out went whatever repeated something already on it.</p></li>
          </ul>
        </div>
      </section>

'''
s = s.replace(old, new, 1)
wr(p, s)
print("case.html: hero, overview page, motion, Figma mark, notes gone, AI halved")

# ---------------------------------------------------------------- 5. the geometry diagram: far less text, set smaller
p = "showcase/parts/case-geometry.html"
s = rw(p)
before = len(s)
def set_text(s, cls, new, count=1):
    pat = re.compile(r'(<(p|span)\b[^>]*class="[^"]*\b' + re.escape(cls) + r'\b[^"]*"[^>]*>)([^<]*)(</\2>)')
    hits = pat.findall(s)
    assert len(hits) >= count, cls
    return pat.sub(lambda m: m.group(1) + new + m.group(4), s, count=count)
s = set_text(s, "cd-lead", "Drawn to scale: the panel runs from half a metre to two, and the pad sits at chest height beside it.")
s = set_text(s, "cd-small", "Heights from the floor. The bands are the panel face.", 1)
s = re.sub(r'(<p class="cd-small">)Drawn to scale\. PAD_SIDE[^<]*(</p>)', r'\1The pad, the rail and the code all sit on the side away from the queue.\2', s)
# the six viewing positions: one clause each
notes = [
    ("Player at the pad", "The crown sits well above the eye line; the code is at chest height."),
    ("Player stepped back", "Nearly the whole panel, with the crown a little above the eyes."),
    ("Group at the queue decal", "The whole column, off axis. A poster: the score and the crown read, the rest does not."),
    ("Spectator behind the player", "Not a designed position. The player's head covers the middle of the panel."),
    ("Far spectator, off axis", "A poster from here."),
    ("Child, eye", "The crown is high but it is a three second event, not reading."),
]
for title, line in notes:
    pat = re.compile(r'(<span class="cd-geo-note-t">' + re.escape(title) + r'[^<]*</span>\s*<span class="cd-geo-note-d">)[^<]*(</span>)')
    assert pat.search(s), title
    s = pat.sub(lambda m: m.group(1) + line + m.group(2), s, count=1)
specs = [
    ("MOUNT_TOP", "The glass top at two metres, the bottom at half a metre."),
    ("Scale", "Two and a half pixels to the millimetre, so the whole canvas is a metre and a half tall."),
    ("PAD_SIDE", "The pad is beside the panel; the layout mirrors when it moves to the other side."),
    ("Camera", "In the side bezel at chest height, turned toward the pad."),
]
for title, line in specs:
    pat = re.compile(r'(<p class="cd-geo-spec-t">' + re.escape(title) + r'[^<]*</p>\s*<p class="cd-geo-spec-d">)[^<]*(</p>)')
    assert pat.search(s), title
    s = pat.sub(lambda m: m.group(1) + line + m.group(2), s, count=1)
wr(p, s)
print("case-geometry.html: %d -> %d bytes of markup" % (before, len(s)))

# ---------------------------------------------------------------- 6. the case stylesheet: new pieces, dead pieces
p = "showcase/case.css"
s = rw(p)
# the hero drawing
old = s[s.index("/* the pair, as the cover shows them:"):s.index("@media (max-width: 900px) {\n  .cs-hero-grid")]
new = '''/* the cover's key visual, one drawing: it stands as tall as the stage and keeps its own proportions */
.cs-hero-stage { position: relative; height: min(76vh, 760px); display: grid; justify-items: end; align-items: center; }
.cs-hero-kv { height: 100%; width: auto; max-width: 100%; object-fit: contain; object-position: right center; filter: drop-shadow(0 40px 90px rgba(0, 0, 0, .55)); }

'''
s = s.replace(old, new, 1)
# the overview page: the kicker, the timeline
old = s[s.index(".cs-env-copy .cs-env-slogan {"):s.index(".cs-env-copy p { margin-top: 20px;")]
new = '''.cs-env-k { font: 700 clamp(11px, .8vw, 13px)/1 var(--f-doc); letter-spacing: .12em; text-transform: uppercase; color: var(--red); }
.cs-env-copy h2 { margin-top: 20px; }
/* how long each part took: the time on the left, the part on the right */
.cs-time { margin: clamp(28px, 3vw, 44px) 0 0; display: grid; gap: 0; max-width: 40em; border-top: 1px solid rgba(245, 245, 247, .18); }
.cs-time > div { display: grid; grid-template-columns: minmax(0, 8.5em) minmax(0, 1fr); gap: 20px; align-items: baseline; padding-block: 14px; border-bottom: 1px solid rgba(245, 245, 247, .18); }
.cs-time dt { font: 700 clamp(17px, 1.4vw, 22px)/1.2 var(--f-doc); color: var(--fg); letter-spacing: -.018em; }
.cs-time dd { margin: 0; font: 400 clamp(14px, 1.1vw, 17px)/1.45 var(--f-doc); color: rgba(245, 245, 247, .8); }
'''
s = s.replace(old, new, 1)
s = sub1(s, ".cs-env-copy p { margin-top: 20px; max-width: 30em;", ".cs-env-copy > p:not(.cs-env-k) { margin-top: 20px; max-width: 34em;", "env p")
# the notes chapter's rules
for a, b in [("/* ------------------------------------------------------------ where I pushed back", ".cs-push-list li::before"),]:
    i = s.index(a); j = s.index(b); j = s.index("\n", j) + 1
    s = s[:i] + s[j:]
s = s.replace("  .cs-push-list { columns: 1; }\n", "")
s = re.sub(r"\.cs-validate \{[^\n]*\n\.cs-highlight-q \{[^\n]*\n\.cs-highlight-q span \{[^\n]*\n\.cs-highlight-q span \+ span \{[^\n]*\n", "", s)
# the AI chapter's second block
s = re.sub(r"\.cs-ai-after \{[^\n]*\n\.cs-ai-after > \.cs-h3 \{[^\n]*\n\.cs-ai-changes \{[^\n]*\n\.cs-ai-changes li \{[^\n]*\n\.cs-ai-changes p \{[^\n]*\n@media \(max-width: 960px\) \{ \.cs-ai-changes[^\n]*\n@media \(max-width: 620px\) \{ \.cs-ai-changes[^\n]*\n", "", s)
# the motion pair: dark bezels, the machine taller
old = s[s.index(".cs-motion-tall, .cs-motion-phone {"):s.index(".cs-motion-fig figcaption { display: grid;")]
new = '''.cs-motion-tall, .cs-motion-phone {
  position: relative; overflow: hidden; background: #060606;
  box-shadow: 0 0 0 5px #1B1A19, 0 0 0 6px rgba(255, 255, 255, .1), 0 40px 90px -40px rgba(0, 0, 0, .9);
}
.cs-motion-tall { aspect-ratio: 1080 / 3840; height: min(78vh, 760px); margin-inline: auto; width: auto; border-radius: 8px; }
.cs-motion-phone { aspect-ratio: 928 / 1960; height: min(78vh, 760px); margin-inline: auto; width: auto; border-radius: 28px; }
.cs-motion-tall video, .cs-motion-phone video { display: block; width: 100%; height: 100%; object-fit: cover; }
'''
s = s.replace(old, new, 1)
wr(p, s)
print("case.css: hero drawing, timeline, motion bezels; notes and AI leftovers removed")

# ---------------------------------------------------------------- 7. the geometry notes, set smaller
p = "showcase/case-diagrams.css"
s = rw(p)
for cls, size in [(".cd-geo-note-d", "13px"), (".cd-geo-spec-d", "13px"), (".cd-small", "13px"), (".cd-lead", "15px")]:
    pass
s += '''
/* round eleven: the notes beside the geometry say one thing each, and say it smaller */
.cd-lead { font-size: 15px; max-width: 46em; }
.cd-small, .cd-geo-note-d, .cd-geo-spec-d { font-size: 13px; line-height: 1.45; }
.cd-geo-note-t, .cd-geo-spec-t { font-size: 13px; }
'''
wr(p, s)
print("case-diagrams.css: notes set smaller")

# ---------------------------------------------------------------- 8. the Animation tab's deliverable sits in the shell's container
p = "showcase/anim.css"
s = rw(p)
s = sub1(s, "/* it spans every column of the stage, so it is as wide as the container and never as narrow as the pair */\n.phone-stage.is-anim .anim-extra { grid-area: clip; }",
         "/* it spans every column of the stage, then sits in the same container as the rest of the site: no wider than the\n   case study's measure, centred */\n.phone-stage.is-anim .anim-extra { grid-area: clip; width: min(100%, 1180px); margin-inline: auto; }", "anim-extra")
wr(p, s)
print("anim.css: deliverable capped to the 1180 container")

# ---------------------------------------------------------------- 9. case.js: no hero embed to load any more
p = "showcase/case.js"
s = rw(p)
s = sub1(s, "    loadEmbed(embeds.hero)", "    if (embeds.hero) loadEmbed(embeds.hero)\n    else if (embeds.seq) setTimeout(() => { if (open) loadEmbed(embeds.seq) }, 1200)", "hero embed")
wr(p, s)
print("case.js: hero embed optional")
