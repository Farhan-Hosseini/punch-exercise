# Brief interrogation and token audit

Source: `C:\Users\Farhan Hosseini\Downloads\product-designer-challenge.md`. Company context from `C:\Claude Database\punchapp` (README, `docs/SPEC.md`, `figma-ref/s4_leaderboards.png`, `figma-ref/s6_more.png`). Font metrics below were measured with fontTools from the Google Fonts files (Orbitron variable at wght 900 and 700, Barlow Condensed Black, Bebas Neue, Oswald 700, Poppins Black, Inter 900), not estimated.

---

## 1. Ambiguities and unfilled placeholders, with the assumption to state

| # | What the brief leaves open | Assumption a senior designer states up front |
|---|---|---|
| 1 | `Touch [IS / IS NOT] available` was never filled in. | Design for no touch. The player has just used both hands, may be gloved or shaking a sore fist, the top of the panel is at 2.0 m (out of reach), and ADA forward reach tops out at 1.22 m, which is canvas y 2000 and below. Touch, if it exists, is an enhancement confined to y 2000 to 3840 and never the only way to do anything. Every action must also complete by doing nothing (auto-advance) or by inserting a credit. |
| 2 | Panel size is internally inconsistent: "1.5 meters tall, 0.5 wide" but 1080 x 3840 is 9:32. A 1.5 m tall active area is 0.42 m wide; a 0.5 m wide one is 1.78 m tall. | 1.5 m active height, 2.56 px per mm, 0.39 mm pixel pitch (a 61 inch stretched panel). The 0.5 m is cabinet width including bezel. All mm figures below use 2.56 px/mm. |
| 3 | Mounting height is not given. | Bottom edge 0.5 m above the floor, top edge 2.0 m. Every floor-height claim below depends on this and must be re-checked against the real cabinet drawing. |
| 4 | Where the strike pad and the camera sit relative to the screen. | Pad in front of and below the screen at roughly 1.2 m, camera at the top bezel facing the player, portrait 9:16 clip. The player strikes at about 0.6 m from the panel and steps back to 1 to 1.5 m to look. If the pad sits in front of the lower screen it occludes the bottom band; ask. |
| 5 | Score range "0 to 999,999.000" versus what a real score looks like. The machine photo on the landing page shows an LED reading "912". The reference app shows "987654.321". | Six integer digits must always fit; the composition is tuned to look right at three to six digits; three decimals are ranking precision, shown subordinate and never as the hero. Ask for the real distribution. |
| 6 | Separator convention. The brief writes "999,999.000"; the existing app writes "987654.321" with no thousands separator; the machines are in Tampa, Dubai and London where conventions differ. | English locale, Latin digits, comma thousands, point decimal, as in the brief. Note the locale risk in the notes. |
| 7 | What makes a score good. There is no scale, benchmark, tier or per-machine context. | The machine knows the house best (this machine, all time), today's best on this machine, and the player's own best once identified. Without at least one of these the "event" has nothing to be relative to. |
| 8 | Whether the player can be identified before the strike (app QR at the attract screen, NFC, app tokens paying for the credit). The brief starts "from the end of an attempt". | Base case: anonymous attempt, claimed afterwards. Recommended and designed as a second path: pre-claim, where the attempt lands on the phone with nothing to scan. State both. |
| 9 | How long the result may hold with a queue behind. | Result cycle of 25 s maximum, auto-advancing to attract; a new credit interrupts it at any moment; the claim code survives the transition (see 15). |
| 10 | What "one credit" is: coin, card, app tokens. | Card or coin reader on the cabinet. "Go again" means insert a credit, never a touch. The existing app already has tokens, so app-paid credits are a plausible future path; ask. |
| 11 | Video: length, orientation, processing latency, retention, consent. | 3 s portrait clip available within 1.5 s of impact; unclaimed clips deleted after 24 h; a signage line covers recording consent; nothing in the flow depends on the clip being ready (the score never waits for video). |
| 12 | Connectivity. | Machine is online. If not, the handoff degrades to a printed-style short code the player types later, and the attempt syncs when the machine reconnects. |
| 13 | Whether the app must be installed before the attempt can be saved. | No. A web claim page holds the attempt against the phone (cookie plus signed token) and hands it to the app on install. Requiring an install before the score exists is the "one attempt and a walk-away" failure the brief warns about. |
| 14 | Groups: one phone, several people; several phones, one attempt. | One claim per attempt, one attempt per claim, and a phone may claim consecutive attempts for friends. A claimed attempt cannot be claimed again. |
| 15 | Privacy and expiry of the handoff. Spectators can see the screen and could scan the code first. | Codes are single-use, bound to one attempt, valid for 15 min, and the claim page shows the frame from the clip so the person confirms it is them. The code shrinks to a corner of the attract screen for 60 s after the result so a fumbled phone still gets it. |
| 16 | Mobile platform and frame. | iOS, 393 x 852 pt (iPhone 15/16), designed at 1x and stated in the file. |
| 17 | The brand tokens contradict the live product: the landing page and app are Poppins and Inter, light and dark slabs, gym photography, red #eb1110; the tokens say Orbitron everywhere plus a magenta secondary that appears nowhere. | Treat the tokens as a proposal for the machine's voice, keep the red, reconcile the type with what the company already ships, and say so in the notes. |
| 18 | The motion clip spec: aspect, frame rate, whether it must be the full 9:32 canvas. | MP4, 1080 x 3840, 60 fps, 6 to 8 s, showing impact to settled score, plus a 1080 x 1920 centre crop for anyone viewing on a laptop. |
| 19 | Who else plays: children, wheelchair users, colour-blind players. | Children from 1.2 m tall play (eye height about 1.1 m), wheelchair eye height 1.1 to 1.3 m. Nothing is encoded in red versus green alone. |
| 20 | Ambient light. | Bright mall daylight; the panel is a high-brightness commercial unit. Dark base, no strokes thinner than 3 px, no mid-grey on mid-grey. |
| 21 | Spectator geometry: "a further 2 to 3 m back" means 3 to 4.5 m from the panel, and the player's body is between them and the screen. | Spectators stand offset to the sides; directly behind the player only the top 350 to 450 px of the canvas clears the player's head (see section 3). |
| 22 | Whether the machine has a physical button or light strip. | None assumed. A single large physical "again" button and an LED strip around the bezel would be the first hardware asks. |
| 23 | Language. | English only for the exercise; copy strings kept short enough to survive translation at 1.3x. |
| 24 | Audio. | Audio exists as garnish, never as the carrier. Every audio cue has a visual twin. |

