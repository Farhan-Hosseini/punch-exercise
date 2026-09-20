/* ==========================================================================
   The score reveal, cut: turns the lossless capture of the live glass (tools/record-reveal.mjs --lossless) into
   the files the Animation tab shows.

     node tools/reveal-cut.mjs --in C:/gtmp/punch/rr/glass.mkv [--out showcase/assets/motion] [--only panels|master|pres|gif|posters]

   Writes, into --out:
     reveal-live-1080x3840.mp4       the glass at its own size, H.264 High, yuv420p, crf 18, bt709, faststart
     reveal-live-1920x1080.mp4       the presentation cut: the whole glass, a close-up that follows the beat, and the
                                     beats named beside it
     reveal-live-960.gif             the presentation cut at 960 wide
     reveal-live-1080x3840-poster.jpg, reveal-live-1920x1080-poster.jpg
   The beat panels (the text column and the frames around the glass) are drawn by Chrome from PANEL below, in the
   showcase's own fonts, one PNG per beat, and cross-fade in as each beat starts.
   ========================================================================== */
import { spawn, execFileSync } from 'node:child_process'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 && !String(args[i + 1] ?? '').startsWith('--') ? args[i + 1] : def }
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const IN = opt('in', 'C:/gtmp/punch/rr/glass.mkv')
const OUT = resolve(ROOT, opt('out', 'showcase/assets/motion'))
const WORK = opt('work', 'C:/gtmp/punch/rr/cut')
const ONLY = opt('only', '')
const FPS = 60
const LEAD = opt('lead', '0')  // the recorder's --lead, so the beats and the poster follow the longer clip
const POSTER_T = Number(opt('poster', 9.6 + Number(LEAD)))  // the Big score whole: name, number, crown and the still
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const does = (k) => !ONLY || ONLY.split(',').includes(k)

const B = JSON.parse(execFileSync('node', [join(ROOT, 'tools/record-reveal.mjs'), '--beats', '--lead', LEAD], { encoding: 'utf8' }))
const DUR = (Math.round(B.end * FPS) + 1) / FPS

/* ------------------------------------------------------------ the beats, and where the close-up looks on the glass */
// y is the top of a 1080 x 1080 window on the 1080 x 3840 glass
const BEATS = [
  { at: 0, name: 'Punch now', line: 'The last seconds of the count. The glass is the only clock, and it speeds up as the time drains.', y: 1260 },
  { at: B.strike, name: 'The strike', line: 'The count breaks the moment the bag moves. The ring flashes and the call changes to Great punch.', y: 1260 },
  { at: B.reading, name: 'Reading the strike', line: 'No number yet. One line draws the strike as the sensor felt it, so the wait reads as work.', y: 940 },
  { at: B.record, name: 'New record', line: 'The name at the top flaps over from Omar Nasser to Sara, and the machine best rolls up to her number.', y: 460 },
  { at: B.score, name: 'Big score', line: 'The number again, as wide as the glass and whose hit it is, for the back of the queue.', y: 540 },
  { at: B.why, name: 'Why it counts', line: 'One reason to care, and only one: this hit took today’s crown from Hamad.', y: 1700 },
  { at: B.photo, name: 'The still', line: 'Then the strike itself, a still from Sara’s own shoot, so the number has a face.', y: 2580 },
]
const G = { x: 64, y: 39, w: 282, h: 1002 }          // the whole glass, small
const C = { x: 394, y: 60, s: 960 }                   // the close-up
const T = { x: 1414, w: 442 }                         // the text column
const gy = (y) => Math.round(G.y + (y * G.h) / 3840)
const gh = Math.round((1080 * G.h) / 3840)
const secs = (t) => `${t.toFixed(1)} s`
// a beat's first frame is the first at or after its cue; switching half a frame early keeps float time from landing a frame late
const edge = (t) => (t - 0.5 / FPS).toFixed(4)

