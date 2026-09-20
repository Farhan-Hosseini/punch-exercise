# Round thirteen: the case study's hero goes live (a phone embed joins the machine embed), the overview gets its
# photograph, numbers and note, the problem chapter loses its head, the motion chapter goes, the plan view goes,
# the AI chapter's wording, the paging icon.  python tools/tmp/r13-edits.py
import io, re

def rw(p): return io.open(p, encoding="utf-8").read()
def wr(p, s): io.open(p, "w", encoding="utf-8", newline="\n").write(s)
def sub1(s, old, new, label):
    assert old in s, "missing: " + label
    return s.replace(old, new, 1)

# ---------------------------------------------------------------- the phone embed: ?embed=phone
p = "showcase/index.html"; s = rw(p)
s = sub1(s, "  if (/[?&]embed=machine\\b/.test(location.search)) document.documentElement.dataset.embed = 'machine'",
         "  if (/[?&]embed=machine\\b/.test(location.search)) document.documentElement.dataset.embed = 'machine'\n  else if (/[?&]embed=phone\\b/.test(location.search)) document.documentElement.dataset.embed = 'phone'", "embed detect")
wr(p, s)

p = "showcase/styles.css"; s = rw(p)
s = sub1(s, ':root[data-embed="machine"] [class*="netlify-badge"] { display: none !important; }',
         ''':root[data-embed="machine"] [class*="netlify-badge"] { display: none !important; }

/* ?embed=phone: this same page as the handset alone, for the case study's hero. Nothing but the phone draws, and
   mobile.js fits it to the frame that holds it. */
:root[data-embed="phone"] body { min-height: 0; overflow: hidden; background: transparent; }
:root[data-embed="phone"] .topbar, :root[data-embed="phone"] .loader, :root[data-embed="phone"] .mpagebar,
:root[data-embed="phone"] .pagebar, :root[data-embed="phone"] .pagenav, :root[data-embed="phone"] .custom,
:root[data-embed="phone"] .custom-scrim, :root[data-embed="phone"] .panel-veil, :root[data-embed="phone"] .brief,
:root[data-embed="phone"] .case, :root[data-embed="phone"] .helpwrap, :root[data-embed="phone"] .stage,
:root[data-embed="phone"] .ds-stage, :root[data-embed="phone"] .anim-extra, :root[data-embed="phone"] .linked,
:root[data-embed="phone"] netlify-hud, :root[data-embed="phone"] [id^="netlify-"] { display: none !important; }
:root[data-embed="phone"] body .phone-stage { display: grid; place-items: center; min-height: 100vh; padding: 0 !important; }''', "phone embed css")
# the desktop gate stays out of every embed, not only the machine's
s = s.replace(':root[data-embed="machine"] .deskgate { display: none !important; }', ':root[data-embed] .deskgate { display: none !important; }')
s = s.replace(':root:not([data-embed="machine"]) .deskgate', ':root:not([data-embed]) .deskgate')
wr(p, s)
print("phone embed: page flag and stylesheet")

p = "showcase/app.js"; s = rw(p)
s = sub1(s, "  const EMBED = document.documentElement.dataset.embed === 'machine'",
         "  const EMBED = document.documentElement.dataset.embed === 'machine'\n  // ?embed=phone: the handset alone, for the case study's hero; it reads the saved state and writes nothing\n  const EMBED_PHONE = document.documentElement.dataset.embed === 'phone'", "EMBED const")
s = sub1(s, "  if (EMBED) document.querySelectorAll('[aria-live], [role=\"status\"]').forEach((el) => el.setAttribute('aria-live', 'off'))",
         "  if (EMBED || EMBED_PHONE) document.querySelectorAll('[aria-live], [role=\"status\"]').forEach((el) => el.setAttribute('aria-live', 'off'))", "aria-live")
s = sub1(s, "    if (EMBED) return // the embedded machine never writes: the page around it owns the saved state",
         "    if (EMBED || EMBED_PHONE) return // an embedded surface never writes: the page around it owns the saved state", "save guard")
s = sub1(s, "    setMode(EMBED ? 'machine' : state.mode, true)\n    setMscreen(EMBED ? 'default' : state.mscreen, {}, true)",
         "    setMode(EMBED ? 'machine' : EMBED_PHONE ? 'mobile' : state.mode, true)\n    setMscreen(EMBED ? 'default' : state.mscreen, {}, true)", "boot mode")
