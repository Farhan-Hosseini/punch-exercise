# Proposal: Pocket the Punch  (propose:retention)

## thesis

The machine's only job is to make five seconds worth keeping, and the phone's only job is to keep them. Every machine state is designed backwards from the moment the clip lands on a phone: the score is staged as an event so there is something worth pocketing, the screen is zoned by physical height so the queue sees the event from four metres and the player finds the QR at hand height, and the claim is the hinge of the loop, because once a punch is claimed the next credits attach to that account by themselves, so the second and third attempts cost nothing in friction. Competition lives where it can be felt without being humiliating: today and here on the machine, everywhere else on the phone. The brand's red stays the colour of the player's own strike; the score gets a face built for a 1080 px column because the measured truth is that Orbitron cannot be both the brand type and a six-digit event.

## machine_flow

**Physical frame the zoning is built on (stated assumptions, questions listed under pushback).** 3840 px over 1.5 m gives 0.39 mm per px. I assume the panel sits beside the pad with its bottom edge about 0.55 m off the floor and its top at about 2.05 m. A 1.7 m adult standing 1.2 m away sees y 330 to 1970 comfortably (a 30 degree cone), so the player's decisions live there; the queue at 3 to 4 m reads the whole panel, so the top carries what the queue needs; a phone held at chest height scans best at 0.8 to 1.1 m off the floor, so the QR lives at y 2840 to 3260. Margins are 56 px each side (column 968). One alignment logic on every state: everything hangs off the left spine at x 56, the score being the single element allowed to run the full column. Legibility floors from the visual-angle maths: nothing on the machine under 48 px, nothing the queue must read under 120 px, the hero digits at 380 px (cap 261 px, 102 mm, 88 arcminutes at 4 m).

**Zones (y from the top of the canvas)**
- Marquee 0 to 360: venue and machine identity, and the one standing target.
- Rail 360 to 760: the latest score and the set of three.
- Decision 760 to 1560: READY, GO AGAIN, the reasons.
- Video 1560 to 2640 (1:1 crop) or 720 to 2640 (full 9:16) depending on state.
- Dock 2640 to 3840: the handoff. The dock is owned by whoever punched last, independently of the states above it. That independence is what guarantees nothing blocks the next attempt.

**Type on the machine**: score digits Saira Extra Condensed 800 (see brand); Orbitron 900 uppercase, tracking 0.06 em, at 160 and 120 px for words the queue reads; Orbitron 700 at 80, 64 and 48 px for labels the player reads; Inter 600 at 56 and 48 px for sentences. Every string below was measured against the 968 px column.

**S0 ATTRACT (loop, ends on the credit event)**
- Marquee: "DUBAI MALL" Orbitron 700 64 px neutral-300 at (56, cap top 96), "EAST" on a second line at 64 px. Right-aligned block: "BEST TODAY HERE" Orbitron 700 48 px, "512 004" Saira XC 112 px white, "@LINA" Inter 600 48 px neutral-300.
- Decision zone: "PUNCH" Orbitron 900 160 px white at cap top 880; under it "One credit. One shot." Inter 600 56 px neutral-200 at 1100; "On your phone in seconds." at 1176.
- Video: claimed clips from today (consent required, see handoff) cycling every 6 s with their score at 96 px and handle at 48 px in the bottom-left of the frame.
- Dock: "HAVE THE APP?" Orbitron 700 64 px, machine QR 320 px (static, encodes pnch.app/m/dxb-east) at (56, 2840), "Scan to arm the next punch to your reel." Inter 600 56 px at x 420, and one line at the bottom: "Missed a punch earlier? pnch.app/find" Inter 600 48 px neutral-500 at y 3720.

**S1 READY (ends on the strike sensor event; 90 s timeout returns to S0 with the credit held by the hardware)**
- Marquee at full brightness.
- Decision zone: "READY" Orbitron 900 160 px at cap top 440. Armed variant: "@FARHAN" Inter 600 80 px below at 640, and "Your best is 412 908." Inter 600 56 px at 760 (this numeral earns its place: it is the target).
- Video 720 to 2640: the live camera, mirrored so the player sees a mirror; the recording is not mirrored. Tag inside the feed at (80, 776): a 24 px red disc and "RECORDING" Orbitron 700 48 px. A black 60 percent band across the bottom of the feed (2500 to 2640) carries "Hit the pad when you're ready." Inter 600 56 px.
- Dock: whatever the previous player's dock holds, untouched. If empty, the S0 dock.
- A credit inserted during S2 to S4 is accepted and queued; READY begins the moment S4 ends, so the worst case from strike to the next READY is 3.2 s.

**S2 IMPACT (0 to 400 ms, timer)**
- 0 to 16 ms one white frame, 16 to 50 ms full-bleed brand red #eb1110, the live feed freezes on the impact frame. From 50 ms the event zone cuts to black; the marquee dims to 40 percent. Canvas shake: translate (-14, +10) px decaying as a damped sine at 14 Hz over 320 ms. Nothing else. The black beat is the anticipation.

