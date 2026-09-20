export const meta = {
  name: 'strike-design-strategy',
  description: 'Judge panel of five senior-designer takes on the arcade score-to-phone brief, scored by three judges, synthesised into a build spec, then adversarially refuted and revised',
  phases: [
    { title: 'Interrogate', detail: 'brief and token audit' },
    { title: 'Propose', detail: 'five independent design directions' },
    { title: 'Judge', detail: 'three lenses score all five' },
    { title: 'Synthesise', detail: 'one numeric build spec' },
    { title: 'Refute', detail: 'three skeptics attack the spec' },
    { title: 'Revise', detail: 'final spec' },
  ],
}

const BRIEF = String.raw`C:\Users\Farhan Hosseini\Downloads\product-designer-challenge.md`

const CONTEXT = `
You are working on a senior product designer take-home exercise. Read the brief first with the Read tool: ${BRIEF}
It describes a physical arcade strike machine (1080 x 3840 portrait screen, 1.5 m tall panel) paired with a mobile app, and asks for the experience from the end of an attempt through to the player's phone. Deliverables: a Figma file (frames at stated sizes), one 5 to 10 second motion clip of the score reveal on the machine, and half a page of notes.

Company context (confirmed from the candidate's earlier client work in C:\\Claude Database\\punchapp, read README.md and docs/SPEC.md there if useful, and LOOK at figma-ref/s4_leaderboards.png and figma-ref/s6_more.png with the Read tool): the company is PunchApp, a punch-force arcade machine startup. Their existing app shows scores like "987654.321 Score", has a vertical video feed of punches with views/likes/comments counters, a leaderboard with Global / National / Regional tabs and a top-three podium with avatars, tokens for wins, crews, and a "Record Holders" row (Home, Nearest City, Country, World). Their landing page is Poppins/Inter, red #eb1110, dark and light slabs, gym photography. The brief's tokens use Orbitron and the same red. The candidate must NOT copy the existing app; they must design something better and say what they changed.

Hard constraints for every proposal (these are the candidate's own rules, learned from their reviewers):
- No em dashes or en dashes anywhere in copy. Use a full stop, a comma, or a hyphen.
- Avoid the tells of AI-made design: pill eyebrows with dots on every section, rows of identical stat cards, gradient-filled headline words, everything centred, N identical cards in a perfect grid, uniform decoration. Vary rhythm, leave one deliberate editorial moment, keep one alignment logic per screen.
- Numerals discipline: the score is the one number that matters. Every other numeral on a screen (ranks, deltas, counters, timers) must earn its place; do not cover the screen in figures.
- Design for NO touch as the base case (the brief's placeholder "[IS / IS NOT]" was left unfilled; the player has just used both hands; the screen is 1.5 m tall so the top is out of reach anyway). Touch may be an enhancement, never a requirement. Nothing may depend on audio.
- The machine runs unattended all day with a queue behind the player. Nothing may block the next attempt. Privacy and expiry of the handoff matter.
- Be specific and buildable: pixel zones on the 1080 x 3840 canvas, type sizes in px, timings in ms, exact copy strings. Vague adjectives are worthless.
`

