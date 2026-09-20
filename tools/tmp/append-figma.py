import io
p = 'build/AUDIT.md'
s = io.open(p, encoding='utf-8').read()

note = ("\n> The area summaries above are the first-pass reviewers' own words, written **before** the refutation round.\n"
        "> Several claims in them did not survive it — in particular the XSS reviewer's claim of script execution from a\n"
        "> hostile manifest was refuted three separate times. Trust the confirmed list below over the summaries.\n")
s = s.replace("\n## Confirmed findings", note + "\n## Confirmed findings")

figma = """
## The Figma file

Checked page by page and component by component against the running site.

### It is in sync, and that is measurable

| | site | Figma |
|---|---|---|
| machine component sets | 37 | **37** |
| machine variants | 175 | **175** |
| phone component sets | 52 | **52** |
| phone variants | 255 | **255** |
| machine screens | 8 | **8** |
| phone screens | 14 | **14** |

Every set name maps one to one onto a page and section of the live app, with the same number of designs in each.
Broken instances: **0** across all 2,228 instances. Components without a description: **0**. Hidden leftover layers
outside deliberate variant states: **0**. Zero-size nodes: **0**.

### Fixed in this pass

- **`Machine / New record / Score / Reels` was badly broken.** Each digit window had been built the height of the
  rest of the reel strip below its digit rather than one digit tall (168 px), so the component's content ran to
  1,392 px inside a 720 px frame and the digits spilled across the canvas. The nine windows are now 168 and 84 px;
  the component reads 863,412.576 and its content bottom is exactly 720.
- **`Machine / Home / How it works / One line`** hung 48 px outside its own frame. The screen gives that design
  304 px and clips the rest; the frame was 352. Trimmed, and it now matches the live render crop for crop.
- Two empty zero-width text leftovers removed from `Machine / Result / Header / Title belt`.
- Four `Group 1000002658` import artefacts renamed, and 38 photo frames renamed from bare numbers to `Pexels <id>`
  so the provenance reads as the credit it is.
- Earlier in the session: the retired **Reference** look was still in the file as 55 text styles, 7 effect styles and
  5 `reference/*` variables, all unused — deleted — plus the Design system copy that described it, the mode labels
  that named modes the collections no longer have, and "Four looks" where there are two.

### Left alone, with reasons

- **Four sets have drifted from the site.** `Punch now / Count` is 1836 in Figma against 1827.6 live, `Big score /
  Video` 716 against 707.6, `New record / Video` 1036 against 1027.6 — the same 8.4 px each, which points at the
  spacing-ladder pass the site had after these were captured. Fixing them properly means re-running the
  capture-to-Figma pipeline for those sets, not nudging a number.
- **`Reading / Reading` cannot be pinned down.** It measured 3047.6 px in one pass and 2775.2 in another because the
  section animates; Figma's 2783 sits inside that range, so there is nothing to correct.
- **Five variants still overflow by 7-104 px.** In every case I measured, the live design does the same thing or the
  child clips internally, so they are faithful rather than wrong.
- **No text in the component library uses a text style** — 1,853 machine text nodes, none linked, against 63 styles
  in the file. This is not fixable mechanically: the components were built from measured rendered type, so their
  sizes are fractional (218.8 px, 147.1 px, 100.6 px) and not one of them matches a style exactly. The library is
  faithful to the site; the text styles document the ramp. Worth a decision, not a script.
- Colour is bound: 1,579 of 2,980 fill-bearing nodes carry a variable. Most of the rest is Monster Energy brand
  artwork and photo scrims, which should not theme.
"""
s = s.rstrip() + "\n" + figma
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('appended the Figma section')
