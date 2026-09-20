// CSS + JS coverage across every surface, page, screen, design, theme and typeface.
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = 1600
const port = 9700 + Math.floor(Math.random() * 200)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'cv' + port)}`, `--window-size=${W},1000`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 250 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const sheets = new Map(); const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (m.method === 'CSS.styleSheetAdded') sheets.set(m.params.header.styleSheetId, m.params.header)
  if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map(a => a.value || a.description).join(' '))
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value

await send('Runtime.enable'); await send('Page.enable'); await send('DOM.enable'); await send('CSS.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6500)
await send('CSS.startRuleUsageTracking')

const log = (...a) => console.error(...a)
// ---- drive everything
async function stepAllDesigns(surface, page) {
  const secs = JSON.parse(await js(`JSON.stringify(window.showcase.sections('${surface}','${page}'))`) || '[]')
  for (const s of secs) {
    for (let i = 0; i < s.names.length; i++) { await js(`window.showcase.sec('${surface}','${page}','${s.key}',${i}); 1`); await sleep(120) }
    await js(`window.showcase.sec('${surface}','${page}','${s.key}',0); 1`)
  }
  return secs.length
}

for (const appearance of ['dark', 'light']) {
  await js(`window.showcase.appearance('${appearance}'); 1`); await sleep(400)
  // phone
  await js(`window.showcase.mode('mobile'); 1`); await sleep(1500)
  const pages = JSON.parse(await js(`JSON.stringify(window.PSec.pages('phone'))`) || '[]')
  log('phone pages', pages.length)
  for (const p of pages) {
    await js(`(window.showcase.mpage ? window.showcase.mpage('${p}') : (document.querySelector('[data-go="${p}"]')||{click(){}}).click()); 1`)
    await js(`window.PunchMobile && window.PunchMobile.go && window.PunchMobile.go('${p}'); 1`)
    await sleep(500)
    await stepAllDesigns('phone', p)
  }
  // machine
  await js(`window.showcase.mode('machine'); 1`); await sleep(1500)
  const screens = JSON.parse(await js(`JSON.stringify(window.PSec.pages('machine'))`) || '[]')
  log('machine screens', screens.length)
  for (const s of screens) {
    await js(`window.showcase.mscreen('${s}'); 1`); await sleep(600)
    await stepAllDesigns('machine', s)
    // the older data-slot engine on the Result screen
    if (s === 'default') {
      const slots = JSON.parse(await js(`JSON.stringify(window.showcase.slots())`) || '[]')
      for (const sl of slots) { for (let i = 0; i < sl.designs.length; i++) { await js(`window.showcase.set('${sl.key}',${i}); 1`); await sleep(110) } await js(`window.showcase.set('${sl.key}',0); 1`) }
    }
  }
  await stepAllDesigns('global', 'all')
}
// typefaces + logos + backdrops
for (const tf of ['arena', 'orbitron', 'chakra']) { await js(`document.documentElement.dataset.typeface='${tf}'; 1`); await sleep(350) }
await js(`document.documentElement.dataset.typeface='arena'; 1`)
for (const lg of ['fist', 'boxer', 'glove', 'upright', 'pair', 'bag']) { await js(`window.showcase.logo('${lg}'); 1`); await sleep(200) }
for (const bd of JSON.parse(await js(`JSON.stringify((window.dsBackdrops||[]).map(b=>b.key))`) || '[]')) { await js(`window.showcase.backdrop('${bd}'); 1`); await sleep(220) }
await js(`window.showcase.decimals(false); 1`); await sleep(300); await js(`window.showcase.decimals(true); 1`); await sleep(300)
// overlays
await js(`document.getElementById('openBrief').click(); 1`); await sleep(1200)
await js(`(async()=>{const s=document.querySelector('#brief .brief-scroll')||document.getElementById('brief');for(let y=0;y<s.scrollHeight;y+=600){s.scrollTop=y;await new Promise(r=>setTimeout(r,70))}return 1})()`); await sleep(600)
await js(`window.showcase.brief(false); 1`); await sleep(600)
await js(`const h=document.getElementById('openHelp')||document.querySelector('[aria-controls="help"]'); h&&h.click(); 1`); await sleep(1000)
await js(`document.querySelectorAll('#help [aria-controls]').forEach(b=>b.click()); 1`); await sleep(500)
await js(`document.querySelectorAll('#help .x, #help [data-close]').forEach(b=>b.click()); 1`); await sleep(500)
await js(`const c=document.querySelector('[aria-controls="custom"]'); c&&c.click(); 1`); await sleep(1200)
await js(`document.querySelectorAll('#custom details').forEach(d=>d.open=true); 1`); await sleep(800)
await js(`window.showcase.mode('ds'); 1`); await sleep(4000)
await js(`(async()=>{const s=document.scrollingElement;for(let y=0;y<s.scrollHeight;y+=700){s.scrollTo(0,y);await new Promise(r=>setTimeout(r,80))}s.scrollTo(0,0);return s.scrollHeight})()`); await sleep(2500)
await js(`document.querySelectorAll('.ds-stage details, .ds-stage [aria-expanded="false"]').forEach(d=>{ if(d.tagName==='DETAILS') d.open=true; else d.click() }); 1`); await sleep(1500)
await js(`window.showcase.mode('animation'); 1`); await sleep(4000)
await js(`(async()=>{const s=document.scrollingElement;for(let y=0;y<s.scrollHeight;y+=600){s.scrollTo(0,y);await new Promise(r=>setTimeout(r,80))}return 1})()`); await sleep(2000)
await js(`document.getElementById('openCase').click(); 1`); await sleep(3000)
await js(`(async()=>{const s=document.querySelector('#case .case-scroll')||document.getElementById('case');for(let y=0;y<s.scrollHeight;y+=500){s.scrollTop=y;await new Promise(r=>setTimeout(r,80))}return s.scrollHeight})()`); await sleep(3000)
await js(`document.querySelectorAll('#case [aria-expanded="false"], #case details').forEach(d=>{ if(d.tagName==='DETAILS') d.open=true; else d.click() }); 1`); await sleep(1500)

const cov = await send('CSS.stopRuleUsageTracking')
const used = cov.result?.ruleUsage || []
// group by stylesheet
const byId = new Map()
for (const r of used) { if (!byId.has(r.styleSheetId)) byId.set(r.styleSheetId, []); byId.get(r.styleSheetId).push(r) }
const rows = []
for (const [sid, header] of sheets) {
  if (!header.sourceURL || header.sourceURL.includes('?embed')) continue
  const txt = (await send('CSS.getStyleSheetText', { styleSheetId: sid })).result?.text
  if (!txt) continue
  const list = byId.get(sid) || []
  const usedBytes = list.filter(r => r.used).reduce((a, r) => a + (r.endOffset - r.startOffset), 0)
  const allRuleBytes = list.reduce((a, r) => a + (r.endOffset - r.startOffset), 0)
  const unusedRules = list.filter(r => !r.used)
  rows.push({ url: header.sourceURL.replace('http://localhost:5770/', ''), total: txt.length, ruleBytes: allRuleBytes, usedBytes, unusedBytes: allRuleBytes - usedBytes, unusedCount: unusedRules.length, ruleCount: list.length,
    samples: unusedRules.sort((a, b) => (b.endOffset - b.startOffset) - (a.endOffset - a.startOffset)).slice(0, 12).map(r => txt.slice(r.startOffset, Math.min(r.endOffset, r.startOffset + 110)).replace(/\s+/g, ' ')) })
}
rows.sort((a, b) => b.unusedBytes - a.unusedBytes)
await writeFile('tools/tmp/css-coverage.json', JSON.stringify({ rows, errors: errs.slice(0, 20) }, null, 1))
console.log('stylesheet'.padEnd(22), 'total'.padStart(8), 'unusedB'.padStart(9), 'unused%'.padStart(8), 'unusedRules')
let T = 0, U = 0
for (const r of rows) { T += r.total; U += r.unusedBytes; console.log(r.url.padEnd(22), String(r.total).padStart(8), String(r.unusedBytes).padStart(9), ((100 * r.unusedBytes / Math.max(1, r.ruleBytes)).toFixed(1) + '%').padStart(8), r.unusedCount + '/' + r.ruleCount) }
console.log('TOTAL'.padEnd(22), String(T).padStart(8), String(U).padStart(9))
console.log('errors seen:', errs.length, JSON.stringify(errs.slice(0, 6)))
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'cv' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
