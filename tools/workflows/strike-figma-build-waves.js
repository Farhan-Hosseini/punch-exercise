export const meta = {
  name: 'strike-figma-build-waves',
  description: 'Finish the Figma file in small sequential waves with retries: remaining machine frames, phone screens, brand and flow boards, then critique and fixes',
  phases: [
    { title: 'Boards' },
    { title: 'Machine frames' },
    { title: 'Phone frames' },
    { title: 'Critique' },
    { title: 'Fix' },
  ],
}

const BRIEF = String.raw`C:\Claude Database\punch-exercise\docs\BUILD-BRIEF.md`
const SPEC = String.raw`C:\Claude Database\punch-exercise\docs\strategy\06-spec-v2.md`

const COMMON = `You are a senior product designer finishing a design exercise file directly in Figma through the Figma MCP tools. Load them first with ToolSearch: "select:mcp__8bb2429e-ce99-4151-a843-154d5883e10a__use_figma,mcp__8bb2429e-ce99-4151-a843-154d5883e10a__get_screenshot,mcp__8bb2429e-ce99-4151-a843-154d5883e10a__get_metadata,mcp__8bb2429e-ce99-4151-a843-154d5883e10a__get_figma_skill".
Read the build brief first: ${BRIEF}. It is binding and overrides the spec where they differ. It ends with a resume section listing what already exists and the kit facts (component ids, text style ids, baseline offsets). Then read the spec sections your task names in ${SPEC} with Read offset and limit (about 1,400 lines; section 2 near line 56, 4 near 220, 5 machine states near 275, handoff 7 near 696, motion 6 near 791, phone 8 near 873, brand 10 near 1091, checklist 11 near 1119, copy bank 13 near 1206).
Work in small use_figma calls and return ids from each. A page's children only load once you call setCurrentPageAsync, so open your page before listing or searching it.
The verification loop is mandatory: build, screenshot, download the PNG, LOOK at it with Read, fix, re-screenshot after your last edit. Close-ups of dense zones are required; whole-frame shots hide small type.
Never create a second node with a name that already exists. If a frame from an interrupted earlier attempt exists, audit and finish it in place.
No em dashes or en dashes anywhere, including layer names. No invented copy: section 13 is the copy bank.`

const REPORT = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    nodes: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, id: { type: 'string' } }, required: ['name', 'id'] } },
    deviations: { type: 'string', description: 'Spec rules not met, copy rewrites, judgement calls' },
    screenshots: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'nodes', 'deviations', 'screenshots'],
}

// One retry per agent: agent() returns null on a terminal error, so try again with a fresh label.
async function tough(label, prompt, schema, phase) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await agent(prompt, { label: attempt ? `${label} (second try)` : label, phase, schema })
    if (r) return r
    log(`${label} failed, retrying`)
  }
  log(`${label} failed twice`)
  return null
}