const PROPOSAL_SCHEMA = {
  type: 'object',
  properties: {
    concept: { type: 'string', description: 'Two to four word name for the direction' },
    thesis: { type: 'string', description: 'One paragraph: the single idea everything hangs from' },
    machine_flow: { type: 'string', description: 'Markdown. Every machine state from the strike landing to the idle return, in order, with duration, purpose, vertical zoning in px (0 = top of the 3840 canvas), the elements in each zone with type sizes, and the exact copy strings. Say how each state ends (timer, event).' },
    reveal_motion: { type: 'string', description: 'Markdown. A timeline in ms for the 5 to 10 s score reveal clip: what moves, from where to where, easing, and the physical logic (weight, anticipation, impact, settle). Say what the big number does and why it reads as an event.' },
    handoff: { type: 'string', description: 'Markdown. Exactly how the attempt gets onto the phone, including the primary path, the fallback when the scan fails or the player has left, what the machine shows once the claim succeeds, expiry and privacy rules, and what a player who already has the app experiences.' },
    go_again: { type: 'string', description: 'Markdown. The mechanic that turns one attempt into three, and how the screen sells it to the player AND to the group behind them. Be honest about what is manipulative and what is motivating.' },
    phone: { type: 'string', description: 'Markdown. Platform and frame size, the information architecture, and each screen: profile and reel (score, video, when, where), the social layer, reactions, and what makes players feel connected to the people who use these machines.' },
    competition: { type: 'string', description: 'Markdown. Where "who is the best" lives, per surface, and why.' },
    brand: { type: 'string', description: 'Markdown. What you keep, extend, replace or argue against in the supplied tokens (fonts, colours, neutrals, opacity colours, missing scales), with reasons tied to the physical screen and the phone.' },
    detail_touches: { type: 'string', description: 'Markdown list of the small, specific touches an evaluator would notice as attention to detail.' },
    pushback: { type: 'string', description: 'Markdown. What in the brief you would push back on, what you would validate with users, and the questions you would have asked.' },
    risks: { type: 'string', description: 'Markdown. Where this direction is most likely to fail.' },
  },
  required: ['concept', 'thesis', 'machine_flow', 'reveal_motion', 'handoff', 'go_again', 'phone', 'competition', 'brand', 'detail_touches', 'pushback', 'risks'],
}

const ANGLES = [
  { key: 'spectacle', angle: 'SPECTACLE FIRST. You are a motion and broadcast-graphics designer. The reveal is a stadium moment on a 1.5 m tall column seen from 1 m and from 4 m. Use the height. Think physical: weight, impact, recoil, settle. The number must land, not appear. Everything else serves the moment.' },
  { key: 'queue', angle: 'THE GROUP AND THE QUEUE. You are a designer who has stood next to these machines for a week. Players come in groups; the striker has an audience; the next player is already deciding. Design the machine as a stage that speaks to the striker AND the four people behind them, and turn group dynamics into the second and third attempt.' },
  { key: 'retention', angle: 'THE PHONE IS THE PRODUCT. You are a growth-minded product designer. The machine is a funnel into the app. Be ruthless about the handoff (App Clip and Instant App, QR, NFC, claim codes, a find-yourself fallback), the first thirty seconds in the app, the reel, the social layer, and the reasons to come back to a machine next weekend.' },
  { key: 'operator', angle: 'HARDEST TO GET WRONG. You are the most conservative senior designer in the room and you have shipped unattended kiosks. No touch, no audio, a queue, privacy, expiry, failure states, a machine that never blocks. Every state must be robust when the player walks off mid-way, when two friends scan the same code, when the network drops, when the score is 0 and when it is 999,999.000. Only then make it exciting.' },
  { key: 'literal', angle: 'READ THE BRIEF MOST LITERALLY. You are the hiring manager who wrote this brief. Go line by line through "What to design", "Constraints", "Brand" and "What we are evaluating" and design exactly what scores highest on each of the six evaluation bullets. Audit the design tokens line by line (duplicate values, missing scales, the font choice for a phone UI, the collision between brand red and error red) because "attention to detail" is being scored.' },
]

const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    scores: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          concept: { type: 'string' },
          reveal_exciting: { type: 'number' },
          uses_the_screen: { type: 'number' },
          motion_weight_timing: { type: 'number' },
          handoff: { type: 'number' },
          brand_thinking: { type: 'number' },
          attention_to_detail: { type: 'number' },
          business_three_attempts_and_install: { type: 'number' },
          total: { type: 'number' },
          verdict: { type: 'string' },
        },
        required: ['concept', 'reveal_exciting', 'uses_the_screen', 'motion_weight_timing', 'handoff', 'brand_thinking', 'attention_to_detail', 'business_three_attempts_and_install', 'total', 'verdict'],
      },
    },
    winner: { type: 'string' },
    grafts: { type: 'string', description: 'Markdown: the specific ideas from the losing proposals that must be grafted onto the winner, and why' },
    kill_list: { type: 'string', description: 'Markdown: ideas across all proposals that must NOT make it into the final, with the reason' },
  },
  required: ['scores', 'winner', 'grafts', 'kill_list'],
}

