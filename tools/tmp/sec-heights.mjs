// every machine section, every design, measured in glass pixels on the live screen, to compare with the Figma variants
import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9120 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sh' + port)}`, '--window-size=1600,1100', 'about:blank'], { stdio: 'ignore' })
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
await js("window.showcase.mode('machine'); 1"); await sleep(2500)

const PAGES = ['default', 'attract', 'scan', 'countdown', 'loading', 'score', 'record']
const out = {}
for (const p of PAGES) {
  await js(`window.showcase.mscreen('${p}'); 1`); await sleep(1400)
  const secs = await js(`JSON.stringify(window.showcase.sections('machine', '${p}'))`)
  out[p] = []
  for (const s of JSON.parse(secs)) {
    const row = { key: s.key, label: s.label, designs: [] }
    for (let i = 0; i < s.names.length; i++) {
      await js(`window.showcase.sec('machine', '${p}', '${s.key}', ${i}); 1`); await sleep(420)
      const m = await js(`JSON.stringify((() => {
        const screen = document.querySelector('.mscreen[data-mscreen="${p}"]')
        const el = document.querySelector('.mscreen[data-mscreen="${p}"] [data-sec="${s.key}"]')
        if (!el || !screen) return null
        const sr = screen.getBoundingClientRect(), er = el.getBoundingClientRect()
        return { h: Math.round(er.height / sr.height * 3840), w: Math.round(er.width / sr.width * 1080) }
      })())`)
      row.designs.push({ i, name: s.names[i], ...(m ? JSON.parse(m) : { h: null }) })
    }
    out[p].push(row)
  }
}
await writeFile('build/sec-heights.json', JSON.stringify(out, null, 1))
for (const [p, rows] of Object.entries(out)) for (const r of rows) console.log(`${p}/${r.key}: ` + r.designs.map(d => `${d.name}=${d.h}`).join(' '))
ws.close(); chrome.kill()
