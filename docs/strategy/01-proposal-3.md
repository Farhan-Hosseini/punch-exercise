# Proposal: The Crowd Line  (propose:queue)

## thesis

A 1.5 m screen in a mall has two audiences, stacked by height. Everything above the striker's head belongs to the four friends standing 4 m back. Everything below it belongs to the striker. So the machine is zoned by who can actually see what. The score goes above the heads, the replay goes to eye level, the phone code goes to hand height, and the approach prompt goes down by the card reader. Every hit also leaves a line across the screen at the height its score reached, and that line carries a name. The round's best line is what the next person in the queue has to break. The group, not the individual, is the player. Each hit changes what the next friend has to beat, and each broken line leaves someone who wants it back. That is how one attempt becomes three, and why claiming the clip is worth doing in front of your friends: claiming is how your name gets onto the line.

## machine_flow

## Zoning assumptions (install-time config, recomputed per venue)

The screen spans 0.80 to 2.30 m above the floor. The pad sits beside the screen, the card reader below it and the camera above it. Vertically, 1 px = 0.39 mm, so height above floor = 2.30 m minus (y x 0.39 mm).

**Occlusion.** Take a spectator with eyes at 1.60 m, standing 4 m back, looking over a striker whose head top is at 1.80 m, 1.2 m from the panel. That sightline meets the panel at 1.89 m (y about 1,050). Below that line the striker's head hides the centre 0.29 m of the panel. Below 1.39 m (y 2,330) their shoulders hide the full width. While the striker is at the pad, only the top 1,100 px is guaranteed to reach the group.

| Zone | y (px) | Height | Owner |
|---|---|---|---|
| Bezel safe | 0-120 | 2.30-2.25 m | empty |
| A. Crowd | 120-1080 | 2.25-1.88 m | the group, over the striker's head |
| Crowd line | 1100 | 1.87 m | top of the tower = top of the day |
| B. Eye | 1160-2360 | 1.85-1.38 m | the striker. Standing eye level (1.60 m) is y 1792 |
| C. Hands | 2400-3000 | 1.36-1.13 m | where a phone is held to scan |
| D. Floor | 3040-3720 | 1.11-0.85 m | hidden by bodies. Tower base and card reader prompt |
| Bezel safe | 3720-3840 | 0.85-0.80 m | empty |

**Column.** x 72 to 1008 (936 px). Words hang from x 72 and numerals hang from x 1008, like a ledger: one grid, two edges. Only the fill and the flash bleed to the full 1080.

**Type ramp.**
- **Figures:** XL 353 px in Punch Figures (figure height 248 px, 97 mm). L 160 px (113 px). M 96 px.
- **Words:** D4 is Orbitron 900 112 px (cap 81 px, 32 mm, for 4 m). D3 is Orbitron 900 72 px (cap 52 px, for 2.5 m). D1 is Orbitron 700 44 px (cap 32 px, 12.4 mm, for 1.5 m).
- Nothing ships under 44 px. Every numeral is set in Punch Figures and every word in Orbitron, all caps.

**Colour.**
- Ground #0E0C0B, text #FAF9F9.
- Secondary text is 64% white, unlit cells 10% white, rules 30% white.
- Impact #EB1110, fill tail #5E0606, leading edge #FEF3F3, fault #FFAB00.
- No rule is thinner than 4 px.

**Score geometry.**
- The integer always fills six fixed 142 px cells plus an 85 px comma, spanning x 72 to 1008 and y 240 to 488.
- Unused leading cells stay lit at 10% ("000,412"), so the block never changes width.
- Decimals are Figures L, right-aligned at x 1008, y 520 to 633.

**Tower.**
- Fill head y = 3720 - 2620 x (score / day line), capped at 1.04.
- Day line = the higher of today's best at this machine and 0.8 x the median of its last 14 daily bests.

**Round.** Starts on the first credit after idle. It stays open while each new credit arrives within 90 s of the previous result.

---

## READY (context: credit in, waiting for the strike)
- **A:** "YOU'RE UP" D4 at y 136-217. A checked-in app player sees their machine name instead ("KAI"). The row at y 360-473 has "TO BEAT" D3 at x 72 and the target integer "540,112" in Figures L, right-aligned. On the first hit of a round it says "SET THE LINE" D3 with no number.
- **Crowd line:** a 4 px rule at 30%, with "TOP OF THE DAY" D1 at 64% above it (y 1052-1084).
- **B:** the round line at its height (Maya at y 1707): 8 px, #FAF9F9, across the column, with "MAYA" D3 above it.
- **C,** right column x 552-1008: "HAVE THE APP?" / "SHOW YOUR PASS" / "TO THE CAMERA." in D1, 64 px leading from y 2448. The left side stays clear for the previous striker's tile.
- **D:** a 24 px #EB1110 base bar, full bleed, y 3696-3720, breathing from 40% to 100% on a 1,600 ms sine.
- **Ends:** on the strike (sensor event). After 180 s with no strike it returns to ATTRACT with the credit banked, and D shows "CREDIT READY." / "HIT THE PAD." in D3.

## 1. IMPACT, t 0-220 ms
- **Purpose:** the machine answers the hit before any number appears.
- **Motion:**
  - A full-panel #EB1110 overlay starts at 90% and decays to 0 by 220 ms. One flash per attempt.
  - The canvas recoils to scale 0.985 about the bottom edge in 50 ms, then springs back.
  - READY copy rises 60 px and fades in 160 ms.
- **Ends:** on timer, overlapping RISE.

## 2. RISE, t 50 ms to apex
- **Duration:** 500 to 1,100 ms, plus 50 ms of hit-stop for each line broken.
- **Purpose:** show how big the hit was before anyone can read it, and whether it broke the line.
- **Motion:**
  - A full-bleed fill rises from the base bar on a ballistic curve, taking T = 1,100 x sqrt(height / 2,620) ms.
  - The integer cells in A count in lock with the fill height.
  - Any line the fill meets bows, holds for 50 ms, snaps at x 540 and falls outward to both edges. The edges are the part the group can see around the striker's body.
- **Ends:** on the apex event.

