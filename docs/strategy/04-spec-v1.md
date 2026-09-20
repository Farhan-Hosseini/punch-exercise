# PunchApp "Ring the Bell". Build specification

Everything below is final unless it appears in open questions. Units: machine in px on the 1080 x 3840 canvas, y measured from the top. Phone in pt on a 393 x 852 frame. Times in ms. Copy strings are final and contain no em or en dashes. Widths marked "measured" come from fontTools advance sums of the real font files (Orbitron 900/700 static, Inter variable at opsz 32, Saira Extra Condensed Black), without kerning. Allow 2% for kerning when you build.

Source judgement: Proposal 1 (Ring the Bell, charge plus a dropped integer on a crown plate) is the base. Grafts come from Proposals 2, 3, 4, 5, The Tower and Pocket the Punch. 01-proposal-2.md is a word-for-word duplicate of Proposal 3 and was scored once.

---

## 1. Concept

**The concept.** The cabinet is a 1.5 m column, so it works like a fairground high striker. Every hit sends a red charge up the glass, exactly as high as the hit deserves against the best hit this machine has seen in 30 days. That best hit is the bell: a white mark at the top of a rail on the right edge. Height gives the verdict first, so the whole room reads it before any digit exists. After a 240 ms hang, the integer falls from above the glass onto a plate at the top of the column. It lands hard enough to flex the plate, jolt the panel and knock the charge back down. The number lands once, in its final place, and never moves or resizes again. Everything after the landing is quiet and sits lower: a near life-size replay at eye height, a QR at chest height, and a single named target for the next credit beside the reader. The glass never shows a name, a rank or a second number. The phone holds identity, history and rivalry, all tied to physical machines.

**The three interview sentences.**
1. "The screen is 1.5 metres tall, so I let height do the ranking: the charge tells the whole room how good the hit was before anyone reads a digit, and the score stays the only number on the glass."
2. "The number falls from outside the glass under half of real gravity at the panel's true scale, so the weight is physics, not a tween, and a near miss never gets extra drama."
3. "The handoff is a chest-height code that survives the next credit, works offline, expires in a quarter of an hour, and belongs to whoever keeps it first. Players who already have the app link before they hit and never scan at all."

---

## 2. Physical model of the screen

### 2.1 Assumptions (all driven by one constant)

- The brief's panel is inconsistent: 1080 x 3840 is 9:32, so 1.5 m of active height is 0.42 m wide. **Assumption:** 1.5 m active height with square pixels, so 3840 / 1500 mm = **2.56 px per mm (0.39 mm per px)**. The 0.5 m figure is the cabinet including bezel.
- **Mounting:** `MOUNT_TOP = 2.00 m` (glass top) and bottom edge at 0.50 m. Floor height of any canvas y = `MOUNT_TOP - y / 2560` m. **Every zone below is expressed against this constant.** The Figma zoning frame carries a note: "Change MOUNT_TOP and every band moves by the same offset."
- The pad is beside or below the panel and does not cover the glass. The camera sits in the top bezel and records portrait. The payment reader is on the cabinet at `READER_Y` (default canvas-equivalent y 2600, 0.98 m). The go-again arrow points at it.
- **No touch** is the base case. Every state ends on a timer, a credit, a strike or a server event. If touch exists, the only enhancement is a tap on the replay (y 552 to 1768) to restart it from the contact frame. Nothing depends on audio.

### 2.2 Viewers and sightlines

| Viewer | Position | What they see |
|---|---|---|
| Player at the pad | 0.6 to 1.0 m from glass, eye 1.55 m | Crown is 17 to 20 degrees up. Claim tile centre is 19 degrees down at 1.0 m. |
| Player stepped back | 1.5 m, eye 1.55 m | Nearly the whole panel. Crown cap centre (1.91 m) is 13.5 degrees up. **The reveal is designed for this position.** |
| Spectator directly behind the player | 3.5 to 4.5 m, eye 1.60 m, player head top 1.75 m at 1.25 m | The sightline over the head meets the glass at 1.83 m (y 427) from 3.5 m and 1.81 m (y 492) from 4.5 m. **Only the crown clears the player's head.** |
| Spectator offset to the side | 3 to 4.5 m | The whole panel, like a poster (13 degrees tall). |
| Child (eye 1.1 m) or wheelchair user (eye 1.2 m) | 1.5 m | Crown is 25 to 28 degrees up: fine for a 3 s event, not for reading. So nothing that has to be *read* lives in the crown except the score itself. |

**Consequence, and the notes argument:** a weak hit's charge peaks low, behind the player's own body from the queue's viewpoint. Only strong hits climb above heads. Kindness and reward come from the same geometry. The number itself always lands in the crown, visible to all, with no verdict word attached to a weak hit.

### 2.3 Fixed zones (identical y ranges in every state)

Content measure: **x 64 to 976 (912 px)**. Rail: **x 1028 to 1060**. Nothing is centred except the word KEPT inside its square tile.

| Zone | Serves | y range | Floor height | Contents |
|---|---|---|---|---|
| Z0 Crown | Spectators (clears heads) | 0 to 364 | 2.00 to 1.86 m | Integer cells, cap y 115 to 352, baseline 352 |
| Z1 Plate | Spectators and player | 364 to 504, x 64 to 1060 | 1.86 to 1.80 m | State label (left), decimals (right) |
| Bell mark | Everyone | 548 to 560, x 1016 to 1072 | 1.79 m | 12 px white bar, the top of the scale |
| Z2 Replay | Player (eye band) | 552 to 1768, x 64 to 976 | 1.78 to 1.31 m | 912 x 1216 (3:4), 475 mm tall, near life size |
| Z3 Claim | Player's hands (chest) | 1808 to 2270 | 1.29 to 1.11 m | QR tile x 64 to 526, copy column x 566 to 976 (410 px) |
| Z3b Carry strip | Previous player | 2302 to 2398 | 1.10 to 1.06 m | Earlier hit's still and letter code |
| Z4 Go again | Next payer (reader height) | 2440 to 2724 | 1.05 to 0.94 m | Target headline, payment line, arrow |
| Z5 Runway | Nobody (bodies block it) | 2724 to 3720 | 0.94 to 0.55 m | Empty on purpose. Charge launch tube. Recording notice at baselines 3600 and 3648 |
| Z6 Base strip | Everyone (splash) | 3720 to 3840 | 0.55 to 0.50 m | #5E0606 at rest, #EB1110 on impact |
| Rail | Everyone | 560 to 3720, x 1028 to 1060 | 1.78 to 0.55 m | Track, charge fill, notch, today tick, run ticks |

**Tower scale (linear, never curved):** `h = score / bell`, capped at 1.04 for drawing. Mark y = `3840 - h x 3280`. So h = 1 is y 560 (the bell) and h = 0 is y 3840. `bell` = best **unflagged** score on this machine in the rolling last 30 days. `today` = best unflagged score since 04:00 local.

**Legibility check of the key sizes.** Cap height is converted at 2.56 px/mm. 16 arcmin is the minimum and 20 arcmin is comfortable.

| Element | Size | Cap | mm | At 1.5 m | At 4.5 m |
|---|---|---|---|---|---|
| Integer, Saira XC Black | 344 px | 237 px | 92.6 | 212' | 71' |
| Decimals | 120 px | 83 px | 32.3 | 74' | 25' |
| HIT IT, Orbitron 900 | 160 px | 115 px | 45.0 | 103' | 34' |
| Go-again headline, Orbitron 900 | 104 px | 75 px | 29.3 | 67' | 22' |
| Claim headline, Orbitron 900 | 72 px | 52 px | 20.3 | 46' | 16' |
| Plate label, Orbitron 900 | 64 px | 46 px | 18.0 | 41' | 14' (the plate colour carries the state at 4.5 m) |
| Letter code, Orbitron 900 | 60 px | 43 px | 16.8 | 38' | photographable from 2 m |
| Sentence, Inter 700 | 48 px | 35 px | 13.7 | 31' | player only |
| Floor, Inter 600 | 36 px | 26 px | 10.2 | 23' | player only |

---

## 3. Type system

### 3.1 Roles

| Token | Face | Job |
|---|---|---|
| `--font-score` | **Saira Extra Condensed Black** in fixed cells (prototype). Launch: commission "PunchApp Numerals", 12 glyphs (0 to 9, comma, point) drawn on Orbitron's construction at a fixed 0.402 em advance | Every score on both surfaces. Nothing else. |
| `--font-display` | Orbitron 900 and 700, caps only, +4% tracking on the machine and +6% on the phone | Short words of three or fewer on the machine: plate labels, headlines, codes |
| `--font-sans` | Inter 700 / 600 / 400 | Every sentence on the machine and all phone UI |

### 3.2 Why the hero score is not Orbitron (measured)

- **Orbitron 900 digits are nearly square and proportional.** "0" is 0.834 em, "1" is 0.391 em, there is no `tnum` feature, and the comma is 0.243 em. In fixed cells, "999,999" needs 6 x 0.834 + 0.243 = **5.247 em**. On the 912 px measure that is **174 px, cap 125 px = 49 mm, 37' at 4.5 m**, 3.3% of the panel height. The full "999,999.000" on one line is 7.946 em, so **115 px, cap 83 px = 32 mm**: a readout smaller than the HIT IT prompt.
- **Saira XC Black:** widest digit 0.402 em, comma 0.243 em, cap 0.688 em. No `tnum` either, so it too is set in fixed cells. Six 0.402 em cells plus a comma cell at 344 px give 6 x 138 + 84 = **912 px, cap 237 px = 92.6 mm, 71' at 4.5 m**. That is **1.9x Orbitron's cap in the same width**, and a "1" (0.287 em) centred in its 138 px cell never reflows the line.
- **Rejected alternatives:**
  - Squashing Orbitron horizontally reverses its stroke contrast.
  - Rotating the number up the column is slow to read.
  - Splitting it over two lines ("736," / "582") reads as two numbers.