phase('Boards')
const wave1 = await parallel([
  () => tough('boards:brand', `${COMMON}

YOUR TASK: the brand board and the proposed token variables on page "Brand and tokens".
Spec sections: 3 (type system), 4 (colour and surfaces), 10 (brand changes), plus the legibility table in 2.3.
The audit board "Board / Supplied tokens, audited" (4:2) already exists at x 0 y 0, 2600 wide, fill #FAF9F9, Inter headings 72 Semi Bold, body 30 Regular #685E5B, 120 px padding, swatches 180 px with 16 px gaps and bracket flags. Match that language exactly. The placeholder photography section (9:37) at x 0 y 3600 must not move.

1. Build "Board / What I changed" at x 2800 y 0, width 2600, same style. It must be an editorial board, not a grid of identical cards:
   - A one-paragraph intro.
   - Colour: the proposed palette as swatches with role and one sentence each: ink-950 #0B0908 and ink-900 #1C1817 added, primary-500 #EB1110 kept as the strike, primary-300 #F26B6A for small red text, primary-800 changed from #8D0A09 to #750808, neutrals-400 changed from #CCBFBB to #C4B5B0, secondary-500 #D842D3 kept with one job, green #00C853 phone only, yellow #FFAB00 faults only, the deleted supportive reds shown struck through, the overlay-white role steps 08 16 24 40 64 70 85 over ink-950, scrim-black 40 and 70, plate-edge-rest, plate-edge-hit, bell-edge, and qr-ink on qr-ground #D9D9D9.
   - Type: the three roles at real size, side by side: Saira ExtraCondensed Black "402,176" in fixed cells, Orbitron Black "RUN LEADER", Inter Bold "Pay at the reader to take a turn." Beside them, draw the measured argument to scale inside a 912 px measure box: Orbitron 900 six digits reach 174 px (cap 49 mm) against Saira's 344 px (cap 92.6 mm), 1.9 times in the same width. Draw both settings, do not just state it.
   - The machine type scale as a specimen: each role set at its real px size with its name and the arcminutes at 3 m from the table in 2.3.
   - Motion tokens as a compact table: gravity 12,557 px/s2, launch max(400 ms, reading + 17 ms), mark cost 0.8, hit-stop 50 ms, hang 240 ms, stamp 160 ms ease-out cubic, stillness 600 ms, settle 320 ms with 80 ms stagger, plate spring 900/28/1.
   - Geometry tokens: MOUNT_TOP, PAD_SIDE, READER_Y, the measure x 104 to 1016, the rail x 16 to 64, the zones.
2. Create a Figma variable collection "Proposed tokens": colour variables for every palette token above (scopes FRAME_FILL, SHAPE_FILL, TEXT_FILL, STROKE_COLOR as appropriate, never ALL_SCOPES with other fill scopes), and number variables for the machine type scale and the motion constants (scope FONT_SIZE for sizes; leave scopes empty where none fits). Do not touch the existing "Supplied tokens" collection.
3. Verify with screenshots and close-ups.`, REPORT, 'Boards'),
  () => tough('boards:flow', `${COMMON}

YOUR TASK: page "Flow", three boards left to right from x 0 y 0, in the same board style as the brand page (fill #FAF9F9 on the #E4DFDC canvas, Inter, 120 px padding, ink #221E1D, secondary #685E5B).
Spec sections: 1, 2.1, 2.2, all of 5 (states, exits, queued credit rule, run rules), 7 (handoff), 8 P-00 to P-02.

1. "Board / Machine state diagram": every state (M-01, M-02, M-02q, M-03, M-04, M-05, M-06, M-07, M-08, M-09, F-01, F-02, F-03, F-04, F-05) as a labelled node, every exit as an arrow with its trigger (timer values, credit, strike, reading, keep confirmed, run end). Design files have no connectors, so draw arrows as thin rectangles plus a triangle head, grouped and named. Lay the reveal path out as a straight spine with faults branching off, not a tangle. Add the impact-to-Armed figures as an annotation: house record about 2,983 ms, hero 2,852 ms, plain solo 2,724 ms, plus the queued-credit rule.
2. "Board / A run, from the first credit to the phone": two lanes, the glass and the phone, along one horizontal timeline: first credit, hit 1 (Omar), the code appears, hit 2 (Sara) while the code stays put, a friend scans from the decal and watches everyone blurred, Sara taps This is my hit, the glass shows Kept on a phone and her still fades to 16%, the run ends 60 s after the last landing, the code dies 10 minutes later, unkept replays are deleted 60 minutes after sync. Use small diagrams drawn from shapes, not screenshots.
3. "Board / Viewing geometry": a side elevation to scale (1 m = 400 px): floor, the panel from 0.5 to 2.0 m with zones Z0 to Z6 marked at their floor heights, the pad on the right, a 1.75 m player at 0.6 m and at 1.5 m, eye range 1.45 to 1.70 m, head range 1.60 to 1.90 m, the sightline over a player's head meeting the glass at y 352 from 3.5 m, and a small plan view inset showing the queue decal 2.5 to 3.5 m out at 30 to 40 degrees off axis on the side away from the pad. Silhouettes built from simple shapes. Label the angles from 2.2.
4. Verify with screenshots and close-ups.`, REPORT, 'Boards'),
])