const LENSES = [
  { key: 'hiring', lens: 'You are the senior product design hiring manager who wrote the brief. Score each proposal 1 to 10 on each of the six evaluation bullets plus the business goal. Be harsh: a 10 means you would forward it to the founders today. Penalise vagueness, decoration, and anything that reads as made by a template. Reward decisions that show the designer understood the physical context (a 1.5 m column, a queue, both hands just used, no audio).' },
  { key: 'craft', lens: 'You are a motion and visual craft director (broadcast graphics, arcade cabinets, sports scoreboards). Score every proposal, weighting the reveal, the composition on a 1080 x 3840 panel viewed from 1 m and 4 m, and whether the motion has weight and timing or is just movement. Check the maths: can the six digits actually be big enough in a 1080 px wide column with the proposed typeface? Penalise counting-up clichés unless they are done with a physical logic.' },
  { key: 'product', lens: 'You are a product lead who owns the revenue metric: attempts per player and installs per session. Score every proposal on whether it will actually produce three attempts and an install from walk-up mall traffic in groups, whether the handoff survives real conditions (bad light, cracked phones, no signal, the player already walking away), and whether the social layer would make anyone open the app on a Tuesday. Flag anything that is dark-pattern manipulative.' },
]

const SYNTH_SCHEMA = {
  type: 'object',
  properties: {
    spec: { type: 'string', description: 'The complete build specification as markdown' },
    open_questions: { type: 'string', description: 'Markdown list of decisions the candidate must still make or state as assumptions' },
  },
  required: ['spec', 'open_questions'],
}

const REFUTE_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          where: { type: 'string' },
          problem: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['severity', 'where', 'problem', 'fix'],
      },
    },
    upstream_decision: { type: 'string', description: 'If several findings share one upstream cause, name the single decision that should change instead of patching each' },
  },
  required: ['findings', 'upstream_decision'],
}

phase('Interrogate')
const interrogatorP = agent(`${CONTEXT}

Task: interrogate the brief and audit the design tokens before anyone designs. Read the brief file. Produce markdown with these sections:
1. Every ambiguity or unfilled placeholder in the brief, and the assumption a senior designer would state for each (for example the "[IS / IS NOT]" touch placeholder).
2. A line-by-line audit of the design tokens: duplicate values, gaps in scales, a font token used for both display and UI, colour collisions (brand red versus supportive red), the white-based opacity colours implying a dark base, anything missing for a 3840 px tall screen (type scale, motion scale, surface scale). Quote the exact token names.
3. The physical maths: viewing distance 1 to 1.5 m for the player and 3 to 4.5 m for spectators; the panel is 1.5 m tall for 3840 px (2.56 px per mm); minimum readable cap heights at each distance; how big six digits plus a separator plus three decimals can be in 1080 px with Orbitron 900 versus a condensed heavy face (estimate glyph advance widths as a fraction of the em); where a QR code must sit in mm from the floor if the panel bottom is at roughly 0.5 m, and how large it must be to scan from 1 m.
4. What a hiring panel is really evaluating with each of the six bullets, and the trap under each one.
5. Questions the candidate should have asked (the brief says questions are welcome).
Return the markdown as your final text.`, { label: 'interrogate:brief', phase: 'Interrogate' })

phase('Propose')
const proposals = await parallel(ANGLES.map(a => () =>
  agent(`${CONTEXT}

Your angle: ${a.angle}

Produce a complete, specific design proposal for the whole exercise (machine states, reveal motion, handoff, go-again, phone app, competition, brand, detail touches, pushback, risks). Numbers, px, ms, exact copy. Take a position on typography for the hero score: measure whether Orbitron 900 six digits fit at a size that reads from 4 m in a 1080 px column, and if not, what you would do about it and how you would justify that to the brand owner. Name your concept.`, { label: `propose:${a.key}`, phase: 'Propose', schema: PROPOSAL_SCHEMA })
))
const live = proposals.filter(Boolean)
const EXTRA_FILES = (args && Array.isArray(args.extraFiles)) ? args.extraFiles : []
const EXTRA_NOTE = EXTRA_FILES.length ? `

# Additional proposals on disk
Read each of these files with the Read tool and treat every one exactly like the proposals above: score it, consider it for the winner, the grafts and the kill list. If a file duplicates a proposal already listed above (same concept and content), score it once and say so.
${EXTRA_FILES.map(f => '- ' + f).join(String.fromCharCode(10))}` : ''
log(`${live.length} generated proposals plus ${EXTRA_FILES.length} proposal files`)
const interrogation = (await interrogatorP) || '(interrogation unavailable)'

