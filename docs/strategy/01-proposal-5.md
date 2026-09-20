# Proposal: Ring the Bell  (propose:operator)

## thesis

The panel is a high striker turned into a screen. Its width belongs to the score and its height belongs to the force. A red column rises from the floor of the screen toward one white Line under the score, and that Line is the hardest strike on this machine today. The player, the queue and someone walking past at ten metres can all see how hard it was before they read a digit. Everything that has to be read sits in fixed zones that never move or resize with the value, from 0.000 to 999 999.000. The reveal runs entirely on the machine with no network. The handoff is a two-second scan at chest height, backed by a letter code that still works if the phone is dead. No state can hold back a paid credit for more than about three seconds. The motion is exciting because its physics are true: rise time follows one fixed gravity for every strike, the column never overshoots the real value, and the number is the one heavy thing that falls.

## machine_flow

### Ground rules (apply to every state)

**Physical mapping (assumed, confirm before build).** Pixels are square at 0.39 mm (1.5 m / 3840), so the visible width is 0.42 m, not 0.5 m. The panel's top edge is 2.05 m from the floor and its bottom edge 0.55 m. Height at a given y = 2.05 m minus (y x 0.39 mm). Reference lines:
- **y 594 (1.82 m).** A spectator 4 m back (eye height 1.60 m) sees over a 1.75 m player standing 1.25 m from the panel from here up. Everything the queue must read sits above this line.
- **y 1152 (1.60 m).** Adult eye level.
- **y 1985 (1.27 m).** Chest height, where people hold a phone to scan. The player's torso sits between the queue and anything placed here.

**Column.** Content runs from x 60 to x 1020 (960 px), and everything is left-aligned to x 60. There is one alignment logic, and nothing is centred. The gutters (x 0-60 and x 1020-1080) carry only the force rails. The ground is #000000.

**Type.** Words use Orbitron 900 or 700. Numerals use Saira Extra Condensed 900 (a stand-in, see Brand). Sentences use Inter 600. Nothing on the machine is smaller than 32 px.

**Fixed zones (identical in every state):**

| Zone | y | Content |
|---|---|---|
| Z0 | 0-140 | Bezel margin, empty |
| Z1 Label slot | baseline 200 | Either a label in Orbitron 700 40 px at 70% white, or a verdict in Orbitron 900 64 px (max 900 px wide) |
| Z2 Score slot | cap top 260, baseline 472 | Six fixed 124 px integer slots with a 37 px group gap after the third; leading zeros are ghosts at 12% white; decimal point and three decimals at 123 px, 60% white, same baseline. Always exactly 960 px wide |
| The Line | 520, 4 px white, x 60-1020 | The bell. The column top at 100% equals today's best here |
| Z3 Replay | 600-1680 | 960 x 1080 video panel |
| Z4 Keep | card x 60-511, y 1760-2211 | White QR card, square corners: QR version 4, 33 modules x 11 px = 363 px (142 mm), 44 px quiet zone. Right column x 551-1020 (469 px), headline Orbitron 900 44 px on a 56 px line pitch |
| Z5 Round | 2420-2830 | "THIS ROUND" label at baseline 2450; leader thumbnail 300 x 300 at x 60, y 2480; three others 200 x 200 at x 390 / 605 / 820, y 2580; "LEADS" at baseline 2830 |
| Z6 Go again | 2908-3220 | Placed next to the payment reader; set these y values to the real reader height |
| Base | 3700, 3 px, 25% white | Column range: 0% at y 3700, 100% at y 524 (span 3176 px) |