phase('Machine frames')
const wave2 = await parallel([
  () => tough('machine:reveal', `${COMMON}

YOUR TASK: on page "Machine 1080 x 3840", finish the reveal frames. M-03 Charge at apex (28:488) already exists from an interrupted attempt: audit it against the spec and finish it in place.
Spec sections: M-03, M-04, M-05, M-06p, M-07, the motion table in section 6, 7.1.
- M-03 Charge at apex (x 4440 y 0): the instant 120 ms after the friend's run line broke. Charge #EB1110 from the apex y 1744 down to 3840 behind all content, 28 px white apex edge. Z2 and Z4 absent (the spec sets them to alpha 0 during the reveal). Z3 run block present at full opacity with only Omar's still. Today's line at y 1384, 6 px white 24%, TODAY in Orbitron Bold 40 at x 104 sitting on it. The broken friend's line as two halves below y 2180, rotated about 6 degrees with their outer ends down. Ghost cells at about 12%. Empty plate with its top edge and the bell edge. Rail filled red to the edge with the notch at 1744.
- M-04 Landing frame (x 5920 y 0): the landing instant. Integer 402,176 with the squash drawn as a transform on the integer group (scaleY 0.88, scaleX 1.05 from the baseline), plate top edge flared to 12 px white, decimals .240 at white 64%, no label yet, charge still held at the apex, today's line held, Z2 and Z4 absent. Say in the frame label that this is the landing frame with the squash held.
- M-06p Plain solo hit (x 8880 y 0): 262,400.118. Notch at y 2472, no run lines, plain plate with no label, one still (this striker is Lina: use still_lina), replay using card_lina, GO / AGAIN with "Pay at the reader to go again.", today tick drawn at 1384 but not crossed.
- M-07 All kept (x 10360 y 0): the hero run after both hits are kept. Tile solid #D9D9D9 with KEPT centred in Orbitron Black 104 #000, copy lines "Every hit" / "is kept." in Inter Bold 40 and "Code used up." in Inter Semi Bold 36 at white 70%, both stills at white 16%, everything else as M-06.
Each frame needs its two-line label (the numeral count line) at y -190.`, REPORT, 'Machine frames'),
  () => tough('machine:variants', `${COMMON}

YOUR TASK: on page "Machine 1080 x 3840", the variant frames in the row at y 4600, plus the section heading "Variants and faults" at x 0 y 4040 in Inter Semi Bold 96 #221E1D if it does not exist yet.
Spec sections: M-02q, the M-06 variants (M-06t, M-06r, M-06L), M-06k, the target rules table, plate states 4.2, rail rendering.
- M-02q Armed after a queued credit (x 0 y 4600): Z2 plays the previous hit's slow segment (replay_sara_3x4) under the HIT IT scrim with the SLOW MOTION tab, Z3 run block live with both stills, Z4 empty, ghost cells, plate empty.
- M-06t Hit the top (x 1480 y 4600): a hit of 655,300.417. Plate #EB1110 with HIT THE TOP, both plate edges flared, rail red all the way to the bell edge, notch at the top, target rule 1 WHO TOPS / THAT?, payment line "Pay at the reader to take a turn."
- M-06r House record (x 2960 y 4600): integer 824,905 with .306. Crown ground #EB1110 from y 0 to 364, plate ink-950 with HOUSE RECORD in white, rule 1.
- M-06L Linked (x 4440 y 4600): the hero hit with a linked phone. Plate RUN LEADER, Sara's still already kept at white 16%, the QR still live, and the copy column reads "Kept by a" / "linked phone." with "Not yours? Scan it." at white 70%.
- M-06k Run of four, two kept (x 5920 y 4600): current hit Yusuf 356,812.551 (still_yusuf), stills in run order Omar, Sara, Lina, Yusuf with Omar and Sara at white 16% (kept), Sara's tick as the run top in white 100%, target rule 2 BEAT THE / TOP MARK with a gap segment on the rail from Yusuf's notch up to Sara's tick. Compute both heights from h = score / 640,000 and mark y = 3840 - h x 3336, and only draw the gap segment if it is under 834 px.
Each frame needs its two-line label at y 4410.`, REPORT, 'Machine frames'),
  () => tough('machine:states', `${COMMON}

YOUR TASK: on page "Machine 1080 x 3840", the zoning frame and the fault frames. M-08 Afterglow (28:422), M-09 Armed idle (28:571) and F-01 No reading (28:669) already exist from an interrupted attempt: audit each against the spec, finish it in place and fix anything wrong.
Spec sections: 2.1, 2.2, 2.3, M-08, M-09, F-01, F-03, F-04.
- M-00 Zoning overlay (x 0 y 0): a 1080 x 3840 frame on ink-950 with every zone Z0 to Z6 and the rail drawn as labelled translucent bands, the measure edges x 104 and 1016, the floor height at each zone boundary (MOUNT_TOP 2.00 m, floor height = 2.00 minus y/2560), the bell edge, the QR centre at 1.16 m, the constants MOUNT_TOP, PAD_SIDE and READER_Y, and the note "Change MOUNT_TOP and every band moves by the same offset." All annotation inside this frame is Inter, because it is a spec sheet and not a screen. Give it the label "M-00 Zoning overlay" with the second line "Numerals: this frame is a spec sheet, so it carries measurements."
- F-03 No replay (x 11840 y 4600): Z2 becomes ink-950 with a 3 px white 20% outline drawn as rectangles, NO REPLAY / THIS TIME in Orbitron Black 72 at x 136 baselines 1100 and 1180, "Your score still counts." in Inter Bold 48 baseline 1258, the Z3 still as an ink-900 block, score 402,176 with RUN LEADER.
- F-04 Out of service (x 13320 y 4600): ghost cells, BACK SOON in Orbitron Black 120 at x 104 baseline 2100, "This machine is not taking credits right now." in Inter Semi Bold 40 baseline 2170, and a staff fault word SENSOR in Orbitron Bold 36 at white 30% baseline 3780.
Every frame needs its two-line label.`, REPORT, 'Machine frames'),
])

