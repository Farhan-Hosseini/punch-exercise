# Proposal: The Tower

## thesis

This machine descends from the fairground strength tester: hit the pad, the puck climbs the tower, the bell rings. A 1.5 m portrait panel is already a tower, so the screen should not display a score, the strike should climb it. The climb is a full-width red fill rising from the floor of the panel under constant deceleration, which is literally how a thrown puck behaves, so the suspense is built by physics rather than by a timer: it slows as it approaches the marks and everyone watching asks whether it will make the next one. Height is readable from 4.5 m without reading a digit, which solves the spectator problem, and the tower carries the only context a walk-up player needs as named marks rather than numbers: today's best on this machine, your own earlier punches in this session, the punches of the friends you came with, and the house record at the very top, which is the bell. The number is the puck: it waits on a shelf at the bottom of the player's eye band, the rising fill reaches it and carries it up, and where the fill stops the number lands. After the reveal the fill drains and the number rises into the spectator strip as a counterweight, the replay takes the eye band, the code sits at chest height where the phone already is, and the punch leaves a mark on the tower that the next punch has to climb past. That mark is the go-again mechanic.

## machine_flow

**Physical frame (assumptions stated).** Panel bottom edge 0.5 m, top 2.0 m, 3840 px over 1.5 m = 2.56 px per mm. Floor height of canvas y = 2.0 m minus y/2560. Pad on an arm beside the panel, camera in the top bezel. No touch as the base case. Margins 56 px. One alignment logic on every state: flush left on x 56, with handles and secondary labels flush right on x 1024. Nothing on the machine under 48 px; nothing the queue must read under 120 px.

**Bands (y from the top):**
- Bell strip 0 to 450 (2.00 to 1.82 m): the top of the tower. The only band that clears the player's head for people queuing directly behind. Carries the house record mark, and after the reveal the score.
- Eye band 450 to 1760 (1.82 to 1.31 m): the reveal, then the replay.
- Chest band 1760 to 2240 (1.31 to 1.12 m): the handoff.
- Lower tower 2240 to 3840 (1.12 to 0.50 m): where the climb starts, the session marks, go-again, and the recording notice at the foot.

**The tower scale.** Height is the punch's percentile on this machine over the trailing 30 days (per machine calibration), mapped linearly from the floor (y 3840, 0th percentile) to the house record line (y 450, the record itself). A median punch climbs to y 2145, chest height. A top-decile punch passes y 790. Percentile rather than raw score so every machine in every venue uses the whole tower and the words stay honest. A punch above the house record breaks through y 450 into the bell strip.

**The shelf.** The number's resting place during the climb is a shelf at baseline y 1700 (the bottom of the eye band). Punches that climb above the shelf pick the number up and carry it on the leading edge; punches that stop below it leave the number on its shelf with a visible gap of black between the fill and the number. Nothing lands at knee height, and a weak punch is shown honestly without being hidden.

**S0 ATTRACT (loop; ends on the credit event).**
- Bell strip: the house record mark, an 8 px yellow #ffab00 line across at y 450, over it "HOUSE RECORD" Orbitron 700 64 px at x 56 and the holder "@NOOR" Inter 600 64 px right-aligned.
- Eye band: claimed and consented clips from today in 4:5 (1080 x 1350, y 450 to 1800) cycling every 6 s, each with its own mark: the fill level of that punch drawn as a 12 px red edge line across the clip at its tower height, so the attract loop teaches the tower without a word.
- Chest band: "HIT IT" Orbitron 900 200 px, "One credit. One climb." Inter 600 64 px.
- Lower tower: today's best mark at its real height (a 6 px white line at 50 percent and "TODAY'S BEST @LINA" Orbitron 700 48 px), and at y 3740 the notice "This machine records video. Unclaimed clips delete after 24 hours." Inter 500 40 px at 60 percent (the one line allowed under 48 px, it is not for reading at a distance).

