// Which CSS selectors never match anything, on any surface, page, design, theme or typeface?
// Walks the live CSSOM (so @media/nesting are handled by Chrome), then narrows a "never matched" set
// at every checkpoint as the page is driven through every state.
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = 1600
const port = 9700 + Math.floor(Math.random() * 200)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sl' + port)}`, `--window-size=${W},1000`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 250 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map(a => a.value || a.description).join(' '))
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => {
  const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400))
  return r.result?.result?.value
}
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6500)

// collect every style rule from every same-origin sheet in the top document
await js(`window.__sel = (() => {
  const out = []
  const walk = (rules, sheetUrl) => {
    for (const r of rules) {
      if (r.type === 1 || (r.constructor && r.constructor.name === 'CSSStyleRule')) { out.push({ s: r.selectorText, u: sheetUrl, n: (r.cssText||'').length })
        if (r.cssRules && r.cssRules.length) walk(r.cssRules, sheetUrl) }
      else if (r.cssRules && r.cssRules.length) walk(r.cssRules, sheetUrl)
    }
  }
  for (const sh of document.styleSheets) { try { walk(sh.cssRules, (sh.href||'inline').replace(location.origin+'/','')) } catch (e) {} }
  // sanitise for querySelector: drop pseudo-elements and dynamic pseudo-classes
  const clean = (s) => s
    .replace(/::[a-z-]+(\\([^)]*\\))?/g, '')
    .replace(/:(hover|focus-visible|focus-within|focus|active|visited|target|placeholder-shown|user-invalid|autofill|-webkit-[a-z-]+|-moz-[a-z-]+)\\b/g, '')
    .replace(/\\s+/g, ' ').trim()
  // split on top-level commas only: ":is(.a, .b) .c" is ONE selector
  const split = (s) => { const o = []; let d = 0, cur = ''
    for (const ch of s) { if (ch === '(' || ch === '[') d++; else if (ch === ')' || ch === ']') d--
      if (ch === ',' && d === 0) { o.push(cur); cur = '' } else cur += ch }
    if (cur.trim()) o.push(cur); return o }
  const seen = new Map()
  for (const r of out) for (const part of split(r.s)) {
    const p = part.trim(); if (!p) continue
    const c = clean(p); if (!c) continue
    const k = c
    if (!seen.has(k)) seen.set(k, { sel: p, clean: c, sheets: new Set(), bytes: 0 })
    seen.get(k).sheets.add(r.u); seen.get(k).bytes += r.n
  }
  window.__pending = [...seen.values()].map(v => ({ sel: v.sel, clean: v.clean, sheets: [...v.sheets], bytes: v.bytes }))
  window.__bad = []
  window.__check = () => {
    window.__pending = window.__pending.filter(v => {
      try { return !document.querySelector(v.clean) } catch (e) { window.__bad.push(v.clean + ' :: ' + e.message); return false }
    })
    return window.__pending.length
  }
  return window.__pending.length
})()`)
const total = await js('window.__pending.length')
console.error('selectors collected:', total)
const check = async (label) => { const n = await js('window.__check()'); console.error(label, '->', n, 'still unmatched') }
await check('initial')

async function stepAllDesigns(surface, page) {
  const secs = JSON.parse(await js(`JSON.stringify(window.showcase.sections('${surface}','${page}'))`) || '[]')
  for (const s of secs) {
    for (let i = 0; i < s.names.length; i++) { await js(`window.showcase.sec('${surface}','${page}','${s.key}',${i}); 1`); await sleep(100); await js('window.__check()') }
    await js(`window.showcase.sec('${surface}','${page}','${s.key}',0); 1`)
  }
}

