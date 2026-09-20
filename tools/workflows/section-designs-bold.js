export const meta = {
  name: 'section-designs-bold',
  description: 'Rebuild designs B to E of all nine sections, bolder, on the theme system and the 3840 machine glass',
  phases: [
    { title: 'Wave 1', detail: 'header, score, kinematic breakdown' },
    { title: 'Wave 2', detail: 'watch performance, slo-mo clips, fight photo' },
    { title: 'Wave 3', detail: 'play again, sponsor, finish leaderboard ranks' },
  ],
}

const P = 'C:/Claude Database/punch-exercise'

const CONTRACT = `
You are a senior visual designer who writes production CSS, redesigning one section of the Punch App result screen. The screen is the glass of a real punch-force arcade machine: exactly 1080 x 3840 px, portrait, no scrolling, no touch. It is shown inside a drawn machine cabinet on a showcase page at http://localhost:5770 (the server is already running; never start or stop it).

WHAT THE USER ASKED FOR, in their words: "variants need to be very very more visually", "use glass morphism in one variant", "it's a punch machine", "some fonts are better", and earlier "change completely" when paging a section left or right. Most recently they cut the themes down to Arena and Reference only, and moved all switching into a wider, simpler settings panel. They also asked earlier for much less red, colour with intent and good spacing. So: bold, dramatic, physical designs with punch machine energy (impact, force, weight, speed, the fairground strength tester, fight night), built with discipline.

THE THEME (already built, do not change it)
There is one theme, Arena: stadium dark, Big Shoulders Display for display type, Barlow for text and Barlow Condensed for labels, warm white ink, the red strike. The only other theme, Reference, shows design A exactly as drawn in Figma and never shows your designs. Your designs still get their fonts, surfaces and photo treatment through the shared building blocks below, so they must NEVER name a font family or hard-code a surface look.

SHARED BUILDING BLOCKS (defined in showcase/styles.css; use them on your elements)
- .surface: a card surface (background, border, radius and shadow come from the theme). .surface-hi: the emphasised surface.
- .display: the theme's display face, weight, case, tracking and glow, line-height .9, nowrap. You set font-size.
- .label: small caps label, 28 px, theme label face, uppercase, tracked, --ink-2. You may change font-size (never below 24px).
- .text: body copy, 30 px, theme text face.
- .strike-fill: the red strike background with the theme's glow and readable text colour.
- .glass: a frosted glassmorphism panel (translucent white gradient, backdrop blur, a light rim, white text). Use it only over a photograph, where the blur has something to work on; on the dark ground it just reads as grey.
- .photo on every photo <img> (the theme's photo grade). Wrap photos in an element with .photo-frame (position relative, overflow hidden; the theme adds halftone, neon edges or a glass rim). Inside .photo-frame an <img> fills it with object-fit: cover.
- Glyph badges: <span class="badge badge-stat" data-glyph="NAME" aria-hidden="true"></span>, NAME one of machine, city, country, global, energy, force, speed, acc, logo, play. Resize with your own class.
- A real QR code: <div class="SLOT-x-qr" data-qr></div> (give it a width, style its svg { display: block; width: 100%; height: auto; }).
- Tokens: --ink-1 --ink-2 --ink-3 (text), --line (hairlines and borders), --track (empty meter), --strike (the only red), --cta-ink (text on red), --surface-bg --surface-hi-bg --surface-border --surface-shadow --surface-filter, --f-display --w-display --f-text --w-text --w-strong --f-label --w-label --label-track --display-glow, --r (radius), --space (breathing room, 0.7 to 1.25), --gap-grid, --card-pad, --gap-title, --pad (the glass side padding). In SVG you can use fill="currentColor" or style="fill: var(--ink-1)", and font-family: var(--f-display) for SVG text.

BIG NUMBERS (required pattern): each theme's display face has a different width, so size big figures by cap height and cap by width:
  font-size: min(calc(CAP_PX / var(--cap)), calc(100cqi / (CHARS * var(--num-w))));
on an element whose ancestor has container-type: inline-size. CAP_PX is the visible height of the capitals you want, CHARS the character count including commas and dots (1,000,000 is 9). This keeps 1,000,000 inside the column in narrow Anton and in wide Unbounded alike.

HIERARCHY RULES
- The score in the Score section is the loudest thing on the glass. In every other section the largest figure or word has a cap height of at most 72 px (CAP_PX <= 72). In the Score section the score's cap height must be at least 150 px.
- Red (--strike or .strike-fill) at most once per design, only for meaning: the hit's charge meter, replay progress, the primary action (Play again), or marking the current player. Never for decoration, borders, labels or icons. The themes add their own glow, texture and colour; you do not add colour.
- Meaningless status chips and pills ("Live", "New") are banned. Copy is sentence case, plain and specific, and never contains an em dash or en dash. Keep numerals to what a design needs.

VISUAL DEVICES that suit a punch machine and that you are encouraged to use: oversized display type, scale contrast, slanted edges with clip-path, diagonal slabs, impact bursts and starbursts drawn as SVG polygons, speed lines, meters and gauges drawn in SVG, stacked and overlapping layers, photos cut into shapes, film strips, stamps set at an angle, ticket stubs, scoreboards. Each design in a section must be a different STRUCTURE, not the same layout restyled, and each must look deliberate and striking.

HOW A SECTION WORKS
- ${P}/showcase/sections/SLOT.html starts with design A (<div class="var v-a" data-name="...">), whose styles live in showcase/styles.css. Keep design A exactly as it is, first in the file. REPLACE everything after it with your four new designs, in order: <div class="var v-b" data-name="...">, v-c, v-d, v-e. data-name is one to three words, sentence case, distinct.
- REPLACE the whole of ${P}/showcase/sections/SLOT.css with your CSS for B to E. Scope every rule under .s-SLOT .v-LETTER. Name every class you create SLOT-LETTER-something (for example hero-c-bell). Do not reuse the base class names .grid .card .rank .stat .k .v .player .poster .timeline .track .progress .thumbs .thumb .boxer .cta .charge .charge-fill .hero-label .hero-score .hero-grade .wordmark .s-title (Reference restyles them); the building blocks above are the shared vocabulary instead. No !important, no position: fixed, no animations or transitions, no JavaScript, no new hex colours except rgba black or white scrims over photos.
- Titled sections (ranks, stats, video, clips) have a shared <h2 class="s-title"> above the designs; do not repeat the title.
- The glass is a picture of a machine UI: no <button>, <a> or <input>. Decorative images alt="", meaningful ones a short alt.
- The content column is about 920 px wide (from about 800 to 970 as breathing room changes). Full bleed to the glass edges is allowed only with margin-inline: calc(-1 * var(--pad)) and a data-bleed attribute on that element.
- Touch only your two files, plus new image crops named ${P}/showcase/assets/photos/SLOT-*.jpg made with ffmpeg (for example: ffmpeg -v error -y -i IN -vf "scale=W:H:force_original_aspect_ratio=increase,crop=W:H" -q:v 4 OUT).

DATA: data-bind="score" shows the live score text (1,000,000), data-bind="grade" the grade words (Perfect punch), data-bind="charge" sets --charge (0 to 1) on its element for meters (scaleX(var(--charge)), height: calc(var(--charge) * 100%), or stroke-dashoffset: calc(100 - var(--charge) * 100) on an SVG path with pathLength="100"). Ranks: Machine 9,090, City rank 8,677, Country 9,132, Global rank 23,400. Stats: Energy 20.4 KJ, Force 20.4 N, Speed 20.4 MPH, Acc. 20.4 M/S; shares of this machine's best if a design needs them: Energy .72, Force .86, Speed .64, Acc. .78. Video: 00:00 / 01:23, Replay. Clips: Best punch, Power hit, Combo finish. Venue: Dubai Mall, Level 2. Player: Sara. Run code: KTR BXM. Sponsor: WELLFIT GYM.
PHOTOS: assets/photos/poster.jpg (replay still 1368x1026), clip-best.jpg, clip-power.jpg, clip-combo.jpg (600x450), assets/figma/boxer-photo.jpg (1376x768). Sources to crop from: ${P}/assets/figma/*.jpg (best_sara_3x4, replay_sara_3x4, live_sara_3x4, attract_karim_3x4, card_omar, card_lina, card_noor, card_karim, pair_hana, record_noor, still_*, tile_leila, thumb_sara_a, thumb_sara_b) and ${P}/assets/avatars_named/avatar_NAME.jpg.

HEIGHT BUDGET: at breathing room 100, the tallest of your designs must stay within SLOT_BUDGET px of glass height (the render report prints h= for each design and TOO TALL when one is over), so that any combination of sections fits the 3840 glass.

RENDER LOOP (required)
From ${P} run: node tools/shoot-slot.mjs SLOT
It renders every design of your section in Arena at breathing room 70, 100 and 125, prints one report line per render with the height and any overflow, and writes PNGs named LETTER-arena-SPACE.png to ${P}/build/slots/SLOT/. After every change re-run it, then open the PNGs of every design at 100 and 125 with the Read tool and look hard: is it striking and clearly different from design A and from your other designs; does it honour the hierarchy and red rules; are edges aligned and paddings consistent; is every piece of text readable, including text over photos; does anything clip, crowd or collide. Never judge a stale PNG. Keep going until every report line says clean and each design would impress a demanding creative director.

WHEN DONE, reply with the four design names, one line each on what makes it different, and the final report status.`