**S3 REVEAL (400 to 2000 ms, timer)**
- Label "YOUR PUNCH" Orbitron 700 80 px neutral-300 at cap top 900 (variants: "@FARHAN" when armed or claimed, "SECOND PUNCH", "THIRD PUNCH").
- Hero digits: Saira XC 800 380 px white, baseline 1440, left at x 56, thousands separated by a 0.12 em gap (46 px), no comma, no decimals. Six digits and the gap measure 937 px. Odometer count-up as described in the reveal timeline.
- Landing at 1600 ms: an 8 px red rule at y 1512 extends from x 56 to 1024 in 240 ms.

**S4 QUALIFY (2000 to 3200 ms, timer)**
- One line under the rule, cap top 1600: a tier word in Orbitron 900 160 px, one of "LIGHT", "SOLID", "HEAVY", "BRUTAL", "BEAST" (widest measures 835 px). Tiers are percentile bands per machine over the trailing month so every venue sees every word (validate the words with users). Achievements replace the tier word at 120 px: "NEW BEST" (armed or claimed players beating their PB), "SET BEST" (second or third punch beating the set), or two lines at 112 px "TOP THREE" and "TODAY, HERE" when the punch enters the machine's top three today. The marquee target flips live with a 600 ms roll if the punch beats it, and the previous holder gets a push.

**S5 PLAYBACK (3200 to 9800 ms, timer; a credit event jumps to S1 and the dock persists)**
- 3200 to 3800: the hero number travels up to the rail (baseline 1440 to 640) and shrinks 380 to 224 px, ease-in-out; the red rule shrinks to 4 px under the rail at y 728; the label fades out; the qualifier fades out and re-enters at 64 px right-aligned on the rail baseline.
- 3400: the video zone 720 to 2640 fades in from black on the frozen impact frame (full 9:16 clip). 3800 to 5800: the 0.6 s around impact at 0.3x speed. 5800 to 9800: the whole 4 s clip at real speed, then it loops.
- 5000: the dock rises from below the bottom edge (translateY 1200 to 0, 480 ms, ease-out-expo). Dock contents: "KEEP IT" Orbitron 900 120 px at cap top 2704; QR 420 px black on white with a 4-module quiet zone at (56, 2840); at x 540 the impact-frame still 200 by 250 px so it is self-evidently that punch; "CODE" Orbitron 700 48 px at cap top 3120, the code "K7F 3PD" Saira XC 800 160 px at baseline 3290; under the QR "Scan to keep this punch. Two days." Inter 600 56 px at 3320; "Missed yours? pnch.app/find" Inter 600 48 px neutral-500 at 3480; bottom line at 3720, 48 px neutral-600: "Recording. Unclaimed punches delete in two days."

**S6 KEEP AND GO AGAIN (9800 ms to 30 s, timer; credit event to S1; claim event updates the dock in place)**
- Rail 360 to 760: the latest punch at 224 px on the left; the rest of the set as small slots to its right (160 px tall, scores at 96 px). First punch: two empty slots outlined 2 px neutral-700. Second punch: the first score moves into the small slot with a 4 px red top rule and "BEST" Orbitron 700 48 px if it is still the best. No score is ever printed twice.
- Decision 760 to 1560: "GO AGAIN" Orbitron 900 120 px at cap top 840; "First one is a warm-up." Inter 600 56 px at 1020 and "Best of three counts." at 1096; "Add a credit to go again." Inter 600 56 px neutral-300 at 1300. When the venue has the bundle enabled the third line reads "Third one is on us." After a claim the second line becomes "Your next one lands on your phone by itself."
- Video 1560 to 2640: the clip cropped 1:1 around the impact, looping.
- Dock: unchanged from S5. On the claim event it plays S8 inside the dock without touching the zones above.
- The 30 s window has no visible countdown; the decision block fades to 40 percent over the last 5 s.

**S7 DOCKED HANDOFF (30 s to 120 s after the strike; claim event, credit event, or timer)**
- The marquee, decision and video zones return to S0's attract content. The dock persists exactly as it was, so a player who stepped aside to find their phone still has the QR, the code and the still. At 120 s the dock clears; the code stays valid for two days.
- When the next player strikes, the dock still belongs to the previous punch until the new dock rises at S5 (5 s after the new strike). The new dock carries one extra line for 60 s at y 3600, 48 px neutral-500: "Earlier punch? Code M2Q 7XR".

**S8 CLAIMED (2000 ms toast, then a 5 s strip, then empty)**
- The dock's top rule turns green #00c853, "SAVED" Orbitron 900 120 px replaces "KEEP IT", the QR and code fade to 20 percent, "On @farhan's reel." Inter 600 56 px replaces the scan line. After 2 s the dock collapses to a 200 px strip at 3640 to 3840 reading "Saved to @farhan" for 5 s. If the same person's session is still open, further credits attach to that account (S1 shows "@FARHAN", no QR is needed again).