const proposalsMd = live.map((p, i) => `## Proposal ${i + 1}: ${p.concept}\n\n**Thesis.** ${p.thesis}\n\n### Machine flow\n${p.machine_flow}\n\n### Reveal motion\n${p.reveal_motion}\n\n### Handoff\n${p.handoff}\n\n### Go again\n${p.go_again}\n\n### Phone\n${p.phone}\n\n### Competition\n${p.competition}\n\n### Brand\n${p.brand}\n\n### Detail touches\n${p.detail_touches}\n\n### Pushback\n${p.pushback}\n\n### Risks\n${p.risks}`).join('\n\n---\n\n')

phase('Judge')
const judgements = (await parallel(LENSES.map(l => () =>
  agent(`${CONTEXT}

${l.lens}

Here is the brief interrogation and token audit for reference:
${interrogation}

Here are the ${live.length} proposals:
${proposalsMd}${EXTRA_NOTE}

Score all of them. Name the winner. List the grafts (ideas from losers that must be carried into the final) and the kill list (ideas that must not survive, with reasons).`, { label: `judge:${l.key}`, phase: 'Judge', schema: JUDGE_SCHEMA, effort: 'high' })
))).filter(Boolean)
log(`${judgements.length}/${LENSES.length} judgements returned`)

const judgementsMd = judgements.map((j, i) => `## Judge ${i + 1} (${LENSES[i] ? LENSES[i].key : 'lens'})\n\nWinner: ${j.winner}\n\n${j.scores.map(s => `- ${s.concept}: total ${s.total} (reveal ${s.reveal_exciting}, screen ${s.uses_the_screen}, motion ${s.motion_weight_timing}, handoff ${s.handoff}, brand ${s.brand_thinking}, detail ${s.attention_to_detail}, business ${s.business_three_attempts_and_install}). ${s.verdict}`).join('\n')}\n\n### Grafts\n${j.grafts}\n\n### Kill list\n${j.kill_list}`).join('\n\n---\n\n')

phase('Synthesise')
const synthPrompt = (extra) => `${CONTEXT}

You are the lead designer writing the single build specification the candidate will now execute in Figma, in a canvas-rendered motion clip, and in half a page of notes. You have the brief interrogation, five proposals and three judgements. Take the winner, graft the judges' grafts, obey the kill lists, resolve conflicts with your own senior judgement, and write ONE coherent spec. Everything must be buildable by someone who did not read the proposals.

${extra}

The spec must contain, in this order, with exact numbers:
1. The concept in one paragraph and the three sentences the candidate would say in the interview.
2. Physical model of the screen: px zones (0 to 3840 from the top) named by who they serve (spectator zone, player zone, hand zone), with the reasoning in mm and viewing distance.
3. Type system: display face for the hero score and every other role, with sizes in px per role on the machine, and a separate mobile type ramp. If the hero score does not use Orbitron, say exactly why with the width maths, and how Orbitron is still the brand voice.
4. Colour and surface system built from the supplied tokens plus what is added or replaced, hex values, with the reason for each change. Include tier or band colours if bands exist.
5. Machine states, in order, each with: name, trigger, duration, exit, a vertical layout table (zone, y range, element, size, colour, copy). Include the claimed-on-phone acknowledgement state and the state where the group is addressed. Include what happens if nobody acts.
6. The reveal motion clip spec: total length between 5 and 10 s, a timeline table in ms (t, element, from, to, easing, duration, note on physical logic), including impact, the digit landing logic, the tier or band stamp, the settle, and the transition into playback plus handoff. Specify shake amplitudes in px, overshoot, and hold times.
7. Handoff: primary path, secondary path, fallback path, expiry, privacy rules, claim acknowledgement, and the already-installed path. Include QR size in px on the 3840 canvas and its y position.
8. Phone: platform and frame size, IA, and a per-screen spec for 5 to 7 screens (claim / first run, profile, reel and attempt detail, feed, reactions, leaderboards, crew or venue). For each: purpose, layout top to bottom, copy, the one detail that shows craft.
9. Competition placement per surface with the reason.
10. Brand: the list of changes to the supplied tokens with the reason for each, in the form the candidate will put in the notes.
11. Attention-to-detail touches (a checklist the builder must include).
12. The notes: a draft of the half page (decisions and why, what to validate with users, what to push back on, where AI tools were used and what was changed afterwards, written as a placeholder the candidate must edit to be truthful).
13. Copy bank: every string on every machine state and phone screen, final wording, no em or en dashes, checked.
Write it as markdown in the "spec" field. Put anything unresolved in "open_questions".`

