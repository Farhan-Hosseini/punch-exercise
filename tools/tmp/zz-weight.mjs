// What a first visit actually downloads, broken down, and how much of it is eager.
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const OUT = process.argv[2] || null
const port = 9970 + Math.floor(Math.random() * 20)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', '--disk-cache-size=1', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'zzw' + port)}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 150 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const reqs = new Map(); let bytes = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data), p = m.params
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (m.method === 'Network.requestWillBeSent') reqs.set(p.requestId, { url: p.request.url, type: p.type })
  else if (m.method === 'Network.loadingFinished') { const r = reqs.get(p.requestId); if (r) bytes.push({ ...r, n: p.encodedDataLength }) }
})
const send = (m, pr = {}) => new Promise((r) => { const n = ++id; const to = setTimeout(() => { if (pend.has(n)) { pend.delete(n); r({}) } }, 20000); pend.set(n, (v) => { clearTimeout(to); r(v) }); ws.send(JSON.stringify({ id: n, method: m, params: pr })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
const jj = async (e) => { try { return JSON.parse(await js(`JSON.stringify((()=>{${e}})())`)) } catch { return null } }
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Network.setCacheDisabled', { cacheDisabled: true })
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
bytes = []
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(9000)
const sum = (f) => bytes.filter(f).reduce((s, b) => s + b.n, 0)
const out = {
  total: sum(() => true), requests: bytes.length,
  byType: Object.fromEntries([...new Set(bytes.map((b) => b.type))].map((ty) => [ty, { n: bytes.filter((b) => b.type === ty).length, bytes: sum((b) => b.type === ty) }])),
  css: sum((b) => /\.css/.test(b.url)), js: sum((b) => /\.js(\?|$)/.test(b.url)),
  images: sum((b) => /\.(jpg|jpeg|png|webp|gif|svg)/.test(b.url)), fonts: sum((b) => /\.woff2/.test(b.url)),
  json: sum((b) => /\.json/.test(b.url)), video: sum((b) => /\.mp4/.test(b.url)),
  imageCount: bytes.filter((b) => /\.(jpg|jpeg|png|webp)/.test(b.url)).length,
  biggest: bytes.sort((a, b) => b.n - a.n).slice(0, 12).map((b) => [b.n, b.url.replace(/^https?:\/\/[^/]+/, '')]),
}
out.dom = await jj(`
  const imgs = [...document.images]
  return { imgTotal: imgs.length, eager: imgs.filter(i=>i.loading!=='lazy').length, lazy: imgs.filter(i=>i.loading==='lazy').length,
           loadedNow: imgs.filter(i=>i.complete && i.naturalWidth>0).length,
           nodes: document.getElementsByTagName('*').length,
           stylesheets: [...document.styleSheets].length,
           scripts: document.scripts.length }`)
// second visit, warm cache
bytes = []
await send('Network.setCacheDisabled', { cacheDisabled: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(8000)
out.warmSecondVisit = { total: bytes.reduce((s, b) => s + b.n, 0), requests: bytes.length }
const text = JSON.stringify(out, null, 1)
if (OUT) { try { writeFileSync(OUT, text) } catch {} }
process.stdout.write(text + '\n')
try { ws.close() } catch {}
chrome.kill(); process.exit(0)
