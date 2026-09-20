import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = Number(process.argv[2] || 1440)
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,`--window-size=${W},1000`,'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 150 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return 'ERR:' + JSON.stringify(r.result.exceptionDetails).slice(0,400); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable'); await send('DOM.enable'); await send('CSS.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6500)

// hit-test helper: walk y from top-12 to bottom+12 at the button's centre x, report the band where the button answers
const PROBE = `(sel) => {
  const el = document.querySelector(sel); if (!el) return { missing: sel }
  const r = el.getBoundingClientRect(); const cx = Math.round(r.left + r.width/2)
  let lo = null, hi = null
  for (let y = Math.round(r.top) - 16; y <= Math.round(r.bottom) + 16; y++) {
    const hit = document.elementFromPoint(cx, y)
    const mine = hit && (hit === el || el.contains(hit))
    if (mine) { if (lo === null) lo = y; hi = y }
  }
  const cs = getComputedStyle(el); const af = getComputedStyle(el, '::after')
  return { sel, text: el.textContent.trim().slice(0,18), drawnH: +r.height.toFixed(1), cssHeight: cs.height,
           afterH: af.height, afterContent: af.content, afterPos: af.position, afterInsetTop: af.top, afterInsetBottom: af.bottom,
           hitBandTop: lo, hitBandBottom: hi, hitBandH: (lo===null?0:hi-lo+1),
           parentOverflowY: getComputedStyle(el.parentElement).overflowY, parentPad: getComputedStyle(el.parentElement).padding }
}`

async function snap(label) {
  const out = await js(`JSON.stringify((()=>{ const P=${PROBE}; return {
    mode: document.body.dataset.mode,
    subHidden: (()=>{const s=document.querySelector('.pagenav[data-pagenav="page"] .pagesub'); return s? {attr:s.hidden, display:getComputedStyle(s).display, rects:s.getClientRects().length} : null})(),
    sub: P('.pagenav[data-pagenav="page"] .pagesub button:not([hidden])'),
    group: P('.pagenav[data-pagenav="page"] .pagegroups button'),
    msub: P('.pagenav[data-pagenav="mscreen"] .pagesub button:not([hidden])'),
    mgroup: P('.pagenav[data-pagenav="mscreen"] .pagegroups button'),
    ref_mode: P('.mode'), ref_brief: P('.briefbtn')
  }})())`)
  console.log('---', label, '\n', out)
}

await js(`window.showcase.mode('mobile'); 1`); await sleep(1800)
// Play group has 4 screens -> sub bar shows
await js(`(()=>{const b=[...document.querySelectorAll('.pagenav[data-pagenav="page"] .pagegroups button')].find(x=>x.dataset.group==='play'); b.click(); return 1})()`); await sleep(1500)
await snap('MOBILE / Play group')
await js(`window.showcase.mode('machine'); 1`); await sleep(1800)
await js(`(()=>{const b=[...document.querySelectorAll('.pagenav[data-pagenav="mscreen"] .pagegroups button')].find(x=>x.dataset.group==='play'); b.click(); return 1})()`); await sleep(1500)
await snap('MACHINE / Play group')

// matched styles from Chrome's own cascade for the live sub button
await js(`window.showcase.mode('mobile'); 1`); await sleep(1500)
const doc = await send('DOM.getDocument', { depth: -1, pierce: false })
const q = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '.pagenav[data-pagenav="page"] .pagesub button:not([hidden])' })
const ms = await send('CSS.getMatchedStylesForNode', { nodeId: q.result.nodeId })
const heights = []
for (const m of (ms.result.matchedCSSRules || [])) {
  const r = m.rule
  const h = (r.style?.cssProperties || []).filter(p => p.name === 'height')
  for (const p of h) heights.push({ sel: r.selectorList.text, value: p.value, source: r.styleSheetId, range: p.range?.startLine != null ? p.range.startLine + 1 : null })
}
console.log('--- CASCADE height declarations on the live sub button (source order):\n', JSON.stringify(heights, null, 1))
const sheets = {}
for (const m of (ms.result.matchedCSSRules || [])) { const s = m.rule.styleSheetId; if (s && !sheets[s]) { try { sheets[s] = (await send('CSS.getStyleSheetText', { styleSheetId: s })).result ? (await send('CSS.getStyleSheetText', { styleSheetId: s })).result.text.length : 0 } catch {} } }
ws.close(); chrome.kill()