## 3. VERDICT, apex to t 3,400
- **Purpose:** the group reads the number and the result in one glance.
- **Motion and elements:**
  - The integer locks and slams. The decimals lock one every 110 ms.
  - The fill drains and leaves an 8 px line at the apex, labelled with the striker's name if they are known.
  - The verdict appears in D4 at y 700-781.
  - On a new lead, a 24 px #EB1110 bar grows at y 812-836.
  - The call appears in D3 at y 900-952.
  - For walk-ups, the claim code "PNCH.APP/KQMTXR" appears in D1 at 64%, right-aligned to x 1008, y 980-1012.

| Case | Verdict D4 | Call D3 | Extra |
|---|---|---|---|
| First hit of a round | LINE SET | NOW BEAT IT | none |
| Breaks the round line | NEW LEADER | OVER MAYA (named leaders only) | red bar |
| 5% or less under the line | SO CLOSE | 3,120 SHORT OF MAYA (the gap set in Punch Figures) | none |
| More than 5% under | MAYA HOLDS (unnamed leader: LINE HOLDS) | none | none |
| A checked-in player beats their own earlier hit | KAI BEAT KAI | none | none |
| Crosses the day line | TOP OF / THE DAY (line 2 at y 821-902) | HERE, TODAY (y 960-1012; code moves to C) | the fill punches past y 1100, band A goes red for 600 ms, then drains |
| Sensor fault | NO READ in #FFAB00 | CREDIT KEPT. / HIT AGAIN. | back to READY after 3,000 ms with the credit still armed |

If a D4 string is wider than 936 px (a long name), it breaks before the verb and the name stays on line one.

- **Ends:** on timer.

## 4. REPLAY, t 3,400-9,800
- **Purpose:** the group's moment. By now the striker has stepped back and turned round.
- **Motion:**
  - A 936 x 1664 (9:16) replay rises from y 3840 to y 1180 in 700 ms (easeOutQuint), covering B and C.
  - It plays 1.2 s at 1x, then a 280 ms ramp to 0.25x through the impact.
  - Then a 300 ms freeze on the impact frame, with a 60 ms white flash inside the video and "648,215.407" stamped in Figures M.
  - Then the follow-through at 0.5x, then one more pass at 1x.
- Band A holds.
- **Ends:** on timer.

## 5. KEEP IT, t 9,800 until claim, next credit or t 55,000
- **Purpose:** hand the attempt to the phone, at phone height.
- **B:**
  - The replay shrinks to 568 x 1010 at x 72, y 1180-2190 (600 ms, easeInOutCubic) and loops at 1x.
  - The round rail appears at x 672-1008 over the same y range, with "TODAY" D1 at y 1180.
  - Each hit in the round gets an 8 x 40 px tick at its height. The leader's tick is #EB1110 and 16 px tall.
  - Names are D1 at x 728, max width 280 px. Unclaimed hits show as 4 px outline ticks with no label.
  - The new tick scales 1 to 1.3 to 1 over 400 ms.
- **C:**
  - A QR plate: 440 x 440, #FAF9F9, radius 24, at x 72-512, y 2440-2880.
  - Right column: "SCAN" D4 (y 2479-2560), "TO KEEP" D3 (y 2600-2652), "THE CLIP" D3 (y 2684-2736), "NO APP NEEDED." D1 (y 2780-2812).
  - Under the plate: "KQM TXR" D3 at x 72, y 2920-2972, and "AT PNCH.APP" D1 at x 552 on the same baseline.
- **Checked-in players get no QR.** The same box holds a dark #221E1D plate with a 160 px red check, and the right column reads "IN KAI'S" / "REEL" in D3.
- **Ends:**
  - A claim goes to CLAIMED.
  - A credit goes to NEXT CREDIT.
  - At t 55,000 the plate shrinks to a 216 px tile at x 72-288, y 2440-2656, labelled "LAST HIT" in D1 with the code under it. The tile stays until the round closes.

## 6. CLAIMED, 3,000 ms from the claim event
- The plate flips on its vertical axis (420 ms, easeInOutCubic) to the dark side: a check plus "IN YOUR" / "REEL", or "IN KAI'S" / "REEL" if the player opted in to showing their name.
- The code in band A disappears on the same frame.
- A public name types onto that hit's rail tick at 67 ms per letter.
- If this hit leads the round, the call in A changes to "KAI HOLDS IT".
- **Ends:** on timer, into QUEUE CALL.

## 7. QUEUE CALL, from t 14,000 (or the end of CLAIMED) until the next credit or t 90,000
- **Purpose:** turn this result into the next person's target.
- **A:**
  - The label becomes "TO BEAT MAYA" in D3 at y 136-188.
  - The number stays where it is. If the striker is not the leader, the six cells roll to the leader's score in 600 ms.
  - The verdict swaps to "NEXT UP" D4 and the call to "TAP CARD" D3. When the previous leader has just lost the lead, the call is "MAYA, RUN IT BACK" instead.
- **Round drain:** a 12 px bar at 64% white, y 1040-1052, shortening from x 1008 to x 72 over 90 s, with "ROUND" D1 above it.
- **B** keeps the loop and the rail. **C** keeps the QR or the tile.
- **Ends:** a credit goes to READY. The drain running out goes to ROUND CLOSE.

## 8. NEXT CREDIT (interrupt, any time after impact)
- The pad is armed within 300 ms, whatever is on screen.
- If VERDICT has been showing for less than 1,000 ms, it finishes at double speed.
- The result folds into the rail in 400 ms (easeInCubic).
- The QR becomes the 216 px LAST HIT tile for 60 s, and READY shows the new line to beat.
- Nothing waits on a claim.

## 9. ROUND CLOSE, 8,000 ms
- **Purpose:** crown the group's winner and leave the codes up.
- **A:** "MAYA" / "TAKES THE" / "ROUND" in D4 (lines at y 240, 361, 482), with the winning integer in Figures L, right-aligned at y 620-733. An unnamed winner gets "ROUND" / "OVER".
- **B:** the rail widens to the full column, one tick per hit across y 1180-2360.
- **C:** "UNCLAIMED" in D1, then up to four codes in D3 at 72 px leading.
- **Ends:** on timer.

