export const meta = {
  name: 'punch-review-fix',
  description: 'Four-lens review of the whole showcase, then owners fix what the reviewers confirm',
  phases: [
    { title: 'Review', detail: 'machine, phone, shell and docs, copy and access' },
    { title: 'Fix', detail: 'one owner per file set fixes and re-verifies' },
  ],
}

const P = 'C:/Claude Database/punch-exercise'
const HOUSE = `
PROJECT: a design showcase for a PunchApp design task done for Robotenc, in ${P}/showcase (vanilla HTML, CSS and JS), served at http://localhost:5770 by \`node tools/serve-showcase.mjs\` (already running; if the URL does not answer, start it in the background from ${P}). Includes <!-- include:path --> expand server-side; /sections.css concatenates showcase/sections/*.css. The brief the company gave is at C:/Users/Farhan Hosseini/Downloads/product-designer-challenge.md.
WHAT EXISTS: a top bar (Robotenc logo, "Design task for Robotenc", a "The brief" button opening a drawer from the left, three modes: Machine screen, Mobile app, Design system; "Read case study"; "Customise" opens a settings panel on the right). Global choices in Customise, applied to every mode: THEME Arena (default) or Reference, APPEARANCE dark (default) or light, LOGO one of six marks (default Fist). Machine screen: the 1080 x 3840 glass with nine sections (header, hero, ranks, stats, video, clips, photo, cta, sponsor), each paging through designs A to E (hero also F slot reels); Reference theme locks every section to design A. Mobile app: an iPhone 17 Pro Max or Android frame; screens scan (How to use sheet), connect (Orbit or Brackets style), topup, checkout (Apple Pay or Google Pay by device, Visa, PayPal, another card, a wallet confirmation sheet), paid, hit (credits bar with Punch again), ranks (five leaderboard styles, search, scope tabs, pinned You bar), feed (stories, filters, likes, double tap), profile (hits, badges, wallet row with Top up, follow); a page bar above the phone; five tab bar styles (Pill, Tab bar, Dock, Notch, Minimal); a Wallet control (no credits or three). Design system page: principles, brand as given and as changed, colour roles, type, space, icons, components, logo. Case study: a long landing-page style dialog. Icons everywhere are one Lucide line family.
HOOKS: window.showcase.mode('machine'|'mobile'|'system'), .theme('arena'|'reference'), .appearance('dark'|'light'), .logo(key), .set(slot, i), .space(n), .zoom(n), .fit(), .slots(), .sectionHeight(slot), .brief(true|false); window.punchApp.go(page, {player}), .device('iphone'|'android'), .style('board'|'connect'|'nav', i), .credits (get/set), .page.
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

const OWNERS = `Owner codes: "machine" = showcase/sections/*.html|css, the design A and token rules in showcase/styles.css (above the "top bar" section), icons.js; "phone" = showcase/parts/phone.html, parts/phone-pay.html, mobile.css, mobile.js, nav.css, pay.css, pay.js, app-icons.js; "shell" = showcase/index.html, app.js, the top bar, settings panel and loader rules in styles.css, parts/brief.html, brief.css, parts/case.html, case.css, parts/ds.html, ds.css, ds.js, tools/.`

const LENSES = [
  { key: 'machine', label: 'review: machine screen', prompt: `YOUR LENS: the Machine screen. Check every section's every design in Arena dark and Arena light (use tools/shoot-slot.mjs for each slot with both), plus design A of every section in Reference dark and Reference light (full glass at zoom 40), and the whole glass with all sections on the same letter A to E in both appearances. Check the glass fit note in Customise for combinations, the logo swap (window.showcase.logo for each of fist, boxer, glove, upright, pair, bag) in the header designs, the Whole screen and Reading size buttons, breathing room 70 and 125 for the full stack (does anything clip at the glass bottom), and that icons read as one consistent line family at a sensible weight in every badge. Look for: low contrast, grey smudges, invisible elements, misaligned or clipped text, inconsistent icon weights, red used for more than its one job, anything that looks unfinished next to its dark twin.` },
  { key: 'phone', label: 'review: phone app', prompt: `YOUR LENS: the Mobile app. Walk every screen on the iPhone and the Android frame in all four looks (Arena or Reference, dark or light) and all five tab bar styles, and run these flows with REAL clicks: (1) credits 0: scan, tap the code, wait through connect, land on topup "Out of credits", pick the Group run pack, continue, pay with the first method, see the wallet sheet steps, paid, Punch now, land on hit with credits 2; then Punch again twice down to 0, then the next tap goes to topup. (2) Checkout with Visa, with PayPal, with another card (empty form error, then a valid number), cancel the sheet with its X and with Escape. (3) Leaderboard: each of the five styles, search, scope tabs, tap a row to open that profile, back. (4) Feed: filters, like, double tap a photo, story to profile. (5) Profile: tabs, follow, wallet row Top up. (6) Page bar entries to every screen. (7) Connect in both styles. Look for: broken or dead controls, wrong states, text collisions, anything under the tab bar or the pinned You bar that cannot be reached, low contrast, clipped labels (especially Reference fonts on Android), icon inconsistency, focus rings, toasts that cover buttons, timing that is too fast to read, console errors.` },
  { key: 'shell', label: 'review: shell and documents', prompt: `YOUR LENS: the shell and the documents. Check the top bar at 390, 768, 1024, 1280, 1440 and 1920 wide in dark and light (title, "The brief" button, three modes, Read case study, Customise: nothing truncated badly, overlapping or pushed off screen), the Customise panel in each of the three modes (the right groups show, every control works, reset everything returns to Arena, dark, Fist), theme, appearance and logo propagating instantly to all three modes and persisting after reload, the brief drawer (opens from the left, reads well, closes by X, scrim and Escape, the mode buttons inside it work), the case study (every section at 1440 and 390, its mode buttons, close, focus), the design system page (every section in all four looks at 1440, 1024 and 390: values live, samples correct, the tab bar samples, the icon grid, the logo picker), keyboard: Tab order and visible focus through the top bar, panel and dialogs, Escape behaviour, focus return. Look for layout bugs, dead links, stale copy (for example "Play again", "Ring the Bell" in the top bar, "Machine glass, 1080 x 3840" captions, which were all removed on purpose), console errors.` },
  { key: 'copy', label: 'review: copy, access and rules', prompt: `YOUR LENS: copy, accessibility and the house rules, across ALL modes and documents. Programmatically extract visible text of every mode, every phone screen (go through all nine), the brief, the case study and the design system page in both appearances and scan it for em dashes (U+2014), en dashes (U+2013), stray numerals used as decoration, emoji, and typos; list each hit with its location. Measure contrast of text against its real background in all four looks on a representative set of screens (sample pixels from screenshots where text sits on images, gradients or translucent layers; do not trust computed colours alone). Check that every button and link has an accessible name, images have alt or are decorative, headings are in order within each document, dialogs trap focus sensibly, focus is visible, and reduced motion (emulate prefers-reduced-motion: reduce by adding an eval that sets document.documentElement.style.setProperty or by running Chrome with the media emulation, see tools/shoot.mjs, it sets prefers-reduced-motion no-preference; you may copy it to your folder and switch that to reduce) still leaves every flow readable. Look also for a hairline or bar between two words anywhere.` },
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
