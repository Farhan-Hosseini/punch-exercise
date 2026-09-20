/* ==========================================================================
   Score-reveal clip renderer.

   Drives a deterministic canvas scene (motion/scene.js) frame by frame in
   headless Chrome over raw CDP, and pipes PNG frames into ffmpeg.

     node motion/render.mjs --out C:/gtmp/punch/reveal.mp4            full clip
     node motion/render.mjs --stills 0.2,1.4,3.0 --dir C:/gtmp/punch   PNG stills at those seconds
     node motion/render.mjs --frames C:/gtmp/punch/frames               every frame as PNG (no encode)

   Options
     --fps        default 60
     --dur        clip length in seconds (default: window.CLIP_DURATION from the scene)
     --ss         supersample factor for the encode (default 1.5: capture 1620x5760, lanczos down)
     --crf        default 14
     --gif        also write a preview GIF next to the mp4 (270 px wide)
     --port       static server port (default 5877)

   The scene never sees wall-clock time: render.mjs calls captureFrame(t) with an
   explicit t, so every frame is exactly the instant it claims to be.
   ========================================================================== */

import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile, mkdir, rm, writeFile, stat } from 'node:fs/promises'
import { once } from 'node:events'
import { dirname, join, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && !String(args[i + 1] ?? '').startsWith('--') ? args[i + 1] : def
}
const flag = (name) => args.includes(`--${name}`)

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(opt('port', 5877))
const FPS = Number(opt('fps', 60))
const SS = Number(opt('ss', 1.5))
const CRF = Number(opt('crf', 14))
const OUT = opt('out')
const STILLS = opt('stills')
const FRAMES = opt('frames')
const DIR = opt('dir', 'C:/gtmp/punch')
const MODE = opt('mode', 'master')
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const DEBUG_PORT = PORT + 4100 // tied to the unique static-server port, so parallel renders never share a debugger
const profile = `C:/gtmp/punch/profile-${process.pid}`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
}

await mkdir(DIR, { recursive: true })
await mkdir(dirname(profile), { recursive: true })

// --- static server ---------------------------------------------------------
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x')
    let p = decodeURIComponent(url.pathname)
    if (p.endsWith('/')) p += 'index.html'
    const file = join(ROOT, p)
    if (!file.startsWith(ROOT)) throw new Error('outside root')
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' })
    res.end(body)
  } catch (e) {
    res.writeHead(404)
    res.end('nope')
  }
})
await new Promise((r) => server.listen(PORT, '127.0.0.1', r))

// --- chrome ----------------------------------------------------------------
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--hide-scrollbars',
    '--window-size=1200,900',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

function cdp(ws) {
  let id = 0
  const pending = new Map()
  const listeners = new Map()
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    if (m.id !== undefined) {
      const p = pending.get(m.id)
      pending.delete(m.id)
      m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result)
    } else for (const fn of listeners.get(m.method) || []) fn(m.params)
  })
  return {
    send(m, p = {}, s) {
      const msg = { id: ++id, method: m, params: p }
      if (s) msg.sessionId = s
      ws.send(JSON.stringify(msg))
      return new Promise((res, rej) => pending.set(msg.id, { resolve: res, reject: rej }))
    },
    on(m, fn) {
      if (!listeners.has(m)) listeners.set(m, [])
      listeners.get(m).push(fn)
    },
    once(m) {
      return new Promise((r) => this.on(m, r))
    },
  }
}