**S1 READY (credit inserted; ends on the strike; 90 s timeout returns to S0 with the credit held).**
- The live camera fills the eye band, mirrored, 4:5. A 24 px red dot and "LIVE" Orbitron 700 48 px inside its top-left corner.
- Over the bottom of the feed, "READY" Orbitron 900 240 px, flush left.
- Every mark on the tower is visible at its height as a thin line across the full width (6 px, 50 percent white): house record, today's best, and any marks from the current session. Armed players (see handoff) also see "YOUR BEST" at their height.

**S2 IMPACT (0 to 330 ms).** One white frame, two red frames, the feed freezes on the impact frame and cuts to black, the whole canvas shakes (see motion). The marks re-arm: each line draws from x 56 to x 1024 in 220 ms, staggered 40 ms from the top.

**S3 CLIMB (330 to 1780 ms).** The fill rises from y 3840 with constant deceleration to its apex. The number sits on the shelf at baseline 1700 as six dim cells ("000,000" at 20 percent), Saira ExtraCondensed 800 at 360 px, left edge x 62, and starts counting the moment the fill starts, its value tied to the fill's height, so it slows exactly as the fill slows. When the edge reaches the shelf it lifts the number and carries it, baseline 70 px above the edge. Each mark the edge passes flashes white, kicks 16 px upward on a spring and its label changes from "TODAY'S BEST" to "PASSED @LINA".

**S4 LAND (1780 to 3000 ms).** Apex: velocity is already zero, so there is no bounce up. The number stamps (scale 1.10 to 1.00 on a spring, one overshoot), a second smaller shake, the fill's edge sloshes once and settles. At 2080 ms one qualifier line stamps under the number, in words, Orbitron 900 120 px: "BEST TODAY" when it passed today's best, "HOUSE RECORD" when it broke the bell (the bell strip floods yellow for 600 ms, the only time yellow fills anything), "NEW BEST" for an armed player beating their own, otherwise one of five climb words by height band: "WARM-UP" (below 25 percent), "SOLID" (25 to 50), "HEAVY" (50 to 75), "HUGE" (75 to 90), "MONSTER" (above 90). The widest, "HOUSE RECORD", measures 1010 px at 120 px in Orbitron 900 and is set at 112 px.

**S5 RESULT (3000 ms to 30 s; a credit event goes to S1 at any moment; claim updates the dock in place).**
- 3000 to 3550 ms, the counterweight: the fill drains to the floor accelerating (gravity), while the number rises into the bell strip and scales 360 to 300 px, baseline y 360. It is now readable over the player's head from the back of the queue. The qualifier travels with it at 64 px right-aligned on x 1024, baseline 110.
- The punch leaves its mark: a 12 px red line across the full width at its apex height, with "YOU" Orbitron 700 48 px (or the handle when armed or claimed) at its left end. It stays on the tower for the session.
- 3300 ms, eye band: the replay wipes up from the chest line in 4:5 (1080 x 1350, y 450 to 1800): the frozen impact frame first, then the 0.6 s around impact at 0.3 speed, then the whole 3 s clip at real speed, looping. A 4 px red edge line runs along the top of the replay at the punch's height ratio as a scrub head.
- 3800 ms, chest band: the handoff dock slides in from the left (see handoff).
- Lower tower: the session marks and the go-again block: "GO AGAIN" Orbitron 900 160 px at cap top 2380, then "Climb past your mark." Inter 600 64 px, then "Add a credit." Inter 600 64 px at 60 percent. After a second punch: "Best of three counts." replaces the middle line; after the third: "That's the set. Keep your best."
- 25 s to 30 s: everything above the dock fades to 40 percent. No countdown.

**S6 DOCKED (30 s to 120 s after the strike).** The bell strip, eye band and lower tower return to S0 content, but the dock persists exactly as it was and the session marks stay on the tower (in S0's today's best position logic) until 180 s after the last strike.

