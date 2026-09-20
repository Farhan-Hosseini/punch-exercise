# Ring the Bell: what is in this package

**Figma file (view access):** https://www.figma.com/design/j1cOyUKz9Gys3njKSUve6L

Pages: Cover, Design system, Components, Machine Screens, Machine Variants, Mobile Screens, Mobile Variants.
Both surfaces are built natively, every layer a frame, text or vector and not one screenshot.

## Files

There are two clips, one for each surface: the score reveal on the Punch Machine, and one whole turn on the phone.

| File | What it is |
|---|---|
| `reveal-live-1080x3840.mp4` | **The clip to watch first.** The score reveal on the live Punch Machine as designed now, about 10 s at 60 fps: the last seconds of Punch now and the strike, Reading the strike, New record as the name at the top flaps over, then the Big score. Nothing but the panel is in frame, at its real size and aspect, so every component reads as it does on the cabinet. |
| `reveal-live-1080x3840-poster.jpg` | A still of the reveal, the moment the big score lands. |
| `run-live-1920x1080.mp4` | **The second clip.** One turn on the phone, about 17 s at 60 fps: home, the code on the cabinet, the link that holds a credit, the pad, the strike, the number landing in your hand and the replay ready to share. The phone stands at its own size beside the beat names. |
| `run-live-928x1960.mp4` | The same run with nothing around it, the phone at its own size, two device pixels to one point. |
| `run-live-960.gif`, `run-live-1920x1080-poster.jpg`, `run-live-928x1960-poster.jpg` | The run as a GIF and as stills. |
| `first-concept/` | The first concept's clips (the strength tester reveal, 7 s), kept as a record of where the design started. |
| `notes.pdf` | Half a page: decisions, what I would validate, what I pushed back on, and where AI was used. |
| `notes.md` | The same notes in plain text. |

## How the clips were made

Both live clips are frame-stepped captures of the showcase itself: headless Chrome takes the page's own clock, steps
it one frame at a time and saves every frame, and ffmpeg encodes them (H.264, crf 18), so what plays is exactly what
the machine panel and the phone draw. Every Web Animation and every video on the page is paused and seeked to the same
virtual time, so a frame is the instant it claims to be however long the capture takes.

The run is the app's own: the scan finds the machine, the link holds a credit, Connected sends the player to the pad,
the machine reads the strike and Your hit opens by itself. The recorder only starts the scan, taps the link and brings
the strike forward, because a real turn waits five to twelve seconds for it.

The first concept's reveal is a deterministic canvas scene rendered frame by frame from code, not a screen recording:
`render(t)` draws the instant `t`, so every exported frame is exactly the millisecond it claims to be, and the
timings in the storyboard are the timings in the file. One gravity constant, 12,557 px/s2 (half of real gravity at
the panel's 2.56 px per mm), drives the charge, the drop and the drain, so each duration comes out of a distance.

The QR code on screen is a real Version 2-Q code and decodes to `HTTPS://PNCH.APP/DXB2KTRBXMHN`, both in the clip
and in the Figma file.

## Placeholder material

Photography is from Pexels (free to use, no attribution required) and stands in for the cabinet camera, the run
stills and the phone clips. Faces and handles are placeholders. No real venue, player or brand is depicted, and
the punch bag wordmark visible in one stock photo is incidental to the stock image, not a partnership.