---

## 2. Token audit, line by line

### Fonts

| Token or line | Value | Problem | Fix |
|---|---|---|---|
| `@import "@fontsource/orbitron/400.css"`, `/700.css`, `/900.css` | three static weights | Code artefact pasted into a design brief. No 500 or 600 for UI, no variable font, so a weight animation in the reveal (900 settling to 700) is impossible without a second file. | If Orbitron stays, load `@fontsource-variable/orbitron` (400 to 900). |
| `--font-display: "Orbitron", "Arial Black", Arial, sans-serif` | | Fallback is a different width class: Orbitron 900 digit advance 0.83 em, Arial Black about 0.56 em. A fallback render is a third narrower, every measured layout breaks, and there is no `size-adjust`. | Add `size-adjust` on a `@font-face` fallback or accept that the fallback is unmeasurable and never let it happen on the machine (fonts bundled, never fetched). |
| `--font-sans: "Orbitron", Arial, sans-serif` | | The same face for display and UI. Orbitron's lowercase has an x-height of 0.58 em with squared counters; at 32 to 40 px on a 1.5 m panel it is legible but tiring, and it has no `tnum`: digits are proportional ("1" is 0.391 em, "0" is 0.834 em). A counting number jitters sideways and "111,111.111" is half the width of "999,999.000". | Split the roles: `--font-score` (a tabular condensed heavy face, or Orbitron for the integer only with fixed-width slots), `--font-display` (Orbitron caps for labels and eyebrows, if kept), `--font-ui` (Inter, which the company already ships). |
| missing | | No `--font-mono` or tabular token, no type sizes, no line-heights, no letter-spacing anywhere in the file. A 3840 px canvas with no type scale is the largest gap in the set. | See section 3 for the minimum sizes the scale must contain. |

