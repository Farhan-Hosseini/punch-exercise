export const meta = {
  name: 'strike-figma-build',
  description: 'Build the Figma file from the final spec: machine and phone kits, every frame, brand and flow boards, then lens-based critique and fixes',
  phases: [
    { title: 'Kits', detail: 'machine kit and core frames, phone kit and claim flow, brand board, flow page' },
    { title: 'Frames', detail: 'remaining machine frames and phone screens from the kits' },
    { title: 'Critique', detail: 'four critics screenshot and inspect the file' },
    { title: 'Fix', detail: 'apply confirmed findings per page' },
  ],
}

const BRIEF = String.raw`C:\Claude Database\punch-exercise\docs\BUILD-BRIEF.md`
const SPEC = String.raw`C:\Claude Database\punch-exercise\docs\strategy\06-spec-v2.md`
const AUDIT = String.raw`C:\Claude Database\punch-exercise\docs\strategy\00-interrogation.md`

const COMMON = `You are a senior product designer building part of a design exercise file directly in Figma through the Figma MCP tools (load them with ToolSearch: "select:mcp__8bb2429e-ce99-4151-a843-154d5883e10a__use_figma,mcp__8bb2429e-ce99-4151-a843-154d5883e10a__get_screenshot,mcp__8bb2429e-ce99-4151-a843-154d5883e10a__get_metadata,mcp__8bb2429e-ce99-4151-a843-154d5883e10a__get_figma_skill").
First read the build brief: ${BRIEF}. It is binding and overrides the spec where they differ.
Then read the spec sections your task names in ${SPEC}. Use the Read tool with offset and limit to read the parts you need; the file is about 1,400 lines (section 2 starts near line 56, section 4 near 220, section 5 machine states near 275, handoff section 7 near 696, motion section 6 near 791, phone section 8 near 873, brand section 10 near 1091, checklist 11 near 1119, copy bank 13 near 1206).
Other agents are working in the same Figma file right now. Touch only the nodes you create and the nodes your task names.
The verification loop in the brief is mandatory: build, screenshot, download, LOOK with Read, fix, re-screenshot. Three or more cycles per frame. Close-ups of dense zones are required.
No em dashes or en dashes anywhere. No invented copy.`

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'What was built, in a few sentences' },
    nodes: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, id: { type: 'string' } }, required: ['name', 'id'] } },
    components: { type: 'string', description: 'Markdown list of component and component set ids with how to use them (variant property names, child names that take overrides)' },
    deviations: { type: 'string', description: 'Every spec rule not met, every copy rewrite, every judgement call' },
    screenshots: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'nodes', 'components', 'deviations', 'screenshots'],
}

const fmtReport = (label, r) => r ? `## ${label}\n${r.summary}\n\nNodes:\n${r.nodes.map(n => `- ${n.name}: ${n.id}`).join('\n')}\n\nComponents:\n${r.components}\n\nDeviations:\n${r.deviations}` : `## ${label}\n(no report, the agent failed; inspect the file yourself)`

phase('Kits')