const BUDGET = { header: 180, hero: 640, ranks: 480, stats: 600, video: 620, clips: 380, photo: 430, cta: 200, sponsor: 120 }

const SECTIONS = [
  { slot: 'header', wave: 'Wave 1', brief: `Header: the Punch App mark (logo glyph badge and the words PUNCH APP). Design A centres a badge and the wordmark.
B "Fight bill": a full width slanted band (clip-path parallelogram) on .surface-hi carrying the wordmark in .display, with "Dubai Mall, Level 2" as a .label on the band's right.
C "Seal": a round seal: a large logo badge in the middle with PUNCH APP and DUBAI MALL, LEVEL 2 set around it on an SVG circle with textPath, and short rules either side of the seal.
D "Player plate": a .surface plate: the round avatar of Sara (crop avatar_sara) in a .photo-frame with a --strike ring marking the current player, "Sara" in .display and "Run leader" as a .label, the small mark and wordmark on the right.
E "Masthead": the wordmark in .display at cap 64 px left aligned, set over a huge outlined echo of PUNCH (the same face, color transparent, -webkit-text-stroke in --line) that fills the column behind it as texture.` },
  { slot: 'hero', wave: 'Wave 1', brief: `FINISH, DO NOT RESTART: a previous designer already wrote new designs B to E on the new system before the run stopped. Keep what is strong, fix what is not, and make sure design E becomes the Glass design described below. Check every rule in this brief.\nScore: the result of the hit. Every design binds data-bind="score" and data-bind="grade", and data-bind="charge" on its meter (the meter is the one red thing). The score's cap height is at least 150 px. Design A centres a label, the score, a horizontal charge bar and the grade.
B "Power gauge": a thick SVG arc gauge across the column with major ticks and a needle rotated by --charge (rotate(calc(var(--charge) * 180deg - 90deg))), the score inside the arc, the grade below.
C "Strength tower": the fairground strength tester: a tall slim tower on the right with a bell on top, ruled levels, the red fill rising to --charge, and on the left the label, the score and the grade stacked and aligned to the tower's base.
D "Impact": the score set over a large starburst impact shape (SVG polygon on --surface-hi-bg or .surface-hi) with the grade on a small stamp rotated a few degrees, and a slim charge bar under it.
E "Glass": the glassmorphism design the user asked for. A photo band behind (a crop of assets/figma/boxer-photo.jpg in a .photo-frame, blurred and dimmed where it sits under the panel is fine) with the score on a large .glass panel floating over it, the label and grade inside the panel, and the charge bar along the panel's bottom edge. The score must stay crisp and readable.` },
  { slot: 'ranks', wave: 'Wave 3', finish: true, brief: `FINISH, DO NOT RESTART: a previous designer already rebuilt designs B to E of this section on the new system and they render clean in every theme, but the run stopped before polishing. Keep the four designs and their structure. Fix Podium (B) and Scoreboard (D), which run 7 to 28 px over the 480 px height budget, and Ladder (C), whose labels sit jammed against the value above them. Then re-check every design against every rule in this brief and polish anything weak. Styles for the removed Glass, Fight poster and Neon themes no longer exist, so judge Arena only. Original direction for reference:
Leaderboard ranks: Machine 9,090, City rank 8,677, Country 9,132, Global rank 23,400. Global is the emphasis, without red, and no figure's cap height exceeds 72 px. Design A is a 2x2 grid of cards with glyph badges.
B "Podium": three podium blocks of different heights for Country, Machine and City (drawn as .surface blocks with their figures on top) and Global as a wide .surface-hi banner above them.
C "Ladder": a bold vertical ladder from Global at the top down to Machine, thick rails and rungs, badges as the nodes, label and value beside each rung, Global's rung the largest.
D "Scoreboard": a stadium scoreboard: a .surface-hi board with a dot matrix texture (radial-gradient dots in --line), four rows, labels left in .label, values right aligned in .display.
E "Split slabs": four slanted slabs (clip-path) stacked with slight offsets, each carrying a label and value, Global the first and widest.` },
  { slot: 'stats', wave: 'Wave 1', brief: `FINISH, DO NOT RESTART: a previous designer already wrote new designs B to E on the new system before the run stopped. Keep what is strong, fix what is not, and check every rule in this brief.\nKinematic breakdown: Energy 20.4 KJ, Force 20.4 N, Speed 20.4 MPH, Acc. 20.4 M/S. No figure's cap height exceeds 72 px. Design A is a 2x2 grid of cards.
B "Rings": four ring gauges in a row drawn in SVG (shares .72, .86, .64, .78, --ink-1 on --track), value inside, label below.
C "Power bars": four thick horizontal bars, each a .surface track with an --ink-1 fill to its share and the label and value set inside the bar.
D "Radar": an SVG radar chart with four axes (Energy, Force, Speed, Acc.), a filled polygon at the shares in a translucent --ink-1, axis labels outside, and the four values in a row beneath.
E "Force first": Force as a big slanted .surface-hi slab with its value and a speed-line texture, the other three as a compact row of .surface tiles under it.` },
  { slot: 'video', wave: 'Wave 2', brief: `Watch performance: the replay of the hit. The replay progress may be the one red thing. Design A is a cinema player with a dimmed poster, a play badge, a caption and a timeline.
B "Filmstrip": a 16:9 player in a .photo-frame, then a film strip of six frames cropped from the replay with sprocket holes along both edges, and the frame at the moment of contact marked by a --strike tick.
C "Phone clip": a portrait 9:16 clip inside a drawn phone frame (.surface bezel) on the left, and on the right a .display title "Your hit, slowed down", a .text line "Four times slower through contact", and a play badge with "Replay" as a label.
D "Cinema": the replay runs to the glass edges (data-bleed) with letterbox bars top and bottom, a huge .display title over a scrim, and the progress line along the lower bar.
E "Wind up and contact": two frames side by side split by a slanted divider (clip-path), labelled Wind up and Contact, with a thin progress line under both.` },
  { slot: 'clips', wave: 'Wave 2', brief: `Slo-mo replay clips: Best punch, Power hit, Combo finish (assets/photos/clip-best.jpg, clip-power.jpg, clip-combo.jpg). Design A is three equal 4:3 thumbnails with captions.
B "Peek carousel": larger 16:9 cards in a row, the third running off the glass edge (data-bleed on the row), each with a small duration label on the image.
C "Mosaic": one large clip on the left spanning two rows and two stacked on the right, captions over the photos on scrims.
D "Fanned deck": three photo cards overlapping and rotated a few degrees like a fanned hand, each a .surface with a photo and caption.
E "Film strip": the three clips as frames in one continuous strip with sprocket holes above and below, captions under each frame.` },
  { slot: 'photo', wave: 'Wave 2', brief: `The fight photo: assets/figma/boxer-photo.jpg (two boxers under ring lights). Design A is the photo in a rounded frame.
B "Full bleed": the photo runs to the glass edges (data-bleed) with a frosted .glass caption panel set over its lower part carrying a huge .display caption "Tonight in the ring".
C "Slant cut": the photo cut into a slanted shape with clip-path and a .surface-hi slab overlapping one corner carrying "Fight night" and "Dubai Mall, Level 2".
D "Promo banner": an ultra wide 21:9 crop with the sponsor message on a scrim: "Train like the main event" in .display and "Wellfit Gym" as a label.
E "Poster print": the photo as a framed print on a .surface with a thick mat, a caption line under it, and a rotated tape strip on each top corner.` },
  { slot: 'cta', wave: 'Wave 3', brief: `Play again: the one primary action, the one red thing (.strike-fill). No figure's cap height exceeds 72 px. Design A is a full width red button.
B "Button pair": a primary Play again (.strike-fill) beside a secondary .surface "Save my hit" with a download glyph.
C "Countdown": a neutral SVG ring showing 12 seconds left beside the Play again button, with "Next player in" as a label above.
D "Code handoff": a split .surface: the Play again button stacked over "Keep this hit on your phone" on the left, the QR tile (data-qr) with KTR BXM under it on the right.
E "Big pad": Play again as a huge round button like the machine's strike pad, concentric rings in --line around a .strike-fill centre, with "Hit to play again" as a label beside it.` },
  { slot: 'sponsor', wave: 'Wave 3', brief: `Sponsor credit: Powered by WELLFIT GYM. No figure's cap height exceeds 72 px. Design A centres Powered by and the name above a hairline.
B "Sponsor card": a .surface card with WELLFIT GYM in .display, the tagline "Your first class is on us" in .text, and "Show this screen at the desk" as a label.
C "Two sides": "Powered by Wellfit Gym" left and "Dubai Mall, Level 2" right under a hairline, small and quiet.
D "Ticket stub": a ticket shape with notched ends (radial-gradient masks or clip-path) and a perforated line, WELLFIT GYM on the stub and "One free class" on the ticket.
E "Monogram": a round WG monogram in .display inside a ringed badge, with "Wellfit Gym" and "Official training partner" beside it.` },
]

