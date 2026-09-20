export const meta = {
  name: 'punch-round9',
  description: 'Eighteen asks: phone spacing and headers, Default fixes, Connected and Payment failed pages, Your hit numbers from research, reels grid and saved lists, machine videos, reds and Punch again',
  phases: [
    { title: 'Prepare', detail: 'research the strike numbers, gather punch videos, fix the phone base and the Default page' },
    { title: 'Build', detail: 'the Play flow, the pay pages, Your hit, reels and saved, the machine screens' },
    { title: 'Review', detail: 'a review of each surface, the design system and documents' },
    { title: 'Final', detail: 'a check of all eighteen asks' },
  ],
}

const P = 'C:/Claude Database/punch-exercise'
const HOUSE = `
PROJECT: a design showcase for a PunchApp design task done for Robotenc, in ${P}/showcase (vanilla HTML, CSS and JS), served at http://localhost:5770 by \`node tools/serve-showcase.mjs\` (start it in the background from ${P} if it does not answer). Includes <!-- include:path -->; /mscreens.css concatenates showcase/mscreens/*.css, /mpages.css showcase/mpages/*.css. The brief: C:/Users/Farhan Hosseini/Downloads/product-designer-challenge.md.
SURFACES: the phone app (iPhone 440 x 956, Android 412 x 915; pages are section.m-page[data-page] in parts/mpage-KEY.html and parts/phone-pay.html, logic in mobile.js, page styles in mpages/KEY.css and scripts in mpages/KEY.js) and the machine glass (1080 x 3840 portrait, read from 1 to 3 m, no touch; screens are article.mscreen[data-mscreen] in parts/mscreen-KEY.html with mscreens/KEY.css and .js; the Result screen is #screen with sections/*). Four looks: html[data-variant="arena|reference"] x html[data-appearance="dark|light"]. Scores through window.PunchFormat. The phone opens at Actual size and the machine at Actual size (100%) by default.
PAGES: phone groups in the page bar (index.html .pagenav, pagenav.js): Default | Play (Scan, Connect, Connected, Punch) | Pay (Top up, Checkout, Paid, Payment failed) | Your hits (Your hit, Reel, Saved) | Social (Leaderboard, Feed, Profile). Connected, Payment failed and Saved are NEW this round: registered in mobile.js ORDER, NO_NAV and MACHINE_FOR, with stub parts parts/mpage-connected.html, mpage-failed.html, mpage-saved.html and mpages/connected.*, failed.*, saved.* for their builders to fill. Machine groups: At rest (Default, Leaderboard) | Play (Scan, Punch now, Reading) | Results (Result, Your run, Big score, New record).
THE SECTION ENGINE (showcase/psec.js, read its header): a section is data-sec + data-sec-label inside its page root; its designs are direct children with data-sv="Name" (or data-sv-names for a script-drawn section); AT LEAST FIVE designs per section, each a real composition; Customise lists them under "This screen". Events: "mscreen" { key, opts } (machine), "mpage" { page, from, opts } (phone), "psec" { surface, page, sec, index, el } on a change. Hooks: window.showcase.mode('mobile'|'machine'|'animation'|'system'), .mscreen(key, opts), .sec(surface, page, sec, i), .sections(surface, page), .appearance(), .theme(), .zoom(n); window.punchApp.go(page, opts), .device('iphone'|'android'), .credits.
SHARED PIECES: spacing scales (phone .m-app --m-gut --m-sec-gap --m-group-gap --m-item-gap --m-pad and the header values in mpages/_shared.css; machine .mscreen --ms-* in mscreens/_space.css); the one QR style (PunchQR, qr.js/qr.css); icons <span data-lucide="name"></span> (lucide.js; add SVGs from https://cdn.jsdelivr.net/npm/lucide-static@1.47.0/icons/NAME.svg to assets/icons/lucide and run \`node tools/build-lucide.mjs\` from ${P}); the chosen logo: <img data-logo-img> (app.js swaps its src everywhere); real photos in assets/photos/lib (manifest.json with focal points); punch VIDEOS in assets/video/lib (manifest.json, gathered this round; muted, looping, playsinline, with posters); the Monster Energy kit in mscreens/_ads.css.
TOOLS: node tools/shoot.mjs <url> <outDir> <width> <height> <plan.json> (steps {wait}, {eval}, {click: selector} a real mouse click, {key}, {shot: name, clip?, full?, scale?}; prints console errors; REDUCED_MOTION=1 env). Plans start with {eval: "localStorage.clear(); location.reload(); 1"}, {wait: 4200}; eval steps share one scope, never redeclare a const. TRAP: .m-app itself carries data-page (the current page), so scope phone probes with .m-page[data-page="KEY"], never [data-page="KEY"] alone. For the glass: showcase.mode('machine'), hide .topbar, showcase.zoom(25) and clip #machine, close-ups at zoom 50, the embed at http://localhost:5770/?embed=machine&follow=0 at 300 x 1066. LOOK at every PNG with the Read tool; contact sheets with Python PIL (python, not py).
HOUSE RULES: no em or en dashes in visible copy; numerals only where they are content; a hairline or bar between two words reads as a dash; no emoji; no gradient text; not everything centred; visible focus; tap targets 44 px or more; reduced motion still and readable; tokens so every look works; nothing clipped or colliding.
HOW TO WORK: other builders edit at the same time: use Edit (never Write) on any existing file, re-read when an Edit fails, keep to your files, list anything else under "For others". Usage limits have killed runs before: land each piece as soon as it works and append a short entry to ${P}/build/review/LOG_FILE right after (what, where, how verified).
`