const kitP = agent(`${COMMON}

YOUR TASK: the machine kit and the three core machine frames.
Spec sections: 2.3 fixed zones, 3.3 machine type scale, 4.1 palette, 4.2 plate states, 5.0 numbers, M-01 ATTRACT, M-02 ARMED, M-06 RESULT (hero), rail rendering, run rules, 7.1 QR size and position, and the checklist 11.

1. Build the whole "Machine kit" described in the brief (frame named Machine kit at x -4200 y 0 on the page "Machine 1080 x 3840"): the text styles, Score / Integer 344, Score / Decimals 120, the Plate component set with every variant, QR / Run code, Run still with its Edge variants, Machine / Ground, Z2 / Tab, Z4 / Payment line. Give every component a description. Lay the kit out legibly with small Inter labels.
2. Solve baseline alignment once: measure absoluteRenderBounds for Saira ExtraCondensed Black 344 digits, Orbitron Black at 64/72/104/160, Inter Bold 48 and 40, and write the offsets into the component descriptions so other agents can reuse them.
3. Build these frames at the brief's positions with the brief's frame labels and section heading "Core flow":
   - M-01 Attract (x 1480 y 0): today's best 471,220 in the crown with plate TODAY'S BEST and decimals .862, bell edge, the attract clip loop in Z2 using attract_karim_3x4, the Z3 headline HIT IT / TO THE TOP and "One credit. One hit.", Z4 payment line "Pay at the reader to play." with arrow and the recording notice, rail with today tick at y 1384.
   - M-02 Armed, first hit of a run (x 2960 y 0): ghost cells 000,000 at 8%, empty plate, live camera live_sara_3x4 with the YOU'RE ON CAMERA tab, HIT IT prompt on the scrim, Z3 and Z4 empty, rail track and today tick.
   - M-06 Result, hero run of two (x 7400 y 0): exactly the M-06 table. Integer 402,176, plate RUN LEADER with .240, replay replay_sara_3x4 with the red progress line and the white contact tick, Z3 run block with KEEP YOUR HITS, the QR tile at x 104 y 1880, stills Omar then Sara (Sara's with the red Current hit edge; Omar's none because Sara is the run top, Sara's top-of-run white edge is superseded by the red current edge: follow the spec rule that the current hit has a red top edge and the run top a white one, and when they are the same hit use red), copy column lines, code KTR BXM with its baseline level with the tile bottom, Z4 WHO TOPS / THAT? with the payment line "Pay at the reader to take a turn." and the recording notice, rail red from 3720 up to the notch at 1744, the friend's tick at 2180, today tick at 1384.
4. Verify every string's width against its column in Figma; rewrite overflowing strings, never shrink.
5. Return the component ids and exactly how other agents should instance and override them (child names, variant names, baseline offsets).`, { label: 'kit:machine+core', phase: 'Kits', schema: REPORT_SCHEMA })

const phoneKitP = agent(`${COMMON}

YOUR TASK: the phone kit and the claim flow screens.
Spec sections: 3.4 mobile type ramp, 4.1 palette, 7.1 to 7.5 handoff, 8 Phone platform, IA and what changed, P-00, P-01, P-02 (all of it including states and the keep for a friend sheet), and copy bank 13 phone claim flow.

1. Build the "Phone kit" (brief) at x -3000 y 1200 on the page "Phone 393 x 852": Phone/ text styles, buttons, phone plate, phone score cell rows, tab bar, avatar, faces stack, scrims. Reuse the existing iOS status bar 8:28 and home indicator 8:33 as instances.
2. Build, at the brief's positions with labels and the section heading "Claim flow":
   - P-00 App Clip card: the system sheet over a dimmed camera view of the cabinet glass. Draw the camera view yourself as a dark, slightly blurred impression of the machine's run block (a grey QR tile shape and a red plate strip), not a photo. The card: header image area 1800 x 1200 ratio drawn as the red plate with DUBAI MALL, LEVEL 2 in Orbitron Black, title "Your run at Dubai Mall", subtitle "Watch it and keep your hit", Open button. Follow iOS App Clip card anatomy (sheet with rounded top corners, close button, app name line).
   - P-01 Run claim: two tiles in run order, Omar (blur_omar) then Sara (blur_sara), scores in Saira ExtraCondensed Black 32 with the bottom scrim, per the spec layout.
   - P-02 Your hit, before keep: replay p02_sara_3x4 at y 0 to 524 with a LAYER_BLUR on everyone except the striker is not possible on a flat photo, so show the replay unblurred only after keep; before keep apply a light LAYER_BLUR radius 12 to the replay image and state that in the frame label. Integer 402,176 in Saira 128 with cells 51 and comma 31, plate RUN LEADER with .240, place and time, This is my hit, Keep it for a friend, Just watching.
   - P-02 Kept: same frame after keep (replay unblurred), Kept., Share with my group, helper text, Save the video, and the SKOverlay Get PunchApp banner at the bottom (draw an iOS app store overlay: app icon, PunchApp, Get button).
   - P-02 Keep for a friend sheet: the sheet over a dimmed P-02.
3. Then build the states row (y 2400): P-02 Kept by someone else, and P-02 Code run out.
4. Every screen: iOS safe areas (top 59, bottom 34), status bar and home indicator instances, x 20 margins, one left edge.
5. Return the kit component ids and how to use them.`, { label: 'kit:phone+claim', phase: 'Kits', schema: REPORT_SCHEMA })

