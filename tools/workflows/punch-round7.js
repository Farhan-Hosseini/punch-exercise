export const meta = {
  name: 'punch-round7',
  description: 'Your run from the expert synthesis, a better Big score, simpler Punch and Reading, banner ads, a better loader, real unique photos, a UI simplification sweep, the design system, and a final check',
  phases: [
    { title: 'Screens', detail: 'Your run, the phone Punch page, Reading and the Default ad, the Result cards, the loader' },
    { title: 'Second', detail: 'the Big score, the photo audit and the reels imagery' },
    { title: 'Sweep', detail: 'simplify and space every page on both surfaces, the design system' },
    { title: 'Check', detail: 'the final check of every ask' },
  ],
}

const P = 'C:/Claude Database/punch-exercise'
const HOUSE = `
PROJECT: a design showcase for a PunchApp design task done for Robotenc, in ${P}/showcase (vanilla HTML, CSS and JS), served at http://localhost:5770 by \`node tools/serve-showcase.mjs\` (start it in the background from ${P} if it does not answer). Includes <!-- include:path -->; /mscreens.css concatenates showcase/mscreens/*.css. The brief: C:/Users/Farhan Hosseini/Downloads/product-designer-challenge.md.
The machine is a 1080 x 3840 portrait glass, 1.5 m tall, read from 1 to 1.5 m by the player and 2 to 3 m by the queue, no touch, no sound dependence. Four looks: html[data-variant="arena|reference"] x html[data-appearance="dark|light"]. Scores through window.PunchFormat (score, scoreHTML with <span class="dec">, withDecimals), redraw on the "decimals" event.
THE SECTION ENGINE (showcase/psec.js, read its header): a section is data-sec + data-sec-label inside article.mscreen[data-mscreen="KEY"]; its designs are direct children with data-sv="Name" (or data-sv-names for a script-drawn section). Customise ("This screen") lists every section with its designs; events "mscreen" { key, opts } when a screen opens and "psec" { surface, page, sec, index, name, el } when a design changes; window.PSec.active(surface, page, key). Test hooks: window.showcase.mode('machine'), .mscreen(key, opts), .sec('machine', key, sec, i), .sections('machine', key), .appearance(), .theme(), .zoom(n), .decimals(on).
Every machine screen is ONE frame: <div class="ms-lights" aria-hidden="true"> with six <i class="l1">..<i class="l6"> first (the global background), then <!-- include:parts/ms-brand.html --> (the global header), the sections, and <!-- include:parts/ms-ad.html --> last (the global sponsor strip). Spacing scale .mscreen { --ms-gut --ms-sec-gap --ms-group-gap --ms-item-gap --ms-pad } (mscreens/_space.css). QR codes only through the shared PunchQR (<div class="pqr" data-pqr style="--pqr-size: 480px"></div>, qr.js and qr.css). Icons: <span data-lucide="name"></span> (lucide.js). Real photos: showcase/assets/photos/lib with manifest.json (focal points), avatars in assets/app/avatars. Never use assets/mscreens/boxer-gym.jpg or boxer-gym-gold.jpg.
TOOLS: node tools/shoot.mjs <url> <outDir> <width> <height> <plan.json> (steps {wait}, {eval}, {click: selector} a real mouse click, {key}, {shot: name, clip?, full?, scale?}; prints console errors; REDUCED_MOTION=1 env for reduced motion). Plans start with {eval: "localStorage.clear(); location.reload(); 1"}, {wait: 4200}; eval steps share one scope, never redeclare a const. For the glass: showcase.mode('machine'), hide .topbar, showcase.zoom(30), clip #machine; close-ups at zoom 50; the embed at http://localhost:5770/?embed=machine&follow=0 at 300 x 1066. LOOK at every PNG with the Read tool; contact sheets with Python PIL (python, not py).
HOUSE RULES: no em or en dashes in visible copy; numerals only where they are content; a hairline or bar between two words reads as a dash; no emoji; no gradient text; not everything centred; visible focus; reduced motion still and readable; tokens so every look works; nothing clipped or colliding.
HOW TO WORK: usage limits have killed runs before: land each piece as soon as it works and append a short entry to ${P}/build/review/LOG_FILE after each (what, where, how verified). Edit only your files; anything else under "For others".
`