**S7 CLAIMED (event).** The dock's top rule turns green #00c853, "KEPT" replaces "KEEP IT", the QR fades to 15 percent, "On @farhan's reel." replaces the scan line; the session mark on the tower relabels from "YOU" to "@FARHAN". After 3 s the dock collapses to a 120 px strip.

**Figma frames (1080 x 3840):** S0, S1, S2 impact frame, S3 climb mid-rise below the shelf, S3 climb carrying the number, S4 landed with qualifier, S4 house record, S5 result first punch, S5 result third punch with three marks and a group, S7 claimed, plus a zoning overlay with the floor heights and a low-score S5 variant where the number stays on the shelf.

## reveal_motion

**Clip: 8.5 s, 1080 x 3840, 60 fps, rendered from code frame by frame (deterministic, no screen recording), MP4, plus a 540 x 1920 preview.** No audio.

| t (ms) | element | from | to | easing | note on physical logic |
|---|---|---|---|---|---|
| 0 to 500 | READY state | live mirrored feed, READY 240 px | | none | context: the player is about to strike |
| 500 | whole panel | feed | 1 white frame | cut | the flash of contact |
| 517 to 550 | whole panel | white | 2 frames brand red | cut | the strike as colour, before any number exists |
| 550 | feed | live | frozen on impact frame, then cut to black | cut | the panel took the hit |
| 500 to 840 | canvas | 0 | translate (18, 12) px ringing down, 14 Hz, quadratic decay | damped sine | the cabinet shudders |
| 580 to 900 | marks | 0 width | full width, 40 ms stagger from the top | ease-out-expo, 220 ms each | the gauge arms itself |
| 580 to 900 | shelf number | invisible | six cells at 20 percent, "000,000" | fade 160 ms | the puck is waiting |
| 840 to 2290 | fill leading edge | y 3840 | apex y 1040 | y(u) = floor minus height x (2u minus u squared), constant deceleration, 1450 ms | a thrown puck slows under gravity; the last 300 ms crawl is the suspense |
| 840 to 2290 | number value | 0 | 612,480 | tied to fill height, not to time | cells too fast to read (over 9 glyphs a second) smear vertically; drums carry like a real odometer so digits settle left to right |
| ~1780 | shelf | number on shelf | carried 70 px above the edge | contact | the fill lifts the puck |
| ~2030 | TODAY'S BEST mark | 50 percent white line | flash to 100 percent, kick 16 px up, label to PASSED @LINA | spring, 280 ms | a ruler struck as the edge goes through |
| 2290 | number | scale 1.10 | 1.00 | spring stiffness 320, damping 18, one overshoot to 0.985 | the stamp: the puck stops dead at v = 0, the number is pressed in |
| 2290 to 2550 | canvas | 0 | translate 10 px ringing down, 11 Hz | damped sine | second, smaller shudder |
| 2290 to 2900 | fill edge | flat | one slosh: centre rises 22 px, edges 0, decays in 1.5 cycles | damped sine | mass keeps moving after the stop |
| 2290 to 3000 | red bloom behind the number | 45 percent | 0 | ease-out | heat of the impact |
| 2580 to 2820 | qualifier BEST TODAY | y + 40, 0 percent | y, 100 percent | ease-out-expo | the meaning arrives after the value |
| 2820 to 3400 | hold | | | | nothing moves; the queue reads it |
| 3400 to 3950 | fill | apex | floor | ease-in quad (accelerating fall) | gravity again, now downward |
| 3400 to 3950 | number | baseline 1110, 360 px | baseline 360, 300 px | ease-in-out cubic | counterweight: the number rises as the fill falls |
| 3650 | punch mark | none | 12 px red line at apex height with YOU | draw 240 ms | the punch leaves a mark for the next one |
| 3700 to 4200 | replay | clip-path from y 1800 | full 450 to 1800 | ease-out-expo | the replay rises out of the chest line |
| 4200 to 6000 | replay | impact frame | 0.3 speed slow motion | linear | |
| 4300 to 4800 | handoff dock | x minus 1080 | x 0 | ease-out-expo | arrives from the left, flush with the spine |
| 4800 to 5200 | GO AGAIN block | y + 40, 0 percent | settled | ease-out-expo, 80 ms stagger | |
| 6000 to 8500 | replay | slow motion | real speed | | the clip ends in the result state with the code in place |

