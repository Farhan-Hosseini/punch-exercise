// Why is the Result screen's "Kinematic breakdown" section zero height?
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9020 + Math.floor(Math.random() * 8)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'zzz' + port)}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 150 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, pr = {}) => new Promise((r) => { const n = ++id; const to = setTimeout(() => { if (pend.has(n)) { pend.delete(n); r({}) } }, 15000); pend.set(n, (v) => { clearTimeout(to); r(v) }); ws.send(JSON.stringify({ id: n, method: m, params: pr })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
const jj = async (e) => { try { return JSON.parse(await js(`JSON.stringify((()=>{${e}})())`)) } catch { return null } }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6500)
await js(`window.showcase.mode('machine'); window.showcase.mscreen('result'); 1`); await sleep(2500)
const probe = `
  const out = []
  for (const sec of document.querySelectorAll('#screenContent > .sec')) {
    const cs = getComputedStyle(sec)
    const vars = sec.querySelector('.vars')
    const kids = vars ? [...vars.children] : []
    out.push({ slot: sec.dataset.slot, h: Math.round(sec.getBoundingClientRect().height), disp: cs.display, hidden: sec.hasAttribute('hidden'),
      off: sec.dataset.off, cls: sec.className,
      varsKids: kids.length, shownKids: kids.filter(k=>!k.hidden && getComputedStyle(k).display !== 'none').length,
      kidTags: kids.slice(0,3).map(k=>k.tagName+'.'+String(k.className).split(' ')[0]+(k.hidden?'[hidden]':'')) })
  }
  return out`
console.log('DEFAULT:', JSON.stringify(await jj(probe), null, 1))
console.log('layoutState:', JSON.stringify(await jj(`return JSON.parse(localStorage.getItem('punch-showcase.v5')||'{}').layout`)))
// is there a Customise toggle for it, and does turning it on give it height?
console.log('rows:', JSON.stringify(await jj(`
  document.getElementById('openCustom').click()
  return [...document.querySelectorAll('#custom .sec-row')].map(r => (r.innerText||'').trim().replace(/\\n+/g,' | ').slice(0,70))`), null, 1))
await sleep(1200)
console.log('toggles:', JSON.stringify(await jj(`
  return [...document.querySelectorAll('#custom [role="switch"], #custom input[type=checkbox], #custom [aria-pressed][data-slot], #custom [data-toggle]')].map(b=>({ tag:b.tagName, slot:b.dataset.slot||b.dataset.toggle, label:(b.getAttribute('aria-label')||b.textContent||'').trim().slice(0,40), on: b.getAttribute('aria-checked')||b.getAttribute('aria-pressed')||b.checked }))`), null, 1))
for (let i = 0; i < 4; i++) {
  await js(`window.showcase.set('stats', ${i}); 1`); await sleep(500)
  console.log('stats design', i, JSON.stringify(await jj(`
    const sec = document.querySelector('.sec[data-slot="stats"]')
    const vars = sec.querySelector('.vars')
    const shown = [...vars.children].filter(k=>!k.hidden)
    return { secH: Math.round(sec.getBoundingClientRect().height), secDisp: getComputedStyle(sec).display, shownN: shown.length,
             shownH: shown.map(s=>Math.round(s.getBoundingClientRect().height)), shownDisp: shown.map(s=>getComputedStyle(s).display),
             titleH: Math.round((sec.querySelector('.s-title')||{getBoundingClientRect:()=>({height:0})}).getBoundingClientRect().height) }`)))
}
try { ws.close() } catch {}
chrome.kill(); process.exit(0)
