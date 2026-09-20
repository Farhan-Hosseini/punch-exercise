# Proposal: Ring the Bell  (propose:literal)

## thesis

The panel is 1.5 m tall, so the score should be measured in height as well as digits. Every strike launches the number up the screen like the puck on a fairground high striker, and how high it lands is how good it was. Height does three jobs digits cannot. It reads from across the concourse before anyone parses a figure. It gives the reveal real physics: a throw slowing to an apex, not a count-up. And it lifts good scores above the player's head, into the only band the queue can see past the player's body (measured below: from directly behind, the player blocks everything under about 1.81 m). At the top hangs the bell, today's best at this machine. It resets when the venue opens, so it can always be won. Everything else follows from that. Going again means closing the gap to the bell. The handoff means taking your climb home. The app turns the people who rang this bell into people you follow and challenge back at the same machine.

## machine_flow

### Physical frame (stated assumptions, one constant to change)
- 3840 px over 1.5 m gives **2.56 px/mm (0.39 mm/px)**. Assumption: panel bottom edge at 0.70 m, top at 2.20 m, and the pad in front at about 1.2 m. Height above the floor = 2.20 m minus y × 0.39 mm. Every zone is derived from `EYE_Y = 1536` (1.60 m), so if the real mounting differs, one offset moves them all.
- **Occlusion.** A spectator's eye is at 1.60 m, 4 m from the panel. The player's head top is at 1.75 m, 1.2 m from the panel. The sightline over that head hits the panel at 1.81 m, which is **y ≈ 1000**. The player's 0.45 m shoulders project to 0.64 m on the panel, wider than the panel itself. From straight behind, the queue sees nothing below y 1000.
- **Bands.** CROWD y 0 to 1000 (2.20 to 1.81 m): over heads. EYE y 1000 to 2300 (1.81 to 1.30 m): where a standing player looks naturally, about 12° below horizontal. HANDS y 2300 to 3100 (1.30 to 0.99 m): where a phone is held up to scan. FLOOR y 3100 to 3840: below the hips, nothing essential lives here.
- **Grid.** Text sits flush left at x 64. Numbers sit flush right at x 1000. The content column is x 64 to 1000 (936 px). **The Tower rail** is 8 px wide at x 1040 to 1048, running from the bell line (y 460) to the base line (y 3520). It is the one element that persists across every state.
- **Faces.** Words are Orbitron 700/900 in caps, 36 px and up. Sentences are Inter 600. Scores are Saira ExtraCondensed Black in fixed tabular cells (see Brand). The ground is `#0b0909`.

### S0 ATTRACT (loops until a credit goes in)
- CROWD: "RING THE / BELL." in Orbitron 900 at 140 px, two lines (756 px wide), cap tops at y 120 and 290. The bell line is a 1080 × 8 px bar in brand red at y 460, with "TODAY'S BEST" in Orbitron 700 36 px, neutral-300, at x 64, baseline y 520.
- EYE: posted clips from today at this machine, 936 × 1170 (4:5), y 1040 to 2210, crossfading every 6,000 ms. The bell holder's clip comes first, with its score at 120 px in the clip's bottom-right corner. **No clip plays here unless its owner chose "Post it".** With no posted clips, the band stays empty ground with the rail.
- HANDS: the machine check-in QR for app users, 297 px, at x 64, y 2400. Beside it, Inter 600 40 px: "Got the app? Scan in before you hit."
- FLOOR: "ONE CREDIT. ONE HIT." in Orbitron 700 56 px at y 3300, plus the payment pointer (depends on the hardware).
- Rail: every hit in the last 10 minutes leaves a 24 × 4 px neutral-700 tick at its height, so the tower looks warm when it is busy. The rail shifts ±2 px every 10 min against burn-in.

### S1 READY (from credit until the strike, no timeout)
- CROWD: bell line and label stay. A checked-in app user adds "@zara.k IS UP" (Orbitron 700 44 px, y 140), shown only when their profile is public.
- EYE: a live camera mirror at 50% opacity, 936 × 1170, so the player can frame themselves. Over it, "HIT IT." in Orbitron 900 220 px (737 px wide), cap top y 1400. Then "Full force. One hit." in Inter 600 48 px at y 1640.
- Rail marks, three at most, never with numbers: the bell (red), SET BEST (magenta 40 × 8 px, if a set is running), YOUR BEST and a rival's mark from a rematch (magenta outline, checked-in players only).
- FLOOR: the previous player's dock, if one exists: QR 297 px at x 64, y 3200, with "Last hit. Still yours to scan." in Inter 600 36 px. It disappears when this strike lands.
- After 90,000 ms without a strike, "HIT IT." becomes "STILL YOURS. HIT IT." (Orbitron 700 72 px, 838 px wide).
- Ends when the sensor detects an impact.