**Figma frames (1080 x 3840):** S0, S1, S1 armed, S2 red frame, S3 mid-count, S3 landed, S4 tier, S4 top three, S5 playback with dock, S6 first punch, S6 third punch after claim, S7 docked, S8 saved. Thirteen machine frames, plus a zoning overlay frame with the physical heights drawn on.

## reveal_motion

**Clip: 8000 ms, 1080 x 3840, 60 fps, built in code and recorded frame by frame to MP4 (a 540 x 1920 preview alongside). No audio anywhere in the design; every beat is visible.**

Easings used: impact and arrivals `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo); travel `cubic-bezier(0.65, 0, 0.35, 1)`; the landing spring stiffness 320, damping 18 (one overshoot).

- **0 ms, strike.** Starting from S1: the live feed in the video zone, "READY" above. One white frame (16 ms), then two frames of solid brand red (to 50 ms). The feed freezes on the impact frame. The panel takes the hit before the number exists.
- **50 to 370 ms, shake and black.** The whole canvas translates (-14, +10) px and rings down as a damped sine at 14 Hz, amplitude to zero by 370 ms. The event zone is black; the marquee sits at 40 percent. This is the anticipation beat: a dark screen for a third of a second, which is long enough to feel deliberate and short enough to never feel broken.
- **200 to 440 ms, label.** "YOUR PUNCH" fades in at cap top 900, opacity only, no movement. Movement is reserved for the number.
- **400 to 520 ms, cells appear.** N tabular cells (one per digit of the final score, no leading zeros) fade in showing "0", 380 px, baseline 1440, left at x 56. Each cell is a fixed 0.404 em wide, so nothing jitters as the glyphs change.
- **400 to 1600 ms, count-up.** The displayed value rises from 0 to the final on ease-out-expo. Each cell is an odometer strip (the ten glyphs stacked, translateY), rolling with a two-frame ghost at 30 percent for blur. Cells settle left to right: the leftmost at 1100 ms, then one every 100 ms, so the last integer digit stops at 1600 ms. The eye reads the magnitude early and the exact value late, which is what makes it a reveal and not a readout.
- **1600 ms, landing.** The number scales 1.05 to 1.00 on the spring (overshoot to 0.99 at about 1720, settled by 1900). The 8 px red rule at y 1512 extends from x 56 to 1024 over 240 ms ease-out-expo: the floor the number lands on. Second shake, amplitude 8 px, 200 ms. A red radial glow behind the digits (35 percent) flashes on and decays to zero over 900 ms. The digits stay white throughout; red is the impact, never the number.
- **2000 to 2320 ms, qualifier.** "HEAVY" rises 40 px and fades in, ease-out-expo. Two-line achievements stagger by 80 ms. This gives the number meaning to the people in the queue who do not know the scale.
- **2320 to 3200 ms, hold.** Nothing moves. The queue reads it.
- **3200 to 3800 ms, travel.** The number travels to the rail (baseline 1440 to 640) and shrinks 380 to 224 px on the travel easing; the rule shrinks to 4 px under the rail; the label fades out over 200 ms; the qualifier fades out and returns at 64 px on the rail baseline at 3800 over 240 ms.
- **3400 to 3800 ms, playback in.** The video zone (720 to 2640) fades in from black on the frozen impact frame.
- **3800 to 5800 ms, slow motion.** The 0.6 s around impact at 0.3x.
- **5000 to 5480 ms, dock.** The handoff dock rises from below the bottom edge, ease-out-expo, QR and code and still arriving as one object.
- **5800 to 8000 ms, real time.** The clip plays at real speed; the clip ends with the machine in S5, the QR in place.

**Why the big number reads as an event.** It has a before (the hit on the panel, the black beat, the digits rolling in from zero), a moment (the landing with scale, rule, shake and glow all keyed to the same 1600 ms), and an after (a word that says what it meant, then the proof on video). It is also the only thing on a black screen at that moment, at 102 mm cap height. A readout appears instantly and means nothing; this takes 1.2 s to arrive and the panel physically reacts to it twice.

## handoff

**Primary path: scan the dock QR.** The QR encodes `https://pnch.app/c/K7F3PD?m=dxb-east`. The six-character code is the whole token: alphabet of 29 characters with the confusables removed (no I, O, S, B, 0, 1, 5, 8), 29 to the sixth power is about 594 million, claims are rate-limited per IP and per machine, so the code is unguessable in practice and short enough to type. The URL is an iOS App Clip experience and an Android App Link. On iOS: scan, the App Clip card appears ("PunchApp", "Keep this punch", Open), the clip opens full screen within about 3 s of the scan showing the impact still, then the 4 s clip with a 900 ms miniature of the same count-up. Two buttons: "Keep it" (primary) and "Share" (secondary). Keep it triggers Sign in with Apple, a suggested handle ("@farhan" from the given name, editable), one explicit toggle "Show my handle and score on machine boards" (on by default, explained in one line), and the punch is saved. Target: thirty seconds from scan to saved. Share works before any sign-in: the system share sheet with a 9:16 clip that has the score baked into the bottom-left in the score face with the venue and date, and the caption carries the public link `pnch.app/p/<id>`, so every share lands viewers on the same App Clip. On Android the same URL opens a web claim page (Chrome, no install) with the clip, "Keep it" via Google one-tap and "Share", then an App Link when the app is installed; I would not build on Google Play Instant, it is not a platform I would bet the loop on.

