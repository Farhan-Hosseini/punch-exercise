import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sq' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map(a => a.value || a.description).join(' '))
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => {
  const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) return { __err: r.result.exceptionDetails.text + ' ' + (r.result.exceptionDetails.exception?.description || '') }
  return r.result?.result?.value
}
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

const out = { modes: {}, labels: {}, suspicious: [] }
for (const mode of ['mobile', 'machine', 'animation', 'ds']) {
  await js(`window.showcase && window.showcase.mode('${mode}'); 1`); await sleep(2500)
  const r = JSON.parse(await js(`JSON.stringify((() => {
    const tiles = [...document.querySelectorAll('[data-pqr], .pqr')]
    const labels = []
    for (const el of tiles) {
      const s = el.querySelector('svg')
      labels.push({ ds: el.dataset.pqrLabel || null, aria: s ? s.getAttribute('aria-label') : null, mounted: el.dataset.pqrMounted === '1' })
    }
    return { count: tiles.length, labels }
  })())`))
  out.modes[mode] = { tiles: r.count, mounted: r.labels.filter(x => x.mounted).length }
  for (const l of r.labels) {
    const key = JSON.stringify([l.ds, l.aria])
    out.labels[key] = (out.labels[key] || 0) + 1
    const bad = [l.ds, l.aria].filter(Boolean).some(v => /["'<>&]/.test(v))
    if (bad) out.suspicious.push({ mode, ...l })
  }
}

// also sweep every mobile page and every machine screen, and the case/ds overlays
await js(`window.showcase.mode('mobile'); 1`); await sleep(1500)
const pages = await js(`JSON.stringify([...document.querySelectorAll('[data-mpage]')].map(e=>e.dataset.mpage))`)
out.mobilePages = pages

// the hypothetical: does an unescaped quote in the label actually inject?
const inject = JSON.parse(await js(`JSON.stringify((() => {
  window.__pwned = 0
  const d = document.createElement('div')
  d.setAttribute('data-pqr-label', '" onload="window.__pwned=1" data-x="')
  document.body.appendChild(d)
  window.PunchQR.mount(d)
  const svg = d.querySelector('svg')
  const res = {
    html: d.innerHTML.slice(0, 260),
    aria: svg ? svg.getAttribute('aria-label') : null,
    attrs: svg ? [...svg.attributes].map(a => a.name) : [],
    onloadAttr: svg ? svg.getAttribute('onload') : null,
    pwnedImmediately: window.__pwned
  }
  d.remove()
  return res
})())`))
out.injectProbe = inject
await sleep(800)
out.injectProbe.pwnedAfterTick = await js('window.__pwned')

// img-style payload, which is the classic one that does fire from innerHTML
const inject2 = JSON.parse(await js(`JSON.stringify((() => {
  window.__pwned2 = 0
  const d = document.createElement('div')
  document.body.appendChild(d)
  window.PunchQR.mount(d, { label: '"><img src=x onerror="window.__pwned2=1">' })
  const r = { html: d.innerHTML.slice(0, 300), imgs: d.querySelectorAll('img').length }
  return r
})())`))
out.injectProbe2 = inject2
await sleep(1200)
out.injectProbe2.pwned2 = await js('window.__pwned2')

out.errors = errs.slice(0, 10)
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill()