phase('Phone frames')
const wave3 = await parallel([
  () => tough('phone:app-a', `${COMMON}

YOUR TASK: on page "Phone 393 x 852", the row "App" at y 1200 (add the section heading "App" at x 0 y 1040, Inter Semi Bold 40, if missing).
Spec sections: 8 platform, IA and what changed, P-03, P-04, P-05, copy bank 13, plus the brief's cast corrections.
- P-03 You (x 0 y 1200): nav @sara.n with her avatar, home machine line, the crew suggestion line about Omar, the visit header "Saturday night at Dubai Mall" with "Three hits", the visit's best hit as a 353 x 470 tile (best_sara_3x4) carrying YOUR BEST above the score, then the other hits as 72 pt rows with thumbnails (thumb_sara_a, thumb_sara_b), plate labels where they apply and a faces stack, then the older visit row "August, six visits". Tab bar with You active.
- P-04 Hit detail (x 553 y 1200): 9:16 video (p04_sara_9x16) with the integer dropped at contact, the plate with .240, place and the only exact time in the app, the visibility control top right, Felt that as a press and hold hint, Beat this in #D842D3, and the social proof faces "Omar and Lina felt it."
- P-05 Hits feed (x 1106 y 1200): text tabs My people and Near you with a 2 pt red underline on the active one, the place header "Tonight at Dubai Mall" with "Sara, Omar and Lina played", a full width 353 x 470 card (card_omar) with its plate, then a pair of 172 x 229 cards (pair_yusuf, pair_maya) cropped by the frame bottom. No right-hand action rail, no pills, no counts.
- The scroll frame "P-03 You, full reel" (x 0 y 3600, 393 x 2000) with the section heading "Scroll" at x 0 y 3440: the whole reel at full length.
Every frame gets its two-line label 84 above it.`, REPORT, 'Phone frames'),
  () => tough('phone:app-b', `${COMMON}

YOUR TASK: on page "Phone 393 x 852", the rest of the app row and the sheets row (add the heading "States and sheets" at x 0 y 2240, Inter Semi Bold 40, if missing).
Spec sections: P-06, P-07, the link sheet, the Beat this sheet, the visibility sheet, section 9, copy bank 13.
- P-06 Boards (x 1659 y 1200): scope tabs This machine / City / Friends / World, period This week / All time, the record row with record_noor and @noor.a, then 60 pt rows with avatars, handles, home machines and scores, Sara's row sticky above the tab bar with a 4 pt red left bar. Decimals appear only here. Tab bar Boards active.
- P-07 Machine page (x 2212 y 1200): header and venue line, then the tower from y 160 to 600 drawn on the cabinet's own scale (a 12 pt rail at x 20, the top as a 4 pt white bar labelled "The top", marks at their true heights for the house record holder, today's line, your red notch and a magenta challenge tick, with 1 pt leader lines where rows are pushed apart), "On this machine tonight" with tile_leila wide and pair_hana beside it, "Your people here" as 44 pt faces, "Crews that call this home", and the sticky "Link my next hit here" button. Tab bar Machines active.
- Sheets row at y 2400: P-04 Beat this sheet (x 1106), P-04 Visibility sheet (x 1659), P-07 Link sheet (x 2212) with the press and hold button shown mid-hold as a filling ring. Each sheet sits over a dimmed version of its parent screen.
Every frame gets its two-line label.`, REPORT, 'Phone frames'),
])

const reports = [...wave1, ...wave2, ...wave3].filter(Boolean).map(r => `### ${r.summary.slice(0, 120)}\n${r.nodes.map(n => `- ${n.name}: ${n.id}`).join('\n')}\nDeviations: ${r.deviations}`).join('\n\n')
log('Build waves done, starting critique')

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
          page: { type: 'string' }, frame: { type: 'string' }, nodeId: { type: 'string' },
          problem: { type: 'string' }, evidence: { type: 'string' }, fix: { type: 'string' },
        },
        required: ['severity', 'page', 'frame', 'problem', 'evidence', 'fix'],
      },
    },
  },
  required: ['findings'],
}
const CRITIC = `${COMMON}

You are now a CRITIC. Do not modify the file. Screenshot the real frames yourself, whole and close up, download and LOOK at every image, and read node properties with read-only scripts where measurement settles a question. Report only what you have evidence for, with the frame, the node id where you can, and a concrete fix.

What the builders said they did:
${reports}`