const RUN = `
YOUR SCREEN: the machine's "Ranks and stats" screen (data-mscreen="stats"), which the user wants REDESIGNED FROM SCRATCH: "need to be better; don't keep the first we saved, even redesign it; make five more". The user also asked an AI panel what a punch machine should show instead of four ranks and four physics stats; READ its synthesis first, in full: ${P}/docs/strategy/what-to-show-for-a-punch.md. Build what it recommends.
FILES YOU OWN: parts/mscreen-stats.html, mscreens/stats.css, mscreens/stats.js (careful: stats.js may also drive the Big score screen, data-mscreen="score", whose files are parts/mscreen-score.html, mscreens/score.css, mscreens/score.js; the Big score must keep working exactly as it does now, so split out what the score screen needs rather than break it), and, with Edit only: the page bar button text for stats in index.html (it becomes "Your run"), the stats entry in anim.js's MACHINE list, and the article's aria-label in parts/mscreens.html.
WHAT TO BUILD: rename the screen "Your run". Delete every current design of this screen (all of them, including the first); rebuild it as one frame with the four sections of the synthesis, in its order and bands: "Next to beat" (the gap to the next mark above, with a name, as the one big number; the score small above it; the Bell rung state at the top of the scale; the flip when the player leads), "Crew" (everyone in this run on a column by height, no numbers, crown on the leader, three attempt slots per player, next up), "One fix" (one change for the next hit, a visible Camera read tag when the camera inferred it), "Today's crown" (the holder, how long in words, the crowd band with the player's mark, Unclaimed with the run code in the shared QR style, the takeover when this hit takes it). Each section gets FIVE designs, built from the synthesis's five ideas per section and made better where you can; names are the short labels there. Numerals only in "Next to beat" (the synthesis keeps one numbered block per screen). Motion that tells the story in the synthesis's reading order over about eight seconds (the gap lands, the crew overtake plays, the fix, the crown), restarting a section on "psec", still and complete under reduced motion.
DATA: example runs in stats.js for both cases in the synthesis (Sara at 999,999.000 with Yousef and Mira; Karim at 412,380.250 chasing Omar at 431,000.500, with Lina), switchable through opts (showcase.mscreen('stats', { run: 'karim' })) and defaulting to the one that matches the live score (window.punchApp.score or the Result screen's). Real avatars from assets/app/avatars and impact crops from the photo library.
Verify: every design of every section in all four looks (contact sheets at zoom 30, close-ups at zoom 50), both example runs, decimals on and off, the embed, reduced motion, real clicks through the Customise rows, and that the Big score screen still renders and animates as before.`

const PUNCH = `
YOUR PAGE: the phone's Punch page (data-page="punch", its title "Punch on the machine"; parts/mpage-punch.html, mpages/punch.css, mpages/punch.js, the punch step's code in mobile.js with Edit only). The user: "Punch on the machine page needs to redesign, and make it simpler." The last builder gave it sections (read ${P}/build/review/log-r6-punchpay.md). Redesign it SIMPLER: one clear instruction to punch at the machine (look up, one full strike on the pad), the machine it is linked to, a calm waiting state that points at the machine, no timer and no number on the phone; fewer elements, fewer sections (two or three at most), generous spacing on the --m-* scale, one idea per section. Each section still has five designs, and every one of them is simple. Keep the flow logic exactly (the machine counts 20 s, the strike, Reading, record or result, Your hit, time up keeps the credit, Cancel). Verify on iPhone and Android in the four looks and through the whole flow in the Animation tab with Start.`