const RESULT = {
  type: 'object',
  properties: {
    designs: { type: 'array', items: { type: 'object', properties: { letter: { type: 'string' }, name: { type: 'string' }, difference: { type: 'string' } }, required: ['letter', 'name', 'difference'] } },
    reportClean: { type: 'boolean' },
    notes: { type: 'string' },
  },
  required: ['designs', 'reportClean', 'notes'],
}

async function build(s) {
  const prompt = CONTRACT.replaceAll('SLOT_BUDGET', String(BUDGET[s.slot])).replaceAll('SLOT', s.slot) + `\n\nYOUR SECTION: ${s.slot} (height budget ${BUDGET[s.slot]} px)\n${s.brief}`
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await agent(prompt, { label: `${s.slot}${attempt > 1 ? ' retry ' + attempt : ''}`, phase: s.wave, schema: RESULT })
    if (r) return { slot: s.slot, ...r }
    log(`${s.slot}: agent failed, retrying`)
  }
  return { slot: s.slot, failed: true }
}

const out = []
for (const wave of ['Wave 1', 'Wave 2', 'Wave 3']) {
  phase(wave)
  const group = SECTIONS.filter((s) => s.wave === wave)
  const res = await parallel(group.map((s) => () => build(s)))
  res.forEach((r, i) => out.push(r || { slot: group[i].slot, failed: true }))
  log(`${wave} done: ${res.map((r, i) => `${group[i].slot} ${r && !r.failed ? (r.reportClean ? 'clean' : 'not clean') : 'failed'}`).join(', ')}`)
}
return { sections: out }