## 10. UNCLAIMED HOLD, then IDLE (up to 10 min)
- ATTRACT runs in A, B and D. C keeps the UNCLAIMED list, and each code leaves when claimed or at 10 min.
- **ATTRACT:**
  - A shows "TOP OF" / "THE DAY" in D4 with the day's best in Figures XL, plus the holder's name in D3 if public.
  - B loops today's public claimed hits at 936 x 1664, 6 s each.
  - D shows "TAP CARD TO PLAY" D3 at y 3600-3652, with a 72 px down chevron at x 936 pointing at the reader.
- Static elements orbit up to 8 px every 10 min.
- **Ends:** a credit starts a new round at READY.

**Figma frames (each 1080 x 3840):** READY, IMPACT t 60, RISE hit-stop t 1,275, VERDICT t 2,800, REPLAY freeze, KEEP IT, CLAIMED, QUEUE CALL, NEXT CREDIT, ROUND CLOSE, ATTRACT with UNCLAIMED, NO READ.

## reveal_motion

## The clip: 8,000 ms, 60 fps, 1080 x 3840

- **Export:** H.264 High@5.1 (249M luma samples per second, inside the level), plus a 540 x 1920 preview.
- **Scenario:**
  - A round is in progress. Maya leads at 540,112.004, so her line sits at y 1707.
  - The day line is 702,930, at y 1100.
  - Kai is checked in and hits 648,215.407. His apex is y 1304.
  - Rise duration T = 1,100 x sqrt(0.922) = 1,056 ms.

Easings are easings.net cubic-beziers:
- easeOutQuad (0.5, 1, 0.89, 1)
- easeInQuad (0.11, 0, 0.5, 0)
- easeOutCubic (0.33, 1, 0.68, 1)
- easeOutQuint (0.22, 1, 0.36, 1)
- easeOutExpo (0.16, 1, 0.3, 1)
- easeOutBack (0.34, 1.56, 0.64, 1)

The fill uses the exact quadratic, not a bezier.

| Clip ms | What moves, from where to where | Easing | Physical logic |
|---|---|---|---|
| 0-600 | READY holds. Only the base bar in D breathes, 60% to 100% | sine | the pad is live, and the only motion is waiting |
| 600 | Strike lands. Sensor to first frame under 50 ms | | |
| 600-650 | Whole canvas scales 1 to 0.985 about the bottom centre | easeOutQuad | anticipation: the machine is shoved back and compresses before it answers |
| 600-820 | Full-panel #EB1110 overlay, 90% to 0 | easeOutQuad | the energy arrives as light, once |
| 600-760 | "YOU'RE UP" rises 60 px and fades. The target number fades in 120 ms | easeInQuad | clears band A for the number |
| 650-950 | Canvas springs back to 1, overshooting to 1.004 at 800 | spring k 900, c 28 | releasing the compression is what launches the fill |
| 650-1275 | Fill head rises from the base bar toward y 1304. Integer cells count up from 000,000, value = score x height fraction | y = H(1-(1-u)^2) | a mass thrown upward slows under gravity. The count is a readout of that mass, not a separate animation |
| 1275-1325 | Hit-stop at Maya's line. Fill and counter freeze on 540,112, and the line bows 36 px upward over a 480 px span | hold | resistance: the line pushes back |
| 1325-1885 | Line snaps at x 540. Halves rotate 6 degrees about their outer ends and fall 420 px while fading. "MAYA" falls with the left half | easeInQuad 560 | gravity at about a tenth of real, so it reads from 4 m. The halves fall to the edges the crowd can see |
| 1325-1525 | Canvas kicks up 10 px and back | spring k 700, c 24 | the break costs momentum and shakes the frame |
| 1325-1756 | Fill finishes its rise. The hundred-thousands cell stops on 6 at 1,468 | same curve | high digits settle first because the velocity is dropping, so the group can call "six hundred" early |
| 1756 | Apex. The integer locks on 648,215 | | |
| 1756-1846 | Integer block scales 1 to 1.07 and moves from 24 px above to its resting position, origin x 1008 at the baseline. A 48 px red glow goes from 60% to 0 by 1,996 | easeOutCubic | the moving mass stops and its energy passes into the number |
| 1846-2180 | Block settles back to 1 through 0.987 | spring k 520, c 22 (damping ratio 0.48) | one undershoot, then still. Weight, not jelly |
| 1756-1896 | Fill hangs at the apex | hold 140 | the top of a throw |
| 1896-2496 | Fill drains to the base. Its 16 px leading edge stays at y 1304 and thins to 8 px | easeInQuad 600 | falls faster as it goes, and leaves a mark where it peaked |
| 1866, 1976, 2086 | Decimals lock: .4, then .40, then .407. Each cell drops 8 px and returns | easeOutBack 80 | a ratchet clicking home after the slam |
| 2150-2510 | "NEW LEADER" rises 112 px through a mask to y 700 | easeOutCubic 360 | |
| 2300-2620 | Red bar grows from x 72 to 1008 | easeOutExpo 320 | |
| 2496-2696 | "KAI" types onto the new line, 67 ms per letter | steps | |
| 2510-2790 | "OVER MAYA" rises 20 px and fades in | easeOutCubic 280 | |
| 2790-3400 | Nothing moves | | 610 ms of stillness so four people can read it together |
| 3400-4100 | Replay frame rises from y 3840 to 1180 | easeOutQuint 700 | arrives as the striker steps back and turns round |
| 4100-5300 | Replay at 1x | | |
| 5300-5580 | Speed ramps from 1x to 0.25x | easeInOutSine | |
| 5580-6780 | The last 0.3 s before impact at 0.25x | | |
| 6780-7080 | Freeze on the impact frame. A 60 ms white flash inside the video, then "648,215.407" in 96 px slams into the lower third with the same 1.07 slam | | the replay pays off on the same beat as the live reveal |
| 7080-8000 | Follow-through at 0.5x. Clip ends | | |

## What the big number does, and why it reads as an event

The number never fades in, because it has no animation of its own. It is a gauge on a physical event.

1. **The full scale is there from the first frame.** Six unlit cells ("000,000" at 10%) appear at 640 ms, so the group can see how far the number could go.
2. **It is pushed.** Its value is locked to the height of the fill. The rise decelerates, so the high digits stop first and the low digits keep spinning, which gives the crowd something to shout at 1,468 ms.
3. **It gets hit.** When the fill stops at the apex, the number takes the energy: 1.07 in 90 ms, one undershoot, then dead still.
4. **It settles.** The decimals click in one at a time, a ratchet after the slam.
5. **It holds still.** For 610 ms nothing moves at all. No pulsing, no glow loop.

