# Proposal: Ring the Bell  (propose:spectacle)

## thesis

The cabinet is a 1.5 m column, so treat it like the oldest strength tester there is: the fairground high striker. Every hit sends a red charge up the full height of the glass, exactly as high as the hit deserves against this machine's best hit of the month. That best hit is the bell at the top, in the one strip the queue can see over the player's head. Only once the height has given the verdict does the score fall in from above the glass and slam onto a plate at the top of the column, hard enough to knock the charge back down. Height does the ranking, so the score stays the only number on the glass. There is one heavy impact per hit, and every motion uses half of real gravity at the panel's true scale, so the weight is physical and not a tween. Everything after the slam (replay, keep, go again) is quiet and waits below it.

## machine_flow

## Figma frames
Machine, 1080 x 3840: M0 Attract, M1 Armed, M2 Charge at apex, M3 Landing frame, M4 Result with Today's best (the hero frame), M5 Result for a weak hit, M6 House record, M7 Kept, M8 Afterglow, M9 No reading. Phone, 393 x 852: P1 to P8 (see phone).

## Fixed geometry (every state)
- Physical assumptions: glass bottom at 0.5 m and top at 2.0 m. 2.56 px per mm, so floor height = 2.0 m minus y/2560.
- Ground: ink-950 #0B0908. Content measure runs x 64 to 976 (912 px). Rotated rail labels sit in x 990 to 1022. The **rail** is x 1028 to 1060 (32 px wide, 20 px from the glass edge).
- **Crown**, y 0 to 504 (2.00 to 1.80 m): the integer's baseline is y 352 and its cap runs y 115 to 352. The **plate** is y 364 to 504 and runs x 64 to 1060, so the rail hangs from it. Plate, rail and base strip form one frame around the content.
- Bell icon: x 1024 to 1064, y 512 to 552. The rail runs y 560 to 3720. Tower scale: `h = score / bell score`, and a hit's mark sits at `y = 3840 - h x 3280`.
- **Replay**: x 64 to 976, y 552 to 1768 (912 x 1216, 3:4, 475 mm tall, near life size), floor 1.78 to 1.31 m.
- **Claim**: y 1832 to 2228. The QR tile is x 64 to 460 (centre y 2030, floor 1.21 m, chest height). The copy column is x 508 to 976.
- **Go again**: y 2376 to 2660.
- **Runway**, y 2660 to 3720 (floor 0.96 to 0.55 m): kept empty on purpose. Bodies block it, it sits 45 degrees below a player's eye line, and it is the charge's launch tube. It holds only the carry-over code line (y 3440 to 3530) and the recording notice (baselines y 3600 and 3648).
- **Base strip**: y 3720 to 3840. #5E0606 at rest, #EB1110 on impact.
- Type: numerals in Saira Extra Condensed 900, fixed cells. The integer is 344 px, with 138 px digit cells and an 84 px comma cell (912 px total). Decimals are 120 px, with 48 px cells and a 29 px point cell. Words use Orbitron 900 caps at +4% tracking. Sentences use Inter 600 or 700. Nothing is smaller than 36 px.

## S0 Attract (loops until a credit)
Purpose: teach the bell before anyone pays, and show the number to beat.
- Crown: today's best integer in white. Plate raised #1C1817, label `TODAY'S BEST` (Orbitron 900, 72 px, x 96, baseline y 478), decimals right-aligned to x 976 on the same baseline. If nobody has played today: ghost cells `000,000` at white 8% and the plate label `NOBODY YET`.
- Replay: a loop of today's top hits whose owners opted in. Otherwise a staff demo hit.
- Claim zone: `RING THE` / `BELL` in Orbitron 900 104 px (baselines y 1907 and 2019), then `One credit. One hit.` in Inter 700 48 px (baseline y 2112).
- Rail: the bell, plus the TODAY tick (6 px, white 40%) with `TODAY` rotated beside it (Orbitron 700 36 px, white 64%).
- Runway: `Every hit is filmed for its replay.` / `Replays nobody keeps are deleted.` (Inter 600 36 px, white 60%).
- Ends on the event: credit accepted.

## S1 Armed
Purpose: hand the stage to this player.
- 0 to 300 ms: today's best lifts out through the top of the glass (ease-in quad). Ghost cells `000,000` fade in at 8%. The plate is empty.
- Replay frame: live camera, mirrored, with the tab `YOU'RE ON CAMERA` (Orbitron 700 40 px, x 96, baseline y 616, on #0B0908 at 70%).
- Claim zone: `HIT IT` in Orbitron 900 160 px (499 px wide), baseline y 1947.
- Rail: the bell, the TODAY tick, run ticks (up to six, see go_again) and magenta challenger ticks if the phone is linked. If the phone is linked, the plate label reads `PHONE LINKED`.
- Runway: the previous player's carry-over line `Missed the scan?` / `Type KTR BVM at pnch.app` (Inter 700 44 px) until its 60 s window ends.
- Ends on the strike event. There is no timeout. After 90 s, `HIT IT` becomes `STILL YOURS` (104 px). The credit is never lost.

## S2 Impact, 0 to 120 ms
Purpose: prove the machine felt it before the score exists.
- The canvas jolts up 16 px. The camera frame cuts to black for one frame. `HIT IT` falls out under gravity. The base strip flares to #EB1110.
- Ends on the score event from the sensor. If there is no valid reading by 400 ms, go to F1.

