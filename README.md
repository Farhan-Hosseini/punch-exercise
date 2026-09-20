# Ring the Bell

A product design exercise for **PunchApp**: a boxing strength machine standing in Dubai Mall, and the app in the
player's pocket. The cabinet is a 1080 by 3840 portrait glass by the ice rink; the phone is the part you take home.
Presented as a task for Robotenc.

Everything here is real and running. There are no static mockups: the machine screens and the phone app are built as
live HTML, every screen is assembled from sections, and each section carries several designs you can switch between
while it runs.

## Run it

```bash
npm install
node tools/serve-showcase.mjs
```

Then open http://localhost:5770.

The top bar switches between four tabs: **Mobile app**, **Machine**, **Animation** and **Design system**. The brief
and the case study open from the top bar too. **Customise** (right) changes the design of any section on the screen
in front of you, and the choice survives a reload.

## What is in here

| Folder | What it holds |
|---|---|
| `showcase/` | The whole thing: the machine screens (`mscreens/`), the phone pages (`mpages/`), the result screen's sections (`sections/`), the design system, the brief and the case study. Plain HTML, CSS and ES modules, no framework. |
| `deliverables/` | What gets handed over: the two motion clips, their posters and GIFs, and the notes. |
| `tools/` | The harness. Headless Chrome over raw CDP: screen shooters, the two clip recorders, and verification checkers. |
| `docs/` | The strategy and the build briefs the work was planned from. |
| `build/` | Intermediate renders and verification output. Not in the repository; the tools rebuild it. |

## The two motion clips

Neither is a screen recording. Headless Chrome loads the showcase, takes the page's own clock
(`tools/vclock.mjs`) and steps it one frame at a time, so every frame is the instant it claims to be and the timing
is exactly what the screens play. Every Web Animation and every video is paused and seeked to the same virtual time.

- **The score reveal**, ten seconds on the glass: `tools/record-reveal.mjs`, cut by `tools/reveal-cut.mjs`.
- **The run**, seventeen seconds on the phone, from the code on the cabinet to the replay:
  `tools/record-run.mjs`, cut by `tools/run-cut.mjs`. The app plays the run itself; the recorder only starts the
  scan, taps the link and brings the strike forward, because a real turn waits five to twelve seconds for one.

## Design system

The design system is captured as live HTML and CSS. Every screen uses a shared library of sections, each with multiple design variants that can be switched in real time.

## Placeholder material

Photography is from Pexels, free to use and no attribution required, standing in for the cabinet camera and the
phone clips. Faces and handles are placeholders. No real venue, player or brand is depicted.