const RESEARCH = `
YOUR AREA: research, no page code. The phone's Your hit page has a section "The strike in numbers" (read parts/mpage-hit.html and mpages/hit.*). The user asks: "The strike in numbers: are they good or do we need better numbers? Search for it and, if needed, add more."
Search the web (WebSearch, WebFetch) for what real products report per punch: boxing arcade machines (Kalkomat, the Boxer machines, strength testers), punch trackers and smart bags (Hykso, Corner, Everlast, PowerKube, Rooq, FightCamp, Punchlab, StrikeTec, Hykso's speed, Corner's power), sports science on punch force (peak force in newtons or kilograms force, punch velocity in m/s or km/h, contact time, impulse, reaction time, rate of force development), and how apps present them to non-experts (comparisons, percentiles, personal bests, trends).
Then write ${P}/docs/strategy/strike-in-numbers.md: what the section shows today; what real products show; a recommendation of the four to six numbers the phone should show for one hit, each with its unit people understand (the UAE uses metric: km/h, kg), how it is measured by our machine (one pad sensor and one camera; be honest, label camera estimates), an example value for Sara's 999,999.000 hit and for a middling hit, and why it matters to the player; what to cut; and five visual design ideas for the section. Keep it consistent with ${P}/docs/strategy/what-to-show-for-a-punch.md (the glass shows fewer numbers; the phone is where the fuller numbers live). Cite sources inline with links. No em or en dashes.`

const VIDEOS = `
YOUR AREA: assets only, no page code. The user: "the hit image is not an image, it's a video reel of the punch, which also autoplays". Gather 12 to 16 short real punch videos under a free licence (Pexels License): punching bags, pads, a boxer's strike in slow motion, a fist toward the camera, young athletic men and women, no logos or legible text, dark and contrasty. Pexels videos: https://www.pexels.com/download/video/{id}/ redirects to the file without a key (the CDN filename encodes width, height and fps); find ids from pexels.com/video/... pages you can reach (the search page may be behind a bot check; try https://www.pexels.com/search/videos/boxing/ and similar, or known ids). Check each with ffmpeg (dimensions, duration, cuts) and LOOK at frames (extract 4 frames per clip, contact sheets).
Make web loops with ffmpeg: 3 to 6 s, a clean loop point, muted (no audio track), H.264 yuv420p, crf 23, faststart, in two shapes: vertical 720 x 1280 and square 1080 x 1080 (crop to the strike), under 2.5 MB each; a JPEG poster for each at the strike frame. Save to ${P}/showcase/assets/video/lib/NAME-v.mp4, NAME-sq.mp4, NAME-v.jpg, NAME-sq.jpg, and write manifest.json (file names, subject, who (a young man or woman), tags, duration, the strike time in seconds, focal point, source url, Pexels id, photographer, licence). Verify every file plays (ffprobe) and the loop has no visible jump (compare first and last frames). Log each clip.`

