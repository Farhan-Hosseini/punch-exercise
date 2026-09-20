// The number-heavy machine screens under each typeface, settled, side by side. node tools/tmp/face-shots.mjs
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9560 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'fs' + port)}`, '--window-size=1600,1100', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1100, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await mkdir('build/typefaces', { recursive: true })
const SCREENS = ['default', 'attract', 'countdown', 'score', 'result']
const overflow = {}
for (const face of ['arena', 'orbitron', 'chakra']) {
  await js(`window.showcase.mode('machine'); 1`); await sleep(1000)
  await js(`document.getElementById('openCustom').click(); 1`); await sleep(600)
  await js(`document.querySelector('.face-tile[data-typeface="${face}"]').click(); 1`); await sleep(800)
  await js(`document.getElementById('closeCustom').click(); 1`); await sleep(500)
  overflow[face] = {}
  for (const s of SCREENS) {
    await js(`window.showcase.mscreen('${s}'); 1`); await sleep(s === 'score' || s === 'countdown' ? 4500 : 1800)
    // nowrap text that is wider than its box, clipped or not: the words the wide faces push out
    overflow[face][s] = JSON.parse((await js(`JSON.stringify((() => { try { const out = []; const scope = document.querySelector('.mscreen[data-mscreen="${s}"]:not([hidden])') || document.getElementById('machine'); for (const el of scope.querySelectorAll('*')) { if (!el.offsetParent) continue; const cs = getComputedStyle(el); if (cs.whiteSpace !== 'nowrap') continue; const over = el.scrollWidth - el.clientWidth; if (over > 3) out.push({ cls: String(el.className).slice(0, 34), over, text: el.textContent.trim().slice(0, 22) }) } return out.slice(0, 8) } catch (e) { return [{ error: String(e).slice(0, 80) }] } })())`)) || '[]')
    const b = JSON.parse(await js(`JSON.stringify((() => { const el = document.querySelector('.mscreen[data-mscreen="${s}"]:not([hidden])') || document.getElementById('machine'); const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top + scrollY), width: Math.round(r.width), height: Math.round(r.height) } })())`))
    const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82, captureBeyondViewport: true, clip: { ...b, scale: 0.36 } })
    if (shot.result && shot.result.data) await writeFile(`build/typefaces/v2-${face}-${s}.jpg`, Buffer.from(shot.result.data, 'base64'))
  }
}
for (const f of Object.keys(overflow)) for (const s of Object.keys(overflow[f])) if (overflow[f][s].length) console.log(f, s, JSON.stringify(overflow[f][s]))
console.log('done')
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'fs' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