### S2 IMPACT (0 to 320 ms, the sensor window)
- The whole canvas dents toward the pad: scale 1.0 to 0.985 at 50 ms, back to 1.0 at 220 ms. The origin is (540, 2560). One red flash at 0 to 33 ms (see Motion). The puck, a light band, appears at the base line y 3520.
- Ends when the score arrives. The sensor must return within 300 ms. If it doesn't, the puck shimmers in place for up to 1,500 ms, then shows **NO READ**: "THAT ONE DIDN'T COUNT." (Orbitron 700 64 px, 930 px wide) with "Your credit is still good." in Inter 600 44 px. (Needs ops to confirm that a credit re-arms.)

### S3 CLIMB (700 to 2,000 ms, depending on the score)
- The number rides the puck from the base line to its landing line. Integer at 352 px, digits 242 px (94 mm) tall, right-aligned at x 1000. The digits count in step with the height. Details in Motion.
- **Landing height:** `y = 3520 - 3060 × min(1, s / bell)²`, where `bell = max(today's best, this machine's 30-day 90th percentile)`. Duration: `700 + 1300 × √(height fraction)` ms.
- Ends at the apex.

### S4 LAND (600 ms catch, or 1,400 ms bell)
- **Catch.** Two pawls, 40 × 12 px, slide in from x 0 and x 1080. The number drops 18 px onto them and squashes. The decimals slide in while the integer settles from 352 to 288 px.
- **Bell.** The number strikes the bell line and the CROWD band floods red. Label: "RANG THE BELL".
- Ends on the timer.

### S5 HOLD (1,600 ms)
- Only the number, the rail and its red notch at the landing height. This is the photo moment and the queue's reading time.
- Label above the number (Orbitron 700 44 px, neutral-300, x 64, cap top 96px above the digits): "RANG THE BELL" / "NEW SET BEST" / "SET BEST STANDS" / "YOUR BEST HERE" / "FIRST HIT" / "WARM-UP". A score of exactly 999 999.000 reads "OFF THE SCALE." in Orbitron 900 96 px and flags the operator.
- Ends on the timer.

### S6 REFORM (900 ms)
- The score docks in CROWD: baseline y 440, integer 288 px (digits 198 px, 77 mm, 758 px wide), decimals 110 px raised with their tops aligned (159 px wide), right edge at x 1000. A low score rises to this position. A bell score is already within 20 px of it.
- The replay wipes upward from y 2210 to 1040. The claim module fades up with a 40 px rise, starting 300 ms in.
- Ends on the timer.

### S7 AFTERGLOW (up to 40,000 ms)
- CROWD:
  - y 96 to 136: the label.
  - y 242 to 440: the score.
  - y 560 to 800: **the go-again statement**, Orbitron 900 120 px, left-aligned, one line. By condition: "BEAT THAT." (834 px), "YOUR MOVE." (884 px), "GO AGAIN." (691 px).
  - y 850 to 900: Inter 600 40 px sub-line, neutral-300. Copy lives in Go-again.
  - The rail keeps its red notch at the landing height, so the gap to the bell stays visible.
- EYE: the replay, 936 × 1170, y 1040 to 2210, radius 0. A 4.2 s loop: 1,000 ms at real speed, the 600 ms around impact slowed to 25% (2,400 ms), 800 ms real. "REPLAY" in Orbitron 700 32 px at x 96, y 1080, on a 40% black scrim.
- HANDS (y 2320 to 2860):
  - Left column x 64 to 520: "YOUR VIDEO." (Orbitron 700 56 px, 418 px wide). "Point your camera / at the code. / No app needed." (Inter 600 40/52). "Unclaimed videos are / deleted after 24 hours." (Inter 500 32/44, neutral-500).
  - Right: the QR tile, 462 × 462 on `#f4efed`, at x 538 to 1000, y 2320 to 2782. Under it, "PCH.GG/K7RX4M" in Inter 700 36 px, right-aligned, baseline y 2840.
- FLOOR: "Next credit starts the next hit." (Inter 600 40 px, y 3300). Machine name "Dubai Mall, Level 2" (Inter 500 32 px, neutral-600, y 3380).
- **Sub-state CLAIMED.** The server confirms. The QR dims to 20% and a 12 px stroke tick draws over the tile (300 ms). The copy becomes "SAVED." plus "It's on a phone now." (or "@handle" if the profile is public). If other attempts in the set are still unclaimed, the QR returns at 297 px after 1,200 ms with "Friends in this set can still scan."
- Ends when a new credit arrives (go to S1, with the dock in FLOOR), 10,000 ms after every attempt in the set is claimed, or at 40,000 ms (go to S8).

### S8 RETURN (1,200 ms)
- All content falls under gravity (easeInQuad) into the base line, staggered 60 ms from the top down. The notch shrinks to a 24 × 4 px activity tick for 10 min. Goes to S0.

**Nothing waits for input.** A credit interrupts any state after S5. S2 to S5 total at most 3,820 ms, and a queue cannot insert a credit faster than that.

## reveal_motion

**Clip: 8,000 ms, 1080 × 3840, 60 fps.** The case shown: the second hit of a set, **684 213.507**, rings the bell. The common catch landing is given as a variant.