const synth1 = await agent(`${synthPrompt('')}

# Brief interrogation
${interrogation}

# Proposals
${proposalsMd}${EXTRA_NOTE}

# Judgements
${judgementsMd}`, { label: 'synthesise:v1', phase: 'Synthesise', schema: SYNTH_SCHEMA, effort: 'high' })
if (!synth1) throw new Error('synthesis failed')

phase('Refute')
const SKEPTICS = [
  { key: 'physical', lens: 'You have built arcade cabinets and digital signage. Attack the spec on physical grounds: legibility at distance, glyph widths versus the 1080 px column, QR scanning geometry and reflections, the panel height versus a human, unattended reliability, what a queue actually does, glare in a mall, timeouts, the player who walks off. Check every px and mm figure by recomputing it.' },
  { key: 'user', lens: 'You are a behavioural researcher who has watched hundreds of walk-up players in groups. Attack the spec on human grounds: will the group actually read this, will anyone scan, is the go-again mechanic motivating or manipulative, is the social layer something a real person opens on a Tuesday, is the copy something a mall crowd understands in two seconds, does the reveal feel earned when the score is low.' },
  { key: 'panel', lens: 'You sit on the hiring panel and you are tired of polished decks. Attack the spec on evaluation grounds: does the reveal read as an event or a readout, does the composition use the panel or just centre things, does the motion have physical logic, is the handoff a real solution or a QR with a story, are the brand changes argued or asserted, is any of it template-like or AI-looking (uniform cards, pill eyebrows, gradient words, everything centred), is the numerals discipline respected, are there em dashes.' },
]
const refutations = (await parallel(SKEPTICS.map(s => () =>
  agent(`${CONTEXT}

${s.lens}

Here is the specification. Try to break it. Quote the exact part you attack. Default to reporting a problem only if you are confident it is real; do not pad. Findings sorted by severity, each with a concrete fix. Then name the single upstream decision, if any, that would dissolve several findings at once.

${synth1.spec}

Open questions the synthesiser left:
${synth1.open_questions}`, { label: `refute:${s.key}`, phase: 'Refute', schema: REFUTE_SCHEMA, effort: 'high' })
))).filter(Boolean)
const refutationsMd = refutations.map((r, i) => `## Skeptic ${i + 1} (${SKEPTICS[i] ? SKEPTICS[i].key : ''})\n\nUpstream decision: ${r.upstream_decision}\n\n${r.findings.map(f => `- [${f.severity}] ${f.where}: ${f.problem}\n  Fix: ${f.fix}`).join('\n')}`).join('\n\n---\n\n')
log(`${refutations.reduce((n, r) => n + r.findings.length, 0)} findings from ${refutations.length} skeptics`)

phase('Revise')
const synth2 = await agent(`${synthPrompt('This is the REVISION pass. Below is your v1 spec and three skeptics\' findings. Where findings cluster under one upstream decision, change that decision rather than patching symptoms. Where a skeptic is wrong, say so briefly in open_questions and keep the spec. Output the COMPLETE revised spec, not a diff.')}

# v1 spec
${synth1.spec}

# v1 open questions
${synth1.open_questions}

# Refutations
${refutationsMd}

# Brief interrogation (for reference)
${interrogation}`, { label: 'synthesise:v2', phase: 'Revise', schema: SYNTH_SCHEMA, effort: 'high' })

return {
  interrogation,
  proposals: live.map(p => ({ concept: p.concept, thesis: p.thesis })),
  judgements: judgements.map(j => ({ winner: j.winner, scores: j.scores.map(s => `${s.concept}: ${s.total}`) })),
  refutations: refutationsMd,
  spec_v1: synth1.spec,
  spec: synth2 ? synth2.spec : synth1.spec,
  open_questions: synth2 ? synth2.open_questions : synth1.open_questions,
}