s = sub1(s, "    if (EMBED) { loader.classList.add('is-done'); loader.setAttribute('aria-hidden', 'true'); fitScreen(); return }",
         "    if (EMBED || EMBED_PHONE) { loader.classList.add('is-done'); loader.setAttribute('aria-hidden', 'true'); fitScreen(); return }", "boot loader")
s = sub1(s, "  if (linkedFrame && !EMBED) {", "  if (linkedFrame && !EMBED && !EMBED_PHONE) {", "warm glass")
wr(p, s)

p = "showcase/mobile.js"; s = rw(p)
s = sub1(s, "  const EMBED = document.documentElement.dataset.embed === 'machine'",
         "  const EMBED_PHONE = document.documentElement.dataset.embed === 'phone'\n  // an embedded surface, machine or phone, keeps to itself: no saved state, no flow channel\n  const EMBED = document.documentElement.dataset.embed === 'machine' || EMBED_PHONE", "mobile EMBED")
s = sub1(s, "  if (!EMBED) go(Object.hasOwn(pages, String(st.page)) && st.page !== 'punch' ? st.page : 'default')",
         "  if (!EMBED) go(Object.hasOwn(pages, String(st.page)) && st.page !== 'punch' ? st.page : 'default')\n  // the phone embed opens on the page its frame asks for (?page=hit), as the player who just punched\n  else if (EMBED_PHONE) { const want = (/[?&]page=([a-z]+)/.exec(location.search) || [])[1]; go(Object.hasOwn(pages, String(want)) ? want : 'hit', { player: 'me' }) }", "boot page")
s = sub1(s, "    const z = st.fit ? Math.max(.4, Math.min(1, availH / h, availW / w)) : Math.min(1, availW / w)",
         "    // an embedded phone fills the frame that holds it\n    const z = EMBED_PHONE ? Math.min(1, window.innerHeight / h, document.documentElement.clientWidth / w) : st.fit ? Math.max(.4, Math.min(1, availH / h, availW / w)) : Math.min(1, availW / w)", "fit")
wr(p, s)
print("phone embed: app.js and mobile.js")

p = "showcase/case.js"; s = rw(p)
s = sub1(s, "    embeds[frame.dataset.embed] = { frame, want: frame.dataset.screen || null, shown: null, sc: null, ready: false, loading: false }",
         "    embeds[frame.dataset.embed] = { frame, kind: frame.dataset.kind || 'machine', want: frame.dataset.screen || frame.dataset.page || null, shown: null, sc: null, ready: false, loading: false }", "embed map")
s = sub1(s, "    e.frame.src = './?embed=machine&follow=0'",
         "    e.frame.src = e.kind === 'phone' ? `./?embed=phone&page=${e.want || 'hit'}` : './?embed=machine&follow=0'", "embed src")
s = sub1(s, """    let sc = null
    try { sc = e.frame.contentWindow && e.frame.contentWindow.showcase } catch (err) { sc = null }
    if (sc && typeof sc.mscreen === 'function') {""",
         """    let sc = null
    try { sc = e.frame.contentWindow && (e.kind === 'phone' ? e.frame.contentWindow.punchApp : e.frame.contentWindow.showcase) } catch (err) { sc = null }
    if (sc && typeof (e.kind === 'phone' ? sc.go : sc.mscreen) === 'function') {""", "wait ready")
s = sub1(s, "    try { e.sc.mscreen(e.want) } catch (err) { /* the embed went away: it reloads on the next open */ }",
         "    try { if (e.kind === 'phone') e.sc.go(e.want, { player: 'me' }); else e.sc.mscreen(e.want) } catch (err) { /* the embed went away: it reloads on the next open */ }", "apply embed")
s = sub1(s, "    if (embeds.hero) loadEmbed(embeds.hero)\n    else if (embeds.seq) setTimeout(() => { if (open) loadEmbed(embeds.seq) }, 1200)",
         "    if (embeds.hero) loadEmbed(embeds.hero)\n    else if (embeds.seq) setTimeout(() => { if (open) loadEmbed(embeds.seq) }, 1200)\n    if (embeds['hero-phone']) loadEmbed(embeds['hero-phone'])", "hero load")
wr(p, s)
print("phone embed: case.js")

# ---------------------------------------------------------------- the case study
p = "showcase/parts/case.html"; s = rw(p)