const READAD = `
YOUR SCREENS: two machine fixes. (1) Reading the strike (data-mscreen="loading"; parts/mscreen-loading.html, mscreens/loading.css, mscreens/loading.js). The user: "Sensor trace must be simpler and better." Redesign the sensor trace design (and any design of that screen that reads as busy) simpler and better: one clean trace that draws across the glass, one label for what is happening, the verdict on its way; no clutter of channels, ticks and panels; readable from 3 m; still the 2.2 s hand over to opts.next. (2) The machine Default (data-mscreen="default"; parts/mscreen-default.html, mscreens/default.css, mscreens/default.js). The user: "the ad at the top is so tall, make it banner style." Make every one of the five Top ad designs a BANNER: a wide band of about 360 to 480 px tall, not 900, each still a distinct animated Monster Energy creative with its green call to action and the Ad tag; give the freed height to Welcome and Today's best and rebalance the bands on the --ms-* scale. Also make the phone Default page's Monster Energy promo a banner in the same spirit (parts/mpage-default.html, mpages/default.css, mpages/default.js). Verify all designs in the four looks, the embed, reduced motion.`

const RESULT = `
YOUR AREA: the machine's Result screen (#screen, nine sections; sections/*.html and sections/*.css; app.js only where a section's script is). The user: "Result in the machine: some cards do not have a proper width and need the rules of UX, and simpler. Make sure." Audit every design of every section (window.showcase.mode('machine'); window.showcase.slots() lists them; window.showcase.set(slot, i) picks one; node tools/shoot-slot.mjs SLOT both renders one section's designs) for cards whose widths are off: cards in a row that differ in width, cards that do not share the glass's grid or margins, text crammed or truncated, odd leftover widths. Put every card on one grid (the --ms-gut margins and a consistent column split, equal widths in a row), one inner padding, one radius, one level of card (no card in a card), fewer borders and effects, a clear hierarchy, and simplify any design that says too much. Keep each section's height budget (fit note "Everything fits the glass"). Verify every design of all nine sections in the four looks with breathing room 100, and the whole screen fits.`

const LOADER = `
YOUR AREA: the showcase's own loading screen (#loader in index.html, its rules in styles.css, the boot sequence in app.js boot(): it tracks fonts and visible images through --load and adds is-rung then is-done). The user: "loading for the website needs to be better; make it better." Design a better loader in the product's language: for example the logo mark with a strike that charges a column as the page loads and rings the bell as it completes, or the score counting to its full length as the progress. Real progress (--load), done in about 1.1 s on a fast load and never stuck, graceful under reduced motion (a still that fades), right in all four looks (it reads html data-variant and data-appearance before app.js runs), no layout jump when it leaves, focus and screen readers quiet while it shows. Keep the ids and classes app.js uses. Verify with frame captures at several points of the load (REDUCED_MOTION too) in dark and light.`

const BIGSCORE = `
YOUR SCREEN: the machine's Big score (data-mscreen="score"; parts/mscreen-score.html, mscreens/score.css, mscreens/score.js, and whatever the Your run builder split out for it from mscreens/stats.js, read ${P}/build/review/log-r7-yourrun.md). The user: "Big score in the machine needs better designs." It is the screen for the back of the queue at 3 m: the number as the event. Redesign every design of every section, better and bolder (the score at the brief's full length with smaller decimals, the name, one reason to care such as a new crown or the gap to the next mark, a real photo of a strike from the photo library, never the Figma stock photo): at least five designs per section, genuinely different compositions. Read ${P}/docs/strategy/what-to-show-for-a-punch.md for what matters to show. Verify all designs in the four looks, decimals on and off, the embed, reduced motion.`

