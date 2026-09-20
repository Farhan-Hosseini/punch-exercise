# Build brief for the Figma file

Read this whole brief, then read the parts of the spec your task names. The spec is
`C:\Claude Database\punch-exercise\docs\strategy\06-spec-v2.md` (final, revision 2). Where this brief
and the spec disagree, **this brief wins**: it carries the lead designer's corrections.

## The file

- Figma file key: `aDk4RGbovg0KKhtUBokHjk` (URL https://www.figma.com/design/aDk4RGbovg0KKhtUBokHjk)
- Pages: `Cover`, `Machine 1080 x 3840`, `Phone 393 x 852`, `Motion storyboard`, `Brand and tokens`, `Flow`.
- Every page canvas is `#E4DFDC`. Never change page backgrounds.
- Existing nodes you must not move or delete:
  - `Brand and tokens`: board `4:2` (Supplied tokens, audited) at x 0 y 0, 2600 x 3420; section `9:37` (Placeholder photography) at x 0 y 3600.
  - `Phone 393 x 852`: component sets `8:28` (iOS / Status bar, variants Mode=dark|light) and `8:33` (iOS / Home indicator) at x -1200.
- Only touch nodes you created, plus the nodes your task names. Other agents are building in the same file at the same time. Never loop over and edit all children of a page.
- Before every `use_figma` call you must have loaded the figma-use skill (`get_figma_skill` with `skill://figma/figma-use/SKILL.md`). Pass `skillNames: "figma-use"`.

## Figma API traps (learned the hard way on this machine)

- **Fonts in Figma:** `Saira ExtraCondensed` style `Black` (no space in the family name). `Orbitron` styles `Black`, `Bold`. `Inter` styles `Bold`, `Semi Bold`, `Regular` (with a space). Load every font before touching text.
- **Letter spacing** `{ unit: 'PERCENT', value: 4 }` for +4%.
- **Baselines.** Figma positions text by its box, not its baseline. To put a baseline at canvas y B: create the text, read `absoluteRenderBounds` of a glyph with no descender (a digit or a capital), and move the node so the ink bottom sits at B (relative to the frame's absolute y). Do this for every large text. Record the offset once per style and reuse it.
- **Instance children cannot be repositioned** (`relative-transform` override error). Text `characters`, fills, visibility and variant properties ARE overridable. Anything whose position varies per frame (rail ticks, marks, lines) is drawn at frame level, not inside a component.
- `resize()` pins sizing to FIXED; re-set `primaryAxisSizingMode = 'AUTO'` afterwards if the frame should hug.
- `strokeAlign: 'INSIDE'` is covered by children that fill the frame; use rectangles for edges instead of strokes.
- Never use `array.forEach(async ...)`; use `for` loops with `await`.
- Colours are 0 to 1. Image fills: `{ type: 'IMAGE', imageHash: '<hash>', scaleMode: 'FILL' }`. The hashes are in `C:\Claude Database\punch-exercise\docs\figma-image-hashes.json` (already uploaded to this file; never upload photos again).
- `use_figma` code is plain JS with top-level await and `return`. Keep each call to a moderate amount of work and return the ids you created.

## Verification loop (mandatory, expect three or more cycles per frame)

1. After building a frame, call `get_screenshot` on it (maxDimension 1600 for a machine frame, 1200 for a phone frame), download the PNG with the curl command it gives you into `C:/gtmp/punch/fig/<your-label>-<frame>.png`, and **look at it with the Read tool**.
2. Then screenshot the dense zones at full size by screenshotting a child group or by a second screenshot of a sub-node (for example the Z3 run block, the plate, the phone nav) and look again. Small type is unreadable in a whole-frame shot; do not claim it is right without a close-up.
3. Check: overlapping or clipped text, text boxes overflowing their column, wrong fonts (Figma silently substitutes a missing font), baselines off, images not filling, anything the spec places that is missing, em or en dashes anywhere, numerals that should not be there.
4. Fix and re-screenshot. A frame is done only when a fresh screenshot shows it right. Re-screenshot after your last edit; never report from a stale image.

## Presentation conventions

- Annotation type: Inter. Frame labels sit above each frame: the state id and name in Inter Semi Bold (machine 64 px, phone 28 px) colour `#221E1D`, a second line in Inter Regular (machine 36 px, phone 18 px) colour `#685E5B` (for machine frames: `Numerals on the glass: N`; for phone frames: the one-line purpose). Label top = frame y - 190 (machine) or frame y - 84 (phone).
- Layer names say what things are, by zone: `Z0 Crown / integer`, `Z1 Plate`, `Z3 Run block / QR tile`, `Rail / notch`. No default names like `Rectangle 12`.
- **No em dashes or en dashes anywhere**: copy, layer names, labels, notes. Use "to" for ranges.
- Machine frames never contain a rounded corner (radius 0). Phone buttons radius 12.
- Nothing centred on the machine except the word KEPT in its tile.

## Machine page layout (`Machine 1080 x 3840`)

Frames are 1080 x 3840, fill `#0B0908`, clip content, named exactly by id and name, for example `M-06 Result, hero run of two`.

| Row | y | Frames left to right, x = 0, 1480, 2960, 4440, 5920, 7400, 8880, 10360, 11840, 13320 |
|---|---|---|
| Core flow | 0 | M-00 Zoning, M-01 Attract, M-02 Armed, M-03 Charge at apex, M-04 Landing, M-06 Result hero, M-06p Plain solo, M-07 All kept |
| Variants and faults | 4600 | M-02q Armed after queued credit, M-06t Hit the top, M-06r House record, M-06L Linked, M-06k Run of four two kept, M-08 Afterglow, M-09 Armed idle, F-01 No reading, F-03 No replay, F-04 Out of service |

Section headings: `Core flow` at x 0 y -560 and `Variants and faults` at x 0 y 4040, Inter Semi Bold 96 `#221E1D`.
The machine kit lives in a frame named `Machine kit` at x -4200 y 0 (width up to 3600).

## Phone page layout (`Phone 393 x 852`)

Frames 393 x 852, fill `#0B0908`, clip content, iPhone 16, 1x. Use instances of `8:28` (Mode=dark) at y 0 and `8:33` (Mode=dark) at y 818 on every frame except the App Clip card background, where the status bar stays dark mode too.

| Row | y | Frames, x = 0, 553, 1106, 1659, 2212, 2765, 3318, 3871, 4424 |
|---|---|---|
| Claim flow | 0 | P-00 App Clip card, P-01 Run claim, P-02 Your hit before keep, P-02 Kept, P-02 Keep for a friend sheet |
| App | 1200 | P-03 You, P-04 Hit detail, P-05 Hits feed, P-06 Boards, P-07 Machine page |
| States and sheets | 2400 | P-02 Kept by someone else, P-02 Code run out, P-04 Beat this sheet, P-04 Visibility sheet, P-07 Link sheet |
| Scroll | 3600 | P-03 You, full reel (393 x 2000) |

Section headings at x 0, y -160 / 1040 / 2240 / 3440: Inter Semi Bold 40. The phone kit lives in `Phone kit` at x -3000 y 1200.

## Lead designer corrections to the spec (apply these)

1. **Run code is `KTR BXM`**, not KTR BVM (V is outside the code alphabet). QR payload `HTTPS://PNCH.APP/DXB2KTRBXMHN`, Version 2-Q, 25 modules. The module path, in module units 0 to 25, is in `C:\Claude Database\punch-exercise\docs\qr-path-25.txt`: build one VECTOR node with `vectorPaths = [{ windingRule: 'NONZERO', data }]`, fill #000000, then `resize(425, 425)`. It must stay square with integer module size (17 px).
2. **Cast.** The glass never shows names. On the phone:
   - **Sara** `@sara.n` is the hero striker of 402,176.240 and the owner of the profile (P-02, P-03, P-04). Images: `replay_sara_3x4`, `live_sara_3x4` (already mirrored), `still_sara`, `p02_sara_3x4`, `p04_sara_9x16`, `best_sara_3x4`, `thumb_sara_a`, `thumb_sara_b`, `blur_sara`, `avatar_sara`.
   - **Omar** `@omar.h` is the friend, run hit 1 (318,540). Images `still_omar`, `blur_omar`, `card_omar`, `avatar_omar`.
   - Others for feed, boards and machine page: Lina `@lina.k` (`card_lina`, `still_lina`), Noor `@noor.a` house record holder (`record_noor`, `card_noor`), Karim `@karim` (`card_karim`, `attract_karim_3x4` for the attract loop), Yusuf (`pair_yusuf`, `still_yusuf`), Maya (`pair_maya`), Hana (`pair_hana`), Leila (`tile_leila`), Rami, Zayd, Adam (avatars only).
   - Replace spec strings that name Rami or Sara in the wrong role: P-03 nav `@sara.n`; crew line `You've played in three runs with Omar. Add Omar to your crew?`; social proof `Omar and Lina felt it.`; Beat this sheet title `Beat Omar's hit` and body `That score becomes a mark on your rail at the next machine you link. It lasts a week.`; feed subline `Sara, Omar and Lina played`; notifications `Omar has a new hit at Dubai Mall.` and `Lina challenged you at Dubai Mall.`. No gendered pronouns in UI copy.
   - Run of four (M-06k): stills in order Omar, Sara, Lina, Yusuf; Omar and Sara kept (white 16%).
3. **Real photos, not grey silhouettes.** The spec's grey placeholders were for the clip only. Frames use the Pexels photos above. Every face except the striker's own must be blurred on phone screens before a keep: use the `blur_*` images on P-01 and apply a `LAYER_BLUR` effect (radius 24) to other blurred imagery.
4. **Replay framing.** The Z2 replay image fills 912 x 1216 with `replay_sara_3x4` (FILL). The Armed live camera uses `live_sara_3x4`.
5. **Numbers.** Keep the spec's example numbers. Integer cells: six 138 px cells plus an 84 px comma cell starting at x 104; digits centred in cells; Saira ExtraCondensed Black 344 px; baseline 352. Decimals: three 48 px cells and a 29 px point cell, 120 px, white 64%, right edge at x 1016, baseline 478.

## Machine kit (components the machine agents reuse)

Owned by the kit agent; other machine agents create instances only and never edit the kit.

- `Score / Integer 344`: 912 wide frame, seven fixed cells (`cell-1` to `cell-7`, cell-4 is the 84 px comma cell), each a fixed-width frame with a centred TEXT child. Component description states the cell maths.
- `Score / Decimals 120`: four cells (point cell first).
- `Plate` component set, 1080 x 140, variants `State` = Plain, Run leader, Today's best, Hit the top, House record (ink-950 plate), Phone linked, Reading, No reading (8 px #FFAB00 top edge), Nobody yet, Empty. Each has: fill per spec 4.2, `Plate / top edge` 4 px white 40% (a rectangle, not a stroke), `Plate / bell edge` 12 px #FFFFFF at the bottom (y 128 to 140), label TEXT at x 136 with its baseline at y 114 inside the plate, and a `Score / Decimals 120` instance right-aligned to x 1016 with baseline at y 114. Label and decimals visible per variant.
- `QR / Run code`: 561 x 561 tile #D9D9D9, the 425 px vector at 68, 68.
- `Run still`: 96 x 128, variants `Edge` = None, Top of run (6 px white top edge), Current hit (6 px #EB1110 top edge), Kept (image layer at 16% opacity). The image layer is a child rectangle named `image` whose fill instances override.
- `Machine / Ground`: 1080 x 3840 with the ink-950 fill, the rail track (x 16 to 64, y 504 to 3720, white 16%) and the Z6 base strip (y 3720 to 3840, #5E0606). Frames place this instance first.
- `Z2 / Tab`: auto layout, 16 px horizontal padding, height 64, fill black 70%, Orbitron Bold 40 +4% white.
- `Z4 / Payment line`: Inter Bold 48 white text plus a 64 px arrow 24 px after the text, pointing up and to the right toward the reader on the cabinet's right side.
- Text styles, prefixed `Machine/`: Score integer, Score decimals, Prompt 160, Out of service 120, Headline 104, Run headline 72, KEPT 104, Plate label 64, Code 52, Mark label 40, Tab 40, Payment 48, Notice 40, Column 36.

## Phone kit (owned by the phone kit agent)

- Text styles prefixed `Phone/` from spec 3.4.
- Components: `Button / Primary` (353 x 52, #EB1110, radius 12, Inter Bold 17 white), `Button / Secondary` (353 x 48, 1.5 pt white 40% stroke drawn OUTSIDE, radius 12), `Button / Text`, `Plate / Phone` (393 x 48 and 56 variants: label Orbitron Black 15 +6%, decimals Saira ExtraCondensed Black 40 white 64%, 2 pt top edge white 40%), `Score / Phone` cell rows for 128, 104, 88, 56, 32 pt (cell and comma widths from spec 3.4), `Tab bar` (Hits, Machines, Boards, You; 49 pt + home indicator; active tab white, others 64%), `Avatar` (circle, image fill), `Faces stack` (24 pt, overlap 8), `Scrim` gradients.

## Where every copy string comes from

Spec section 13 is the copy bank, with the corrections above. Never invent copy. If a string overflows its column, rewrite it shorter and report the rewrite; never shrink the type.

## What to return

A short report: the node ids of every frame and component you made, any spec rule you could not satisfy and why, every copy rewrite, and the absolute paths of your final screenshots.

---

## Resuming an interrupted build (read this before you create anything)

An earlier run of this build was cut off part way. The file already contains work. **Never create a second
node with a name that already exists.** Before you build a frame, open your page with
`setCurrentPageAsync` and list `page.children` (a page's children only load once it is the current page,
so a script that skips this will wrongly report the page as empty).

Already built and verified, do not rebuild:

| Page | Nodes |
|---|---|
| Cover | `Cover` 17:94 |
| Machine 1080 x 3840 | `Machine kit` 11:22 (all components and Machine/ text styles), `Section heading / Core flow` 18:42, `M-01 Attract` 18:43, `M-02 Armed, first hit of a run` 20:75, `M-06 Result, hero run of two` 21:135, and their labels |
| Phone 393 x 852 | `Phone kit` 14:2 (all components and Phone/ text styles), iOS sets 8:28 and 8:33, `P-00 App Clip card` 22:174, `P-01 Run claim` 23:54, `P-02 Your hit before keep` 24:101, `P-02 Kept` 25:194, `P-02 Keep for a friend sheet` 26:173, `P-02 Kept by someone else` 26:453, `P-02 Code run out` 26:506, and their labels |
| Motion storyboard | `Board / Score reveal, frame by frame` 16:348 (built by the lead designer, leave it alone) |
| Brand and tokens | `Board / Supplied tokens, audited` 4:2, `Assets / Placeholder photography` 9:37 |

**Half-built frames left by agents that were cut off.** These exist but were never finished or verified:
`M-03 Charge at apex` 28:488, `M-08 Afterglow` 28:422, `M-09 Armed idle` 28:571, `F-01 No reading` 28:669.
If one of these is in your task: audit it against the spec, finish it, and fix anything wrong. Do not
create a new frame beside it. If you find two frames with the same name, keep the more complete one and
delete the other.

The 35 text styles in the file (Machine/ and Phone/) are the kits' styles. Reuse them. Do not create styles
with the same names.

## Kit facts you need (measured in Figma by the kit agent)

**Machine components** (page `Machine 1080 x 3840`, frame `Machine kit` 11:22). Instance them, never edit them.
Every component carries a description with its own usage notes; read them with a read-only script.

| Component | id | Notes |
|---|---|---|
| Machine / Ground | 14:96 | Place first at 0,0. Holds `Rail / track` and `Z6 Base strip`. Override the base strip fill to #EB1110 for the impact flare. |
| Score / Integer 344 | 12:2 | Place at x 104, y 0: baseline lands at 352. Children `cell-1` to `cell-7`; cells hold TEXT `digit`, `cell-4` holds `comma`. Ghost cells: set every text to 0 or , at white 8% (18% during the hang). Keep it above the plate in z order so the comma tail overlaps. |
| Score / Decimals 120 | 12:17 | 173 x 102, baseline is its bottom edge. Already inside every Plate variant. |
| Plate (set) | 13:152 | Variant `State` = Plain, Run leader, Today's best, Hit the top, House record, Phone linked, Reading, No reading, Nobody yet, Empty. Place at x 0, y 364. Children `Plate / fill`, `/ top edge`, `/ fault edge`, `/ bell edge`, `label`, `decimals`. |
| QR / Run code | 14:94 | 561 x 561 tile with the 425 px vector. |
| Run still (set) | 15:64 | 96 x 128, variant `Edge` = None, Top of run, Current hit, Kept. Override the IMAGE fill of the `image` child. |
| Z2 / Tab | 15:65 | Auto layout tab for YOU'RE ON CAMERA and SLOW MOTION. |
| Z4 / Payment line | 15:67 | Inter Bold 48 plus the arrow. Measured widths with arrow: to play 667, to go again 770, to take a turn 820, Add a credit to go again 656, Add a credit to take a turn 706. |

**Text placement.** Figma positions a text box, not a baseline. Box y = baseline minus the offset below.
Box x = the column edge (104, 136 or 696). Use `textAutoResize = 'WIDTH_AND_HEIGHT'`.

Score integer 292, Score decimals 102, Prompt 160: 141, Out of service 120: 106, Headline 104 (line pitch 112): 96,
KEPT 104: 92, Run headline 72: 64, Plate label 64: 57, Code 52: 46, Mark label 40 and Tab 40: 35, Payment 48: 46,
Notice 40: 40, Column 36: 36. Worked examples: a 104 headline at baselines 2560 and 2672 goes at box y 2464;
the notice at 2828 and 2878 at 2788; the code at 2441 at 2395; a column line at 2208 at 2172; HIT IT at 1720 at 1579.

**Machine text style ids** (apply with `await text.setTextStyleIdAsync(id)` after loading fonts):
Score integer `S:c8c77971fe22b4d66d6d7721ca25257e6ee2b040`, Score decimals `S:dd78c9e9a6d43d8469c365c9f9a858b50328fad1`,
Prompt 160 `S:e98d22fde50af0181e36e6cc289da4bde383c11f`, Out of service 120 `S:dc9792a2cad54e63402fb5c42c08e03edd635b74`,
Headline 104 `S:d88b9757b35af87f2ff3de4af294477108a2dcd1`, Run headline 72 `S:5eb36bfed33297a7e5b1ec673ea56bcf1d295c43`,
KEPT 104 `S:6e24f33f13b7b8a4be103bce6255ae6afc78ef2a`, Plate label 64 `S:340d4bf2319bab51dcc627431b84da1ccef41714`,
Code 52 `S:633412f247a2d68558aaec62682655a0d9f7cb1d`, Mark label 40 `S:fcd8b67fc43a1b867774a86b2436a2047c5e60dd`,
Tab 40 `S:83a3a200dc1cb3693bd6fbe2ee7ab6ae9733a148`, Payment 48 `S:85b17c7c525063be42136bf3a05dc59d4730056f`,
Notice 40 `S:251bb406831b6b29870a06b386eb9d2310934cef`, Column 36 `S:253e0de9fbf8bdb10dec7bd1340259ebe737345b`.

**Rail, drawn at frame level, never inside the Ground instance:** charge fill #EB1110 (x 16 to 64, from the apex y
down to 3720), notch 56 x 16 white at x 12 centred on the apex y, today tick 48 x 8 white 64% at x 16 centred on 1384,
run ticks 48 x 16 at x 16 centred on each mark (white 40%, the run's top tick white 100%), challenge ticks #D842D3,
gap segment 48 wide white 40%.

**Phone components** (page `Phone 393 x 852`, frame `Phone kit` 14:2): Button / Primary 15:4, Button / Secondary 15:6,
Button / Text 15:8, App icon 15:10, Plate / Phone 15:87 (variants Size=56/48 x Fill=Ink 900/Red; properties Label, Decimals,
Show label, Show decimals), Score / Phone 15:163 (variants Size=128/104/88/56/32; cells hold TEXT `digit` and `comma`;
instance y = baseline minus 109 / 88 / 75 / 47 / 27), Tab bar 16:268 (variants Active=Hits/Machines/Boards/You, place at 0,769;
it carries its own home indicator), Avatar 16:277 (Size=24/32/36/44), Faces stack 16:303 (Faces=2/3), Scrim 16:307
(Type=Bottom 0 to 70 / Flat 40 / Flat 70), Claim tile 16:346 (Kept=No/Yes). Phone text styles are named `Phone/...`;
box top to baseline: Large title 34 = 33, Title 28 = 27, Sheet title 22 = 22, Body 17 = 17, Secondary 15 = 15, Meta 13 = 14,
Plate label 15 = 16.

**Open P-02 Your hit before keep (24:101) and M-06 (21:135) as your reference frames.** Match their construction.