### Brand colours, primary

| Token | Value | L* | Problem |
|---|---|---|---|
| `--brand-colors-primary-50` | #fef3f3 | 97 | Fine as a tint. |
| `--brand-colors-primary-100` | #fac5c5 | 84 | The 50 to 100 step is 13 L*, the 100 to 500 steps are 12, 10, 8, 4. Uneven ramp. |
| `--brand-colors-primary-500` | #eb1110 | 50 | Contrast 4.55:1 on white, 4.62:1 on black, only 3.63:1 on `--neutrals-primary-900` #221e1d. On the dark base this red passes as large text only. Small red text on the dark surface must use `primary-300` (#f26b6a, 5.57:1) or `primary-200` (7.76:1). |
| `--brand-colors-primary-700` | #8d0a09 | 29 | |
| `--brand-colors-primary-800` | #8d0a09 | 29 | Duplicate of 700. The 700 to 900 jump is 11 L* with a dead stop in the middle. |
| `--brand-colors-primary-900` | #5e0606 | 18 | Fine. |

### Brand colours, secondary

`--brand-colors-secondary-50` #fbecfb, `-100` #f9d7f8, `-500` #d842d3, `-900` #9c339d. Four stops with 200, 300, 400, 600, 700, 800 missing, so it is not a scale, it is four swatches. Magenta appears nowhere in the product, the landing page, or the brief's copy. `secondary-500` on the dark base is 4.44:1, on white 3.72:1 (fails as text on light). Argue it out, or define what it is for (the only defensible job on this product is "other people", to keep red for "you" and the machine).

### Neutrals

| Token | Value | L* | Problem |
|---|---|---|---|
| `--neutrals-primary-50` | #faf9f9 | 98 | |
| `--neutrals-primary-300` | #ccbfbb | 78 | |
| `--neutrals-primary-400` | #ccbfbb | 78 | Duplicate of 300. |
| `--neutrals-primary-600` | #ae9892 | 65 | 600 to 700 drops 24 L* (65 to 41) while 300 to 400 drops 0. Two adjacent mid-tones are missing. |
| `--neutrals-primary-900` | #221e1d | 12 | The darkest surface in the whole set. Contrast against true black is only 1.27:1. In mall daylight a #221e1d full-bleed reads as grey and the score's contrast ceiling drops. There is no 950, no true black, no white token. |

The neutrals are warm (brown-tinted), which is coherent with the red, but every opacity colour below is cool. And the word "primary" is used in three unrelated senses across the file: brand hue (`brand-colors-primary`), the only neutral ramp (`neutrals-primary`), and the strongest stop of a supportive colour (`supportive-colors-green-primary`).

### Supportive colours

| Token | Value | Problem |
|---|---|---|
| `--supportive-colors-green-primary` | #00c853 | Material green A700. 7.38:1 on the dark base, 2.24:1 on white, so it works dark-only. |
| `--supportive-colors-yellow-primary` | #ffab00 | Material amber A700. 8.71:1 dark, 1.90:1 on white. Dark-only. |
| `--supportive-colors-red-primary` | #d50000 | Material red A700. Contrast with `--brand-colors-primary-500` is 1.21:1: the "error" red and the brand red are the same colour to the eye (hsl 0 100 42 versus 0 87 49). Every destructive or failed state will read as brand, and every brand accent as a warning. On the dark base it is 3.01:1, below AA for any text. |
| `--supportive-colors-red-secondary` | #99050a | 1.09:1 against `--brand-colors-primary-700` #8d0a09. Another duplicate in all but hex. |
| `--supportive-colors-*-tertiary` | #e5f8ed, #fffae7, #fbe5e5 | Light-mode chip backgrounds. Useless on the dark base the opacity set implies; there are no dark equivalents. |

Resolution to state: red is the brand and only the brand. Failure and warning states use yellow plus shape and copy; the supportive red set is deleted. Green is reserved for one job (a personal best going up) so it stays meaningful.

### Opacity colours

