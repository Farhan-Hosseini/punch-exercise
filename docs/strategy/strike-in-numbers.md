# The strike in numbers: what the phone should show for one hit

The phone's Your hit page has a Stats section headed "The strike in numbers" (parts/mpage-hit.html, mpages/hit.css and hit.js). This note answers the user's question: are these numbers good, or do we need better ones? It is research only and changes no page code.

It follows [what-to-show-for-a-punch.md](what-to-show-for-a-punch.md). The glass carries one set of numbers, the gap to the next person, and no physics. The phone is where the fuller numbers live. The kg reading goes to the phone, worded "about". Km/h appears only when the cabinet can really measure it, and mph never does.

## 1. The answer

**Change them.** The four numbers shown today are one pad reading in four units, and nobody in a Dubai mall reads those units. Two of the values are physically impossible. The bars also contradict the score. Replace them with five numbers a walk-up player can picture and repeat, and label each with where it came from:

| # | Number | Unit | Source label | Sara, 999,999.000 | Middling hit, Karim, 412,380.250 |
|---|---|---|---|---|---|
| 1 | Peak force | kg | Measured | about 315 kg, 15 past the bell | about 125 kg |
| 2 | Change on your last hit | ± kg | This run | +20 kg on your last | First hit tonight |
| 3 | Your best | kg, and where | Your history | This one, a new best | about 245 kg, Yas Mall |
| 4 | Most hits here today | kg band | This machine | Well above: most land 100 to 175 kg | In the middle: most land 100 to 175 kg |
| 5 | Hand speed | km/h | Camera estimate | about 31 km/h | about 24 km/h |

Reaction time can be a sixth number, but only in a reaction round (section 5.6). The camera's two reliable reads, which hand and whether the front foot stepped in, sit beside the numbers as words. They are not figures.

The examples assume a pad calibrated so that the bell, 999,999.000, sits at 300 kg of peak force, with the score rising in step with force below it. Real cabinets set this per pad (section 5.1).

## 2. What the section shows today

Five designs (Tiles, Bars, Radar, Gauges, Peak force) all show the same four values for Sara's hit. The bars fill against "this machine's record".

