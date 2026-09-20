// Per-tab: every rendered <img>/background, natural vs displayed size, missing width/height, oversized rasters.
import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = 1600
const port = 9700 + Math.floor(Math.random() * 200)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'im' + port)}`, `--window-size=${W},1000`, 'about:blank'], { stdio: 'ignore' })
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

const COLLECT = `JSON.stringify((() => {
  const out = []
  for (const img of document.querySelectorAll('img')) {
    const b = img.getBoundingClientRect()
    if (!img.currentSrc) continue
    const cs = getComputedStyle(img)
    let sw = b.width, sh = b.height
    // account for CSS transforms on ancestors (the glass is scaled down)
    out.push({
      src: img.currentSrc.replace(location.origin + '/', ''),
      nw: img.naturalWidth, nh: img.naturalHeight,
      dw: Math.round(sw), dh: Math.round(sh),
      attrW: img.getAttribute('width'), attrH: img.getAttribute('height'),
      aspectCss: cs.aspectRatio,
      lazy: img.loading, hidden: !(img.offsetParent || cs.position === 'fixed'),
    })
  }
  return out
})())`

const res = {}
for (const mode of ['mobile', 'machine', 'animation', 'ds']) {
  await js(`window.showcase.mode('${mode}'); 1`); await sleep(4000)
  res[mode] = JSON.parse(await js(COLLECT))
}
await js(`document.getElementById('openCase').click(); 1`); await sleep(2500)
await js(`(async()=>{const s=document.querySelector('#case .case-scroll')||document.getElementById('case');for(let y=0;y<s.scrollHeight;y+=700){s.scrollTop=y;await new Promise(r=>setTimeout(r,90))}s.scrollTop=0;return 1})()`)
await sleep(2500)
res.case = JSON.parse(await js(COLLECT))
await writeFile('tools/tmp/img-audit.json', JSON.stringify(res, null, 1))

// summarise
const seen = new Map()
for (const [mode, list] of Object.entries(res)) for (const r of list) {
  const k = r.src + '|' + mode
  if (!seen.has(k)) seen.set(k, { ...r, mode })
  else { const p = seen.get(k); if (r.dw * r.dh > p.dw * p.dh) seen.set(k, { ...r, mode }) }
}
const rows = [...seen.values()]
const over = rows.filter(r => r.nw && r.dw > 4 && r.nw / r.dw >= 2.2 && r.nw >= 600)
over.sort((a, b) => (b.nw * b.nh) - (a.nw * a.nh))
console.log('== rasters served far larger than displayed (natural/displayed >= 2.2x) ==')
for (const r of over.slice(0, 30)) console.log(`${r.mode.padEnd(10)} ${String(r.nw + 'x' + r.nh).padEnd(12)} shown ${String(r.dw + 'x' + r.dh).padEnd(11)} ${(r.nw / r.dw).toFixed(1)}x  ${r.src}`)
const noDim = rows.filter(r => (!r.attrW || !r.attrH) && r.aspectCss === 'auto' && !r.hidden && r.dw > 20)
console.log('\n== visible <img> with no width/height and no CSS aspect-ratio ==', noDim.length)
for (const r of noDim.slice(0, 25)) console.log(`${r.mode.padEnd(10)} ${String(r.dw + 'x' + r.dh).padEnd(11)} lazy=${r.lazy} ${r.src}`)
ws.close(); chrome.kill()