**Second path: NFC.** A tag in the bezel next to the dock encodes the machine URL `pnch.app/m/dxb-east`. A tap claims the attempt currently in the dock (there is only ever one), through the same App Clip. The dock carries a small NFC mark beside the QR. NFC needs no camera and works with a gloved hand on the phone, which matters here.

**Fallback one: the code.** Printed next to the QR at 160 px, spaced three and three: "K7F 3PD". Typed into the app's Punch tab or at `pnch.app/claim`. Valid for two days. The dock also says "Take a photo of this if you're in a hurry" is not needed as copy: the code is large enough that a phone photo captures it, and the claim page accepts a pasted or typed code.

**Fallback two: find yourself.** In the app, Punch tab, "Missed a punch?": choose the venue (nearby list, or search), the machine, a time band in words ("in the last hour", "earlier today", "yesterday"), then a grid of unclaimed impact stills with faces blurred and the score under each. Pick yours, it becomes yours, but it is marked unverified on the profile and does not rank on any board. The app says why: "Scan next time and it counts." That keeps the boards honest and makes the scan the obvious habit.

**What the machine shows once the claim succeeds.** The dock plays S8: green top rule, "SAVED", "On @farhan's reel.", the QR and code fade to 20 percent, then the dock collapses to "Saved to @farhan" for 5 s. Only the handle is ever shown, and only if the toggle is on; otherwise the dock says "Saved." The zones above the dock are untouched, so a claim mid-way through the next player's attempt never interrupts it. Claiming opens a session: for the next few minutes any credit on that machine attaches to that account, S1 shows "@FARHAN", the reveal label is the handle, "NEW BEST" fires against the real PB, and the phone gets a push about 2 s after each strike: "412 908. On your reel." with the clip. That is the mechanic that makes attempts two and three frictionless.

**Expiry and privacy.**
- The QR and dock are on screen for up to 120 s after the strike; the code and link work for two days; after two days an unclaimed attempt's video and still are deleted and only an anonymous score remains for the machine's statistics.
- A claim is single use; a second visitor to the same link sees "This punch belongs to someone else. If it is yours, tell us." and a dispute form. Claimed attempts are visible per the owner's setting: default visible to people on the same machine boards and followers; "Everyone" is a deliberate opt-in.
- The attract reel and the marquee show only claimed, consented attempts; unclaimed people are never replayed after their own session. The live feed is visibly marked "RECORDING" and the dock's last line states the two-day deletion.
- The machine never shows a real name, only a handle, and never an avatar photo at machine size.
- The QR carries no personal data, only the code and the machine id.
- Under-age players: the claim age-gates at the local threshold; a declined gate keeps the score on the profile-less claim page for the two days and deletes the video as usual.

**A player who already has the app.** They never scan a claim QR again. Three ways in: scan the machine QR in S0 from the app's scanner, tap the NFC tag with the app installed, or accept the "You're at Dubai Mall East. Arm the next punch?" prompt the app raises from the venue's BLE beacon or geofence. The machine's S1 shows "READY" and "@FARHAN" with their best as the target; the reveal shows "NEW BEST" when earned; the dock shows "SAVED" with no QR and the decision block reads "Your next one lands on your phone by itself." Their callouts (see phone) travel to the machine: if they had accepted "Beat Lina's 412 908", S4 shows "SET BEST" or the tier word as usual, and the phone, not the machine, tells them how close they came. An armed host can pass the glove from the app to a friend from the crew or to a typed name, so the friend's punch is already waiting for them on a link, which is the cleanest install prompt there is: your friend has your punch.

## go_again

**The mechanic: a set of three, with the best kept.** The rail treats every session as a set of three punches. After the first strike the rail shows the score and two empty slots; the decision block says "GO AGAIN", "First one is a warm-up.", "Best of three counts.", "Add a credit to go again." After the second strike the rail compares the two, marks the best with the red rule, and the reveal can say "SET BEST". Nothing counts down. The set is also the unit the phone keeps (a session is three thumbnails on the reel), so the empty slots on the machine are the same empty slots the player will see on their profile.

**How the screen sells it to the player.** Three things in the eye band, in order of size: the number they just got, the invitation, the reason. The reason is a claim about variance ("first one is a warm-up") that I would only ship if the data supports it, and it is honest: a single full-force strike is a noisy measurement, and almost everyone's second is different from their first. The claim session removes the last friction: once they have scanned, the next credit is already theirs, so the cost of going again is a credit and nothing else.