- **How Orbitron stays the brand voice:** it sets every word on the glass (plate states, HIT IT, KEEP, KEPT, the target headlines, the code). Red does the rest. Stroke weight matches (Saira stem to cap 0.224, Orbitron 0.212), so at distance the pair reads as one material. The pitch to the brand owner is a 1:1 print of both settings, read together from 4 m.

### 3.3 Machine type scale (px)

| Role | Face and weight | Size | Tracking | Line pitch | Colour |
|---|---|---|---|---|---|
| Score integer | Saira XC Black, cells 138 px, comma cell 84 px | 344 | 0 | n/a | #FFFFFF; ghost cells white 8% |
| Score decimals | Saira XC Black, cells 48 px, point cell 29 px | 120 | 0 | n/a | #FFFFFF (on red plate) or white 64% (on raised plate) |
| Armed prompt | Orbitron 900 | 160 | +4% | n/a | #FFFFFF |
| Out of service | Orbitron 900 | 120 | +4% | n/a | #FFFFFF |
| Go-again headline | Orbitron 900 | 104 | +4% | 112 | #FFFFFF |
| Claim headline | Orbitron 900 | 72 | +4% | 80 | #FFFFFF |
| Plate label | Orbitron 900 | 64 | +4% | n/a | #FFFFFF |
| Letter code | Orbitron 900 | 60 | +8% | n/a | #FFFFFF |
| Replay tab | Orbitron 700 | 40 | +4% | n/a | #FFFFFF on scrim-black-70 |
| Payment line and states | Inter 700 | 48 | 0 | 58 | #FFFFFF |
| Carry strip | Inter 700 | 40 | 0 | n/a | #FFFFFF |
| Claim body | Inter 600 | 36 | 0 | 46 | #FFFFFF (body), white 70% (type-this line) |
| Recording notice | Inter 600 | 36 | 0 | 48 | white 64% |

The floor is 36 px everywhere, including legal. Fonts are bundled on the cabinet and never fetched, so the Arial Black fallback (a third narrower, and absent on Android and Linux kiosks) can never render.

### 3.4 Mobile type ramp (pt, iOS)

| Role | Face | Size / line |
|---|---|---|
| Score hero, claim | Saira XC Black, cells 51, comma 31 (337 wide) | 128 |
| Score, hit detail | Saira XC Black, cells 42, comma 25 | 104 |
| Score, profile best | Saira XC Black, cells 39, comma 23 | 96 |
| Score, feed | Saira XC Black, cells 35, comma 21 | 88 |
| Score, reel tile | Saira XC Black, cells 23, comma 14 | 56 |
| Score, bell row | Saira XC Black, cells 18, comma 11 | 44 |
| Score, decimals on plates | Saira XC Black | 40 / 32 |
| Score, rows | Saira XC Black | 32 / 28 |
| Plate label | Orbitron 900 caps, +6% | 15 |
| Section label | Orbitron 900 caps, +6% | 13 |
| Large title | Inter 700 | 34 / 41 |
| Title | Inter 700 | 28 / 34 |
| Body strong | Inter 600 | 17 / 22 |
| Body | Inter 400 | 17 / 22 |
| Secondary | Inter 400 or 600 | 15 / 20 |
| Meta | Inter 400 | 13 / 18 |
| Reaction label | Inter 600 | 11 / 13 |

Phone decimals appear only on plates, hit detail and board rows (where ties happen), never inline at hero size.

---

## 4. Colour and surface system

### 4.1 Machine and phone palette (dark only)

| Token | Hex | Status | Job and reason |
|---|---|---|---|
| `ink-950` | #0B0908 | **Added** | Ground on both surfaces. neutrals-900 #221E1D is only 1.27:1 against black and reads grey in mall daylight. White on ink-950 is 19.9:1. |
| `ink-900` | #1C1817 | **Added** | Raised plate, phone raised surfaces |
| `primary-500` | #EB1110 | Kept | The strike: charge, base strip flare, notch, TODAY'S BEST plate, "you", primary buttons. 4.37:1 on ink-950, so as text only at 72 px and up on the machine or 20 pt bold on the phone. White on it is 4.55:1. |
| `primary-300` | #F26B6A | Kept | Small red text on dark (6.7:1 on ink-950) |
| `primary-900` | #5E0606 | Kept | Base strip at rest |
| `primary-800` | #750808 | **Changed** from #8D0A09 | It duplicated 700 |
| `neutrals-400` | #C4B5B0 | **Changed** from #CCBFBB | It duplicated 300 |
| `secondary-500` | #D842D3 | Kept, **one job** | Other people's marks only: friends' challenge ticks on the rail (linked phones) and challenges on the phone. 5.3:1 on ink-950. Never on plates or buttons. |
| `green-primary` | #00C853 | Kept, **phone only** | Your own best going up |
| `yellow-primary` | #FFAB00 | Kept, **one job** | Faults: 8 px top edge of the plate on NO READING, and OUT OF SERVICE. Always with words. |
| `supportive-red` primary, secondary, tertiary | #D50000, #99050A, #FBE5E5 | **Deleted** | #D50000 is 1.21:1 against brand red, so every error would read as brand and vice versa |
| `secondary-bg-*` | rgba(242,243,243,x) | **Deleted** | Cool over warm neutrals, and within two levels of main-bg at 10% |
| `main-bg-*` | rgba(255,255,255,x) | **Renamed** `overlay-white-*` and **extended** | Steps added: 08 (ghost cells), 16 (rail track), 40 (ticks and gap; decoration only, 3.8:1), 64 (secondary text, 8.3:1), 70 (type-this line) |
| `scrim-black-40`, `-70` | rgba(0,0,0,.4) / (.7) | **Added** | Text over video (replay tab, phone overlays) |
| `qr-ink`, `qr-ground` | #000000 on #FFFFFF | **Added** | QR only. Never tinted, never inverted, never over video. |

### 4.2 Plate states (there are no tiers or bands; height is the only grade)

| State | Crown ground | Plate fill | Plate label |
|---|---|---|---|
| Plain hit | ink-950 | ink-900 | none |
| At or above today's line | ink-950 | #EB1110 | TODAY'S BEST |
| House record | #EB1110 | ink-950 (never white, which would swallow the comma) | HOUSE RECORD |
| Phone linked (Armed) | ink-950 | ink-900 | PHONE LINKED |
| No reading | ink-950 | ink-900 with 8 px #FFAB00 top edge | NO READING |
| Attract, nobody yet | ink-950 | ink-900 | NOBODY YET |

Per-venue setting: charge fill opacity 100% by default, adjustable down to 60% for dim venues. Burn-in: the whole layout orbits 1 px within a 4 px square every 10 minutes. After closing time the panel runs at 30% brightness with no charge.

---

## 5. Machine states

Numbers used in the frames: bell 812,406; today 654,870 (tick y 1196); hero hit **736,582.240** (h 0.907, notch y 866); weak hit 204,118.506 (notch y 3016); letter code **KTR BVM**. Clock t is measured from contact.

**Common rail rendering:**
- Track: white 16%.
- Bell mark: white, at y 548 to 560.
- Today tick: 32 x 6 px, white 40%.
- Charge fill: #EB1110.
- Hit notch: 40 x 10 px white, at x 1024 to 1064.
- Run ticks: 32 x 6 px, white 40%. The run's top tick is 32 x 10 px white.
- Challenge ticks (linked phone only): 32 x 6 px, #D842D3.
- Gap segment: from the notch up to the target, 32 px wide, white 40%.
- No labels on the rail.

### M-01 ATTRACT
- **Trigger:** boot, end of Afterglow, or end of Closed. **Duration:** loops. **Exit:** credit accepted, to M-02.
- **Demo charge:** every 20,000 ms a charge rises at 60% opacity to today's line (649 ms rise, 240 ms hang, 649 ms drain). No shake, no drop, no number change. It teaches the metaphor without spending the shake.
- **Replay loop:** clips of adult owners who opted in for that clip, bystanders blurred, 6,000 ms each with 400 ms crossfades. With no eligible clips it shows a staff demo with no faces.

| Zone | y | Element | Size | Colour | Copy |
|---|---|---|---|---|---|
| Z0 | 115 to 352 | Today's best integer | 344 px | #FFFFFF | 654,870 (or ghost `000,000` at 8% when no hits) |
| Z1 | 364 to 504 | Plate, label x 96 baseline 478; decimals right x 976 baseline 478 | 64 / 120 px | ink-900, white | TODAY'S BEST, .415 (or NOBODY YET) |
| Z2 | 552 to 1768 | Opted-in clip loop | 912 x 1216 | video | none |
| Z3 | 1808 to 2270 | Headline x 64, baselines 1883, 1995; line baseline 2090 | 104 px / Inter 700 48 | #FFFFFF | RING THE / BELL / One credit. One hit. |
| Z3b | 2302 to 2398 | Carry strip if any unkept hit less than 60 s old | see M-09 | | |
| Z4 | 2440 to 2724 | Payment line baseline 2707 plus 64 px arrow to reader | Inter 700 48 | #FFFFFF | Pay at the reader to play. |
| Z5 | 3552 to 3648 | Recording notice, baselines 3600 and 3648 | Inter 600 36 | white 64% | Every hit is filmed for its replay. / Replays nobody keeps are deleted. |
| Rail | 548 to 3720 | Bell mark, today tick at y 1196 | | | |

