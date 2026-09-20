/* ==========================================================================
   The run, cut: turns the lossless capture of the live phone (tools/record-run.mjs --lossless) into the files the
   Animation tab shows.

     node tools/run-cut.mjs --in C:/gtmp/punch/run/phone.mkv [--out showcase/assets/motion] [--only panels|master|pres|gif|posters]

   Writes, into --out:
     run-live-928x1960.mp4      the phone at its own size, two device pixels to one CSS pixel
     run-live-1920x1080.mp4     the presentation cut: the phone at its own size on a stage, the beats named beside it
     run-live-960.gif           the presentation cut at 960 wide
     run-live-928x1960-poster.jpg, run-live-1920x1080-poster.jpg
   The stage behind the phone is drawn by Chrome from PANEL below, in the showcase's own fonts, one PNG per beat, and
   cuts as each beat starts. Unlike the glass cut there is no close-up: the phone is already read at arm's length.
   ========================================================================== */
import { spawn, execFileSync } from 'node:child_process'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 && !String(args[i + 1] ?? '').startsWith('--') ? args[i + 1] : def }
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const IN = opt('in', 'C:/gtmp/punch/run/phone.mkv')
const OUT = resolve(ROOT, opt('out', 'showcase/assets/motion'))
const WORK = opt('work', 'C:/gtmp/punch/run/cut')
const ONLY = opt('only', '')
const FPS = 60
const POSTER_T = Number(opt('poster', 14.05))  // Your hit once the number has finished counting, just before the reel
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const does = (k) => !ONLY || ONLY.split(',').includes(k)

const B = JSON.parse(execFileSync('node', [join(ROOT, 'tools/record-run.mjs'), '--beats'], { encoding: 'utf8' }))
const DUR = (Math.round(B.end * FPS) + 1) / FPS

const BEATS = [
  { at: 0, name: 'Home', line: 'The app opens on the machine in front of you, the credits in your wallet and the last hit you landed.' },
  { at: B.scan, name: 'Scan the code', line: 'One code on the cabinet. The phone reads it and names the machine, so nothing has to be typed.' },
  { at: B.link, name: 'Linked', line: 'The link holds one credit for this turn. Walk away before the strike and it goes back to the wallet.' },
  { at: B.punch, name: 'Punch now', line: 'The phone hands the moment over: look up. The count belongs to the glass, so nobody punches at a small screen.' },
  { at: B.strike, name: 'The strike', line: 'The pad moves. The phone says the glass is reading it and waits with you, with nothing to tap.' },
  { at: B.hit, name: 'Your hit', line: 'The number lands in your hand, counts up to itself, and says where it stands at this machine.' },
  { at: B.reel, name: 'The replay', line: 'The reel opens on your own attempt: the video, the score burnt into it, ready to share.' },
]

// the stage: the phone at its own size, the title to its left, the beats to its right
const P_ = { x: 664, y: 50, w: 464, h: 980 }
const L = { x: 96, w: 470 }
const T = { x: 1246, w: 578 }
const secs = (t) => `${t.toFixed(1)} s`
const edge = (t) => (t - 0.5 / FPS).toFixed(4)

const PANEL = (k, quiet) => `<!doctype html><html><head><meta charset="utf-8"><base href="http://localhost:5770/">
<style>
@font-face { font-family: "Big Shoulders Display"; font-weight: 800; src: url("fonts/big-shoulders-display-latin-800-normal.woff2") format("woff2"); }
@font-face { font-family: "Big Shoulders Display"; font-weight: 900; src: url("fonts/big-shoulders-display-latin-900-normal.woff2") format("woff2"); }
@font-face { font-family: "Barlow"; font-weight: 500; src: url("fonts/barlow-latin-500-normal.woff2") format("woff2"); }
@font-face { font-family: "Barlow Condensed"; font-weight: 600; src: url("fonts/barlow-condensed-latin-600-normal.woff2") format("woff2"); }
:root { --ink: #F2EFEA; --mute: rgba(242, 239, 234, .58); --dim: rgba(242, 239, 234, .34); --red: #EB1110; }
* { box-sizing: border-box; }
html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #0B0A09; color: var(--ink); }
body { position: relative; background: radial-gradient(760px 820px at 46% 50%, rgba(235, 17, 16, .1), transparent 72%), #0B0A09; }
.slab { position: absolute; left: ${P_.x - 44}px; top: 0; width: ${P_.w + 88}px; height: 1080px; background: linear-gradient(180deg, rgba(255, 255, 255, .035), rgba(255, 255, 255, .012)); }
.lead { position: absolute; left: ${L.x}px; top: 96px; width: ${L.w}px; }
.k { margin: 0; font: 600 19px/1 "Barlow Condensed", sans-serif; letter-spacing: .18em; text-transform: uppercase; color: var(--mute); }
h1 { margin: 16px 0 0; font: 900 88px/.86 "Big Shoulders Display", sans-serif; text-transform: uppercase; letter-spacing: .005em; }
.sub { margin: 22px 0 0; font: 500 20px/1.5 "Barlow", sans-serif; color: var(--mute); }
.now { position: absolute; left: ${L.x}px; top: 620px; width: ${L.w}px; }
.now-k { margin: 0; font: 600 17px/1 "Barlow Condensed", sans-serif; letter-spacing: .18em; text-transform: uppercase; color: var(--red); }
.now-t { margin: 14px 0 0; font: 900 58px/.92 "Big Shoulders Display", sans-serif; text-transform: uppercase; }
.now-l { margin: 18px 0 0; min-height: 116px; font: 500 21px/1.45 "Barlow", sans-serif; color: var(--mute); }
.foot { position: absolute; left: ${L.x}px; top: 952px; width: ${L.w}px; margin: 0; font: 500 17px/1.5 "Barlow", sans-serif; color: var(--dim); }
ol { position: absolute; left: ${T.x}px; top: 50px; width: ${T.w}px; height: 980px; list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; justify-content: center; gap: 26px; }
li { position: relative; display: grid; grid-template-columns: 80px 1fr; column-gap: 14px; align-items: baseline; color: var(--dim); }
li b { font: 600 20px/1 "Barlow Condensed", sans-serif; letter-spacing: .06em; font-variant-numeric: tabular-nums; }
li span { font: 800 50px/1 "Big Shoulders Display", sans-serif; text-transform: uppercase; letter-spacing: .01em; }
li.done { color: rgba(242, 239, 234, .5); }
li.on { color: var(--ink); }
li.on b { color: var(--red); }
li.on::before { content: ""; position: absolute; left: -28px; top: 50%; width: 10px; height: 10px; margin-top: -5px; border-radius: 50%; background: var(--red); }
</style></head><body>
<div class="slab"></div>
<div class="lead">
  <p class="k">The motion deliverable</p>
  <h1>The run</h1>
  <p class="sub">One turn on the phone, recorded frame by frame from the showcase with the designs chosen by default. The app plays it: the recorder only starts the scan, taps the link and brings the strike forward.</p>
</div>
<div class="now">
  <p class="now-k">${quiet ? '&nbsp;' : secs(BEATS[k].at)}</p>
  <p class="now-t">${quiet ? '&nbsp;' : BEATS[k].name}</p>
  <p class="now-l">${quiet ? '' : BEATS[k].line}</p>
</div>
<p class="foot">The phone at its own size, 440 by 956 points.</p>
<ol>${BEATS.map((b, i) => `<li class="${i === k ? 'on' : i < k ? 'done' : ''}"><b>${secs(b.at)}</b><span>${b.name}</span></li>`).join('')}</ol>
</body></html>`

