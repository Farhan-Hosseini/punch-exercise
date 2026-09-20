import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = 1600
const port = 9700 + Math.floor(Math.random() * 200)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'cl' + port)}`, `--window-size=${W},1000`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 250 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(7000)
const CHECK = `JSON.stringify((() => {
  const out = []
  for (const img of document.querySelectorAll('img')) {
    const cs = getComputedStyle(img)
    const el = img.cloneNode()
    // does the layout depend on the file's own size?
    const wAuto = !img.getAttribute('width') && cs.width === 'auto'
    const hAuto = !img.getAttribute('height') && cs.height === 'auto' && cs.aspectRatio === 'auto'
    if (!(wAuto || hAuto)) continue
    const b = img.getBoundingClientRect()
    if (b.width < 24 && b.height < 24) continue
    if (!(img.offsetParent || cs.position === 'fixed')) continue
    out.push({ src: (img.currentSrc || img.src).replace(location.origin + '/', ''), w: Math.round(b.width), h: Math.round(b.height), cssW: cs.width, cssH: cs.height, ar: cs.aspectRatio, lazy: img.loading })
  }
  return out
})())`
const res = {}
for (const mode of ['mobile', 'machine', 'animation', 'ds']) { await js(`window.showcase.mode('${mode}'); 1`); await sleep(3500); res[mode] = JSON.parse(await js(CHECK)) }
for (const [m, list] of Object.entries(res)) {
  console.log('== ' + m + ': ' + list.length + ' images whose box depends on the file loading ==')
  for (const r of list.slice(0, 14)) console.log('  ', String(r.w + 'x' + r.h).padEnd(11), 'cssW=' + r.cssW.padEnd(8), 'cssH=' + r.cssH.padEnd(8), 'lazy=' + r.lazy, r.src)
}
console.log('\n== videos with preload != none ==')
console.log(await js(`JSON.stringify([...document.querySelectorAll('video')].filter(v=>v.preload!=='none').map(v=>({src:(v.getAttribute('src')||'').split('/').pop(),preload:v.preload,poster:!!v.getAttribute('poster'),w:v.getAttribute('width'),h:v.getAttribute('height')})))`))
ws.close(); chrome.kill()
