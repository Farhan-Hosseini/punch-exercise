// Spot checks: (1) is mscreen "stats" reachable? (2) are the phone/reel and phone/scan sections really zero-size?
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9400 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', '--disk-cache-size=1', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'zzp' + port)}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => process.stderr.write(a.join(' ') + '\n')
let t
for (let i = 0; i < 150 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errors = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data), p = m.params
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (m.method === 'Runtime.exceptionThrown') errors.push(String(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text).split('\n')[0])
  else if (m.method === 'Runtime.consoleAPICalled' && p.type === 'error') errors.push('console.error ' + p.args.map((a) => a.value || a.description).join(' ').split('\n')[0])
})
const send = (m, pr = {}) => new Promise((r) => { const n = ++id; const to = setTimeout(() => { if (pend.has(n)) { pend.delete(n); errors.push('CDP TIMEOUT ' + m); r({}) } }, 15000); pend.set(n, (v) => { clearTimeout(to); r(v) }); ws.send(JSON.stringify({ id: n, method: m, params: pr })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) { errors.push('EVAL ' + String(r.result.exceptionDetails.exception?.description || '').split('\n')[0]); return undefined } return r.result?.result?.value }
const jj = async (e) => { try { return JSON.parse(await js(`JSON.stringify((()=>{${e}})())`)) } catch { return null } }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
const out = {}

// (1) the stats screen
log('stats screen')
await js(`window.showcase.mode('machine'); 1`); await sleep(1500)
out.mscreensList = await jj(`return window.PSec.pages('machine')`)
out.navButtons = await jj(`return [...document.querySelectorAll('.pagenav[data-pagenav="mscreen"] [data-mscreen]')].map(b=>b.dataset.mscreen)`)
await js(`window.showcase.mscreen('stats'); 1`); await sleep(1400)
out.askedStats = await jj(`
  const a = document.querySelector('.mscreen[data-mscreen="stats"]')
  return { machineAttr: document.getElementById('machine').dataset.mscreen,
           statsHidden: a ? a.hidden : 'no node',
           statsH: a ? Math.round(a.getBoundingClientRect().height) : null,
           statsSections: a ? window.PSec.sections('machine','stats').map(s=>s.key+'('+s.names.length+')') : [],
           shown: [...document.querySelectorAll('.mscreen, #screen')].filter(e=>!e.hidden).map(e=>e.dataset.mscreen||'result'),
           savedMscreen: (JSON.parse(localStorage.getItem('punch-showcase.v5')||'{}')).mscreen }`)
// and what the design system's "Your run" live glass ends up showing
log('ds live glass')
await js(`window.showcase.mode('system'); 1`); await sleep(2500)
await js(`const f=document.querySelector('[data-ds-live="stats"]'); if (f) f.scrollIntoView({block:'center'}); 1`); await sleep(5000)
out.dsLiveStats = await jj(`
  const f = document.querySelector('[data-ds-live="stats"]')
  if (!f) return { noFrame: true }
  let inner = null
  try { const d = f.contentDocument; inner = d ? { mscreen: d.getElementById('machine')?.dataset.mscreen, statsHidden: d.querySelector('.mscreen[data-mscreen="stats"]')?.hidden, resultShown: !d.getElementById('screen').hidden } : 'no doc' } catch (e) { inner = 'blocked' }
  return { src: f.getAttribute('src'), inner, capt: (document.querySelector('[data-ds-livecap="stats"]')||{textContent:''}).textContent.trim().slice(0,80) }`)
out.dsLiveScore = await jj(`
  const f = document.querySelector('[data-ds-live="score"]')
  if (!f) return { noFrame: true }
  f.scrollIntoView({block:'center'})
  let inner = null
  try { const d = f.contentDocument; inner = d ? { mscreen: d.getElementById('machine')?.dataset.mscreen } : 'no doc' } catch (e) { inner = 'blocked' }
  return { src: f.getAttribute('src'), inner }`)

// (2) the phone sections my blank heuristic flagged
log('phone sections')
await js(`window.showcase.mode('mobile'); 1`); await sleep(1600)
out.phone = {}
for (const pg of ['scan', 'reel', 'hit', 'default']) {
  await js(`window.punchApp.go('${pg}'); 1`); await sleep(1200)
  out.phone[pg] = await jj(`
    const root = document.querySelector('.m-page[data-page="${pg}"]')
    return { pageH: Math.round(root.getBoundingClientRect().height), scrollH: root.scrollHeight,
      secs: [...root.querySelectorAll('[data-sec]')].map(el => {
        const b = el.getBoundingClientRect(); const cs = getComputedStyle(el)
        return { key: el.dataset.sec, idx: el.dataset.svIndex, h: Math.round(b.height), w: Math.round(b.width), top: Math.round(b.top), disp: cs.display, vis: cs.visibility, rects: el.getClientRects().length, drawn: el.hasAttribute('data-sv-names'), kids: el.children.length, txt: (el.innerText||'').trim().length }
      }) }`)
}
out.errors = errors
const text = JSON.stringify(out, null, 1)
if (process.argv[2]) { try { writeFileSync(process.argv[2], text) } catch (e) { log('write ' + e.message) } }
process.stdout.write(text + '\n')
try { ws.close() } catch {}
chrome.kill(); process.exit(0)