const PANEL = (k, quiet) => `<!doctype html><html><head><meta charset="utf-8"><base href="http://localhost:5770/">
<style>
@font-face { font-family: "Big Shoulders Display"; font-weight: 800; src: url("fonts/big-shoulders-display-latin-800-normal.woff2") format("woff2"); }
@font-face { font-family: "Big Shoulders Display"; font-weight: 900; src: url("fonts/big-shoulders-display-latin-900-normal.woff2") format("woff2"); }
@font-face { font-family: "Barlow"; font-weight: 500; src: url("fonts/barlow-latin-500-normal.woff2") format("woff2"); }
@font-face { font-family: "Barlow"; font-weight: 600; src: url("fonts/barlow-latin-600-normal.woff2") format("woff2"); }
@font-face { font-family: "Barlow Condensed"; font-weight: 600; src: url("fonts/barlow-condensed-latin-600-normal.woff2") format("woff2"); }
@font-face { font-family: "Barlow Condensed"; font-weight: 700; src: url("fonts/barlow-condensed-latin-700-normal.woff2") format("woff2"); }
:root { --ink: #F2EFEA; --mute: rgba(242, 239, 234, .58); --dim: rgba(242, 239, 234, .34); --red: #EB1110; --line: rgba(255, 255, 255, .1); }
* { box-sizing: border-box; }
html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #0B0A09; color: var(--ink); }
body { position: relative; background: radial-gradient(900px 700px at 30% 50%, rgba(235, 17, 16, .09), transparent 70%), #0B0A09; }
.glass { position: absolute; left: ${G.x}px; top: ${G.y}px; width: ${G.w}px; height: ${G.h}px; background: #000; box-shadow: 0 0 0 4px #1B1A19, 0 0 0 5px var(--line); border-radius: 2px; }
.close { position: absolute; left: ${C.x}px; top: ${C.y}px; width: ${C.s}px; height: ${C.s}px; background: #000; box-shadow: 0 0 0 3px var(--red), 0 40px 90px -30px rgba(0, 0, 0, .9); border-radius: 2px; }
.col { position: absolute; left: ${T.x}px; top: 60px; width: ${T.w}px; height: 960px; display: flex; flex-direction: column; }
.k { margin: 0; font: 600 19px/1 "Barlow Condensed", sans-serif; letter-spacing: .18em; text-transform: uppercase; color: var(--mute); }
h1 { margin: 16px 0 0; font: 900 76px/.9 "Big Shoulders Display", sans-serif; text-transform: uppercase; letter-spacing: .005em; }
.sub { margin: 18px 0 0; font: 500 19px/1.45 "Barlow", sans-serif; color: var(--mute); max-width: 30ch; }
ol { list-style: none; margin: auto 0 0; padding: 0; display: grid; gap: 20px; }
li { position: relative; display: grid; grid-template-columns: 72px 1fr; column-gap: 12px; align-items: baseline; color: var(--dim); }
li b { font: 600 20px/1 "Barlow Condensed", sans-serif; letter-spacing: .06em; font-variant-numeric: tabular-nums; }
li span { font: 800 46px/1 "Big Shoulders Display", sans-serif; text-transform: uppercase; letter-spacing: .01em; }
li.done { color: rgba(242, 239, 234, .5); }
li.now { color: var(--ink); }
li.now b { color: var(--red); }
li.now::before { content: ""; position: absolute; left: -26px; top: 50%; width: 10px; height: 10px; margin-top: -5px; border-radius: 50%; background: var(--red); }
.say { margin: 30px 0 0 84px; min-height: 84px; font: 500 20px/1.4 "Barlow", sans-serif; color: var(--mute); }
.foot { margin: 34px 0 0; font: 500 17px/1.45 "Barlow", sans-serif; color: var(--dim); }
</style></head><body>
<div class="glass"></div><div class="close"></div>
<div class="col">
  <p class="k">The motion deliverable</p>
  <h1>The score reveal</h1>
  <p class="sub">Recorded frame by frame from the live glass in the showcase, with the designs chosen by default.</p>
  <ol>${BEATS.map((b, i) => `<li class="${i === k ? 'now' : i < k ? 'done' : ''}"><b>${secs(b.at)}</b><span>${b.name}</span></li>`).join('')}</ol>
  <p class="say">${quiet ? '' : BEATS[k].line}</p>
  <p class="foot">Left, the whole glass. Right, the beat up close.</p>
</div>
</body></html>`

await mkdir(OUT, { recursive: true })
await mkdir(WORK, { recursive: true })

/* ------------------------------------------------------------ panels, drawn by Chrome */
async function panels() {
  const port = 9960 + Math.floor(Math.random() * 30)
  const profile = `C:/gtmp/punch/cut-profile-${process.pid}`
  await mkdir(profile, { recursive: true })
  const chrome = spawn(CHROME, ['--headless=new', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=1920,1080', 'about:blank'], { stdio: 'ignore' })
  try {
    let target
    for (let i = 0; i < 100 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page') } catch { await sleep(200) } }
    if (!target) throw new Error('Chrome never opened a debugging port')
    const ws = new WebSocket(target.webSocketDebuggerUrl)
    await new Promise((r) => ws.addEventListener('open', r, { once: true }))
    let id = 0
    const pending = new Map(), listeners = new Map()
    ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } else for (const fn of listeners.get(m.method) || []) fn(m.params) })
    const send = (method, params = {}) => new Promise((r) => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })) })
    await send('Page.enable')
    await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false })
    const loaded = new Promise((r) => listeners.set('Page.loadEventFired', [r]))
    await send('Page.navigate', { url: 'http://localhost:5770/__panel' })
    await loaded
    for (const [k, quiet] of BEATS.flatMap((_, k) => (k ? [[k, true], [k, false]] : [[k, false]]))) {
      const html = PANEL(k, quiet)
      await send('Runtime.evaluate', { expression: `document.open(); document.write(${JSON.stringify(html)}); document.close(); document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 250))).then(() => document.fonts.size)`, awaitPromise: true, returnByValue: true })
      const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 } })
      await writeFile(join(WORK, `panel-${k}${quiet ? 'q' : ''}.png`), Buffer.from(shot.data, 'base64'))
      console.log('panel', k, quiet ? '(no line yet)' : '', BEATS[k].name)
    }
    ws.close()
  } finally { chrome.kill(); await sleep(300); await rm(profile, { recursive: true, force: true }).catch(() => {}) }
}

