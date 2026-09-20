export const meta = {
  name: 'punch-review-fix-2',
  description: 'Four-lens review of the whole showcase, then owners fix what the reviewers confirm',
  phases: [
    { title: 'Review', detail: 'machine, phone, shell and docs, copy and access' },
    { title: 'Fix', detail: 'one owner per file set fixes and re-verifies' },
  ],
}

const P = 'C:/Claude Database/punch-exercise'
const HOUSE = `
PROJECT: a design showcase for a PunchApp design task done for Robotenc, in ${P}/showcase (vanilla HTML, CSS and JS), served at http://localhost:5770 by \`node tools/serve-showcase.mjs\` (already running; if the URL does not answer, start it in the background from ${P}). Includes <!-- include:path --> expand server-side; /sections.css concatenates showcase/sections/*.css. The brief the company gave is at C:/Users/Farhan Hosseini/Downloads/product-designer-challenge.md.
WHAT EXISTS: a top bar (Robotenc logo, "Design task for Robotenc", "The brief" drawer, three modes: Machine screen, Mobile app, Design system; "Read case study"; "Customise"). Global THEME Arena (default) or Reference, APPEARANCE dark or light, LOGO (PunchApp mark or six others, default Fist). MACHINE: a screen bar over the glass switches seven 1080 x 3840 screens: Leaderboard (attract, between players), Scan (QR to download the app, with a How to use card; states waiting, connected, holding, missed), Punch now (a 10 second countdown; a demo punch lands and opens New record), Result (the configurable screen: nine sections with designs A to E), Ranks and stats, Big score, New record. The six flow screens are parts/mscreen-KEY.html + mscreens/KEY.css + mscreens/KEY.js and must share identical logo lockup, sponsor strip, light shapes and photo card across screens. MOBILE: iPhone 17 Pro Max or Android frame; screens scan (How to use sheet with the machine illustration), connect, topup, checkout, paid, punch (NEW: "Make your punch" with a countdown synced to the machine), hit, ranks, feed, profile; five tab bar styles whose middle button is now the chosen logo; beside the phone on wide windows a LIVE MACHINE (this same page as ./?embed=machine in an iframe) that follows the phone (scan, countdown with the same number, record, result, leaderboard). DESIGN SYSTEM page. CASE STUDY: rebuilt in an Apple product page style with scroll driven motion inside #caseScroll, two live machine embeds (./?embed=machine&follow=0), and three live diagrams (machine state diagram, a run from first credit to phone, viewing geometry: parts/case-state.html, case-run.html, case-geometry.html, case-diagrams.css/js with cd- classes; the countdown screen also uses cd- classes, a collision already bit once: .cd-h).
HOOKS: window.showcase.mode('machine'|'mobile'|'system'), .mscreen('attract'|'scan'|'countdown'|'result'|'stats'|'score'|'record', opts) (countdown opts {punch:false} runs out; scan opts {linked, holding, missed}), .theme('arena'|'reference'), .appearance('dark'|'light'), .logo(key), .set(slot, i), .space(n), .zoom(n), .fit(), .slots(), .sectionHeight(slot), .brief(true|false); window.punchApp.go(page, {player}), .device('iphone'|'android'), .style('board'|'connect'|'nav', i), .credits (get/set), .page.
TOOLS: node tools/shoot.mjs <url> <outDir> <width> <height> <plan.json> runs a JSON plan of steps ({wait: ms}, {eval: js}, {click: selector} a REAL hit-tested mouse click, {key: name}, {shot: name, full?, clip?, scale?}); it prints console errors at the end. Write plan files with the Write tool. The loader takes about 3.5 s: start with {eval: "localStorage.clear(); location.reload(); 1"}, {wait: 4200}. node tools/shoot-slot.mjs <slot> [dark|light|both] renders every design of a machine section and reports overflow and height. Put output under ${P}/build/review/<your-lens>/. Open PNGs with the Read tool and LOOK at them.
HOUSE RULES the user is strict about: no em dashes or en dashes in visible copy; numerals only where they are content (scores, prices, ranks, credits, sizes in the design system); a thin hairline or bar between two words reads as a dash; no emoji; no gradient text; visible keyboard focus; prefers-reduced-motion respected; text contrast at least 4.5:1 (3:1 for large) against what is actually behind it in every look; nothing scrolls sideways at 390 px; nothing clipped, overlapping or colliding; every control does what it says.
`