const brandP = agent(`${COMMON}

YOUR TASK: the brand pages. Page "Brand and tokens". Read spec sections 3 (type), 4 (colour and surfaces), 10 (brand changes), and read the token audit ${AUDIT} section 2. The supplied-token audit board 4:2 already exists at x 0 y 0 (2600 x 3420, fill #FAF9F9, Inter headings 72 Semi Bold, body 30 Regular #685E5B, 120 px padding). Match its visual language exactly.

1. Create a board "Board / What I changed" at x 2800 y 0, width 2600, same style. Content, as an editorial board not a grid of identical cards:
   - A short intro line.
   - Colour: the proposed palette as swatches with a role name and one sentence each (ink-950, ink-900, primary-500 as the strike, primary-300 small red text, primary-800 changed, neutrals-400 changed, secondary-500 one job, green phone only, yellow faults only, deleted supportive reds shown struck through, overlay-white role steps 08 16 24 40 64 70 85 over ink-950, scrims, plate-edge-rest, plate-edge-hit, bell-edge, qr-ink on qr-ground).
   - Type: three roles side by side at real proportions: Saira ExtraCondensed Black "402,176" in fixed cells, Orbitron Black "RUN LEADER", Inter Bold sentence "Pay at the reader to take a turn." Beside them the measured argument: Orbitron six digits reach 174 px cap 49 mm in the 912 px measure; Saira reaches 344 px cap 92.6 mm, 1.9x. Draw both settings to scale inside a 912 px measure box so the difference is visible, not just stated.
   - Machine type scale by distance (spec 3.3 and the legibility table in 2.3) as a compact specimen: each size set at its real px size with its role and the arcminutes at 3 m.
   - Motion tokens as a small table (gravity 12,557 px/s², launch max(400 ms, reading + 17 ms), mark cost 0.8, hit-stop 50 ms, hang 240 ms, stamp 160 ms, stillness 600 ms, settle 320 ms stagger 80 ms, plate spring 900/28/1).
   - Geometry tokens: MOUNT_TOP, PAD_SIDE, READER_Y, measure, rail.
2. Create a Figma variable collection "Proposed tokens" with modes Machine and Phone where sizes differ: colour variables for every palette token (with scopes set), number variables for the type scale and motion tokens (scopes set to the right property or ALL_SCOPES is forbidden; use FONT_SIZE, GAP, etc. or leave numbers unscoped with an empty scopes array only if no scope fits). Do not modify the existing "Supplied tokens" collection.
3. Verify with screenshots and close-ups as the brief requires. Return ids.`, { label: 'brand:changes', phase: 'Kits', schema: REPORT_SCHEMA })