const PHONEBASE = `
YOUR AREA: the phone's shared layout and its Default page. FILES: mobile.css and mpages/_shared.css (the shared header and page rules, Edit only), nav.css (spacing only), parts/mpage-default.html, mpages/default.css, mpages/default.js, and the credits chip wherever it is drawn (Default, Top up, Checkout, Paid: coordinate by keeping one shared class).
The user's asks, all of them:
1. "Leaderboard: the icon and the title must be on the same level; the header, the bottom navigator and the content in the middle, and the space between them. Make the whole phone like this." On every phone page: a header icon button and the title share one centre line (align-items: center; the title's line box and the button's box centred together), and the space between the content and the tab bar is consistent on every page (the last content ends a fixed --m-sec-gap above the bar, and nothing hides under it). Measure every page on both phones.
2. The Default greeting (the avatar, "Good afternoon", "Sara"): "not a good spacing: the text lines need to be closer, and more space between the text and the avatar". Tighten the two lines (about 2 to 4 px apart) and give the avatar a clear gap (about 14 to 16 px); in all five designs of that section.
3. "The credits (for example 3 credits) on Default and on the pay pages are not good: make them the same as the pay pages' size and style." One credits chip component, the same size, padding, icon and type everywhere it shows (Default greeting, Top up, Checkout, Paid headers).
4. Default's "Your last hit" card: change the overlay "Slo-mo replay", "Perfect punch", "999,999.000" to "Replay" (one label with the play button; the card stays a replay). In every design of that section.
5. "Machines near you does not work as a slider: make it a slider and let it move." A real horizontal carousel: scroll snap, drag and swipe, previous and next buttons, dots or a progress bar, keyboard; gently auto advancing when idle (paused on hover, focus and reduced motion). In every design of that section that is a strip; the others at least scroll.
6. "Remove the 2 waiting in the machine cards; no need." Remove the queue counts from every machine card on the phone.
Verify every change on both phones in the four looks with real clicks and drags.`

const PLAY = `
YOUR AREA: the phone's Play flow: Scan, Connect, the NEW Connected page, Punch. FILES: parts/mpage-scan.html, mpages/scan.*, parts/mpage-connect.html, mpages/connect.*, parts/mpage-connected.html, mpages/connected.css, mpages/connected.js, parts/mpage-punch.html, mpages/punch.*, and in mobile.js the scan, connect and punch code (Edit only).
The user's asks:
7. "In the Play page on mobile, 'Where you played' needs to change to the last punch at these machines." Retitle and reshape the Scan page's recent machines section: each machine with the player's last punch there (the score through PunchFormat, when, the venue photo), not just a visit list; five designs.
8. "Make a state, a new page for connected to the mobile application." Build the Connected page: the phone is linked to the machine (which machine: Dubai Mall, Level 2, by the ice rink, Machine 07), the credit held for this turn, and the next step (step up to the pad; the glass starts the count). Sections with five designs each (for example Linked, Machine, Next step). Wire the flow: Connect goes to Connected once linked, and Connected goes on to Punch by itself after about 2.5 s or on a tap; the empty wallet still goes to Top up first. "In the Play page of mobile, use the logo instead of the punch, it's better": on Connect and Connected (and the Punch page), show the chosen PunchApp logo (<img data-logo-img>) where the fist or punch icon sits today.
9. "In Punch: Dubai Mall connected, and it needs the logo for punch, and the text staying for 'Punch on the machine'." The Punch page shows a connected state (Dubai Mall, connected), the logo, and the line "Punch on the machine" stays on screen through waiting, the strike and reading (it never disappears).
Keep the whole flow working end to end (Default, Scan, Connect, Connected, Punch, the machine's 20 s count, the strike, Reading, record or result, Your hit), including the Animation tab's Start. Verify on both phones in the four looks.`