**Numerals:** 1 (today's best).

### M-02 ARMED
- **Trigger:** credit accepted. **Duration:** no timeout. **Exit:** strike detected, to M-03. The credit is never lost.
- **0 to 300 ms:** today's best lifts out through the top of the glass (ease-in quad). Ghost cells `000,000` fade in at 8%. The plate empties.
- **At 90,000 ms without a strike:** the prompt becomes STILL YOURS.

| Zone | y | Element | Size | Colour | Copy |
|---|---|---|---|---|---|
| Z0 | 115 to 352 | Ghost cells | 344 px | white 8% | 000,000 (texture, not counted) |
| Z1 | 364 to 504 | Plate; label only if a phone is linked | 64 px | ink-900 | PHONE LINKED |
| Z2 | 552 to 1768 | Live camera, **mirrored** (the recording is not) | 912 x 1216 | video | none |
| Z2 tab | 576 to 640 | Tab at x 64, 16 px padding, text baseline 624 | Orbitron 700 40 | white on scrim-black-70 | YOU'RE ON CAMERA |
| Z2 prompt | 1560 to 1768 | Scrim 70%; prompt x 96 baseline 1720 | 160 px | #FFFFFF | HIT IT (after 90 s: STILL YOURS at 104 px, 852 px wide) |
| Z3 | 1808 to 2270 | Empty, or the carry-over tile (M-02b) | | | |
| Z4 | 2440 to 2724 | Empty | | | |
| Z5 | notice | as M-01 | | | |
| Rail | | Bell, today tick; run ticks if a run is live; magenta challenge ticks if linked | | | |

**Numerals:** 0.

### M-02b ARMED WITH CARRY-OVER (the credit came before the previous hit was kept)
- **Trigger:** credit during M-03 to M-08 while the previous hit is unkept.
- **Duration:** the tile stays live in place for 20,000 ms or until the next impact frame, whichever is first.
- **Exit:** the tile collapses (240 ms, ease-in cubic) into the carry strip (M-09 rules), or KEPT plays inside Z3 only.
- A claim that lands during the next player's reveal changes pixels inside Z3 and Z3b only, never the crown or the charge.

| Zone | y | Element | Size | Colour | Copy |
|---|---|---|---|---|---|
| Z3 tile | 1808 to 2270, x 64 to 526 | Same QR, same pixels as the previous result | 462 px | #000 on #FFF | none |
| Z3 bar | 2278 to 2282, x 64 to 526 | Shrinks from the right, linear, 20,000 ms. No digits. | 4 px | white 70% | none |
| Z3 copy | x 566 | Headline baselines 1860, 1940 | 72 px | #FFFFFF | KEEP / LAST HIT |
| Z3 still | x 566 to 662, y 1968 to 2088 | Impact frame of that hit | 96 x 120 | image | none |
| Z3 type line | baseline 2194 | Inter 600 36 | | white 70% | Or type this at pnch.app |
| Z3 code | baseline 2270 (level with tile bottom) | 60 px, +8% | | #FFFFFF | KTR BVM |
| Z2 prompt | as M-02 | | | | HIT IT |

**Numerals:** 0.

### M-03 IMPACT, CHARGE, HANG (t 0 to apex + 240 ms)
- **Trigger:** strike sensor event.
- **Duration:** t 0 to 120 impact. The charge rise runs from t 120 and takes `sqrt(2 x 3280h / 12557)` s (181 to 723 ms), plus 50 ms hit-stop if it passes today's line, then a 240 ms hang.
- **Exit:** timer, to M-04. If no valid reading arrives by 400 ms, go to F-01. If none by 5,000 ms, go to F-02.
- **t 0:** canvas jolts Y only. HIT IT falls out under gravity. The camera frame cuts to black for one frame, then Z2 stays black. Base strip goes #EB1110.
- **t 120 on:** the full-bleed #EB1110 field rises from y 3840 behind all content, led by a 16 px white edge. Today's line draws across the full width. The rail fills in step.
- **Passing the line:** hit-stop, then the line breaks and its halves fall outward.
- **Passing a run tick:** the tick flashes to 100% and kicks 16 px up (spring k 900 c 28). No word.
- **At apex:** white notch stamps on the rail.

| Zone | y | Element | Size | Colour | Copy |
|---|---|---|---|---|---|
| Z0 | 115 to 352 | Ghost cells brighten during the hang | 344 px | white 8% to 18% | 000,000 |
| Z1 | 364 to 504 | Empty plate | | ink-900 | none |
| Full bleed | apex to 3840 | Charge field with 16 px white edge (28 px at apex) | full width | #EB1110 | none |
| Today line | 1196 | 6 px line across x 0 to 1080 (10 px during hit-stop) | | white 40% | none |
| Rail | | Fill to edge; notch at apex | 40 x 10 | white | none |

**Numerals:** 0. **Frame M-03 in Figma:** apex, 60 ms after the line broke.

### M-04 DROP AND VERDICT
- **Trigger:** hang ends. **Exit:** timer, to M-05.
- **Duration:** fall 247 ms, then landing. Decimals at landing +140. Drain at landing +200. Plate wipe at landing +280 (special states). Label at landing +460. **Stillness 600 ms** after the last stamp settles. Hero: t 1098 to 2565.

| Zone | y | Element | Size | Colour | Copy |
|---|---|---|---|---|---|
| Z0 | from baseline -30 to 352 | Integer falls, squashes, recovers | 344 px | #FFFFFF | 736,582 |
| Z1 | 364 to 504 | Decimals stamp at x 803 to 976, baseline 478 | 120 px | #FFFFFF | .240 |
| Z1 | 364 to 504 | Fill wipe outward from x 520, 180 ms | | ink-900 to #EB1110 | none |
| Z1 | baseline 478, x 96 | Label stamp | 64 px (582 px measured) | #FFFFFF | TODAY'S BEST |
| Full bleed | 866 to 3840 | Charge drains (ease-in quad, 688 ms) | | #EB1110 | none |
| Z6 | 3720 to 3840 | Splash when the charge reaches the floor, then 300 ms decay | | #EB1110 to #5E0606 | none |
| Rail | 866 to 3720 | Stays red to the notch | | #EB1110 | none |

- **Detail:** the comma descends 57 px below the baseline (bounds -165/1000 units), so it overlaps the plate top by 45 px and the digits visibly stand on the plate. The label's cap top (y 432) clears the comma tail (y 409) by 23 px.
- **Numerals:** 1.

### M-05 SETTLE (480 ms, from t 2565 on the hero)
- **Trigger:** stillness ends. **Exit:** timer, to M-06.
- **Motion:** replay, claim and go-again blocks each rise 24 px while fading in (320 ms, ease-out cubic), starting 80 ms apart. The rail gap segment fades in over the last 320 ms.
- The QR is static and fully opaque from settle end, and never moves after that (the canvas shake has already finished).

### M-06 RESULT (hero frame)
- **Trigger:** settle ends. **Duration:** 30,000 ms.
- **Exits:**
  - Credit: to M-02b (tile carries over).
  - Page opened on a phone: to M-06a.
  - Keep confirmed by the server: to M-07.
  - Timer: to M-08.

| Zone | y | Element | Size | Colour | Copy |
|---|---|---|---|---|---|
| Z0 | 115 to 352 | Integer | 344 px | #FFFFFF | 736,582 |
| Z1 | 364 to 504 | Plate, label, decimals | 64 / 120 | #EB1110, white | TODAY'S BEST, .240 |
| Z2 | 552 to 1768 | Replay loop, 4,800 ms: 1,700 real, 2,400 at 0.25x (the 600 ms around contact), 700 real | 912 x 1216 | video | none |
| Z2 tab | 576 to 640 | Only during the 0.25x span | Orbitron 700 40 | white on scrim-black-70 | SLOW MOTION |
| Z2 progress | 1760 to 1768 | Red line with 4 px white tick at the contact frame | 8 px | #EB1110 | none |
| Z3 tile | 1808 to 2270, x 64 to 526 | QR V2-Q, 25 modules x 14 px = 350 px, quiet zone 56 px | 462 px | #000 on #FFF | encodes HTTPS://PNCH.APP/DXB2/KTRBVM |
| Z3 copy | x 566, baselines 1860, 1940 | Headline | 72 px (KEEP 233, THIS HIT 366 measured) | #FFFFFF | KEEP / THIS HIT |
| Z3 copy | baselines 2004, 2050 | Body | Inter 600 36 (382, 256) | #FFFFFF | Scan with your camera. / No app needed. |
| Z3 copy | baseline 2194 | Type line | Inter 600 36 (389) | white 70% | Or type this at pnch.app |
| Z3 code | baseline 2270 | Code | 60 px +8% (357; worst case MMM MMM 382) | #FFFFFF | KTR BVM |
| Z4 | baselines 2515, 2627 | Target headline (rules below) | 104 px | #FFFFFF | NOW RING / THE BELL |
| Z4 | baseline 2707 | Payment line plus 64 px arrow 24 px after the text, pointing at `READER_Y` | Inter 700 48 (643) | #FFFFFF | Pay at the reader to go again. |
| Z5 | 3600, 3648 | Notice | Inter 600 36 | white 64% | Every hit is filmed for its replay. / Replays nobody keeps are deleted. |
| Z6 | 3720 to 3840 | Base strip | | #5E0606 | none |
| Rail | 866 to 3720 red; 560 to 866 gap segment | Notch at 866, today tick at 1196 under the red | | | |

**Target rules (Z4, first match wins).** Every line is measured to fit 912 px.

| # | Condition | Headline | Payment line | Gap segment on the rail |
|---|---|---|---|---|
| 1 | Linked phone has 5 hits in the last 15 min (wellbeing cap) | GOOD / SESSION. | Your hits are waiting on your phone. (794) | none |
| 2 | House record set by this hit | DEFEND / THE BELL | Pay at the reader to go again. | none |
| 3 | Run of two or more and this hit is the top | WHO'S / NEXT? | Pay at the reader to take a turn. (691) | none |
| 4 | Run of two or more and a higher tick exists | BEAT THE / TOP MARK | Pay at the reader to go again. | notch to top tick |
| 5 | Below today's line | REACH / TODAY'S LINE (883) | Pay at the reader to go again. | notch to today tick |
| 6 | At or above today's line | NOW RING / THE BELL | Pay at the reader to go again. | notch to bell |

- On coin cabinets, "Pay at the reader" becomes "Add a credit": "Add a credit to go again." (535) and "Add a credit to take a turn."
- The copy names the target and never characterises the gap.

**Numerals:** 1.

### M-06 variants

- **M-06w Weak hit (204,118.506):**
  - Notch at y 3016 (0.82 m), hidden behind the player from the queue.
  - Plate ink-900 with no label; decimals white 64%.
  - Target: REACH / TODAY'S LINE, with the gap segment from 3016 to 1196.
  - **Numerals:** 1.
- **M-06r House record:**
  - Crown ground #EB1110 over y 0 to 364; plate ink-950 with HOUSE RECORD (625 px).
  - Charge reaches the bell and the notch sits on the bell mark.
  - Target: DEFEND / THE BELL.
  - **Numerals:** 1.
- **M-06g Group addressed (run of three):**
  - Run ticks at y 1466 (588,000) and y 1771 (512,300). The current notch at y 866 is the top.
  - Target: WHO'S / NEXT? with "Pay at the reader to take a turn."
  - Ticks are anonymous. The group knows whose is whose because they watched.
  - A run forms when a credit arrives during a Result or within 60,000 ms of a landing. It holds at most six ticks, and the ticks fade 90,000 ms after the last credit.
  - **Numerals:** 1.
- **M-06L Linked phone:**
  - No QR. At the landing the Z3 tile arrives already KEPT (M-07 layout), with the copy column "Linked phone." / "No scan needed." (Inter 700 48, two lines, baselines 1900 and 1958).
  - The phone buzzes once (heavy) on the landing frame.
  - **Numerals:** 1.

### M-06a SCANNED (page opened, not yet kept)
- **Trigger:** server push that the claim page opened (typically under 1,000 ms after the scan).
- **Duration:** until keep, or 15,000 ms, then it reverts to M-06 copy.
- **Change:** Z3 copy column only. The QR stays, because a friend may still be scanning.

| Zone | Element | Copy |
|---|---|---|
| Z3 headline 72 px, baselines 1860, 1940 | Headline | ON YOUR / PHONE (397, 304 measured) |
| Z3 body Inter 600 36, baseline 2004 | Body | Now keep it there. |

### M-07 KEPT (claimed-on-phone acknowledgement)
- **Trigger:** server confirms the keep. **Only shown after confirmation**; if none arrives within 3,000 ms of the scan, the QR simply stays.
- **Duration:** 6,000 ms.
- **Exit:** timer, to M-08. Credit, to M-02 (no carry-over is needed).
- **Motion:** each QR module drops 300 px under gravity after a random 0 to 200 ms delay and fades over 500 ms, so a dead code never looks alive. The tile then fills solid #FFFFFF and KEPT stamps (160 ms).

| Zone | y | Element | Size | Colour | Copy |
|---|---|---|---|---|---|
| Z3 tile | 1808 to 2270 | Solid tile with centred word | Orbitron 900 104 (336 wide) | #000 on #FFF | KEPT |
| Z3 copy | baseline 1900 | Line 1 | Inter 700 48 (368) | #FFFFFF | On a phone now. |
| Z3 copy | baseline 1950 | Line 2 | Inter 600 36 | white 70% | The code is used up. |

- The glass never shows who kept it.
- **Numerals:** 1 (the score above).

### M-08 AFTERGLOW (what happens if nobody acts)
- **Trigger:** Result timer ends, or Kept timer ends.
- **Duration:** 8,000 ms. **Exit:** timer, to M-01. Credit, to M-02.
- **Motion:**
  - The replay freezes on the contact frame at 30% opacity.
  - An unkept QR tile collapses into the carry strip (240 ms).
  - Integer, plate and go-again block stay.
  - At exit, the crown crossfades to today's best over 240 ms (no slam) and the plate label becomes TODAY'S BEST.

### M-09 CARRY STRIP (lives across M-01, M-02 and the next Result)
- **Trigger:** an unkept tile collapses. **Duration:** 60,000 ms. **Exit:** timer, or that hit is kept. Only the most recent unkept hit is shown.

| Zone | y | Element | Size | Colour | Copy |
|---|---|---|---|---|---|
| Z3b | 2302 to 2398, x 64 to 144 | Impact frame still | 80 x 96 | image | none |
| Z3b | baseline 2364, x 168 | Line | Inter 700 40 (713; worst case 759) | #FFFFFF | Earlier hit? Type KTR BVM at pnch.app |

**Numerals:** 0.

**If nobody acts (hero timeline, measured from landing t 1345):**

| Time | What happens |
|---|---|
| +1,700 ms | Settle completes |
| +31,700 ms | Afterglow starts; the QR collapses to the strip |
| +39,700 ms | Attract; the strip remains |
| +91,700 ms | Strip gone |
| 15 min after landing | Code dead |
| 60 min after landing | Unkept replay deleted from cabinet and cloud |

The score survives only as an anonymous machine statistic.

### F-01 NO READING
- **Trigger:** contact registered but below the noise floor, first time on this credit.
- **Duration:** 2,500 ms. **Exit:** to M-02 with the credit kept.
- A second sub-floor contact on the same credit is scored honestly as 0.000: no charge, the integer lands as `000,000` at full white, no label. Light taps cannot farm free replays.

| Zone | Element | Size | Copy |
|---|---|---|---|
| Z1 | Plate with 8 px #FFAB00 top edge, label | 64 px (479) | NO READING |
| Z3 | Line at baseline 2039 | Inter 700 48 (444) | Your credit is still in. |
| Z3 | Line at baseline 2097 | Inter 700 48 | Hit again when you're ready. |

**Numerals:** 0.

### F-02 SCORE TIMEOUT
No value arrives 5,000 ms after impact. Same frame and copy as F-01, the credit is kept, and a fault is logged.

### F-03 NO REPLAY (camera fault)
- Z2 becomes ink-950 with a 3 px white 20% outline.
- NO REPLAY / THIS TIME in Orbitron 900 72 (512, 429) at x 96, baselines 1100 and 1180.
- Your score still counts. in Inter 700 48 at baseline 1258.
- Keeping still works, for the score only.

### F-04 OUT OF SERVICE
- The reader is disabled and ghost cells show.
- BACK SOON in Orbitron 900 120 (869) at x 64, baseline 2039.
- This machine is not taking credits right now. in Inter 600 40 (794) at baseline 2110.
- A staff fault word sits in Orbitron 700 36 at white 30%, baseline 3780.

### F-05 CLOSED
30% brightness, no demo charge, today's best in the crown, replay zone black.

**Offline:** there is no visible state. Every state runs on local data. The code is minted on the cabinet. The machine never tells the queue it is offline.

**Queued credit rule:** a credit during M-03 or M-04 is accepted and queued. The reveal plays through the last stamp, holds the 600 ms stillness, then transitions to M-02b in 300 ms. **Worst case impact to Armed: 2,925 ms** (house record, h 1.04); hero 2,865 ms; weak hit 2,169 ms.

### Figma frames (1080 x 3840, each labelled with its numeral count)

| Frame | Numerals |
|---|---|
| M-00 Zoning overlay (floor heights, sightlines, 1.75 m silhouette) | n/a |
| M-01 Attract | 1 |
| M-02 Armed | 0 |
| M-02b Armed with carry-over | 0 |
| M-03 Charge at apex | 0 |
| M-04 Landing frame | 1 |
| **M-06 Result (hero)** | 1 |
| M-06w Weak hit | 1 |
| M-06r House record | 1 |
| M-06g Group addressed | 1 |
| M-06L Linked | 1 |
| M-06a Scanned | 1 |
| M-07 Kept | 1 |
| M-08 Afterglow with strip | 1 |
| M-09 Wellbeing (GOOD SESSION) | 1 |
| F-01 No reading | 0 |
| F-03 No replay | 1 |
| F-04 Out of service | 0 |

Build M-00, M-01, M-02, M-03, M-06, M-06g and M-07 first. The rest are variants of those.

---

## 6. Reveal motion clip

- **Master:** MP4, H.264 High Level 5.1, **1080 x 3840, 60 fps, 9,000 ms**, no audio. 16,320 macroblocks x 60 = 979,200 per second, inside Level 5.1's 983,040.
- **Also export:** a 540 x 1920 preview, and an optional 1920 x 1080 presentation cut with the column beside a 1.75 m silhouette at true scale.
- **Rendering:** canvas, frame by frame, deterministic.
- **Replay footage:** a flat grey figure placeholder (no real person).

**Constants:**
- Stage gravity = 0.5 g at true scale = 4.905 m/s² x 2,560 px/m = **12,557 px/s²**.
- Rise = ease-out quad (exact ballistic). Fall = ease-in quad (exact ballistic).
- Stamp = 160 ms ease-out cubic, scale 1.3 to 1.0.
- Plate spring = stiffness 900, damping 28, mass 1 (damping ratio 0.47).
- Charge edge smear = velocity / 120 px.
- **All shakes are Y only.** The force goes into the panel, not across it.

**Scenario:** hero hit 736,582.240, bell 812,406, today's line y 1196, no run, not linked. Clip ms = t + 600.

| Clip ms | t | Element | From | To | Easing | Duration | Physical logic |
|---|---|---|---|---|---|---|---|
| 0 | -600 | Armed hold: live camera, HIT IT, ghost cells 8%, base strip #5E0606 | | | none | 600 | Stillness is the anticipation |
| 600 | 0 | Whole canvas | translateY 0 | -16 px | ease-out cubic | 50 | The panel answers within a frame, before the score exists |
| 650 | 50 | Whole canvas | -16 | 0, overshoot +3 | ease-out back (0.34,1.56,0.64,1) | 200 | Recoil |
| 600 | 0 | Camera frame | live | black (1 frame), Z2 stays black | cut | 17 | The camera blinks at contact |
| 600 | 0 | HIT IT | y 1720 | falls under 12,557 px/s², opacity 1 to 0 | ease-in quad | 300 | Knocked loose, it falls |
| 600 | 0 | Base strip | #5E0606 | #EB1110 | cut | 17 | Energy enters at the floor |
| 720 | 120 | Charge field and 16 px white edge | y 3840 | toward apex y 866, v0 8,642 px/s | ease-out quad | 459 to the line | Launch speed is set by the score, so no two hits share timing |
| 720 | 120 | Edge smear | 72 px | 0 at apex | tied to velocity | | 180 degree shutter at 60 fps |
| 720 | 120 | Today's line at y 1196 | 0 width | x 0 to 1080, 6 px, white 40% | ease-out cubic | 120 | The target arms itself |
| 1179 | 579 | **Hit-stop** at the line (edge at 2,879 px/s) | moving | frozen; line 6 to 10 px | hold | 50 | Resistance: the line pushes back |
| 1229 | 629 | Line halves | split at x 540 | each rotates 6° (outer end down), slides 80 px outward, falls under gravity, fades | ease-in quad | 400 | A broken target, falling to the edges the queue can see around the player |
| 1229 | 629 | Charge resumes | y 1196 | y 866 | ease-out quad | 229 | Momentum was kept |
| 1458 | 858 | Apex: edge thickens; rail notch stamps | 16 px; scale 1.3 | 28 px; 1.0 | ease-out cubic | 120 / 160 | Velocity is zero, so the smear is gone |
| 1458 | 858 | **Hang.** Only ghost cells move | 8% | 18% | linear | 240 | The inhale. Constant for every hit, so near misses get no extra drama |
| 1698 | 1098 | **Integer released** | baseline -30 (fully above glass) | baseline 352 | ease-in quad | 247 | The only object that enters from outside the glass. 382 px under 12,557 px/s² |
| 1698 | 1098 | Integer stretch | 1.0 / 1.0 | scaleY 1.06, scaleX 0.97 at landing, proportional to speed | tied to velocity | 247 | Mass in motion |
| 1945 | 1345 | **Landing** at 3,097 px/s (1.2 m/s real). Ghost cells cut to 0 | | squash 1 frame: scaleY 0.88, scaleX 1.05, origin on baseline | cut | 17 | Contact |
| 1945 | 1345 | Plate | kick 950 px/s down | +18 px at 41 ms, -7, +3, settled | spring 900/28/1 | 450 | A sprung surface takes the load; the integer rides it |
| 1945 | 1345 | Whole canvas, Y only | 0 | +22, -12, +6, -2, 0 at 50 ms keys | linear keys | 200 | The panel moves |
| 1945 | 1345 | Plate top edge | 4 px | 12 px, back to 4 | ease-out cubic | 200 | The plate flares where it was hit |
| 1961 | 1361 | Digits recover | 0.88 / 1.05 | 1.04 / 0.99 | ease-out quad | 100 | Rebound |
| 2061 | 1461 | Digits settle | 1.04 / 0.99 | 1.0 / 1.0 | ease-in-out sine | 200 | Rest. The number never moves again |
| 2085 | 1485 | Decimals .240 | scale 1.3, opacity 0 | 1.0, 100% (opacity in 60 ms) | ease-out cubic | 160 | Small things are stamped, not dropped |
| 2085 | 1485 | Plate | kick 180 px/s | about 3 px | spring 900/28/1 | 300 | Second, smaller beat |
| 2145 | 1545 | **Drain**: charge falls; edge 28 to 16 px | y 866 | y 3840 | ease-in quad | 688 | Caused by the slam, never before it |
| 2225 | 1625 | Plate fill wipe, outward from x 520 | #1C1817 | #EB1110 | ease-out cubic | 180 | The state spreads from the point of impact |
| 2405 | 1805 | TODAY'S BEST label stamp | scale 1.3, 0% | 1.0, 100% | ease-out cubic | 160 | The meaning arrives after the fact |
| 2405 | 1805 | Plate | kick 180 px/s | about 3 px | spring | 300 | |
| 2565 | 1965 | **Stillness**: only the drain and base strip move | | | hold | 600 | Four people read it together |
| 2833 | 2233 | Charge reaches the floor; base strip | #EB1110 | #5E0606 | ease-out cubic | 300 | The splash |
| 3165 | 2565 | Replay block | y +24, 0% | y 0, 100% | ease-out cubic | 320 | Deliberately quiet |
| 3245 | 2645 | Claim block (tile, copy, code) | y +24, 0% | y 0, 100% | ease-out cubic | 320 | The QR is static from 3,565 |
| 3325 | 2725 | Go-again block, then rail gap segment (3,325 to 3,645) | y +24, 0% | y 0, 100% | ease-out cubic | 320 | |
| 3485 | 2885 | Replay plays: 1,700 real, 2,400 at 0.25x, 700 real. SLOW MOTION tab fades in 120 ms at 5,185 and out at 7,585 | | | linear | 4,800 loop | |
| 6385 | 5785 | Contact frame in the replay: plate twitch; notch pulse | kick 250 px/s; notch 10 px | about 5 px; 12 px, back to 10 | spring / ease-out cubic | 300 / 200 | Ties that punch to that number. The QR never moves |
| 8285 | 7685 | Replay loop restarts | | | cut | | |
| 9000 | 8400 | Clip ends on the settled Result | | | | | |

**Why it reads as an event:**
- Height gives the verdict to the whole room at t 579 to 858.
- The number is withheld for 488 ms after the apex, then falls under stated gravity.
- It has consequences: plate, panel and drain.
- It is the only heavy motion, followed by 600 ms of stillness.

**Variant stills to add beside the clip (not in the clip):**
- **House record:** the charge collides with the plate underside at t 798, floods the crown to y 0 in 120 ms (ease-out cubic), and kicks the plate 26 px up. Hang 240, landing t 1405, label t 1865.
- **Weak hit:** apex t 482, landing t 969, no line break, no label.

**Phone echo of the same curves:** a 120 pt fall in 180 ms, a one-frame squash of 0.90 / 1.04, and one `.heavy` haptic on landing. That is the only haptic in the app.

---

## 7. Handoff

### 7.1 Primary path: scan the glass
- **QR payload:** `HTTPS://PNCH.APP/DXB2/KTRBVM`, 28 characters, all uppercase, so alphanumeric mode. It fits **Version 2, ECC Q (capacity 29), 25 modules**.
  - 14 px integer modules (5.5 mm): code 350 px (137 mm), quiet zone 56 px (4 modules), tile 462 x 462 px (180 mm).
  - Scans from 0.3 m (phone focus) to about 1.37 m.
  - **Position:** x 64 to 526, **y 1808 to 2270, centre y 2039 = 1.20 m from the floor** (chest height).
  - #000 on #FFF, square corners, no anti-aliasing, never animated, tinted or over video while live.
- **Token:** `DXB2` is the machine id. `KTRBVM` is the code: six letters minted on the cabinet as a keyed HMAC of the attempt counter, so the server can verify a code the machine has not synced yet.
  - Alphabet: 16 consonants **B C D F H J K L M N P R S T X Z**. No vowels, so no words. No digits, so the score stays the only number. No V or W (confusable, and W made the code overflow at 64 px).
  - 16.7 million codes per machine against about 15 live ones.
- **iOS without the app:** the Camera shows an **App Clip card** on an Advanced App Clip Experience registered per machine URL prefix.
  - Title "Your hit at Dubai Mall". Subtitle "Keep the score and the replay". Button "Open". Static header image per machine.
  - The App Clip checks the device is within 500 m of the venue.
- **Android without the app:** a web claim page (under 150 KB) at the same URL with the same layout, held by a signed cookie. There is no location check on web; see open questions.
- **Upload order:** score and impact frame (about 80 KB) within 0.5 s of landing, then a 540 x 960 proxy clip within about 3 s, then the master. The claim page never shows a spinner: it opens on the impact frame, then plays.
- **Never gated:** watching needs nothing. Keeping needs one sign-in sheet (Sign in with Apple or Google). The install prompt (`SKOverlay`) appears only 2 s after a keep.

### 7.2 Secondary paths (identity before the hit)
- **Link my next hit here:** in the app, within 50 m, on the Machines tab.
  - The player picks the machine by the name on its cabinet plate ("Dubai Mall, Level 2").
  - A 600 ms press-and-hold arms it. It covers one hit or 90 s, whichever comes first.
  - The glass shows PHONE LINKED on the Armed plate, no QR appears, and the tile arrives KEPT on landing.
- **Catch my next hits here:** a switch after any keep. It links consecutive hits for a few minutes: the App Clip uses its 8-hour notification permission, the full app a Live Activity.
- **Optional NFC sticker** on the cabinet side at 1.2 m, pointing at the same link flow. It is a hardware ask, not a dependency.
- **Physical scan beats a pocket link:** if a linked phone was not the striker, a scan of the reissued QR within 60 s overrides it. "Not me" on the linked phone within 10 minutes reissues the code.

### 7.3 Fallbacks
1. **Typed code:** "KTR BVM" at pnch.app or in the app's "Enter a code". The machine is pre-selected by location or picked from a list. 5 tries per device per minute.
2. **Credit before scanning:** the same tile stays live in the same place for 20 s or until the next impact frame (M-02b), then the carry strip shows the letters and the impact frame for 60 s at 1.08 m.
3. **Machine offline:** the code still issues. After a keep, the phone says "Kept. Your score and replay arrive when the machine reconnects." and sends a push on arrival.
4. **Player left without anything:** the hit is gone. There is deliberately no search by time or place and no grid of stills, because either would let a stranger browse other people's faces. A friend who scanned can keep it and send it on.

### 7.4 Expiry and privacy
- **One code, one hit, one owner.** Live for **15 minutes** from landing.
- Opening the page inside that window holds the hit for that device for 24 hours without an account. If it is still not kept, it is deleted.
- Unopened, unkept replays are deleted from the cabinet and cloud **60 minutes** after landing.
- **First to keep owns it.** A second phone sees "Someone already kept this hit." with "Ask for a copy". The owner approves or declines; approval sends a copy and suggests a follow.
- **"Not me"** (top right of the claim page) releases a hit before keeping. After keeping, "This is me" on any clip opens a transfer review and hides the clip meanwhile.
- **Kept hits are private by default** (Only you). Posting is a separate choice. Attract-loop use needs a separate per-clip opt-in and an adult account.
- **Before anything leaves the phone publicly,** everyone except the striker is blurred on device (the queue never ends up in a stranger's reel).
- **The glass never shows a name, handle, avatar or face** other than the replay of the current player and opted-in attract clips.
- **Under-16 accounts:** no public posts, no attract use, no Regulars listing, Friends boards only.
- **No face recognition** anywhere.
- **Only token-kept hits rank.** Scores flagged by the cabinet (sensor anomaly, three top-of-scale readings in 10 minutes) never become today's line or the bell. If one already has, the mark reverts to the best unflagged score.

### 7.5 Already installed
Scanning with any camera opens the app through a universal link, already signed in, with **zero taps**. The app shows "Kept." over the landing replay, keeps "Not me" available for 60 s, and the glass plays M-07.

### 7.6 Wellbeing cap
After 5 linked hits within 15 minutes:
- Z4 shows GOOD / SESSION. with "Your hits are waiting on your phone."
- Auto-linking switches off.
- The phone suggests nothing further that session.

---

## 8. Phone

**Platform:**
- iOS, iPhone 16 frame **393 x 852 pt**, designed at 1x. Safe areas: top 59, bottom 34. Tab bar 49 plus 34. Side margin 20. 4 pt grid.
- Dark only, on ink-950.
- Android gets the web claim page for this exercise.

**Colour roles:**
- #EB1110 is you and primary actions; small red text is #F26B6A.
- #D842D3 is other people's marks.
- #00C853 is only for your best going up.
- Text is white at 100% and 64%.

**IA:**
- Four tabs: **Hits** (feed), **Machines**, **Boards**, **You**.
- The claim flow (App Clip, web, deep link) sits outside the tabs.
- After install, the app opens on You with the current visit expanded. There is no onboarding carousel.

**What changed from the current app** (from the figma-ref screens):
- `987654.321 Score` in podium colours becomes `987,654` with `.321` on a plate. No unit suffix, one colour.
- View, like and comment counters on a two-column card grid become faces and names, and no counts are shown to viewers.
- The Global / National / Regional pill tabs with a crowned podium and rank-delta arrows become This machine / City / Friends / World text tabs: one bell row, no podium, no deltas.
- The Record Holders avatar row (Home, Nearest City, Country, World) folds into the machine page.
- The reel is grouped by visit instead of an endless identical grid.

### P-00 App Clip card (system sheet)
- Header 1800 x 1200 static per machine: the crown plate on red.
- Title "Your hit at Dubai Mall", subtitle "Keep the score and the replay", button "Open".

### P-01 Claim (App Clip or web)
- **Purpose:** show the hit before asking for anything; keep it in one sheet.

**Layout, top to bottom:**
- **Replay** y 0 to 524 (393 x 524, 3:4), muted, starting 1,500 ms before contact.
  - Top scrim y 0 to 100 at black 40%.
  - "Not me" Inter 600 15, right-aligned x 373, baseline 82.
  - Bottom scrim y 344 to 524, black 0% to 70%.
- **Integer** "736,582" Saira 128 pt from x 20, baseline 516. It drops on the replay's contact frame with the phone echo curve.
- **Plate** y 524 to 580 full-bleed, #EB1110 (special) or #1C1817. Label "TODAY'S BEST" Orbitron 900 15 at x 20, baseline 560. Decimals ".240" Saira 40 right x 373, baseline 560.
- **Place and time:** "Dubai Mall, Level 2" Inter 600 17, baseline 612. "Just now" Inter 400 15 at 64%, baseline 636.
- **Keep block:**
  - "Keep this hit" Inter 700 28, baseline 684.
  - "Score and replay, saved to you." Inter 400 15, baseline 708.
  - Sign in with Apple button 353 x 52 at y 724, radius 12.
  - "Use email instead" Inter 600 15, baseline 806.

**States (same frame):**
- **Kept by someone else:** replay replaced by the blurred impact frame. "Someone already kept this hit." and "Ask for a copy" (outline button 353 x 52).
- **Expired:** "This code has run out." and "Replays nobody keeps are deleted within the hour."
- **Too far away (App Clip):** "Open this at the machine." and "Codes only work near the machine they came from."
- **Machine offline:** the score and plate show, the replay area is ink-900, with "Your replay is on its way from the machine."

**Craft detail:** the integer lands on the contact frame of the replay itself, so the phone repeats the glass beat at hand scale, with the only haptic in the product.

### P-02 Kept (first run)
- **Purpose:** confirm, offer frictionless next hits, then one install reason.

**Layout, top to bottom:**
- Replay, integer and plate stay looping above (y 0 to 580).
- "Kept." Inter 700 34, baseline 632.
- "It's on your profile. Only you can see it until you post it." Inter 400 15, two lines, baselines 658 and 678.
- **Switch row** y 700 to 756:
  - "Catch my next hits here" Inter 600 17, baseline 722.
  - "For a few minutes, no scan needed." Inter 400 13 at 64%, baseline 742.
  - iOS switch at x 322 to 373, **default off**.
- **"Save the video"** secondary button, 353 x 48 at y 768, 1.5 pt white 40% outline. It renders a 1080 x 1920, 7 s share cut: the landing burned in, bystanders blurred, end card "DUBAI MALL, LEVEL 2" and "pnch.app/dubai-mall-2". It never carries the code.
- SKOverlay "Get PunchApp" after 2,000 ms.

**Craft detail:** the switch copy states duration in words, and linking is opt-in, never preselected.

### P-03 You (profile and reel)
- **Purpose:** your best, then your visits.

**Layout, top to bottom:**
- **Nav** y 59 to 103: "@rami.k" Inter 700 17 at x 20; 32 pt avatar right-aligned at x 373.
- **Best block:**
  - "YOUR BEST" Orbitron 900 13 #F26B6A, baseline 136.
  - "736,582" Saira 96 from x 20, baseline 228 (257 wide).
  - Plate y 236 to 276 full-bleed #1C1817: "Dubai Mall, Saturday" Inter 600 15 at x 20, baseline 262; ".240" Saira 32 right x 373.
- "Home machine: Dubai Mall, Level 2" Inter 400 15 at 64%, baseline 304.
- **Crew suggestion row** (only when true), y 320 to 364: "You've been in three runs with Sara. Add her to your crew?" Inter 400 15, with an "Add" text button in #F26B6A.
- **Reel, grouped by visit:**
  - Header "Saturday night at Dubai Mall" Inter 600 17 (baseline 396), then "Three hits" Inter 400 15 at 64% (baseline 418).
  - The visit's best hit as a 353 x 470 tile (3:4) with bottom scrim; score Saira 56 at x 36, plate label if special.
  - The visit's other hits as 72 pt rows:
    - thumbnail 48 x 64
    - score Saira 32
    - time "21:16" Inter 15 at 64%
    - right-aligned stack of reactor faces, 24 pt overlapping 8
  - "Also here that evening": 28 pt faces of opted-in players who kept hits at the same machine within the hour.
- **Collapsing:** visits older than 30 days collapse to one row, "August, six visits". Document the full reel in a 393 x 2000 scroll frame.

**Craft detail:** the rhythm comes from content (big best tile, small rows), not decoration, and the reel's unit (a visit) matches how the business sells (credits per visit).

### P-04 Hit detail and reactions
- **Purpose:** the clip, its facts, and how people answer it.

**Layout, top to bottom:**
- **Video** 393 x 699 (9:16), y 0 to 699. The integer drops at contact, 104 pt, baseline 690.
- **Plate** y 699 to 747: label and ".240" Saira 40.
- **Facts:** "Dubai Mall, Level 2" Inter 600 15, baseline 771. "Saturday 12 September, 21:14" Inter 400 13 at 64%, baseline 791. This is the only place exact time appears.
- **Visibility control** top right: text "Only you" Inter 600 15 with a chevron. It opens a sheet: Only you / Followers / Everyone, with the note "Everyone includes people who play this machine."
- **Reaction stack** on the right edge, 48 pt buttons at x 325, y 440 / 512 / 584, labelled Inter 600 11:
  - **Felt that:** the card shakes 6 pt Y only over 240 ms with a light tick.
  - **Respect**
  - **Beat this** (#D842D3)
- **Social proof** under the facts: 24 pt faces with "Sara, Omar and others felt it." No counts for viewers. The owner taps it for a list of names with each person's reaction word.
- **Beat this sheet:**
  - Title "Beat Sara's hit".
  - Body "Her score becomes a mark on your rail at the next machine you link. It lasts a week."
  - Buttons "Take it on" / "Not now".

**Craft detail:** a challenge is the reply to a hit; there are no comments in v1, and the challenge travels back to the glass as a magenta tick.

### P-05 Hits feed
- **Purpose:** watch people who play where you play.

**Layout, top to bottom:**
- Full-bleed 393 x 852 video, vertical paging, muted.
- **Text tabs** at baseline 82: "Near you" / "Following", Inter 600 17, active tab with a 2 pt #EB1110 underline (no pills).
- **Score:** each video replays its own landing as it snaps into view. Integer Saira 88 pt baseline 668. Plate y 676 to 716.
- **Who and where:** handle Inter 700 17 baseline 744; "Dubai Mall, tonight" Inter 400 15 at 64% baseline 766.
- **Reaction stack** as P-04, at y 420 / 492 / 564.
- **Overflow menu:** Report / Block.

**Rules:**
- Default scope is machines you have played, then your city.
- Only clips posted as Everyone, bystanders blurred, under-16 never shown.

**Craft detail:** the number lands on every clip's contact frame, so scrolling the feed is a string of small reveals, not a wall of static scores.

### P-06 Boards
- **Purpose:** the only surface with ranks.

**Layout, top to bottom:**
- **Scope tabs** (text, baseline 82): "This machine" / "City" / "Friends" / "World", Inter 600 15.
- **Period toggles** (baseline 110): "This week" / "All time", Inter 400 13. The week resets Monday 06:00 local.
- **Bell row** (the one editorial moment): 84 x 112 replay thumbnail playing muted; handle Inter 700 17; "Dubai Mall, Level 2" Inter 400 13; score Saira 44 right-aligned at x 373.
- **Rows**, 60 pt each:
  - rank Inter 600 15, tabular, white 64%, right-aligned in a 32 pt column
  - avatar 36
  - handle Inter 600 17
  - home machine Inter 400 13
  - score Saira 28 right-aligned at x 373, decimals Saira 14 at 64%
- **Your row** is sticky above the tab bar with a 4 pt #EB1110 left bar.
- No podium, no deltas, no arrows.

**Craft detail:** the decimals exist here because this is where ties happen; the default scope is the machine you last played.

### P-07 Machine page (venue, regulars, crews)
- **Purpose:** make a cabinet a place with people.

**Layout, top to bottom:**
- **Header:** "Dubai Mall, Level 2" Inter 700 28, baseline 100. "By the VR Park entrance. Open until midnight." Inter 400 15, baseline 124.
- **The tower** y 160 to 600: a 12 pt rail at x 361 to 373 using the cabinet's grammar. Marks sit at true heights with rows to the left:
  - bell holder (avatar 36, handle, "The bell", score Saira 28)
  - today's line holder ("Today's line")
  - your red notch ("You")
  - friends' magenta ticks
  - Rows closer than 44 pt are pushed apart with 1 pt leader lines back to their true height.
- **"On this machine tonight":** a wall of posted clips; the best tile is 353 wide, the rest 172 x 229 in a staggered column.
- **"Regulars":** 44 pt faces with first names of opted-in adults with 3 or more visits in 30 days. "Follow the people who play here."
- **"Crews that call this home":** crew name Inter 600 17, faces, "Last together: Saturday".
- **Sticky button** 353 x 56 at the bottom: "Link my next hit here". Enabled within 50 m; otherwise "Get directions".
- **Notifications phrased as place**, one a day at most: "Sara hit above your mark at Dubai Mall." / "Omar wants you to beat his hit at Dubai Mall." / "Your replay from Saturday is ready to post." Never at night, never loss-framed.

**Craft detail:** the tower uses the same linear scale as the glass, so a player recognises their notch on the phone as the one they saw on the cabinet.

---

## 9. Competition placement

| Surface | What "best" means | Why |
|---|---|---|
| Glass, during play | Height only: bell (30-day best here), today's line, anonymous run ticks | The crowd can act on "here, today, us". No names, no ranks, no second number. A global rank would tell most walk-ups their hit was worthless in front of friends. |
| Glass, attract | Today's best score, no name | Teaches the target before anyone pays |
| Phone, Machines | The same tower with faces: bell holder, today's holder, you, friends | The social pull of a place lives here |
| Phone, Boards | Ranks by scope (This machine default, City, Friends, World) and period (This week default, All time) | Private, revisited, where ties and history matter. The weekly reset keeps it winnable. |
| Phone, Hits feed | No ranking at all | Mixing ranks into the feed turns every video into a scoreboard |
| Phone to glass | Beat this puts a friend's mark on your rail at the next linked machine | Turns phone rivalry into a credit |

Integrity: only token-kept, unflagged hits rank. A City board includes only machines within calibration tolerance of each other.

---

## 10. Brand changes (in the form the notes will use)

1. **Kept #EB1110 as the one energy colour** (the strike, the charge, you). On the dark ground it is 4.37:1, so it is never text under 72 px on the machine; small red text uses primary-300 #F26B6A.
2. **Split `--font-sans` from `--font-display`.**
   - Orbitron stays for short caps words only.
   - Inter carries sentences and the phone: the company already ships Inter; Orbitron's squared lowercase tires the eye at 36 to 48 px; Orbitron has 207 glyphs with no Arabic or Cyrillic for a Dubai launch.
   - Fonts are bundled on the cabinet because the Arial Black fallback is absent on Android and Linux kiosks and a third narrower.
3. **Added `--font-score`.**
   - Saira Extra Condensed Black in fixed 0.402 em cells as the prototype; commission 12 PunchApp Numerals on Orbitron's construction for launch.
   - Reason: the same 912 px width buys 1.9x Orbitron's cap height (92.6 mm against 49 mm), and a counting or landing number never reflows.
4. **Kept the comma** as the thousands separator in its own 84 px cell. The brief writes 999,999.000, all three launch markets read comma grouping in English, and the comma is what the digits stand on. The phone formats by locale.
5. **Added a dark ground:** ink-950 #0B0908 and ink-900 #1C1817, because neutrals-900 #221E1D reads grey in mall daylight.
6. **Fixed duplicates:** primary-800 becomes #750808; neutrals-400 becomes #C4B5B0.
7. **Deleted the supportive red set:** #D50000 is 1.21:1 against brand red, so errors and brand would be the same colour. Faults use yellow #FFAB00 plus words.
8. **Gave magenta one job:** other people's marks, on the rail and the phone. Green is phone only, for your own best going up.
9. **Deleted Secondary BG** (cool grey, redundant). Renamed Main BG to overlay-white with role steps 08 / 16 / 40 / 64 / 70. Added scrim-black 40 / 70 for text over video.
10. **Added QR tokens:** #000 on #FFF only, 14 px integer modules, never brand-tinted.
11. **Added the missing scales:**
    - machine type by distance, 344 to 36 px, 36 floor
    - phone ramp
    - geometry tokens: `MOUNT_TOP`, `READER_Y`, measure x 64 to 976, rail x 1028 to 1060, zones
    - motion tokens: `gravity 12557 px/s²`, `hitstop 50ms`, `hang 240ms`, `stamp 160ms ease-out-cubic`, `stillness 600ms`, `settle 320ms ease-out-cubic stagger 80ms`, `spring-plate 900/28/1`
    - radius: 0 on the machine, 12 on phone buttons

---

## 11. Attention-to-detail checklist (the builder must include every item)

**Figma file**
- [ ] Frames exactly 1080 x 3840 and 393 x 852. Layers named by zone (`Z0 Crown / integer / cell-1`). Zones as a locked overlay layer.
- [ ] Every machine frame labelled with its numeral count.
- [ ] M-00 zoning frame: floor heights, both sightlines, a 1.75 m silhouette, and the `MOUNT_TOP` note.

**The number**
- [ ] Integer in six 138 px cells plus an 84 px comma cell. Digits centred in cells. Ghost leading cells at 8%.
- [ ] The comma overlaps the plate by 45 px. Label cap top clears the comma tail by 23 px. Plate label and decimals share baseline 478.
- [ ] The number lands once and never moves or resizes again.

**Motion**
- [ ] Half gravity at true scale. Every fall duration comes from its distance. Rise time scales with the square root of height.
- [ ] Linear height mapping, never curved. Constant 240 ms hang for every hit.
- [ ] 50 ms hit-stop only when a line breaks. Halves fall outward to the glass edges.
- [ ] All shakes Y only. No full-field flash. One charge rise and fall per hit.
- [ ] 600 ms stillness after the last stamp before anything else enters.
- [ ] Plate twitch on the replay's contact frame. The QR never moves during it.

**Replay**
- [ ] Live camera mirrored in Armed; recording unmirrored.
- [ ] SLOW MOTION tab only while slowed. Replay opens 1,700 ms before contact, so nobody watches themselves walk up.

**QR and codes**
- [ ] V2-Q uppercase URL, 14 px integer modules, 56 px quiet zone, #000 on #FFF, square, static while live, centre at 1.20 m.
- [ ] KEPT only after server confirmation within 3 s. QR modules fall out on a keep.
- [ ] Carry-over tile keeps the same pixels in the same place. The shrinking bar has no digits.
- [ ] Letter code from 16 consonants, no V or W. Its baseline sits level with the tile bottom (y 2270).

**Queue, credits, operations**
- [ ] Queued credit: Armed within 2,925 ms of impact worst case, written on the state diagram.
- [ ] First sub-floor contact keeps the credit; the second scores 0.000.
- [ ] Today's line resets at 04:00 local. Bell is a rolling 30 days, unflagged only.
- [ ] Layout orbit 1 px within 4 px every 10 minutes. 30% after closing. Charge opacity is a per-venue setting.

**Copy and privacy**
- [ ] No names, handles, ranks or deltas on the glass. Words for counts everywhere except the score.
- [ ] Every Orbitron and Inter string on the machine fits its measure; widths listed in the file. Rewrite, never shrink.
- [ ] No em or en dashes anywhere, including layer names and the notes.
- [ ] Machine copy never says "tap" or "swipe". The payment line says "Pay at the reader".

**Phone**
- [ ] Decimals only on plates, detail and board rows. One haptic in the app, on landing.
- [ ] No counts shown to viewers. Faces and names instead. Time in words except on hit detail.
- [ ] Share renders blur bystanders and link to the machine page, never the code.

---

## 12. Notes (half-page draft; the candidate must edit every bracket to be true)

**Decisions.** I treated the panel as a 1.5 m column with two audiences at two distances. Height does the ranking, so the score is the only number on the glass. The charge rises as high as the hit deserves against this machine's month; the integer falls from above the glass under half of real gravity at true scale and lands on a plate in the one band the queue can see over the player's head. Weak hits peak behind the player's own body, and strong ones climb above heads. The code sits at chest height (1.20 m), survives the next credit, works offline, expires in a quarter of an hour, and belongs to whoever keeps it first. App players link before they hit and never scan. I split the brand type into three roles: Orbitron for short words, Inter for sentences, and a condensed numeral in fixed cells for the score, because in the same width it is 1.9x Orbitron's cap height and never jitters. I kept the red, gave magenta one job (other people), deleted the second red, and added a dark ground, scales and motion tokens.

**Validate.** Whether bystanders at 4 m can tell a good hit from the charge before the number lands. Scan success at 14 px modules in mall glare. Whether weak hitters read "REACH TODAY'S LINE" as encouragement or mockery. Whether anonymous run ticks read as the group's hits. Crown comfort for children and wheelchair users.

**Push back.** Touch was left unfilled; I designed for none. 1080 x 3840 at 1.5 m is 0.42 m wide, not 0.5, and mounting height moves every band. Three decimals are likely false precision. "One attempt and a walk-away" measures the wrong unit for groups: I would track kept hits per attempt and credits per group visit. I would ask for a physical GO AGAIN button and a bundle price set at the reader.

**AI use.** [EDIT: e.g. "I used Claude to interrogate the brief, generate and critique five directions, and script font and QR measurements with fontTools. I chose the direction, rewrote the copy, rechecked every width and timing, and rebuilt X and Y by hand after Z."]

---

## 13. Copy bank (final wording)

### Machine

**Plate labels (Orbitron 900 64):** TODAY'S BEST · HOUSE RECORD · PHONE LINKED · NO READING · NOBODY YET

**Attract:**
- RING THE
- BELL
- One credit. One hit.
- Pay at the reader to play.
- Every hit is filmed for its replay.
- Replays nobody keeps are deleted.

**Armed:**
- YOU'RE ON CAMERA
- HIT IT
- STILL YOURS

**Armed with carry-over:**
- KEEP
- LAST HIT
- Or type this at pnch.app
- (code, e.g.) KTR BVM

**Result claim:**
- KEEP
- THIS HIT
- Scan with your camera.
- No app needed.
- Or type this at pnch.app
- (code) KTR BVM

**Replay tab:** SLOW MOTION

**Scanned:**
- ON YOUR
- PHONE
- Now keep it there.

**Kept:**
- KEPT
- On a phone now.
- The code is used up.

**Linked:**
- KEPT
- Linked phone.
- No scan needed.

**Go-again headlines:**
- NOW RING / THE BELL
- REACH / TODAY'S LINE
- BEAT THE / TOP MARK
- WHO'S / NEXT?
- DEFEND / THE BELL
- GOOD / SESSION.

**Payment lines:**
- Pay at the reader to go again.
- Pay at the reader to take a turn.
- Add a credit to go again.
- Add a credit to take a turn.
- Your hits are waiting on your phone.

**Carry strip:** Earlier hit? Type KTR BVM at pnch.app

**No reading and timeout:**
- NO READING
- Your credit is still in.
- Hit again when you're ready.

**No replay:**
- NO REPLAY
- THIS TIME
- Your score still counts.

**Out of service:**
- BACK SOON
- This machine is not taking credits right now.

### Phone: claim flow

**App Clip card:**
- Your hit at Dubai Mall
- Keep the score and the replay
- Open

**Claim:**
- Not me
- TODAY'S BEST
- HOUSE RECORD
- Dubai Mall, Level 2
- Just now
- Keep this hit
- Score and replay, saved to you.
- Sign in with Apple
- Use email instead

**Claim states:**
- Someone already kept this hit.
- Ask for a copy
- This code has run out.
- Replays nobody keeps are deleted within the hour.
- Open this at the machine.
- Codes only work near the machine they came from.
- Your replay is on its way from the machine.
- Kept. Your score and replay arrive when the machine reconnects.

**Kept:**
- Kept.
- It's on your profile. Only you can see it until you post it.
- Catch my next hits here
- For a few minutes, no scan needed.
- Save the video
- Get PunchApp

**Copy request (to owner):**
- Someone who was there asked for a copy of your hit.
- Send a copy
- Not this time

**Share end card:**
- DUBAI MALL, LEVEL 2
- pnch.app/dubai-mall-2

### Phone: app

**Tabs:** Hits · Machines · Boards · You

**You:**
- YOUR BEST
- Dubai Mall, Saturday
- Home machine: Dubai Mall, Level 2
- You've been in three runs with Sara. Add her to your crew?
- Add
- Saturday night at Dubai Mall
- Three hits
- Also here that evening
- August, six visits

**Hit detail:**
- Saturday 12 September, 21:14
- Only you
- Followers
- Everyone
- Everyone includes people who play this machine.
- Felt that
- Respect
- Beat this
- Sara, Omar and others felt it.
- Beat Sara's hit
- Her score becomes a mark on your rail at the next machine you link. It lasts a week.
- Take it on
- Not now
- This is me

**Feed:**
- Near you
- Following
- Dubai Mall, tonight
- Report
- Block

**Boards:**
- This machine
- City
- Friends
- World
- This week
- All time
- The bell

**Machine page:**
- By the VR Park entrance. Open until midnight.
- The bell
- Today's line
- You
- On this machine tonight
- Regulars
- Follow the people who play here.
- Crews that call this home
- Last together: Saturday
- Link my next hit here
- Get directions

**Link sheet:**
- Link your next hit
- Your next hit at this machine goes straight to your profile. The screen shows PHONE LINKED so your friends know whose turn it is.
- Hold to link
- Ends after one hit or a minute and a half.
- Linked at Dubai Mall, Level 2. Hit when ready.
- Not me

**Enter a code:**
- Enter a code
- Which machine?
- Six letters from the screen.

**Notifications:**
- Sara hit above your mark at Dubai Mall.
- Omar wants you to beat his hit at Dubai Mall.
- Your replay from Saturday is ready to post.

Copy check: none of the strings above contains an em dash or an en dash; ranges in this document are written with "to".

# Open questions

- **Mounting height and hardware.** Bottom and top edge of the glass, pad, camera and payment reader positions. `MOUNT_TOP = 2.00 m` and `READER_Y` are assumed, and the crown's argument (score above heads) depends on them. Is the panel one 9:32 LCD, or two stacked panels with a seam near y 1920 (which would cut the QR tile at y 1808 to 2270)?
- **Touch.** The brief left it unfilled. The spec designs for none. Confirm, and whether any physical button or light strip exists.
- **Pixel geometry.** Is the 0.5 m width cabinet width (square 0.39 mm pixels, as assumed) or are the pixels non-square? If they are non-square, glyphs are 18% wider in reality and every width must be rechecked.
- **Sensor.** Latency from impact to value (the spec needs under 400 ms), real resolution and repeatability (are three decimals meaningful?), the sub-floor threshold, and the real score distribution (median against the 30-day bell). If most walk-up hits land under a quarter height, consider "best this week" as the bell and A/B it.
- **Separator.** The comma was kept (brief wording, English locale in Tampa, Dubai, London), against one judge's gap graft. Confirm locales and whether Arabic UI is in scope.
- **Code expiry.** The code is live 15 min and unkept video is deleted at 60 min. A phone with no signal in a basement mall may lose its hit. Decide whether to lengthen the window to the hour, and get legal sign-off on retention and recording consent per market (GDPR, UAE PDPL, minors).
- **Android web claim.** It has no location check, so a photographed code posted online can be kept from home within 15 minutes. Accept the risk, or require location permission on web?
- **Payment.** Coin, card or app tokens? Can the app pay (which would make linking automatic)? Are bundles possible at the reader? This decides the payment line variant.
- **NFC and connectivity.** Can the cabinet take a static NFC sticker? What is venue uplink bandwidth, and can the proxy clip reach phones within about 3 s?
- **Run grouping.** Credits within 60 s join a run, so a stranger in the queue can join a group's run. Anonymous ticks limit harm, but the WHO'S NEXT? copy may address the wrong people. Field test.
- **Near-miss honesty.** REACH TODAY'S LINE after a very weak hit may read as mockery for children in family groups. The go-again copy needs a per-venue switch; test before launch.
- **Brand owner.** Will they accept a separate numeral face (and fund the 12-glyph commission)? The fallback is Orbitron 900 in fixed cells at 174 px (cap 49 mm), with the same choreography but half the number's height. Are Poppins and the magenta secondary being retired?
- **Wellbeing cap values.** 5 linked hits in 15 minutes is a placeholder; confirm with operators and any injury data.
- **Deliverable scope.** Confirm the panel accepts a 9.0 s clip at 1080 x 3840 60 fps, plus stills for the weak and house-record variants, and that seven phone frames plus the App Clip card is the right depth.
- **Notes.** The AI-use paragraph in section 12 is a placeholder and must be rewritten to describe what was actually done.