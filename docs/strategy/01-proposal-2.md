# Proposal: Claim Ticket  (propose:retention)

## thesis

A hit is an object with an owner, and it is not finished until it is in somebody's pocket. After the strike, the machine does two jobs. First it stages the number for the crowd, as a physical event: the weight rises, rings the bell, and lands. Then it prints a ticket that a phone can take in one motion. The ticket sits directly under the number, inside the frame people already shoot when they photograph a big score, so the photo becomes the scan. The ticket carries everything the app is built around: the score, the clip, the machine, the moment. It also carries two words that act as the player's name until they choose one. The phone's job is to make that hit worth keeping, worth showing to the group, and worth coming back to beat at the same machine next Saturday. I would judge success by kept hits, second hits within three minutes, and return visits within fourteen days. Seconds of attention on the reveal don't count.

## machine_flow

### Assumptions (to confirm, see pushback)
- **No touch.** The panel is 1500 mm tall with its bottom edge 500 mm above the floor. That gives **2.56 px per mm (0.39 mm per px)**, taken from the height.
- **Hardware placement.** The pad and camera sit off the panel. The credit reader is on the cabinet at about 0.9 m.
- **Sensor timing.** The sensor returns a score within 120 ms of the trigger. If it is slower, the tide waits for it.

### Grid and bands
- **Columns.** Gutters are 60 px, so the column runs x 60 to 1020. **Text hangs from x 60 and figures stand on x 1020**, like a ledger, so the units digit never moves from one hit to the next. The right gutter holds the **rail** (x 1048 to 1060), a thin height gauge.
- **Bands, set by who can see them:**
  - **Crowd, y 0 to 560** (1.78 to 2.00 m). This is above the player's head, so people 4 m back can see it over the queue.
  - **Eye, y 560 to 1320** (1.48 to 1.78 m). Adult eye line, and where phones go up to take a photo.
  - **Chest, y 1320 to 2240** (1.13 to 1.48 m).
  - **Low, y 2240 to 3840** (0.50 to 1.13 m). Hidden by bodies for anyone standing behind the player.
- **Type sized by viewing distance:**
  - **Crowd (4 m):** compressed numerals for the score, compressed caps at 120 px (84 px cap = 33 mm, the 1:120 legibility floor at 4 m).
  - **Player (1 to 2 m):** Orbitron 900 at 120 or 160 px, Orbitron 700 at 44 to 72 px.
  - **Hand (under 1.3 m):** Orbitron 400 at 40 px minimum (29 px cap = 11 mm).
- **Colour:**
  - Ground #0E0C0C.
  - Main text #FAF9F9 (18.6:1).
  - Secondary text #AE9892 (7.2:1).
  - Red #EB1110 only at 56 px or larger (4.3:1).

### 1. READY (a credit is in, waiting for the strike). This is the frame the clip starts on.
- **Crowd:**
  - "TODAY'S BEST HERE": compressed 900, 56 px, #AE9892, x 60, baseline 200.
  - Target number "588,902": compressed 200 px, #685E5B, right edge x 1020, baseline 470.
  - Bell line: y 556 to 564, full width, #BDABA6.