const critiques = await parallel([
  () => tough('critic:machine', `${CRITIC}

Lens: every machine frame on "Machine 1080 x 3840" against the spec and the brief. Zone y ranges, baselines (integer 352, plate label and decimals 478, code 2441), the measure x 104 to 1016, the rail x 16 to 64 with ticks and notch at the right heights, the QR tile 561 px at x 104 y 1880 with 17 px modules, stills order and edges, plate variant and label per state, the Z4 headline per target rule, payment line and recording notice, and what must be absent during the reveal (Z2 and Z4). Check frames are exactly 1080 x 3840 and that names and labels match the brief. Also check consistency between sibling frames: the same element should sit at the same y in every frame.`, FINDINGS, 'Critique'),
  () => tough('critic:phone', `${CRITIC}

Lens: phone craft on "Phone 393 x 852". iOS correctness (safe areas 59 and 34, status bar and home indicator present and not doubled, tab bar geometry, 20 pt margins, 44 pt minimum targets), spec compliance per screen, type ramp use, image crops and blur where the spec requires it before a keep, score cells, the same component used consistently across screens, and anything that reads as a template (a Reels-style right rail, pills, a uniform card grid, counts).`, FINDINGS, 'Critique'),
])
const critiques2 = await parallel([
  () => tough('critic:copy', `${CRITIC}

Lens: copy, AI tells and numerals across ALL pages. Use a read-only script to walk every TEXT node and report: any em or en dash (in text or layer names), any string not in the spec copy bank or brief, placeholder text, default layer names, gendered pronouns, inconsistent capitalisation of the same string, names or handles on the machine glass, duplicate scores on one screen, and decorative numerals. Also judge composition: pill eyebrows, gradient text, uniform card grids, everything centred.`, FINDINGS, 'Critique'),
  () => tough('critic:legibility', `${CRITIC}

Lens: typography and legibility on the machine frames and the boards. Read fontName on every text node (Figma substitutes missing fonts silently), check text styles are applied, sizes at or above the 36 px machine floor, contrast of each text colour against its actual background, overflow and clipping (box wider than its column, clipped descenders), baseline consistency for the same element across frames, and whether M-00 and the Flow viewing-geometry board are numerically consistent with floor height = 2.00 minus y/2560.`, FINDINGS, 'Critique'),
])
const all = [...critiques, ...critiques2].filter(Boolean).flatMap(c => c.findings)
log(`${all.length} findings, ${all.filter(f => f.severity === 'high').length} high`)

phase('Fix')
const FIX = { type: 'object', properties: { fixed: { type: 'array', items: { type: 'string' } }, rejected: { type: 'array', items: { type: 'string' } }, remaining: { type: 'array', items: { type: 'string' } } }, required: ['fixed', 'rejected', 'remaining'] }
const fixList = (list) => list.map((f, i) => `${i + 1}. [${f.severity}] ${f.page} / ${f.frame}${f.nodeId ? ' / ' + f.nodeId : ''}: ${f.problem}\n   Evidence: ${f.evidence}\n   Fix: ${f.fix}`).join('\n')
const mF = all.filter(f => /machine/i.test(f.page)), pF = all.filter(f => /phone/i.test(f.page)), oF = all.filter(f => !/machine|phone/i.test(f.page))
const fixes = await parallel([
  () => mF.length ? tough('fix:machine', `${COMMON}

YOUR TASK: verify and fix these findings on the machine page. Critics can be wrong: check each one in the file first, and say so if you reject it. Fix the real ones, high severity first, keeping sibling frames consistent. Re-screenshot and look after fixing.

${fixList(mF)}`, FIX, 'Fix') : Promise.resolve({ fixed: [], rejected: [], remaining: [] }),
  () => pF.length ? tough('fix:phone', `${COMMON}

YOUR TASK: verify and fix these findings on the phone page, same rules.

${fixList(pF)}`, FIX, 'Fix') : Promise.resolve({ fixed: [], rejected: [], remaining: [] }),
  () => oF.length ? tough('fix:boards', `${COMMON}

YOUR TASK: verify and fix these findings on the Brand and tokens, Flow, Motion storyboard and Cover pages, same rules.

${fixList(oF)}`, FIX, 'Fix') : Promise.resolve({ fixed: [], rejected: [], remaining: [] }),
])

return { reports, findings: all, fixes }