## S3 Charge, from 120 ms to apex plus 240 ms (rise takes 180 to 736 ms)
Purpose: the height gives the verdict to the whole crowd, including people standing directly behind the player.
- A full-bleed #EB1110 field rises from y 3840, led by a 16 px white edge line. The TODAY line extends across the full width at its height, and snaps when the charge passes it. The rail fills in step. A 40 x 10 px white notch is stamped on the rail at the apex.
- Crown: ghost cells brighten from 8% to 18% during the hang. The plate is empty.
- Ends on a timer.

## S4 Drop, 447 ms (247 ms fall plus 200 ms impact)
Purpose: the number lands. Ends on a timer. See reveal_motion.

## S5 Drain and verdict, up to 688 ms (scales with apex height)
- The charge falls. Decimals stamp in at landing plus 140 ms.
- Special states only: the plate fill wipes out from the centre at landing plus 280 ms, and the label stamps at landing plus 460 ms.
- Ends when the charge edge reaches y 3840.

## S6 Settle, 640 ms
The replay frame, claim card and go-again block each fade in while rising 24 px (320 ms, ease-out cubic), 80 ms apart. Ends on a timer.

## S7 Result, 24 s (hero frame M4: 736,582.240 against a bell of 812,406)
- **Crown**: `736,582` in white. The comma overlaps the plate by 45 px so the digits stand on it. The plate is #EB1110 with `TODAY'S BEST` in white. `.240` is right-aligned to x 976. Label and decimals share baseline y 478.
- **Rail**: red from y 3720 up to the notch at y 866. The gap from the notch up to the target (here the bell, y 560) is white 40%. The TODAY tick at y 1196 sits under the red.
- **Replay**: loops every 4.8 s. An 8 px red progress line runs along y 1760 to 1768, with a 4 px white tick at the contact frame.
- **Claim**:
  - QR: Version 2-Q, 25 modules at 12 px, a 48 px (4 module) quiet zone, #000 on #FFF.
  - `KEEP` / `THIS HIT` in Orbitron 900 88 px (baselines y 1895 and 1991).
  - `Scan with your camera.` / `No app needed.` in Inter 600 40 px (y 2063 and 2115).
  - `Or type this at pnch.app` in Inter 600 36 px at 70% (y 2171).
  - `KTR BVM` in Orbitron 900 64 px at +8% tracking (y 2228, level with the tile bottom).
- **Go again**: `NOW RING` / `THE BELL` in Orbitron 900 104 px (y 2451 and 2563). Then `Tap your card to go again.` in Inter 700 48 px (y 2643) with a 64 px arrow toward the reader. On coin cabinets the line reads `Add a credit to go again.`
- **Runway**: recording notice. Base strip at #5E0606.
- **Ends**:
  - 24 s timer: go to S9.
  - Credit inserted: go to S1. The QR leaves within 300 ms because the next swing happens right in front of it, and the code carries over as letters.
  - Claim succeeds: go to S8.
- Variants:
  - M5, weak hit (204,118.506, h 0.25): notch at y 3016, raised plate with no label, go again `REACH` / `TODAY'S LINE`, gap segment from y 3016 up to 1196.
  - M6, house record: the crown ground turns #EB1110, the plate turns #0B0908 with `HOUSE RECORD` in white (never a white plate, which would hide the comma), the bell icon swings, and go again reads `DEFEND` / `THE BELL`.

## S8 Kept, 6 s
- The QR modules fall out of the tile: each drops 300 px under gravity after a random 0 to 200 ms delay, over 500 ms. The tile turns solid white with `KEPT` in Orbitron 900 104 px #000, centred.
- The copy column becomes `On a phone now.` (Inter 700 48 px, y 1895) and `The code is used up.` (Inter 600 40 px at 70%, y 1951).
- Ends on a 6 s timer (go to S9), so a claimed hit frees the glass early. A credit goes to S1.

