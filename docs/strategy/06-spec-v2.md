# PunchApp "Ring the Bell". Build specification, revision 2

Everything below is final unless it appears in open questions.

**Units**
- Machine: px on the 1080 x 3840 canvas, y measured from the top.
- Phone: pt on a 393 x 852 frame.
- Times: ms.

**Copy:** strings are final and contain no em or en dashes.

**Widths**
- Marked "measured": fontTools advance sums from revision 1 (Orbitron 900 static, Saira Extra Condensed Black).
- Marked "est.": estimated at 0.80 em per Orbitron capital and 0.55 em per Inter character. The font files were not available when this revision was written, so the builder must verify each "est." width in Figma before laying out.
- Build rule for any string that overflows: rewrite it, never shrink it.

**What changed from revision 1, in three decisions**
1. **The unit of play is the run, not the hit.**
   - One code per run stays in place while a group takes turns and covers every hit in the run.
   - Scanning never claims. Each person keeps their own hit with one tap.
   - The previous replay is no longer thrown away by a queued credit.
   - This removes the carry strip, the carry-over tile, the Scanned state, "Catch my next hits here" and friends keeping each other's hits by accident.
2. **The top of the tower is reachable, and it is the plate itself.**
   - The bell is this machine's 95th percentile over 30 days, drawn as the white underside of the score plate.
   - A median hit climbs to about 0.6 of the tower.
   - Every mark the charge passes through gets a beat, and every hit that reaches the top collides with the plate.
3. **The reveal waits for the reading and for the eyes.**
   - The charge launches at 400 ms or when the reading arrives, whichever is later.
   - It holds at its apex through the landing and the stillness.
   - Physical beats come from one gravity constant and a real cost at each mark. There is no claim to real-world physics.

---

## 1. Concept

**The concept.** The cabinet is a 1.5 m column, so it plays like a fairground high striker.

- **The charge.** Every hit sends a red charge up the glass, exactly as high as the hit deserves against the top of the tower. The top is the white underside of the plate the score lands on, set at the level only one hit in twenty reaches on this machine.
- **The marks.** On its way up the charge meets marks: today's line and the hits your friends just made in this run. Each mark it passes resists, freezes it for 50 ms, costs it a fifth of its speed and breaks.
- **The number.** The charge holds at its height. After a 240 ms hang the integer falls from above the glass onto the plate at the top of the column. It lands hard enough to flex the plate and jolt the panel, and it never moves again.
- **After the landing.**
  - The charge drains.
  - The marks retract into a rail.
  - A near life-size replay fades in at eye height.
  - One code for the whole run sits at chest height, on the side away from the pad, beside a small still of every hit in the run.
  - The go-again line talks to the group.
- **What stays off the glass.** The glass never shows a name, a rank or a second number. The phone holds identity, history and rivalry, all tied to physical machines.

**The three interview sentences.**
1. "The screen is 1.5 metres tall, so height does the ranking: the charge climbs as high as the hit deserves against the top of this machine's month, and the score stays the only number on the glass."
2. "One gravity constant drives every rise and every fall, so every hit has the same physics and a different launch, and each mark the charge breaks through really costs it speed."
3. "People play in groups, so the glass shows one code per run that stays put while friends take turns: anyone can scan to watch, and each person keeps their own hit with one tap."

---

## 2. Physical model of the screen

### 2.1 Assumptions (each one is a named constant)

- **Scale.** The panel is 1.5 m of active height with square pixels, so 3840 / 1500 mm = **2.56 px per mm (0.39 mm per px)**. At 9:32 the glass is 0.42 m wide. The brief's 0.5 m is the cabinet including bezel.
- **`MOUNT_TOP = 2.00 m`.** The glass top is at 2.00 m and the bottom at 0.50 m. Floor height of canvas y = `MOUNT_TOP - y / 2560` m. The Figma zoning frame carries the note: "Change MOUNT_TOP and every band moves by the same offset."
- **`PAD_SIDE = right`.** The pad is beside the panel on the right.
  - The rail, the QR tile and the queue decal all sit on the left, away from the swing.
  - The layout mirrors in x when `PAD_SIDE = left`.
- **`READER_Y` = canvas-equivalent y 2600 (0.98 m).** The payment reader is on the cabinet at this height.
- **Camera (hardware requirement).**
  - In the side bezel on the pad side, at 1.45 m, turned 35 degrees toward the pad.
  - 3:4 crop from knee to above the head.
  - The contact frame is keyed to the sensor timestamp, never to image content.
- **Sensor latency.** The request to hardware is a reading within 120 ms of contact. The choreography absorbs readings up to 383 ms with no change. A later reading delays the launch (see M-03).
- **No touch** is the base case.
  - Every state ends on a timer, a credit, a strike or a server event.
  - If touch exists, the only enhancement is a tap on the replay (y 552 to 1768) to restart it from the contact frame.
  - Nothing depends on audio.
- **Queue position.** A floor decal 2.5 to 3.5 m out and 30 to 40 degrees off the panel axis on the left (away from the pad). From there the whole column is visible. Printed sign on the decal: "Next up waits here".

### 2.2 Viewers and sightlines (recomputed)

| Viewer | Position | What they see |
|---|---|---|
| Player at the pad | 0.6 to 1.0 m, eye 1.55 m | Crown centre (1.91 m) is 20 degrees up at 1.0 m and 31 degrees up at 0.6 m. The landing happens while they are here, which is why the launch waits until at least 400 ms after contact. |
| Player stepped back | 1.5 m, eye 1.55 m | Nearly the whole panel. Crown 13.5 degrees up. |
| Group at the queue decal | 2.5 to 3.5 m, 30 to 40 degrees off axis | The whole column from 0.50 to 2.00 m, 28 degrees tall at 3 m. **The reveal and Z4 are designed for this position.** |
| Spectator directly behind the player | 3.5 to 4.5 m | **Not a designed viewing position.** With a 1.75 m player at 1.5 m and eye 1.60 m, the sightline over the head meets the glass at y 352 from 3.5 m and y 448 from 4.5 m. A 1.85 m player hides the whole panel from 3.5 m. M-00 draws the head range 1.60 to 1.90 m and the eye range 1.45 to 1.70 m. |
| Far spectator, off axis | 4.5 m | The panel is 19 degrees tall, a poster. |
| Child (eye 1.1 m) or wheelchair user (eye 1.2 m) | 1.5 m | Crown 25 to 28 degrees up: fine for a 3 s event, not for reading. Nothing that must be read lives in the crown except the score. |

### 2.3 Fixed zones (identical in every state)

**Horizontal layout**
- Rail: **x 16 to 64** (48 px).
- Content measure: **x 104 to 1016** (912 px).
- Right margin: 64 px.
- Nothing is centred except the word KEPT inside its tile.

| Zone | Serves | y range | Floor height | Contents |
|---|---|---|---|---|
| Z0 Crown | Everyone, above the queue's heads from the side | 0 to 364 | 2.00 to 1.86 m | Integer cells, cap y 115 to 352, baseline 352 |
| Z1 Plate | Everyone | 364 to 504, x 0 to 1080 | 1.86 to 1.80 m | Top edge at y 364; label left, decimals right; **bell edge** y 492 to 504 |
| Z2 Replay | Player at eye height | 552 to 1768, x 104 to 1016 | 1.78 to 1.31 m | 912 x 1216 (3:4), 475 mm tall |
| Z3 Run block | Hands and phones (chest) | 1808 to 2448 | 1.29 to 1.04 m | Headline, QR tile x 104 to 665, stills and copy column x 696 to 1016 |
| Z4 Call | Next payer and the group at the decal | 2472 to 2900 | 1.03 to 0.87 m | Headline, payment line and arrow, recording notice |
| Z5 Runway | Nobody (bodies block it) | 2900 to 3720 | 0.87 to 0.55 m | Empty on purpose; the charge launch tube |
| Z6 Base strip | Everyone | 3720 to 3840 | 0.55 to 0.50 m | #5E0606 at rest, #EB1110 on impact |
| Rail | Everyone | 504 to 3720, x 16 to 64 | 1.80 to 0.55 m | Track, charge fill, notch, today tick, run ticks, gap segment |

**Tower scale (linear, never curved)**
- `h = score / bell`. Mark y = `3840 - min(h, 1) x 3336`. So h = 1 is y 504, the bell edge, and h = 0 is y 3840.
- **`bell`**: the 95th percentile of unflagged scores on this machine in the rolling last 30 days, recomputed at 04:00 local.
  - Below 300 scores in 30 days, it uses the operator's calibration value.
  - It has no holder and no face, because it is a level, not a hit.
- **`record`**: the best unflagged score on this machine in the last 30 days.
- **`today`**: the best unflagged score since 04:00 local. It exists only once the day has a hit.

**Legibility of the key sizes.** Cap height at 2.56 px/mm; the floor is 16 arcmin and 20 is comfortable.

| Element | Size | Cap | mm | At 1.5 m | At 3 m (decal) |
|---|---|---|---|---|---|
| Integer, Saira XC Black | 344 px | 237 px | 92.6 | 212' | 106' |
| Decimals | 120 px | 83 px | 32.3 | 74' | 37' |
| HIT IT, Orbitron 900 | 160 px | 115 px | 45.0 | 103' | 52' |
| Z4 headline, Orbitron 900 | 104 px | 75 px | 29.3 | 67' | 34' |
| Z3 headline, Orbitron 900 | 72 px | 52 px | 20.3 | 46' | 23' |
| Plate label, Orbitron 900 | 64 px | 46 px | 18.0 | 41' | 21' |
| Letter code, Orbitron 900 | 52 px | 37 px | 14.5 | 33' | 17' |
| TODAY mark label, Orbitron 700 | 40 px | 29 px | 11.3 | 26' | 13' (reveal only; the line itself carries it) |
| Payment line, Inter 700 | 48 px | 35 px | 13.7 | 31' | 16' |
| Recording notice, Inter 700 | 40 px | 29 px | 11.3 | 26' | read at the reader, 0.8 m: 49' |
| Floor, Inter 600 | 36 px | 26 px | 10.2 | 23' | player only |
| Rail tick | 16 px tall | n/a | 6.3 | a position cue, never the only carrier | |

---

## 3. Type system

### 3.1 Roles

| Token | Face | Job |
|---|---|---|
| `--font-score` | **Saira Extra Condensed Black** in fixed cells for the prototype. For launch, commission "PunchApp Numerals": 12 glyphs (0 to 9, comma, point) drawn on Orbitron's construction at a fixed 0.402 em advance. | Every score on both surfaces, and nothing else |
| `--font-display` | Orbitron 900 and 700, caps only. Tracking +4% on the machine, +6% on the phone. | Words of three or fewer on the machine: plate labels, headlines, the code |
| `--font-sans` | **Inter (static family)** 700 / 600 / 400. Not the variable build at opsz 32, because Figma and kiosk builds render the static metrics. | Every sentence on the machine, and all phone UI |

### 3.2 Why the hero score is not Orbitron (measured)