# the hero: both surfaces live, and the task's two numbers
s = sub1(s, '''            <img class="cs-hero-kv" src="assets/case/hero-key-visual.webp" alt="" width="1678" height="1986" decoding="async" fetchpriority="high">''',
         '''            <div class="cs-hero-glass" inert>
              <iframe class="cs-embed" data-embed="hero" data-screen="default" title="" tabindex="-1"></iframe>
            </div>
            <div class="cs-hero-phone" inert>
              <iframe class="cs-embed cs-embed-phone" data-embed="hero-phone" data-kind="phone" data-page="hit" title="" tabindex="-1"></iframe>
            </div>''', "hero stage")
s = sub1(s, '''          <p class="cs-hero-lead cs-rise" data-rise style="--d: 3">A one and a half metre panel on the ground floor of Dubai Mall, and the phone in the player's hand. Both surfaces are running in this showcase at their real sizes, every screen and every design of it.</p>''',
         '''          <p class="cs-hero-lead cs-rise" data-rise style="--d: 3">A one and a half metre panel on the ground floor of Dubai Mall, and the phone in the player's hand. Both surfaces are running in this showcase at their real sizes, every screen and every design of it.</p>
          <dl class="cs-hero-facts cs-rise" data-rise style="--d: 4">
            <div><dt>Task duration</dt><dd>6 days</dd></div>
            <div><dt>Time it took</dt><dd>2 days</dd></div>
          </dl>''', "hero facts")

# the overview: the photograph, the numbers, the note
s = sub1(s, '''          <img src="assets/case/hero-bag.jpg" alt="A boxer drives a straight punch into a teardrop bag in a bright gym" width="1800" height="1200" loading="lazy" decoding="async">''',
         '''          <img src="assets/case/overview-strike.jpg" alt="A boxer in guard beside a heavy bag, in red and teal light" width="1800" height="1146" loading="lazy" decoding="async">''', "overview photo")
old = s[s.index('          <dl class="cs-time cs-rise" data-rise style="--d: 3">'):s.index('          </dl>', s.index('          <dl class="cs-time')) + len('          </dl>\n')]
new = '''          <dl class="cs-time cs-rise" data-rise style="--d: 3">
            <div><dt>2 hours</dt><dd>Figma first: the basic structure of the pages, planned and built as the base.</dd></div>
            <div><dt>2 hours</dt><dd>The first website prototypes of the mobile and machine screens.</dd></div>
            <div><dt>4 hours</dt><dd>Expanding the variants, building them in Figma, and growing the website and the case study.</dd></div>
            <div><dt>1 day</dt><dd>Polish, better results, and the case study.</dd></div>
          </dl>
          <p class="cs-time-note cs-rise" data-rise style="--d: 4">The task allowed 6 days. This was made in the last 2 of them: for the first 4 I was away on an urgent personal matter and had to travel to Iran.</p>
'''
s = s.replace(old, new, 1)

# the problem chapter loses its heading and lead
old = s[s.index('        <div class="cs-wrap cs-head">\n          <h2 id="csProblem"'):s.index('        <figure class="cs-wrap cs-heights cs-rise"')]
s = s.replace(old, '', 1)
s = sub1(s, '<h3 class="cs-h4" id="csHeightsTitle">Where everyone stands.</h3>', '<h3 class="cs-h4 cs-chapter" id="csHeightsTitle" tabindex="-1">Where everyone stands.</h3>', "heights title")
s = s.replace('aria-labelledby="csProblem"', 'aria-labelledby="csHeightsTitle"')

# the paging button's icon: three panels, side by side
s = sub1(s, '      <symbol id="cs-i-rectangle-vertical" viewBox="0 0 24 24"><rect width="12" height="20" x="6" y="2" rx="2"/></symbol>',
         '      <symbol id="cs-i-rectangle-vertical" viewBox="0 0 24 24"><rect width="12" height="20" x="6" y="2" rx="2"/></symbol>\n      <symbol id="cs-i-gallery" viewBox="0 0 24 24"><path d="M2 3v18"/><rect width="12" height="18" x="6" y="3" rx="2"/><path d="M22 3v18"/></symbol>', "sprite")
s = sub1(s, '''                <svg class="cs-ico" width="20" height="20" aria-hidden="true" focusable="false"><use href="#cs-i-rectangle-vertical"/></svg>
                Page through them''', '''                <svg class="cs-ico" width="20" height="20" aria-hidden="true" focusable="false"><use href="#cs-i-gallery"/></svg>
                Page through them''', "page through icon")

