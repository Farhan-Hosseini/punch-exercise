# Your run: what the glass shows after the replay

## 1. The answer to the client's question

Stop describing the punch you just threw. Point the player at the next one. The single pad sensor produces one reading. The four physics stats are that same reading converted into four units, so they rise and fall with the score and add nothing to it. They are also in units nobody in a Dubai mall uses: kJ, kN, mph and m/s squared. Three of the four ranks are out of reach and read as failure. Four of the experts agreed on the replacement, which answers the three questions a group actually asks after a hit:

- **Who do I pass next, and by how much?** This is the only big number on the screen.
- **Where do I stand among the people I came with?** Shown by height on the column, with no numbers.
- **What one change would make the next hit better?** Shown as a word or two, labelled when the camera inferred it.

Today's crown at this machine replaces the four ranks. Global, country and city standings move to the app, where they work as long-term goals. The screen should be renamed **Your run**. Everything on it serves the run of three and the friends in it. "Your punch" would promise a readout of the punch, and the readout is what we are removing.

## 2. Recommended content, four sections from top to bottom

Numerals appear only in section one, so the page has one set of numbers. Everything else is words, marks and height. Rough bands on the 1080 x 3840 glass:

| Section | Rough band |
|---|---|
| Next to beat | top, 0 to 800 px |
| Crew | the column, 800 to 2400 px |
| One fix | 2400 to 3000 px |
| Today's crown | 3000 to 3840 px, shared with the run code, which stays where it is |

Suggested reading order over the 8 seconds: section one lands first, the crew overtake plays second, then the fix, then the crown.

### Section 1. Next to beat
**Customise label:** Next to beat

**What it shows.** The hero is one number: the gap to the nearest mark above this hit, with the name of whoever owns it. The score sits above it as a small anchor, at the brief's full length with smaller decimals.

- **Middling score (Karim, 412,380.250).** Small anchor "412,380.250". Hero "18,621 to pass Omar". Omar is on 431,000.500. The gap is rounded **up**, so it is never understated.
- **Sara, 999,999.000.** This is the top of the scale, so nothing can pass her. The gap is replaced by a bell mark reading "Bell rung", with the line "Only a tie can catch this". The small anchor still reads "999,999.000".

**How the target is picked:**
1. The friend directly above in this run.
2. Otherwise the player's own best in this run.
3. Otherwise today's top-ten line.
4. Otherwise the next tier edge on the column.

A person always beats a line. A target is never shown if the gap is more than 15% of the score.

If nothing qualifies, the machine sets its own target, labelled "Next: beat this". It is never dressed up as a person.

If the player leads the run without hitting the ceiling, the section flips: "Omar needs 18,621 to pass you".

**Why.** A score is a verdict and a gap is a task. Of all the ideas, the near miss with a name on it is the strongest reason to put in another credit, and all four experts rated it top. The queue reads the gap as the stake for the next hit.

**How it is measured.**
- The gap is arithmetic on scores the machine already stores. No new sensor is needed.
- The run comes from the run code, or from credits paid less than about 90 s apart on the same machine. The run part works offline.
- Tier edges are percentiles of this machine's last 30 days, recalibrated weekly.
- The fallback target is the player's score plus the 40th percentile of this machine's hit-one-to-hit-two improvement for players in the same score band. That makes it roughly a 60% chance to clear.

### Section 2. Crew
**Customise label:** Crew

**What it shows.** Everyone in this run as a mark on the column, placed by their best hit. No scores are printed, because height does the ranking.

- Each mark has a colour tag and a turn letter, or the player's app handle once they scan.
- The leader wears the crown.
- Beside each mark are three slots showing that player's attempts used, one filled per attempt.
- The column's edge is marked with five quiet band names: Warm-up, Solid, Thunder, Monster, Bell. Monster is the sponsor's band.
- A small line names who goes next.

Examples:
- **Sara's run.** Sara sits in the Bell band with the crown and two of three slots filled. Yousef and Mira sit below her. "Next up: Yousef".
- **Karim's run.** Karim sits in Solid, just under Omar's mark, with one of three slots filled. Lina is below him. "Next up: Lina".

**Why.** The group is the real audience, and rank among friends is the only rank that changes what someone does in the next 30 seconds. The empty slots ask for attempts two and three without a button or a numeral. They turn "pay again" into "finish your set", which is exactly the revenue goal of three attempts.

**How it is measured.**
- This is run bookkeeping only. Nothing depends on how accurate the sensor is.
- Identity is by turn order. Telling friends apart by camera is not reliable enough to be the default. A scanned player claims their own hits.
- Band edges are set per machine, because no two pads read alike. Roughly 60% of hits land in Solid or Thunder, and only the top 3% reach Bell.

### Section 3. One fix
**Customise label:** One fix

