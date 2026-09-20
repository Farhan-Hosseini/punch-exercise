import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
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

// record every localStorage write and read, with the stack, in EVERY document (top + iframes)
const HOOK = `(() => {
  const P = Storage.prototype, t0 = performance.now()
  window.__w = []; window.__r = []
  const si = P.setItem, gi = P.getItem
  P.setItem = function (k, v) { window.__w.push({ k, v: String(v).slice(0, 200), at: Math.round(performance.now() - t0), st: new Error().stack.split('\\n').slice(1, 4).join(' | ') }); return si.apply(this, arguments) }
  P.getItem = function (k) { const out = gi.apply(this, arguments); window.__r.push({ k, at: Math.round(performance.now() - t0) }); return out }
})()`
await send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK })

const ACC = 'punch-acc.v2'
const dump = async (label) => {
  const o = JSON.parse(await js(`JSON.stringify({
    embed: document.documentElement.dataset.embed || null,
    accEls: [...document.querySelectorAll('.custom details.acc')].map(d => ({ acc: d.dataset.acc, open: d.open, disp: getComputedStyle(d).display, panelDisp: getComputedStyle(d.closest('.custom')).display })),
    writes: (window.__w || []),
    accReads: (window.__r || []).filter(r => r.k === '${ACC}'),
    store: Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k).slice(0, 160)]))
  })`))
  console.log('\\n===== ' + label + ' =====')
  console.log(JSON.stringify(o, null, 1))
  return o
}

const seedAndLoad = async (seed, url, label, wait = 6500) => {
  await send('Page.navigate', { url: 'http://localhost:5770/?embed=machine' }); await sleep(1500)
  await js(`localStorage.clear(); ${seed ? `localStorage.setItem('${ACC}', ${JSON.stringify(JSON.stringify(seed))}); ` : ''}localStorage.setItem('SENTINEL','keep'); 1`)
  await send('Page.navigate', { url }); await sleep(wait)
  return dump(label + '  seed=' + JSON.stringify(seed))
}

// A: clean storage, embed loaded directly
await seedAndLoad(null, 'http://localhost:5770/?embed=machine', 'A embed, no saved accordions')
// B: saved state identical to index.html defaults (all three open)
await seedAndLoad({ page: true, page2: true, shared: true }, 'http://localhost:5770/?embed=machine', 'B embed, saved == defaults')
// C: a viewer closed one accordion in the parent (realistic divergent state)
await seedAndLoad({ page: false, page2: true, shared: true }, 'http://localhost:5770/?embed=machine', 'C embed, one closed')
// D: the reporter's exact seed
await seedAndLoad({ page: 1, page2: 1, shared: 0, SENTINEL: 'keep' }, 'http://localhost:5770/?embed=machine', 'D reporter seed')
// E: the real thing - parent page, animation tab, which builds the live iframe
await send('Page.navigate', { url: 'http://localhost:5770/?embed=machine' }); await sleep(1200)
await js(`localStorage.clear(); localStorage.setItem('${ACC}', '{"page":false,"page2":true,"shared":true}'); 1`)
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)
await js(`window.showcase.mode('animation'); 1`); await sleep(4000)
const e = JSON.parse(await js(`JSON.stringify({
  frames: [...document.querySelectorAll('iframe')].map(f => f.src),
  parentWrites: window.__w.filter(w => w.k === 'punch-acc.v2'),
  store: localStorage.getItem('punch-acc.v2')
})`))
console.log('\\n===== E parent in animation mode (top frame only) =====')
console.log(JSON.stringify(e, null, 1))
// read the iframe's own world
const tgts = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
for (const f of tgts.filter((x) => x.type === 'iframe' || (x.type === 'page' && x.url.includes('embed=machine')))) {
  const w2 = new WebSocket(f.webSocketDebuggerUrl)
  try {
    await new Promise((r, j) => { w2.addEventListener('open', r, { once: true }); w2.addEventListener('error', j, { once: true }); setTimeout(j, 3000) })
    let i2 = 0; const p2 = new Map()
    w2.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && p2.has(m.id)) { p2.get(m.id)(m); p2.delete(m.id) } })
    const s2 = (m, p = {}) => new Promise((r) => { const n = ++i2; p2.set(n, r); w2.send(JSON.stringify({ id: n, method: m, params: p })) })
    await s2('Runtime.enable')
    const v = (await s2('Runtime.evaluate', { expression: `JSON.stringify({url: location.href, writes: (window.__w||[]).filter(w=>w.k==='punch-acc.v2'), reads: (window.__r||[]).filter(r=>r.k==='punch-acc.v2')})`, returnByValue: true })).result?.result?.value
    console.log('\\n----- iframe target ' + f.url + '\\n' + v)
  } catch { console.log('\\n----- could not attach to ' + f.url) }
  w2.close()
}
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'sk' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