const flowP = agent(`${COMMON}

YOUR TASK: the page "Flow". Read spec sections 1, 2.1, 2.2, all of section 5 (states, exits, queued credit rule, run rules), 7 (handoff), and section 8 P-00 to P-02.
Build on the Flow page, in the same board style as the brand page (boards fill #FAF9F9 on the #E4DFDC canvas, Inter headings, 120 px padding, ink #221E1D, secondary #685E5B), three boards laid left to right starting at x 0 y 0:
1. "Board / Machine state diagram": every machine state (M-01, M-02, M-02q, M-03, M-04, M-05, M-06, M-07, M-08, M-09, F-01, F-02, F-03, F-04, F-05) as a node with its name, and every exit as a labelled arrow (timer values, credit, strike, reading, keep confirmed, run end). Draw arrows as connector-like lines with arrowheads made from vectors (design files have no connectors). Lay it out as a readable flow with the reveal path as the spine, not a spaghetti ball. Include the queued-credit rule and the impact-to-Armed timings (house record about 2,983 ms, hero 2,852 ms, plain solo 2,724 ms) as a small annotation.
2. "Board / A run, from the first credit to the phone": a horizontal timeline for a group of friends: first credit, hit 1 (Omar), the code appears, hit 2 (Sara) during which the code stays put, a friend scans from the queue decal and watches blurred, Sara taps This is my hit, the glass acknowledges Kept on a phone and her still fades, run ends 60 s after the last landing, code dead 10 min after, unkept replays deleted 60 min after sync. Show the glass side and the phone side as two lanes. Use small, simplified thumbnails drawn with shapes, not screenshots.
3. "Board / Viewing geometry": a side elevation to scale (for example 1 m = 400 px): floor, the 1.5 m panel from 0.5 to 2.0 m with the zones Z0 to Z6 marked at their floor heights, the pad on the right, a 1.75 m player at 0.6 m and at 1.5 m, the queue decal at 2.5 to 3.5 m and 30 to 40 degrees off axis (show it in a small plan view inset), eye range 1.45 to 1.70 m and head range 1.60 to 1.90 m, and the sightline over a player's head. Draw people as simple silhouettes built from shapes. Label the key angles from spec 2.2.
Verify with screenshots and close-ups. Return ids.`, { label: 'flow:boards', phase: 'Kits', schema: REPORT_SCHEMA })

phase('Frames')