**How it sells it to the group behind them.** The rail and the marquee are legible from 3 to 4 m. The group sees the empty slots, the tier word, and the machine's best today with a handle on it. A group naturally turns the rail into a ladder: three friends, three slots, the best marked in red. The attract reel between sessions shows claimed clips with handles, which tells the queue that people they can see on the board were standing exactly here. When a punch beats the marquee target, the marquee rolls over live in front of the queue, and the previous holder's phone buzzes wherever they are, which is the most persuasive advert for a credit I can design.

**The bundle.** When the venue enables it, the third line reads "Third one is on us." I would push for this as the pricing default: the revenue goal is three attempts, and a paid-two-get-three framing converts better than three paid ones and costs a fraction of a credit in margin. Business decision, flagged, not assumed.

**Honest about what is manipulative and what is motivating.** Motivating: a real target (your own first punch, your PB, the machine's best today, a friend's callout), the set of three as the unit of play, the group ladder, the bundle. Mildly manipulative and used anyway: the two empty slots, which is endowed progress; I keep them because they also tell the truth about how the reel works. Deliberately not used: any visible countdown to reinsert, loss framing ("don't lose your set"), scarcity, or a fake near-miss. The 30 s window exists because the queue needs the machine back, and it is expressed as a slow fade, not a timer.

## phone