**Orbitron 900 digits are wide and proportional.**
- "0" is 0.834 em and "1" is 0.391 em.
- There is no `tnum` feature, and the comma is 0.243 em.
- In fixed cells, "999,999" needs 6 x 0.834 + 0.243 = **5.247 em**. On the 912 px measure that is **174 px, cap 125 px = 49 mm**.
- The full "999,999.000" on one line needs 7.946 em, so **115 px, cap 32 mm**: smaller than the HIT IT prompt.

**Saira XC Black gives nearly twice the height in the same width.**
- Widest digit 0.402 em, comma 0.243 em, cap 0.688 em.
- Six 138 px cells plus an 84 px comma cell at 344 px make **912 px, cap 237 px = 92.6 mm**. That is **1.9x Orbitron's cap in the same width**.
- A "1" centred in its cell never reflows the line.

**Rejected alternatives**
- Squashing Orbitron horizontally reverses its stroke contrast.
- Rotating the number up the column is slow to read.
- Splitting it over two lines reads as two numbers.

**How Orbitron stays the brand voice**
- It sets every word on the glass.
- Red does the rest.
- The stem weights match (Saira stem to cap 0.224, Orbitron 0.212), so at distance the pair reads as one material.
- The pitch to the brand owner is a 1:1 print of both settings, read together from 3 m.

### 3.3 Machine type scale (px)

| Role | Face and weight | Size | Tracking | Line pitch | Colour |
|---|---|---|---|---|---|
| Score integer | Saira XC Black, 138 px cells, 84 px comma cell | 344 | 0 | n/a | #FFFFFF; ghost cells white 8% |
| Score decimals | Saira XC Black, 48 px cells, 29 px point cell | 120 | 0 | n/a | white 64% (static, never stamped) |
| Armed prompt | Orbitron 900 | 160 | +4% | n/a | #FFFFFF |
| Out of service | Orbitron 900 | 120 | +4% | n/a | #FFFFFF |
| Z4 and Attract headline | Orbitron 900 | 104 | +4% | 112 | #FFFFFF |
| Z3 headline, KEPT on tile | Orbitron 900 | 72 / 104 | +4% | n/a | #FFFFFF / #000 |
| Plate label | Orbitron 900 | 64 | +4% | n/a | #FFFFFF |
| Letter code | Orbitron 900 | 52 | +8% | n/a | #FFFFFF |
| TODAY label on the line | Orbitron 700 | 40 | +4% | n/a | white 64% |
| Replay tab | Orbitron 700 | 40 | +4% | n/a | #FFFFFF on scrim-black-70 |
| Payment line, fault lines | Inter 700 | 48 | 0 | 58 | #FFFFFF |
| Recording notice | Inter 700 | 40 | 0 | 50 | #FFFFFF |
| Z3 column copy | Inter 600 | 36 | 0 | 46 | #FFFFFF, or white 70% for the typed line |

- The floor is 36 px everywhere.
- Fonts are bundled on the cabinet and never fetched. The Arial Black fallback, a third narrower, can never render.

### 3.4 Mobile type ramp (pt, iOS)

**Scores (Saira XC Black in fixed cells)**

| Role | Cell width | Comma cell | Size |
|---|---|---|---|
| Hit hero (P-02) | 51 | 31 | 128 |
| Hit detail | 42 | 25 | 104 |
| Feed card | 35 | 21 | 88 |
| Best tile (P-03) | 23 | 14 | 56 |
| Claim picker tiles, board rows | 13 | 8 | 32 |
| Board rows, small | none | none | 28 |
| Decimals on plates | none | none | 40 / 32 (white 64%) |

**Words**

| Role | Face | Size / line |
|---|---|---|
| Plate label | Orbitron 900 caps, +6% | 15 |
| Section label | Orbitron 900 caps, +6% | 13 |
| Large title | Inter 700 | 34 / 41 |
| Title | Inter 700 | 28 / 34 |
| Body strong | Inter 600 | 17 / 22 |
| Body | Inter 400 | 17 / 22 |
| Secondary | Inter 400 or 600 | 15 / 20 |
| Meta | Inter 400 | 13 / 18 |

Decimals appear only on plates, on hit detail and in board rows (where ties happen).

---

## 4. Colour and surface system

### 4.1 Palette (dark only, both surfaces)

| Token | Hex | Status | Job and reason |
|---|---|---|---|
| `ink-950` | #0B0908 | **Added** | Ground. neutrals-900 #221E1D is 1.27:1 against black and reads grey in mall daylight. White on ink-950 is 19.9:1. |
| `ink-900` | #1C1817 | **Added** | Plain plate, phone raised surfaces |
| `primary-500` | #EB1110 | Kept | The strike: charge, base-strip flare, notch, red plates, "you", primary buttons. 4.37:1 on ink-950, so text only at 72 px and up on the machine, or 20 pt bold on the phone. |
| `primary-300` | #F26B6A | Kept | Small red text on dark (6.7:1) |
| `primary-800` | #750808 | **Changed** from #8D0A09 | It duplicated 700. Now also the READING pulse low. |
| `primary-900` | #5E0606 | Kept | Base strip at rest |
| `neutrals-400` | #C4B5B0 | **Changed** from #CCBFBB | It duplicated 300 |
| `secondary-500` | #D842D3 | Kept, **one job** | Other people's challenges: "Beat this" on the phone, challenge ticks on a linked rail. 5.3:1. Never on plates. |
| `green-primary` | #00C853 | Kept, **phone only** | Your own best going up |
| `yellow-primary` | #FFAB00 | Kept, **one job** | Faults: an 8 px plate top edge on NO READING, and BACK SOON. Always with words. |
| `supportive-red` primary, secondary, tertiary | #D50000 / #99050A / #FBE5E5 | **Deleted** | #D50000 is 1.21:1 against brand red, so errors and brand would read as the same colour |
| `secondary-bg-*` | rgba(242,243,243,x) | **Deleted** | Cool over warm neutrals, and indistinguishable from main-bg |
| `main-bg-*` | rgba(255,255,255,x) | **Renamed** `overlay-white-*`, **steps 08 / 16 / 24 / 40 / 64 / 70 / 85** | 08 ghost cells, 16 rail track, 24 mark lines, 40 plate edge at rest and ticks, 64 secondary text and decimals, 70 typed line, 85 QR ground |
| `scrim-black-40`, `-70` | rgba(0,0,0,.4) / (.7) | **Added** | Text over video |
| `plate-edge-rest` | white 40%, 4 px | **Added** | Top edge of every plate, so the landing surface is visible even on a plain ink-900 plate (1.13:1 against the crown) |
| `plate-edge-hit` | #FFFFFF, 12 px | **Added** | Landing flare, back to rest in 200 ms |
| `bell-edge` | #FFFFFF, 12 px | **Added** | The plate underside, y 492 to 504, full width: the top of the tower |
| `qr-ink` | #000000 | **Added** | QR modules only |
| `qr-ground` | #D9D9D9 (white 85%), per-venue 70% to 100% | **Added** | A full-white 180 mm tile on a near-black panel makes phones meter for the dark and bloom closes the finder gaps. #000 on #D9D9D9 is 14.9:1. Never tinted red, never inverted, never over video. |

### 4.2 Plate states

There are no tiers. Height is the grade, and the plate names the event.

| State | Condition | Crown ground | Plate fill | Label (est. width) |
|---|---|---|---|---|
| Plain | none of the below | ink-950 | ink-900 | none |
| Run leader | run of 2 or more and this hit is the run's top | ink-950 | ink-900 | RUN LEADER (est. 530) |
| Today's best | a today line already existed, this hit beat it, and h is 0.5 or more | ink-950 | #EB1110 | TODAY'S BEST (582 measured) |
| Hit the top | h is 1 or more | ink-950 | #EB1110 | HIT THE TOP (est. 590) |
| House record | score above `record` | #EB1110 over y 0 to 364 | ink-950 | HOUSE RECORD (625 measured) |
| Phone linked | Armed with a linked phone | ink-950 | ink-900 | PHONE LINKED |
| Reading | no value yet after 1,500 ms | ink-950 | ink-900 | READING |
| No reading | fault | ink-950 | ink-900 with 8 px #FFAB00 top edge | NO READING (479 measured) |
| Nobody yet | Attract with no hit today | ink-950 | ink-900 | NOBODY YET |

- **Priority:** house record, then hit the top, then today's best, then run leader.
- The label space runs from x 136 to x 843 (707 px), because the decimals occupy x 843 to 1016.

**Venue settings**
- Charge opacity: 100% by default, down to 60% for dim venues.
- QR ground: 70% to 100%.

**Burn-in**
- Between runs, the whole layout orbits 1 px within a 4 px square every 10 minutes.
- After closing, the panel runs at 30% brightness with no charge.

---

## 5. Machine states

### 5.0 Numbers used in every frame

| Item | Score | h | Mark y |
|---|---|---|---|
| bell | 640,000 | 1.0 | 504 |
| record | 812,406 | none | none |
| today | 471,220 | 0.736 | **1384** |
| Run hit 1 ("the friend") | 318,540 | 0.498 | **2180** |
| **Hero, run hit 2** | **402,176.240** | **0.628** | **1744** (a near-median hit) |
| Plain solo variant | 262,400.118 | 0.410 | 2472 |

- Run code: **KTR BVM**. QR payload: `HTTPS://PNCH.APP/DXB2KTRBVMHN`.
- Clock t is measured from contact.

**Rail rendering (x 16 to 64)**
- Track: white 16%.
- Charge fill: #EB1110.
- Hit notch: 56 x 16 px white, x 12 to 68.
- Today tick: 48 x 8 px, white 64%, drawn only when `today` exists.
- Run ticks: 48 x 16 px white 40%. The run's top tick is white 100%.
- Linked challenge ticks: 48 x 16 px, #D842D3.
- Gap segment: 48 px wide, white 40%, only when a target rule names it.
- No labels on the rail.

**Run rules**
- **Start:** a credit accepted in Attract, or more than 60,000 ms after the last landing, starts a new run and a new code.
- **Membership:** a credit within 60,000 ms of a landing, or during any state of the run, joins it.
- **Size:** at most 6 hits. The 7th credit starts a new run.
- **End:** 60,000 ms after the last landing with no credit.
- **Stills:** each run hit contributes one 96 x 128 impact still to the Z3 grid, in order, left to right and then top to bottom.

### M-01 ATTRACT

- **Trigger:** boot, or the end of a run's Afterglow.
- **Duration:** loops.
- **Exit:** a credit starts a new run and goes to M-02.
- **Demo charge:**
  - Every 20,000 ms a charge rises at 60% opacity to today's line. It takes the physics rise time, hangs 240 ms and drains, with no shake and no number change.
  - Every third cycle it rises to the bell edge instead, and the plate edge flares.
- **Replay loop:** clips from adult owners who opted in per clip, bystanders blurred, 6,000 ms each with 400 ms crossfades. With no eligible clips, a staff demo with no faces.