The motion in between (the line bowing, the 50 ms hit-stop, the halves falling to the edges) is what makes it a contest and not just a readout. From 4 m you can tell Kai won before you can read a single digit.

Rise time scales with the square root of height (minimum 500 ms), so small hits are quick flicks and big hits hang. Optional sound follows the same beats (thump at 600, a rising tone locked to the fill, three ticks for the decimals), but nothing depends on it.

## handoff

## Primary: scan at hand height, no app needed

1. **The QR.** It sits at 1.18 to 1.35 m, where a phone is naturally held, and encodes `HTTPS://PNCH.APP/KQMTXR` (placeholder short domain).
   - The URL is all caps, so the whole string stays in QR alphanumeric mode. That gives version 2 (25 modules) at error level M. The same URL in lowercase needs version 3 (29 modules). I checked both with the qrcode library.
   - On a 440 px plate each module is 13.3 px (5.2 mm). The code-width x 10 rule gives a scan distance of about 1.7 m.
2. **What the camera opens:**
   - **App installed:** a universal link (iOS) or app link (Android) opens the app on "Add to my reel". One tap, about 3 s from scan to claimed.
   - **iOS without the app:** an App Clip card, kept under 15 MB (the limit for clips opened from a QR), with the replay already playing. The Clip shares an App Group with the full app, so the claim survives install.
   - **Android without the app** (Google Play Instant has been discontinued), **or iOS if the Clip fails:** a web page under 150 KB that streams the clip. "Keep it in PunchApp" goes to the store with the token in the Play Install Referrer, and the first launch opens on the claimed hit.
3. **Value before any ask.**
   - The replay plays muted from 1.5 s before impact, and the score slams in on the impact frame.
   - "Just save the video" gives a 9:16 MP4 with the score burnt in and "RIVERSIDE MALL" in the lower third.
   - An account is only needed to keep the clip (one-tap Sign in with Apple or Google).

## Fallback when the scan fails

- **Where the code is.** The 6-letter code sits under the QR ("KQM TXR", 72 px). It also appears beside the score in band A ("PNCH.APP/KQMTXR", 44 px), so it shows up in every photo the group takes of the screen.
- **Where to type it:** at pnch.app, or in the app's "Got a code from a machine?" field.
- **The alphabet:** 20 consonants and no digits. No vowels means no accidental words. No digits means no 0/O or 1/I confusion, and nothing competing with the score. That gives 64 million codes, with a limit of 5 wrong tries per device per 10 min.

## Fallback when the player has already left

- **The next credit never takes the chance away.** The QR becomes a 216 px "LAST HIT" tile for 60 s. The code then stays on the rail and on the ROUND CLOSE list until 10 min after the round ends.
- **The group can pass it on.** Anyone who claimed can tap "Send the round to the group". Friends open the round page, find their own tick, and type the code from a photo of the screen.
- **After that, nothing.** There is deliberately no "find my hit by time and place" search, because it would let a stranger pull up a video of someone's face. Unclaimed clips are deleted after 24 h.

## What the machine shows once the claim succeeds

- The white plate flips over (420 ms) to a dark plate with a red check and "IN YOUR REEL", or "IN KAI'S REEL" if they opted in.
- The code in band A disappears on the same frame.
- The name types onto that hit's tick on the rail.
- If the hit leads the round, the call in band A becomes "KAI HOLDS IT".

Claiming is how your name gets onto the ladder in front of your friends. That is the social reason to scan, and where installs come from.

## Expiry and privacy rules

- **Claim token.** Single use. It can be scanned while shown, and stays valid until 10 min after the round closes if nobody opens it.
- **First device wins.** The first phone to open the link holds it for 24 h. A second phone sees "Already opened on another phone." It can take the hit over with the code only while the round window is open and nobody has kept it yet.
- **Unkept video** is deleted from the server 24 h after the round. The machine deletes its local copy once the upload is confirmed. The score stays behind as an anonymous number in the machine's stats.
- **Bystanders.** On-device person segmentation blurs everyone behind the striker before upload, so people in the queue never end up in someone else's reel.
- **Kept clips** default to "Only you". "Crew" and "Everyone" are set per clip.
- **Names on machines.** A name appears only after the player picks "Show KAI on machines": 6 letters A to Z, profanity-filtered, width-checked against the rail. The default is anonymous, and both buttons are the same size.
- **Under-16 accounts** are never named on machines, and their clips are never public.

## Players who already have the app

- **They check in before the strike, while their hands are free.** The Pass tab shows a QR that changes every 30 s, so a screenshot won't work, and they hold it up to the camera during READY.
- **The machine answers** with their name in band A ("KAI") and draws their open challenges as extra lines on the tower.
- **After the hit there is no QR.** Band C shows the "IN KAI'S REEL" plate.
- **A push arrives at about t 2,800 ms,** while the crowd is still reading the number: "648,215.407 at Riverside Mall. You lead the round. Replay is in your reel."
- **If the camera can't read the Pass** (glare, cracked screen), they scan the normal QR and the universal link claims it in one tap.

## go_again

## The mechanic: one line per round, with a name on it

Every hit leaves a line across the screen at the height its score reached. The round's best line is the one the next person has to break. From there, group dynamics do the work:

- the first friend sets the line,
- the second wants to break it,
- whoever gets broken wants it back.

A round stays open while credits keep arriving within 90 s of the last result. When it closes, it has a winner.

## How the screen sells it to the striker

- **Every verdict is about someone they know, and it is in words:** NEW LEADER, SO CLOSE, MAYA HOLDS, KAI BEAT KAI. There are no percentiles and no "rank 4,211".
- **A near miss shows the real gap, but only within 5%:** "3,120 SHORT OF MAYA". That is the one extra number allowed on the machine, and it earns its place because it is beatable.
- **Losing the lead gets a direct call** during the next player's QUEUE CALL: "MAYA, RUN IT BACK."
- **Claimed players get their name on the ladder.** Being named in front of your group is worth the scan.

## How it sells to the group behind them