await mkdir(OUT, { recursive: true })
await mkdir(WORK, { recursive: true })

/* ------------------------------------------------------------ panels, drawn by Chrome */
async function panels() {
  const port = 9930 + Math.floor(Math.random() * 25)
  const profile = `C:/gtmp/punch/runcut-profile-${process.pid}`
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
const EXACT = `settb=1/${FPS},setpts=N`
const TOYUV = 'scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p'

const MW = 928, MH = 1960   // the phone at its own size, two device pixels to one point
const MASTER = join(OUT, `run-live-${MW}x${MH}.mp4`)
const PRES = join(OUT, 'run-live-1920x1080.mp4')
const GIF = join(OUT, 'run-live-960.gif')

// the capture carries alpha around the handset; the master lays it on the colour of the box the animation tab
// shows it in (.anim-phone), so the box and the frame's rounded corners never show as a rectangle
const BOX = '0x060606'
async function master() {
  await ff(['-i', IN, '-filter_complex', `color=c=${BOX}:s=${MW}x${MH}:r=${FPS}[bg];[0:v]${EXACT}[a];[bg][a]overlay=0:0:shortest=1:format=auto,${TOYUV}[out]`, '-map', '[out]', ...H264(18), MASTER])
  console.log('wrote', MASTER)
}

async function pres() {
  const inputs = ['-i', IN]
  const still = (file) => inputs.push('-loop', '1', '-framerate', String(FPS), '-t', DUR.toFixed(4), '-i', join(WORK, file))
  still('panel-0.png')
  for (let k = 1; k < BEATS.length; k++) { still(`panel-${k}q.png`); still(`panel-${k}.png`) }
  const f = []
  f.push(`[1:v]${EXACT},format=rgba[p0]`)
  for (let k = 1; k < BEATS.length; k++) {
    const at = edge(BEATS[k].at), qi = 2 * k, fi = 2 * k + 1
    f.push(`[${qi}:v]${EXACT}[s${k}]`)
    f.push(`[p${k - 1}][s${k}]overlay=0:0:enable='gte(t\\,${at})'[c${k}]`)
    f.push(`[${fi}:v]${EXACT},format=rgba,fade=t=in:st=${(BEATS[k].at + 0.05).toFixed(3)}:d=0.2:alpha=1[q${k}]`)
    f.push(`[c${k}][q${k}]overlay=0:0:format=auto[p${k}]`)
  }
  const last = `p${BEATS.length - 1}`
  f.push(`[0:v]${EXACT},scale=${P_.w}:${P_.h}:flags=lanczos[phone]`)
  f.push(`[${last}][phone]overlay=${P_.x}:${P_.y}:format=auto,${TOYUV}[out]`)   // the phone's alpha lets the slab through its corners
  const script = join(WORK, 'pres.filter')
  await writeFile(script, f.join(';\n'))
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
  for (const [src, name] of [[MASTER, 'run-live-928x1960-poster.jpg'], [PRES, 'run-live-1920x1080-poster.jpg']]) {
    await ff(['-i', src, '-vf', `select=eq(n\\,${n})`, '-fps_mode', 'passthrough', '-frames:v', '1', '-q:v', '3', join(OUT, name)])
    console.log('wrote', name, 'frame', n)
  }
}

if (does('panels')) await panels()
if (does('master')) await master()
if (does('pres')) await pres()
if (does('gif')) await gif()
if (does('posters')) await posters()