| Zone | y | Element | Size | Colour | Copy |
|---|---|---|---|---|---|
| Z0 | 115 to 352 | Today's best integer (or ghost cells when today is empty) | 344 | #FFFFFF (ghost white 8%) | 471,220 (or 000,000) |
| Z1 | 364 to 504 | Plate; label at x 136, baseline 478; decimals right at x 1016 | 64 / 120 | ink-900, white, white 64% | TODAY'S BEST, .862 (or NOBODY YET) |
| Z1 | 492 to 504 | Bell edge | 12 | #FFFFFF | none |
| Z2 | 552 to 1768 | Opted-in clip loop | 912 x 1216 | video | none |
| Z3 | baselines 1900, 2012, x 104 | Headline | 104 | #FFFFFF | HIT IT / TO THE TOP (est. 380 / 757) |
| Z3 | baseline 2100 | Line | Inter 700 48 | #FFFFFF | One credit. One hit. |
| Z4 | baseline 2752 | Payment line, plus a 64 px arrow 24 px after the text pointing at `READER_Y` | Inter 700 48 (est. 530) | #FFFFFF | Pay at the reader to play. |
| Z4 | baselines 2828, 2878 | Recording notice | Inter 700 40 | #FFFFFF | Every hit is filmed for its replay. / Replays nobody keeps are deleted. |
| Rail | 504 to 3720 | Track, today tick at 1384 | | | |

- **Numerals:** 1.
- **Cabinet sign:** a printed camera pictogram at 1.5 m reading "Camera in use".

### M-02 ARMED

- **Trigger:** credit accepted.
- **Exit:** a strike goes to M-03. The credit is never lost.
- **0 to 300 ms:** the crown's today-best (if shown) lifts out through the top of the glass (ease-in quad), ghost cells `000,000` fade in at 8% and the plate empties.
- **In a run:** Z3 stays exactly as it is, the same tile and the same pixels, and never hides.
- **Timeouts:**
  - At 90,000 ms without a strike, the prompt becomes STILL YOURS.
  - At 180,000 ms, go to M-09.
- **Credits:** a second credit during Armed is banked. The glass never shows a credit count.
- **Strikes:** a strike with no credit is ignored and logged.

| Zone | y | Element | Size | Colour | Copy |
|---|---|---|---|---|---|
| Z0 | 115 to 352 | Ghost cells | 344 | white 8% | 000,000 (texture, not counted) |
| Z1 | 364 to 504 | Plate; label only if linked | 64 | ink-900 | PHONE LINKED |
| Z2 | 552 to 1768 | Live camera, **mirrored** (the recording is not) | 912 x 1216 | video | none |
| Z2 tab | 576 to 640, x 104 | Tab, 16 px padding, baseline 624 | Orbitron 700 40 | white on scrim-black-70 | YOU'RE ON CAMERA |
| Z2 prompt | 1560 to 1768 | Scrim 70%; prompt at x 136, baseline 1720 | 160 | #FFFFFF | HIT IT (after 90 s: STILL YOURS at 104 px, 852 measured) |
| Z3 | 1808 to 2448 | Empty on the first hit of a run; otherwise the live run block (M-06 layout) | | | |
| Z4 | 2472 to 2900 | Empty | | | |
| Rail | | Track, today tick, run ticks, magenta ticks if linked | | | |

**Numerals:** 0.

### M-02q ARMED AFTER A QUEUED CREDIT

- **Trigger:** a credit accepted during M-03 to M-08. The reveal always plays through its stillness first (see the queued credit rule below).
- **Z2 behaviour:**
  - Z2 plays the previous hit's slow segment once: 2,400 ms, the 600 ms around contact at 0.25x, under the HIT IT scrim, with the SLOW MOTION tab.
  - It then crossfades to the mirrored live camera in 240 ms.
  - A strike at any moment cuts it on the impact frame.
  - The striker always sees their punch on the glass, and nothing waits for it.
- **Everything else:** as M-02.
- **Numerals:** 0.

### M-03 IMPACT, READING, CHARGE, HANG

- **Trigger:** strike sensor contact above the noise floor.
- **Duration:**
  - Impact beat: t 0 to 400.
  - Launch at `L = max(400, reading + 17)`.
  - Rise: physics duration, including 50 ms per mark crossed (at most one hit-stop is drawn per hit; see below).
  - Hang: 240 ms.
- **Exit:**
  - Timer: to M-04.
  - A value below the floor: F-01.
  - No value by 5,000 ms: F-02.
- **t 0:**
  - The canvas jolts in Y only.
  - HIT IT falls out under gravity.
  - The camera frame cuts to black for one frame, then **Z2 and Z4 go to alpha 0**, so the field passes through the eye band. Z3 stays at full opacity, because a code being scanned never disappears.
  - The base strip goes #EB1110.
- **t 120:** today's line draws across x 0 to 1080 at its y (6 px, white 24%), with TODAY sitting on it at x 104.
- **t 200:** each earlier run mark draws as a 4 px white 24% line across x 0 to 1080 at its y. The run's top mark is at white 64%.
  - The lines pass behind Z3's tile and stills.
  - Each line's own still in the Z3 grid gets a 6 px white top edge while its line is drawn.
- **READING hold:**
  - If no value by 400 ms, the base strip pulses #EB1110 to #750808 at a 400 ms period.
  - At 1,500 ms the plate shows READING.
  - A value arriving before 5,000 ms launches immediately.
- **Launch:**
  - The full-bleed #EB1110 field rises from y 3840 behind all content, led by a 16 px white edge.
  - The rail fills in step.
  - Launch speed comes from the score (section 6).
- **Crossing a mark:**
  - 50 ms hit-stop; the line thickens to 10 px.
  - That hit's grid still kicks 8 px up (spring 900/28/1).
  - The line splits at x 540 and its halves fall outward.
  - The charge resumes at **0.8 of its speed**.
  - Only the highest mark crossed gets the hit-stop. Lower marks crossed just break with no stop, and the launch speed accounts for every loss.
- **Top:** if h is 1 or more, the charge collides with the bell edge (section 6) instead of stopping.
- **Apex:** the white notch stamps on the rail, and the charge holds.

| Zone | y | Element | Size | Colour | Copy |
|---|---|---|---|---|---|
| Z0 | 115 to 352 | Ghost cells brighten during the hang | 344 | white 8% to 18% | 000,000 |
| Z1 | 364 to 504 | Empty plate, top edge at rest, bell edge | | ink-900 | none |
| Full bleed | apex to 3840 | Charge field, 16 px edge (28 px at apex) | x 0 to 1080 | #EB1110 | none |
| Today line | 1384 | Line and label | 6 px / Orbitron 700 40 | white 24% / 64% | TODAY |
| Run line | 2180 | Line | 4 px | white 64% (top of the run) | none |
| Z3 | 1808 to 2448 | Run block, unchanged | | | |
| Rail | | Fill to the edge; notch at apex | 56 x 16 | white | none |

- **Numerals:** 0.
- **Figma frame M-03:** the apex, 120 ms after the run line broke. Z2 and Z4 are absent.

### M-04 DROP AND VERDICT

- **Trigger:** the hang ends.
- **Sequence:**

| Beat | Time | Notes |
|---|---|---|
| Fall | from the hang end | 257 ms, from baseline -64 |
| Landing | fall end | Decimals cut in with the integer |
| Plate fill wipe | landing +140 | red states only |
| Label stamp | landing +300 | |
| Stillness | 600 ms after the label settles | or after landing +460 when there is no label |

- **Charge:** stays at its apex through the whole of M-04.
- **Hero timing:** t 1235 to 2552.
- **Exit:** timer, to M-05.

| Zone | y | Element | Size | Colour | Copy |
|---|---|---|---|---|---|
| Z0 | baseline -64 to 352 | Integer falls, squashes, recovers | 344 | #FFFFFF | 402,176 |
| Z1 | baseline 478, x 843 to 1016 | Decimals, cut in on the landing frame, no stamp | 120 | white 64% | .240 |
| Z1 | 364 | Plate top edge flare | 4 to 12 to 4 px | white 40% to #FFFFFF | none |
| Z1 | baseline 478, x 136 | Label stamp | 64 | #FFFFFF | RUN LEADER |
| Full bleed | 1744 to 3840 | Charge held at apex | | #EB1110 | none |
| Today line | 1384 | Held | | white 24% | TODAY |

**Details**
- The comma descends 57 px below the baseline, so it overlaps the plate by 45 px and the digits visibly stand on the plate.
- The label's cap top (y 432) clears the comma tail (y 409) by 23 px.
- **Numerals:** 1.

### M-05 SETTLE (from t 2552 on the hero)

| Beat | Start t | Duration | Easing | Detail |
|---|---|---|---|---|
| Drain | 2552 | 578 ms (fall of 2,096 px) | ease-in quad | Reaches the floor at 3130; base strip splash, then 300 ms decay |
| Lines retract | 2552 | 240 ms | ease-in cubic | Today line and apex edge shrink from the right into the rail. They become the today tick and the notch. |
| New still | 2632 | 160 ms stamp | | Slots into its grid position, scale 1.3 to 1.0, with a 6 px #EB1110 top edge |
| Replay block | 2792 | 320 ms | ease-out cubic | Rises 24 px while fading in |
| Z4 block | 2872 | 320 ms | ease-out cubic | Rises 24 px while fading in |
| Rail gap segment | 2872 | 320 ms | | Fades in, when a target rule names one |

- **Exit:** timer at t 3192, to M-06.
- **Numerals:** 1.

### M-06 RESULT (hero frame: run of two, run leader)

- **Trigger:** settle ends.
- **Duration:** 30,000 ms.
- **Exits:**
  - Credit: to M-02q, same run.
  - Every hit of the run kept: to M-07.
  - Timer: to M-08.

| Zone | y | Element | Size | Colour | Copy |
|---|---|---|---|---|---|
| Z0 | 115 to 352 | Integer | 344 | #FFFFFF | 402,176 |
| Z1 | 364 to 504 | Plate, label, decimals, bell edge | 64 / 120 | ink-900, white, white 64% | RUN LEADER, .240 |
| Z2 | 552 to 1768 | Replay loop, 4,300 ms (see below) | 912 x 1216 | video | none |
| Z2 tab | 576 to 640 | Only during the 0.25x span | Orbitron 700 40 | white on scrim-black-70 | SLOW MOTION |
| Z2 progress | 1760 to 1768 | Red line, with a 4 px white tick at the contact frame | 8 px | #EB1110 | none |
| Z3 headline | baseline 1872, x 104 | Headline | 72 (est. 800) | #FFFFFF | KEEP YOUR HITS |
| Z3 tile | x 104 to 665, y 1880 to 2441 | QR V2-Q, 25 modules x 17 px = 425, quiet zone 68 | 561 x 561 | #000 on #D9D9D9 | encodes HTTPS://PNCH.APP/DXB2KTRBVMHN |
| Z3 stills | x 696 to 1016; rows y 1880 to 2008 and 2024 to 2152 | Up to six 96 x 128 stills, 16 px gaps; run top has a 6 px white top edge, current hit a 6 px red top edge; kept stills at white 16% | 96 x 128 | image | none |
| Z3 copy | baseline 2208 | Line | Inter 600 36 (est. 270) | #FFFFFF | No app needed. |
| Z3 copy | baselines 2254, 2300 | Typed line | Inter 600 36 | white 70% | Or type this / at pnch.app |
| Z3 code | baseline 2441 (level with the tile bottom) | Code | 52, +8% (est. 309) | #FFFFFF | KTR BVM |
| Z4 | baselines 2560, 2672 | Target headline (rules below) | 104 | #FFFFFF | WHO TOPS / THAT? |
| Z4 | baseline 2752 | Payment line and arrow | Inter 700 48 | #FFFFFF | Pay at the reader to take a turn. (691 measured) |
| Z4 | baselines 2828, 2878 | Recording notice | Inter 700 40 | #FFFFFF | Every hit is filmed for its replay. / Replays nobody keeps are deleted. |
| Z6 | 3720 to 3840 | Base strip | | #5E0606 | none |
| Rail | | Red from 3720 to the notch at 1744; the friend's tick at 2180; today tick at 1384 | | | |