| ms | What moves | From to | Easing | Physical logic |
|---|---|---|---|---|
| 0 to 33 | Full canvas flash, brand red at 55% | 0 to 55% to 0 | linear, 2 frames | The hit arrives before any information. One flash only, which stays under the 3-flashes-per-second limit. |
| 0 to 220 | Whole canvas scale around (540, 2560) | 1.0 to 0.985 (at 50) to 1.0 | spring, stiffness 900, damping 30, ζ 0.5 | The punch goes into the screen, so the screen dents. Nothing shakes sideways, because the force wasn't sideways. |
| 0 to 320 | Puck spawns on the base line y 3520: 1080 × 12 px white core, 160 px red glow | glow 0 to 100% | easeOutCubic | Charging. The sensor window hides inside the dent. |
| 320 | Score known. Destination y 460 (bell) | | | |
| 320 to 2,320 | The number, 352 px, rides with its baseline on the puck | y 3520 to 460 | easeOutQuad, cubic-bezier(.25,.46,.45,.94) | A throw against gravity: velocity falls linearly to zero at the apex. Duration 2,000 ms because it is a full-height climb, and climb time scales with √height. |
| 320 to 2,320 | Digits roll in their tabular cells (each rolls vertically, 6 px motion blur while fast) | 000 000 to 684 213 | same easeOutQuad on the value | The count is tied to the height, so the last digits tick slowest at the top. The suspense comes from the physics, not a timer. |
| 320 to 2,320 | Trail below the puck | 35% opacity, fading over 600 ms behind it | linear | Shows the path travelled. |
| ~1,540 | Puck passes the magenta SET BEST mark at y 1320 | mark flashes to 100% for 80 ms, ticks 12 px left, returns | easeOutBack | A small reward on the way up. The friend's mark is beaten in passing. |
| 2,200 to 2,320 | The number arrives with velocity still left, clipped to the bell | | | Scores above the bell still hit it hard. |
| 2,320 | **Bell strike.** Bell bar jolts up 64 px and returns | y 460 to 396 to 460 over 360 ms | spring, stiffness 1200, damping 22 | The bar has less mass than the number, so it moves more. |
| 2,320 to 2,340 | Number squash on contact | scaleY 0.94, scaleX 1.03, then back | 20 ms in, 180 ms spring out | Contact frame. |
| 2,320 to 2,720 | CROWD band floods brand red from the contact point outward | horizontal wipe, 2,400 px/s, clipped to y 0 to 1000 | easeOutQuart | The ring spreads. |
| 2,320 to 3,040 | Three ring outlines, 4 px white at 60%, expanding from the bell bar | scale 1 to 1.35, opacity to 0, staggered 120 ms | easeOutCubic | A visible stand-in for sound. Nothing depends on audio. |
| 2,440 to 2,520 | Hang, zero motion | | | The apex needs stillness or it reads as floating. |
| 2,520 to 2,800 | Integer compresses 352 to 288 px, anchored at its right edge, while the decimals ".507" slide in from x +160 at 110 px | | easeOutCubic 280 ms, decimals delayed 60 ms | The big number makes room for its tie-break. This is the settle. |
| 2,700 to 2,940 | Label "RANG THE BELL" types in (character stagger 18 ms, 44 px, white on red) | | step | Names the event only after it has happened. |
| 2,800 to 4,400 | **HOLD.** Only the red notch on the rail breathes, 100% to 70%, one cycle | | sine | The photo moment. Everything else is still. |
| 4,400 to 4,700 | Red flood recedes to a 12 px red band under the label | | easeInOutCubic | Returns the ground so the replay can read. |
| 4,700 to 5,600 | REFORM: "BEAT THAT." rises in (y +40 to 0, 0 to 100%). Replay wipes up from y 2210 to 1040 | | easeOutCubic 500 ms, replay 900 ms | |
| 5,000 to 5,900 | Claim module fades up (QR tile, then copy, 80 ms stagger) | | easeOutCubic | |
| 5,900 to 8,000 | Replay runs through the impact at 25%. QR live. End frame = AFTERGLOW | | | Shows where the clip hands off. |

**Catch variant (no bell), e.g. 402 877.130, landing at y 2220.**
- Climb 1,560 ms.
- At the apex, 120 ms of hang.
- The pawls slide in from both edges to the landing line (90 ms, easeOutCubic).
- The number falls 18 px onto them (120 ms, easeInQuad), squashes to scaleY 0.96 (60 ms), rebounds 6 px, and settles by 270 ms (spring ζ 0.5).
- A 2-frame white flash on the pawls at contact.

Weight comes from what gets withheld: no motion during the hang, no motion during the hold. Low scores fall a short way. High scores fall far.

**Why the big number reads as an event.**
- It is the only moving object for 2 s.
- It physically travels 1.2 m, so its arrival changes the screen's composition, not just its value.
- Its arrival height tells you the verdict before you read it.
- The one colour change on the whole screen (the red flood) is reserved for beating the bell.