const FIND = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          owner: { type: 'string', enum: ['machine', 'phone', 'shell'] },
          files: { type: 'string', description: 'the files that must change' },
          where: { type: 'string', description: 'mode, page, design, look, device and width where it shows' },
          problem: { type: 'string' },
          evidence: { type: 'string', description: 'screenshot path or measured value that proves it' },
          fix: { type: 'string', description: 'the concrete change you recommend' },
        },
        required: ['severity', 'owner', 'files', 'where', 'problem', 'evidence', 'fix'],
      },
    },
  },
  required: ['findings'],
}

const OWNERS = `Owner codes: "machine" = showcase/sections/*.html|css, the six flow screens parts/mscreen-*.html, mscreens/*.css, mscreens/*.js, the design A, token and machine flow frame rules in showcase/styles.css, icons.js; "phone" = showcase/parts/phone.html, parts/phone-pay.html, mobile.css, mobile.js, nav.css, pay.css, pay.js, app-icons.js, and the live machine panel rules in mobile.css; "shell" = showcase/index.html, app.js, the top bar, settings panel and loader rules in styles.css, parts/brief.html, brief.css, parts/case.html, case.css, case.js, parts/case-state.html, parts/case-run.html, parts/case-geometry.html, case-diagrams.css, case-diagrams.js, parts/ds.html, ds.css, ds.js, tools/.`

const LENSES = [
  { key: 'machine2', label: 'review: machine flow screens', prompt: 'YOUR LENS: the seven machine screens. Shoot each flow screen (attract, scan in its four states, countdown while counting, in the last three seconds, at the hit and at time up, stats, score, record) in Arena dark, Arena light, Reference dark and Reference light at zoom 30 to 40 (clip #machine) and close-ups at zoom 80. Compare each against its Figma frame (file aDk4RGbovg0KKhtUBokHjk: 187:2651 leaderboard, 187:3155 scan, 187:3094 countdown, 187:2852 stats, 187:2940 big score, 187:3006 record; get_screenshot) for missing content or wrong hierarchy. Check the shared parts are IDENTICAL across the six (logo lockup position and size, sponsor strip and AD tag, light shapes, photo card radius and crop), text sizes readable from 1 to 1.5 m, contrast in every look, motion starting and stopping with the screen, reduced motion, the Result screen still correct, and that switching screens from the bar and from window.showcase.mscreen works. Also check selector collisions between the machine screens CSS and other stylesheets (for example case-diagrams.css .cd-* rules reaching the countdown) by inspecting computed styles of the headline, number and labels.' },
  { key: 'phone2', label: 'review: phone and the live machine', prompt: 'YOUR LENS: the phone and the live machine beside it. At 1600 x 1000 in mobile mode (the live machine shows on wide windows; Customise has a Machine beside the phone switch), set credits to 3 (window.punchApp.credits = 3), then with REAL clicks: scan (tap the code), wait through connect, the punch step (sample the phone number and the machine number every 200 ms by reading #linkedFrame.contentDocument, they must match), the landing, New record then Result on the machine, Your hit on the phone, Punch again, Cancel on the punch step (the credit comes back, the machine returns to scan), credits 0 through top up and pay back to punch. Then every phone screen in all four looks on iPhone and Android, the punch step states (window.punchApp.go(\'punch\', { miss: true }) shows time up), the How to use sheet with the new illustration, and the tab bar logo button in all five styles with every logo. Look for sync drift, stuck timers after leaving a page, the live machine not following or showing the wrong screen, theme, appearance or logo changes not reaching the live machine, layout overlap between the phone and the live machine at 1280 to 1920 wide and with Customise open, console errors.' },
  { key: 'case2', label: 'review: the new case study', prompt: 'YOUR LENS: the rebuilt case study (open with a real click on #openCase). It must read as an original Apple product page style narrative, NOT as a copy of the reference landing page (no bento stat cards, no dashed cards, no reference footer). Scroll #caseScroll through the whole page in small steps at 1440 x 900, 1024 x 768 and 390 x 844, including mid-animation frames and pinned sequences, and with reduced motion (REDUCED_MOTION=1 in the environment for tools/shoot.mjs). Check: every chapter is readable at every scroll position (no text stuck faded or hidden, nothing overlapping during pinned sequences), the two live machine embeds show the intended screens and do not follow the phone, the three diagrams (state, run, geometry) render, animate and are legible on their grounds at every width, the chapter bar and close button, the data-go-mode buttons, Escape, focus return, no sideways scroll at 390, smoothness (count long frames while scrolling), no console errors, and that facts match the product (screens, flows, numbers).' },
  { key: 'copy2', label: 'review: copy, access and rules', prompt: 'YOUR LENS: copy, accessibility and the house rules for everything that changed: the seven machine screens, the punch step, the How to use sheet, the tab bar logo button, the live machine panel, the case study and its diagrams. Extract visible text and scan for em dashes (U+2014), en dashes (U+2013), decorative numerals, emoji, typos and inconsistent names (Punch Now vs Punch now, Hit! vs Landed, PunchApp vs Punch App); measure contrast against the real pixels behind text in all four looks; check accessible names, alt text, heading order in the case study, focus visibility and order, live regions on the countdowns (not too chatty), and reduced motion.' },
]