**Replay loop (4,300 ms)**
- 1,200 ms of real lead-in.
- The 600 ms around contact at 0.25x (2,400 ms), with contact at the midpoint.
- 700 ms real.
- The replay never opens on the walk-up.

**Replay contact beat**
- On the first loop only, the plate top edge flares to 8 px and the rail notch pulses to 20 px tall, both over 200 ms.
- The integer is locked and never moves.
- The QR never moves.

**Target rules (Z4, first match wins)**

| # | Condition | Headline | Payment line | Gap segment |
|---|---|---|---|---|
| 1 | h is 1 or more, a house record, or top of a run of 2 or more | WHO TOPS / THAT? (est. 638 / 470) | Pay at the reader to take a turn. | none |
| 2 | Run of 2 or more, a higher run mark exists, and the gap is under 834 px (25% of the tower) | BEAT THE / TOP MARK | Pay at the reader to go again. (643 measured) | notch to top mark |
| 3 | Today's line is above, and the gap is under 834 px | REACH / TODAY'S LINE (883 measured) | Pay at the reader to go again. | notch to today tick |
| 4 | This hit is today's new best (plate TODAY'S BEST) | NOW HIT / THE TOP (est. 590 / 560) | Pay at the reader to go again. | notch to bell edge, only if under 834 px |
| 5 | Otherwise | GO / AGAIN | Pay at the reader to go again. | none |

- On coin cabinets, "Pay at the reader" becomes "Add a credit": "Add a credit to go again." (535 measured) and "Add a credit to take a turn."
- The copy names a target that is on the glass, and a gap is drawn only when it is small.
- **Numerals:** 1.

### M-06 variants

**M-06p Plain solo hit (262,400.118)**
- Notch at y 2472. No run lines. Today's line draws during the reveal but is not crossed, so there is no hit-stop.
- Plate ink-900, no label. Z3 grid holds one still.
- Target: rule 5, GO / AGAIN (the gap to today is 1,088 px).
- Timing: apex t 867, landing t 1364, stillness t 1824 to 2424.
- **Numerals:** 1.

**M-06t Hit the top (a hit of 655,300)**
- The charge collides with the bell edge. The plate kicks 26 px up, and both plate edges flare.
- Plate #EB1110 with HIT THE TOP. Target: rule 1.
- **Numerals:** 1.

**M-06r House record**
- As M-06t, and the charge floods the crown to y 0 in 120 ms (ease-out cubic).
- Crown ground #EB1110, plate ink-950 with HOUSE RECORD.
- Timing: collision t 1006, landing t 1623, label t 1923.
- **Numerals:** 1.

**M-06L Linked phone**
- The current hit's still arrives at white 16% (already kept). The QR stays live.
- The copy column lines change for 20,000 ms, then return:
  - Baseline 2208: "Kept by a linked phone." (Inter 600 36, est. 410, **two lines**: "Kept by a" / "linked phone.", baselines 2208 and 2254)
  - Baseline 2300: "Not yours? Scan it." (white 70%)
- The linked phone buzzes once (heavy) on the landing frame.
- **Numerals:** 1.

### M-07 ALL KEPT (the claimed-on-phone acknowledgement)

**Per-hit acknowledgement** (always, inside M-06, M-02, M-02q or M-08)
- When the server confirms a keep, that hit's still fades to white 16% over 300 ms. **Once kept, a face leaves the glass.**
- The line at baseline 2208 becomes "Kept on a phone." for 6,000 ms.
- Confirmation is shown whenever it arrives. The phone retries an unconfirmed keep after 3,000 ms, and the glass never shows a keep it has not confirmed.

**All-kept state**
- **Trigger:** every hit of the run is confirmed kept.
- **Duration:** 6,000 ms.
- **Exit:**
  - Timer: to M-08.
  - Credit: to M-02q, and the run continues with a freshly drawn QR of the same code.
- **Motion:** each QR module drops 300 px under gravity after a random 0 to 200 ms delay and fades over 500 ms. The tile then fills #D9D9D9 and KEPT stamps (160 ms).

| Zone | y | Element | Size | Colour | Copy |
|---|---|---|---|---|---|
| Z3 tile | 1880 to 2441 | Solid tile, centred word | Orbitron 900 104 (336 measured) | #000 on #D9D9D9 | KEPT |
| Z3 copy | baselines 2208, 2254 | Lines | Inter 700 40 | #FFFFFF | Every hit / is kept. |
| Z3 copy | baseline 2300 | Line | Inter 600 36 | white 70% | Code used up. |

- The glass never shows who kept a hit.
- **Numerals:** 1 (the score above).

### M-08 AFTERGLOW (what happens if nobody acts)

- **Trigger:** the Result or All-kept timer ends.
- **Duration:** until the run ends, 60,000 ms after the last landing.
- **Exit:**
  - Credit: to M-02q, same run.
  - Run end: to M-01.
- **Motion and state:**
  - The replay freezes on the contact frame at 30% opacity.
  - The integer, plate, Z3 run block (code live) and Z4 stay.
- **At run end:**
  - The QR modules fall out (as M-07, without KEPT) and Z3 fades (240 ms).
  - The crown crossfades to today's best over 240 ms, with no slam, and the plate label becomes TODAY'S BEST.

**If nobody acts (hero timeline, from landing t 1492)**

| Time after landing | What happens |
|---|---|
| +1,700 ms | Settle complete |
| +31,700 ms | Afterglow |
| +60,000 ms | Run ends; code leaves the glass; Attract |
| +10 min after run end | Code dead (QR and typed) |
| +60 min after run end, counted from the machine's sync of keep status | Unkept replays and stills deleted from the cabinet and cloud |

The score survives only as an anonymous machine statistic.

### M-09 ARMED IDLE (a credit is waiting)

- **Trigger:** 180,000 ms in Armed without a strike.
- **Duration:** until a strike. The credit stays banked.
- **Exit:** a strike goes to M-03.

| Zone | y | Element | Size | Colour | Copy |
|---|---|---|---|---|---|
| Z2 | 552 to 1768 | Camera off; the Attract clip loop at 40% | | video | none |
| Z2 prompt | baseline 1720 | Prompt | 160 | #FFFFFF | HIT IT |
| Z4 | baselines 2560, 2672 | Headline | 104 | #FFFFFF | ONE CREDIT / WAITING (est. 700 / 760) |

**Numerals:** 0.

### F-01 NO READING

- **Trigger:** a value arrives below the noise floor.
- **First time on this credit:** 2,500 ms, then back to M-02 with the credit kept.
- **Second time on the same credit:** scored honestly as 000,000. There is no charge, the integer lands at full white and there is no label, so light taps cannot farm replays.

| Zone | Element | Size | Copy |
|---|---|---|---|
| Z1 | Plate with 8 px #FFAB00 top edge, label | 64 | NO READING |
| Z3 (first hit of a run) or Z4 | Lines, baselines 2560 and 2618 | Inter 700 48 | Your credit is still in. / Hit again when you're ready. |

**Numerals:** 0.

### F-02 SCORE TIMEOUT

- **Trigger:** contact above the floor and no value by 5,000 ms.
- **Behaviour:** same frame and copy as F-01, the credit is kept, and a fault is logged.

### F-03 NO REPLAY (camera fault)

- Z2 becomes ink-950 with a 3 px white 20% outline.
- NO REPLAY / THIS TIME in Orbitron 900 72 at x 136, baselines 1100 and 1180.
- "Your score still counts." in Inter 700 48, baseline 1258.
- The still in Z3 becomes an ink-900 block. Keeping works for the score.

### F-04 OUT OF SERVICE

- The reader is disabled and ghost cells show.
- BACK SOON in Orbitron 900 120 (869 measured) at x 104, baseline 2100.
- "This machine is not taking credits right now." in Inter 600 40 (794 measured), baseline 2170.
- A staff fault word in Orbitron 700 36 at white 30%, baseline 3780.

### F-05 CLOSED

- 30% brightness.
- No demo charge.
- Today's best in the crown.
- Z2 black.

### Offline

- There is no visible state. Every state runs on local data, and the code is minted on the cabinet.
- Unkept replays are held until keep status syncs, for 24 h at most.

### Queued credit rule

- A credit during M-03 or M-04 is accepted and queued.
- The reveal plays through the label stamp and the 600 ms stillness, then transitions to M-02q in 300 ms.

**Impact to Armed, with a reading at or before 383 ms**

| Case | Time |
|---|---|
| House record | about **2,983 ms** |
| Hero | 2,852 ms |
| Plain solo | 2,724 ms |

A later reading adds `reading - 383` ms. These figures are written on the M-00 state diagram.

### Figma frames (1080 x 3840, each labelled with its numeral count)

| Frame | Numerals |
|---|---|
| M-00 Zoning overlay and state diagram (floor heights, decal, head range, sightlines, `MOUNT_TOP`, `PAD_SIDE`) | n/a |
| M-01 Attract | 1 |
| M-02 Armed, first hit | 0 |
| M-02q Armed after a queued credit (replay once) | 0 |
| M-03 Charge at apex with run and today lines | 0 |
| M-04 Landing frame | 1 |
| **M-06 Result, hero run of two** | 1 |
| M-06p Plain solo hit | 1 |
| M-06t Hit the top | 1 |
| M-06r House record | 1 |
| M-06L Linked | 1 |
| M-06k Run of four, two kept | 1 |
| M-07 All kept | 1 |
| M-08 Afterglow | 1 |
| M-09 Armed idle | 0 |
| F-01 No reading | 0 |
| F-03 No replay | 1 |
| F-04 Out of service | 0 |

Build M-00, M-01, M-02, M-03, M-04, M-06, M-06p and M-07 first.

---

## 7. Handoff

### 7.1 Primary path: scan the run code

**Payload**
- `HTTPS://PNCH.APP/DXB2KTRBVMHN`: 29 characters, all uppercase, so alphanumeric mode.
- It fits **Version 2, ECC Q (capacity 29), 25 modules**.

**Size and position**
- 17 px integer modules (6.6 mm) give a 425 px code (166 mm).
- The quiet zone is 68 px (4 modules), so the tile is 561 x 561 px (219 mm).
- By the 10:1 rule it scans from about 0.4 m to **1.7 m**, further with zoom, so friends scan from the decal side without stepping into the swing.
- **Position:** x 104 to 665, **y 1880 to 2441, centre y 2160 = 1.16 m**, on the side away from the pad.
- #000 on qr-ground, square, no anti-aliasing, never animated while live.