const machineFramesP = kitP.then(kit => {
  const kitMd = fmtReport('Machine kit report', kit)
  const mk = (label, task) => agent(`${COMMON}

The machine kit and the core frames M-01, M-02 and M-06 already exist. Here is the kit agent's report; use its components as instances and follow its baseline offsets:
${kitMd}

Open M-06 Result hero first (get_screenshot it and look) and match its construction exactly: same layer structure, same baselines, same edges. Consistency across frames is the point.

YOUR TASK: ${task}`, { label, phase: 'Frames', schema: REPORT_SCHEMA })
  return parallel([
    () => mk('frames:machine-reveal', `the reveal and acknowledgement frames on the page "Machine 1080 x 3840" at the brief's positions, with labels.
Spec sections: M-03, M-04, M-05, M-06p, M-07, section 6 motion table (for what is on screen at each instant), 7.1.
- M-03 Charge at apex (x 4440 y 0): the instant 120 ms after the friend's run line broke: charge field #EB1110 from the apex y 1744 down to 3840 behind all content with its 28 px white apex edge; Z2 and Z4 absent (alpha 0); Z3 run block unchanged at full opacity (with only Omar's still, since Sara's still arrives at settle); today's line at y 1384 (6 px white 24%, TODAY label Orbitron Bold 40 at x 104 sitting on it); the broken friend's line as two halves falling outward and rotated about 6 degrees below y 2180; ghost cells brightening (about 12%); empty plate with bell edge; rail filled red to the edge with the notch; base strip #EB1110 is hidden under the charge.
- M-04 Landing frame (x 5920 y 0): the landing instant: integer squashed (scaleY 0.88, scaleX 1.05 from the baseline) is hard to show statically, so draw the frame 33 ms after landing with the squash as a transform on the integer group and note it in the label; plate top edge flared to 12 px white; decimals .240 cut in at 64%; no label yet; charge still held at apex; today's line held; Z2 and Z4 absent.
- M-06p Plain solo hit (x 8880 y 0): 262,400.118, notch at y 2472, plain plate no label, one still (Omar is not in this run; use still_lina as the solo striker), GO / AGAIN with "Pay at the reader to go again.", replay using card_lina cropped by FILL.
- M-07 All kept (x 10360 y 0): the hero run after both hits are kept: tile solid #D9D9D9 with KEPT centred (Orbitron Black 104 #000), copy lines "Every hit" / "is kept." and "Code used up.", both stills at white 16%, the rest of M-06 as it was.
Verify with close-ups of the crown, plate, Z3 block and rail on every frame.`),
    () => mk('frames:machine-variants', `the variant frames on the page "Machine 1080 x 3840", row "Variants and faults" at y 4600, with the section heading and labels.
Spec sections: M-02q, M-06 variants (M-06t, M-06r, M-06L), M-06k (run of four, two kept: stills Omar, Sara, Lina, Yusuf; Omar and Sara kept at 16%; the current hit is Yusuf), target rules table, plate states 4.2, rail rendering.
- M-02q Armed after a queued credit (x 0): Z2 plays the previous hit's slow segment (replay_sara_3x4) under the HIT IT scrim with the SLOW MOTION tab; Z3 run block live with both stills; Z4 empty; ghost cells.
- M-06t Hit the top (x 1480): a hit of 655,300.000 (choose decimals .000 is wrong, use .417): plate #EB1110 with HIT THE TOP, both plate edges flared, rail red to the bell edge, target rule 1 WHO TOPS / THAT?.
- M-06r House record (x 2960): crown ground #EB1110 over y 0 to 364, plate ink-950 with HOUSE RECORD, integer 824,905 with .306, rule 1.
- M-06L Linked (x 4440): the hero hit with a linked phone: plate RUN LEADER, Sara's still at 16% (kept), copy column "Kept by a" / "linked phone." and "Not yours? Scan it." at 70%, QR live.
- M-06k Run of four, two kept (x 5920): current hit Yusuf 356,812 with .551, the run top is Sara (white top edge), target rule 2 BEAT THE / TOP MARK with a gap segment on the rail from Yusuf's notch to Sara's tick (only if under 834 px, compute it).
Verify with close-ups.`),
    () => mk('frames:machine-states', `the remaining frames on the page "Machine 1080 x 3840".
Spec sections: 2.1, 2.2, 2.3, M-08, M-09, F-01, F-03, F-04, the queued credit rule, and the Figma frames table.
- M-00 Zoning overlay and state notes (x 0 y 0): the 1080 x 3840 frame with every zone Z0 to Z6 and the rail drawn as translucent labelled bands on ink-950, the measure lines x 104 and 1016, the floor height at each zone boundary (MOUNT_TOP = 2.00 m, floor = 2.00 - y/2560), the QR centre at 1.16 m, the bell edge, the constants MOUNT_TOP, PAD_SIDE, READER_Y, and the note "Change MOUNT_TOP and every band moves by the same offset." Use Inter for all annotation inside this frame (it is a spec sheet, not a screen).
- M-08 Afterglow (x 7400 y 4600): the hero Result after 30 s: replay frozen on the contact frame at 30%, integer, plate, Z3 run block live, Z4.
- M-09 Armed idle (x 8880 y 4600): camera off, the attract clip loop at 40% (attract_karim_3x4), HIT IT prompt, Z4 ONE CREDIT / WAITING.
- F-01 No reading (x 10360 y 4600): plate with 8 px #FFAB00 top edge and NO READING, ghost cells, lines "Your credit is still in." / "Hit again when you're ready." in Z3 (first hit of a run).
- F-03 No replay (x 11840 y 4600): Z2 ink-950 with a 3 px white 20% outline (drawn as rectangles), NO REPLAY / THIS TIME, "Your score still counts.", the still in Z3 as an ink-900 block, score 402,176 with RUN LEADER.
- F-04 Out of service (x 13320 y 4600): ghost cells, BACK SOON, "This machine is not taking credits right now.", a staff fault word "SENSOR" in Orbitron Bold 36 at white 30% at baseline 3780.
Verify with close-ups.`),
  ])
})