const PHOTOS = `
A PREVIOUS ATTEMPT at this task was cut off by a usage limit after landing much of the work (the new cast, 52 new masters, retouches): read ${P}/build/review/log-r7-photos.md and the current files FIRST, keep what is done and working, and finish the rest (the reel's unique images, the duplicates, the EVERLAST photos, the unused files, the removals, the broken-image sweep); do not start over.
YOUR AREA: the photos across the whole showcase. The user: "remove this image and images like this, no need for the old lady; the young muscular boy and girl are good: assets/app/feed/6798717.jpg", and "reels need more images of punching; replace repeated images with better, unique ones".
1. Find every photo in use: grep the showcase for .jpg, .jpeg, .png and .webp in html (img src, srcset, poster, image href), css (url()) and js strings, plus assets/photos/lib/manifest.json. Make contact sheets and LOOK at all of them.
2. Remove assets/app/feed/6798717.jpg and every image like it: older people, anyone off the brief's cast. The cast is young, athletic men and women in their twenties and thirties: boxers, gym regulars, friends out at the mall.
3. Find photos used in more than one place (the same file on different pages or designs, or the same shot at two sizes) and give each content use its own image. A player's own avatar may repeat by design.
4. Fetch more real punch photos to reach at least 30 distinct punch, strike and pad shots, young and athletic, men and women, no logos or text. Pexels images are at https://images.pexels.com/photos/ID/pexels-photo-ID.jpeg?auto=compress&w=1800. Its search is behind a bot check, so find IDs from pexels.com/photo pages you can reach, or use Unsplash if it answers. Resize with PIL so the long side is at most 1800, JPEG quality 82, metadata stripped. Add each to assets/photos/lib and manifest.json with credits and focal points.
5. Give the reel (mpages/reel.js and its data, mobile.js reel code with Edit only) a varied, unique punch image for each attempt, across its endless scroll.
6. Update every reference and delete the removed files. Also: assets/photos/poster.jpg and one feed photo show the EVERLAST wordmark: replace them (no brand names or text in any photo); and delete the unused files boxer-gym.jpg, ad-wellfit.jpg, qr-howto.png and qr-howto-machine.png after checking nothing references them.
Verify on every page and design of both surfaces: no broken image (naturalWidth of every img, computed background images), faces and fists in frame (object-position from the manifest's focal points), all four looks.`

const SWEEP_M = `
YOUR AREA: the machine, every screen (Default, Leaderboard, Scan, Punch now, Reading, Result, Your run, Big score, New record) and every design, the global header, sponsor strip and backgrounds. The user: "check all UI and UX, and if the UI can be simpler anywhere, or the spacing is not ok, fix it." Go through each screen in the four looks (contact sheets at zoom 30, close-ups at zoom 50) and fix what is weak, directly:
- simplify: drop decoration that carries no meaning; one idea per section; fewer borders, glows and font sizes
- spacing on the --ms-* scale
- aligned edges and a shared grid
- consistent widths
- nothing clipped or colliding
- readable from the distance each thing is read at
Known: the Result's .s-title is 30 px, under the 32 px floor for the glass. You may edit any machine file with Edit (parts/mscreen-*.html, parts/ms-*.html, mscreens/*, sections/*, styles.css machine rules). Log each fix, worst first.`

const SWEEP_P = `
YOUR AREA: the phone, every page (Default, Scan, Connect, Punch, Top up, Checkout, Paid, Your hit, Reel, Leaderboard, Feed, Profile) and every design, the tab bar, the sheets, and the shell around it: the top bar, the two-step page bars (pagenav.js), the Customise accordions, the Animation tab (no captions under the screens now) and the case study and brief drawers. The user: "check all UI and UX, and if the UI can be simpler anywhere, or the spacing is not ok, fix it." Go through each page on iPhone and Android in the four looks, and the shell at 1440, 1024 and 390 wide. Fix what is weak, directly:
- simplify: drop decoration that carries no meaning; one idea per section; fewer borders, shadows, chips and font sizes
- spacing on the --m-* scale
- tap targets of 44 px or more
- aligned edges
- nothing clipped or colliding
You may edit any phone or shell file with Edit (parts/phone*.html, parts/mpage-*.html, mpages/*, mobile.*, nav.css, pay.*, index.html, styles.css shell rules, pagenav.js, anim.*). Log each fix, worst first.`

const DOCS = `
YOUR AREA: the design system page (parts/ds.html, ds.css, ds.js), the brief drawer (parts/brief.html, brief.css) and the case study (parts/case.html, case.css, case.js, case-diagrams.*). The user: "make the design system update again with the new things." Bring the design system up to date with everything that exists now, each shown live or as a faithful sample:
- the page section model (every page built from sections with five or more designs, Customise "This screen" and the shared accordions)
- the two-step page bars
- the Default pages
- the eight global backgrounds
- the one QR style
- the spacing scales
- the Lucide icon set in use
- the photo library with credits (assets/photos/lib/manifest.json)
- the Monster Energy kit: the top banner, the strip and the feed post
- the new Your run screen and why (docs/strategy/what-to-show-for-a-punch.md)
- the Big score
- the new loader
The design system tab keeps the other tabs' width. Update the brief drawer's "How this showcase answers it" and the case study's facts to match, including a short note that the Your run content came from an AI panel, and what was changed after it. Verify every part in the four looks, at 1440 and 390.`