Why the big number reads as an event: it has a cause the room can see (a column filling), a doubt (the deceleration near the marks), a moment (the stamp at v = 0 with shake, slosh and bloom keyed to the same frame), and a consequence (the fill falls, the number rises, a mark is left). Every movement is one of three physical behaviours: a thrown mass decelerating, a mass falling, and a struck object ringing down. Nothing tweens for decoration.

## handoff

**Primary: the dock at chest height, y 1760 to 2240 (1.31 to 1.12 m).** A white tile 470 x 470 px at x 56 holding a Version 2 QR, 25 modules at 14 px per module (350 px, 137 mm, reliable to about 1.4 m), #000 on #fff with a 4-module quiet zone. To its right from x 580: "KEEP IT" Orbitron 900 120 px, then the six-character code "K7F 3QM" Saira ExtraCondensed 800 160 px (alphabet without I, O, S, B, 0, 1, 5, 8), then "Scan, or type the code in the app." Inter 600 48 px. The QR encodes `HTTPS://PNCH.APP/K7F3QM` (alphanumeric mode). iOS: App Clip card, the clip opens with the replay and the climb in miniature, then "Keep it" (Sign in with Apple) and "Share" work before any install. Android: a web claim page with the same content and Google one-tap.

**Pre-claim for the second and third punch.** Once a phone has claimed a punch at this machine, that phone is armed for 10 minutes: the next strike on this machine attaches itself, S1 shows the handle, the mark is labelled with the handle, and the dock says "KEPT" with no code. This is what makes the second and third attempts frictionless.

**Fallbacks.** The code typed at pnch.app or in the app, valid 24 hours. "Missed it? Find your punch" in the app: venue, time band in words, a grid of impact stills with faces blurred; unverified claims show on your profile but never rank.

**Privacy and expiry.** Single-use code bound to one attempt; the dock persists 120 s so a player can step aside; unclaimed video deleted at 24 h; the attract loop only shows claimed and consented clips; the machine shows handles, never names or profile photos; a second scan of a claimed code shows "Already kept" with a dispute link.

**Already installed.** Open the app near a machine (geofence) and tap "Arm this machine", or scan the small machine code in S0. The first punch then lands directly on the phone.

## go_again

**The mark to beat.** Every punch leaves its mark on the tower for the session (180 s after the last strike). The second climb has something physical to pass: your own red line, labelled YOU. When the second edge passes the first mark, the mark flashes and relabels "PASSED YOU", which is the most legible personal-improvement moment possible from four metres. After three punches the marks are a small ladder with the best one thicker.

**The group.** Friends playing in a row each leave a mark. Armed friends' marks carry their handles; anonymous ones read "PLAYER 2" style words only if the operator enables group mode ("RED", "BLUE" colours are avoided because red means strike). The group sees the ladder on the tower from where they stand, and the next person in the queue has a line to beat that belongs to someone they know.

**Copy.** "GO AGAIN" / "Climb past your mark." / "Add a credit." Honest and motivating: a real target, no countdown, no loss framing. The dim fade in the last 5 s is the only pressure, and it exists because the queue needs the machine.

## phone

**Platform:** iOS, 393 x 852 pt, dark theme. Android parity later with a web claim page instead of the App Clip.

**Signature: your tower.** The profile header is a tall narrow tower 72 pt wide down the left edge showing your marks at every machine you have played, the house records you have seen, and your best as the highest red line; your reel runs beside it as a vertical list of clips, each aligned to a small tick on the tower. Scrolling the reel moves a highlight up and down the tower. The phone repeats the machine's one idea at hand scale.