- **The break happens where they can see it:** above the striker's head, and at the panel edges around their body.
- **QUEUE CALL talks to the queue in its own terms:** "TO BEAT MAYA", the number, "NEXT UP", "TAP CARD". The person deciding whether to go next has a named target, not just an idle screen.
- **The round has an ending.** A 90 s drain bar leads to ROUND CLOSE, which says "MAYA TAKES THE ROUND". Groups play toward a result.
- **The rivalry travels.** The round page on the phone ("Send the round to the group") carries it into the group chat. "Beat this" puts a friend's line on the tower at their next visit.

## Why this gets to three

- A group of four each hitting once is four credits. The design is aiming at the rematches: every lead change creates one dethroned player and a named call.
- For one person, the third hit comes from SO CLOSE (a gap they can close) and KAI BEAT KAI (their own improvement, visible on the ladder).
- Measure attempts per round, not per person.

## What is motivating and what is manipulative

**Motivating:**
- a real target with a real name,
- a gap you can actually close,
- a round with a true winner,
- your own progress.

**Manipulative, and I know it:**
- The near-miss frame is the same lever slot machines pull.
- A public name is social pressure.
- The drain bar is urgency.
- "RUN IT BACK" is a spend prompt aimed at someone who just lost.

**Guardrails I would ship with:**
- The near-miss threshold is fixed at 5%, and the gap is never rounded in the machine's favour.
- The drain bar is the real rule (the round really does close). It never shows a number and never says "last chance".
- No price ever appears on the screen.
- Only opted-in names are called out. Anonymous players are never described ("GUY IN RED" is banned).
- A checked-in player who has hit 5 times in 20 minutes stops getting RUN IT BACK calls. That protects wrists as well as wallets.
- Under-16 accounts are never called out.
- Losing copy never shames: no "WEAK", and no worst-hit list.

## phone

## Platform and frame
- **Platform:** iOS first, iPhone 16 frames at **393 x 852 pt**, dark UI. Android mirrors it at 412 x 917 dp with Material navigation.
- **Layout:** 20 pt side margins on an 8 pt spacing base.
- **Type:**
  - Inter 34 / 28 / 22 / 17 / 15 / 13 for all text.
  - Orbitron 700 in caps only for machine names and short labels.
  - Punch Figures, tabular, for every score: 96 / 56 / 34 / 22 pt.
- **Red** is the primary action and your own marks. Magenta #D842D3 appears only on challenges.

## Information architecture
A 5-slot tab bar (83 pt including the home indicator): **Rounds, Machines, Pass** (a 56 x 56 red square in the centre, the only filled icon), **Standings, You**. Claim is not a tab. It is the entry point from the QR, and the App Clip, the web page and the app all share its layout.

## 1. Claim
- y 59-539: the replay at 393 x 480, muted autoplay from 1.5 s before impact. The score slams in on the impact frame, the same 1.07 slam as the machine.
- y 555-651: "648,215" in Punch Figures 96 pt from x 20, with ".407" at 40 pt on the same baseline.
- y 663-683: "Riverside Mall, level 1. Today, 16:42." Inter 15 at 64%.
- y 691-713: "You took the round from Maya." Inter 17 semibold. While the round is still live: "Round still on. You lead."
- y 719-735: "Not you? Close this page. Unkept clips are deleted after 24 hours." Inter 13 at 50%.
- y 748-804: primary button, 353 x 56, radius 14. On the web it reads "Keep it in PunchApp". In the app, "Add to my reel".
- y 812-832: "Just save the video", Inter 15 (web only).

## 2. Name sheet (after the first keep)
- A 420 pt bottom sheet titled "Put your name on the machine?" (Inter 22).
- A live preview of the machine rail showing "KAI" beside a red tick.
- A "Machine name" field: 6 letters, A to Z. The width meter reads "Fits" or "Too wide for the machine" (anything over 280 px at 44 px Orbitron 700 is blocked).
- Two buttons of equal size: "Show KAI on machines" and "Stay anonymous".

## 3. Rounds (home)
**One editorial moment at the top: the latest round.**
- "Saturday at Riverside Mall", Inter 28.
- The round drawn like the machine rail (353 x 280): one tick per hit at its height, names beside them, your ticks in red. Your best "648,215" sits to the right in 56 pt.
- A story line in words: "You took it from Maya on your third hit. Jonno's is still unclaimed."
- Crew avatars (36 pt, overlapping by 12) with "Maya and Jonno kept theirs", and a 48 pt secondary button, "Send the round to the group".

**Everything below is quiet.** Earlier rounds are plain 64 pt rows on the ground, with no cards and no dividers:
- left: "Riverside Mall" (Inter 17) over "Last Sunday, took it" (Inter 13),
- right: your best in 22 pt figures, right-aligned at x 373.

Rows are grouped under month labels (Inter 15 semibold).

## 4. Round detail
- **Left column (x 20-120):** the rail at full height.
- **Right column (x 136-373):** claimed clips in hit order, as 237 x 421 thumbnails with the score in 34 pt over the bottom edge and a reaction row under each.
- **Unclaimed hits** show as a bare tick with "Unclaimed" (Inter 13). While the round is live plus 10 min, they also say "Claim it with the code on the machine."

## 5. Clip viewer
- Full-bleed video. Bottom left: "MAYA" (Orbitron 700 15) over "Riverside Mall, Saturday 16:40" (Inter 13). The score lands in 64 pt on the impact frame, so every viewing replays the reveal.
- **Right edge, y 560-760, three actions with no counts:**
  - **Felt that:** tap, or double tap anywhere.
  - **Beat this:** magenta, and the only challenge in the product.
  - **Send.**
- **Scrubber (4 pt, at y 800):** each "Felt that" leaves an 8 pt mark at the moment someone reacted. The marks cluster at the impact, so you can see where people winced.
- **Social proof** is names, not numbers: "Kai and Jonno felt that". Crew come first, then "and others".
- **No comments in v1.** The reply to a hit is a challenge.
- **Beat this sheet:** "Maya's 540,112 becomes your line at any machine for 7 days." Buttons: "Take it on" / "Not now".