const CHECK = `
YOUR AREA: the FINAL CHECK of everything the user asked in the last two rounds, one by one, fixing what is not done. You may edit any showcase file with Edit (never rewrite a whole file). The asks:
A. "The score reveal, as a clip must be created again": the Animation tab's clip (#animExtra) shows a clip rendered from the CURRENT glass (assets/motion/reveal-live-*.mp4). If it is missing or shows an old design, render it yourself:
   - a frame-stepped headless Chrome capture of the live glass: the Punch now count's last seconds and the strike, Reading, New record, the Big score
   - encoded with ffmpeg: H.264, yuv420p, crf 18, faststart
   - a 1080 x 3840 master and a 1920 x 1080 cut, with posters and a 960 px wide GIF
B. assets/mscreens/boxer-gym.jpg and boxer-gym-gold.jpg: gone everywhere with their styles, and the files deleted.
C. Ranks and stats is now "Your run": four sections from the synthesis, five new designs each, better than before.
D. The AI panel's answer (docs/strategy/what-to-show-for-a-punch.md) is used on the screen and noted in the case study.
E. The page bars group the screens with a sub row for the chosen group, on both surfaces.
F. The Default screen's top ad is a banner; the phone's Monster promo too.
G. Reels have many unique punch images; no image repeats as content across the system; 6798717.jpg and older people are gone.
H. The phone's Punch page is simpler.
I. The website loader is better.
J. The Result screen's cards have proper widths and a simpler, consistent layout.
K. The Reading screen's sensor trace is simpler and better.
L. The Animation tab has no captions under the screens; the UI is simpler and well spaced everywhere.
M. The design system shows the new things.
N. The Big score has better designs.
Also recapture the case study's stills of the live pages (assets/case/screen-*.png and any other capture it shows) where the pages changed this round, sweep for console errors in every tab and on every page of both surfaces, and for em or en dashes in visible text. End with a table of A to N: where each is answered and its state.`

const run = (log, label, prompt, phaseName, attempt = 1) =>
  agent(HOUSE.replace('LOG_FILE', log) + '\n' + prompt + '\nWHEN DONE reply with what you built or fixed (matching your log), what you verified, and anything left.',
    { label: attempt === 1 ? label : label + ' (retry)', phase: phaseName })
    .then((r) => (r || attempt > 1 ? r : run(log, label, prompt, phaseName, 2)))

async function pool(tasks, n, phaseName) {
  const out = new Array(tasks.length)
  let next = 0
  await Promise.all(Array.from({ length: n }, async () => {
    while (next < tasks.length) {
      const k = next++
      const t = tasks[k]
      out[k] = await run(t[0], t[1], t[2], phaseName)
      log(`${t[1]}: ${out[k] ? 'done' : 'no result'}`)
    }
  }))
  return out
}

const results = {}
const record = (tasks, out) => tasks.forEach((t, i) => { results[t[1]] = out[i] })
const S1 = [['log-r7-yourrun.md', 'Your run screen', RUN], ['log-r7-punch.md', 'phone Punch, simpler', PUNCH], ['log-r7-readad.md', 'Reading trace and banner ads', READAD], ['log-r7-result.md', 'Result cards', RESULT], ['log-r7-loader.md', 'website loader', LOADER]]
phase('Screens')
record(S1, await pool(S1, 4, 'Screens'))
const S2 = [['log-r7-bigscore.md', 'Big score', BIGSCORE], ['log-r7-photos.md', 'photos and reels imagery', PHOTOS]]
phase('Second')
record(S2, await pool(S2, 2, 'Second'))
const S3 = [['log-r7-sweep-machine.md', 'sweep: machine', SWEEP_M], ['log-r7-sweep-phone.md', 'sweep: phone and shell', SWEEP_P], ['log-r7-docs.md', 'design system and documents', DOCS]]
phase('Sweep')
record(S3, await pool(S3, 3, 'Sweep'))
phase('Check')
results['final check'] = await run('log-r7-check.md', 'final check', CHECK, 'Check')
return results