for (const appearance of ['dark', 'light']) {
  const deep = appearance === 'dark'
  await js(`window.showcase.appearance('${appearance}'); 1`); await sleep(400); await check('appearance ' + appearance)
  await js(`window.showcase.mode('mobile'); 1`); await sleep(1800)
  const pages = JSON.parse(await js(`JSON.stringify(window.PSec.pages('phone'))`) || '[]')
  for (const p of pages) {
    await js(`(function(){const b=document.querySelector('.m-app [data-go="${p}"]'); if(b) b.click(); const pg=document.querySelector('.m-page[data-page="${p}"]'); if(pg){pg.hidden=false; document.querySelectorAll('.m-page[data-page]').forEach(x=>{ if(x!==pg) x.hidden=true })} })(); 1`)
    await sleep(450); await js('window.__check()')
    if (deep) await stepAllDesigns('phone', p)
  }
  await check('phone pages ' + appearance)
  await js(`window.showcase.mode('machine'); 1`); await sleep(1800)
  const screens = JSON.parse(await js(`JSON.stringify(window.PSec.pages('machine'))`) || '[]')
  for (const s of screens) {
    await js(`window.showcase.mscreen('${s}'); 1`); await sleep(600); await js('window.__check()')
    if (deep) await stepAllDesigns('machine', s)
    const flows = JSON.parse(await js(`JSON.stringify((function(){try{return window.showcase.sections('machine','${s}')}catch(e){return []}})())`) || '[]')
    void flows
  }
  // the machine's flow-screen designs (older mvar engine)
  if (deep) for (const s of screens) { for (let i = 0; i < 8; i++) { await js(`try{window.showcase.mvar('${s}',${i})}catch(e){}; 1`); await sleep(90); await js('window.__check()') } }
  // the Result screen's data-slot engine
  await js(`window.showcase.mscreen('default'); 1`); await sleep(700)
  const slots = JSON.parse(await js(`JSON.stringify(window.showcase.slots())`) || '[]')
  if (deep) for (const sl of slots) { for (let i = 0; i < sl.designs.length; i++) { await js(`window.showcase.set('${sl.key}',${i}); 1`); await sleep(110); await js('window.__check()') } await js(`window.showcase.set('${sl.key}',0); 1`) }
  await stepAllDesigns('global', 'all')
  await check('machine ' + appearance)
}
for (const tf of ['orbitron', 'chakra', 'arena']) { await js(`document.documentElement.dataset.typeface='${tf}'; 1`); await sleep(300); await js('window.__check()') }
for (const lg of ['fist', 'boxer', 'glove', 'upright', 'pair', 'bag']) { await js(`window.showcase.logo('${lg}'); 1`); await sleep(180); await js('window.__check()') }
for (const bd of JSON.parse(await js(`JSON.stringify((window.dsBackdrops||[]).map(b=>b.key))`) || '[]')) { await js(`window.showcase.backdrop('${bd}'); 1`); await sleep(200); await js('window.__check()') }
await js(`window.showcase.decimals(false); 1`); await sleep(400); await js('window.__check()'); await js(`window.showcase.decimals(true); 1`); await sleep(400); await js('window.__check()')
await check('variants')
// overlays
await js(`document.getElementById('openBrief').click(); 1`); await sleep(1500); await js('window.__check()')
await js(`(async()=>{const s=document.querySelector('#brief .brief-scroll')||document.getElementById('brief');for(let y=0;y<s.scrollHeight;y+=500){s.scrollTop=y;await new Promise(r=>setTimeout(r,60))}return 1})()`); await js('window.__check()')
await js(`window.showcase.brief(false); 1`); await sleep(500)
await js(`const h=document.querySelector('[aria-controls="help"]'); h&&h.click(); 1`); await sleep(1200); await js('window.__check()')
await js(`document.querySelectorAll('#help [aria-controls],#help button').forEach(b=>{try{b.click()}catch(e){}}); 1`); await sleep(800); await js('window.__check()')
await js(`const c=document.querySelector('[aria-controls="custom"]'); c&&c.click(); 1`); await sleep(1500); await js('window.__check()')
await js(`document.querySelectorAll('#custom details').forEach(d=>d.open=true); document.querySelectorAll('#custom [aria-expanded="false"]').forEach(b=>{try{b.click()}catch(e){}}); 1`); await sleep(1200); await js('window.__check()')
await check('overlays')
await js(`window.showcase.mode('ds'); 1`); await sleep(5000); await js('window.__check()')
await js(`(async()=>{const s=document.scrollingElement;for(let y=0;y<s.scrollHeight;y+=600){s.scrollTo(0,y);await new Promise(r=>setTimeout(r,70))}s.scrollTo(0,0);return 1})()`); await sleep(2000); await js('window.__check()')
await js(`document.querySelectorAll('.ds-stage details').forEach(d=>d.open=true); document.querySelectorAll('.ds-stage [role="radio"],.ds-stage [role="tab"],.ds-stage [aria-expanded]').forEach(b=>{try{b.click()}catch(e){}}); 1`); await sleep(2500); await js('window.__check()')
await check('ds')
await js(`window.showcase.mode('animation'); 1`); await sleep(5000); await js('window.__check()')
await js(`(async()=>{const s=document.scrollingElement;for(let y=0;y<s.scrollHeight;y+=500){s.scrollTo(0,y);await new Promise(r=>setTimeout(r,70))}return 1})()`); await sleep(2000); await js('window.__check()')
await check('animation')
await js(`document.getElementById('openCase').click(); 1`); await sleep(3500); await js('window.__check()')
await js(`(async()=>{const s=document.querySelector('#case .case-scroll')||document.getElementById('case');for(let y=0;y<s.scrollHeight;y+=400){s.scrollTop=y;await new Promise(r=>setTimeout(r,70))}return s.scrollHeight})()`); await sleep(3000); await js('window.__check()')
await js(`document.querySelectorAll('#case details').forEach(d=>d.open=true); document.querySelectorAll('#case [role="tab"],#case [aria-expanded],#case button').forEach(b=>{try{b.click()}catch(e){}}); 1`); await sleep(3000); await js('window.__check()')
await check('case')

const left = JSON.parse(await js('JSON.stringify(window.__pending)'))
const bad = JSON.parse(await js('JSON.stringify(window.__bad)'))
left.sort((a, b) => b.bytes - a.bytes)
const bySheet = {}
for (const r of left) for (const s of r.sheets) bySheet[s] = (bySheet[s] || 0) + r.bytes
await writeFile('tools/tmp/dead-selectors.json', JSON.stringify({ total, unmatched: left.length, bySheet, left, unsupported: bad, errors: errs.slice(0, 15) }, null, 1))
console.log('TOTAL selectors:', total, ' never matched:', left.length)
console.log('bytes of never-matched rules by sheet:'); Object.entries(bySheet).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(String(v).padStart(8), k))
console.log('\ntop never-matched selectors:')
for (const r of left.slice(0, 50)) console.log(String(r.bytes).padStart(6), r.sheets.join(',').padEnd(18), r.sel)
console.log('\nselectors querySelector could not parse:', bad.length, bad.slice(0, 5))
console.log('page errors:', errs.length, JSON.stringify(errs.slice(0, 8)))
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'sl' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