**Platform and frame.** iOS first at 393 x 852 pt (iPhone 15 and 16 class), because the App Clip is the handoff; Android at 412 x 915 dp with the web claim page in place of the App Clip and full parity in the installed app. Dark theme by default (the machine's world): background #0b0a0a, surface #171413, text white at 100, 60 and 40 percent, red #eb1110 for the player's own actions, magenta #d842d3 for other people's moves, yellow #ffab00 for records, green #00c853 for saved. Type: Inter for everything read (titles 28 and 20 bold, rows 17 semibold, body 15, meta 13, caption 12), the score face Saira Extra Condensed 800 at 64 (hero), 28 (rows) and 20 (chips), Orbitron 700 only at 14 pt and above for tier words, the "LIVE" tag and the wordmark at 18. Margins 20 pt, 4 pt grid, one alignment logic per screen: left-aligned content, scores right-aligned in rows. Buttons 52 pt tall, radius 14. Decimals appear only where ties matter (board rows and attempt detail), at 60 percent of the integer's size; everywhere else the integer.

**Information architecture.** Four tabs and a centre action: Punches (the feed), Boards, Punch (centre: scanner, arm, targets), Crew, You (the reel). Machine pages are reachable from any punch, any board row and the Punch tab.

**App Clip: Claim** (the first screen most players ever see). Full-bleed impact still, the clip plays once with a 900 ms count-up, score at 64 pt bottom-left over the video with the tier word in Orbitron 14 above it, "Dubai Mall East, Saturday 12:40" Inter 13 under it. Bottom: "Keep it" (red, full width) and "Share" (text button). No login yet.

**App Clip: Keep it.** Sign in with Apple, then one card: the handle field pre-filled "@farhan", the toggle "Show my handle and score on machine boards" with the line "Your handle can appear on this machine's board today.", button "Keep it, @farhan".

**App Clip: Saved.** The still with "It's yours." Inter 28, then the one reason to install, written from context: "Third today at Dubai Mall East. See who's above you." and "Get the app" (SKOverlay), with "Not now" underneath. Nothing else on the screen.

**You: the reel.** Header: avatar 72, handle Inter 24 bold, city in words, "since May" in words. The best punch as a 4:5 hero clip with its score at 64 pt and a yellow "PB" mark. Then sessions, not a grid: "Saturday, Dubai Mall East" as a row title, the set as three 4:5 thumbnails (113 x 141) with scores at 20 pt underneath, the best of the set carrying a 2 pt red top rule, an empty outlined slot for an unfinished set. This is the same rail as the machine, which is the point: the profile is the machine's memory. A machine chip under the header lists the machines they have punched at, by name.

**Attempt detail.** The 9:16 clip fills the top 698 pt with a scrub bar; a sheet below: score with decimals ("412 908.321", the decimals at 60 percent), the tier word, "Saturday 12:40, Dubai Mall East" as a link to the machine page, position that day in words ("Third today at this machine"), the set rail, then reactions received as faces ("Respect from Omar, Lina and others"), callouts received, "Share" and "Beat it" (send a callout to yourself for next time, or challenge a friend).

**Punches: the feed.** Not the existing full-screen vertical feed. A punch is four seconds; the feed is a scrolling list of 4:5 cards that loop muted, because the social object here is the score and the face together, side by side with the next one, not a swipe-through of thirty-second videos. Scope control at the top in words: "Here" (machines you have punched at), "Crew", "City". Card: the clip with the score and tier word baked in at the bottom-left, then a row: avatar 32, handle Inter 15 semibold, "Dubai Mall East, Saturday" Inter 13 at 60 percent, and on the right two text actions "Respect" (a fist) and "Beat it". Under it "Respect from Omar and Lina" in faces and names, "See comments" as a link. No view, like or comment counters anywhere: counts are the one thing every feed has and the one thing that makes a bad punch feel worse.

**Reactions and callouts.** "Respect" is the only reaction, one tap, shown as faces. "Beat it" is the social mechanic that pays off on the machine: tapping it on someone's punch creates a target ("Beat Lina's 412 908 at Dubai Mall East"), which sits on your Punch tab, travels to the machine when you arm, and closes on the phone with the result ("Close. Lina's still up by 14 700." or "You beat Lina's 412 908."). Lina is told in both cases. Callouts are the magenta thread; the player's own actions are red.

**Machine page.** "Dubai Mall East" Inter 28, the venue and a directions link, "Best today" as a clip card, "This week" and "All time" as rows, "Regulars" as an avatar row with names, "Recent punches" as a list, and, when the phone is within the venue, a pinned "I'm here. Arm the next punch." button. This page is what makes the app feel like the room: it is the same board the queue saw, with the people on it.

**Boards.** Two rows of scope in words: "This machine, Venue, City, Country, World" and "Today, This week, All time". The top three are clips, not avatars, with scores at 28. Then rows: avatar, handle, city, score right-aligned. Your row is pinned at the bottom with the one rank numeral on the screen ("#12") and a "Rivals" strip above it: the three people just above you with the gap in points, because a gap of 3 120 is a reason to go back and a rank of 48 213 is not.

**Punch (centre).** The scanner at the top (claim QR, machine QR, NFC hint), "Nearby: Dubai Mall East" with "Arm", your open targets, "Missed a punch?" leading to the find-yourself flow, and the claim code field.

**Crew.** Crew name, members, the crew ladder this month (each member's best), "Pass the glove" when a member is armed at a machine, and the last session's group rail.

**Notifications** are the come-back-next-weekend layer, all opt-in by type: "Omar beat your best today at Dubai Mall East.", "Lina called you out: beat 412 908.", "Your Saturday punch has respect from Omar and others.", "You're still third this week at Dubai Mall East." The connection to the people who use these machines comes from three things: the feed's default scope is the machines you have stood at, the machine page shows the regulars by name, and callouts are settled physically, at a machine, not in a comment thread.

## competition

**Machine: today, here, and the set.** The machine shows exactly three competitive facts. The marquee target ("BEST TODAY HERE", the score, the handle), which is the only standing number on the panel and rolls over live when beaten. The qualifier after the reveal, which is a tier word or "TOP THREE / TODAY, HERE" when earned, and never a rank below the top three, because a machine in a mall must never tell a player in front of their friends that they are forty-eighth. And the rail, which is the set of three and doubles as a group ladder. Weekly, city and world boards do not belong on the machine: the panel has no context (who these people are, how far you are from them) and no privacy (the queue is watching). The marquee's live rollover is the one place the machine broadcasts a rivalry, and it does it to the queue on purpose.

**Phone: everything scoped.** Boards by place (this machine, venue, city, country, world) and time (today, this week, all time), with the top three shown as clips and the player's own row pinned with the single rank numeral. The Rivals strip replaces the long list as the thing you actually look at: the three people just above you and the gaps. Crew ladders live in Crew. The machine page is the local board with faces, which is the pub-quiz version of competition and the one walk-up players relate to.

**Between the two: callouts.** "Beat it" on the phone becomes a target at the machine and settles back on the phone. That is where "who is the best" actually lives in this design: not on a list, in a series of specific challenges between people who have stood in the same spot.

**Integrity.** Only attempts claimed with the token (QR, NFC, typed code) rank. Find-yourself claims show on the profile as unverified and are excluded from boards. Handles on machine boards are moderated before first display, since the marquee is a public screen.

## brand

**Measured first, then argued.** The panel is 0.39 mm per px. Legibility floors by visual angle: comfortable reading needs about 30 arcminutes of cap height, an event needs about 90. At 4 m that is 35 mm (89 px) and 105 mm (268 px). In a 968 px column with the widest six digits:

| Face | Digit width | Six digits fit at | Cap height | At 4 m |
|---|---|---|---|---|
| Orbitron 900 | 0.834 em | 197 px | 142 px, 55 mm | 48 arcmin |
| Orbitron 900, full "999,999.000" | | 123 px | 89 px, 35 mm | 30 arcmin |
| Saira Extra Condensed 800 | 0.404 em | 406 px | 286 px, 112 mm | 96 arcmin |
| Big Shoulders 900 | 0.515 em | 318 px | 261 px, 102 mm | 88 arcmin |

Orbitron 900 six digits fill the column at 197 px: legible from the queue, but a readout, not an event, and the full-length score with separator and decimals drops to 123 px, right at the comfortable floor. That is the physical reason, not a taste one.

**Replace: the score face.** `--font-score: "Saira Extra Condensed" 800` for digits only, on both surfaces, at 380 px on the machine (102 mm caps, 88 arcminutes). Saira is the right neighbour for Orbitron: flat-sided, technical, from a family built for instrument panels, and its condensed cuts keep the rectangular counters Orbitron is made of. I would say this to the brand owner as: the number is not the brand, the words are; every stadium gives its scoreboard a face built for the job and keeps the club's type for everything around it. Proposed follow-up: commission a ten-glyph custom numeral set with Orbitron's stroke terminals at Saira's proportions, so the score becomes proprietary. Each digit sits in a fixed 0.404 em cell so odometer rolls do not jitter; the thousands gap is 0.12 em, no comma on the machine, locale separators on the phone.

**Replace: `--font-sans`.** Orbitron as the reading face is the one token I would refuse. Its letters are wide, uniform and low in distinction, which is fine for six shouted letters and hopeless for a sentence at 48 px on a machine or 13 pt on a phone. Inter, which the landing page already uses, becomes `--font-sans`; Orbitron stays `--font-display` and is only ever set uppercase, tracked 0.06 em, at 48 px and above on the machine and 14 pt and above on the phone.

**Keep.** The primary red ramp and #eb1110 as the one red; the secondary magenta but with a job (other people's moves: callouts, rivals, the rollover of someone else's record); yellow for records and PBs; green for the saved state only. The warm neutrals for the phone's light theme and secondary text.

**Fix.** Two duplicates in the supplied ramps: neutrals 300 and 400 are both #ccbfbb, primary 700 and 800 are both #8d0a09. Proposed 400 = #c4b5b0 and 800 = #750807. Retire the supportive red #d50000: two reds one step apart is a mistake waiting to happen; error text uses primary 700 on light and primary 300 on dark.

**Extend.** A true black `--machine-bg: #000` for the machine (LED panels reward it and the video zone needs it) and `--ink-900: #0b0a0a` for phone surfaces; a dark opacity scale `--ink-bg-10` to `--ink-bg-70` on rgb(11, 10, 10), because the supplied opacity colours are white-only and useless as overlays on video, which is where every overlay in this product sits; drop the redundant secondary-bg scale. Type scale tokens for the machine (48, 56, 64, 80, 96, 112, 120, 160, 224, 380) and the phone (12, 13, 15, 17, 20, 28, 64). Spacing on 8. Radii: 0 on the machine (the bezel is the frame; rounded cards on a 1.5 m panel look like a website), 14 and 20 and pill on the phone. Motion tokens: `--dur-impact 120ms`, `--dur-land 240ms`, `--dur-travel 600ms`, `--ease-out-expo cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-travel cubic-bezier(0.65, 0, 0.35, 1)`, `--spring-land` stiffness 320 damping 18. Semantic aliases: `--you` red, `--others` magenta, `--record` yellow, `--saved` green.

**Argue against.** Warm greys on black look muddy under LED; on the machine the neutral text is white at 90, 60 and 40 percent, and the warm ramp is reserved for the phone. And against the landing page's habit of decorating: no eyebrow pills, no gradient words, no rounded slabs on the machine; the one editorial moment per surface is the score.

## detail_touches

- The impact is one white frame, two red frames, then black: the panel behaves like a camera flash and a struck object before any number exists.
- Digits settle left to right at 100 ms intervals so the magnitude reads before the exact value, and every cell is a fixed 0.404 em so the odometer never shifts the number's width.
- Red is never the colour of the digits. The digits are white; the rule, the glow and the shake are red. Red means the strike, not the score.
- The score's thousands gap is 0.12 em with no comma on the machine, so "412 908" reads as one number at 4 m; the phone formats by locale.
- Decimals exist only on board rows and the attempt detail, at 60 percent size, because that is the only place a tie can happen.
- Every machine string was measured against the 968 px column in its actual face and size; "WARM-UP" at 160 px and "PASS THE GLOVE" at 96 px both overflowed and were resized or reworded before they reached the design.
- The claim code alphabet drops I, O, S, B, 0, 1, 5 and 8 so nothing can be misread in a condensed face, and it is spaced three and three.
- The dock carries the impact-frame still beside the QR, so in a group nobody has to ask whose QR it is.
- The dock is a separate zone with its own lifetime: a claim landing in the middle of the next player's reveal changes nothing above y 2640.
- The QR sits at 0.78 to 0.94 m off the floor by calculation, with a 4-module quiet zone and black on white, not brand red, because scan reliability beats brand presence at the one moment that pays.
- The live camera is mirrored on screen and unmirrored in the recording, the way people expect a mirror and a video to behave.
- Tier words are five or six letters so all five fit at 160 px; achievements are the only strings allowed to drop to 120 or 112.
- The marquee rolls over live when today's best falls, and the previous holder's phone knows within seconds.
- The set of three is drawn identically on the machine rail and on the reel: the profile is literally the machine's memory.
- No counters of views, likes or comments anywhere on the phone; respect is shown as faces and names.
- The shared clip carries the score, the venue and the date baked in the score face, no logo slab, and the caption link lands on the same App Clip.
- The 30 s go-again window is a fade, never a countdown.
- The machine never shows a real name or an avatar photo, only a moderated handle at 48 px.
- Copy uses words for counts wherever a number is not the score: "two days", "third today", "since May".
- No em dashes or en dashes in any string; sentences end with full stops, even the ones on the machine.

## pushback

**What I would have pushed back on.**
- The unfilled "[IS / IS NOT]" line on touch. I designed for no touch as the base case and would have asked; if touch exists it only ever enlarges the code or replays a set slot, never gates anything.
- Where the panel sits relative to the pad and the floor. The whole vertical zoning is a calculation from the panel's height off the floor; if the bottom edge is above about 1.1 m the QR and the dock move to the top of the panel and the marquee to the bottom. I would have asked for the cabinet drawing before drawing a pixel.
- Orbitron as `--font-sans`. Refused, with the measurements.
- The decimals. Three decimals at up to 999,999 implies nine significant figures from a padded target; if that precision is real it belongs on board rows to break ties, if it is not it should not exist on a player-facing surface at all.
- "Present the score as an event" is written for the player; the person who buys the next credit is standing behind them. I designed the reveal for the queue at 4 m and treat that as the brief's real intent.
- Recording strangers in a mall is not mentioned once. The design adds a visible recording mark, a two-day deletion of unclaimed video, handle-only display, consent for the attract reel and an age gate, and I would want legal to read the claim flow before a machine ships.
- The revenue framing ("three attempts and an install") without the data behind it. I would ask for attempts per session, the share of players whose best is their first punch, and the current install rate, and I would propose the claim rate (claimed attempts over attempts) as the north star, because it is the hinge every other number hangs from.
- Groups. The brief says players come in groups and then designs for one player. The rail, the dock's persistence and pass-the-glove are group-first on purpose.
- A physical GO AGAIN button. A big arcade button beside the pad would move the second-attempt rate more than any pixel; it is a hardware decision I would have raised.

**What I would validate with users.**
- The five tier words, and whether "first one is a warm-up" is true in the data before it ships as copy.
- QR scan success in the real cabinet at 0.8 to 0.9 m with the panel's glare, versus NFC discoverability, and the share of claims that fall to the typed code.
- Claim completion time and drop-off through the App Clip, especially the Sign in with Apple step and the handle screen.
- Whether the queue can read the score and the tier word from 4 m in a lit mall, with a rendered panel, not a monitor.
- Whether people want their face-visible clip public by default (I set it to boards and followers, with "Everyone" as opt-in).
- The 30 s window and the 120 s dock persistence in a real queue.
- Whether the card feed beats the full-screen vertical feed for this content, measured by respect and callouts sent, not by time in app.

**Questions I would have asked.** Does the machine have a network connection reliable enough for a live claim, or does the code need to work offline and sync later (the design supports both, the code is valid regardless)? Is the camera 9:16 and where is it mounted? Can the venue enable a bundle price? Is there any speaker at all, so a strike sound could be added as an enhancement? What does the existing app's claim rate look like today?

## risks

- **The handoff moment is crowded.** In a group of three the scan happens while the next friend is punching. The dock's independence and the still beside the QR are the mitigation; if scan rates are low in the field, the typed code and find-yourself carry the load, and find-yourself deliberately does not rank, which could frustrate honest players.
- **The App Clip is a bet on iOS.** Android gets a web claim page; if the venue mix skews Android the first-thirty-seconds experience is weaker there and install conversion will show it.
- **The brand owner rejects the condensed score face.** Fallback is Orbitron 900 at 197 px for the integer with the tier word carrying the event; the reveal timing still works, the number is half the height.
- **The count-up gets old for regulars.** Cap the arrival at 1.2 s and give armed players a shorter 800 ms variant after their first punch of the day.
- **Percentile tiers can feel unfair.** A quiet machine can label a strong punch "SOLID"; the trailing-month window and a global floor for "BEAST" reduce it, and the words need testing.
- **Public faces.** Default visibility and the attract reel are the biggest legal and reputational exposure; the consent toggle, the two-day purge and handle moderation are the minimum, and a region may need public-off by default.
- **Marquee harassment.** Handles on a public screen invite bad handles; moderation before first display is required, not optional.
- **The dock can confuse.** A previous player's QR under the current player's reveal is unusual; if testing shows people scanning the wrong one, the previous dock collapses at the new strike instead of at the new S5, and the "Earlier punch? Code" line does the rest.
- **Network.** A claim that never lands on a machine with a dead link shows a stale "KEEP IT" forever; the machine must be able to display the code from local state and the server must accept late claims.
- **Panel height.** Every y value assumes a bottom edge at about 0.55 m; a different cabinet moves the dock and the eye band, so the zoning must be a config, not a constant.
- **The feed bet.** Cards instead of full-screen video is a position against what every social app does; if respect and callouts do not move, it is wrong and the vertical feed comes back with the counters still gone.