**Numerals per screen.** S0 shows one (today's best). S1 shows none; the ghost zeros are texture. The S1 carry-over card shows one (the last strike). S2 and S3 show one (this strike). The round board and all copy use no numerals.

---

### S0 ATTRACT (idle loop, 20,000 ms)
**Purpose.** Teach the metaphor to passers-by before they pay: a full column means today's best.
- **0-900 ms.** The column rises from y 3700 to y 524 (900 x the square root of 1). Today's best counts up in lockstep with the column and lands on the Line. The landing is the S2 landing at 60% amplitude with no screen shake. Shake is reserved for real strikes so it keeps its meaning.
- **Z1.** "TODAY'S BEST HERE". **Z2.** Today's best. **Below the Line.** "SET BY KAZ.R" in Orbitron 700 40 px, but only if the holder opted in to "Show my name on machines". Otherwise nothing.
- **Z6, 1,500-12,000 ms (white on red, 4.55:1).** "ONE CREDIT." and "ONE STRIKE." in Orbitron 900 96 px (691 px wide) at baselines 2960 and 3070. "PAY AT THE READER" in Orbitron 700 40 px at baseline 3170, with a 70 x 120 px arrow pointing at the reader.
- **12,000-12,700 ms.** The column drains (easeInQuad).
- **12,700-20,000 ms, on black.** Z3 plays a featured clip, but only one whose owner opted in for that clip and is an adult. Otherwise it plays an illustrated demo with no faces. Z4 shows the arm QR with "HAVE THE APP?" / "SCAN TO SAVE" / "YOUR NEXT" / "STRIKE" in 44 px.
- **No strikes yet today.** Z2 shows ghost zeros, Z1 reads "NO STRIKES YET TODAY" (Orbitron 900 64 px, 898 px), and the column stays empty.
- **Ends when** a credit is accepted (goes to S1) or a phone arms the machine (S1 shows the armed row).
- **After venue closing time (S6).** 30% brightness, no column.

### S1 READY (credit accepted)
**Purpose.** Show the machine is armed and that the credit is safe.
- **Z1** "NEXT STRIKE". **Z2** "000 000.000", all ghosts at 12%.
- **Eye band.** "STRIKE" in Orbitron 900 200 px at baseline 1100 (838 px wide). "WHEN READY" in Orbitron 900 96 px at baseline 1240.
- **Armed.** A 96 px avatar disc (the phone owner's profile colour and initial) at x 60, y 1300, next to "SAVES TO M" in Orbitron 700 48 px at baseline 1366.
- **After 30,000 ms without a strike.** "Your credit is still here." in Inter 600 40 px at 75% white, baseline 1470.
- **Base.** A red band at y 3660-3700 breathes between 60% and 100% opacity on a 1,600 ms sine.
- **S1c carry-over.** Applies when a credit arrived before the previous strike was kept. Z4 keeps the same QR in the same place. The right column reads "LAST STRIKE" / "SCAN TO" / "KEEP IT" (44 px), then the previous score in Saira 96 px at baseline 2080 (299 px wide), then the code "KTRBX" in Orbitron 900 64 px at baseline 2204. A 4 px bar at 70% white sits at y 2250, starts at x 60-1020 and shrinks to zero width over 20,000 ms, linear. It is the only timer on the machine, and it has no digits. The card goes after 20,000 ms or on the next impact frame, whichever comes first.
- **Ends on** an impact (goes to S2). A credit is never eaten.

### S2 REVEAL (impact to settled)
**Purpose.** The event. The full timeline is under Reveal motion.
- **Duration.** Contact time C = 450 + rise + 120 + 200 ms, where rise = 900 ms x the square root of h (minimum 180 ms if the score is above 0). h = score / today's best, capped at 1. C runs from 770 ms (tiny strike) to 1,670 ms (h = 1). The state settles into S3 at C + 4,800.
- **A credit during S2** is accepted and queued. The reveal still plays to C + 780 (verdict in), holds for 600 ms, then goes to S1 with carry-over. Worst case, the next player is READY 3,050 ms after the previous impact.
- **Verdict strings.** Orbitron 900 64 px in Z1, first match wins:

| Condition | Copy | Width | Colour |
|---|---|---|---|
| 999 999.000 | "TOP OF THE SCALE" | 723 px | #ffab00 |
| Above today's best | "HARDEST HERE TODAY" | 871 px | #ffab00 |
| Equal to today's best | "EQUALS TODAY'S BEST" | 889 px | #ffab00 |
| First strike of the day | "FIRST STRIKE TODAY" | 784 px | white |
| Armed phone, new personal best | "NEW PERSONAL BEST" | 838 px | white |
| h at or above 0.97 | "ALMOST TODAY'S BEST" | 892 px | white |
| Leads a round of 2 or more | "LEADS THIS ROUND" | 735 px | white |
| Anything else | Label "THIS STRIKE" (Orbitron 700 40 px, 70% white) | | |

- **S2x NOT READ.** Contact registered below the sensor noise floor, first time on this credit. Ghost zeros stay. "STRIKE NOT READ" (Orbitron 900 64 px) at baseline 1100 and "Your credit is still here. Strike again." (Inter 600 40 px, 698 px) at baseline 1170, for 2,500 ms, then S1. A second sub-floor strike on the same credit is scored honestly as 0.000.
- **S2e SCORE TIMEOUT.** No sensor value 5,000 ms after impact. Same copy as S2x, credit kept, fault logged.

### S3 REPLAY AND KEEP (C + 2,300 to 45,000 ms after impact)
**Purpose.** Replay, hand off, sell the next credit.
- **Z1/Z2/The Line** hold from S2 and never move again.
- **Gutters.** #5e0606 rails at x 0-48 and x 1032-1080, running from the level y down to 3700, with a 12 px #eb1110 tick at the level. On a record, an 8 px white tick marks the previous best.
- **Z3 replay.** Loop A covers impact -1,800 to +1,200 ms at 1x (3,000 ms). Loop B covers the same span but plays impact -300 to +300 at 0.25x (5,100 ms). A and B alternate. During the slowed span only, "SLOW MOTION" (Orbitron 700 32 px) sits at x 84, baseline 647, on a 40% black scrim. Silent.
- **Z4 keep.**
  - Headline: "SCAN TO KEEP" / "THIS STRIKE" at baselines 1806 / 1862.
  - Body: "Watch it now." / "No app needed." in Inter 600 34 px at 75% white, baselines 1932 / 1978.
  - Code: "NO SCAN? ENTER" (Orbitron 700 32 px, 70%) at baseline 2124, then "KTRBX" (Orbitron 900 64 px) at baseline 2204.
  - Under the card: "No signal? Take a photo of this." / "Good until this time tomorrow." in Inter 600 34 px at 60% white, baselines 2290 / 2336.
- **Z5 round.** Shown only with 2 or more strikes in the round. A strike joins the round if its credit was accepted within 90,000 ms of the previous impact. Thumbnails are each strike's impact frame. The leader gets a 6 px #eb1110 frame; the current strike gets a 6 px white frame if it isn't leading. Up to three most recent others are shown. No names, no numbers. After 90,000 ms with no credit, the round ends and its frames are discarded.
- **Z6 go again.** "GO AGAIN" in Orbitron 900 128 px (708 px) at baseline 3010. The line below uses Inter 600 40 px at baseline 3080:

| Situation | Line |
|---|---|
| Round exists, this strike leads | "Who's next?" |
| Round exists, this strike doesn't lead | "Beat the leader." |
| No round, record | "Who's next?" |
| No round, h from 0.97 up to but not including 1 | "So close. Go again." |
| No round, anything else | "Close the gap to today's best." |

  Then "PAY AT THE READER" (Orbitron 700 40 px) at baseline 3170, with the arrow.
- **S3a SCANNED.** Triggered when the page opens on a phone (server push, typically under 1,000 ms). The right column swaps to "OPEN ON" / "YOUR PHONE" and "Tap Keep it there." The QR stays, because a friend may still be scanning. It reverts after 15,000 ms without a keep.
- **S3b KEPT.** The QR, code and no-signal lines fade out over 200 ms. In their place: a 160 px avatar disc (claimer's profile colour, initial in Orbitron 900 80 px), "SAVED TO" / "M'S REEL" (Orbitron 900 56 px) at x 260, baselines 1822 / 1888, and "See it on your phone." (Inter 600 40 px) at baseline 1950. The Z6 line becomes "Arm your next strike on your phone."
- **S3c NO VIDEO** (camera fault). Z3 becomes a black panel with a 2 px outline at 20%, "NO REPLAY THIS TIME" (Orbitron 900 56 px) and "Your score still counts." Keeping still works, for the score only.
- **Ends on** a credit (400 ms crossfade to S1, with carry-over if not kept) or on reaching 45,000 ms (goes to S4).

### S4 WIND-DOWN (45,000-60,000 ms)
The replay pauses on the impact frame. Z1, Z2, Z4 and Z6 stay, and Z5 stays until the round ends. At 60,000 ms an 800 ms crossfade goes to S0: the Z1 label becomes "TODAY'S BEST HERE" and Z2 crossfades to that value. A credit at any point goes to S1.

### S5 OUT OF SERVICE (sensor or reader fault)
The reader is disabled. Z2 shows ghosts. "BACK SOON" (Orbitron 900 128 px, 886 px) at baseline 1100 and "This machine is not taking credits right now." (Inter 600 40 px, 854 px) at baseline 1180. A staff fault word in Orbitron 700 32 px at 30% white sits at y 3780. Ends when the fault clears.

### Offline
There is no visible state. S0 to S4 run on the machine's own data, including today's best, which the machine tracks locally and the server reconciles later. Offline messaging lives only on the phone.

## reveal_motion

**Clip.** 8.0 s, from -600 ms to +7,400 ms around impact. 60 fps, because the 50 ms beats need 3 frames. Mastered at 1080 x 3840, delivered as a 540 x 1920 H.264 file plus the master.

**Example values.** Score 612 408.250 against today's best of 734 120.500, so h = 0.834. The column top lands at y 1051. The rise takes 900 x the square root of 0.834 = 822 ms. Contact C = 1,592 ms. This is the second strike of a round, and it leads.

| ms | What moves | From → to | Easing | Physical logic |
|---|---|---|---|---|
| -600 to 0 | READY holds; base band breathes | opacity 60 ↔ 100% | sine 1,600 ms | The loaded state |
| 0 | Impact frame. Base band snaps taller and full-bright | 40 → 80 px, 100% | none (hard cut) | A hit has no ease-in |
| 0-280 | Whole-screen shake | translateY 0 → +14 (50) → -8 (110) → +3 (180) → 0 | linear keys | The cabinet took the blow |
| 0-160 | "STRIKE / WHEN READY" knocked off; label becomes "THIS STRIKE" over 200 ms | y +60 px, opacity 1 → 0 | easeInCubic (0.32,0,0.67,0) | Knocked loose, it falls |
| 160-450 | Load: base band compresses; ghost digits wake up | 80 → 48 px; 12 → 24% | easeInOutSine | Anticipation, and it hides sensor latency. If the value is late, the band breathes 48 ↔ 56 px every 400 ms, for up to 5,000 ms |
| 450-1,272 | Rise: full-width #eb1110 column top | y 3700 → 1051 (2,649 px) | easeOutQuad (0.5,1,0.89,1) | Constant deceleration, i.e. a puck thrown up a rail. Duration is 900 ms x the square root of h, the same gravity for every strike |
| 450-1,272 | Leading edge (#fac5c5) smears while fast | 12 → 40 px while speed > 4 px/ms, then back to 12 | tied to velocity | Motion blur that only exists at speed |
| 450-1,272 | Digits count up in lockstep with the column | shown value = score x rise progress, 40% white | same curve | The number is always exactly proportional to the column height |
| 1,272-1,392 | Apex hang. Edge colour sets: #fac5c5 → #eb1110 in 80 ms | nothing else moves | | Zero velocity at the top. **No overshoot**: the column never shows a value higher than the real one |
| 1,392-1,592 | Landing: integer digits go to 100% white and drop onto the Line, origin (60, 472) | scale 1.18 → 1.00, y -56 → 0 | easeInCubic (0.32,0,0.67,0) | Something heavy accelerates as it falls |
| C = 1,592 | Contact: squash, then spring back by C+410 | 0-50 ms: scaleY 1 → 0.93, scaleX 1 → 1.025. Spring: stiffness 600, damping 26, one 1.5% overshoot | spring | Mass meets the ground |
| C to C+60 | The Line thickens and returns | 4 → 8 → 4 px | step | It took the load |
| C to C+220 | Second shake, smaller | 0 → +10 → -4 → 0 | linear keys | The landing lands |
| C+120 to C+400 | Decimals ".250" slide in | x +24 → 0, 40 → 60% | easeOutCubic (0.33,1,0.68,1) | Light parts move light, with no squash |
| C+420 to C+780 | Verdict "LEADS THIS ROUND" wipes left to right; "THIS STRIKE" fades in the first 120 ms | clip inset(0 100% 0 0) → inset(0) | easeOutQuart (0.25,1,0.5,1) | Reads as a stamp, in reading direction |
| C+780 to C+1,800 | **Stillness.** Nothing moves for 1,020 ms | | | Holding still after impact is what sells weight |
| C+1,800 to C+2,500 | Drain: the column's centre (x 48-1032) falls; the gutters keep it and darken to #5e0606 | y 1051 → 3700 | easeInQuad (0.11,0,0.5,0) | Gravity from rest. It leaves a mark at the level, like a flood line |
| C+2,300 to C+2,700 | Replay panel enters | opacity 0 → 1, scale 0.97 → 1 | easeOutCubic | |
| C+2,700 to C+3,020 | QR card rises in; right column follows 80 ms later | y +48 → 0, opacity 0 → 1 | easeOutCubic | QR is static and full contrast from C+3,020 (4,612 ms) |
| C+3,200 to C+3,700 | Round board fades in (300 ms). This strike's thumbnail slides in from x 1080 to the leader slot; the old leader shrinks 300 → 200 px | | easeInOutCubic (0.65,0,0.35,1) | |
| C+4,400 to C+4,800 | Go-again block rises. After that, the arrow nudges 16 px toward the reader every 2,400 ms (600 ms move) | y +32 → 0 | easeOutCubic | |
| 6,392-7,400 | Settled S3. Clip ends | | | |

**What the big number does, and why it reads as an event.** It is the only element that falls. Everything before it moves upward and slows down; the number accelerates down onto the Line. It is also the only moment besides the hit that shakes the screen, and it is followed by a full second of stillness. Its size never changes with the value: 308 px, filling the column. The drama comes from the column below it and the gap between the column and the Line, not from rescaling.

**Variants:**
- **Record (h at or above 1).** The rise takes 900 ms to y 524 and the column strikes the Line with no hang. The Line flashes #ffab00 at 8 px for 120 ms. The 40% digits hop up 24 px and back over 200 ms, then land as normal. The verdict is in #ffab00, and a white tick marks the old best. The hold stretches by 360 ms, nothing else is added.
- **Zero.** No column and no rise. Contact at 770 ms with shake at 50% amplitude; no drain.
- **999 999.000.** The record variant with the verdict "TOP OF THE SCALE".

**Flash safety.** There is no full-field flash anywhere. At 1 m, a 1.5 m panel fills about 70 degrees of vertical vision, and WCAG 2.3.1's red-flash threshold is based on area. The only flash is the record Line: 8 x 960 px, once.

## handoff

**Principle: the machine hands off in about two seconds, and the phone does everything else.** Nothing about keeping a strike needs the machine's screen after the QR has been read.

### Primary path (walk-up, no app)
1. **QR goes live** at C + 3,020 (about 4.6 s after impact). Its centre sits at y 1985, 1.27 m from the floor, which is where a phone naturally rises. It sits low enough that the player's torso shields it from people directly behind.
   - **Size.** 11 px modules (4.3 mm) scan comfortably from 0.2 to 1.2 m.
   - **Contents.** `https://<short-domain>/k/<token>`. The token is 36 base64url characters carrying machine id, attempt id, score, expiry, and a truncated HMAC from a per-machine key. It is generated locally, so it works when the machine is offline. QR version 4, error correction M.
2. **The camera opens an App Clip** (iOS, under the 15 MB physical-invocation limit), an Android Instant App, or a mobile web page. **The video plays before anything is asked.** The machine uploads a 720 x 960 H.264 loop under 2 MB at impact + 4 s. First paint target is under 1.5 s on 4G.
3. **"Keep it"** leads to Sign in with Apple or Google, one sheet. The strike is saved, and the machine shows **S3b KEPT** within about 1,000 ms: the avatar disc, "SAVED TO / M'S REEL", "See it on your phone."
4. **Only then** does the page ask for the install: "See who you're up against at Level 2" with the store button. Notification permission is asked later, the first time a rematch is sent or received.

### Fallbacks
- **Scan fails** (glare, an old camera). Use the letter code "KTRBX", typed at the short domain or into the app's "Enter a code".
  - 5 letters from a 19-letter set: B C D F G H J K M N P Q R S T V W X Z. No vowels and no lookalikes.
  - Scoped to one machine and 24 h: 2.5 million combinations against a few hundred strikes a day.
  - Limited to 5 tries per device per hour, and the machine must be picked (pre-filled from location).
- **No signal in the mall.** "No signal? Take a photo of this." The QR still works from the camera roll (iOS Live Text, Google Lens) until the same time the next day.
- **Machine offline.** The server verifies the signed token without the machine. The phone shows the score straight away (it's in the token) with "Strike saved. The video arrives when the machine reconnects." and sends a push when it lands. The machine never shows an offline message to the queue.
- **The next credit comes in before the scan.** The S1c carry-over card keeps the same QR in the same place for 20,000 ms, or until the next impact.
- **The player left without scanning or photographing.** The strike is gone and its video is deleted at 24 h. I accept that loss on purpose. The only alternative, searching by time and place, would show strangers' videos to anyone who asks. A friend who scanned can keep it and send it on.
- **Two friends scan the same code.** Both can watch. The **first to tap Keep owns it.** The second sees "M kept this strike." with "Ask M for a copy". If M approves, a copy is sent and a follow is suggested, which turns the conflict into the first social connection. The machine shows nothing for the second attempt. Any scanner can watch for 10 minutes; after that, only the owner.
- **The wrong person kept it.** The machine can't verify who struck. The real player reports "This is me" in the app, the video goes private while support decides, and the strike can be transferred.

### Expiry and privacy rules
- The QR and the code expire 24 h after impact. Unkept video is deleted from the cloud at 24 h. Unkept scores stay only as anonymous machine data (today's best, distributions) and never appear on boards.
- The machine's local buffer deletes a clip once the upload is confirmed plus 24 h, with a hard cap of 72 h.
- Kept strikes are **private by default** (Only you / Followers / Everyone). The owner can delete at any time, and the file is purged from backups within 30 days.
- The machine never shows a name. Kept and armed states show one initial. Handles appear only for people who opted in to "Show my name on machines". Clips are featured on the attract loop only with per-clip opt-in, and never from under-16 accounts.
- Round-board thumbnails exist only for the live round and are discarded 90 s after it ends.
- No face recognition and no automatic matching of faces to accounts, ever.

### A player who already has the app
- **Scanning** with any camera opens the app through a universal link, straight to the Keep sheet with the clip playing. One tap, no sign-in, and S3b appears on the machine.
- **Arming before paying.** On the Machines tab, within 50 m (or after scanning the attract QR, which removes any doubt when two machines stand side by side), "Save my next strike here" is a 600 ms press-and-hold.
  - READY shows the avatar disc and "SAVES TO M", so a friend doesn't strike into M's reel by accident.
  - Arming ends after one strike or 90 s.
  - The reveal can say "NEW PERSONAL BEST". The phone buzzes on landing (haptic, not audio) and the strike is already in the reel, with no QR needed.
  - If someone else took the strike, "Not me" within 10 minutes unlinks it and gives M the code to pass on.
- **Paying in the app** (if the wallet exists) arms the machine automatically.

## go_again

### Three honest engines, each a single line of copy, all readable from the queue

**1. The gap (the whole venue's contest).** The black space between the column top and the Line is today's best made physical. Someone four metres back sees it without reading a number. Copy: "Close the gap to today's best."
- *Why it motivates:* it's true and it's the same target for everyone.
- *Why it can deflate:* on a day a very strong player sets the bell early, most strikes reach 40 to 60% of the height. That is why engine 2 exists.

**2. The round (the group's contest, winnable).** Strikes within 90 s of each other form a round. The leader's replay thumbnail is framed in red at 300 px and the rest sit at 200 px, with no names or numbers; faces are the identity.
- Copy: "Beat the leader." when this strike isn't leading, and "Who's next?" when it is.
- "Who's next?" isn't aimed at the player. It's aimed at the friend holding the next credit. The group behind is both the audience and the next customer, so the screen sells to them directly.
- The verdict "LEADS THIS ROUND" sits above the score, where people see it over heads.

**3. The near miss.** "ALMOST TODAY'S BEST" and "So close. Go again." appear only when the strike is truly within 3% of today's best.

**For app players.** "NEW PERSONAL BEST" on the machine, a reel on the phone grouped by visit where the best of the visit gets a red underline, and rematches that bring them back to a specific machine.

### Where the screen sells it
- The score, verdict and Line sit in the top 520 px, above the heads of anyone standing between the queue and the panel.
- "GO AGAIN" (Orbitron 900 128 px) sits next to the payment reader, so the instruction lands in the hand zone at the moment of paying.
- The arrow nudges toward the reader every 2,400 ms. That's a slow move, not a flash.

### Honest accounting
**Manipulative, and bounded:**
- **The near miss** uses the same psychology slot machines use. It's defensible only because this is a skill game and the 3% threshold is real, measured, and never faked.
- **The round board** applies social pressure. We soften it by marking only the leader and never showing who is last.
- **"Who's next?"** openly pressures the group. That's the business and I'd say so.

**Motivating:** the gap and the personal best are true information about how the player performed.

**Refused:**
- Countdowns on buying a credit, "offer ends" copy, or any timer apart from the QR carry-over bar.
- Dimming or hiding the QR to push a credit.
- Near misses outside the threshold.
- Claims like "second strikes are usually harder" unless fleet data proves them. If the data does prove it, it's the single best go-again line, and it goes through an A/B test first.

**Out of scope for the screen.** Bundle pricing (three credits) belongs on the reader, not in the reveal. That is a question for the business.

## phone

### Platform
iOS first. Figma frames are 393 x 852 pt (iPhone 16), with a 59 pt top and 34 pt bottom safe area. The claim page uses the same frame as an App Clip, an Android Instant App, or web.
- **Colour.** Dark: ground #000000, raised surfaces neutrals-900 #221e1d, primary text white, secondary text neutrals-500 #bdaba6 (7.5:1 on #221e1d), small red text primary-300 #f26b6a (5.57:1), red fills #eb1110 with white text.
- **Type.** Orbitron 900 22 pt for uppercase screen titles. Orbitron 700 13 pt for section labels (+0.08 em tracking, plain text, no pills). Inter 600 17 / 500 15 / 500 13 for text. Every score is in the same condensed numeral face as the machine: 96 / 80 / 56 / 28 / 22 pt, grouped with a space, decimals at 40% size and 60% opacity. The score looks identical on both surfaces.

### Information architecture
Three tabs: **Feed**, **Machines**, **You**. Every social object (strike, rematch, regular, today's best) is tied to a physical machine. That tie is what connects players to the people who use the same machines.

### Screens (Figma frames)
**P1 Claim (App Clip or web).**
- Video 393 x 400 at y 59-459, autoplaying loops A and B, muted.
- "LEVEL 2, BY THE CINEMA" (Orbitron 700 13 pt) at y 480. The name matches the plate on the cabinet.
- Score "612 408" plus ".250" in Saira 96 pt, baseline 600, x 20.
- "Dubai Mall. Today, 18:42" (Inter 500 15 pt) at baseline 636, then "We keep it until this time tomorrow." (13 pt) at 666.
- "Keep it" button, 353 x 56, #eb1110, at y 694. Then "Save the video" as a #f26b6a text button at y 758.

States:
- **Kept by someone else:** "M kept this strike." plus an outline button "Ask M for a copy".
- **Machine offline:** a black panel with "The video is on its way." and "We'll tell you when it lands."; the score still shows.
- **After 10 minutes, not the owner:** "This strike is private now."
- **Expired:** "This strike has gone." plus "Strikes nobody keeps are deleted after a day."

**P2 Sign-in.** The native Apple or Google sheet. Nothing else is asked.

**P3 First reel.** The kept strike card, then a single ask: "See who you're up against at Level 2" with the store button.

**P4 You (profile and reel).**
- Nav: "@mira.k" plus the activity icon (44 pt hit area).
- Avatar 64 pt, "MIRA" (Orbitron 900 22 pt), "Regular at Level 2, Dubai Mall".
- "YOUR BEST", then **one** big number (Saira 80 pt), then "Level 2, Dubai Mall. 14 Sep". This replaces a row of stat cards.
- **The reel is grouped by visit**, because three strikes per visit is the business goal and the reel should celebrate that.
  - The latest visit ("TODAY AT DUBAI MALL") gets one 353 x 441 card (4:5) with the score at 56 pt bottom-left over a 40% gradient.
  - Under it, a strip of that visit's other strikes: 108 x 135 thumbnails with the score at 22 pt. The best of the visit gets a 3 pt red underline, not a badge.
  - Older visits collapse to a header plus a horizontal strip. The rhythm changes on purpose: one big card, then compact rows.
  - A lock glyph on a thumbnail means Only you.

**P5 Strike detail.**
- Full-bleed video. Visibility control top right: "Only you" leads to a sheet with Only you / Followers / Everyone and the note "Everyone includes people who strike at this machine."
- Score in Saira 88 pt, baseline 690. "Level 2, by the cinema. Dubai Mall" and "Today, 18:42. Third strike of the visit."
- Reactions as names, not counts: a 24 pt face pile with "Kaz and Ali felt that."
- "Also there": friends who scanned the same strike and were approved.
- Actions: Share (exports the video with an end card), Send to a friend, and Delete in the overflow menu.

**P6 Feed.**
- Text tabs "Near you" (default) and "Following". The active tab has a 2 pt red underline.
- Each item:
  - A 56 pt header: avatar, handle, "Level 2, Dubai Mall. 12 min ago", and an overflow menu with Report and Block.
  - Edge-to-edge 4:5 video that autoplays muted when at least 60% visible, with the score at 56 pt.
  - A reaction bar of three text buttons (44 pt hit areas): **"Felt that"** (impact), **"Clean"** (form), **"Rematch"** (a challenge).
- **No view counts and no like counts.** Social proof is names: "Ali and Sam felt that."
- **The one editorial moment:** a full-width #eb1110 block, shown only when it's actually true, about once every ten items. "TODAY'S BEST AT LEVEL 2, DUBAI MALL CHANGED HANDS" (Orbitron 900 22 pt), the new best at Saira 72 pt, "kaz.r took it from mira.k". Tapping opens the machine page.

**P7 Machine page.**
- "LEVEL 2, BY THE CINEMA" and "Dubai Mall. Open until 23:00".
- "TODAY'S BEST HERE" with the score in Saira 96 pt and the holder (or "Set by someone who keeps it private"), plus "Watch".
- Board with text tabs Today / This week / All time. 56 pt rows: rank in Inter 600 tabular figures, avatar, handle, score in Saira 28 pt right-aligned. Top 10, with **your row pinned** and marked by a 3 pt #d842d3 bar. Magenta means "you" everywhere in the app.
- "REGULARS": a face pile of public players who struck here 3 or more times in 30 days, with "Follow the people who play here."
- "Save my next strike here" (56 pt). Visible only within 50 m or after scanning the machine.

**P8 Arm sheet.**
- "SAVE YOUR NEXT STRIKE", then "Your next strike at this machine goes straight to your reel. The screen shows SAVES TO M so your friends know whose turn it is."
- A "Hold to arm" button that fills over 600 ms, and the line "Disarms after one strike or 90 seconds."
- Armed banner: "Armed at Level 2. Strike when ready." After landing: a haptic plus a card "Landed. 612 408.250" with "Not me" available for 10 minutes.

**P9 Activity.**
- "kaz.r sent a rematch on your 612 408.250 at Level 2."
- "kaz.r beat your strike at Level 2." with a Rematch button.

### What makes it feel connected
- **Rematch** is a reaction that is also a date: 7 days to beat that strike at that machine, with both sides notified of attempts and results. It pulls people back to a physical place.
- **Regulars** and **Also there** make the machine a local scene, not a global feed.
- **Safety:** no free-text comments and no DMs at launch. Under-16 accounts can't post publicly, don't appear in Regulars, and only get rematches from people they follow back.

### What changed from the current app
- Dropped the "987654.321 Score" suffix; the number is grouped and its decimals are lighter.
- Dropped the views / likes / comments counters in favour of names and three reactions.
- Global / National / Regional tabs with a podium became machine boards, a city board and a following board.
- The Home / Nearest City / Country / World record-holders row became a single "Today's best here" per machine.

## competition

### On the machine: exactly two contests, both local, both reset, both winnable by someone in the queue
- **Today at this machine.** The Line, which is the top of the column. It resets at 04:00 local time, not midnight, so a late-night venue's best doesn't vanish at 23:59. On the reveal it costs no extra number: the target appears as a height, and as words in the verdict. Its value is shown only in ATTRACT, where it's the one number on screen.
- **This round.** The group's ranking, by replay thumbnail, leader framed. No names, no numbers, gone 90 s after the group leaves.
- **Deliberately absent from the machine:** global, national and all-time rankings. A crowd in a mall can't act on "#48,211 in the world", and each extra rank would put a second number on a screen whose only number should be the score. Holders' handles appear in attract only with opt-in ("SET BY KAZ.R").

### On the phone: where "who's the best" actually lives
- **Machine boards** (Today / This week / All time) are primary, because people come back to a place.
- **City board.** Includes only machines within calibration tolerance of each other. Force sensors drift, and a leaderboard spanning uncalibrated machines is unfair in a way players will notice and post about.
- **Following board.** Your friends, wherever they strike.
- **World record.** A single line on the Machines tab, not a tab of its own. One aspirational fact, not a ladder of ranks nobody can climb.
- **Personal best** is the fair contest for everyone: your number and where you set it.

### Integrity rules that protect every board
- Scores flagged by the machine never reach a board until reviewed. Flags cover sensor anomalies and three or more top-of-scale results within 10 minutes. If a flagged strike had become today's best, the Line reverts to the best unflagged score.
- Unkept (anonymous) strikes count toward today's best on the machine but never appear on phone boards.

### What I'd validate rather than ship
Weight or age divisions. Force scores favour bigger bodies, and a 12-year-old against adults is a design problem, but divisions need self-declared data and moderation. At launch, the round board and personal best carry fairness.

## brand

### Hero typography: measured, not guessed
The digit advances come from the font files themselves (fontTools on the fontsource WOFFs):
- **Orbitron** draws its digits almost square. Every weight has identical advances: 834 units for "0" and "8", 391 for "1". It has **no tabular figures**, so a count-up would jitter by up to 66 px per digit.
- **Saira Extra Condensed 900** digits are 402 units wide at most, with a cap height of 688.

Test setup: a 960 px column, the string "888 888.888" in fixed slots, decimals at 40%, 0.39 mm per pixel. The glance-legibility floor is the sign-industry rule of 25 mm of letter height per 3 m, which is 33 mm at 4 m and 37.5 mm at 4.5 m.

| Setting | Font size | Cap height | Physical | Angle at 4 m | Multiple of the 4 m floor |
|---|---|---|---|---|---|
| Orbitron 900, with decimals | 150 px | 108 px | 42 mm | 0.60° | 1.27x |
| Orbitron 900, integers only | 181 px | 130 px | 51 mm | 0.73° | 1.53x |
| Orbitron 900 with comma, decimals full size (naive) | 120 px | 87 px | 34 mm | 0.48° | 1.02x |
| Orbitron 900, two rows of three digits | 384 px | 276 px | 108 mm | | passes, but reads as two numbers |
| **Saira Extra Condensed 900, with decimals** | **308 px** | **212 px** | **83 mm** | **1.19°** | **2.49x** |
| Saira Extra Condensed 900, integers only | 379 px | 261 px | 102 mm | 1.46° | 3.06x |

My target is at least 2x the floor at the back row, which is the difference between legible and an event. **No single-line Orbitron setting reaches it.** The only Orbitron layout that passes breaks the score into two numbers, which is a worse failure than a font change. At 108 px on a 3840 px screen, the Orbitron score is a caption.

**The decision.** Orbitron keeps every word on both surfaces. Scores use a condensed numeral face.

**How I'd put it to the brand owner:**
1. Put both versions on the real panel at 1:1 and stand 4.5 m back. The test decides, not taste.
2. Saira Extra Condensed shares Orbitron's construction (squared counters, rounded-rectangle bowls, flat terminals, a square full stop), so it reads as Orbitron's condensed sibling rather than a new voice. It's open-licensed.
3. Long term, commission 12 glyphs (0-9, a point, a figure space) drawn on Orbitron's skeleton at about 48% width, with tabular figures. That's a few days of type design.
4. Scoreboards have always used a separate numeral face. The words are the brand; the number is the instrument.

Evidence (mock of the landed, apex, top-of-scale and ready states): `C:\Users\FARHAN~1\AppData\Local\Temp\claude\C--Claude-Database\98de7949-3980-4190-a703-419fb7335679\scratchpad\rb_sheet.png`. Built by `ringbell_mock.py` in the same folder.

### Kept
- **#eb1110 as the colour of force.** It's the column. White on it is 4.55:1, which passes AA, so it can carry words in attract.
- **Orbitron 700 and 900** for short uppercase words. Minimum 32 px on the machine, 13 pt on the phone.
- **Yellow #ffab00**, reserved for records only (11.08:1 on black).

### Replaced or extended
- **`--font-sans: Orbitron` becomes Inter** for any sentence of five words or more. Orbitron's wide lowercase slows reading at 15-17 pt, and Inter is already on the company's landing page.
- **The machine ground becomes pure #000000** (new token `--machine-ground`). On a backlit LCD in a dim venue, any grey makes the panel's rectangle visible. The warm neutrals-900 #221e1d also drops red text to 3.63:1 (fails AA), against 4.62:1 on pure black.
- **Red text on light surfaces uses primary-600 #bc0d0c** (6.24:1). #eb1110 on #faf9f9 is only 4.33:1. Small red text on dark surfaces uses primary-300 #f26b6a.
- **Token bugs.** primary-700 and primary-800 are both #8d0a09; I'd set 800 to #760808. neutrals-300 and neutrals-400 are both #ccbfbb; I'd set 400 to #c4b5b0. neutrals-700 #685e5b on neutrals-900 is 2.63:1, so it can't be used for text.
- **Opacity scales.** Main BG (white alpha) and Secondary BG (#f2f3f3 alpha) are practically the same colour, so merge them. **Add the missing black scrim scale** (rgba 0,0,0 at 0.4 / 0.6 / 0.8) for text over video.
- **Secondary magenta #d842d3.** Removed from the machine, where it vibrates against red. On the phone it has one job: "you" (your board row, your markers).
- **Green.** Phone-only success states.
- **Missing scales, added:**
  - A machine type ramp in px, sized for distance: 308 / 200 / 128 / 96 / 64 / 48 / 44 / 40 / 34 / 32.
  - Motion tokens. Durations: impact 50, snap 200, settle 360, enter 400, drain 700. Named easings: gravity-out (0.5,1,0.89,1), gravity-in (0.11,0,0.5,0), land (0.32,0,0.67,0), light (0.33,1,0.68,1).
  - Spacing: 60 px machine gutter, 8 pt phone base.
  - Radius: 0 on the machine (square QR card for scan reliability), 12 pt on the phone.

## detail_touches

- **Ghost leading zeros** at 12% keep the score's right edge fixed, so 912.000 and 912 000.000 sit in the same place with no reflow, and magnitude is obvious at a glance.
- **A space instead of a comma** groups the thousands, leaving the decimal point as the only punctuation. "999,999.000" reads as a different number in half of Europe; "999 999.000" reads the same everywhere.
- **Every digit sits in a fixed 124 px slot.** Neither font has tabular figures, so the count-up would otherwise shake sideways.
- **Rise time is 900 ms x the square root of h.** That's how long a thrown object takes to reach that height under one fixed gravity, so a weak strike and a huge one feel like the same world, and a weak strike doesn't wait through a long animation.
- **The column never overshoots.** An overshoot would briefly show a value higher than the one earned.
- **The number counts in lockstep with the column,** so what it shows is always exactly proportional to the height on screen.
- **The heavy integers squash on landing; the light decimals slide in afterwards with no squash.** Two masses, two behaviours.
- **1,020 ms of total stillness** after the landing, before anything else moves.
- **The score's baseline sits at 1.87 m,** above the sightline of a spectator 4 m back looking over a 1.75 m player.
- **The QR sits at 1.27 m.** That's where a phone rises, and low enough that the player's own body blocks the queue's view of it.
- **The QR is never drawn over video.** It lives on a white card with a 44 px quiet zone and square corners, full contrast from its first frame.
- **The carry-over timer is a bar, not a number.** It's the only timer on the machine.
- **The letter code has no vowels,** so it can't spell a word on a public screen, and it has no I, L, O or other lookalikes.
- **Expiry reads "Good until this time tomorrow."** It's clear without adding a numeral.
- **The first sub-floor tap on a credit is "STRIKE NOT READ" and keeps the credit.** A second one is scored honestly as 0.000, so tapping can't be used for free replays.
- **Replay opens 1,800 ms before impact, not at the start of the recording,** so nobody watches themselves walk up. The slowed 0.25x span only starts on the second loop.
- **"SLOW MOTION" appears only while the video is actually slowed.**
- **The machine stays silent about being offline.** The phone tells the truth instead.
- **Shake is reserved for real strikes.** The attract loop lands its number with no shake, so the shake keeps its meaning all day.
- **Burn-in.** Nothing sits still at full brightness for more than 20 s except Z1, Z2 and the Line, and the whole layout orbits 1 px every 10 minutes within a 4 px square. The column cycles in attract. After closing, the panel drops to 30% with no red field.
- **Today's best resets at 04:00 local,** not midnight.
- **Readable seated.** The QR (1.27 m) and GO AGAIN (0.8-0.9 m) are within a wheelchair user's eye range. The score is 29 degrees above a seated eye at 1.25 m, which is still comfortable.
- **Height carries the meaning, not colour,** so the reveal works for colour-blind players. The yellow record verdict also carries words.
- **The machine name on the phone** ("Level 2, by the cinema") matches the plate on the cabinet, which removes any doubt when two machines stand side by side.
- **Every copy string was measured** against Orbitron and Inter advance widths. The longest verdict, "ALMOST TODAY'S BEST", is 892 px in the 960 px column. Strings that didn't fit ("TIED WITH TODAY'S BEST" at 952 px, "SO CLOSE TO TODAY'S BEST" at 1,080 px) were rewritten, not shrunk.

## pushback

### What I'd push back on
- **Three decimals on a public screen.** They cost 19% of the hero's size (308 px with them, 379 px without). If the sensor can't really resolve 0.001, they're noise presented as precision. I'd keep them in the data for tie-breaks, show them on the phone, and test an integer-only machine score at 1:1.
- **"1.5 m tall, 0.5 m wide" doesn't match 1080 x 3840.** With square pixels that's 0.42 m wide. Either the pixels aren't square (glyphs would be 18% wider in reality) or 0.5 m includes the bezel. Every physical figure in this proposal depends on the answer.
- **"Touch [IS / IS NOT]" was left open.** I designed for no touch. If touch exists, it can only add redundant shortcuts, never a required step: the player's hands are gloved or sore, and the top 1.2 m is out of reach anyway.
- **"One attempt and a walk-away is a failure."** Not necessarily. A player who keeps one strike and comes back next Saturday may be worth more than three strikes today. I'd measure return visits per kept strike alongside attempts per session.
- **The current app's Global / National / Regional default and its view and like counters.** Global rank is dead on arrival for a walk-up player, and small counts ("3 views") look sad.
- **Free-text comments** under videos of strangers, often teenagers, filmed in malls. That's a moderation cost and a harassment risk. Launch with three reactions and rematches.
- **`--font-sans: Orbitron`** for body text. See Brand.
- **Recording the public.** This needs legal review per market (GDPR, UAE PDPL), signage at the machine, rules for minors, and a written retention policy before any design is final.

### What I'd validate with users
- Can people 4.5 m back read the score, Saira against Orbitron, on the real panel in a lit mall?
- Does a column scaled to today's best motivate or deflate the typical player? A/B it against "best this hour" and against a personal-best top.
- Do groups understand a ranked row of thumbnails with no names or numbers?
- Are ghost leading zeros ever misread as part of the number?
- Real scan time and success rate with glare. How long does the player stay at the machine? What share scan before the friend pays?
- Does "first to keep owns it" cause disputes inside groups, and how often do strangers scan from a distance?
- Is "second strikes are usually harder" true in fleet data? If so, it's the best go-again line available.

### Questions I'd have asked before starting
1. Is touch available?
2. Mounting heights: the panel's top and bottom edges, the pad, the camera, the payment reader. The zones are drawn to an assumption.
3. The pixel pitch, and whether the pad or its arm covers any part of the panel.
4. Sensor latency from impact to value, and the real resolution behind the decimals.
5. Score distribution per machine (median, 90th percentile) and how often today's best changes.
6. Payment methods (coins, card, app wallet), bundle pricing, and the current policy when a strike isn't read.
7. Machine connectivity uptime, and phone signal in basements.
8. Camera orientation, resolution and frame rate.
9. Age rules at the venues, and whether an attendant is ever present.
10. How many players already have the app, which decides how much to invest in the arm path.
11. What "tokens for wins" and "crews" in the current app mean, and whether they belong in this flow.

## risks

- **Today's best as the scale can deflate people.** A strong player early in the day makes every later strike look small. The round board, personal bests and "best this hour" as a test variant are the mitigations. If testing shows people walking off after a low column, the metaphor has failed, however clever it is.
- **The mounting assumption could be wrong.** If the panel sits lower or the pad covers part of it, the sightline claims (score above heads, QR shielded by the torso) no longer hold and the zones have to be redrawn.
- **The brand owner may reject the condensed numerals.** Without them, the hero drops to 108 px of cap height and the "event" rests almost entirely on the column.
- **"First to keep owns it" can go to the wrong person.** Someone photographing the QR from four metres with a zoom lens can take a stranger's video before the player does. The limits are visibility on the machine, private-by-default, and a support transfer, but the machine can't prove who struck.
- **QR scanning in real malls.** Glare, moiré on the LCD, and phones that don't detect QR codes automatically. The letter code is a weak fallback for people who don't want to type.
- **Players who leave without scanning or photographing lose the strike.** I chose that over a searchable archive, and it will produce complaints.
- **Sensor latency above about 1.5 s** stretches the anticipation loop and breaks the rhythm. A fleet with inconsistent latency will feel inconsistent.
- **Calibration drift** makes the city board unfair and invites posted "proof" of rigged machines.
- **A tampered or faulty sensor** setting the day's best at the top of the scale flattens every strike until flag-and-revert kicks in.
- **Burn-in and image retention** after months of unattended operation, despite the orbit, if operators turn the mitigations off.
- **Build scope.** Nine machine states, carry-over, rounds, arming, offline tokens and App Clips is a lot for a startup. If it has to be cut, cut arming and the round board first. Never cut carry-over or the letter code.
- **The near-miss copy and "Who's next?"** could read as pushy in venues aimed at families. The copy table needs a per-venue switch.