const phoneFramesP = phoneKitP.then(pk => {
  const pkMd = fmtReport('Phone kit report', pk)
  const mk = (label, task) => agent(`${COMMON}

The phone kit and the claim flow screens already exist. Here is the phone kit agent's report; use its components and styles:
${pkMd}

Open P-02 Your hit first (get_screenshot it and look) and match its construction, spacing and type exactly.

YOUR TASK: ${task}`, { label, phase: 'Frames', schema: REPORT_SCHEMA })
  return parallel([
    () => mk('frames:phone-app-a', `on the page "Phone 393 x 852", row "App" at y 1200, with the section heading and labels:
Spec sections: 8 IA and what changed, P-03 You, P-04 Hit detail and reactions, P-05 Hits feed, copy bank 13 phone app, and the brief's cast corrections.
- P-03 You (x 0 y 1200), with the tab bar (You active).
- P-04 Hit detail (x 553 y 1200) using p04_sara_9x16, the visibility control, Felt that as a hint, Beat this in #D842D3, social proof with faces.
- P-05 Hits feed (x 1106 y 1200), tab bar Hits active, the place header as the editorial moment, a full-width card (card_omar), then a pair of cards (pair_yusuf, pair_maya), cropped by the frame bottom.
- The scroll frame "P-03 You, full reel" (x 0 y 3600, 393 x 2000): the full reel with the visit header, the best tile, other hits as rows (thumb_sara_a, thumb_sara_b), an older visit, and "August, six visits".
Verify each screen with close-ups.`),
    () => mk('frames:phone-app-b', `on the page "Phone 393 x 852":
Spec sections: P-06 Boards, P-07 Machine page, the link sheet, P-04 Beat this sheet, visibility sheet, section 9 competition, copy bank 13.
- P-06 Boards (x 1659 y 1200): scope tabs, period toggle, record row with record_noor, rows with avatars (use avatar_* hashes), your row sticky above the tab bar with the 4 pt red bar (Sara), tab bar Boards active. Decimals only here.
- P-07 Machine page (x 2212 y 1200): header, the tower on the cabinet's scale with the top bar, marks and leader lines, On this machine tonight (tile_leila wide, pair_hana), Your people here faces, Crews that call this home, sticky Link my next hit here button, tab bar Machines active.
- States and sheets row (y 2400): P-04 Beat this sheet (x 1106), P-04 Visibility sheet (x 1659), P-07 Link sheet (x 2212) with the press-and-hold button shown mid-hold (a ring filling).
Verify each screen with close-ups.`),
  ])
})

const [kit, phoneKit, brand, flow, machineFrames, phoneFrames] = await Promise.all([kitP, phoneKitP, brandP, flowP, machineFramesP, phoneFramesP])
const reports = [
  fmtReport('Machine kit and core', kit), fmtReport('Phone kit and claim', phoneKit), fmtReport('Brand', brand), fmtReport('Flow', flow),
  ...(machineFrames || []).map((r, i) => fmtReport('Machine frames ' + (i + 1), r)),
  ...(phoneFrames || []).map((r, i) => fmtReport('Phone frames ' + (i + 1), r)),
].join('\n\n---\n\n')
log('Build phase done, starting critique')

phase('Critique')
const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          page: { type: 'string' },
          frame: { type: 'string' },
          nodeId: { type: 'string' },
          problem: { type: 'string' },
          evidence: { type: 'string', description: 'What you saw in which screenshot path, or the property values you read' },
          fix: { type: 'string' },
        },
        required: ['severity', 'page', 'frame', 'problem', 'evidence', 'fix'],
      },
    },
  },
  required: ['findings'],
}
const CRITIC_COMMON = `${COMMON}

You are now a CRITIC, not a builder. Do not modify the file. Screenshot the real file yourself (whole frames and close-ups), download and LOOK at every image, and read node properties with read-only use_figma scripts where measurement settles a question. Report only problems you have evidence for. Every finding names the frame and, where possible, the node id, and gives a concrete fix.

Build reports from the builders (they may be wrong; verify):
${reports}`