const PAY = `
YOUR AREA: the phone's pay pages and the NEW Payment failed page. FILES: parts/phone-pay.html, pay.css, pay.js, parts/mpage-failed.html, mpages/failed.css, mpages/failed.js.
The user's asks:
10. "Take 10 is not showing well in the custom pack: show it better when we reach it." When the custom stepper reaches the number where ten would cost less (nine), present the suggestion clearly: a short line with the saving and a clear secondary button "Take 10 for AED 70", laid out without crowding the stepper, in every packs design, both phones.
11. "Also a page for a failed payment, after Paid." Build Payment failed: what happened (the payment did not go through, nothing was charged), why in plain words (declined, cancelled, no connection), and what to do (Try again, which returns to Checkout with the same pack; Pay another way; Back to top up), with the credit not held. Sections with five designs each. Show it in the flow: from Checkout a failure path (for example a "Simulate a failed payment" link in the demo, or the saved card declining once) leads here. "In Paid, the CTA should use our punch logo": the Paid page's main call to action (Punch now) carries the chosen PunchApp logo (<img data-logo-img>) as its icon.
Verify on both phones in the four looks, and the flow Top up, Checkout, Paid and Top up, Checkout, Payment failed, Try again, Paid.`

const HIT = `
YOUR AREA: the phone's Your hit page. FILES: parts/mpage-hit.html, mpages/hit.css, mpages/hit.js, and in mobile.js paintHit and its helpers (Edit only).
The user's asks:
12. The header ("Dubai Mall, Level 2" above "Your hit"): "must have better space, and show the machine". Give the place line and the title the shared header rhythm, and show which machine (Machine 07, by the ice rink, with a small machine glyph or the venue photo) in every design of the header section.
13. "The strike in numbers: are they good or do we need better numbers? Search for it and add more if needed." READ the research: ${P}/docs/strategy/strike-in-numbers.md. Rebuild the section with the recommended numbers (units people understand, camera estimates labelled, example values consistent with the hit), five designs, and keep the rest of the page's sections working.
Verify on both phones in the four looks, decimals and all.`

const REELS = `
YOUR AREA: the phone's reels and the NEW Saved page. FILES: parts/mpage-reel.html, mpages/reel.css, mpages/reel.js, the reel code in mobile.js (Edit only), parts/mpage-saved.html, mpages/saved.css, mpages/saved.js, and the save buttons on feed posts and Your hit (Edit only in their files).
The user's asks:
14. "In reels the right side sizing and spacing are not good: align the icons and their labels vertically, even, with even spacing" (the rail of like 170, comment 18, share, and the three dots). One column, one icon size, the count or label centred under each icon, equal gaps, the three dots at the same size and rhythm, aligned to the overlay's bottom edge and the safe area.
15. "Reels have the complete (full) view and also a view of four items on screen, two in a row, and select one for full." Add a view switch (full and grid): the grid shows two columns, about four items on screen, each a video or still with the score and the player; tapping one opens the full view at that item; the endless scroll works in both.
16. "Save for later for this application and reels: create lists and more." A save button on each reel (and on feed posts and Your hit): tap to save to "Saved", long press or a second control to choose a list; create a new list (name it), rename, delete, move items between lists; the Saved page (Your hits group) shows the lists and their items (grid), opens an item in the reel; saved state is kept in localStorage per viewer.
Use the punch VIDEOS in assets/video/lib (manifest.json) in the reels (autoplay muted loops for the item in view, posters elsewhere), mixed with the photos. Sections with five designs each where new. Verify on both phones in the four looks with real clicks.`