**Token**
- `DXB2` is the machine.
- `KTRBVM` is the run code: six letters, and also the typed code.
- `HN` is a 10-minute time stamp: 144 buckets across 24 h, in two letters.
- All eight letters are a keyed HMAC of (machine, run counter, stamp), minted on the cabinet. The server can check both authenticity and expiry for a machine that has not synced.
- **Alphabet:** 16 consonants, **B C D F H J K L M N P R S T X Z**.
  - No vowels, so no words.
  - No digits, so the score stays the only number.
  - No V or W.

**iOS without the app**
- An App Clip card on an Advanced App Clip Experience per machine URL prefix: title "Your run at Dubai Mall", subtitle "Watch it and keep your hit", button "Open".
- The App Clip checks that the device is within 500 m of the venue.

**Android without the app**
- A web claim page under 150 KB at the same URL.

**Anyone can watch; owning takes one tap**
- The claim page opens on the run (P-01). Before a keep, every person in every replay is blurred on device (person segmentation, not face recognition). The score lands on the contact frame.
- "This is my hit" asks for Sign in with Apple or Google once, and then the keeper sees their replay unblurred.

**Upload order**
1. Score and stills (about 80 KB each) within 0.5 s of landing.
2. A 540 x 960 proxy clip within about 3 s.
3. The master.

The page never shows a spinner.

### 7.2 Secondary path: link before the hit

- **Link my next hit here:** in the app, within 50 m, on the Machines tab.
  - The player picks the machine by the name on its cabinet plate.
  - A 600 ms press-and-hold arms it for **exactly one hit or 90 s**. It is re-armed before each hit.
- **On the glass:**
  - The Armed plate shows PHONE LINKED.
  - On landing, the still arrives already kept and the phone buzzes.
- **Override:** the QR stays live with "Not yours? Scan it." for 20,000 ms. A scan plus "This is my hit" within that window moves the hit, with no action needed from the linked owner.
- **Optional NFC sticker** on the cabinet at 1.2 m, pointing at the same link flow. It is a hardware ask, not a dependency.

### 7.3 Fallbacks

1. **Typed code:** "KTR BVM" at pnch.app or in "Enter a code" in the app.
   - The machine is chosen by location or from a list.
   - Limits: 5 tries per device per minute.
   - **Per-machine lockout:** after 30 failed codes in 10 minutes across all clients, the typed path for that machine needs location permission for 30 minutes.
   - A page opened by typing stays blurred until a signed-in keep, like every page.
   - It only works once the machine has synced.
2. **Credit before scanning:** nothing changes. The run code stays in the same place for the whole run, and every hit's still is in the grid.
3. **Machine offline:** the QR still validates.
   - After a keep, the phone says "Kept. Your replay arrives when the machine reconnects, if that is within a day." and sends a push on arrival.
4. **Player left without anything:** the hit is gone. There is deliberately no search by time or place. A friend from the run who scanned can "Keep it for a friend" and send it on.

### 7.4 Expiry and privacy

- **One code per run, one owner per hit.**
  - The code is live from the run's first landing until **10 minutes after the run ends**.
  - Opening the page inside that window holds the run's blurred view on that device for 24 hours.
- **Deletion:** unkept replays and stills are deleted from the cabinet and cloud 60 minutes after the run ends, counted from the machine's sync.
- **First to keep owns a hit.**
  - A second phone sees "Someone already kept this hit." and "Ask for a copy". The owner approves or declines.
  - The real striker can press "This is me" on any clip within 30 days. That hides the clip and opens a transfer review.
- **Keeping for a friend:** "Keep it for a friend" creates a link the keeper sends. The hit is not ranked and sits on no profile until the friend opens the link.
- **Visibility:** kept hits are private by default (Only you). Choices are My group (everyone who kept a hit from the same run), Followers, Everyone. Attract-loop use needs a separate per-clip opt-in and an adult account.
- **Before anything is visible to anyone but the keeper,** every person except the striker is blurred.
- **The glass shows no names, handles or avatars.**
  - Faces appear only in the current replay, the run's 96 x 128 stills (which fade once kept) and opted-in attract clips.
- **Under-16 accounts:** no Everyone posts, no attract use, no machine-page listing, and Friends boards only.
- **No face recognition** anywhere.
- **Integrity:** only kept, unflagged hits rank. Scores flagged by the cabinet (a sensor anomaly, or three top-of-scale readings in 10 minutes) never set today's line, the record or the bell percentile.

### 7.5 Already installed

1. The camera banner takes one tap.
2. The universal link opens P-01 already signed in. A run of one goes straight to P-02.
3. There are two buttons: "This is my hit" and "Just watching".

That is one tap after the banner and no sign-in. A scan alone never keeps anything.

---

## 6. Reveal motion clip

(Section 6 follows the handoff in this document only because it references the Z3 run block. In the file and the notes it stays in its numbered place.)

**Deliverables**
- **Primary submission:** MP4 H.264, **1920 x 1080, 60 fps, 7,000 ms**. The column is at true relative scale (1080 px tall panel, 304 px wide) beside a grey 1.75 m silhouette at the pad and three silhouettes at the decal. A 3x crop of the crown and plate appears on the right from 1,700 to 3,200 ms so one-frame beats read on a laptop.
- **Master:** 1080 x 3840, 60 fps, 7,000 ms, in HEVC Main and in H.264 High Level 5.1 (979,200 of 983,040 MB/s).
- **Preview:** 540 x 1920.

**Rendering**
- Canvas, frame by frame, deterministic, with no audio.
- The replay is a flat grey figure placeholder, and the run stills are grey silhouettes.

**Constants**
- `g = 12,557 px/s²`, one constant for every rise and fall.
- Rise: ease-out quad. Fall: ease-in quad. Both are the exact curves for that constant.
- **Mark cost:** at each mark crossed, speed x 0.8. Launch speed solves `v0² = 2g·d1 + 2g·d2 / 0.64` for one crossing (generalise per mark), so the apex still equals the score's true height.
- For h of 1 or more, the rise is solved for a virtual apex at h 1.04 (y 370), so every top hit strikes the bell edge with speed left.
- Stamp: 160 ms ease-out cubic, scale 1.3 to 1.0.
- Plate spring: stiffness 900, damping 28, mass 1.
- Edge smear: velocity / 120 px.
- **All shakes are Y only.**
- The landing squash holds 2 frames (33 ms).

**Scenario:** hero 402,176.240, run hit 2, the friend's mark at y 2180, today's line at y 1384, not linked. Clip ms = t + 600.

| Clip ms | t | Element | From | To | Easing | Duration | Physical logic |
|---|---|---|---|---|---|---|---|
| 0 | -600 | Armed: live camera placeholder, HIT IT, ghost cells 8%, Z3 run block with one still | | | none | 600 | Stillness is the anticipation |
| 600 | 0 | Whole canvas | translateY 0 | -16 px | ease-out cubic | 50 | The panel answers before the score exists |
| 650 | 50 | Whole canvas | -16 | 0, overshoot +3 | cubic-bezier(0.34,1.56,0.64,1) | 200 | Recoil |
| 600 | 0 | Camera frame, then Z2 and Z4 | live | black for 1 frame, then alpha 0 | cut | 17 | The camera blinks; the eye band clears for the charge |
| 600 | 0 | HIT IT | y 1720 | falls under g, opacity 1 to 0 | ease-in quad | 300 | Knocked loose |
| 600 | 0 | Base strip | #5E0606 | #EB1110 | cut | 17 | Energy enters at the floor |
| 720 | 120 | Today's line and TODAY label, y 1384 | 0 width | x 0 to 1080, 6 px, white 24% | ease-out cubic | 120 | The day's target arms itself |
| 800 | 200 | The friend's run line, y 2180, and a 6 px white top edge on the friend's still | 0 width | x 0 to 1080, 4 px, white 64% | ease-out cubic | 120 | The group's target, tied to a face in the grid |
| 1000 | 400 | **Launch**: charge field and 16 px white edge | y 3840 | toward y 2180, v0 7,668 px/s | ease-out quad | 281 | Waits for the reading and for the striker's eyes |
| 1000 | 400 | Edge smear | 64 px | tied to velocity | | | 180 degree shutter |
| 1281 | 681 | **Hit-stop** at the friend's line (edge at 4,136 px/s) | moving | frozen; line 4 to 10 px; friend's still kicks 8 px up | hold / spring | 50 | The mark resists |
| 1331 | 731 | Line halves | split at x 540 | each rotates 6 degrees outer end down, slides 80 px out, falls under g, fades | ease-in quad | 400 | A broken target |
| 1331 | 731 | Charge resumes at 3,309 px/s (x 0.8) | y 2180 | y 1744 | ease-out quad | 264 | The break cost it a fifth of its speed, and height is still the truth |
| 1595 | 995 | Apex: edge thickens; rail notch stamps | 16 px; scale 1.3 | 28 px; 1.0 | ease-out cubic | 120 / 160 | Velocity zero, smear gone. **The charge holds here.** |
| 1595 | 995 | **Hang**: only ghost cells move | 8% | 18% | linear | 240 | The inhale, the same for every hit |
| 1835 | 1235 | **Integer released** | baseline -64 (fully above glass, comma tail at y -7) | baseline 352 | ease-in quad | 257 | The only object that enters from outside the glass: 416 px under g |
| 1835 | 1235 | Integer stretch | 1.0 / 1.0 | scaleY 1.06, scaleX 0.97 at landing | tied to velocity | 257 | Mass in motion |
| 2092 | 1492 | **Landing** at 3,232 px/s; ghost cells cut to 0; decimals .240 cut in at white 64% | | squash scaleY 0.88, scaleX 1.05, origin on baseline | hold | 33 | Contact |
| 2092 | 1492 | Plate | kick 950 px/s down | +18 px at 41 ms, -7, +3, settled | spring 900/28/1 | 450 | A sprung surface takes the load |
| 2092 | 1492 | Whole canvas, Y only | 0 | +22, -12, +6, -2, 0 at 50 ms keys | linear keys | 200 | The panel moves |
| 2092 | 1492 | Plate top edge | 4 px white 40% | 12 px #FFFFFF, back | ease-out cubic | 200 | The plate flares where it was hit |
| 2125 | 1525 | Digits recover | 0.88 / 1.05 | 1.04 / 0.99 | ease-out quad | 100 | Rebound |
| 2225 | 1625 | Digits settle | 1.04 / 0.99 | 1.0 / 1.0 | ease-in-out sine | 200 | Rest. The number never moves again. |
| 2392 | 1792 | RUN LEADER label stamp; plate kick 180 px/s | scale 1.3, 0% | 1.0, 100% | ease-out cubic / spring | 160 / 300 | The meaning arrives after the fact |
| 2552 | 1952 | **Stillness**: charge held at apex, today line held | | | hold | 600 | Height and number read together, even for eyes that looked up late |
| 3152 | 2552 | **Drain** | y 1744 | y 3840 | ease-in quad | 578 | Released only after it has been read |
| 3152 | 2552 | Today line and apex edge retract into the rail | full width | the today tick and the notch | ease-in cubic | 240 | Marks become the rail |
| 3232 | 2632 | The hero's still slots into grid position 2 | scale 1.3, 0% | 1.0, 100%, 6 px red top edge | ease-out cubic | 160 | The run grows by one face |
| 3730 | 3130 | Charge reaches the floor; base strip | #EB1110 | #5E0606 | ease-out cubic | 300 | The splash |
| 3392 | 2792 | Replay block. **Clip only:** the replay starts at its slow span | y +24, 0% | y 0, 100% | ease-out cubic | 320 | Deliberately quiet |
| 3472 | 2872 | Z4 block: WHO TOPS / THAT? and the payment line | y +24, 0% | y 0, 100% | ease-out cubic | 320 | The call to the group |
| 3512 | 2912 | SLOW MOTION tab | 0% | 100% | linear | 120 | |
| 4592 | 3992 | Contact frame in the replay: plate top edge 8 px, notch 20 px tall; integer locked | rest | flare, back | ease-out cubic | 200 | Ties that punch to that number. First loop only. |
| 5792 | 5192 | Slow span ends, tab fades; 700 ms of real footage | | | linear | 120 / 700 | |
| 6492 | 5892 | Replay holds its last frame; everything settled | | | hold | 508 | |
| 7000 | 6400 | Clip ends on the settled Result | | | | | |