## 6. Machines (the social layer, local)
- **Nearest machine:** "Riverside Mall" (Inter 28), then "Level 1, by the food court. 6 min walk." (Inter 15).
- **Live state** is plain text with an 8 pt red square, not a pill: "A round is on now" or "Quiet right now".
- **Top of the day:** a "TOP OF THE DAY" label, "ZAHRAA", "702,930" in 56 pt, and her clip thumbnail (96 x 171) to watch.
- **Regulars:** people who hit this machine on 4 or more days in the last month and have opted in. 44 pt avatars with names, plus "You've been in rounds with Maya and Jonno."
- **The wall:** "Today here", public hits in time order (not by popularity). Full-width 9:16 tiles with name and score, opening the clip viewer with swipe-through.
- **Records:** four text lines (This machine, London, UK, World), each with name and score. This replaces the old app's avatar row.
- **Other machines:** 64 pt rows showing walk time and whether a round is on.

## 7. Pass
- Flush left, not centred.
- "Show this to the camera above the screen before you hit." (Inter 22).
- A 300 x 300 QR at x 20, y 180.
- "It changes every 30 seconds, so a screenshot won't work." (Inter 15 at 64%).
- Screen brightness goes to maximum while it is open.
- On check-in: a success haptic, "You're up at Riverside Mall" (Inter 28), and "Maya's line is on the machine" for any open challenges.

## 8. Standings (see Competition)

## 9. You (profile and reel)
- **Header:** "KAI" in Orbitron 900 34 pt, then "Kai Ramos. Home machine: Riverside Mall." (Inter 15).
- **Best hit:** "648,215" in 96 pt (239 pt wide, x 20-259) with ".407" at 40 pt. Below it, "Riverside Mall, 13 Sep". Its thumbnail (104 x 185) sits right-aligned at x 269-373.
- **Standing:** "Top 12% in London this week" (Inter 17), linking to Standings.
- **Reel, grouped by visit.** Each visit carries all four facts the brief asks for: score, video, when and where.
  - The header gives the where and the result: "Saturday, Riverside Mall" (Inter 17 semibold) plus "took the round" at 64%.
  - The visit's best hit is large: 220 x 391, with the score in 34 pt and the time ("16:42") in Inter 13.
  - Its other hits stack to the right at 117 x 208 each. Past two, a text row says "One more hit" or "Two more hits".
  - A visit with one hit is short and a visit with six is long, so the rhythm comes from the content.
- **Privacy:** private clips carry a lock glyph. Visibility (Only you, Crew, Everyone) is set on each clip.

## What makes players feel connected
- **Crew** comes from being there, not from follow buttons: "You've shared three rounds with Maya. Add her to your crew?"
- **Regulars** make a machine feel like a place with people.
- **Challenges** travel from phone to machine and show up as lines on the tower.
- **One "line broken" push per day at most:** "Zahraa broke your line at Riverside Mall."

## What I changed from the existing PunchApp app
- **Scores.** "987654.321 Score" had no grouping and repeated the word "Score". It becomes grouped, tabular condensed figures with no suffix.
- **Counters.** Views, likes and comments counters on every tile become reactions without counts, with names of people you know. Comments become challenges.
- **Leaderboard.** Global / National / Regional tabs with an avatar podium become machine-first scopes anchored on your own row, with the leader's clip in place of the podium.
- **Social graph.** Followers become crew, built from actually being in rounds together.
- **Records.** The Record Holders avatar row becomes a text list on each machine page.

## competition

## Where "who's the best" lives, and why

Competition motivates when the gap is small and the rival is someone you know. So the machine owns **right here, right now**, and the phone owns **over time and further away**.

| Surface | What "best" means | Why it belongs there |
|---|---|---|
| Machine, VERDICT and QUEUE CALL (band A) | The round: the named line to beat | Reachable within 90 s, and the rival is standing next to you. This is the go-again engine |
| Machine, crowd line (y 1100) | Top of the day at this machine | Reachable today and visible to everyone walking past. A 14-day floor (0.8 x the median daily best) stops the first hit of the morning from claiming it by default |
| Machine, ATTRACT only | This machine's all-time record, named if public | Pulls in people walking past. It never shows during play, where it would make every hit look small |
| Never on the machine | City, country or world rank | A first-time walk-up ranks somewhere in the tens of thousands, and that number kills the second attempt |
| Phone, Standings | Scope (This machine, London, UK, World) x period (Today, This week, All time). Defaults to your home machine, this week | Serves the players who come back, not the walk-ups |
| Phone, Machines | Records as four text lines per machine | Replaces the Record Holders avatar row with something you can read |
| Phone, Rounds | Who took each round | The most personal kind of best |

## Standings layout (phone)
- **Top:** a segmented control (353 x 36) for scope, with period text toggles underneath.
- **Leader block:** name in Orbitron 700 17, score in Punch Figures 56 pt, and **their clip**. You watch the best hit instead of looking at a face on a podium.
- **Your part of the board:** three people above you, you, and one below. 64 pt rows with the score in 22 pt figures, right-aligned.
- **Your row** has a 4 pt red bar on the left. It is the only row with a rank number ("214th").
- **One gap line** under the row above you: "Jonno is 1,904 ahead". A target, just like on the machine.
- **Weekly boards reset Monday 00:00 local time,** so they stay winnable. One small line says so.

## Fairness, flagged and not solved
Strike force tracks body mass. An open board will be won by heavy adults forever. Weight classes need a weight nobody can verify. I would ship open boards plus rounds and personal bests (which are fair by construction), then test opt-in divisions.

## brand

## Keep
- **Red #EB1110.** It becomes the colour of the hit, reserved for the flash, the fill, the leader's tick, the lead bar and the phone's primary button. On #0E0C0B it measures about 4.3:1, which is fine at display sizes and exactly how it is used.
- **Dark ground.** The machine is a bright object in a bright mall, and video reads best on dark.
- **Orbitron as the voice for words.** Every word on the machine (all caps, 44 px and up), machine names and short labels in the app.

## Argue against: Orbitron for the hero score

I measured it rather than guessing, running fontTools over the installed Orbitron and Saira Extra Condensed files. Column is 936 px.