const MACHINE_A = `
YOUR AREA: machine fixes (A). FILES: parts/mscreen-attract.html, mscreens/attract.*, parts/mscreen-scan.html, mscreens/scan.*, parts/mscreen-stats.html, mscreens/stats.* (Your run), and the Result screen's sections (sections/*, app.js SLOTS only where needed).
The user's asks:
- "The bar in the machine's leaderboard which changes the tab (Global, National, Dubai) needs a better design and radius." Redesign the switch in every design of that section: a clear segmented control readable from 3 m, the current tab obvious, the time left on each tab shown well, one consistent radius.
- "In the Scan page of the machine design ... yellow must change to red." Replace every yellow or gold accent on the Scan screen with the brand red (tokens, all four looks).
- "All the result tab pages have a Punch again button": every screen in the Results group (Result, Your run, Big score, New record) carries a Punch again call to action. On the Result it exists; add one to Your run (your files); Big score and New record get theirs from the other machine builder. On a glass with no touch it reads as a call to act (the next credit, scan to go again), styled like the Result's Punch again.
- "In results no need for the Slo-mo replay clips: just show others' punch history." Replace the Result screen's "Slo-mo replay clips" section (sections/clips.*) with "Recent punches": other players' punches at this machine (avatar or photo, name, score through PunchFormat, when), five designs, within the section's height budget; update its Customise label (app.js SLOTS) and keep the fit note clean.
Verify every design in the four looks at zoom 25 and close-ups, the embed.`

const MACHINE_B = `
YOUR AREA: machine fixes (B): Big score and New record. FILES: parts/mscreen-score.html, mscreens/score.*, parts/mscreen-record.html, mscreens/record.*.
The user's asks:
- "In New record and Big score, yellow must change to red." Every yellow or gold accent on both screens becomes the brand red (tokens, all four looks), keeping contrast.
- "The hit image is not an image, it's a video reel of the punch, which also autoplays." Wherever these screens show the hit as a photo, show a muted, looping, autoplaying video of the strike from assets/video/lib (manifest.json; pick clips that match the player, poster first, playsinline, preload metadata, paused and showing the poster under reduced motion), in every design of those sections, framed as the photos were (object-position from the manifest).
- "All the result tab pages have a Punch again button": add a Punch again call to action to Big score and New record, styled like the Result's Punch again, in its own section with five designs or as part of an existing section, without crowding the number.
Verify every design in the four looks at zoom 25 and close-ups, the embed, reduced motion; check the videos play in the embed too.`

const REVIEW_P = `
YOUR AREA: REVIEW AND FIX the phone after this round's builders, against the user's asks 1 to 16 (listed in the builders' logs: build/review/log-r9-*.md). Every page (Default, Scan, Connect, Connected, Punch, Top up, Checkout, Paid, Payment failed, Your hit, Reel, Saved, Leaderboard, Feed, Profile) on both phones in the four looks: headers aligned, spacing to the scale, the content clear of the tab bar, the credits chip one component, the flows end to end (Default to Your hit with a top up; a failed payment and a retry; saving a reel to a new list and opening it from Saved; the grid view to full), the Animation tab's Start. You may edit phone files with Edit. Fix the worst first, log each fix.`

const REVIEW_M = `
YOUR AREA: REVIEW AND FIX the machine after this round's builders: the leaderboard switch, the Scan screen's reds, Your run, Big score and New record with their videos and Punch again, the Result's Recent punches, every design in the four looks, the embed, reduced motion, the flow in the Animation tab (count, strike, Reading, record, result). You may edit machine files with Edit. Fix the worst first, log each fix.`