# the motion chapter goes, with its link
old = s[s.index('      <!-- ============ chapter: motion.'):s.index('      <!-- ============ chapter: the system both surfaces are built from')]
s = s.replace(old, '', 1)
s = sub1(s, '            <li><a href="#case-motion" data-case-jump>Motion</a></li>\n', '', "motion nav")

# the AI chapter: Figma by hand, then AI into Figma
s = sub1(s, '''<li class="cs-rise" data-rise><h3 class="cs-h4">Builders on a shared contract.</h3><p>Agents built the Figma file through its API, rendered the clips from code and gathered the photo library.</p></li>''',
         '''<li class="cs-rise" data-rise><h3 class="cs-h4">Created in Figma, expanded by AI into Figma.</h3><p>The base was drawn by hand in Figma. AI grew the variants and wrote them back into Figma, rendered the clips from code and gathered the photo library.</p></li>''', "ai figma")
wr(p, s)
print("case.html: hero live, overview, problem head gone, motion gone, AI wording, icon")

# ---------------------------------------------------------------- the geometry: no plan view
p = "showcase/parts/case-geometry.html"; s = rw(p)
i = s.index('    <section class="cd-geo-plan" aria-labelledby="cdPlanH">')
j = s.index('    </section>\n', i) + len('    </section>\n')
s = s[:i] + s[j:]
wr(p, s)
print("case-geometry.html: plan view gone")

# ---------------------------------------------------------------- the case stylesheet
p = "showcase/case.css"; s = rw(p)
old = s[s.index("/* the cover's key visual, one drawing:"):s.index("@media (max-width: 900px) {\n  .cs-hero-grid")]
new = '''/* the pair, live: the machine at the stage's full height, the phone a little under it, both whole in the frame */
.cs-hero-stage { position: relative; height: min(76vh, 760px); }
.cs-hero-glass, .cs-hero-phone { position: absolute; overflow: hidden; }
.cs-hero-glass {
  right: 0; top: 0; height: 100%; width: auto; aspect-ratio: 1080 / 3840; border-radius: 8px; background: #0B0B0C;
  box-shadow: 0 0 0 5px #1B1A19, 0 0 0 6px rgba(255, 255, 255, .1), 0 40px 90px -24px rgba(0, 0, 0, .75);
}
/* the handset draws its own frame, so this box only sizes it: 464 x 980 plus the 12 px the phone stage keeps clear */
.cs-hero-phone { left: 0; top: 13%; height: 74%; width: auto; aspect-ratio: 488 / 996; filter: drop-shadow(0 40px 60px rgba(0, 0, 0, .6)); }
.cs-hero-phone .cs-embed { position: static; width: 100%; height: 100%; border: 0; display: block; background: transparent; opacity: 1; }
.cs-hero-facts { margin: clamp(20px, 2vw, 32px) 0 0; display: flex; gap: clamp(24px, 3vw, 48px); }
.cs-hero-facts div { display: grid; gap: 4px; }
.cs-hero-facts dt { font: 700 clamp(11px, .8vw, 13px)/1 var(--f-doc); letter-spacing: .1em; text-transform: uppercase; color: var(--red); }
.cs-hero-facts dd { margin: 0; font: 700 clamp(20px, 1.9vw, 34px)/1 var(--f-doc); letter-spacing: -.02em; color: var(--fg); }

'''
s = s.replace(old, new, 1)
s = sub1(s, ".cs-time dd { margin: 0;", ".cs-time-note { margin-top: 18px; max-width: 40em; font: 400 clamp(14px, 1.05vw, 16px)/1.5 var(--f-doc); color: rgba(245, 245, 247, .7); }\n.cs-time dd { margin: 0;", "time note")
# the motion chapter's rules are dead now
i = s.index(".cs-motion-pair {"); j = s.index(".cs-motion .cs-actions { margin-top: clamp(32px, 4vw, 56px); }") + len(".cs-motion .cs-actions { margin-top: clamp(32px, 4vw, 56px); }\n")
s = s[:i] + s[j:]
s = s.replace("  .cs-motion-pair { grid-template-columns: minmax(0, 1fr); }\n", "")
wr(p, s)
print("case.css: hero pair, facts, note; motion rules gone")