| | Orbitron 900 | Punch Figures (stand-in: Saira Extra Condensed 900) |
|---|---|---|
| Widest digit advance | 0.834 em | 0.402 em |
| Width to height of the 0 | 0.98 | 0.49 |
| Stem width to figure height | 0.21 | 0.22 |
| Tabular figures | No. The 1 is 0.391 em, the 0 is 0.834 em, and there is no tnum feature | Set in fixed cells |
| "999,999" filling 936 px | 178 px font, 128 px figures = 50 mm, 43 arcmin at 4 m | 353 px font, 248 px figures = 97 mm, 83 arcmin at 4 m |
| "999,999.000" on one line | 117 px font, 84 px figures = 33 mm | 228 px font, 161 px figures = 63 mm |

**What I'd tell the brand owner:**

1. **Orbitron does fit, and it is legible.** 50 mm figures clear the 33 mm or so that the common signage rule (about 25 mm of cap height per 3 m) asks for at 4 m. I'm not claiming it can't be read. The point is that it can't be an event: at 128 px the score is 3% of a 1.5 m panel, which is caption size.
2. **The font's shape fights the screen's shape.** Orbitron's figures are almost square, on a screen 3.6 times taller than it is wide.
3. **It counts badly.** Orbitron's figures are proportional. A rolling count would change the number's width by up to 473 px at 178 px size. In fixed cells, the 1 sits in a cell twice its width, and "111,111" looks gap-toothed.
4. **Stacking doesn't solve it.** I tried Orbitron in two lines ("412," over "087"): it reaches the same 245 px, but it splits one score into what looks like two scores.
5. **The ask is small: 12 glyphs** (0 to 9, comma, point), drawn on Orbitron's own construction. Squared bowls, flat terminals, the same 0.21 stem ratio, tabular at 0.40 em. Because the stems match, the figures carry the same weight as the words beside them. From 4 m nobody sees two typefaces. They see a number twice as tall.
6. **Offer the test instead of the argument.** Run both on one panel at one site for a weekend, and measure how fast spectators at 4 m call out the score, and the second-attempt rate.

## Replace
- **`--font-sans: Orbitron` becomes Inter.** Width is not the reason: I measured a sentence in Orbitron 400 at only 14% wider than Inter. The reason is letterforms. Orbitron's squared rounds make o, c, e and 0, O, D converge at 13 to 17 pt, and a phone app is sentences. The landing page already uses Inter, so this also unifies site and app. Retire Poppins.
- **Supportive red #D50000 is removed from the machine.** It is nearly identical to brand red, and on a machine where red means "you hit hard", red cannot also mean "error". Faults use yellow #FFAB00: "NO READ".
- **Secondary magenta #D842D3** comes off the machine entirely. In the app it survives only as the colour of a challenge, so "Beat this" is recognisable at a glance.
- **The "Secondary BG" alphas are cool grey** (242, 243, 243) inside a warm neutral ramp. Rebase them on warm white (250, 249, 249).

## Fix
- Primary 700 and 800 are both #8D0A09. Set 800 to #750807.
- Neutrals 300 and 400 are both #CCBFBB. Set 400 to #C4B5B0.

## Extend (missing from the tokens)
- **Neutral 950 #0E0C0B,** the machine and app ground. The warm near-black keeps the red from vibrating and gives the 10% unlit cells and 30% rules steps that can be tuned on the real panel.
- **Machine alpha steps:** unlit 10, rule 30, secondary 64.
- **A type ramp by viewing distance, not by hierarchy:** Figures XL 353 / L 160 / M 96, and Words D4 112 (4 m), D3 72 (2.5 m), D1 44 (1.5 m), with a hard 44 px floor.
- **Physical minimums:** 1 px is 0.39 mm and shimmers at 4 m, so no rule is thinner than 4 px (1.6 mm).
- **Motion tokens:**

| Token | Value |
|---|---|
| recoil | 50 ms |
| flash | 220 ms, easeOutQuad |
| rise | 500 to 1,100 ms, ballistic |
| hit-stop | 50 ms |
| slam | 90 ms, then spring k 520, c 22 |
| ratchet | 110 ms per decimal |
| verdict | 360 ms, easeOutCubic |
| drain | 600 ms, easeInQuad |

- **App scale:** 8 pt spacing, 14 pt radius on buttons, Punch Figures for every score.
- **Screen care:** static elements orbit up to 8 px every 10 min, because the panel runs 12 hours a day.

## detail_touches

- **Unlit leading zeros.** The score sits in six fixed cells, and unused leading cells stay lit at 10% white ("000,412"). The number never changes width, the decimal point never moves, and a small hit shows how far it is from the top.
- **Fixed cells on purpose.** Orbitron's 1 is 0.391 em and its 0 is 0.834 em, with no tabular feature. A proportional count-up would shift width by up to 473 px.
- **The first digit stops first.** The count is locked to the fill height, and the ballistic ease makes the hundred-thousands cell stop first (1,468 ms in the clip), so the group can shout the first digit while the rest still spin.
- **The hit-stop freezes on the rival's number.** For 50 ms at the line, the counter shows exactly the score being beaten.
- **The broken line falls outward.** For someone standing directly behind the striker, the panel edges are the only part of band B they can see.
- **The QR sits at 1.18 to 1.35 m,** where a phone is already held, not at eye level where the arm has to come up.
- **All-caps QR URL.** It stays in alphanumeric mode: version 2 (25 modules) instead of 3 (29), so modules are bigger at the same plate size. Checked with the qrcode library.
- **Letter-only codes from 20 consonants.** No accidental words, no 0/O or 1/I confusion, and no digits competing with the score.
- **The code appears beside the score in band A too,** so it is in every photo the group takes of the screen.
- **Every numeral on the machine is Punch Figures,** even the near-miss gap inside a sentence ("3,120 SHORT OF MAYA").
- **Faults are yellow, never red, and the machine keeps the credit:** "NO READ. / CREDIT KEPT. / HIT AGAIN." On this machine red means you hit hard.
- **One flash per attempt, at 90% not 100%.**
- **The Pass push lands at about t 2,800 ms,** so the phone buzzes while friends are still reading the number.
- **Name width is checked in the app.** The field previews the name on the machine rail and blocks anything over 280 px at 44 px ("WWWWWW" measures 311 px).
- **The name choice is fair.** "Show KAI on machines" and "Stay anonymous" are the same size, and nothing is preselected.
- **Everyone behind the striker is blurred on device before upload,** so no one in the queue ends up in a stranger's reel.
- **Claiming wipes your code off the public screen on the same frame,** another reason to claim early.
- **The saved MP4 is 9:16,** with the score burnt in on the impact frame and the venue in the lower third. Every share is an ad with an address.
- **The day line has a floor** (0.8 x the 14-day median), so the first hit of the morning isn't "TOP OF THE DAY" by default.
- **Scrubber marks.** "Felt that" reactions sit as marks on the timeline where people reacted, and they cluster on the impact.
- **Pixel orbit.** Static elements drift up to 8 px every 10 min.
- **Stillness is designed in.** 610 ms where nothing moves, so four people can read the result together.