const DOCS = `
YOUR AREA: the design system (parts/ds.html, ds.css, ds.js), the brief drawer (parts/brief.html) and the case study (parts/case.html, case.*). Bring them up to date with this round: the Connected and Payment failed pages, Saved and lists, the reels grid, the strike in numbers (docs/strategy/strike-in-numbers.md and why), the machine's hit videos, the Recent punches section, Punch again on every result screen, the credits chip, the header rule (icon and title on one line), the machine at actual size. Retake the case study's stills of pages that changed (assets/case). Verify at 1440 and 390 in the four looks.`

const FINAL = `
YOUR AREA: the FINAL CHECK of the user's eighteen asks from this round, one by one, fixing what is not done (Edit only):
1 phone headers: icon and title on one level, content and tab bar spacing, everywhere; 2 the Default greeting spacing; 3 one credits chip like the pay pages'; 4 "Replay" on the last hit card; 5 Machines near you as a moving slider; 6 no queue counts on machine cards; 7 Scan's machines show the last punch there; 8 the Connected page and the logo on the Play pages; 9 Punch shows Dubai Mall connected, the logo and "Punch on the machine" throughout; 10 Take 10 shown well; 11 Payment failed after Paid, and the Paid CTA with our logo; 12 Your hit header spacing and the machine shown; 13 the strike in numbers from research; 14 the reel rail aligned and even; 15 the reels grid view (two in a row, four on screen) with tap to full; 16 save for later with lists; 17 the machine opens at actual size like the app; 18 the leaderboard switch redesigned, reds instead of yellow on Scan, New record and Big score, the hit as an autoplaying video, Punch again on every result screen, Recent punches instead of the slow motion clips.
Also sweep for console errors in every tab and on every page of both surfaces, and em or en dashes in visible text. End with a table of the eighteen asks: where each is answered and its state.`

const run = (log, label, prompt, phaseName, attempt = 1) =>
  agent(HOUSE.replace('LOG_FILE', log) + '\n' + prompt + '\nWHEN DONE reply with what you built or fixed (matching your log), what you verified, and anything left.',
    { label: attempt === 1 ? label : label + ' (retry)', phase: phaseName })
    .then((r) => (r || attempt > 1 ? r : run(log, label, prompt, phaseName, 2)))

async function pool(tasks, n, phaseName) {
  const out = new Array(tasks.length)
  let next = 0
  await Promise.all(Array.from({ length: n }, async () => {
    while (next < tasks.length) {
      const k = next++
      const t = tasks[k]
      out[k] = await run(t[0], t[1], t[2], phaseName)
      log(`${t[1]}: ${out[k] ? 'done' : 'no result'}`)
    }
  }))
  return out
}

const results = {}
const record = (tasks, out) => tasks.forEach((t, i) => { results[t[1]] = out[i] })
const S1 = [['log-r9-research.md', 'research: strike in numbers', RESEARCH], ['log-r9-videos.md', 'punch videos', VIDEOS], ['log-r9-phonebase.md', 'phone base and Default', PHONEBASE]]
phase('Prepare')
record(S1, await pool(S1, 3, 'Prepare'))
const S2 = [['log-r9-play.md', 'Play flow and Connected', PLAY], ['log-r9-pay.md', 'pay and Payment failed', PAY], ['log-r9-reels.md', 'reels, grid and Saved', REELS], ['log-r9-machine-b.md', 'machine: Big score and New record', MACHINE_B], ['log-r9-hit.md', 'Your hit', HIT], ['log-r9-machine-a.md', 'machine: leaderboard, scan, results', MACHINE_A]]
phase('Build')
record(S2, await pool(S2, 4, 'Build'))
const S3 = [['log-r9-review-phone.md', 'review: phone', REVIEW_P], ['log-r9-review-machine.md', 'review: machine', REVIEW_M], ['log-r9-docs.md', 'design system and documents', DOCS]]
phase('Review')
record(S3, await pool(S3, 3, 'Review'))
phase('Final')
results['final check'] = await run('log-r9-final.md', 'final check', FINAL, 'Final')
return results