**Why it reads as an event**
- The group watches its own mark resist and break before any digit exists.
- The charge holds at its height while the number falls under the same gravity.
- The landing has consequences: plate, panel, then drain.
- It is the only heavy motion, followed by 600 ms of stillness.

**Variant stills beside the clip (not in the clip)**
- **Plain solo:** apex t 867, no hit-stop, landing t 1364, no label.
- **House record:** launch t 400, hit-stop at today's line t 700 to 750, bell-edge collision t 1006 at 1,834 px/s. The plate kicks 26 px up, the crown floods over 120 ms, hang 240, landing t 1623, label t 1923.

**Phone echo of the same curves**
- The integer falls 120 pt in 180 ms.
- The squash (0.90 / 1.04) holds 2 frames.
- One `.heavy` haptic on landing, the only haptic in the app.

---

## 8. Phone

**Platform**
- iOS, iPhone 16 frame **393 x 852 pt**, designed at 1x.
- Safe areas: top 59, bottom 34. Tab bar 49 + 34. Side margin 20. 4 pt grid.
- Dark only, on ink-950.
- Android gets the web claim page for this exercise.

**Colour roles**
- #EB1110 is you and primary actions; small red text is #F26B6A.
- #D842D3 is only "Beat this" and challenges.
- #00C853 is only for your best going up.
- Text is white at 100% and 64%.

**IA**
- Four tabs: **Hits**, **Machines**, **Boards**, **You**.
- The claim flow (App Clip, web, universal link) sits outside the tabs.
- After install the app opens on You with the current visit expanded. There is no onboarding carousel.

**What changed from the current app**
- `987654.321 Score` in podium colours becomes `987,654` with `.321` on a plate: no unit suffix, one colour.
- Views, likes and comments counters on a card grid become faces and names, with no counts shown to viewers.
- Global / National / Regional pill tabs with a crowned podium and rank-delta arrows become This machine / City / Friends / World text tabs, with one record row and no podium or deltas.
- The Record Holders avatar row folds into the machine page.
- The reel is grouped by visit, not an endless grid.
- The Reels-style right-edge action stack is gone. Reactions live in the plate under the score.

### P-00 App Clip card (system sheet)

- Header: 1800 x 1200 static per machine, the plate on red.
- Title "Your run at Dubai Mall". Subtitle "Watch it and keep your hit". Button "Open".

### P-01 Run claim (App Clip, web, or app via universal link)

**Purpose:** show the whole run and let each person find their own hit.

**Layout, top to bottom**
- **Nav** y 59 to 103: "Dubai Mall, Level 2" Inter 600 17 at x 20; "Not now" Inter 600 15 right-aligned at x 373.
- **Title:** "Which hit is yours?" Inter 700 28, baseline 148.
- **Body:** "Everyone stays blurred until they keep their own hit." Inter 400 15 at 64%, baseline 172.
- **Run grid:**
  - From y 196: tiles 112 x 149 (3:4) with 8 pt gaps, three per row, in run order. Each tile is the blurred impact still.
  - Score in Saira 32 at x +8, baseline +141, with a bottom scrim black 0% to 70%.
  - A kept hit shows a 24 pt ink-950 bar with "Kept" Inter 600 13.
- **Footer** at baseline 780: "Just now" Inter 400 13 at 64%.

**Tap a tile:** P-02.

**Craft detail:** the score is how people recognise their own hit, so the picker needs no names and no faces.

### P-02 Your hit (before and after keeping)

**Purpose:** let the striker see the hit land, then keep it in one tap.

**Before keep, top to bottom**
- **Replay** y 0 to 524 (393 x 524), muted, everyone blurred.
  - It starts 1,200 ms before contact.
  - Top scrim y 0 to 100 at black 40%; "Back" Inter 600 15 at x 20, baseline 82.
- **Integer** "402,176" Saira 128 from x 20, baseline 516. It drops on the replay's contact frame with the phone echo curve and the heavy haptic.
- **Plate** y 524 to 580, full bleed, #1C1817 or #EB1110.
  - 2 pt top edge, white 40%.
  - Label Orbitron 900 15 at x 20, baseline 560.
  - ".240" Saira 40 at white 64%, right-aligned at x 373.
- **Place and time:** "Dubai Mall, Level 2" Inter 600 17, baseline 612. "Just now" Inter 400 15 at 64%, baseline 636.
- **Primary button:** "This is my hit", 353 x 52 at y 660, #EB1110, radius 12, Inter 700 17. It opens the Sign in with Apple sheet if the viewer is not signed in.
- **Secondary button:** "Keep it for a friend", 353 x 48 at y 724, 1.5 pt white 40% outline.
- **Text button:** "Just watching", Inter 600 15, baseline 806.

**After keep (same frame, replay unblurred for the keeper)**
- "Kept." Inter 700 34, baseline 632.
- "Only you can see it for now." Inter 400 15, baseline 656.
- **Primary button:** "Share with my group", 353 x 52 at y 676.
- **Helper text:** "Only people who kept a hit from this run can see it." Inter 400 13 at 64%, baseline 746.
- **Secondary button:** "Save the video", 353 x 48 at y 760.
  - It renders a 1080 x 1920, 7 s share cut: the landing burned in, everyone but the striker blurred, end card "DUBAI MALL, LEVEL 2" and "pnch.app/dubai-mall-2".
  - It never carries the code.
- SKOverlay "Get PunchApp" after 2,000 ms, App Clip and web only.

**Keep it for a friend (sheet)**
- "Keep it for a friend" Inter 700 22.
- "Send this link to them. The hit lands on their profile when they open it."
- "Send link" (share sheet) and "Cancel".

**States (same frame)**
- **Kept by someone else:** blurred still, "Someone already kept this hit.", "Ask for a copy" (outline 353 x 52).
- **Expired:** "This code has run out." and "Replays nobody keeps are deleted within the hour."
- **Too far away (App Clip):** "Open this at the machine." and "Codes only work near the machine they came from."
- **Machine offline:** score and plate shown, replay area ink-900, "Your replay is on its way from the machine."

**Craft detail:** the number lands on the replay's own contact frame, so the phone repeats the glass beat at hand scale, with the only haptic in the product.

### P-03 You (profile and reel)

**Purpose:** your best, then your visits.

**Layout, top to bottom**
- **Nav** y 59 to 103: "@rami.k" Inter 700 17 at x 20; 32 pt avatar right-aligned at x 373.
- **Home line:** "Home machine: Dubai Mall, Level 2" Inter 400 15 at 64%, baseline 128.
- **Crew suggestion** (only when true), y 144 to 188: "You've played in three runs with Sara. Add her to your crew?" Inter 400 15, with an "Add" text button in #F26B6A.
- **Reel, grouped by visit:**
  - Header "Saturday night at Dubai Mall" Inter 600 17, then "Three hits" Inter 400 15 at 64%.
  - The visit's best hit as a 353 x 470 tile with bottom scrim: score Saira 56 at x 36, plate label if special.
  - **If this is your all-time best,** the tile carries "YOUR BEST" Orbitron 900 13 in #F26B6A above the score, and **no separate best block exists**.
  - If your best is in an older visit, a single 72 pt row sits above the reel: "YOUR BEST", score Saira 32, "Dubai Mall, in August".
  - The visit's other hits as 72 pt rows:
    - thumbnail 48 x 64
    - score Saira 32
    - plate label if any, Orbitron 900 13
    - a stack of reactor faces, 24 pt, overlapping by 8, right-aligned
    - no clock times, because row order gives sequence
- **Older visits:** visits older than 30 days collapse to one row, "August, six visits".
- Document the full reel in a 393 x 2000 scroll frame.

**Craft detail:** the rhythm comes from content (one big tile, small rows), and the reel's unit (a visit) matches how people play.

### P-04 Hit detail and reactions

**Purpose:** the clip, its facts, and how people answer it.

**Layout, top to bottom**
- **Video** 393 x 699 (9:16), y 0 to 699. The integer drops at contact, 104 pt, baseline 690.
- **Plate** y 699 to 747: label, ".240" Saira 40 at 64%.
- **Facts:** "Dubai Mall, Level 2" Inter 600 15, baseline 771. "Saturday 12 September, 21:14" Inter 400 13 at 64%, baseline 791. This is the only place an exact time appears.
- **Visibility control**, top right over a 40% scrim: "Only you" Inter 600 15 with a chevron. It opens a sheet with Only you / My group / Followers / Everyone and the note "Everyone includes people who play this machine."
- **Reactions:**
  - **Felt that:** press and hold anywhere on the video for 400 ms. The card shakes 6 pt Y only over 240 ms. **No haptic.**
  - **Beat this:** text action Inter 600 15 in #D842D3, right-aligned at x 373 on a row at baseline 823.
- **Social proof** at baseline 823, left: 24 pt faces with "Sara and Omar felt it." There are no counts. The owner taps it for a list of names.
- **Beat this sheet:** "Beat Sara's hit" / "Her score becomes a mark on your rail at the next machine you link. It lasts a week." / "Take it on" / "Not now".
- **"This is me"** sits in the overflow menu for clips of you kept by someone else.

**Craft detail:** a challenge is the reply to a hit. It travels back to the glass as a magenta tick, and there are no comments in v1.

### P-05 Hits feed

**Purpose:** watch the people you play with, then the machines you play at.

**Layout, top to bottom**
- **Text tabs** at baseline 96: "My people" / "Near you", Inter 600 17. The active tab has a 2 pt #EB1110 underline. No pills.
- **Place headers** (the editorial moment), one per machine and evening: "Tonight at Dubai Mall" Inter 700 28, left-aligned, then "Sara, Omar and Rami played" Inter 400 15 at 64%.
- **Cards:** one column of 353 x 470 clips (3:4), 24 pt gaps.
  - The best clip of a place group is full width.
  - Following clips alternate as full width and as a pair of 172 x 229 clips, so the column never becomes a uniform grid.