| Token group | Value | Problem |
|---|---|---|
| `--main-bg-0` to `--main-bg-70` | rgba(255,255,255, 0 to .7) | White overlays only make sense on a dark base, yet no dark base token exists. The scale stops at 70; there is no 80, 90, 100. |
| `--secondary-bg-0` to `--secondary-bg-70` | rgba(242,243,243, 0 to .7) | A cool grey (blue channel highest) over warm neutrals, and at 10% it composites to (24,24,24) versus (26,26,26) for main-bg on black: indistinguishable. Eight redundant tokens. |
| missing | | No black-based scrim set (`rgba(0,0,0,x)`) for text over the playback video, no "over video" colour at all, no glass or blur token, no border-on-dark token. |

### Missing outright for a 1080 x 3840 panel

- Type scale with sizes, line-heights and tracking; nothing under 36 px on the machine, nothing the spectators must read under 96 px (section 3).
- Motion scale: durations (ms) and easings. The brief evaluates "weight and timing" and ships zero motion tokens.
- Surface scale for dark: base, raised, over-video, the QR tile (must be pure #ffffff with #000000 modules, no brand tint).
- Spacing and radius scales at machine scale (a 16 px radius is 6 mm and disappears at 1.5 m).
- Safe zones: bezel, overscan, and the physical bands (reach, eye, spectator) as tokens the whole team can reference.
- A device-scale factor. One machine pixel subtends 0.90 arcmin at 1.5 m; one iPhone CSS px subtends 1.63 arcmin at 0.35 m. The same "16 px" is 1.8x smaller to the player and 5.5x smaller to a spectator at 4.5 m. A phone label at 16 px needs 29 px on the machine for the player and 87 px for the queue.
- Semantic tokens: `--score`, `--score-best`, `--you`, `--others`, `--surface-video-scrim`. The file is all primitives and no roles, which is why nobody can tell what the magenta is for.
- Naming: three conventions in one file (`--brand-colors-primary-500` Figma-export style, `--main-bg-10` no group, `--supportive-colors-green-primary` semantic-ish). Pick one.

---

## 3. The physical maths

### Panel

- 3840 px over 1.5 m: 2.56 px per mm, 0.39 mm pixel pitch, active width 422 mm at 9:32 (the brief's 0.5 m is cabinet, not glass).
- Bottom edge 0.5 m, top edge 2.0 m above the floor (assumed). Canvas y from the top converts to floor height as `2.0 m minus y/2560`.

### Legibility thresholds (cap height, not font size)

Cap height needed to subtend a given visual angle. 16 arcmin is the ISO 9241 minimum, 20 to 22 arcmin is comfortable, 30 arcmin is the glance-from-a-crowd target.

| Distance | 16' min | 20' comfortable | 22' | 30' glance |
|---|---|---|---|---|
| 1.0 m (player, close) | 4.7 mm, 12 px | 5.8 mm, 15 px | 6.4 mm, 16 px | 8.7 mm, 22 px |
| 1.5 m (player, stepped back) | 7.0 mm, 18 px | 8.7 mm, 22 px | 9.6 mm, 25 px | 13.1 mm, 34 px |
| 3.0 m (near spectator) | 14.0 mm, 36 px | 17.5 mm, 45 px | 19.2 mm, 49 px | 26.2 mm, 67 px |
| 4.5 m (far spectator) | 20.9 mm, 54 px | 26.2 mm, 67 px | 28.8 mm, 74 px | 39.3 mm, 101 px |

Converting cap height to font size (Orbitron cap 0.72 em, Poppins 0.713, Inter 0.728, Barlow Condensed and Bebas 0.70):

- Smallest UI on the machine (player at 1.5 m, 22'): cap 25 px, so a 35 px font. Round the floor to 36 px and never go below it, including the legal line.
- Anything the player must catch in a glance during the reveal: 48 px and up.
- Any line the spectators are meant to read (the "house record" line, a name): 96 px minimum at 4.5 m (20'), 144 px to actually carry (30').

### How big the score can be in 1080 px

Measured advances (em, at 1000 upm). Orbitron 900: digits 0.834 (0), 0.391 (1), 0.83 (2), 0.826 (3), 0.73 (4), 0.83 (5), 0.82 (6), 0.66 (7), 0.834 (8), 0.828 (9); comma 0.243; period 0.233. No `tnum` feature. Barlow Condensed Black: digits 0.30 to 0.53, comma 0.233, period 0.246, `tnum` available. Bebas Neue: every digit 0.40, comma and period 0.188, tabular by default.

Measure of 1000 px (40 px side margins):

| Face | "999,999.000" | font-size | cap px, mm | "999,999" | font-size | cap px, mm |
|---|---|---|---|---|---|---|
| Orbitron 900 | 7.946 em | 126 px | 91 px, 35.5 mm | 5.211 em | 192 px | 138 px, 54 mm |
| Orbitron 900, no separator | 7.72 em | 129 px | 93 px | 4.968 em | 201 px | 145 px, 57 mm |
| Poppins Black (current brand) | 6.229 em | 161 px | 114 px, 45 mm | 3.924 em | 255 px | 182 px, 71 mm |
| Inter 900, tnum | 6.928 em | 144 px | 105 px, 41 mm | 4.422 em | 226 px | 165 px, 64 mm |
| Oswald 700 | 5.360 em | 187 px | 151 px, 59 mm | 3.466 em | 289 px | 234 px, 91 mm |
| Barlow Condensed Black, tnum | 4.592 em | 218 px | 152 px, 59 mm | 2.969 em | 337 px | 236 px, 92 mm |
| Bebas Neue, tabular | 3.976 em | 252 px | 176 px, 69 mm | 2.588 em | 386 px | 270 px, 105 mm |

What that means on the panel:

- Orbitron at full length is 126 px: cap 35.5 mm, 27 arcmin at 4.5 m, 2.4% of the panel height. Legible to the queue, but it is a readout, not an event. Orbitron cannot put the full score on one line at event scale.
- Orbitron integer-only is 192 px: cap 54 mm, 41 arcmin at 4.5 m, 3.6% of the panel. Acceptable, and the "1" problem remains: "111,111" is 2.6 em against 5.2 em, and a counting animation reflows every frame.
- A condensed heavy tabular face carries the whole score at 218 to 252 px (cap 59 to 69 mm, 45 to 53 arcmin at 4.5 m), or the integer at 337 to 386 px (cap 92 to 105 mm, 70 to 81 arcmin at 4.5 m, 6 to 7% of the panel). That is 1.7x to 2.0x Orbitron's cap height in the same width, with digits that do not jump while counting.
- Vertical cost: Orbitron's line box is 1.254 em (a 192 px line occupies 241 px); the condensed faces are 1.2 em.
- The decimals: with the integer at 336 px there is no width left on the line (".000" needs 1.6 em of the same size). They go on a second line, right-aligned to the integer's last digit, at 120 px (cap 84 px, 33 mm, 25' at 4.5 m), or they appear as a later beat of the reveal. Never inline at the hero size.
- If Orbitron must stay for brand reasons: use it for the integer only, in fixed-width slots of 0.834 em each so "1" does not collapse the line, and set the decimals and every label in the UI face.

### Where the eye actually is

Player eye height 1.55 m (average adult). Without moving the head the eye covers roughly 15° up and 30° down (the relaxed line of sight already drops 10 to 15°).

| Viewer | Band without head movement | Canvas y | Notes |
|---|---|---|---|
| Player at 1.0 m | 0.97 to 1.82 m floor | 466 to 2630 | Top edge is 24° up, bottom edge 46° down. The top 460 px and bottom 1200 px are peripheral. |
| Player at 1.5 m | 0.68 to 1.95 m | 123 to 3369 | Nearly the whole panel. Stepping back is what a player does after a strike; design the reveal for 1.5 m. |
| Spectator at 3.5 to 4.5 m, side offset | whole panel | 0 to 3840 | The panel subtends 13° vertically; it is a poster to them. |
| Spectator directly behind the player (player at 1.25 m, 1.75 m tall) | above 1.86 m at 3.5 m, above 1.83 m at 4.5 m | y below 356 to 443 | Only the top 350 to 450 px clears the player's head. |

The tension the design has to resolve: the queue directly behind sees only the top 450 px, the player at 1 m sees comfortably only from y 460 down. The score cannot satisfy both at once, so the score sits in the player's band with its optical centre near y 800 (floor 1.69 m, 8° up at 1 m, 5° at 1.5 m), and the top 450 px carries a second, spectator-facing signal (a colour field, a state word, the score echoed small) that reads over the player's shoulders. Children (eye 1.1 m) and wheelchair users (1.1 to 1.3 m) look 20° to 25° up at y 800 from 1 m: acceptable for a 3 s event, not for reading.

Canvas bands to carry into the Figma file (floor heights in brackets):

- y 0 to 450 (2.00 to 1.82 m): spectator strip, visible over the player. No player-critical content.
- y 450 to 1700 (1.82 to 1.34 m): the player's eye band. The score event lives here.
- y 1700 to 2150 (1.34 to 1.16 m): chest height. The handoff lives here.
- y 2000 to 3840 (1.22 to 0.50 m): the only ADA-reachable touch zone if touch ever exists. Comfortable standing touch is y 1280 to 2816 (1.5 to 0.9 m).
- y 3000 to 3840 (0.83 to 0.50 m): knee height, 46° down from 1 m, behind the pad and the first person's body. Ambient, brand, legal.

### The QR code

Height: the phone is held at chest to eye level, 1.1 to 1.4 m, with the camera within about 30° of the panel normal. A code at the bottom edge sits at 0.5 to 0.7 m: the player crouches or points the phone 40° down, and the queue's legs occlude it. Centre the code at 1.2 to 1.3 m from the floor, which is canvas y 1790 to 2050. The exact middle of the canvas, y 1920, is 1.25 m from the floor: chest height. That is where the code belongs, not the bottom.

Size: scan distance to code width tops out around 10:1 for reliable decoding on ordinary phones.

- Payload kept to 29 alphanumeric characters or fewer, uppercase so the encoder uses alphanumeric mode (for example `HTTPS://PNCH.APP/K7F3Q9M2`, 25 chars), fits QR Version 2 at ECC level Q: 25 modules a side.
- 14 px per module (5.5 mm): code 350 px = 137 mm; scans from 0.3 m (phone minimum focus) to 1.37 m. Quiet zone 4 modules = 56 px each side, so the white tile is 462 x 462 px = 180 mm, 43% of the panel width.
- Minimum if space is fought over: 10 px per module, 250 px = 98 mm, tile 330 px = 129 mm, reliable to 0.98 m only.
- If the URL needs tracking parameters, Version 3 (29 modules) at 12 px: code 348 px, tile 444 px, 1.36 m reach.
- Rules: integer pixels per module, no fractional scaling, no anti-aliasing, #000000 modules on a #ffffff tile (inverted codes fail on many Android scanners), never tinted brand red, never over video, never animated while it is meant to be scanned, on screen at least 10 s and persisting small on the attract screen for 60 s after. A 462 px tile centred at y 1920 spans y 1689 to 2151, floor 1.16 to 1.34 m.

A short human-typable code (6 characters, 96 px, under the QR) covers the phone that cannot scan and the player who screenshots the screen.

---

## 4. What the panel is really evaluating, and the trap under each bullet

**"Whether the score reveal is genuinely exciting to look at."** They are testing hierarchy under pressure: one climax, anticipation before it, a settle after it, and restraint everywhere else. The trap is decoration: particles, glows, a gradient number, everything pulsing, so that nothing is the event. The second trap is scale illusion: a 3840 px canvas viewed on a laptop at 20% makes any number look big; the numbers in section 3 are what "big" means on the real panel. The third trap is a reveal that takes 4 s while a queue waits, or one that is exciting only with the sound on.

**"Whether the composition uses the screen it's actually on."** They are testing whether the candidate understood a 9:32 portrait panel 1.5 m tall with a top out of reach and a bottom at knee height, and two audiences at two distances. The trap is a phone screen scaled up 2.77x (390 x 1386 is exactly 1080 x 3840 at 2.77x), with a centred stack, cards, a tab bar, and 1500 px of empty middle. The other trap is treating it as a landscape TV rotated: the screen is a column, and columns have a top, an eye level and a floor.

**"Whether the motion has weight and timing, or is just movement."** They are testing physics literacy: an impact has anticipation, a hit frame, overshoot and a settle, with different easings for each, in milliseconds that match a punch. The trap is uniform ease-in-out tweens, a number rolling for 3 s, motion that a spectator at 4.5 m cannot see (small parallax, subtle blur), and motion whose sense comes from an audio hit that the mall will drown.

**"How you solved the machine-to-phone handoff."** They are testing systems thinking: identity, privacy, expiry, group use, the no-app path, failure modes (no signal, phone in a bag, scan fails, someone else scans first), and throughput with a queue. The trap is "a QR code" as the whole answer: no before (pre-claim), no after (what the phone shows in the first 5 s, the install-later case, the expired case), and a code anyone in the queue can claim. The other trap is gating the score behind an install.

**"What you did with the brand, and what you'd change about it."** They are testing judgement and the ability to argue. The tokens carry planted issues (duplicate 700/800, duplicate neutral 300/400, Orbitron as the UI face, two identical reds, white overlays with no dark base, a four-stop magenta with no job). The trap is obedience ("they gave Orbitron, so everything is Orbitron"), its opposite (a wholesale replacement with no reasoning), and using every colour because it was supplied. A senior answer keeps the red, gives the type three roles, deletes what has no job, and writes down why.

**"Attention to detail."** They are testing whether the details are load-bearing: tabular digits, the separator convention, frames at exactly 1080 x 3840 and the stated phone size, safe zones, layer naming, every state (first attempt, personal best, house record, expired code, offline), copy without typos or dashes. The trap is detail as ornament: extra numerals, deltas and rank arrows on every row, and copying the reference app's "987654.321 Score" with "Score" as a unit label. The other trap is a beautiful clip and a Figma file with unnamed layers and a 1079 px frame.

---

## 5. Questions the candidate should have asked

Hardware and installation
1. Is touch available or not, and is there a physical button, a light strip, or any other output besides the panel?
2. What are the real cabinet dimensions: active area, bezel, mounting height of the bottom edge, and where the pad and camera sit relative to the glass?
3. How bright is the panel and is it ever in direct sun? Is it a 9:32 stretched LCD or two 16:9 panels stacked (a seam at y 1920 would move the QR)?
4. How is a credit paid: coin, card, app tokens, staff? Can the app pay, and if so can the attempt be pre-linked to the account?
5. Is the machine reliably online? What happens today when it is not?

Data and scoring
6. What does a real score look like: median, 90th percentile, the house record on a busy machine? Are the three decimals ever shown to players today or only used for ordering?
7. What separators and locales must be supported? Which countries are live?
8. What context does the machine have at reveal time: house best, today's best, the player's own best (if identified), the crew or friends?
9. How long is the current result screen, and what is the measured attempt-to-attempt cycle time with a queue?

Video and privacy
10. Clip length, orientation, latency from impact to playable, and retention for unclaimed clips. Who owns an unclaimed clip?
11. What consent signage exists for recording faces in a mall, especially in the EU and UAE? Can a player opt out of the clip and still keep the score?
12. Should anyone but the player be able to claim, view, or share an attempt from the machine screen?

Business
13. What is the current claim rate and install rate from the machine, and where do people drop?
14. Is "three attempts" three in a row on one credit purchase, or three across visits? Does the second attempt cost the same?
15. Are groups the dominant case? Is there a group mode today?

Brand
16. Are the tokens the intended future direction or a placeholder, given the live product ships Poppins and Inter with red #eb1110?
17. Is Orbitron a decision or an inheritance? Is the magenta secondary used anywhere?
18. Is there a dark base colour, and is the machine dark-only?

The exercise itself
19. Does the clip need to be the full 1080 x 3840, and at what frame rate?
20. How much of the optional competition surface is expected, and would they rather see depth on the handoff than breadth across leaderboards?
21. How do they want AI use noted: inline in the notes, or as a separate list?