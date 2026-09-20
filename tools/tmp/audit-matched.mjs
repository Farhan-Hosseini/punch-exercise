import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9905 + Math.floor(Math.random() * 8)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'mt'+port)}`,'--window-size=1600,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 150 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable'); await send('DOM.enable'); await send('CSS.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(7000)
await js(`window.showcase.mode('mobile'); 1`); await sleep(1200)
await js(`(()=>{const bs=[...document.querySelectorAll('.pagenav[data-pagenav="page"] .pagegroups button')]; (bs[1]||bs[0]).click(); return 1})()`); await sleep(1200)
await js(`(()=>{ const nav=[...document.querySelectorAll('.pagenav')].find(p=>p.dataset.pagenav==='page'); window.__t=[...nav.querySelectorAll('.pagesub button')].find(x=>x.getClientRects().length); window.__g=nav.querySelector('.pagegroups button'); return 1 })()`)
const doc = await send('DOM.getDocument', { depth: -1 })
for (const [name, expr] of [['pagesub button', 'window.__t'], ['pagegroups button', 'window.__g']]) {
  const ro = await send('Runtime.evaluate', { expression: expr })
  const nodeId = (await send('DOM.requestNode', { objectId: ro.result.result.objectId })).result.nodeId
  const ms = await send('CSS.getMatchedStylesForNode', { nodeId })
  const rows = []
  for (const m of ms.result.matchedCSSRules || []) {
    for (const p of m.rule.style.cssProperties || []) {
      if (p.name !== 'height' && p.name !== 'min-height') continue
      rows.push({ sel: m.rule.selectorList.text.slice(0, 60), sheet: (ms.result.cssKeyframesRules, m.rule.styleSheetId), line: (p.range ? p.range.startLine + 1 : null), value: p.value, disabled: p.disabled, implicit: p.implicit, active: !(p.disabled) })
    }
  }
  const sheets = {}
  for (const r of rows) { if (!sheets[r.sheet]) { const h = await send('CSS.getStyleSheetText', { styleSheetId: r.sheet }); sheets[r.sheet] = 1 } }
  console.log('== ' + name + ' ==')
  for (const r of rows) console.log('   ', r.sel, '{ height:', r.value, '}  srcLine', r.line, r.active ? '' : '(inactive)')
  console.log('    computed height =', await js(`getComputedStyle(${expr}).height`), ' ::after height =', await js(`getComputedStyle(${expr},'::after').height`))
}
ws.close(); chrome.kill()