- **Card plate** (48 pt): score Saira 40 (Saira 28 on pair cards) at x 20; label; "Beat this" #D842D3 right-aligned at x 373 in place of the decimals.
- Each clip autoplays muted when 60% visible, and its number drops on its contact frame.

**Rules**
- "My people" = mutual follows plus My group.
- "Near you" = Everyone clips from machines you have played, then your city.
- Bystanders are blurred. Under-16 accounts are never shown in Near you.
- Report and Block live in the overflow.

**Craft detail:** the feed is grouped by place and evening, the way people remember a night out, and each clip is a small reveal.

### P-06 Boards

**Purpose:** the only surface with ranks.

**Layout, top to bottom**
- **Scope tabs** (text, baseline 96): This machine / City / Friends / World, Inter 600 15.
- **Period toggles** (baseline 124): This week / All time, Inter 400 13. The week resets Monday 06:00 local.
- **Record row** (the one editorial moment): 84 x 112 muted replay thumbnail of the holder's kept clip; handle Inter 700 17; "House record" Inter 400 13; score Saira 44 right-aligned at x 373.
  - If the record was never kept: ink-900 thumbnail, "Not kept" Inter 600 17, same score. **No face.**
- **Rows**, 60 pt each:
  - rank Inter 600 15, tabular, white 64%, right-aligned in a 32 pt column
  - avatar 36
  - handle Inter 600 17
  - home machine Inter 400 13
  - score Saira 28 right-aligned at x 373, decimals Saira 14 at 64%
- **Your row** is sticky above the tab bar, with a 4 pt #EB1110 left bar.
- No podium, no deltas, no arrows.

**Craft detail:** decimals exist only here, where ties happen, and the default scope is the machine you last played.

### P-07 Machine page (venue and crews)

**Purpose:** make a cabinet a place with your people in it.

**Layout, top to bottom**
- **Header:** "Dubai Mall, Level 2" Inter 700 28, baseline 100. "By the VR Park entrance. Open until midnight." Inter 400 15, baseline 124.
- **The tower**, y 160 to 600: a 12 pt rail at x 20 to 32 on the cabinet's scale.
  - The top is a 4 pt white bar labelled "The top" (no face).
  - Marks at true heights with rows to the right:
    - house record holder (or "Not kept")
    - "Today's line"
    - your red notch ("You")
    - friends' magenta challenge ticks
  - Rows closer than 44 pt are pushed apart, with 1 pt leader lines back to their true heights.
- **"On this machine tonight":** posted Everyone clips. The best tile is 353 wide, the rest 172 x 229, staggered.
- **"Your people here":** 44 pt faces of mutual follows who have kept a hit here, shown only 7 days after that visit. No counts.
- **"Crews that call this home":** crews whose members opted in to show their crew here; crew name Inter 600 17, members' faces, "Last together: last week" (7-day delay).
- **Sticky button**, 353 x 56 at the bottom: "Link my next hit here". Enabled within 50 m; otherwise "Get directions".
- **Link sheet:** "Link your next hit" / "Your next hit at this machine goes straight to your profile. The screen shows PHONE LINKED." / press-and-hold button "Hold to link" / "Ends after one hit or a minute and a half." Confirmation: "Linked at Dubai Mall, Level 2. Hit when ready."
- **Notifications**, one a day at most, never at night:
  - "Sara has a new hit at Dubai Mall."
  - "Omar wants you to beat his hit at Dubai Mall."
  - "Your replay from Saturday is ready to post."

**Craft detail:** the tower uses the glass's own scale, with the plate as the top, so a player recognises their notch as the one they saw on the cabinet.

---

## 9. Competition placement

| Surface | What "best" means | Why |
|---|---|---|
| Glass, during play | Height only: the top (95th percentile), today's line, and the run's marks tied to its stills | The group can act on "here, today, us". No names, ranks or second number, and the top is reachable by one hit in twenty. |
| Glass, house record | A crown flood, as an event, with no name | Rare and public; it never becomes the scale that makes a median hit look small |
| Glass, attract | Today's best score, with no name | Teaches the target before anyone pays |
| Phone, Machines | The same tower with faces for record, today, you and friends | The pull of a place lives here |
| Phone, Boards | Ranks by scope (This machine by default) and period (This week by default) | Private, revisited, where ties matter; the weekly reset keeps it winnable |
| Phone, feed | No ranking | Ranks in the feed turn every clip into a scoreboard |
| Phone to glass | "Beat this" puts a friend's mark on your rail at the next linked machine | Turns phone rivalry into a credit |

**Integrity:** only kept, unflagged hits rank. A City board includes only machines within calibration tolerance of each other.

---

## 10. Brand changes (in the form the notes will use)

1. **Kept #EB1110 as the one energy colour** (the strike, the charge, you). It is 4.37:1 on the dark ground, so it is never text under 72 px on the machine; small red text uses #F26B6A.
2. **Split `--font-sans` from `--font-display`.**
   - Orbitron sets short caps words only.
   - Inter (static) sets sentences and the phone. The company already ships Inter, Orbitron's squared lowercase tires the eye at 36 to 48 px, and Orbitron has no Arabic or Cyrillic.
   - Fonts are bundled on the cabinet.
3. **Added `--font-score`.**
   - Saira Extra Condensed Black in fixed 0.402 em cells for the prototype; commission 12 PunchApp Numerals on Orbitron's construction.
   - The same 912 px buys 1.9x Orbitron's cap height (92.6 mm against 49 mm), and the number never reflows.
4. **Kept the comma** as the thousands separator in its own cell. The digits stand on it, and the phone formats by locale.
5. **Decimals demoted:** white 64%, never animated. Three decimals are likely false precision, and they matter only for ties on boards.
6. **Added a dark ground,** ink-950 #0B0908 and ink-900 #1C1817, because neutrals-900 reads grey in mall daylight.
7. **Fixed duplicates:** primary-800 becomes #750808, and neutrals-400 becomes #C4B5B0.
8. **Deleted the supportive red set,** because #D50000 is 1.21:1 against brand red. Faults use yellow #FFAB00 plus words.
9. **Gave magenta one job,** challenges from other people. Green is phone only, for your own best going up.
10. **Deleted Secondary BG.** Renamed Main BG to overlay-white with role steps 08 / 16 / 24 / 40 / 64 / 70 / 85. Added scrim-black 40 / 70.
11. **Added surface tokens for the physical story:** plate-edge-rest, plate-edge-hit, bell-edge.
12. **Added QR tokens:** #000 on qr-ground #D9D9D9, adjustable per venue from 70% to 100%, 17 px integer modules, never brand-tinted.
13. **Added the missing scales:**
    - Machine type by distance: 344 to 36 px, with a 36 px floor.
    - The phone ramp.
    - Geometry tokens: `MOUNT_TOP`, `PAD_SIDE`, `READER_Y`, the measure x 104 to 1016, the rail x 16 to 64, the zones.
    - Motion tokens: `gravity 12557 px/s²`, `launch max(400ms, reading+17ms)`, `mark-cost 0.8`, `hitstop 50ms`, `hang 240ms`, `stamp 160ms ease-out-cubic`, `stillness 600ms`, `settle 320ms ease-out-cubic stagger 80ms`, `spring-plate 900/28/1`.
    - Radius: 0 on the machine, 12 on phone buttons.

---

## 11. Attention-to-detail checklist (the builder must include every item)

**Figma file**
- [ ] Frames exactly 1080 x 3840 and 393 x 852. Layers named by zone (`Z0 Crown / integer / cell-1`). Zones as a locked overlay.
- [ ] Every machine frame labelled with its numeral count. Frame ids match state ids.
- [ ] M-00 carries floor heights, the queue decal, head range 1.60 to 1.90 m, eye range 1.45 to 1.70 m, corrected angles, `MOUNT_TOP`, `PAD_SIDE`, and the state diagram with impact-to-Armed figures.
- [ ] Every "est." width verified in Figma. An overflowing string is rewritten, never shrunk.

**The number**
- [ ] Six 138 px cells plus an 84 px comma cell, digits centred, ghost cells at 8%.
- [ ] Comma overlaps the plate by 45 px. Label cap top clears the comma tail by 23 px. Label and decimals share baseline 478.
- [ ] Decimals at white 64%, cut in on the landing frame, never stamped.
- [ ] The integer lands once and never moves again, including during the replay contact beat.

**Motion**
- [ ] One gravity constant. Launch waits for max(400 ms, reading + 17 ms).
- [ ] Every crossed mark costs 0.8 of speed, and v0 is solved so the apex is the true height. A single 50 ms hit-stop, on the highest mark crossed.
- [ ] Linear height mapping, never curved. Hits with h of 1 or more always strike the bell edge.
- [ ] Charge held at apex through landing and stillness. Drain after.
- [ ] Z2 and Z4 at alpha 0 from the camera blink until settle. Z3 never hides once a run has a code.
- [ ] All shakes Y only. Squash holds 2 frames. No full-field flash.
- [ ] Plate top edge visible in every state (4 px white 40%), flaring to 12 px on landing.

**Replay**
- [ ] Live camera mirrored in Armed; recording unmirrored.
- [ ] A queued credit plays the previous slow segment once in M-02q, cut by any strike.
- [ ] SLOW MOTION tab only while slowed. The replay opens 1,200 ms before contact.

**Run and code**
- [ ] One QR per run, V2-Q, 17 px modules, 68 px quiet zone, #000 on #D9D9D9, centre at 1.16 m, on the side away from the pad, static while live.
- [ ] Stills grid in run order, top of run with a white edge, current hit with a red edge. Kept stills fade to 16%.
- [ ] Keep acknowledgement only after server confirmation, whenever it arrives.
- [ ] Code letters from 16 consonants. The typed code baseline sits level with the tile bottom (2441).

**Queue, credits, operations**
- [ ] Credits in Armed are banked and never counted on the glass. Armed idle at 180 s turns the camera off.
- [ ] First sub-floor value keeps the credit; the second scores 000,000. No value by 5,000 ms keeps the credit.
- [ ] TODAY'S BEST only when a line already existed and h is 0.5 or more.
- [ ] Today resets at 04:00 local. The bell is the 30-day 95th percentile, unflagged only.
- [ ] Layout orbit between runs only. 30% brightness after closing. Charge opacity and QR ground are venue settings.

**Copy and privacy**
- [ ] Recording notice in Z4 beside the payment line at Inter 700 40 white, plus the printed cabinet sign.
- [ ] No names, handles, ranks or deltas on the glass. Words for counts everywhere except the score.
- [ ] No em or en dashes anywhere, including layer names and the notes.
- [ ] Machine copy never says "tap" or "swipe".

**Phone**
- [ ] Scanning never keeps. "This is my hit" and "Just watching" on every entry.
- [ ] Everyone blurred before a keep. Only the striker unblurred in anything shared.
- [ ] One haptic in the app, on landing. Felt that is visual only.
- [ ] No counts shown to viewers. No clock times outside hit detail.
- [ ] No duplicate score on You. No "Also here that evening". No strangers' names on machine pages. Machine associations delayed 7 days.
- [ ] Share renders never carry the code.

---

## 12. Notes (half-page draft; the candidate must edit every bracket to be true)