## handoff

**Primary path: one QR per set, scanned from where the player already stands.**
- **The link.** The QR encodes `HTTPS://PCH.GG/K7RX4M` (short domain is a placeholder). Everything is uppercase, so the code uses alphanumeric mode. At 21 characters it fits a **version 2 code (25 modules) at ECC Q**. Mixed-case would need version 3. ECC Q tolerates glare from mall lighting.
- **The size.** 25 modules plus a 4-module quiet zone is 33 × 14 px = 462 px (180 mm), with 5.5 mm modules. Scan distance runs about 10× code width, so roughly 1.6 m. The player doesn't have to step forward. Dark modules on an off-white tile, because some older scanners fail on inverted codes.
- **The token.** The machine mints it locally (signed, bound to machine and set), so the QR never waits on the network.
- **What opens.** A web claim page on Android, an App Clip on iOS (same URL). Google Play Instant is no longer a path to rely on, so Android gets the web page. Target: the video plays within 1,000 ms. The machine uploads a 480p preview first (4 s clip, about 600 KB) and the 1080p file follows. If the upload lags, the page shows the score and "Your video is on its way."
- **The page.**
  - The clip autoplays muted and loops.
  - The score in the same Saira face as the machine.
  - "Dubai Mall, Level 2. Just now."
  - For a set, a row of the set's hits labelled by time order, each with a "Mine" toggle.
  - Two buttons, both explicit: **"Save and post"** ("It can play on this machine and the wall") and **"Save privately"**. Either one opens Sign in with Apple or Google in a single sheet, then saves.
  - Secondary: "Send the set to your group", through the share sheet, so every friend claims their own hit.
  - Only after saving: "Get the app to follow this machine."

**Machine after a successful claim.**
- The server pushes the claim within 1,000 ms. The tile dims and a tick draws over it. Copy changes to "SAVED." with "It's on a phone now." (or @handle, if that profile is public).
- If no confirmation arrives within 3,000 ms, the QR simply stays. The machine never shows a success it hasn't received.
- If others in the set are unclaimed, the QR returns at 297 px with "Friends in this set can still scan."

**Fallbacks, in order of how often they will actually happen.**
1. **The photo is the fallback.** People photograph their score. From 2 m, a phone's portrait frame covers about 2.5 m of height, so the whole panel fits, including the QR. iOS Photos and Google Lens both detect codes in saved photos.
2. **Typed code.** Short code `K7RX4M` at pch.gg or in the app's Scan tab, using an alphabet of 25 characters with no 0/O, 1/I/L or 5/S.
3. **NFC tag** on the cabinet at hand height, if the hardware can take a sticker. It is static and resolves server-side to the attempt currently on screen.
4. **A new credit arrives before scanning.** The QR docks at 297 px in the FLOOR band until the next strike lands. If the same group keeps playing within 60 s, it's the same set, so the QR returns with all of their hits.
5. **Left with nothing.** The attempt is gone after 24 hours. Honest, and stated on screen.

**Expiry and privacy.**
- Claim tokens last 24 h. Unclaimed clips are deleted at 24 h.
- The set link shows unclaimed videos for 30 min after the set closes, so the group chat works. After that it shows score and a blurred first frame only, until claimed.
- Claims are rate-limited per IP and per account, and every claim is logged.
- A mis-claim can be reported from the clip itself ("This is me"), which sends it to review.
- The machine never shows unclaimed faces outside the owner's own AFTERGLOW. Attract loops use posted clips only.
- Handles show on the machine only for public profiles.

**Players who already have the app.**
- **Before the hit.** Scan in with the Scan tab on the attract-screen machine QR (or, later, BLE proximity). The machine greets them in READY and shows their marks (YOUR BEST, rematch rivals). The attempt is claimed automatically. AFTERGLOW shows "Saved to @handle" in place of the QR and gives the space to the replay.
- **"Not me".** If a friend took the hit, the phone offers "That wasn't me". It releases the attempt with a fresh code the player can pass on. Check-in expires after 3 min without a credit.
- **After the hit.** Scanning the attempt QR with the system camera opens the app directly through a universal link, already signed in. One tap, "Save and post" or "Save privately", and it lands at the top of the reel.

## go_again