## pushback

## What I'd push back on
1. **"Three attempts and an app install" is a per-player metric for a product sold to groups.** A group of four that does six attempts and two installs is a success, but the brief's framing calls two of those people failures. Measure attempts per round (a chain of credits within 90 s) and claims per attempt.
2. **Three decimals on a 0 to 999,999 scale.** A force sensor doesn't resolve nine meaningful significant figures. The decimals are there to break ties. Keep them for ties and storage, and show them as a second tier (160 px on the machine, 40 pt on the phone). What is the sensor's real resolution?
3. **The panel dimensions don't agree.** 1080 x 3840 at 1.5 x 0.5 m means non-square pixels (0.39 mm tall, 0.46 mm wide). The alternative is a panel about 0.42 m wide. Which is it? And where are the mount height, the pad, the camera and the card reader? Every band in this design comes from those answers, so I made them config.
4. **The touch placeholder.** I designed for no touch. Even with a touch panel, the top 60% is out of reach and the player has sore hands or a glove on. Touch could only ever confirm things in band C.
5. **"The app is where attempts live."** The round is the better unit than the attempt. Players remember who they were with, not their third hit.
6. **Orbitron as `--font-sans`,** and the brand tokens' duplicate steps.
7. **Nothing about fairness or safety.** Force tracks body mass, children will use this, and bare-knuckle strikes hurt wrists. The go-again design needs limits that the brief doesn't ask for.

## What I'd validate
- **Can the group read it?** Use a 65 inch panel in portrait (about 1.43 m tall, close to scale) at matched pixel pitch, a stand-in striker at 1.2 m and eight people at 3 to 4.5 m. Measure time to call out the score and who won, comparing Orbitron with Punch Figures, with and without the line break.
- **Can they scan?** Measure time from result to claimed while gloves come off, success rates at 1 m and 1.5 m, and whether people scan during the replay or after it.
- **How does naming feel?** Measure opt-in rate, and interview people about being named on a public screen, specifically teenagers and women in mixed groups.
- **Does the line work?** Run two machines at one venue over two weekends, one with rounds and lines and one plain. Compare attempts per credit chain, claim rate and installs.
- **The near-miss threshold:** does 5% prompt a rematch, or feel like a taunt?
- **Giving the MP4 away:** does it lower installs or raise them through sharing?

## Questions I'd have asked
- Is touch available, and which part of the panel can a person actually reach?
- Mount height, pad position, and the camera's position and orientation (is the recording 9:16?). Where is the card reader?
- What does a median hit score, and what share of scores are six digits?
- What is the latency from sensor to screen, and the upload bandwidth at a typical mall?
- Can credits be sold in bundles? Is there ever an attendant on site?
- Can the camera read a phone QR at 1 to 1.5 m? Is there NFC?
- Do any sites have two machines side by side?
- Can I watch 50 real attempts on video? It would answer half of these.
- What consent signage do malls require for recording, what are the rules for minors, and where must the data be stored?

## For the notes
The font and QR measurements were scripted (fontTools on the installed font files, and the qrcode library). The occlusion and legibility maths is hand-worked from the stated assumptions, and needs checking against a real site.

## risks

- **The mounting assumptions could be wrong.** If the panel sits 30 cm higher or lower, the crowd line moves and band C leaves phone height. Band edges are config, but copy line lengths and rail sizes don't move with them. Without a site survey the zoning is an informed guess.
- **The brand owner could refuse a second numeral face.** The fallback is Orbitron 900 in fixed cells at 178 px, with the fill carrying more of the event. The design survives, but the number is half as tall and the count looks gap-toothed.
- **Rounds can't tell a group from strangers.** A stranger in the queue inherits the group's line. That could be a great rivalry or a confused "who is MAYA?". Names help, and it needs field observation.
- **Names on a public screen invite abuse:** offensive handles, harassment, or being singled out. The mitigations are a 6-letter A to Z limit with a profanity filter, the width check, a report path, and anonymous by default.
- **Visible codes can be claimed by someone else in the queue.** The exposure is about the same as someone filming the replay. It is mitigated by first-device binding, private-by-default clips, 24 h deletion of unkept video, and a "This is me" report that pulls a clip from public view.
- **The pressure mechanics can tip into shaming.** In family groups, a child's hit sits far below a parent's line. The copy guards help (LINE HOLDS, no worst-hit list, under-16s never named), but a "family round" mode may be needed.
- **Photosensitivity.** One flash per attempt is within WCAG's three-per-second limit, but it is 1.5 m of saturated red. Run it through a photosensitive epilepsy analyser before shipping.
- **Checking in with the Pass depends on hardware I haven't seen.** Camera angle, glare and phone brightness could make it unreliable. The QR fallback keeps the flow intact, but app players would lose the faster path.
- **Network at malls.** Replay upload can lag, so the claim page needs a "Your clip is on its way" state. If the round service is down, the machine must fall back to a plain mode: score, replay and QR only, with no rounds.
- **The height means different things in different places.** It is relative to today's best at this machine, so the same score rises to different heights at different sites. Players comparing screenshots may think a machine is rigged. The number stays the truth, and the top line is always labelled TOP OF THE DAY. New machines have no 14-day history and need a fleet-wide median.
- **The machine could hold too much state.** Rounds, rails, codes, callouts and claims are a lot for an unattended screen. Unless the round logic is tested hard against interrupts (a credit mid-rise, two claims at once, the round closing during a claim), the first thing players see go wrong will be a wrong name on the ladder.
- **Screen retention.** The crowd line and labels sit still for 12 hours a day. Pixel orbit helps on LCD, but an OLED panel would need stronger rules.