/* ------------------------------------------------------------ ffmpeg */
const ff = (a) => new Promise((res, rej) => {
  const p = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...a], { stdio: ['ignore', 'inherit', 'inherit'] })
  p.on('close', (c) => (c ? rej(new Error('ffmpeg exited ' + c)) : res()))
})
const BT709 = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv']
const H264 = (crf) => ['-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-profile:v', 'high', '-pix_fmt', 'yuv420p', ...BT709, '-movflags', '+faststart', '-r', String(FPS)]
// exact timestamps: the capture's container keeps milliseconds, and a rounded-up stamp puts a frame one frame late
const EXACT = `settb=1/${FPS},setpts=N`
const TOYUV = 'scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p'

const MASTER = join(OUT, 'reveal-live-1080x3840.mp4')
const PRES = join(OUT, 'reveal-live-1920x1080.mp4')
const GIF = join(OUT, 'reveal-live-960.gif')

async function master() {
  await ff(['-i', IN, '-vf', `${EXACT},${TOYUV}`, ...H264(18), '-level', '5.2', MASTER])
  console.log('wrote', MASTER)
}

async function pres() {
  const inputs = ['-i', IN]
  const still = (file) => inputs.push('-loop', '1', '-framerate', String(FPS), '-t', DUR.toFixed(4), '-i', join(WORK, file))
  still('panel-0.png')
  for (let k = 1; k < BEATS.length; k++) { still(`panel-${k}q.png`); still(`panel-${k}.png`) }
  const f = []
  // the panels: as a beat starts, the list cuts to it with the glass, then its line fades in under the list
  f.push(`[1:v]${EXACT},format=rgba[p0]`)
  for (let k = 1; k < BEATS.length; k++) {
    const at = edge(BEATS[k].at), qi = 2 * k, fi = 2 * k + 1
    f.push(`[${qi}:v]${EXACT}[s${k}]`)
    f.push(`[p${k - 1}][s${k}]overlay=0:0:enable='gte(t\,${at})'[c${k}]`)
    f.push(`[${fi}:v]${EXACT},format=rgba,fade=t=in:st=${(BEATS[k].at + 0.05).toFixed(3)}:d=0.2:alpha=1[q${k}]`)
    f.push(`[c${k}][q${k}]overlay=0:0:format=auto[p${k}]`)
  }
  const last = `p${BEATS.length - 1}`
  // the close-up follows the beat: its window cuts when the glass cuts
  const yexpr = BEATS.slice(1).reduceRight((acc, b, i) => `if(lt(t\\,${edge(b.at)})\\,${BEATS[i].y}\\,${acc})`, String(BEATS[BEATS.length - 1].y))
  f.push(`[0:v]${EXACT},split=2[ga][gb]`)
  f.push(`[ga]scale=${G.w}:${G.h}:flags=lanczos[small]`)
  f.push(`[gb]crop=1080:1080:0:${yexpr},scale=${C.s}:${C.s}:flags=lanczos[close]`)
  f.push(`[${last}][small]overlay=${G.x}:${G.y}[a]`)
  f.push(`[a][close]overlay=${C.x}:${C.y}[b]`)
  // the loupe: where the close-up looks, drawn on the whole glass
  const boxes = BEATS.map((b, i) => {
    const t0 = i ? edge(b.at) : '0', t1 = i + 1 < BEATS.length ? edge(BEATS[i + 1].at) : (DUR + 1).toFixed(4)
    return `drawbox=x=${G.x}:y=${gy(b.y)}:w=${G.w}:h=${gh}:color=0xEB1110@1:t=3:enable='gte(t\\,${t0})*lt(t\\,${t1})'`
  })
  f.push(`[b]${boxes.join(',')},${TOYUV}[out]`)
  const graph = f.join(';\n')
  const script = join(WORK, 'pres.filter')
  await writeFile(script, graph)
  await ff([...inputs, '-/filter_complex', script, '-map', '[out]', ...H264(18), '-t', DUR.toFixed(4), PRES])
  console.log('wrote', PRES)
}

async function gif() {
  const pal = join(WORK, 'pal.png')
  await ff(['-i', PRES, '-vf', 'fps=15,scale=960:-1:flags=lanczos,palettegen=max_colors=128:stats_mode=diff', pal])
  await ff(['-i', PRES, '-i', pal, '-lavfi', 'fps=15,scale=960:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle', GIF])
  console.log('wrote', GIF)
}

async function posters() {
  const n = Math.round(POSTER_T * FPS)
  for (const [src, name] of [[MASTER, 'reveal-live-1080x3840-poster.jpg'], [PRES, 'reveal-live-1920x1080-poster.jpg']]) {
    await ff(['-i', src, '-vf', `select=eq(n\\,${n})`, '-fps_mode', 'passthrough', '-frames:v', '1', '-q:v', '3', join(OUT, name)])
    console.log('wrote', name, 'frame', n)
  }
}

if (does('panels')) await panels()
if (does('master')) await master()
if (does('pres')) await pres()
if (does('gif')) await gif()
if (does('posters')) await posters()