**Mechanic: the set, measured against the bell.**
- Credits within 60 s of the last hit join the same set. The set's best becomes a magenta SET BEST mark on the tower.
- In the next player's climb, passing that mark flashes it, so friends beat each other visibly before any digits settle.
- The bell (today's best here) sits above everything. Most people won't reach it, but the r² display scale makes the last 20% of the gap look large and close.

**What the screen says (the CROWD band, over the player's head, to the group):**

| Condition | Statement (Orbitron 900 120 px) | Sub-line (Inter 600 40 px) |
|---|---|---|
| Rang the bell | BEAT THAT. | Today's best at this machine, just now. |
| New set best | YOUR MOVE. | Whoever's next, the mark is on the tower. |
| Set best stands | GO AGAIN. | The magenta mark is the one to beat. |
| First hit, below the bell | GO AGAIN. | Most second hits land harder. (only if the machine's own logs confirm it; otherwise no sub-line) |
| Warm-up (bottom 10% of height) | GO AGAIN. | Aim through the pad, not at it. |

**How it sells, and to whom.**
- **To the player:** the notch on the rail, a physical distance to the bell.
- **To the group:** a mark with no name to beat, plus a statement addressed to "whoever's next". The queue sees both over the player's head.
- **The same QR** covers every hit in the set, so a group doesn't have to organise four scans. Keeping the set going costs nothing in effort.

**Honest line between motivating and manipulative.**
- **Motivating, and true:** the bell is a real, reachable, daily target. Set marks are real friends' scores. The coaching line is only shown if the data supports it.
- **Manipulative, and I'm naming it:** the r² height scale exaggerates how close a near miss looks (a hit at 90% of the bell lands at 81% of the height). It is a display scale, never labelled as linear, and the app shows the true gap in words. Near-miss framing is a known compulsion hook. It is more defensible here because the outcome is skill, not chance, but I would monitor spend per session and cap AFTERGLOW prompts after 6 credits in a set (the statement drops to nothing).
- **Rejected:** a visible countdown on the 60 s set window. The window exists so the machine can group hits, and turning it into ticking urgency would be false pressure. It closes silently.
- **Rejected:** "3 for 2" price nudges on screen, until ops confirm how credits are sold.

## phone

**Platform:** iOS first, iPhone 16 frame **393 × 852 pt**, dark theme only in v1 (video first, and it matches the machine). The claim page is built at the same 393 × 852 in Safari and as an App Clip. Android follows with the same IA.

**Type:**
- Inter: 22/28 (600) titles, 16/22 (400) body, 13/18 (500) labels.
- Saira ExtraCondensed Black for every score (decimals at 38%, raised).
- Orbitron 700 only for the wordmark and machine names.
- Side margin 16 pt, 4 pt base grid.

**IA: three tabs** (bottom bar 83 pt, including the home indicator):
- **Machines**: the places and people.
- **Scan**, in the centre: claim, check in, or enter a code.
- **You**: profile and reel.

Leaderboards are not a tab (see Competition). Crews and tokens from the current app stay where they are and are out of scope here.

**P1 Claim (web / App Clip)**
- y 0 to 520: the clip at 9:16, 393 wide, cropped top and bottom, muted loop.
- y 470 to 520 overlay: score at 48 pt, right-aligned at x 377.
- y 540: "Dubai Mall, Level 2. Just now." (13 pt, neutral-500).
- y 580 to 660, a set only: horizontal row of 56 × 100 thumbnails, each with a score (20 pt) and a "Mine" check.
- y 700: "Save and post" (primary, 52 pt tall, full width, white fill with ink text).
- y 764: "Save privately" (secondary, outline).
- y 820: "Unclaimed videos are deleted after 24 hours." (13 pt).

**P2 You (profile and reel)**
- y 59 to 103: 32 pt avatar, "@zara.k" (17 pt, 600), settings icon on the right.
- y 120: "Best, at Dubai Mall L2" (13 pt, neutral-500).
- y 140 to 212: **684 213** at 72 pt with ".507" at 27 pt, left-aligned to the text column. This is the only big number on the screen.
- y 230 to 270: **Next above you** strip: 28 pt avatar, "@karim_h holds the next spot here", and a thin gap bar with no figure. Tapping it opens the ladder.
- y 290 onward, **the reel, grouped by visit, not a grid:**
  - Visit header: "Saturday evening, Dubai Mall" (15 pt, 600).
  - The visit's best hit as one large 361 × 451 pt (4:5) card: score 40 pt bottom-left, "Rang the bell" label if earned.
  - The visit's other hits in a row of 72 × 128 pt thumbnails, each with a score at 20 pt under it, right-aligned in its cell.
  - Under the visit, an **"Also here that evening"** row: 28 pt faces of people who posted from the same machine within the same hour. These are the people who were in your queue.
  - A single-hit visit uses a compact row instead: 96 × 170 thumbnail, score 28 pt, place, and "Karim and Lina felt that".
- "When" is words ("Saturday evening", "Last Thursday"). Exact time only on the clip.

**P3 Clip**
- Full-bleed 9:16 video, 393 × 699 from y 0.
- Top overlay: back chevron, "Dubai Mall, Level 2" and "Sat, 6:42 pm" (13 pt).
- Bottom scrim, 40% to 0% black, from y 560: score 56 pt, then owner row (avatar and handle, Follow).
- y 720 to 790, **three reactions as words, not icons with counters**: "Felt that" (the impact), "Form" (technique), "Rematch". Viewers see no counts. Owners see a sentence ("Karim and 11 others felt that").

**P4 Rematch (the loop back to the machine)**
- Sheet: "Rematch @karim_h at Dubai Mall, Level 2". Their score at 40 pt. "Their mark will be on your tower next time you scan in there." Button: "Send rematch". Karim is notified.
- It closes when either player beats the mark (both get the clip) or after 7 days.
- On the machine, the mark appears only for the checked-in challenger.

**P5 Machine page**
- y 59 to 140: "DUBAI MALL" (Orbitron 700 20 pt) over "Level 2, near the cinema entrance" (13 pt).
- y 160 to 520, **The bell**: today's holder's clip at 16:9, 361 wide, autoplaying muted. Score 40 pt. "Held since this afternoon." "Resets when the mall opens."
- y 540 to 600, **Regulars**: overlapping 36 pt faces with a "Follow regulars" text link. Regulars are people with 3 or more visits in 30 days who chose to be listed.
- y 620 onward, **The wall**: posted clips from this machine, newest first, in a single column of 361 × 451 cards with score, handle and reactions. They alternate with 1-line "rang the bell" events, so the rhythm varies.

**P6 Scan**
- Full camera view with a 240 pt reticle.
- "Scan the code on the machine's screen."
- Below: "Enter a code instead" text field, 6 characters, uppercase, filtered to the claim alphabet.

**Connection to the people who use these machines.**
- Everything is anchored to a place you have physically stood: machines you've hit, the queue you stood in ("Also here that evening"), and regulars.
- Rematches pull people back to the same cabinet.
- Following is suggested only from shared places, never from a global list.

## competition

**Machine: today, here, nothing else.**
- The bell is today's best at this cabinet, resetting at venue opening (a midnight reset would split Friday night).
- Set marks and rematch marks are the only other competitors shown.
- No global or national board appears on the machine. A mall walk-up who sees 987,654 from somewhere else learns that it's not for them. A daily local bell tells them it's winnable this afternoon.
- The attract loop shows the bell holder's posted clip. The best person here today is literally the face of the machine.

**Phone: over time, and relative to you.**
- A ladder inside each machine page and behind the "Next above you" strip on the profile. Scopes: "This machine, this week" (default), "This city, this month", "Everywhere, all time" (one level deeper).
- It opens **centred on you**: three people above, one below, with the top reachable by scrolling up. Not a podium of three people you will never meet. The existing top-3 podium with crowns becomes the header of the all-time board only.
- Rows: rank in a 32 pt right-aligned column, avatar, handle and home machine, score right-aligned (Saira 24 pt). Rank is the only other numeral in the row, and it's the thing being asked.

**Why this split.**
- The machine is shared, public and seen for seconds, so it can only carry one comparison that everyone understands at a glance: the bell.
- The phone is private and revisited, so it holds history, rivals and scope.
- Cross-venue boards also depend on calibration between machines, which I would verify before shipping them (see Pushback).

## brand

**Kept**
- **Brand red #eb1110** as the one accent, with one job: impact (the flash, the puck glow, the bell, your notch). Never a state colour. Contrast: 4.55:1 for white on red, which passes AA, so white-on-red works for the bell flood. Red text on the brand's own neutral-900 #221e1d is only 3.63:1, and 4.37:1 on my screen ground, so red text only appears at 36 px and up (large-text 3:1).
- **Orbitron** as the brand's voice: wordmark and caps words at 36 px and up on the machine, machine names on the phone.

**Replaced (measured, not a matter of taste)**
- **Hero score face.**
  - Orbitron 900 digit advances run from 391 to 834 units, and the font has **no `tnum` feature**. A counting number jitters as a "1" becomes a "0".
  - "999,999.000" sets at 7.98 em, so in a 960 px column it maxes out at **120 px with 87 px (34 mm) digits**. Using the 1 inch of letter height per 10 ft impact rule, that reads at a glance from about 4.1 m: exactly where the queue stands, and nowhere beyond. Splitting off the decimals only gets it to 151 px (43 mm, 5.1 m).
  - At 900 its counters close to slits, so 9, 8, 6 and 0 fill in at distance.
  - **Saira ExtraCondensed Black** in fixed 402-unit cells fits "999 999" at 288 px plus ".000" at 110 px inside 936 px. Digits are **198 px (77 mm)**, reading from about 9.3 m. On landing the integer alone is 352 px, 242 px (94 mm) digits.
  - **The pitch to the brand owner:** tape A3 prints of both at 1:1 physical size to a wall and stand at the queue line. Saira shares Orbitron's squared, rounded-rectangle skeleton, so the number looks cut from the same material. Long term, Orbitron is OFL: commission a 12-glyph condensed numeral cut drawn from its skeleton, "PunchApp Numerals", released under a new name as the licence requires.
- **Grouping.** A 0.22 em gap in place of the comma. It is locale-neutral (in German, French or Turkish, "999,999" reads as 999.999), and it matches the brief's own count of "six digits, a separator and three decimals".
- **`--font-sans`: Orbitron to Inter.** Orbitron sets a sentence 16% wider than Inter at the same size, has 207 glyphs with no Arabic or Cyrillic (the company markets in Dubai), and no tabular figures. The fallback "Arial Black" isn't installed on Android or Linux, where kiosks usually run, and Arial is far narrower, so a font-loading failure reflows everything. Inter is already the landing page's face. Pair it with Noto Sans Arabic.

**Extended and fixed, line by line**
- `primary-800` duplicates 700 (#8d0a09, L* 29.2 twice). Set it to **#750808** (L* 23.6), halfway to 900 (L* 18.0). Also, 400 to 500 is only 4.4 L* apart, the smallest step in the ramp.
- `neutrals-400` duplicates 300 (#ccbfbb). Set it to **#c4b5b0** (L* 74.8). The ramp also has a cliff: 600 to 700 drops 23.9 L* (64.6 to 40.7), which is exactly where dark-UI secondary text needs to live. Re-space 700. And 50 has hue 18° while the rest sit near 40°.
- **Add** `neutral-950 #151211` and `ground #0b0909` for an all-day dark screen. Neutral-700 is 3.16:1 on that ground, so it is decoration only. Text starts at neutral-600 (7.29:1).
- **Error red vs brand red.** #d50000 is **ΔE2000 5.2** from #eb1110: tellable apart side by side, not in isolation. The machine never uses supportive red (a player can't make an error there). On the phone, errors use `red-secondary #99050a` on `red-tertiary #fbe5e5` (7.33:1) with an icon and words.
- **Secondary magenta** has 4 of 10 stops, and its 900 (#9c339d) is only 14 L* below its 500. Give it one job, "someone else's mark" (set best, rivals, rematch), because it is ΔE2000 38.6 from brand red. Build out 200 to 800. On the ground it is 5.33:1.
- **Green** #00c853 is 2.24:1 on white and **yellow** #ffab00 is 1.9:1, so neither can be text on light. Yellow-secondary also drifts from hue 75° to 88° (olive). Keep both off the machine.
- **Opacity sets.** "Main BG" white and "Secondary BG" #f2f3f3 differ by 2 of 255 levels at 10% over black, so one set is redundant. #f2f3f3 is also cool against warm neutrals. There is no black scrim scale at all, and a video UI needs one: add `scrim-40/60/80`.
- **Missing entirely:** type scale, spacing, radius, elevation, motion. Motion tokens added:
  - `dur-impact 320ms`, `dur-hold 1600ms`, `dur-reform 900ms`
  - `ease-climb cubic-bezier(.25,.46,.45,.94)`, `ease-fall cubic-bezier(.55,.085,.68,.53)`
  - `spring-catch {stiffness 900, damping 30}`
  - A machine scale in px with mm alongside (2.56 px/mm).
- **Semantic names** over shade names: `--color-impact`, `--color-rival`, `--color-danger`, `--font-score`.
- **Ship fonts locally** on the machine: the variable Orbitron is 38 KB for every weight. No CDN for an unattended cabinet.

## detail_touches

**The number**
- The count uses the climb's own easeOutQuad, so the last digits tick slowest at the apex.
- Climb time scales with √height, like a real projectile. Low scores are over quickly, big ones earn their suspense.
- Digits sit in fixed 402-unit cells, right-aligned at x 1000. Nothing jitters, and leading cells are empty, not zero-padded.
- Decimals are tie-breakers: raised, at 38%, arriving 60 ms after the integer settles.
- The digit gap replaces the comma: locale-neutral, and consistent with the brief's own character count.
- 999 999.000 is treated as sensor saturation: "OFF THE SCALE." plus an operator flag.

**Motion and the panel**
- The screen dents toward the pad and never shakes sideways, because the punch went in, not across.
- One flash per strike, well inside the 3-flashes-per-second photosensitivity limit.
- Low scores land behind the player's own body from the queue's view. Only high scores rise over heads. Kindness and reward from the same geometry.

**The QR and the claim**
- An uppercase URL puts the QR in alphanumeric mode: version 2 with 14 px (5.5 mm) modules. ECC Q for glare. Dark modules on off-white `#f4efed`, never inverted.
- The claim token is minted on the machine, so the QR works during a network outage.
- The photo everyone takes of their score contains the QR by composition.
- The short-code alphabet drops 0/O, 1/I/L and 5/S.
- The machine never shows a success tick it hasn't received from the server within 3 s.

**Copy and content**
- Machine copy never says "tap", "press" or "swipe".
- Label words appear only after the event happens ("RANG THE BELL" types in after contact, not before).
- Replay slows to 25% only for the 600 ms around impact, and is labelled "REPLAY" so it isn't mistaken for a live mirror.
- The camera records 9:16 for the phone. The machine shows a 4:5 crop centred on the impact frame.

**Operations**
- The bell resets at venue opening, not midnight.
- The static rail and check-in QR shift ±2 to 4 px on a 5 to 10 min cycle against burn-in.
- The QR tile exists only in AFTERGLOW, never all day.
- Every vertical zone derives from one `EYE_Y` constant.

**Phone**
- Reel dates are words ("Saturday evening"). Exact time appears once, on the clip.
- Reactions show no counts to viewers.
- "Also here that evening" turns the queue you stood in into people you can follow.
- The App Clip card image is static per experience (a platform limit), so per-attempt personalisation lives on the page itself.

## pushback

**Pushback on the brief**
- **Touch "[IS / IS NOT]" was left unfilled.** I designed for no touch. If touch exists, one enhancement only: a tap during AFTERGLOW restarts the replay from impact.
- **1080 × 3840 is 9:32, but 1.5 × 0.5 m is 1:3.** At 1.5 m tall, square pixels give a 0.42 m active width. Is there a 39 mm bezel per side, or are the pixels non-square? Every mm figure above assumes square 0.39 mm pixels.
- **"Six digits, a separator and three decimals" is 10 characters, but "999,999.000" is 11.** Which does the product mean? And what is the sensor's real resolution? If repeatability is ±2%, the last four figures are noise presented as precision. I would keep decimals only as a visually subordinate tie-break.
- **"Three attempts and an app install" asks for an install at the worst moment:** both hands just used, queue behind, mall data. I'd make the goal a signed-in claim at the machine, then let the install be triggered later by a social event (a reaction or a rematch). I'd report claim rate per set, not installs per machine.
- **The tokens contradict the live product.** The landing page and app use Poppins and Inter, while the tokens make Orbitron the body face. Which is the source of truth?
- **The existing app ranks by geography** (Global / National / Regional). If machines aren't calibrated against each other (the site claims "precision-calibrated"), cross-venue boards compare instruments, not people.

**Questions I would have asked**
- Mounting height of the panel's bottom edge, and where the pad sits relative to it.
- How credits are bought (coin, card, QR pay, in-app). If payment happens on a phone, identity is known before the strike and the handoff moves earlier.
- Sensor latency from impact to score: is it under 300 ms?
- Camera aspect ratio, clip length, and whether the camera can read a code for check-in.
- Venue network: upload bandwidth, and whether it's shared Wi-Fi or its own LTE.
- Whether a failed read re-arms the credit.
- Minimum age policy. Walk-up mall traffic includes teenagers, and posting video of minors raises COPPA, GDPR-K and UAE PDPL questions.
- Can the cabinet take an NFC sticker?

**What I would validate with users and data**
- **Bell definition:** today's best vs the 30-day 90th percentile. Measure the repeat-credit rate within 60 s.
- **Maximum climb time:** 2,000 vs 1,200 ms, with a stopwatch on queue throughput on a Saturday.
- **QR placement:** HANDS band vs CROWD band, measuring scan rate per set.
- **Whether groups share the set link**, and whether each friend then claims their own hit.
- **Whether players read the height scale as linear**, and whether the r² scale erodes trust once they notice.
- **Whether decimals change behaviour** (people going again to beat a tie).
- **The claim "Most second hits land harder"**, checked against the machine logs before it ever goes on screen.
- **Whether spectators actually read the score from 4 m and beyond:** A3 prints and a tape measure, not opinions.

## risks

- **Mounting geometry is assumed.** If the panel sits low (bottom edge 0.3 m), the over-heads band shrinks to about 400 px, and the "rise above the player" argument weakens to a purely aesthetic one. The zones are parameterised, but the thesis isn't.
- **The high striker is a carnival cliché.** Done literally (bell icons, circus type, a hammer), it turns kitsch and fights a sport-tech brand. The execution has to stay austere: a line, a rail, a number.
- **The bell can be killed early.** One strong outlier at 11 am makes the rest of the day unringable. Mitigations: set best and rematch marks give closer targets. If data shows the bell going stale, the fallback bell is the 90th percentile for the hour.
- **The r² scale** could be read as dishonest once noticed. It needs the app to state the true gap, and research to confirm it isn't resented.
- **Replacing Orbitron for scores** may be vetoed as off-brand, because the score is the most-photographed brand asset. If vetoed, Orbitron at 151 px with split decimals is the fallback, and I'd name its 5 m legibility ceiling in writing.
- **Claim theft:** strangers claiming from photos posted publicly. Rate limits, the 30-min video window and the report flow reduce it but can't remove it. Minors on video is the most serious version of this risk.
- **Latency.** The impact beat depends on a score within 300 ms. Venue uplink failing to deliver a 480p preview within about 2 s breaks the "plays straight away" promise, which is the handoff's main selling point.
- **AFTERGLOW gets cut short** whenever there's a queue. The busiest hours produce the fewest claims unless the FLOOR dock and the photo fallback carry them. Measure claims by queue length.
- **Burn-in and brightness.** An all-day dark screen with a persistent rail. Unattended, unadjustable hardware can't be fixed by a player, so pixel shifting has to ship on day one.
- **Three typefaces** (Orbitron, Saira, Inter) could drift into inconsistency without strict role tokens. `--font-score` must be the only way a score is ever set.