**Decisions.**
- **Height as the verdict.** I treated the panel as a 1.5 m column watched from two distances. Height does the ranking, so the score is the only number on the glass.
- **A reachable top.** The top of the tower is the level one hit in twenty reaches on this machine, drawn as the underside of the plate the number lands on, so a median hit climbs visibly.
- **The reveal.** The charge breaks through today's line and the marks your friends just made, and each break costs it speed. It holds at its height while the integer falls under the same gravity and lands on the plate.
- **The run as the unit.** Groups play in runs, so the handoff belongs to the run. One code stays put at chest height on the side away from the pad while friends take turns. Anyone can scan and watch with everyone blurred, and each person keeps their own hit with one tap.
- **Linking.** App players can link one hit before they strike.
- **Type.** Three roles: Orbitron for short words, Inter for sentences, and a condensed numeral in fixed cells for the score, because in the same width it is 1.9x Orbitron's cap height.
- **Colour.** I kept the red, deleted the second red, gave magenta one job, and added a dark ground, surface and motion tokens.

**Validate.**
- Do groups at the queue decal read who beat whom from the breaking line and the stills?
- Scan success at 17 px modules at 1.7 m, in glare and dim venues, at 70%, 85% and 100% ground.
- Does the striker look up in time for the landing at 1.5 s?
- Do people pick their own hit correctly from blurred stills?
- Is the 95th percentile the right top once real distributions exist?
- Does GO AGAIN after a weak hit feel neutral to children?

**Push back.**
- Touch was left unfilled; I designed for none.
- 1080 x 3840 at 1.5 m is 0.42 m wide, not 0.5, and mounting height moves every band.
- Three decimals are likely false precision.
- "One attempt and a walk-away" measures the wrong unit. I would track kept hits per run and credits per group.
- I need sensor latency under 120 ms, a camera beside the pad rather than above it, and a play limit, if one is wanted, enforced at the reader for everyone.

**AI use.** [EDIT: for example, "I used Claude to interrogate the brief, generate five directions, run adversarial reviews, and script font and QR measurements. I chose the direction, rewrote the copy, rechecked every width and timing in Figma, and changed X and Y by hand after Z."]

---

## 13. Copy bank (final wording)

### Machine

**Plate labels (Orbitron 900 64)**
- HOUSE RECORD
- HIT THE TOP
- TODAY'S BEST
- RUN LEADER
- PHONE LINKED
- READING
- NO READING
- NOBODY YET

**Reveal (Orbitron 700 40):** TODAY

**Attract**
- HIT IT
- TO THE TOP
- One credit. One hit.
- Pay at the reader to play.
- Every hit is filmed for its replay.
- Replays nobody keeps are deleted.

**Cabinet signs (printed)**
- Camera in use
- Next up waits here

**Armed**
- YOU'RE ON CAMERA
- HIT IT
- STILL YOURS

**Armed idle**
- ONE CREDIT
- WAITING

**Replay tab:** SLOW MOTION

**Run block**
- KEEP YOUR HITS
- No app needed.
- Or type this
- at pnch.app
- (code) KTR BVM

**Keep acknowledgements**
- Kept on a phone.
- Kept by a
- linked phone.
- Not yours? Scan it.

**All kept**
- KEPT
- Every hit
- is kept.
- Code used up.

**Z4 headlines (Orbitron 900 104)**
- WHO TOPS / THAT?
- BEAT THE / TOP MARK
- REACH / TODAY'S LINE
- NOW HIT / THE TOP
- GO / AGAIN

**Payment lines**
- Pay at the reader to take a turn.
- Pay at the reader to go again.
- Add a credit to take a turn.
- Add a credit to go again.

**Faults**
- Your credit is still in.
- Hit again when you're ready.
- NO REPLAY
- THIS TIME
- Your score still counts.
- BACK SOON
- This machine is not taking credits right now.

### Phone: claim flow

**App Clip card**
- Your run at Dubai Mall
- Watch it and keep your hit
- Open

**Run claim**
- Dubai Mall, Level 2
- Not now
- Which hit is yours?
- Everyone stays blurred until they keep their own hit.
- Kept
- Just now

**Your hit**
- Back
- This is my hit
- Keep it for a friend
- Just watching
- Sign in with Apple
- Use email instead

**Kept**
- Kept.
- Only you can see it for now.
- Share with my group
- Only people who kept a hit from this run can see it.
- Save the video
- Get PunchApp

**Keep for a friend**
- Keep it for a friend
- Send this link to them. The hit lands on their profile when they open it.
- Send link
- Cancel

**Claim states**
- Someone already kept this hit.
- Ask for a copy
- This code has run out.
- Replays nobody keeps are deleted within the hour.
- Open this at the machine.
- Codes only work near the machine they came from.
- Your replay is on its way from the machine.
- Kept. Your replay arrives when the machine reconnects, if that is within a day.

**Copy request (to owner)**
- Someone who was there asked for a copy of your hit.
- Send a copy
- Not this time

**Share end card**
- DUBAI MALL, LEVEL 2
- pnch.app/dubai-mall-2

### Phone: app

**Tabs:** Hits · Machines · Boards · You

**You**
- Home machine: Dubai Mall, Level 2
- You've played in three runs with Sara. Add her to your crew?
- Add
- Saturday night at Dubai Mall
- Three hits
- YOUR BEST
- Dubai Mall, in August
- August, six visits

**Hit detail**
- Saturday 12 September, 21:14
- Only you
- My group
- Followers
- Everyone
- Everyone includes people who play this machine.
- Beat this
- Sara and Omar felt it.
- Beat Sara's hit
- Her score becomes a mark on your rail at the next machine you link. It lasts a week.
- Take it on
- Not now
- This is me

**Feed**
- My people
- Near you
- Tonight at Dubai Mall
- Sara, Omar and Rami played
- Beat this
- Report
- Block

**Boards**
- This machine
- City
- Friends
- World
- This week
- All time
- House record
- Not kept

**Machine page**
- By the VR Park entrance. Open until midnight.
- The top
- Today's line
- You
- On this machine tonight
- Your people here
- Crews that call this home
- Last together: last week
- Link my next hit here
- Get directions

**Link sheet**
- Link your next hit
- Your next hit at this machine goes straight to your profile. The screen shows PHONE LINKED.
- Hold to link
- Ends after one hit or a minute and a half.
- Linked at Dubai Mall, Level 2. Hit when ready.

**Enter a code**
- Enter a code
- Which machine?
- Six letters from the screen.

**Notifications**
- Sara has a new hit at Dubai Mall.
- Omar wants you to beat his hit at Dubai Mall.
- Your replay from Saturday is ready to post.

**Copy check:** no string above contains an em dash or an en dash, and ranges in this document are written with "to".

# Open questions

## Where I overruled or only partly took a skeptic's fix

- **Scale anchor.** Skeptic 2 wanted max(today, 7-day 75th percentile) and Skeptic 3 wanted the 30-day 98th percentile. I chose the **30-day 95th percentile**, drawn as the plate underside.
  - Today-anchored scales move every morning, and the tower would mean something different at 10:00 and 22:00.
  - The 98th percentile still leaves the median low.
  - Revisit once real distributions exist.
- **Full-width run lines with stills pinned in Result (Skeptic 2).**
  - **Partly rejected.** Marks at median heights fall inside Z2 and Z3, so lines across the QR tile and the replay are not buildable.
  - The lines show only during the reveal, when Z2 and Z4 are hidden. The link to a person comes from the matching still in the Z3 grid flashing and kicking at the hit-stop.
- **Group call in the plate above heads (Skeptic 2).**
  - **Rejected.** The plate names what happened, and Z4 says what to do next.
  - The directly-behind position is no longer designed for, and the queue decal makes Z4 visible.
- **Collapse the QR as soon as a credit arrives (Skeptic 2).**
  - **Rejected** in favour of the run code, which must survive credits.
  - The strike-zone risk is handled instead: the tile is on the side away from the pad, and 17 px modules scan from about 1.7 m.
- **Bell glyph (Skeptic 2).** Rejected. The bell is the plate underside, and headlines were rewritten to name "THE TOP", which is visible and less tied to an Anglo fairground idiom.
- **V3 QR with a minute stamp (Skeptic 1).** Replaced by a 2-letter 10-minute stamp, which keeps V2-Q at 29 characters.
- **Wellbeing cap on the sixth credit (Skeptic 2).** Rejected, and the glass cap was removed entirely (Skeptic 3). A run still maxes at 6 hits because the code needs a bound. Whether operators want a limit at the reader, and at what value, is open.
- **Claimable only while on the glass plus 120 s (Skeptic 1).** Relaxed to 10 minutes after the run ends. The blur-until-keep rule and the per-machine typed-code lockout carry the privacy load.

## Unresolved

- **Font widths.** Every "est." width was estimated because the font files were not available when this revision was written. The riskiest strings:
  - KEEP YOUR HITS at 72 px, est. 800 of 912
  - HIT THE TOP at 64 px, est. 590 of 707
  - ONE CREDIT / WAITING at 104 px
  - "Kept by a / linked phone." in a 320 px column
- **Mounting and hardware.**
  - Glass bottom and top edges, pad side, reader height.
  - Whether the side-bezel camera at 1.45 m is possible.
  - Whether the panel is one 9:32 LCD or two stacked panels with a seam near y 1920, which would cut the QR tile.
- **Touch and extra outputs.** Touch was left unfilled in the brief; the spec designs for none. Is there a physical button or a light strip?
- **Pixel geometry.** Are the pixels square? If the 0.5 m is glass width, glyphs are 18% wider and every width must be rechecked.
- **Sensor.** Real latency (the spec asks for 120 ms and absorbs up to 383 ms), resolution, the noise floor, and the score distribution the percentile depends on.
- **Queue decal.** Is a floor decal allowed in each venue? Without it, Z4 is hidden from people standing directly behind.
- **Strangers in a run.** A stranger crediting within 60 s joins a group's run, sees its stills and could tap "This is my hit" on someone else's hit. Mitigations are blur until keep and "This is me" disputes. Field test, and decide whether a run should also need the same payment card or a gap of under 20 s.
- **Person blur on device.** App Clip size limit and web performance for segmentation on a mid-range Android phone. If it is too heavy, fall back to a blurred still plus the score before keep.
- **Legal.** Retention (60 min after sync, 24 h maximum when offline) and recording consent per market (GDPR, UAE PDPL, minors). Are 96 x 128 stills of a group on the glass acceptable?
- **Android web claim.** It has no location check. Accept the risk, or require location on web?
- **Payment.** Coin, card or app tokens? Can the app pay? Are bundles possible at the reader?
- **Separator.** The comma was kept. Confirm locales and whether Arabic UI is in scope.
- **Brand owner.** Will they accept a separate numeral face and fund the commission? The fallback is Orbitron 900 in fixed cells at 174 px, with the same choreography. Are Poppins and the magenta secondary being retired?
- **Deliverable format.** The 1920 x 1080 cut is proposed as the primary clip, with the 1080 x 3840 master attached. Confirm the panel accepts this, and that seven phone frames plus the App Clip card is the right depth.
- **Notes.** The AI-use paragraph is a placeholder and must be rewritten truthfully.