phase('Review')
const reviews = await parallel(LENSES.map((l) => () => agent(HOUSE + '\n' + OWNERS + '\n\nYOUR JOB IS TO FIND REAL PROBLEMS, NOT TO FIX THEM. Do not edit any file under showcase/. ' + l.prompt + '\nReport only problems you have evidence for (a screenshot you looked at or a measurement). A previous reviewer with your lens was cut off by a usage limit; its plans and screenshots may be in ' + P + '/build/review/ (they are from the current files and can be reused if you check them). AS YOU GO, append each finding you confirm to ' + P + '/build/review/findings-' + l.key + '.md (one short block per finding with the same fields as the schema), so nothing is lost if you are interrupted. Be specific about where and what to change. Rank by severity: high = broken, unreadable or clearly wrong; medium = visibly off; low = polish.', { label: l.label, phase: 'Review', schema: FIND })))

const all = reviews.filter(Boolean).flatMap((r) => r.findings || [])
log(`${all.length} findings from ${reviews.filter(Boolean).length} reviewers`)
const groups = { machine: [], phone: [], shell: [] }
for (const f of all) (groups[f.owner] || groups.shell).push(f)

phase('Fix')
const fixes = await parallel(Object.entries(groups).filter(([, list]) => list.length).map(([owner, list]) => () => agent(
  HOUSE + '\n' + OWNERS + `\n\nYOU OWN the "${owner}" files. Other agents are fixing the other owners' files at the same time: edit ONLY your files, and use targeted edits (never rewrite a whole shared file such as styles.css; re-read before each edit). Reviewers reported the findings below. For each: reproduce it first (render and look, or measure). If it is real, fix it properly and verify the fix with a fresh render in every look it concerns, without breaking dark or any other look. If it is not real or the recommended fix would be wrong, say why. Do not add scope beyond these findings except for problems you directly cause or discover in the same place.\n\nFINDINGS:\n${JSON.stringify(list, null, 1)}\n\nWHEN DONE reply with a list: each finding, verdict (fixed, not a problem, or left with reason), what you changed, and how you verified.`,
  { label: `fix: ${owner} (${list.length})`, phase: 'Fix' })))

return { findings: all, fixes: fixes.filter(Boolean) }
