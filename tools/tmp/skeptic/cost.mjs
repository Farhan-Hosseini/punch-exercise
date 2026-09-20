// What do the dead rules actually cost over the wire? Rebuild the CSSOM with cssText, then compress
// the whole corpus with and without them.
import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { gzipSync, brotliCompressSync } from 'node:zlib'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'ct' + port)}`, 'about:blank'], { stdio: 'ignore' })
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
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
const texts = JSON.parse(await js(`JSON.stringify((() => {
  const out = []
  const walk = (l) => { for (const r of l) { if (r.type === 1) out.push([r.selectorText, r.cssText]); else if (r.cssRules) walk(r.cssRules) } }
  for (const s of document.styleSheets) { try { walk(s.cssRules) } catch {} }
  return out
})())`))
ws.close(); chrome.kill()
const A = JSON.parse(await readFile('C:/Claude Database/punch-exercise/tools/tmp/skeptic/A.json', 'utf8')).A
const deadSel = new Set(A.map((r) => r.sel))
const keep = texts.filter(([s]) => !deadSel.has(s)).map((x) => x[1]).join('\n')
const all = texts.map((x) => x[1]).join('\n')
const dead = texts.filter(([s]) => deadSel.has(s)).map((x) => x[1]).join('\n')
const f = (s) => ({ raw: Buffer.byteLength(s), gz: gzipSync(s, { level: 9 }).length, br: brotliCompressSync(Buffer.from(s)).length })
console.log('whole CSSOM      ', JSON.stringify(f(all)))
console.log('minus dead rules ', JSON.stringify(f(keep)))
console.log('dead rules alone ', JSON.stringify(f(dead)), 'rules:', texts.length - texts.filter(([s]) => !deadSel.has(s)).length)
const a = f(all), k = f(keep)
console.log('saving: raw', a.raw - k.raw, 'gzip', a.gz - k.gz, 'brotli', a.br - k.br)