## S9 Afterglow, 8 s
- The replay freezes on the contact frame at 30%. The QR tile collapses (240 ms) and the carry-over line `Missed the scan?` / `Type KTR BVM at pnch.app` appears in the runway (baselines y 3476 and 3530) and stays 60 s across S0 and S1.
- Ends: an 8 s timer (go to S0; today's best fades back into the crown over 240 ms, with no slam) or a credit (go to S1).

## F1 No reading
- The charge never launches. The plate reads `NO READING`. The claim zone reads `Your credit is still in. Hit again.` (Inter 700 48 px, y 1947).
- Ends after 2.5 s: go to S1 with the credit not consumed.

Time from contact to a readable number: 1.0 to 1.4 s. Fully settled: 2.2 s (weak hit) to 3.0 s (record).

## reveal_motion

## Physics constants
- Stage gravity is 0.5 g at true panel scale: 4.905 m/s² x 2,560 px/m = **12,557 px/s²**. Every duration below comes out of a distance.
- Rise = ease-out quad (exact ballistic). Fall = ease-in quad. Stamp = 160 ms ease-out cubic, scale 1.3 to 1.0.
- Plate spring: stiffness 900, damping 28, mass 1 (damping ratio 0.47, two visible overshoots).
- Motion smear on the charge edge = velocity / 120 px (a 180 degree shutter at 60 fps).

## Clip
MP4, H.264, 1080 x 3840, 60 fps, **9.0 s**. The hit is 736,582.240 against a bell of 812,406 (h 0.907, apex y 866, TODAY line y 1196). Clip time is shown first, with t from contact in brackets.

| Clip ms | What moves | Physical logic |
|---|---|---|
| 0 to 600 (t -600) | Nothing. Armed screen: ghost cells, empty plate, live camera frame, `HIT IT`. | Stillness is the anticipation. |
| 600 (t 0) | Whole canvas jolts up 16 px in 50 ms (ease-out cubic), returns in 200 ms (ease-out back, +3 px overshoot). Camera frame cuts to black. `HIT IT` falls. Base strip flares #EB1110. | The machine answers within one frame, before the score exists. Energy goes up the column. |
| 720 (t 120) | Charge launches from y 3840: v0 8,642 px/s, 688 ms to apex. 16 px white edge with a 72 px smear shrinking to 0. TODAY line draws across full width in 120 ms. Rail fills in step. | Launch speed is set by the score, so a weak hit is brisk and a big one climbs longer. No two hits share a timing. |
| 1179 (t 579) | Edge crosses TODAY at y 1196. The line splits at x 540, each half rotates 6 degrees about its outer end and falls under gravity, fading over 400 ms. | A target visibly broken, readable from 4 m. |
| 1408 (t 808) | Apex at y 866. Edge thickens from 16 to 28 px (120 ms). Rail notch stamps. | Velocity hits zero, so the smear is gone. |
| 1408 to 1648 | **Hang, 240 ms.** Only the ghost cells move, brightening from 8% to 18%. | The inhale. Hang time is identical for every hit, so a near miss never gets extra drama. |
| 1648 (t 1048) | **The integer is released** from baseline y -30, fully above the glass. It falls 382 px in 247 ms. Stretch runs up to scaleY 1.06 and scaleX 0.97 in proportion to speed. | The only object in the whole flow that enters from outside the glass. |
| 1895 (t 1295) | **Landing.** One frame at scaleY 0.88 and scaleX 1.05, anchored at the baseline. Plate spring kicked at 950 px/s: +18 px at 41 ms, then -7, +3, settled by 450 ms. The integer rides the plate. Canvas shake at 50 ms steps: +22, -12, +6, -2, 0 px. Plate top edge flares from 4 to 12 px and back over 200 ms. | Impact at 3,098 px/s (1.2 m/s real). Mass shows as squash, a sprung surface and a panel that moves. |
| 1911 to 2211 | Digits recover: to 1.04 / 0.99 over 100 ms (ease-out quad), then to 1.0 over 200 ms (ease-in-out sine). | Recoil, then settle. |
| 2035 (t 1435) | `.240` stamps into the plate. Plate gets a 180 px/s kick. | Small things are stamped, not dropped. The motion hierarchy matches the number hierarchy. |
| 2095 (t 1495) | **Drain**: the charge falls from y 866 to 3840 in 688 ms (ease-in quad). Rail stays red to the notch. | Caused by the slam, starting 200 ms after it and never before. |
| 2175 to 2355 | Plate fill wipes from #1C1817 to #EB1110, outward from x 570 over 180 ms (ease-out cubic). | The state spreads from the point of impact. |
| 2355 (t 1755) | `TODAY'S BEST` stamps. Plate gets a 180 px/s kick. | Second small beat. |
| 2783 (t 2183) | Charge reaches the floor. Base strip flares, then decays to #5E0606 over 300 ms. | The splash. |
| 2783 to 3423 | Replay, claim card and go-again block each rise 24 px and fade in (320 ms, ease-out cubic, 80 ms stagger). The rail gap segment fades in last. | Deliberately quiet. |
| 3103 | Replay plays: 1.7 s at real time, 2.4 s at 0.25x around contact, 0.7 s at real time. | |
| 6003 | Contact frame in the replay. Plate twitch (250 px/s kick, about 5 px). Rail notch pulses from 10 to 12 px and back. The QR never moves. | Ties that punch to that number. |
| 6003 to 9000 | Slow motion finishes. Result holds. | |

## What the big number does, and why it reads as an event
- **Withheld.** It is held back for 928 ms after the score is known, so the crowd reads "big" from the height first and the number confirms it.
- **Falls.** It falls under stated gravity instead of fading or counting. Orbitron-style digit rolling would jitter anyway, because its "1" is 47% the width of its "0".
- **Has consequences.** It flexes the plate, shakes the panel and knocks the charge down. Cause and effect is what separates an event from an animation.
- **It is the only heavy motion.** Everything after it is small or quiet.
- **Huge.** 237 px cap = 92 mm, which is 79 arcmin at 4 m and 212 arcmin at 1.5 m. That is four times the comfortable reading threshold for the far spectator.
- **House record variant.** The charge hits the plate from below at 479 ms (plate kicked 26 px up, bell swings ±18 degrees over 900 ms) and floods the crown to the top of the glass. The number then lands on a black plate in a red crown.
- **Phone echo.** Same curves at phone scale: a 120 pt fall in 180 ms, a one-frame squash of 0.90 / 1.04, and one `.heavy` haptic on landing.
- **Presentation cut.** A 16:9 version shows the column beside a 1.75 m silhouette at true scale, so reviewers judge size the way a person in the mall would.

## handoff

## Primary path: scan the glass
- **URL.** The QR encodes `HTTPS://PNCH.APP/C/KTRBVM` (26 characters). Uppercase lets the encoder use alphanumeric mode, which keeps it at Version 2-Q. The server and the App Clip experience are registered for the uppercase path.
- **Size.** 12 px integer modules, 117 mm code, reliable to about 1.2 m. Black on white, never animated or tinted while live, never over video.
- **Placement.** Centred at 1.21 m from the floor: chest height, where a phone is naturally raised.
- **On screen** from S6 to the end of S7, about 24.5 s.
- **iPhone without the app.** The Camera shows the **App Clip card**:
  - Header image: the landing frame.
  - Title `Your hit at Dubai Mall`, subtitle `Keep the score and the replay`.
  - P2 opens on the replay, starting 1.5 s before contact, with the number dropping onto it at the contact frame.
  - `Keep this hit` uses Sign in with Apple, with `Use email instead` below.
  - If the player skips sign-in, the hit is held on the device for 7 days, and App Clip data carries into the full app on install.
- **Android.** A web claim page with the same layout, held by a signed token and a cookie.
- **Never gated.** Nothing about the score or clip requires installing the app. The App Store overlay `Get PunchApp` appears only after a keep.

## Fallbacks
- **The scan fails.** The letters under the tile: `KTR BVM` at pnch.app.
  - Codes are six letters from 18 consonants (B C D F H J K L M N P R S T V W X Z): no digits, so the score stays the only number on the glass; no vowels, so no words; no O, Q or G, which look alike in Orbitron's squared forms.
  - The code is valid only together with its machine. pnch.app suggests the nearest machine by location, or the player picks from a list. That gives 34 million combinations per machine against about 15 live codes, plus 5 attempts per minute per device.
- **The player has already walked away, or a new credit arrived.** The QR leaves the glass immediately, because the next player is swinging in front of it. The letters stay in the runway for 60 s (`Missed the scan?` / `Type KTR BVM at pnch.app`) and can be photographed from 2 m.
- **Machine offline.** The code still issues. The claim page says `Your hit is on its way from the machine` and completes when the cabinet syncs.

## What the machine shows on success
- The QR modules fall out of the tile under gravity (500 ms), so a dead code never looks alive.
- The tile becomes white `KEPT`, with `On a phone now.` / `The code is used up.` beside it.
- The glass holds 6 s, then goes to Afterglow.
- No handle or name ever appears on the glass by default.

## Expiry and privacy
- **One code, one hit.** A code is single use, bound to one attempt and one machine, and live for **15 minutes** from landing.
- **Unkept replays are deleted** when the code expires. The score survives only as an anonymous machine statistic, which can still set today's line.
- **The claim page shows the replay**, so the person sees who is in it. `Not me` (top right) releases the hit: the QR is reissued if the result is still showing, otherwise the letters work again for the rest of the 15 minutes.
- **A kept hit is private by default.** Posting to Hits is a separate tap. Appearing in the attract loop is a separate opt-in. Posting is disabled for under-16 accounts. No face recognition anywhere.
- **The code on the glass beats the phone in the pocket.** Any provisional phone claim is overridden by a physical scan within 60 s.

## Players who already have the app
- **Scan.** The universal link opens the app already signed in, with **zero taps**: `Kept.` appears with the landing replay, and `Not me` stays available for 60 s.
- **Link before hitting.** Tap the NFC tag on the cabinet's side panel at 1.2 m (`Tap your phone here before you hit`), or use `Link my next hit here` in the app within 50 m.
  - The plate reads `PHONE LINKED`. The rail shows the player's own best as a white `YOU` tick and friends' challenges as magenta ticks.
  - No QR appears. The tile reads `KEPT` the moment the number lands.
  - A foregrounded phone fires one heavy haptic on landing. A backgrounded phone gets a Live Activity update within about a second.
  - A link covers one hit only. If a friend took the swing, `Not me` reissues the QR while the result is still showing.
- **Consecutive hits.** After a keep, the toggle `Catch my next hits here` lets hits for the next few minutes land on the phone with no scan. The App Clip uses its 8-hour notification permission; the full app uses a Live Activity. The physical-scan override still applies.

## go_again

## Mechanic: the next line
Every result names **exactly one target above the hit**, shows the real gap on the rail, and asks for a credit right beside it. The target is the first that applies:
1. **A higher tick in the current run** (a friend beat you): `BEAT THE` / `TOP TICK`
2. **Today's line**, if you are below it: `REACH` / `TODAY'S LINE`
3. **The bell**, if you beat today's line: `NOW RING` / `THE BELL`
4. **You set the house record**: `DEFEND` / `THE BELL`

The sub line is always `Tap your card to go again.` (Inter 700 48 px) with an arrow at the physical reader. On the rail, the segment from your red notch up to the target turns white 40%, so the gap has a true length and no figure.

## Runs: selling it to the group
- **Forming a run.** A credit inserted during a Result, or within 60 s of a landing, joins the run. Each hit leaves a tick on the rail: 32 x 6 px at white 40%. The run's top tick is white and 10 px. The newest hit is the red notch. There are at most six ticks, and they fade after 90 s with no credit.
- **Ticks are anonymous on the glass.** The group knows whose is whose because they watched. A stranger accidentally joined to a run learns nothing.
- **The ladder is visible from 4 m.** The friends behind see a ladder of their own hits growing up a 1.3 m rail. The one with the lowest tick is looking at a named target with the next friend's name implicitly on it. The one on top sees `BEAT THE TOP TICK` addressed to everyone else.
- **Spectacle scales with height.** A higher hit climbs longer, breaks the TODAY line and slams harder, so the next person wants their own bigger landing, not just a higher number.
- **The phone extends it.** A `Beat this` reaction pins a friend's score as a magenta tick on your rail the next time you link at any machine. The challenge follows you back to the glass.

## Why a player wants a third go
- The first hit teaches the bell.
- The second usually beats the first. A second hit's notch lands above the first's tick, which is visible progress without a number.
- The third is aimed at a specific line the screen named.
- Keep and go again sit side by side. The keep is above the ask, so paying never covers saving.

## Honest accounting
**Motivating:**
- Goal proximity toward a real, visible, reachable target (the bell is a rolling 30-day best, not an all-time freak).
- Rivalry among friends who chose to play together.
- Skill, not chance: nothing is random.

**Manipulative, with what I refuse to do:**
- **Near misses.** A bell near-miss uses the same psychology gambling does. So the height mapping is strictly linear and true, and the apex hang is a constant 240 ms: no slowdown, zoom or `SO CLOSE` when a hit stops just under the bell.
- **Run rivalry.** Runs exploit group rivalry to sell credits. So runs reset after 90 s and there is no sunk-cost ladder that survives a break.
- **No pressure patterns.** No countdown to pay, no timed discount, no `don't lose your streak` loss framing, no bonus for a double-or-nothing re-hit.
- **The far-target case.** Showing the gap to today's line after a very weak hit is still pressure. The copy only names the target and never characterises the gap. I'd test whether weak hitters read it as encouragement or as mockery.

## phone

## Platform
iOS, iPhone 16, **393 x 852 pt** frames. Safe areas: top 59, bottom 34. Tab bar 49 pt plus the home indicator. Android gets the claim page as web only for this exercise.

**Type**
- Scores: Saira Extra Condensed 900 in fixed cells.
- State labels: Orbitron 900 caps, 13 to 15 pt, +6% tracking.
- UI: Inter 17 / 15 / 13, titles 28 / 34.

**Colour**
- Ground #0B0908, raised #1C1817.
- #EB1110 is you and primary actions. Small red text uses #F26B6A.
- Magenta #D842D3 is other people's marks.
- Green #00C853 only when your own best goes up.

**What changed from the current app**
- `987654.321 Score` becomes `987,654` with `.321` on a plate; the unit suffix is gone.
- View, like and comment counters are removed from cards; faces and names replace counts.
- The podium is replaced by one bell row.
- Global / National / Regional becomes This machine / City / Friends / World, with the machine first.
- The reel is grouped by visit instead of an endless identical grid.
- The Record Holders row folds into the machine page.

**Information architecture**
- Tabs: **Hits**, **Machines**, **Boards**, **You**.
- The claim flow (App Clip or deep link) sits outside the tabs.

## P1 App Clip card (system sheet over the Camera)
- Header: the landing frame, 1800 x 1200 px.
- Title `Your hit at Dubai Mall`, subtitle `Keep the score and the replay`, button `Open`.

## P2 Claim
- **Replay** y 0 to 524 (3:4). Scrims: top 0 to 100 at black 40%, bottom 344 to 524 from 0 to 70%. `Not me` Inter 600 15 pt, right-aligned to x 373, baseline y 82.
- **The number** drops at the contact frame: Saira XC 900 128 pt in 51 pt cells with a 31 pt comma (337 pt wide), x 20, baseline y 516. One heavy haptic on landing.
- **Plate** y 524 to 580, full-bleed. Label `TODAY'S BEST` Orbitron 900 15 pt at x 20. Decimals Saira 40 pt right-aligned to x 373. Shared baseline y 566.
- **Place and time**: `Dubai Mall, Level 2` Inter 600 17 (y 612), `Tonight at 21:14` Inter 400 15 at 64% (y 636).
- **Keep**:
  - `Keep this hit` Inter 700 28 (y 684).
  - `Score and replay, saved to you.` Inter 400 15 (y 710).
  - Sign in with Apple, 353 x 56, y 732.
  - `Use email instead` Inter 600 15 (y 814).
- One left edge (x 20) throughout.

## P3 Kept
- The replay keeps looping above.
- `Kept.` Inter 700 34 (y 624).
- `It's on your profile. Only you can see it until you post it.` Inter 400 15.
- Switch row y 704 to 752: `Catch my next hits here`, with `For the next few minutes, no scan needed.` below.
- `Save the video` secondary button, y 768 to 816. It renders a 1080 x 1920 share cut with the drop and the plate burned in.
- The system `Get PunchApp` overlay arrives after 2 s.
- Lock screen (full app): a Live Activity reading `At Dubai Mall` with the latest integer at 40 pt and its plate label. The Dynamic Island compact view shows only the integer.

## P4 You (profile and reel)
- **Header**: `@rami.k` Inter 700 28 (y 140), avatar 44 pt right. `Home machine: Dubai Mall, Level 2` Inter 400 15 at 64%.
- **Best**: `YOUR BEST` Orbitron 900 13 pt #F26B6A. Integer Saira 96 pt (39 pt cells). Raised plate reads `Dubai Mall, Saturday` on the left, decimals 32 pt on the right.
- **Reel grouped by visit**, because hits come in bursts:
  - Header `Saturday night at Dubai Mall` Inter 600 17, then `Three hits` Inter 400 15.
  - The best hit of the visit is a large 353 x 470 tile, score 56 pt on a scrim.
  - The others are 72 pt rows: 48 x 64 thumbnail, score Saira 32 pt, `21:16` Inter 15, and at the right a stack of reactor faces (24 pt, overlapping 8 pt).
- Uneven rhythm comes from the structure itself, not from decoration.
- A 393 x 2000 scroll frame documents the full reel.

## P5 Hit detail
- **Video**: 9:16, 393 x 699. The number drops at contact: 104 pt integer, baseline y 690. Plate y 699 to 747.
- **Place and time**: `Dubai Mall, Level 2` Inter 600 15, `Saturday 12 September, 21:14` Inter 400 13.
- **Reactions**, a right-hand stack of 48 pt buttons at y 440, 512 and 584, each labelled in Inter 600 11:
  - `Felt that`: the card shakes 6 pt over 240 ms with a light haptic.
  - `Respect`: a glove tap.
  - `Beat this`: pins the score as a magenta tick on your rail at the next machine you link.
- No counts anywhere, only faces: `Sara, Omar and others felt it`.

## P6 Hits feed (the social layer)
- **Video**: full-bleed, paging vertically.
- **Tabs**: text tabs `Near you` / `Following` (Inter 600 17, 2 pt underline on the active tab, no pills).
- **Scoring**: every video replays its own landing as it scrolls into view. Integer 88 pt baseline y 668, plate y 676 to 716.
- **Who and where**: handle Inter 700 17, then machine and time in words (`Dubai Mall, tonight`).
- **Default scope**: machines you've played, then your city, so the people you see are people you could meet at the cabinet.

## P7 Machine page (feeling connected to the people who use it)
- **Header**: `Dubai Mall, Level 2` Inter 700 28, `By the VR Park entrance. Open until midnight.`
- **The tower** y 176 to 616: a 12 pt rail using the cabinet's grammar, with marks at their true heights:
  - The bell holder (avatar, `@luna.k`, `House record`, score 28 pt).
  - Today's line holder.
  - Your red notch.
  - Friends' magenta ticks.
  - Rows closer than 44 pt are pushed apart, with leader lines back to their true height.
- **`On this machine tonight`**: a wall of opted-in hits, the best tile wide.
- **`Regulars`**: faces and first names of people who play here often and allow it.
- **Crews** carry a home machine.
- **Notifications are phrased as place**: `Sara hit above your mark at Dubai Mall.`
- **Sticky button**: `Link my next hit here`, enabled within 50 m.

## P8 Boards
- **Tabs**: scope `This machine` / `City` / `Friends` / `World`; period `This week` / `All time`.
- **Bell row** (the one editorial moment): 84 x 112 replay thumbnail, handle, place, score 44 pt.
- **Rows**, 60 pt each: rank Inter 600 15, tabular, white 40%; avatar 36; handle; place; score Saira 28 pt right-aligned.
- **Your row** is sticky above the tab bar with a red 4 pt notch.
- No podium, no deltas. Ranks appear on this screen only.

## competition

**Glass: local and wordless.**
- The machine answers "who's best here" with height alone:
  - The bell is this machine's best hit of the last 30 days (rolling, so it stays reachable and fresh).
  - The TODAY line is today's best.
  - Run ticks are this group, right now.
- No names by default. No global or national ranks, no rank numerals.
- Why: a mall visitor can only relate to the people standing there, and a global rank on a 1.5 m screen would tell 99% of players their hit was worthless in front of their friends. Height shows everyone where they stand without a second number. The only named person the glass can ever show is the bell holder in the attract loop, and only if they opt in.

**Phone, machine page: named and local.**
- The same tower, with faces on the marks: who holds the bell, who holds today, where you and your friends sit.
- This is where the social pull of a place lives: regulars, the wall, crews with a home machine.

**Phone, Boards: the only surface with ranks.**
- `This machine` is the default scope, then `City`, `Friends`, `World`.
- `This week` resets Monday 06:00 local, so ordinary players can win something. `All time` exists but is one tap down.
- The three decimals appear here, because this is where ties happen.

**Phone, Hits feed: no ranking at all.**
- The feed is for watching and reacting. Mixing ranks into it turns every video into a scoreboard and every scroll into a comparison.

**Phone to glass.**
- `Beat this` puts a friend's mark on your rail at the next machine you link. That is the bridge that turns phone competition into a credit.

## brand

## The measured case on the hero typeface
Orbitron 900 (fontTools, 1000 units per em):
- Digit advance is 0.834 em against a 0.72 em cap height, so a digit is wider than it is tall.
- There is **no `tnum` feature**. The "1" is 0.391 em, so `111,111.111` is 3.995 em while `888,888.888` is 7.982 em.

On the 912 px measure, with fixed cells so nothing reflows:

| Setting | Size | Cap | At 1.5 m | At 4 m | Share of panel height |
|---|---|---|---|---|---|
| Orbitron 900, full `888,888.888` | 114 px | 82 px, 32 mm | 74 arcmin | 28 arcmin | 2.1% |
| Orbitron 900, integer only | 174 px | 125 px, 49 mm | 112 arcmin | 42 arcmin | 3.3% |
| **Saira Extra Condensed 900, integer** | **344 px** | **237 px, 92 mm** | **212 arcmin** | **79 arcmin** | **6.2%** |

**Verdict.** Orbitron's six digits plus decimals do fit, and they are technically legible at 4 m (28 arcmin clears the 20 arcmin comfortable threshold). But at 2% of the column they are a readout, smaller than the `HIT IT` prompt. The limit is width, not height: a wide face on a column that is 0.28 times as wide as it is tall.

**Rejected alternatives.**
- Squashing Orbitron horizontally to 0.55: its 153-unit stems would become 84 wide against 153-tall horizontals, reversing the stroke contrast.
- Rotating the number to run up the column: slow to read sideways.
- Splitting the number over two lines: `736` / `582` reads as two numbers.

**Decision.** Numerals get their own face, and Orbitron keeps every word.
- **Prototype**: Saira Extra Condensed 900. Stem is 0.224 of cap height against Orbitron's 0.212, so it has the same colour at distance, with a related squared-round construction. Digits run 0.36 to 0.40 em, set in 0.402 em cells.
- **Launch**: commission **PunchApp Numerals**, 12 glyphs (0 to 9, comma, point) drawn on Orbitron's construction at a fixed 0.40 em advance.
- **Pitch to the brand owner.** Sports own their numerals. The score is the product. The same width buys 1.9x the cap height with zero jitter while counting. Orbitron still speaks every word on the glass, and the red does the rest. I'd bring a 1:1 print of both settings and read them together from 4 m.

## Keep
- **#EB1110** as the one energy colour: the charge, the TODAY'S BEST plate, your notch. On #221E1D it is only 3.63:1, so it is never text under 72 px on dark; small red text uses primary-300 #F26B6A.
- **Orbitron 900 and 700** for caps labels of three words or fewer (plates, headlines, rail labels), at +4% tracking on the machine and +6% on the phone.
- **White opacity steps**, reassigned to roles: 8% ghost cells, 16% rail track, 40% gap and ticks, 64% secondary text.

## Replace
- **`--font-sans: Orbitron` becomes Inter.** The live app and site already ship Inter, and Orbitron's squared lowercase tires the eye at 36 to 48 px. I'd ask whether Poppins on the landing page is being retired.

## Extend
- **Dark ground**:
  - Add ink-950 #0B0908 (base) and ink-900 #1C1817 (plates).
  - neutrals-900 #221E1D is only 1.27:1 against black and reads grey in mall daylight.
- **Machine type scale** (px):
  - Numerals: 344 integer, 120 decimals.
  - Orbitron: 160 prompt, 104 headline, 88 claim, 72 plate.
  - Inter: 48 and 44 sentences, 40 and 36 notes.
  - 36 is the floor.
- **Phone scale** (pt): numerals 128 / 104 / 96 / 88 / 56 / 32 / 28; Inter 34 / 28 / 17 / 15 / 13 / 11.
- **Motion tokens**: `gravity 12557 px/s²`, `hang 240ms`, `stamp 160ms ease-out-cubic`, `settle 320ms ease-out-cubic, 80ms stagger`, `spring-plate 900/28/1`.
- **Geometry tokens**: measure x 64 to 976, rail x 1028 to 1060, plate y 364 to 504, plus the floor-height bands. The team argues in these, not adjectives.
- **QR token**: #000 on #FFF only, never brand-tinted.
- **Scrims for text over video (phone only)**: black 40 / 70 / 80%.

## Argue against or delete
- **Supportive red #D50000.** It is 1.21:1 against brand red, so every error would read as brand. Delete it. Failures use yellow #FFAB00 plus words.
- **Duplicates.** primary-700 equals 800, and neutral-300 equals 400. Rebuild both ramps.
- **Secondary-bg cool greys.** At 10% they composite within two levels of main-bg, and they are cool over warm neutrals. Delete.
- **Magenta #D842D3** gets one job: other people's marks (friends' ticks, challenges), on the rail and the phone. Never on plates or buttons.
- **Green #00C853** is phone only: your own best going up.

## detail_touches

- **Gravity at true scale.** Half of real gravity at the panel's 2.56 px/mm (12,557 px/s²), so a drop's duration comes from its distance: the integer's 382 px fall takes 247 ms.
- **Timing follows the score.** Rise time scales with the square root of the hit's height, so no two reveals share a timing.
- **Fixed cells.** Saira's "1" (0.287 em) is centred in a 0.402 em cell, so nothing reflows. Leading ghost zeros at 8% show magnitude: a three-digit hit lights only the right half.
- **The comma rests on the plate.** It overlaps the plate by 45 px so the digits visibly stand on it. That is also why the plate is never white: the comma would disappear, so the house-record plate is black on a red crown.
- **One baseline.** Plate label and decimals share baseline y 478. The comma's tail clears the label's cap by 17 px.
- **The TODAY line breaks** at the moment the charge passes it, and both halves fall.
- **Smear from speed.** Charge-edge smear is computed from velocity (180 degree shutter): 72 px at launch, zero at the apex.
- **The slam causes the drain.** The charge collapses 200 ms after landing, never before.
- **Replay sync.** The plate twitches 5 px on the replay's contact frame, so that punch visibly owns that number. The QR never moves during any shake.
- **Constant hang.** The apex hang is the same 240 ms for every hit, so near misses are not dramatised.
- **Letter-only codes.** 18 consonants, no vowels, no O, Q or G: the score stays the only number, codes can never spell words, and no letter is misread against Orbitron's squared forms.
- **The QR is built to scan.** Uppercase URL for alphanumeric mode (Version 2-Q), 12 px integer modules, a 4-module quiet zone, black on white, static while live.
- **Dead codes look dead.** The QR's modules fall out when it is claimed.
- **The QR leaves the glass the instant a new credit arrives**, because the next swing happens in front of it.
- **On-camera honesty.** Armed shows the live camera with `YOU'RE ON CAMERA`, so the recording is never a surprise.
- **Near life size.** The replay is 475 mm tall.
- **Credits are never lost.** `NO READING` never consumes one, and Armed never times out.
- **Plate colour carries the state at 4 m**, where 52 px words cannot.
- **The runway is deliberate.** The knee-height third is left empty because bodies block it.
- **Photosensitivity.** One full-field red rise and fall per hit, well under three flashes a second.
- **One haptic in the whole app**, and it is the landing.
- **No counts on cards.** Faces and names instead. Time in words ("tonight", "Saturday") everywhere except the hit detail.
- **The reel groups by visit.** The visit's best hit is large; the others are rows.
- **Machine-page marks** that land too close are pushed apart, with leader lines back to their true height.
- **To-scale review.** The presentation cut sets the column beside a 1.75 m silhouette.

## pushback

## What I'd push back on
- **`Touch [IS / IS NOT]` was left unfilled.** I designed for no touch: the player has just used both hands and the top of the glass is at 2.0 m. Every state ends on a timer, a credit or a scan.
- **The panel maths don't agree.** 1080 x 3840 at 1.5 m tall is 0.42 m wide, not 0.5. I assumed a 0.39 mm pixel pitch and that the 0.5 m is the cabinet. Mounting height isn't given either, and the crown placement depends on it. My floor bands assume glass from 0.5 to 2.0 m. If the real top is 2.3 m, the crown moves down by the difference (it is a token).
- **Three decimals are probably false precision.** If the sensor repeats within ±0.5%, a 700,000 hit is ±3,500, so even the last integer digits are noise. I kept decimals subordinate on the plate. I'd push to drop them from the glass entirely and use them only to break ties on Boards.
- **"One attempt and a walk-away is failure" measures the wrong unit.** Groups rotate: three friends taking one hit each is a success. The metrics should be credits per group visit, the keep rate per hit, and installs per keep.
- **The "event" asks and the queue pull against each other.** My number is readable at 1.0 to 1.4 s and settled by 3.0 s. The result holds 24 s and yields to any credit. I'd want the real target cycle time before tuning.
- **The tokens contradict the live product** (Orbitron everywhere against Poppins and Inter). Is Orbitron a decision or an inheritance?
- **"One clip" shows one case.** The reveal differs by score, so I'd add stills of the weak-hit and house-record variants.

## What I'd validate with users
- **Height as a verdict.** A five-second test in a real mall at 4 m: can bystanders say whether a hit was good from the charge alone, before the number lands? Target: most of them.
- **Crown comfort.** From the pad and from 1.5 m, for adults, children around 1.2 m tall, and wheelchair users.
- **Scanning.** Scan success and time to keep at 12 px modules in mall daylight. Letter-code typing errors.
- **Metaphors.** Whether the bell reads without the attract loop, and whether run ticks read as each other's hits.
- **The gap.** Whether it feels like encouragement or pressure after a weak hit.
- **The replay.** Whether players are comfortable seeing themselves near life size in public, and how often they use `Not me`.

## Questions I'd have asked
1. What are sensor latency and repeatability? What does the real score distribution look like, and how does the house record behave after recalibration?
2. Mounting height, and where the pad, camera, payment reader and any NFC area sit on the cabinet? Is there an LED strip or a physical button?
3. How is a credit paid? Can the app pay? Can one purchase buy a run?
4. Clip length, orientation and processing delay? What consent and retention rules apply in each live country, including for minors?
5. Connectivity reality, and the fallback today?
6. Locales and separators for Tampa, Dubai and London?
7. Current keep and install rates from the machine, and where people drop off?

## risks

- **The bell pins the scale.** Height-as-rank only works if the bell is sane. One freak or miscalibrated reading makes every hit stop halfway and look weak. Mitigations: a rolling 30-day bell, outlier review before a reading becomes the bell, and the all-time record kept on the phone. If the score distribution is heavily skewed, a linear map may still bunch everyone low, and I'd have to consider a gentle curve while staying honest about what the height means.
- **The crown is high.** Players who don't step back from the pad look about 30 degrees up. The charge is meant to lead the eye up the column, but children and wheelchair users pay the most for this choice. It also depends entirely on the unconfirmed mounting height.
- **Spectacle fatigue.** The same slam hundreds of times a day for staff and regulars. Timing varies with height, and rare states escalate, but a bright full-field red on every hit may be harsh in a dim venue. Charge brightness should be a per-venue setting.
- **Two big moving things compete.** The looping near life-size replay could pull attention from the keep, lowering scan rates. Watch the keep rate. The fallback is pausing the replay on the contact frame after one loop.
- **Custom numerals are a dependency.** The brand owner may refuse them. The fallback, Orbitron in fixed cells for the integer, keeps the whole choreography but halves the number's size (42 arcmin at 4 m).
- **Claim abuse.** A queue member can type a photographed code before the owner. Mitigations: the replay on the claim page, `Not me`, private-by-default hits, and the physical-scan override. A determined stranger can still keep someone else's clip privately for up to 15 minutes.
- **Runs lump strangers together.** A stranger who pays within 60 s joins a run. Anonymous ticks limit the harm, but the go-again copy may address the wrong rivalry.
- **Performance.** 60 fps over 4.1 MP with video decode, a full-field fill and an integer-scaled QR on a signage player. It must be proven on the real hardware before the motion is final.
- **The go-again ask can tip into pressure** for weak or young players. It needs watching in testing, not just a principle.