let exitCode = 0
try {
  let wsUrl
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)
      if (r.ok) {
        wsUrl = (await r.json()).webSocketDebuggerUrl
        break
      }
    } catch {}
    await sleep(200)
  }
  if (!wsUrl) throw new Error('Chrome never opened a debugging port')

  const ws = new WebSocket(wsUrl)
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  const c = cdp(ws)
  const { targetId } = await c.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId: s } = await c.send('Target.attachToTarget', { targetId, flatten: true })
  await c.send('Page.enable', {}, s)
  await c.send('Runtime.enable', {}, s)
  const logs = []
  c.on('Runtime.consoleAPICalled', (p) => logs.push(p.args.map((a) => a.value ?? a.description).join(' ')))
  c.on('Runtime.exceptionThrown', (p) => logs.push('EXCEPTION ' + (p.exceptionDetails.exception?.description || p.exceptionDetails.text)))

  const loaded = c.once('Page.loadEventFired')
  await c.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/motion/index.html?ss=${SS}&mode=${MODE}` }, s)
  await loaded
  const ev = async (expression) => {
    const r = await c.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, s)
    if (r.exceptionDetails) throw new Error('page: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text))
    return r.result.value
  }
  const ready = await ev('window.sceneReady')
  if (ready !== 'ok') throw new Error('scene not ready: ' + JSON.stringify(ready))
  const DUR = Number(opt('dur', await ev('window.CLIP_DURATION')))
  const [W, H] = await ev('[window.CANVAS_W, window.CANVAS_H]')
  console.log(`scene ready: ${W}x${H} capture, ${DUR}s @ ${FPS}fps, ss ${SS}`)

  const frameAt = async (t) => Buffer.from((await ev(`captureFrame(${t})`)).split(',')[1], 'base64')

  if (opt('eval')) {
    console.log(JSON.stringify(await ev(opt('eval')), null, 1))
  } else if (STILLS) {
    for (const t of STILLS.split(',').map(Number)) {
      const buf = await frameAt(t)
      const f = join(DIR, `still-${t.toFixed(2).replace('.', '_')}.png`)
      await writeFile(f, buf)
      console.log(`${f} (${(buf.length / 1024).toFixed(0)} KB)`)
    }
  } else if (FRAMES) {
    await mkdir(FRAMES, { recursive: true })
    const n = Math.round(DUR * FPS)
    for (let i = 0; i < n; i++) {
      await writeFile(join(FRAMES, `f${String(i).padStart(4, '0')}.png`), await frameAt(i / FPS))
      if (i % 30 === 0) console.log(`frame ${i}/${n}`)
    }
  } else if (OUT) {
    await mkdir(dirname(OUT), { recursive: true })
    const [OW, OH] = MODE === 'present' ? [1920, 1080] : [1080, 3840]
    const vf = SS !== 1 ? `scale=${OW}:${OH}:flags=lanczos,format=yuv420p` : 'format=yuv420p'
    const ff = spawn(
      'ffmpeg',
      ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', 'pipe:0',
        '-vf', vf, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF), '-profile:v', 'high', '-level', '5.1',
        '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-r', String(FPS), OUT],
      { stdio: ['pipe', 'inherit', 'inherit'] },
    )
    const n = Math.round(DUR * FPS)
    const t0 = Date.now()
    for (let i = 0; i < n; i++) {
      const buf = await frameAt(i / FPS)
      if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain')
      if (i % 60 === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`)
    }
    ff.stdin.end()
    const [code] = await once(ff, 'exit')
    if (code !== 0) throw new Error('ffmpeg exited ' + code)
    const size = (await stat(OUT)).size
    console.log(`wrote ${OUT} (${(size / 1048576).toFixed(1)} MB, ${n} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s)`)
    if (flag('gif')) {
      const gif = OUT.replace(/\.mp4$/i, '.gif')
      const g = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', OUT,
        '-vf', 'fps=20,scale=270:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', gif], { stdio: 'inherit' })
      await once(g, 'exit')
      console.log(`wrote ${gif}`)
    }
  } else {
    console.log('nothing to do: pass --out, --stills or --frames')
  }
  if (logs.length) console.log('page console:\n  ' + logs.join('\n  '))
} catch (e) {
  console.error(e.message)
  exitCode = 1
} finally {
  chrome.kill()
  server.close()
  await sleep(300)
  await rm(profile, { recursive: true, force: true }).catch(() => {})
}
process.exit(exitCode)
