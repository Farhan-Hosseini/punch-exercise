// the live section registry: every surface, page, section and the designs it offers, straight from the running app
import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9050 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'rg' + port)}`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' })
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
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
const reg = await js(`JSON.stringify((() => {
  const out = { machine: {}, phone: {}, slots: null, errors: [] }
  try {
    for (const surface of ['machine', 'phone']) {
      const pages = window.PSec.pages(surface)
      for (const p of pages) {
        const key = typeof p === 'string' ? p : p.key
        out[surface][key] = window.showcase.sections(surface, key).map(s => ({ key: s.key, label: s.label, designs: s.names.length, names: s.names }))
      }
    }
    out.slots = window.showcase.slots()
  } catch (e) { out.errors.push(String(e)) }
  return out
})())`)
await writeFile('build/registry.json', reg)
const r = JSON.parse(reg)
const sum = (o) => Object.entries(o).map(([p, secs]) => `${p}: ${secs.length} sections, ${secs.reduce((a, s) => a + s.designs, 0)} designs`)
console.log('MACHINE\n ' + sum(r.machine).join('\n ') + '\nPHONE\n ' + sum(r.phone).join('\n '))
console.log('slots (result screen):', r.slots ? r.slots.length : 0, r.slots ? r.slots.map(s => `${s.key}:${s.designs.length}`).join(' ') : '')
console.log('errors:', r.errors)
ws.close(); chrome.kill()