**What it shows.** One short instruction: the single change most likely to raise the next hit. It comes with one supporting picture and a visible **Camera read** tag whenever the camera inferred it.

- **Karim.** "STEP IN", tagged Camera read, with a stance picture showing his front foot did not move. Under it: "Players who step in hit harder here". That line only appears when this machine's data backs it, and it never carries a percentage on the glass.
- **Sara.** She is already at the top of the scale, so there is no power fix. It becomes "Now your left", tagged Camera read (right hand seen), with "Nobody has a left today" if the board for left-hand hits is empty.

**Why.** Believing the next hit can be better is what sells the next credit. Advice that is concrete and true, such as stepping in or switching hands, can be acted on within a minute. It also gives the smaller friend a way to win that is not about being bigger.

**How it is measured.**
- The brief's hardware is enough. Pose estimation on the replay camera at 60 fps or better reliably reads which hand struck and whether the front foot moved forward. It roughly reads how far the elbow was extended.
- The fix only shows above a confidence threshold. Below it, a generic line from a fixed table appears, such as "Punch through the pad", with no tag.
- The frame is built so hardware upgrades can drop in without a new layout:
  - "Snap or push" from the pad's force trace, if the firmware streams it at 1 kHz or faster.
  - "Where it landed", if four load cells are fitted at the corners of the pad.
  - "Weight shift", if a floor plate is added.

### Section 4. Today's crown
**Customise label:** Today's crown

**What it shows.** The best hit on this machine today: who holds it and, in words, how long they have held it ("since lunch"). Below it is a soft band showing where today's hits cluster, with the player's mark on it. The line "Harder than most today" appears only when that is true, at or above the 60th percentile. A bottom percentile is never shown.

If the crown holder never scanned, the crown reads "Unclaimed. Scan to claim it" next to the run code.

- **Sara.** Her hit takes the crown, so the section changes over to the new holder: "New crown. Your hit plays here today". Her replay leads the idle loop until someone beats it.
- **Karim.** "Crown: Hamad, since lunch". Karim's mark sits inside the crowd band. His score is below the 60th percentile, so the band shows without a line.

**Why.** It replaces four ranks with one reachable, local, public title. It resets every morning, so it is always within reach, and a dethroning is an event the whole room sees. "Unclaimed" and "your hit plays here" are the strongest reasons on the machine to install the app.

**How it is measured.**
- The crown is the maximum of today's scores on this machine, reset at opening.
- The holder comes from the run: their handle if they scanned, otherwise "Unclaimed".
- The time held is bucketed into words: morning, lunch, afternoon, evening.
- The crowd band is today's score distribution on this machine. It needs about 30 hits to settle, so it falls back to the last seven days until then.
- A tie at the ceiling shares the crown.

## 3. Five visual designs per section

No stat cards and no pill labels in any of these. Each design works on the full 1080 px width.

**Next to beat**
1. **Gap slab:** the gap at about 300 px cap height, set left, the name at half size beneath, the score anchor small above.
2. **Two plates:** this hit's plate and the target's plate drawn at true relative height, with the gap figure hung in the empty space between them.
3. **Count down:** on entry the figure runs down from the target's score to the gap and stops, so it reads as what is left.
4. **Name first:** "PASS OMAR" set across the full width, the gap as one smaller line under it. The top-of-scale state swaps in "BELL RUNG".
5. **Tape:** a red measuring tape unrolls upward from the player's mark to the target's, ticked at tier edges, with the gap printed on its end tab.

**Crew**
1. **Column ticks:** a slim column with each friend as a tick at true height, colour tag and turn letter, three slots per tick, crown on the leader.
2. **Stacked plates:** one horizontal plate per player in rank order, plate length set by score, three notches cut into each plate's end.
3. **Impact faces:** each player's own face crop from their impact frame, pinned at their height with the background blurred and a Camera frame tag. The leader's crop gets a gold rim.
4. **Turn strip:** players left to right in turn order as bars filled to their best height, with the next player's bar outlined and "Your go".
5. **Overtake:** the player's tick enters low and climbs past each friend it beat, dimming each passed name, then settles. The crown moves if it was earned.

**One fix**
1. **Two-word order:** "STEP IN" at display size, set left, with the Camera read tag beside it and one supporting line below.
2. **Stance diagram:** two footprints drawn from the pose read, the front one hollow with an arrow showing where it should have gone.
3. **Silhouette loop:** a one-second cut of the player's own replay reduced to a flat silhouette, holding on the frame the fix is about.
4. **Glove pair:** two large gloves, the used one filled and the other outlined, with "Now your left".
5. **Upgrade slot:** the same frame carrying a snap-or-push force spike or a target ring with a landing dot, for cabinets with the extra sensors.