const lenses = [
  { key: 'machine-spec', task: `Lens: spec compliance of every machine frame on "Machine 1080 x 3840". For each frame compare against the spec state tables and the brief: zone y ranges, baselines (integer 352, plate label and decimals 478, code level with the tile bottom 2441), the 912 px measure x 104 to 1016, rail x 16 to 64 with ticks and notch at the right y, QR tile 561 px at x 104 y 1880 with 17 px modules, stills order and edges, plate variants and labels, Z4 target headline per rule, payment line, recording notice, what must be absent (Z2 and Z4 during the reveal). Measure with read-only scripts (absoluteBoundingBox, absoluteRenderBounds). Check frame sizes are exactly 1080 x 3840 and frame names and labels match the brief.` },
  { key: 'phone-craft', task: `Lens: phone craft on "Phone 393 x 852". iOS correctness (safe areas 59 and 34, status bar and home indicator present, tab bar height, 20 pt margins, 44 pt minimum touch targets), spec compliance of every P screen, type ramp use, image crops (faces not cut awkwardly, blur where the spec requires it before a keep), score cells, consistency of the same component across screens, and anything that reads as a template (Reels-style right rail, pills, identical card grids).` },
  { key: 'tells-copy', task: `Lens: AI tells, copy and numerals across ALL pages (Machine, Phone, Brand and tokens, Flow). Find: any em or en dash in any text node or layer name (search every TEXT node's characters with a read-only script and report exact node ids), invented copy that is not in the spec copy bank or brief, placeholder or lorem text, default layer names, pill eyebrows, gradient text, uniform card grids, everything-centred compositions, decorative numerals, duplicated scores on one screen, names or handles on the machine glass, gendered pronouns in UI copy, inconsistent capitalisation of the same string across frames.` },
  { key: 'legibility', task: `Lens: typography and physical legibility on the machine frames and the brand boards. Check fonts are the real ones (read fontName on text nodes; Figma substitutes silently), text styles applied, sizes at or above the 36 px floor on the machine, contrast of every text colour against its actual background (compute from fills), overflow or clipping (text box wider than its column, textAutoResize problems, clipped descenders like the comma), baseline consistency across frames of the same element, and whether the M-00 zoning frame and the Flow viewing-geometry board are numerically consistent with the spec (floor heights = 2.00 - y/2560).` },
]
const critiques = await parallel(lenses.map(l => () => agent(`${CRITIC_COMMON}

${l.task}`, { label: `critic:${l.key}`, phase: 'Critique', schema: FINDINGS })))
const all = critiques.filter(Boolean).flatMap((c, i) => c.findings.map(f => ({ ...f, lens: lenses[i].key })))
log(`${all.length} findings: ${all.filter(f => f.severity === 'high').length} high, ${all.filter(f => f.severity === 'medium').length} medium`)

phase('Fix')
const byPage = (pred) => all.filter(pred)
const machineF = byPage(f => /machine/i.test(f.page))
const phoneF = byPage(f => /phone/i.test(f.page))
const otherF = byPage(f => !/machine/i.test(f.page) && !/phone/i.test(f.page))
const FIX_SCHEMA = {
  type: 'object',
  properties: {
    fixed: { type: 'array', items: { type: 'string' } },
    rejected: { type: 'array', items: { type: 'string' }, description: 'Findings you verified as wrong, with the evidence' },
    remaining: { type: 'array', items: { type: 'string' } },
    screenshots: { type: 'array', items: { type: 'string' } },
  },
  required: ['fixed', 'rejected', 'remaining', 'screenshots'],
}
const fixer = (label, list) => list.length ? agent(`${COMMON}

YOUR TASK: verify and fix these critique findings. For each one, first check it is real in the file (critics can be wrong). Fix the real ones, high severity first, keeping every frame consistent with its siblings. Re-screenshot and look after fixing.

${list.map((f, i) => `${i + 1}. [${f.severity}] ${f.page} / ${f.frame}${f.nodeId ? ' / ' + f.nodeId : ''}: ${f.problem}\n   Evidence: ${f.evidence}\n   Fix: ${f.fix}`).join('\n')}`, { label, phase: 'Fix', schema: FIX_SCHEMA }) : Promise.resolve({ fixed: [], rejected: [], remaining: [], screenshots: [] })

const fixes = await Promise.all([fixer('fix:machine', machineF), fixer('fix:phone', phoneF), fixer('fix:boards', otherF)])

return {
  reports,
  findings: all,
  fixes: fixes.map((f, i) => ({ area: ['machine', 'phone', 'boards'][i], ...(f || {}) })),
}