- **Eye:**
  - "HIT IT.": Orbitron 900, 160 px, #FAF9F9, x 60, baseline 900.
  - If a phone is linked: "NEXT HIT GOES TO" / "RED FOX", Orbitron 700, 44 px, baselines 1010 and 1066.
  - If the previous hit was not kept, a **stub** appears at x 620 to 1020, y 700 to 1100 (QR modules 12 px) with "LAST HIT" (Orbitron 700, 40 px, #AE9892, baseline 1150) and "BLUE OWL" (Orbitron 900, 48 px, baseline 1210). The stub lives until the next strike lands.
- **Chest:**
  - Live camera preview, 960 x 1280 at x 60, y 1300 to 2580.
  - 24 px red dot plus "ON CAMERA" (Orbitron 700, 40 px) at x 100, baseline 1370.
- **Low:**
  - "Videos nobody keeps are" / "deleted after a day.": Orbitron 400, 40 px, #AE9892, baselines 2680 and 2736.
  - "MISSED YOUR HIT? PNCH.CO/FIND": 40 px, #685E5B, baseline 3600.
  - "ALIF AT DUBAI MALL": baseline 3700.
- **Ends:** a strike starts IMPACT. After 90 s with no strike it goes to ATTRACT with the credit held and "YOUR CREDIT IS WAITING" shown.

### 2. IMPACT, 0 to 240 ms after the strike (event: sensor trigger)
- White overlay at 55% for one frame, decaying over 220 ms. The recoil is described in the reveal section.
- "HIT IT." and the camera preview are knocked down (+60 px, fade out, 200 ms).
- The target number collapses into the bell line. "TODAY'S BEST HERE" drops to sit on the line at baseline 540.
- **Ends:** on a timer.

### 3. RISE, launches at 120 ms and lasts 900 ms x sqrt(rise / 3840)
- A red tide rises from y 3840. Its height is proportional to score divided by today's best, where y 560 = today's best.
- The score reels roll in the number slot: compressed 900, 356 px, tabular, right edge 1020, baseline 520. The reels roll for at least 400 ms.
- The tide peaks no higher than y 270.
- **Ends:** when the tide reaches its apex.

### 4. HANG, 180 ms
- The reels lock. Nothing else moves.
- **Ends:** on a timer.

### 5. FALL and SEAT, 520 ms fall plus 200 ms settle
- The tide falls and leaves a 12 px high-water line at the apex.
- The integer seats when the tide hits the floor. The decimals ".316" arrive: Orbitron 700, 72 px, #AE9892, right edge 1020, baseline 640.
- **Ends:** when the seat spring settles, about 1870 ms after the strike.

### 6. VERDICT, 1870 to 2270 ms
- Compressed 900, 120 px, #EB1110, x 60, baseline 212. Shows **one** of these, in priority order:
  - "MACHINE RECORD"
  - "BEST TODAY"
  - "JUST SHORT" (only within 5% under today's best)
  - "BEAT THE LAST HIT" (the previous hit here, within 3 min)
  - "TOP TEN TODAY"
- **If none applies, nothing is shown.**
- **Ends:** on a timer.

### 7. RESULT and KEEP WINDOW, from 2270 ms
- **Crowd:** verdict, integer (figures y 270 to 520, the comma reaches 578) and decimals, exactly as settled.
- **Rail:** the high-water line migrates into it between 2270 and 2800 ms.
  - Track x 1048 to 1060, y 560 to 3744, #2A2524.
  - Today's best notch: 36 x 8 px, #FAF9F9.
  - This hit's notch: 36 x 8 px, #EB1110.
- **Eye: TICKET**, fed out between 2400 and 3000 ms.
  - Shape: x 60 to 1020, y 700 to 1220, fill #EBE6E4, square corners.
  - Perforation: 40 px semicircle notches at x 580 top and bottom, with 8 px dots every 24 px (#CCBFBB) between them.
  - QR: 25 x 25 modules at 15 px (375 px), centred in x 60 to 580 with a quiet zone of 72 px or more, modules #221E1D.
  - Right column at x 624:
    - "SCAN TO" / "KEEP IT": Orbitron 900, 60 px, #221E1D, baselines 792 and 864.
    - "OR ENTER": Orbitron 400, 40 px, #685E5B, baseline 964.
    - "RED FOX": Orbitron 900, 60 px, #BC0D0C (5.3:1), baseline 1036.
    - "AT PNCH.CO": 40 px, baseline 1092.
    - Drain bar: x 624 to 984, y 1148 to 1160, fill #221E1D on a #CCBFBB track. It shrinks from the right over the window and shows no digits.
- **Chest and low: REPLAY**, 960 x 1280 at y 1300 to 2580. It fades in from 2700 ms and plays from 3100 ms.
  - Label: Orbitron 700, 40 px, x 100, baseline 2530. It reads "REPLAY", then "SLOW MOTION" during the 0.25x segment.
  - Progress bar: y 2572 to 2580, red.
- **Low: GO AGAIN**, from 3000 to 3400 ms:
  - "BEAT THAT.": Orbitron 900, 120 px (834 px wide), baseline 2780.
  - "Next hit races this one.": Orbitron 400, 48 px, #BDABA6, baseline 2860.
  - "ADD A CREDIT": Orbitron 700, 48 px, baseline 2980, plus a 48 px chevron at x 972 pointing at the reader.
  - "ALIF AT DUBAI MALL" at baseline 3700.
  - y 3040 to 3640 is **empty on purpose**. It is knee height, hidden behind the next player's legs, and a dark panel throws less light into the arcade.
- **Window:** 75 s, starting at 3000 ms.
- **Ends:**
  - A keep is confirmed: go to KEPT.
  - A new credit: go to READY. An unkept ticket becomes the stub.
  - The window timer runs out: go to WIND-DOWN.
- A credit inserted during states 2 to 6 is queued. **The reveal is never cut**, and it takes at most 2270 ms.

### 8. KEPT (event: the server confirms the keep, median about 1 s after the scan)
- The ticket's QR half turns through scaleX 1 to 0 to 1 over 320 ms, then the whole ticket fills #EB1110.
- "KEPT": Orbitron 900, 160 px, #FAF9F9, x 100, baseline 930.
- "BY RED FOX": Orbitron 900, 64 px, baseline 1030.
- The go-again line changes to "Next hit goes straight to RED FOX."
- The window shortens to 20 s.
- **Ends:** a credit starts READY (linked). The timer starts WIND-DOWN.
- **Pre-kept variant** (the phone was checked in): the ticket arrives already red, reading "KEPT BY" / "RED FOX". The left half keeps a 300 px QR under "NOT YOU? SCAN" for 20 s.

### 9. WIND-DOWN, 800 ms
- The ticket feeds back in (400 ms) and the replay fades (400 ms).
- The number and verdict fade to 0 (easeInQuad) and the rail drains downward.
- **Ends:** goes to ATTRACT.

### 10. ATTRACT (idle loop, 30 s)
- **Crowd:** "ALIF IS HELD BY" (compressed 120 px, #AE9892) over "RED FOX" (compressed 200 px). This is the weekly holder, shown by handle only if they opted in.
- **Eye:** the holder's public clip, a static "PLAY WITH THE APP" machine QR (360 px), and "ADD A CREDIT".
- The loop cuts between the holder, today's best here, and three recent public clips.
- **Ends:** a credit starts READY.

### Figma frames (1080 x 3840)
- M-01 READY
- M-02 RISE at apex
- M-03 RESULT
- M-04 KEPT
- M-05 READY with stub
- M-06 ATTRACT
- M-07 RESULT, short branch ("JUST SHORT")

## reveal_motion

### Clip setup
- **Format:** 1080 x 3840, 60 fps, **8.0 s**, H.264. That is 16,320 macroblocks x 60 = 979,200 per second, just inside Level 5.1's 983,040. The strike lands at **300 ms**.
- **Scenario:** today's best here is 588,902 and the hit is **612,480.316**.
- **Tide scale:** 0 is at y 3840 and today's best is at y 560, a rise of 3,280 px. This hit therefore peaks at 3,411 px, which is **y 429**.
- **Physical idea:** the screen is a strongman tower. There are three impacts (the fist, the bell, the floor) with stillness between them.

| ms | What moves | From / to | Easing | Physical logic |
|---|---|---|---|---|
| 0 to 300 | READY held. Only the camera preview is live | | | A beat of calm, so the hit has something to break |
| 300 | Full-frame white overlay | 55% for one frame, to 0 by 520 | easeOutExpo | The light of contact. White, never red, and a single flash (WCAG 2.3.1) |
| 300 to 560 | Whole content layer recoils | scale 1.000 to 0.985 (340), 1.006 (430), 1.000 (560). translateY +28 (316), -12 (380), +5 (440), 0 (520) | damped spring, stiffness 900, damping 28 | The pad takes the hit and the screen recoils away from the fist. No x shake, because the force goes into the screen |
| 300 to 500 | "HIT IT." and camera preview | +60 px, opacity 1 to 0 | easeInQuad | Knocked down, not faded |
| 300 to 540 | Target "588,902" collapses into the bell line. Line 8 to 12 px thick. Label drops to baseline 540 | scaleY 1 to 0 toward y 560 | easeInCubic | The target becomes a physical bar to hit |
| 420 to 1268 | **Tide** launches: full-bleed #EB1110 with a 6 px #FEF3F3 top edge, layered under the numbers | y 3840 to 429, 848 ms | **easeOutQuad** | Constant deceleration is exactly a thrown weight under gravity. Rise time follows sqrt(height), so weak hits are short and quick |
| 420 to 1270 | **Reels** in six tabular slots, 356 px. Value = final x tide height / 3,411. Motion blur up to 32 px per slot by speed. Opacity 88%, scale 1.06 on the right baseline | | follows the tide | The number is the gauge's readout. The high digits settle first and the units spin to the end |
| 1100 | Tide crosses y 560. The bell line splits at x 540 and the halves fly x +/-620 px, rotate +/-5deg, fade. Label drops 120 px and fades | 320 ms / 280 ms | easeOutQuad / easeInQuad | **The bell rings** |
| 1100 to 1250 | Second kick | scale 0.992 at 1116, back to 1.0 | spring | A smaller impact than the fist |
| 1270 to 1370 | Reels lock left to right, 20 ms stagger. Each digit overshoots 6% down and returns. Blur to 0 | | spring, stiffness 700, damping 30 | A mechanical click-click-click |
| 1270 to 1450 | **Hang.** Only the locks move | 180 ms | | Zero velocity at the apex. Stillness is the anticipation |
| 1450 to 1970 | Tide falls and leaves a 12 px red high-water line at y 429 | y 429 to 3840, 520 ms | **easeInQuad** | Gravity again. It falls faster than it rose (520 ms against 848 ms): heavier on the way down, so the landing hits |
| 1970 to 2170 | Floor impact: content translateY +10 to 0. Integer **seats**: scale 1.06 to 1.0, scaleY 0.94 (origin on baseline) at 1970, 1.03 at 2050, 1.00 at 2170, opacity to 100% | | spring, stiffness 500, damping 22 | The number lands the moment the weight lands. Squash, rebound, rest |
| 2050 to 2350 | ".316" | +40 px, opacity 0 to 1 | easeOutCubic | The thousandths arrive late and small, as an afterthought |
| 2170 to 2570 | "BEST TODAY" wipes in left to right with a mask | 0 to 100% | easeOutQuart | The verdict comes after the fact, never before it |
| 2570 to 3100 | High-water line becomes the rail notch: width 1080 to 12 (anchored right), y 429 to 560 (the new bell). Rail grows y 560 to 3744 | 400 ms / 530 ms | easeInOutCubic / easeOutCubic | The hit becomes the new mark to beat |
| 2700 to 3300 | Ticket mask y 700 to 1220. The QR stays still and only the mask moves | linear 480 ms, then 120 ms easeOutQuad | | A dispenser feeds at constant speed |
| 3000 to 3400 | Replay panel | opacity 0 to 1, scale 0.98 to 1 | easeOutCubic | |
| 3400 to 7000 | Video: 1x for 1.2 s before contact, 0.25x around contact (4600 to 6100) with a 300 ms freeze on the peak-compression frame at 5200, then 1x to 7000, then loops | | | The frame of maximum compression is the hero still |
| 3300 to 3900 | "BEAT THAT." +40 px and fade in. Sub line at +100 ms. "ADD A CREDIT" at +200 ms | 400 ms each | easeOutCubic | |
| 3300 | Drain bar starts. Clip ends at 8000 on the replayed punch | | | |

### What the big number does, and why it reads as an event
- **It is driven by the physics.** It spins only while the red is climbing, stops when the weight stops, and seats when the weight hits the floor. Spectators across the mall read the tide's height before they can read a single digit.
- **Its size never changes with the score.** A weak hit gets a short, quick rise, no bell and no verdict. The event is proportional and honest, and a group is never handed a fake celebration.
- **Short branch** (tide apex below y 560): the bell line holds through the fall. At 2570 it shrinks into the rail's white notch above the red one. "JUST SHORT" appears only within 5%.
- **Flash safety:** one white flash plus one rise and fall of the tide is fewer than 3 flashes in any second.

## handoff

### Primary path: the phone's own camera, no app needed
- **The photo is the scan.** The ticket sits directly under the number, and both fit inside the top 1220 px (0.48 m). The photo people already take of a big score has the code in it, and iOS Camera and Google Lens offer the link while the photo is being framed.
- **Code:**
  - Content is `HTTPS://PNCH.CO/K7Q2MXPA`, all uppercase, so the QR uses alphanumeric mode. That gives **version 2 (25 x 25 modules) at error-correction level Q** (checked with segno).
  - A lowercase `https://punchapp.com/claim/...` becomes version 4 (33 modules), with modules 32% smaller at the same printed size.
  - At 15 px per module = 5.9 mm, the code is 146 mm wide. The 10:1 rule gives about 1.5 m, so a friend can scan from the group without stepping into the strike zone.
  - The ticket ground is #EBE6E4, not white, so a bright panel doesn't bloom the camera.
- **Token:** 8 characters of Crockford base32 (40 bits), single use. It is generated and signed on the machine, so it works while the machine is offline. The page then says "Your hit is still on the machine. It lands here when Alif is back online."
- **Upload order:**
  1. Score and impact frame (80 KB), under 0.5 s.
  2. A 540 x 960 proxy clip, within about 3 s.
  3. The master, later.

  A fast scanner sees the poster frame and "Your video is arriving" first.
- **iOS:** App Clip under 15 MB, the limit for QR and NFC invocation, on an Advanced App Clip Experience covering the `pnch.co` prefix.
  - Card title "Your hit is ready", subtitle "Watch it now. Keep it with one tap.", action "View".
  - The App Clip confirms the device is within a 500 m region of the venue (`APActivationPayload`). A screen photo posted online can't be claimed from home.
- **Android:** Play Instant has been shut down, so the same URL serves a web keep page.
  - First paint under 1 s, poster frame, then the clip plays muted and inline.
  - "Keep it" uses Google sign-in.
  - "Get the app" passes the token through the Play Install Referrer, so the first open lands on the kept hit.
- **Players who already have the app:** verified universal links and App Links open the app directly on the hit.

### First 30 seconds (App Clip)
- **0 to 3 s:** camera chip, then the App Clip card, then "View".
- **3 to 5 s:** the replay is already playing, with no account asked for. The score seats in the sheet with the machine's spring and a heavy haptic.
- **5 to 12 s:** "Best today at Alif". "Continue with Apple" (one tap plus Face ID) keeps the hit. "Send the video" works without an account.
- **12 to 20 s:** "Kept as RED FOX". "Next hit at Alif comes straight here." A 3 minute link, with "Don't link my next hit".
- **20 to 30 s:** if a friend scans the same ticket, they see "This hit is RED FOX's. Join tonight's session?" and both phones now see the group's hits. The install prompt (SKOverlay) appears only after the second hit or at 60 s, and never blocks.

### Secondary path: NFC
- A dynamic NFC tag (I2C-writable, ST25DV class) sits behind a "TAP" mark on the cabinet at 1.2 m, beside the strike zone. The machine rewrites its NDEF URL with the current token when the number seats.
- It is secondary because the player has to walk into the next player's space, and it needs a hardware change.

### Fallbacks, when the scan fails or the player has already left
1. **Words.** Adjective plus animal from a curated 256 x 1,024 list: no body words, no near-homophones (so it survives being shouted in a loud mall), no insulting pairs.
   - Scoped to the machine and 24 h.
   - Entered at pnch.co or in the app, with the machine picked automatically from location.
   - Limited to 5 tries per device per hour.
2. **Find your hit.** For a player with no words:
   - Pick the machine, then "When?" (Last hour / Earlier today / Yesterday), then "What did you score, roughly?"
   - The player sees three candidate hits, shown only as score and time, with no image.
   - Choosing one makes the hit **Pending**: the video stays blurred, and it becomes theirs after 24 h if nobody keeps it with the ticket or the words.
   - An uncertain claim costs time, never someone else's privacy.
3. **Stub.** If a new credit arrives while a ticket is unkept, the ticket shrinks into the READY stub and survives until the next strike. The words still work for 24 h.

### What the machine shows once the hit is kept
- The ticket turns red: "KEPT" / "BY RED FOX". The group can see it worked without asking to look at the phone.
- The go-again line becomes "Next hit goes straight to RED FOX."
- It holds for 20 s or until a credit is inserted.

### Players who already have the app
- **Check in before striking.** The Scan tab offers "Check in at Alif" within 200 m (geofence plus the machine's BLE beacon, foreground only). They can also scan the ATTRACT code or tap NFC.
- **READY** shows "NEXT HIT GOES TO RED FOX", or their handle if they opted in.
- **The ticket arrives already kept**, with "NOT YOU? SCAN" for 20 s.
- **A Live Activity** shows "Alif: ready for your hit", then the score within about a second of the seat.

### Expiry and privacy rules
- **QR:** on screen until the hit is kept, a new strike lands, or 75 s pass. The link stays valid for 15 minutes.
- **Words:** valid for 24 h.
- **Unkept video:** deleted at 24 h, and the READY screen says so. The score stays on the day's board as "Unclaimed", with no image.
- **Keeping:** kept hits are "Only you" by default. Public posting needs age 16 or over. Under-16 accounts never appear in Near you and are never named on a machine.
- **On the machine:** it shows words or opted-in handles, never real names. Public posts blur everyone except the player.
- **Deletion:** deleting a hit also deletes its share renders and links. App Clip data moves to the full app through a shared app group.
- **Vocabulary:** players never see the word "claim". The verb is keep and kept.

## go_again

### The mechanic: race the last hit, ring today's bell, and let the phone stay linked
- **The bell is local, real and reachable.**
  - The bell is today's best at this machine, with a floor of the 30-day 75th percentile here, so the first hit of the morning doesn't ring cheaply.
  - The group watches the tide go for it, and the rail keeps both marks afterwards: a white notch for today's best and a red notch for this hit.
- **The ghost.** The next hit's tide rises past the red notch of the last one. If it beats it, the notch pops and the verdict reads "BEAT THE LAST HIT".
- **Copy speaks to the group, not to "you".** The next hitter is often a friend, so "BEAT THAT." / "Next hit races this one." works whether it is the same person or not.
- **"ADD A CREDIT" sits at knee to waist height**, beside the reader, with a chevron pointing at it. It sits where the paying hand goes.
- **The phone stays linked.**
  - After keeping, the App Clip links the next hit at this machine for 3 minutes. One tap stops it, and "NOT YOU? SCAN" fixes a wrong owner.
  - Hit two lands on the phone with "+23,578 on your first". That is the only delta numeral in the whole flow, and it lives on the phone, where it is private.
- **The group board lives on phones.** "Tonight at Alif" ranks the crew who joined by scanning the same ticket. The public screen never ranks friends against each other by name.
- **Bundles are the real revenue lever.** Three credits at a lower price is an operator pricing decision, not something the screen can do. I would test it.

### Honest versus manipulative
- **Motivating, and true:**
  - The bell is a real number from today, at this machine.
  - The ghost is a real hit.
  - The drain bar is the actual lifetime of a code. It never counts down to a purchase.
  - A weak hit gets silence rather than fake praise.
- **Manipulative, used with limits:** "JUST SHORT" works through the same near-miss mechanism slot machines exploit. I keep it only because it is true, and only when the gap is 5% or less (the sensor's repeatability decides the final threshold).
- **Refused:**
  - Timers that count down to a purchase.
  - Fabricated close targets.
  - Celebration animations for low scores.
  - Streaks and "last chance" copy.
  - Reminders sent at night.
- **Wellbeing cap.** After 5 linked hits in 15 minutes, "BEAT THAT." becomes "GOOD SESSION." with the sub line "Your hits are waiting on your phone." Linking then stops by default. Repeated maximum-force strikes injure hands, and a venue incident would cost more than any credit.

### How the screen sells it
- **To the player:** the red notch they have to beat, and "Next hit goes straight to RED FOX".
- **To the group:** "BEST TODAY" in red over the crowd, the bell line breaking, and "KEPT BY RED FOX" as public proof. The next person in the group sees exactly what to beat, and where.

## phone

### Platform
- **iOS first, iPhone 17 frame 402 x 874 pt** (safe areas: 62 top, 34 bottom). App Clips are the only zero-install native handoff left. Android gets the same flows on the web keep page first and a native app second.
- **Visual system:**
  - Dark UI: ground #0E0C0C, raised surfaces #1A1716.
  - 20 pt margins, 4 pt base unit.
  - Inter for reading. Orbitron 700 in caps, 12 pt with 1.5 pt tracking, for labels. Orbitron 900 for place names of 12 characters or fewer.
  - **The compressed numeral face for every score.**

### Information architecture
- **Five tabs:**
  - **Watch**
  - **Machines**
  - **Scan** (centre, the only red tab)
  - **Crew**
  - **You**
- **Modals:** Hit, Tonight at a machine (the session view), Find your hit.

### Frames
**P-01 App Clip card** (system). Header image 1800 x 1200 (a red tide and a ticket), "Your hit is ready", "Watch it now. Keep it with one tap.", "View".

**P-02 Your hit** (App Clip)
- **Video:** full-bleed 402 x 874, starting 1.2 s before contact.
- **Top, x 20:** "ALIF, DUBAI MALL" (Orbitron 700, 12 pt, baseline 80) over "Just now" (Inter 15, #CCBFBB, baseline 102).
- **Scrim:** #0E0C0C from 0 to 90% between y 440 and 874.
- **Sheet:**
  - "Best today at Alif": Inter 600, 15 pt, #F26B6A, baseline 568.
  - "612,480": compressed 900, 88 pt, baseline 654, followed by ".316" in Orbitron 700, 22 pt, #AE9892.
  - "Keep this hit. Hits nobody keeps are deleted after a day.": Inter 15/20, y 674 to 714.
  - "Continue with Apple" button: 362 x 52 at y 726.
  - A row at baseline 812: "Send the video" (Inter 600, 17, left) and "Not my hit" (Inter 15, #AE9892, right).

**P-03 Kept.** The button becomes "Kept as RED FOX" with a check. Below it: "Next hit at Alif comes straight here.", a 3 minute drain bar, and "Don't link my next hit".

**P-04 Tonight at Alif** (session)
- **Header:** "TONIGHT AT" (Orbitron 700, 12 pt) over "ALIF" (Orbitron 900, 40 pt). A row of joined faces, 40 pt.
- **Rows** (132 pt each), newest first:
  - A 64 x 112 poster.
  - Name (Inter 600, 17) and time "20:41" (Inter 13).
  - Score in compressed 900, 32 pt, right edge x 382.
- **The session leader's row gets a 96 x 168 poster** instead of a badge.
- The player's own improvement line: "+23,578 on your first" (Inter 600, 13, #F26B6A).
- **After install,** the full app opens on this screen. There is no onboarding carousel.

**P-05 You** (profile and reel)
- **Hero poster**, 402 x 340 full-bleed: the peak-compression frame of the player's best hit.
  - "PERSONAL BEST" (Orbitron 700, 11 pt) at y 230.
  - "612,480" (compressed 900, 64 pt, baseline 300).
  - "Alif, Dubai Mall. Saturday." (Inter 15).
- **Identity**, y 356 to 420:
  - 56 pt avatar.
  - "Maya R." (Inter 700, 22).
  - "@redfox" (Inter 15, #AE9892).
  - "Home machine: Alif" as a red link.
- **The reel is grouped by visit, not a uniform grid:**
  - Header "Saturday at Dubai Mall" (Inter 700, 20) with "With Sam and Rhea" (Inter 15).
  - The best hit of the visit is a tall 178 x 316 tile, beside a column of two 164 x 150 tiles.
  - A one-hit visit shows a single tall tile with "Race it" beside it.
  - Scores sit bottom-left in compressed 900 (32 pt on large tiles, 24 pt on small).
  - Months older than 30 days collapse to "August, six visits".

**P-06 Hit** (modal)
- **Video:** full screen with a 2 pt red scrubber at y 790.
- **Details:**
  - "612,480" (compressed 72 pt) with ".316".
  - "Saturday 13 September, 20:41" (Inter 15). The time is in the venue's local time.
  - "Alif at Dubai Mall" as a link.
- **Right-side actions:** Share, Challenge, and a visibility control that starts at "Only you".
- **Below:**
  - "Reactions" as names ("Sam felt that. Rhea wants a rematch.").
  - "Also at Alif tonight": public hits from within an hour of this one at the same machine.
- **Share render:** 1080 x 1920, 7 s, with the machine's seat spring at 4.0 s. The end card reads "ALIF, DUBAI MALL" and "pnch.co/alif". The token is never included.

**P-07 Watch**
- **Tabs:** text tabs, not pills: "Here" (only when within 200 m of a machine), "Near you", "Following". Inter 600, 17, with a 2 pt red underline on the active tab.
- **Overlay:**
  - Handle (Inter 600, 17).
  - "Alif, Dubai Mall. 2h" (Inter 13).
  - Score in compressed 48 pt.
- **Reactions:** one glove button. Long-press opens three:
  - **FELT THAT** charges over 600 ms with a haptic ramp and records a strength from 1 to 3.
  - **RESPECT**.
  - **RUN IT BACK** sends "Rhea wants a rematch at Alif".
- **Counts are never public.** Viewers see "Sam and others" with up to three faces. The owner sees who reacted and how hard, as glove size, not a number.

**P-08 Machine: Alif**
- **Header:** venue photo 402 x 260, "ALIF" (Orbitron 900, 40), "Dubai Mall, Level 2, by the cinema".
- **Held by:** holder avatar 72 pt, "RED FOX holds Alif this week" (Inter 700, 20), their clip, and "The board closes Sunday night."
- **This week:** the two players above you, you ("You, 4th"), and the two below. Scores are right-aligned.
- **Regulars:** faces of players who hit here 3 or more times in 30 days, opt-in.
- **Tonight here:** a clip strip.
- **Sticky buttons:** "Directions" and "Check in".

**P-09 Crew**
- **Challenges:** "Sam challenged you", with Sam's poster, "Beat 598,110 at any machine by Sunday night", and the buttons "Accept" / "Not this week". An accepted challenge puts Sam's ghost notch on any machine you check in to.
- **Crews:** "Saturday Six", with faces and "Last together: Saturday at Alif".
- **Rivals** (suggested, opt-in): "Omar keeps landing close to you at Alif", with "Follow" and "Challenge".

**P-10 Find your hit.** Machine (from location), then words with autocomplete from the word list, or "No words? Tell us roughly what you scored" leading to the three-candidate picker.

### What connects players to each other
- **Machines are places.** They have names, regulars and a weekly holder.
- **Shared sessions.** A group becomes a session just by scanning the same ticket.
- **Local rivals.** Rivals come from your home machine, not from a global ranking.
- **Reactions that meet in person.** "RUN IT BACK" turns into a meeting at a real machine.
- **Few notifications:**
  - "Someone beat your hit at Alif tonight" (same day, at most once a day).
  - A challenge received.
  - "The Alif board closes tonight. You're 4th." (Sunday 18:00, only when it is close).
  - The session video, 2 h after the last hit.
  - No streaks, and no "we miss you".

## competition

### Machine: today, and this machine only
- **The bell.** Today's best here is the target the tide chases.
- **Verdicts.** The words "BEST TODAY", "TOP TEN TODAY" and "MACHINE RECORD" appear on screen; any other rank never does.
- **The holder.** The weekly holder's name runs on the attract loop: "ALIF IS HELD BY RED FOX".
- **Why local and not global:** a global number on a mall screen makes 99% of hits look tiny in front of friends. A local daily target is reachable, it changes, and it turns the machine into a place worth defending. **Global numbers never appear on the machine.**

### App Clip: one sentence, only when it is a good story
- For example "Best today at Alif" or "Third tonight at Alif". Otherwise it says nothing.

### Phone: the real ladders, ordered by how reachable they are
- **Machine, this week.** Shown as you plus the two above and two below, because the person just ahead of you is the useful target, not the top of a list. The board resets Sunday 23:59, venue time. The winner becomes next week's holder.
- **Following, all time.** The friends leaderboard.
- **City, this month.**
- **Global.** One level deeper, under "All boards", and in Watch as a "Records" feed of the clips themselves. The world best is a spectator sport, so it sits with the videos.
- **What I removed from the current app:** the podium hero, and the Global / National / Regional tabs as the first thing you see.

### Integrity
- **Kept hits only.** A hit counts on a named board only when someone keeps it. Unkept hits count toward the machine's day as "Unclaimed".
- **Signed scores.** The machine signs every score.
- **Minors.** Under-16 accounts are ranked only on Following boards.
- **Weight classes.** Opt-in classes are the fairness question I would raise (see pushback).

## brand

### The measurement: Orbitron 900 cannot carry the score at a size that reads from 4 m
Metrics were read with fontTools from the Google Fonts variable file, and the column is 960 px (1080 minus two 60 px gutters).

- **Standard.** The signage rule of 1 inch of letter height per 10 feet (1:120) means 33 mm at 4 m. Panel pitch is 0.39 mm per px.
- **Whole score, "999,999.000".** At tabular width it is 7.98 em. It fits only at **120 px, with figures 87 px = 34 mm** (29 arcmin at 4 m). That is exactly the legibility floor: readable, but a readout, not an event.
- **Integer only, "999,999".** It is 5.25 em, so 183 px with 132 px figures = 52 mm.
- **Orbitron has no tabular figures** (no `tnum` feature). The "1" is 391 units wide and the "0" is 834, so a rolling count jumps sideways. Forcing tabular slots opens an **81 px hole beside every 1** at 183 px. At 900 weight the counters of 0, 6 and 8 close to slits.
- **Crowd-distance words don't fit either.** Orbitron 700 at 120 px sets "BEST HIT TODAY" 1162 px wide, which is wider than the screen.

### Position
- **Orbitron keeps the voice.** It sets every word a player reads from 1 to 2 m, the decimals directly under the number, and place names.
- **The score gets a compressed numeral with the same squared geometry.**
  - The Figma stand-in is **Saira at width 62, weight 900** (OFL, with real tabular figures). At 356 px it gives **250 px figures = 98 mm, about 2.9 times** Orbitron's whole-score size.
  - It also sets crowd verdicts: "BEST TODAY" is 441 px wide at 120 px.
- **Production: commission "Orbitron Compressed Numerals".** Fourteen glyphs: 0 to 9 tabular, comma, period, plus and minus.
- **To the brand owner:** we are not replacing Orbitron, we are giving it a job it can do. On a screen 1080 px wide, a face that spends 0.83 em per digit can't make the number big. The brand stays recognisable through the red, the squared forms and Orbitron in every word. The screen shows the brand at the same moment the number reads from across the mall.

### Other changes
- **`--font-sans: Orbitron` becomes Inter** on the phone.
  - At 15 px, Orbitron sets a 44-character sentence 16% wider than Inter (387 px against 333), and its lowercase is hard to read as body text.
  - The landing page already uses Inter, so the app and the site now match.
- **Red #EB1110 is kept as the single accent**, meaning force and you: the tide, verdicts, the Scan tab, your own marks.
  - It measures 4.3:1 on the new ground, so it is used only at 56 px or larger on the machine and 20 pt or larger on the phone.
  - Smaller red text uses #F26B6A (5.6:1 on #221E1D). On light grounds it uses #BC0D0C (5.3:1).
- **New token neutral-950 #0E0C0C** for dark grounds. The warm neutrals stay: a gym feels warm, not like a sci-fi HUD.
- **Token bugs to fix:**
  - primary-700 and primary-800 are both #8d0a09.
  - neutral-300 and neutral-400 are both #ccbfbb.
- **Secondary magenta #D842D3 is retired from both surfaces.** Two hot hues compete, and red against magenta is weak for colour-blind players.
- **Yellow #FFAB00 is kept for one thing only:** the holder mark. Green is not used on the machine; KEPT is red, the brand's own confirmation.
- **Opacity tokens.** The "Main BG" set is only white overlays. Rename them overlay-white, and add overlay-black at 40, 60, 80 and 90% for text over video. The cool #F2F3F3 secondary-bg is replaced with a warm equivalent.
- **Missing scales, now added:**
  - A machine type scale by distance (Crowd / Player / Hand).
  - A phone type scale: Inter 34 / 28 / 22 / 17 / 15 / 13.
  - Spacing: 60 px machine gutter, 20 pt phone margin, 4 pt base.
  - Radii: 0 on the machine, 12 and 16 on the phone.
  - Motion tokens: rise easeOutQuad, fall easeInQuad, seat spring 500/22, lock spring 700/30, feed linear, phone UI 240 ms easeOutCubic.

## detail_touches

- **Figures are right-aligned on x 1020.** The units digit sits in the same place on every hit, so two scores compare place by place.
- **Tabular compressed digits roll without jitter.** The score's size never changes with its magnitude.
- **The claim URL is uppercase.** That keeps the QR at version 2 (25 modules, level Q) instead of version 4.
- **The QR never moves.** The ticket's mask moves around it, nothing crosses its quiet zone, and the drain bar sits outside it.
- **The ticket ground is #EBE6E4, not white,** so a bright panel doesn't bloom the phone camera.
- **The photo is the scan.** Number and ticket both fit in the top 0.48 m of the panel.
- **The two words are the code and the player's anonymous name.** They are curated to survive being shouted in a loud mall (no homophones) and to form no insulting pairs.
- **Players never see the word "claim".** The verbs are keep and kept, everywhere.
- **One flash:** white at 55%, never red, well under WCAG 2.3.1's three flashes a second.
- **The tide falls faster than it rises** (520 ms against 848 ms), so the landing is heavier than the launch.
- **The READY camera preview is the recording notice,** and the same 960 x 1280 frame becomes the replay.
- **Upload order:** score and impact frame first, the proxy clip second, the master last. A fast scanner never sees a spinner.
- **Tokens are signed on the machine,** so a keep still works while Wi-Fi is down.
- **Machines have names, not numbers.** "Alif" is what players say.
- **The App Clip checks location within 500 m,** so a screen photo posted online can't be claimed from somewhere else.
- **Decimals stay in Orbitron,** literally under the number. On phone boards they break ties.
- **Reaction counts are never public.** Faces and names replace them.
- **Dates:** relative under 7 days ("Saturday"), absolute after that ("13 September"). Times are in venue local time, because the reel records where it happened.
- **Share renders link to the machine page,** never to the keep token.
- **The session leader gets a bigger poster, not a badge.**
- **The export fits H.264 Level 5.1:** 1080 x 3840 at 60 fps is 979,200 macroblocks per second against a limit of 983,040.

## pushback

### Pushback on the brief
- **"Touch [IS / IS NOT]" was left blank.** I designed for no touch. Even with touch, the top two thirds of a 1.5 m panel is above many players' reach, hands may be gloved or taped, and a screen at strike height gets punched.
- **The size and pixels don't agree.** 1.5 x 0.5 m is 3:1, but 1080 x 3840 is 3.56:1. Either the pixels are not square or the panel is about 0.42 m wide. I sized type from the height (0.39 mm per px).
- **Three decimals are false precision.** What are the sensor's resolution and repeatability? If a repeat hit varies by 2%, the thousandths are noise. On the machine I demote them. On the phone they break ties.
- **"One attempt and a walk-away is a failure."** For the business, the useful unit is the group and the return visit. Pushing maximum-force attempts per person invites hand injuries, drunk players at night and children, so I added a wellbeing cap.
- **Competition is not optional.** Local competition is the retention engine. What is optional is global.
- **Filming.** Bystanders, consent notices and retention need legal review per market (UAE PDPL, GDPR). I set 24 h retention for unkept video as the default.
- **Fairness.** Punch force tracks body mass, so opt-in weight classes and age limits belong on the boards.
- **Deliverables.** One clip can't show both branches. I would send the bell branch plus a still of "JUST SHORT".

### Questions I would have asked
- Where are the pad, the camera and the credit reader relative to the panel, and how high is the panel mounted? A pad at head height would hide the eye band.
- How long does the sensor take to return a score?
- What does a typical score look like, and what is the median number of digits?
- Can the app pay for credits? Are bundles allowed?
- What connectivity does a venue have?
- Which countries launch first (for sign-in, privacy law, and the thousands separator)?

### What I would validate with users
- **Photographing the score.** Watch two machines for a weekend: count phone raises, when they happen relative to the seat, and from how far. This confirms or kills the photo-is-the-scan idea.
- **Scan success on the real panel,** by distance and brightness.
- **Who scans:** the player or a friend.
- **Time from seat to video playing** (target: median under 15 s), and drop-off at the App Clip card and at sign-in.
- **Word recall after 30 minutes.**
- **"JUST SHORT" against silence,** measured by second-credit rate, alternating by machine and day.
- **Handles on machines:** whether players opt in.
- **The rail:** whether the notches read as "this hit" and "today's best" without explanation.
- **The weekly holder:** whether it motivates regulars or scares off newcomers.

### For the notes
- **AI use:** scripts written with an AI assistant measured the font metrics (fontTools), QR versions (segno), contrast ratios and layout renders.
- **My own decisions:** zoning, copy, and the choice to replace the score face were mine, and I checked them against rendered frames.

## risks

- **The photo-is-the-scan idea may fail on a real panel.** A 1000-nit LCD, moiré, and a camera exposing for the red tide can all stop the chip from appearing. If testing shows that, the ticket needs its own brightness state, and NFC stops being secondary.
- **Android is the weak side.** With no Instant Apps, the web keep page and install referrer will convert worse than the App Clip. Where Android dominates a market, the funnel may halve.
- **The brand owner may reject the compressed numeral.** The custom cut costs time and money, and Saira is only a stand-in. Falling back to Orbitron halves the number's height.
- **The bell depends on data quality.** On quiet machines or early in the day, today's best is weak. Without the 30-day floor, mediocre hits would ring the bell and cheapen it.
- **Public humiliation.** A short tide in front of friends can shame teenagers. Silence for weak hits helps, but the tide's height is still visible.
- **Privacy incidents** are the biggest brand risk:
  - Screen photos posted within the 15 minute link window (the web page has no App Clip location check).
  - Abuse of Find your hit.
  - Minors reaching the feed.
  - Misattributed linked hits within a group.
- **Hardware unknowns could break the zoning.** A pad or camera in front of the panel, or a different mounting height, would push content into the wrong bands.
- **Chasing attempts could backfire** through injuries, operator complaints or regulators, if the business overrides the wellbeing cap.
- **The empty low band may read as unfinished** to reviewers who never stand 1.2 m from the panel. It needs the physical sightline diagram next to the frames.
- **Scope.** This is more than three hours of work. To fit the exercise, I would keep M-01, M-02, M-03 and M-04, plus P-02, P-03, P-05 and P-07, and the clip. Everything else goes in the notes.