| Shown | Value | Problem |
|---|---|---|
| Energy | 1.9 kJ | About 15 times too high. An Olympic straight punch carries roughly 120 J: 0.5 x 2.9 kg effective mass x (9.14 m/s) squared, using [Walilko, Viano and Bir 2005](https://pubmed.ncbi.nlm.nih.gov/16183766/). It is also the score recomputed, and nobody knows what a joule feels like. |
| Force | 3.1 kN | A plausible value (316 kgf) in a unit nobody pictures. Keep the reading and change the unit to kg. |
| Speed | 24.8 mph | The wrong unit for the UAE. It works out to 40 km/h or 11.1 m/s, faster than the Olympic boxers' average of 9.14 m/s ([Walilko 2005](https://pubmed.ncbi.nlm.nih.gov/16183766/)) and Frank Bruno's 8.9 m/s ([Atha et al. 1985](https://pubmed.ncbi.nlm.nih.gov/3936571/)). A pad sensor cannot measure fist speed at all. |
| Acceleration | 42.6 m/s² | This describes the pad, not the fist. It is 4.3 g, the unit is unreadable, and the value moves with the score. |
| Bars "against this machine's record" | 83 to 89% | Sara's score is the ceiling and her rank chip says #1 at this machine, yet every bar says she fell short of the record. |
| Radar, "Shape of the strike" | four axes | All four axes come from one reading, so every hit draws the same diamond at a different size. The shape carries no information. |

The Replay section's "Contact moment" design shows the same 3.1 kN and should follow whatever unit this section adopts.

## 3. What real products show

### Arcade machines: one score and a record

- **Kalkomat Boxer**, the classic bag machine. It times the bag's swing with light gates ("sending and receiving diodes that measure blade fly speed"). The panel shows a score, the credit count and the top day record, and a siren sounds when the record falls. Modes are Power, Speed, Reflex and a tournament for up to six players. The record can be set from 500 to 999 and prizes pay on 111, 222 up to 999. ([Boxer manual](https://www.betson.com/wp-content/uploads/2023/07/All-Boxer-Manual.pdf), [Comboboxer manual](https://www.kalkomat.com/wp-content/uploads/2023/08/5ede0a7e47d1e_Kalkomat_Manual_Comboboxer_rev3.02.pdf)) There are no physics units anywhere.
- **Japanese punching machines** such as Taito's Sonic Blast Heroes show the result in **kg**. A Japanese guide places the average adult man at 120 to 179 kg, 200 kg as very strong, and a professional boxer's record at 340 kg. It also warns that machines differ and the bands are only a guide ([punchingmachine.net](https://punchingmachine.net/mpunchingpoweraverage/)). A generation of players has learned to say "I hit 150 kg".
- **Vendor score charts** for 0 to 999 machines claim a median near 505, 680 at the 75th percentile and 790 at the 90th, with 900 to 999 as the cap range ([arcadegamesale](https://arcadegamesale.com/punching-machine-scores-average-vs-elite/)). This is vendor data and unverified, but it shows machines are tuned so a typical hit lands mid scale.

### Wearable punch trackers: speed and count, with force hedged

- **Hykso** measures peak velocity "during the motion", not at impact, along with count and punch type. It says plainly that its Intensity Score is not force: "not the same as the energy transferred" ([Hykso science](https://shop.hykso.com/pages/the-science-behind-hykso)).
- **FightCamp** records type, timestamp, "max speed reached during the punch motion" and an Output figure "correlated to the total power", sampled at 1,200 points a second ([FightCamp technology](https://joinfightcamp.com/work/technology)). One reviewer's 7.2 mph average, set against pros at "over 30 mph", made him joke about how weak he was ([Gizmodo](https://gizmodo.com/this-gadget-told-me-how-wimpy-my-punches-are-please-do-1826083620)). Comparing a beginner with a professional deflates the beginner.
- **Corner** shows speed, power, work rate, punch types, left against right, personal bests, friends and live leaderboards ([Corner](https://trainwithcorner.com/track-your-stats)). It also scores 1 to 10 KO points a punch, with 10 pitched as a heavyweight knockout ([Wareable review](https://www.wareable.com/wearable-tech/corner-boxing-tracker-wearable-review-6865)). A reviewer advises reading its power "as personal trends, not exact lab results" ([BoxerCue](https://boxercue.com/corner-punch-tracker-review/)).
- **StrikeTec** reports speed, power, count and pace for each punch type, with personal bests to "strive to surpass" ([StrikeTec](https://striketec.com/understanding-your-performance-the-power-of-striketec-sensors/)).
- **Everlast PIQ** reports speed, G-force at impact and retraction time ([Gadgets and Wearables](https://gadgetsandwearables.com/2017/05/08/piq-boxing-review/)). **ROOQ** reports maximum and average speed in km/h, with force framed as change of momentum ([ROOQ](https://rooq.de/en/lp/punch-speed)). **PunchLab** straps the phone to the bag and estimates force in newtons from its accelerometer, and reviewers treat that as an estimate ([PunchLab](https://punchlab.net/)).

### Smart pads, the closest thing to our cabinet

- **PowerKube** is a striking pad. It reports impact power in watts, kinetic energy, a proprietary compound index ("the franklin"), reaction time measured from an on-screen and audible trigger, and endurance ([PowerKube science](https://www.powerkube.tech/pages/the-science)). In an independent drop test, its repeat error was 0.8 to 3.6%, but its error against the true value was 9.4 to 12.5% ([reliability study](https://pmc.ncbi.nlm.nih.gov/articles/PMC9784821/)). A good commercial pad is about 10% out in absolute terms.

### Venue and fitness apps: how the numbers are made to mean something

- **Toptracer** runs camera tracking at driving ranges, another walk-up venue with a group and a bay. It shows ball speed, carry, height, hang time, launch angle and curve. It keeps your history by club and ranks you on local and global boards ([parameters](https://help.toptracer.com/article/65-understanding-shot-parameters-in-toptracer), [Toptracer Range](https://toptracer.com/range/)).
- **Strava** shows percentage rankings ("top 50%. Or 17%") and filters for friends, age and weight. It pitches them as a way to take on "your friends or your old self" ([Strava](https://stories.strava.com/articles/segment-leaderboard-percentage-rankings-show-exactly-how-you-stack-up)).

### Patterns

1. Walk-up machines show one number and a record. None of them shows a physics panel.
2. The physical numbers people actually repeat are **force in kg** (Japanese arcades) and **speed in km/h** (every wearable).
3. Honest products say what they cannot measure. Wrist sensors hedge on force, and reviewers discount "power" figures.
4. For non-experts, meaning comes from **your last hit, your best, and people like you on the same equipment**. It does not come from professionals or objects.
5. Precision is modest. A good pad is about 10% out, and an untrained person's punches vary a lot from hit to hit (section 4). Physical numbers must be rounded.

## 4. What sports science says a punch is

Force is converted at 1 kgf = 9.80665 N ([kilogram-force](https://en.wikipedia.org/wiki/Kilogram-force)) and speed at 1 m/s = 3.6 km/h.

| Study | Who, and on what | Peak force | Speed | Time |
|---|---|---|---|---|
| [Atha et al. 1985](https://pubmed.ncbi.nlm.nih.gov/3936571/) | Frank Bruno, padded pendulum | 4,096 N, about 418 kg | 8.9 m/s, 32 km/h | Peak within 14 ms of contact; the fist covered 0.49 m in 0.1 s |
| [Walilko et al. 2005](https://pubmed.ncbi.nlm.nih.gov/16183766/) | Seven Olympic boxers, dummy face | 3,427 N, about 350 kg | 9.14 m/s, 33 km/h | Effective mass 2.9 kg |
| [Smith et al. 2000](https://pubmed.ncbi.nlm.nih.gov/10902679/) | Rear hand, boxing dynamometer | Elite 4,800 N (489 kg), intermediate 3,722 N (380 kg), novice 2,381 N (243 kg) | | |
| [PLOS One 2023](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0289791) | Ten elite amateurs, wall force plate | Cross 2,425 N (247 kg), rear hook 2,624 N (268 kg), jab 1,645 N (168 kg) | | Hit to hit variation 3 to 10% |
| [Frontiers 2022](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2022.1015154/full) | Lead straight, elite against junior | 1,508 N (154 kg) against 1,035 N (106 kg) | 7.16 against 6.32 m/s (26 against 23 km/h) | Time to peak about 17 ms for both; rate of rise 88.6 against 60.5 N per ms |
| [Menzel and Potthast 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8659887/) | In-glove sensor, experienced against non-experienced | Cross 3,149 N (321 kg) against 2,936 N (299 kg) | Cross 7.88 against 7.6 m/s (28 against 27 km/h), not significantly different | |
| [Lenetsky et al. 2018](https://pubmed.ncbi.nlm.nih.gov/29420389/) | Untrained participants and experienced boxers | | | Untrained punches vary more between sessions, mostly "moderate" variability (CV over 10%) |

What this means for the page:

- **Force separates people and speed barely does.** Novices in the Menzel study threw about as fast as experienced boxers but hit with less force. Walilko found that heavier boxers hit harder "due primarily to a higher effective mass", which is body behind the fist rather than speed. Force is the hero number and speed is a second, friendlier axis.
- **The same punch reads differently on different targets.** A jab on a wall plate reads about 168 kg, and a cross through an in-glove sensor about 300 kg. A kg figure means something only against hits on **the same pad**, so the anchor must be this machine's own hits and never an Olympic figure.
- **The whole impact is over in about 14 to 17 ms.** A pad has to sample at 1 kHz or faster to see its shape. Rise time is nearly identical across levels, and the rate of rise is roughly peak force divided by that time. A "snap" figure would therefore mostly echo force (section 6).
- **Hit to hit noise of 5 to 10% is normal**, even among elite boxers. A change smaller than that is a wobble, not progress.

## 5. The recommended numbers

The score keeps its full format through PunchFormat. It is a game number, and three decimals suit it. The physical numbers are rounded to what the hardware can honestly claim, and each carries a small source tag in the same place every time: **Measured**, **This machine**, **Camera estimate**.

### 5.1 Peak force, in kg

- **Shows:** "about 315 kg" at hero size. A helper line gives the honest meaning of kg-force: "For an instant, the pad took the push of 315 kg."
- **Measured by:** the pad sensor. Each cabinet is calibrated at install and monthly with a drop test, a known mass from a known height, which is how PowerKube was validated ([study](https://pmc.ncbi.nlm.nih.gov/articles/PMC9784821/)). Newtons are divided by 9.80665 and rounded to the nearest 5 kg, always worded "about", because a good pad is about 10% out.
- **Relation to the score:** it is the same reading in a unit people can picture, so the page says so and does not present it as a separate achievement. The score stops at the bell, but the sensor reads on past it. Above the bell, kg is the one number that tells two bell ringers apart ("15 kg past the bell"). The boards still treat the bell as a tie, as the glass does.
- **Sara:** about 315 kg, 15 kg past the bell. This is today's 3.1 kN, restated.
- **Karim:** about 125 kg (412,380.250 of 999,999 x 300 kg = 123.7 kg).
- **Why it matters:** kg is the unit the UAE uses and the one arcades have taught people to boast in. "I hit 315 kg" survives a retelling, and "3.1 kN" does not.

### 5.2 Change on your last hit, in kg

- **Shows:** "+20 kg on your last", or "About the same as your last" when the change is under 5% of the hit. On a first hit it shows "First hit tonight".
- **Measured by:** arithmetic on this player's earlier hit in the run (run code, or credits less than about 90 s apart, as on the glass). It works offline.
- **Sara:** +20 kg on your last. Her first hit read about 295 kg, a score of 983,332.
- **Karim:** "First hit tonight". After a second hit of about 135 kg it would read "+10 kg on your last".
- **Why it matters:** "Am I getting better?" is the question every tracker answers first (StrikeTec, Corner, Strava's "your old self"). A rise gives a reason to go again, and a threshold stops normal wobble from reading as decline.

### 5.3 Your best, in kg

- **Shows:** "Your best: about 245 kg, Yas Mall", or "This one, a new best" with the page's single moment of celebration.
- **Measured by:** the player's history in the app, from their profile best. Only scanned hits count.
- **Sara:** This one, a new best.
- **Karim:** about 245 kg, Yas Mall (his profile best of 812,940).
- **Why it matters:** a personal best is the one comparison that is always fair, because it is the same person, and every tracker leads with it. Here it doubles as the reason to install and scan: without the app, no best is kept.

### 5.4 Most hits here today, as a kg band

- **Shows:** "Most hits here today: 100 to 175 kg". This is the middle half of today's hits, from the 25th to the 75th percentile. One neutral word places the player: **Well above**, **In the middle** or **On the way up**. It never says "below" and never gives a bottom percentile.
- **Measured by:** this machine's score distribution for today, converted to kg. It needs about 30 hits to settle and falls back to the last seven days until then, the same rule as the glass's crowd band.
- **Sara:** Well above.
- **Karim:** In the middle.
- **Why it matters:** a bare kg figure means nothing without an anchor. The only fair anchor is people on **this pad** today, not an Olympian (the Gizmodo lesson) and not a car crash (cut on the glass as untrue). It gives the number a scale without handing anyone a rank, which the Ranks section already does.

### 5.5 Hand speed, in km/h

- **Shows:** "about 31 km/h" in whole numbers with the **Camera estimate** tag, and a thinner treatment than the measured numbers. Never mph.
- **Measured by:** pose tracking of the wrist in the replay footage, over the last frames before contact, scaled by the fixed distance to the pad plane that is measured at install. It is shown only when three conditions hold:
  - the camera runs at **120 fps or better**. At 60 fps a fist at 8.6 m/s moves 14 cm between frames, and the whole punch lasts about 6 frames ([Atha](https://pubmed.ncbi.nlm.nih.gov/3936571/)).
  - the camera sees the arm **from an angle, not head on**. A fist coming straight at the lens changes size more than position, and 2D tracking is weakest there. The markerless system that matched lab capture within 0.17 m/s used ten synchronised cameras ([Frontiers 2022](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2022.939980/full)). One camera is a rougher tool.
  - pose confidence clears a threshold. Below it, the row is left out rather than guessed.
- **Sara:** about 31 km/h (8.6 m/s, just under the Olympic average of 33 km/h).
- **Karim:** about 24 km/h (6.7 m/s, novice territory in the studies above).
- **Why it matters:** everyone knows km/h from the road, and it is the number every wearable shows. Speed barely separates novices from boxers (Menzel), so it is the axis where a smaller friend can win. This is the phone side of the glass's "Fastest hand today" crown, which the glass doc allows once the cabinet has light gates or a camera at 120 fps or better.
- **The camera never estimates force.** A single-camera model at 90 fps was off by about 85 N per person even when trained on that person, and by about 200 N across people ([IOP 2025](https://iopscience.iop.org/article/10.1088/2631-8695/ade2b8)).

### 5.6 Reaction time, in seconds (reaction rounds only)

- **Shows:** "GO to contact: 0.38 s", written in seconds for people who do not read ms. It appears only if the cabinet offers a reaction round, as Kalkomat's Reflex mode and PowerKube's trigger do.
- **Measured by:** the time from a random GO light to the pad's first contact. This includes arm travel, so it reads longer than a click test (Human Benchmark's median is 273 ms for a click alone, [statistics](https://humanbenchmark.com/tests/reactiontime/statistics)).
- **Sara and Karim:** not shown, because their runs were standard rounds.
- **Why it matters:** it is a different contest that a smaller player can win. The glass doc leaves it out because a random GO changes the ritual, so it stays conditional here.

### 5.7 Beside the numbers, as words

**Right hand** and **Stepped in**, each tagged Camera read. These come from the same pose read as the glass's One fix, and they explain the number next to them ("Stepped in, +20 kg").

### 5.8 States every design must handle

- **Past the bell:** kg continues beyond the scale, and the bell mark stays visible.
- **No speed:** the camera does not qualify, so the section has four rows and no empty slot.
- **First hit tonight:** there is no change row.
- **Not scanned:** there is no best row. A line reads "Scan to keep your best".
- **Band not settled:** the band uses the seven-day figure, captioned "this week".

## 6. What to cut

- **Energy in kJ:** the value is about 15 times too high, it echoes the score, and nobody knows what a joule feels like.
- **Force in kN:** keep the reading and show it in kg.
- **Speed in mph:** the wrong unit and an impossible value, and a pad cannot see the fist.
- **Acceleration in m/s²:** it describes the pad and moves with the score.
- **The radar:** four axes from one reading draw the same shape every time.
- **Bars against the machine record:** they contradict a ceiling hit. Use the bell and today's band instead.
- **Watts, joules or a proprietary index (PowerKube style):** each is force again under another name. PowerKube cites a study that found its power measure "98.2% similar to force" ([PowerKube science](https://www.powerkube.tech/pages/the-science)).
- **G-force:** it measures the pad or the wrist, not the punch, and reads as jargon.
- **Snap or rate of force development:** time to peak barely differs between levels (17.3 against 17.1 ms, [Frontiers 2022](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2022.1015154/full)), so the rate of rise mostly tracks peak force. Revisit only if this machine's 1 kHz traces show it separating players independently of force.
- **Effective mass ("body behind it"):** it needs pad impulse divided by camera speed, stacking two errors, and a second kg figure would be confused with force.
- **Force estimated by camera:** 85 to 200 N out (section 5.5).
- **Comparisons with professionals or objects on the page:** they deflate beginners, and a venue cannot stand behind them. An "about" kg object stays on the share card only, as the glass doc says.
- **Percentiles and ranks:** the Ranks section on the same page already has a Percentile design. Here the band carries position without a rank.
- **Calories:** well under one a punch.
- **Punch type:** there is one strike, a full-force hit, and a single camera cannot tell a hook from a straight reliably.

## 7. Five visual designs for the section

These replace today's five. Each is a different composition, not a grid of identical stat cards. Each uses the source tags, handles the states in 5.8 and works in all four looks through tokens. Reduced motion shows the settled state.

1. **Kilo line.** "about 315 kg" is set large and left aligned. Under it runs one horizontal scale from zero to the bell. The middle half of today's hits sits on it as a soft band, with small ticks for your last hit and your best. Sara's bar runs off the end past the bell mark, and "15 past the bell" hangs on the overflow. Speed follows as one thinner line with its Camera estimate tag.
2. **Plate stack.** A gym weight stack drawn in 25 kg plates. Lit plates count the force, and plates added since your last hit light in the accent. Plates past the bell sit above the frame's top bar. The helper line, "the push of 315 kg", reads naturally beside a stack, and it is the one metaphor that is literally true of kg-force.
3. **Lab slip.** A typographic ledger in the register of a lab printout. Each row has the name on the left, the value on the right and the source tag in a narrow column. The tags do the talking: Measured, This machine, Camera estimate. Nothing is decorated, and the honesty is the design. A missing row simply isn't printed.
4. **Hard and fast.** A small plot with km/h across and kg up. Today's hits at this machine appear as faint dots, the player's hit as the red dot, and their last hit as a hollow ring with an arrow to the new one. It shows the two axes honestly, and a fast but light hitter can see where they win. It appears only when speed qualifies, and falls back to Kilo line.
5. **Your line.** The player's own hits in kg at this machine, visits and runs left to right. The best is a thin gold rule and the new hit is the last, largest point, with "+20 kg" printed on the final segment. This is the trend every tracker keeps (Corner, Toptracer's history). For a first-timer the line is a single point, with "Scan to keep your best" where the history would be.

An alternative to any of these: a **Contact frame**, the replay still at contact with kg and km/h pinned where the fist meets the pad. It pairs with the Replay section's Contact moment design, which should switch from kN to kg in the same pass.

## 8. For the page builders

- Drive the section from one data object per hit, not from hard-coded values: `{ kg, kgLast, kgBest, bestWhere, bellKg, bandLo, bandHi, bandSettled, kmh, kmhOk, hand, stepped }`. Here `kmh` is null whenever `kmhOk` is false. Sara: `{ kg: 315, kgLast: 295, kgBest: 315, bestWhere: 'Dubai Mall, Level 2', bellKg: 300, bandLo: 100, bandHi: 175, bandSettled: true, kmh: 31, kmhOk: true, hand: 'right', stepped: true }`.
- Round in one place: kg to 5, km/h to 1, and a change under 5% reads "About the same".
- The Replay section's Contact moment reads "3.1 kN". It should read "about 315 kg".

## 9. To validate with users

- Whether "kg" reads as strength rather than body weight, and whether the helper line ("the push of 315 kg") fixes that if it does not.
- Whether a visible Camera estimate tag makes people trust the page more or the number less.
- Whether the band words (Well above, In the middle, On the way up) feel fair to a smaller friend in the group.
- Whether 300 kg is the right bell for a mall pad. Set it from the first month of real hits so that only the top 3% reach it, as the glass doc plans.