**Screens:** App Clip claim (replay, climb miniature, Keep it, Share); Kept (one reason to install, in context: "You passed @LINA today at Dubai Mall East. She plays Fridays."); You (tower plus reel); Attempt detail (9:16 clip, score with decimals at 60 percent, when and where in words, the tower marks it passed as a list: "Passed @LINA. Passed today's best."); Feed scoped to machines you have played (4:5 muted loops, Respect reaction shown as faces, "Beat it" which pins that person's mark on your tower at that machine); Machine page (the live tower of that machine with today's marks and who made them, regulars as faces).

## competition

**Machine:** only marks: house record (the bell), today's best, and the session's marks. Never a rank number, never a weekly or global list on a public screen. **Phone:** boards by place (machine, venue, city, country, world) and time (today, week, all time), your row pinned, and "Rivals": the three marks just above yours. **Between:** "Beat it" turns someone's punch into a named mark on the tower when you arm that machine.

## brand

Keep the red #eb1110 as the colour of the strike itself: the fill, the marks you leave, never the digits. Keep Orbitron, but only uppercase words etched on the gauge (READY, HIT IT, marks, qualifiers) at 48 px and above on the machine; it reads like an instrument label, which is what it is good at. Add a numerals face, Saira ExtraCondensed 800, because Orbitron 900 six digits cap out at 192 px in a 1000 px measure (cap 54 mm) while Saira reaches 360 px (cap 99 mm) with a technical, squared construction that sits beside Orbitron. Replace `--font-sans` with Inter for sentences and the phone UI. Yellow #ffab00 gets one job: the house record and the bell. Green #00c853 one job: kept. Delete supportive red (1.21:1 against the brand red, reads as the same colour). Fix the duplicates (primary 700 and 800, neutrals 300 and 400). Add a true machine black #000 and a warm near-black #0b0a0a for the phone, a black scrim scale for text over video, and motion tokens: impact 16 ms white plus 33 ms red, shake 14 Hz, climb 1450 ms constant deceleration, stamp spring 320/18, drain 550 ms ease-in quad.

## detail_touches

- The fill decelerates by the gravity formula, and the counter is driven by the fill height, not by time, so the digits slow down in lockstep with the climb.
- Odometer drums carry like a real odometer; drums faster than nine glyphs a second smear instead of flickering.
- Six fixed-width cells from the first frame, leading zeros at 20 percent, so the number never changes width.
- The number is a puck on a shelf at the bottom of the eye band, so low punches never put the number at knee height.
- The counterweight transition: fill falls as the number rises.
- Marks kick upward when passed, like a ruler struck.
- Yellow appears only for the house record; red never colours a digit.
- QR at chest height by calculation, pure black on white, integer pixels per module.
- Session marks persist 180 s so a group builds a ladder.
- Qualifier words sized so the widest fits.
- The live feed is mirrored, the recording is not.
- No em dashes; counts in words.

## pushback

- The touch placeholder: designed for no touch.
- The panel size is inconsistent (9:32 at 1.5 m is 0.42 m wide, not 0.5): assumed active height 1.5 m.
- Mounting height and pad position are the most important missing facts; the tower's shelf and dock heights depend on them.
- Three decimals: shown only on the phone where ties matter.
- Percentile scaling needs a minimum sample per machine; new machines borrow the fleet distribution for 30 days.
- Validate: whether spectators read height as strength without instruction (a paper prototype on a real panel), whether the counterweight move reads as the score moving rather than disappearing, the climb words, scan success at chest height under mall glare.

## risks

- A percentile tower can feel unfair on a machine where the record is freakish; the record line is fixed at the top regardless, so a freak record compresses nothing because the mapping is by percentile, but it makes the bell unreachable, which is correct.
- Full-bleed red on a 1.5 m panel is loud; the fill is on screen for under 3 s per punch and drains away.
- The climb takes 1.45 s; for regulars armed on their third punch, a 1.0 s variant.
- The metaphor could read as a fairground cliché; the execution avoids ornament (no bell drawing, no bulbs), the tower is only a fill, lines and words.