**Today's crown**
1. **Crown line:** a thin gold rule across the full width at the crown's height, with the holder's name and "since lunch" at its end.
2. **Crowd band:** a soft density band of today's hits with the player's mark above it or inside it, and the flattering line only when true.
3. **Takeover:** when a hit takes the crown, the section floods with the crown colour and holds the new holder's impact frame with "Your hit plays here today".
4. **Unclaimed:** an empty crown outline with "Unclaimed. Scan to claim it" beside the run code, which fills in when the holder scans.
5. **Reign ribbon:** a ribbon that grows from the crown for as long as it is held, snaps when the crown is taken, and resets at opening.

## 4. What to cut

- **Energy in kJ:** a punch carries a few hundred joules, so the figure shows a fraction, and it is calculated from the same reading as the score.
- **Force in kN:** a real measurement in a unit nobody can picture. The kg equivalent ("hit like 180 kg") moves to the app share card.
- **Speed in mph:** the wrong unit for the UAE, and a pad sensor cannot measure fist speed at all.
- **Acceleration in m/s squared:** it describes the pad, not the fist, nobody reads the unit, and it tracks the score.
- **Global rank:** a five-figure place tells a first-timer they are nobody. It moves to the app as a long-term goal.
- **Country and city rank:** in the UAE they are nearly the same list, and neither can be won tonight. Both move to the app.
- **This machine's rank as a number:** height on the Crew column and today's crown already say it.
- **The four-rank grid:** four numbers of the same kind make the eye compare them, and none of them changes what the player does next.
- **The replay still:** it repeats the video the Result screen just played. The impact frame moves to the phone and to the crown takeover.
- **The score at hero size again:** it was the event one screen ago. Here it is the small anchor in section one.
- **Percentages on the glass:** they are numerals outside the one numbered block. The words say the same thing.
- **Real-world comparisons like "as hard as a car crash":** they are not true and a venue cannot stand behind them. The kg object belongs on the phone card only, worded "about".
- **Pound for pound, age, gender and weight classes:** they need body data a walk-up cannot give without touch, camera guesses are creepy, and there is a privacy risk under UAE law.
- **Calories:** well under one per punch, so it reads as a joke.
- **Badges, venue against venue, and friends who played here before:** these belong to the app and the idle screen, not to the 8 seconds before the next credit.

## 5. Where the experts disagreed, and the resolution

- **What the hero should be.** Sensor science wanted the one fix, the arcade expert a target line set by the machine, and social and information design the gap to a named person. **Resolution:** the gap to a real mark is the hero, because a person makes a rivalry. The machine's target is kept as the last fallback, so there is always something to beat. The fix gets its own section.
- **How big a gap is still worth showing.** Suggestions were 8%, 15% and 25% of the score. **Resolution:** 15%, with a person preferred over a line, and the machine target covering anything farther away.
- **How much physics survives.** Sensor science kept a kg force line and km/h hand speed. The others cut all of it. **Resolution:** none on the glass, since kg is the score in another unit and would break the single numbered block. Kg goes on the phone share card. Km/h comes back only as a "Fastest hand today" crown if the cabinet gets light gates or a camera at 120 fps or better, and never in mph.
- **How players are identified.** Social wanted face crops, the others colours and names. **Resolution:** colour and turn letter by default, the app handle once scanned. The face crop is one design option, taken from the player's own impact frame, shown only during the live run and never used to identify anyone.
- **Hardware.** Sensor science assumed corner load cells, light gates, a floor plate and a 240 fps camera. The brief promises one sensor and one camera. **Resolution:** design for the brief. The upgrades slot into One fix without a new layout.
- **The replay slot.** The options were a ghost-trail comparison with the last hit, the contact frame, the impact face, or cutting it. **Resolution:** no replay on this screen. The impact frame appears in the crown takeover and on the phone. The ghost trail waits for glove tracking.
- **Percentile wording.** "83 of every 100" or words only. **Resolution:** words only, shown only when true and flattering, to keep numerals in section one.
- **Crew total against the ladder.** The arcade expert worried the ladder makes the smallest friend stop paying. **Resolution:** the ladder carries the screen. The smallest friend still gets reasons to play from the three slots, the other-hand challenge and the fix. A crew total is a candidate for the idle screen.
- **Tier words.** The arcade and social experts wanted a big tier word, and information design did not include one. **Resolution:** the tiers become quiet band names on the Crew column and can serve as the target in Next to beat. They are never a separate hero. The name "Heavy" is dropped because it reads as a boxing weight class.
- **Reaction time and punch type.** Both are good boards, but reaction time changes the ritual (a random GO delay), and telling a hook from a straight is not reliable enough to show. **Resolution:** left out of this screen. Which hand stays, because the camera reads it reliably.