// This round's smaller asks, measured: the deliverable's width against the container, the General settings
// accordion on opening Customise, the Hit! word against the count, the how-to sheet title, the pill that opens it.
// node tools/tmp/probe-r11.mjs [width]
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = Number(process.argv[2] || 1440)
const port = 9600 + Math.floor(Math.random() * 40)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'pr' + port)}`, `--window-size=${W},1000`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || '').slice(0, 120)) })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
const out = {}

// 1. the deliverable against the container
await js("window.showcase.mode('animation'); 1"); await sleep(2500)
out.deliverable = JSON.parse(await js(`JSON.stringify((() => { const s = document.getElementById('animExtra').getBoundingClientRect(); const st = document.querySelector('.phone-stage').getBoundingClientRect(); return { width: Math.round(s.width), left: Math.round(s.left), right: Math.round(st.right - s.right), stage: Math.round(st.width) } })())`))

// 2. General settings on opening Customise: open it by hand first, close the panel, open the panel again
await js("document.getElementById('openCustom').click(); 1"); await sleep(700)
await js("document.querySelector('.custom details[data-acc=\"shared\"]').open = true; 1"); await sleep(300)
await js("document.getElementById('closeCustom').click(); 1"); await sleep(700)
await js("document.getElementById('openCustom').click(); 1"); await sleep(700)
out.sharedAccordionOpenAfterReopen = await js("document.querySelector('.custom details[data-acc=\"shared\"]').open")
out.firstAccordionOpen = await js("(document.querySelector('.custom details.acc') || {}).open")
await js("document.getElementById('closeCustom').click(); 1"); await sleep(500)

// 3. the Hit! word against the count, on the Ring design
await js("window.showcase.mode('machine'); window.showcase.mscreen('countdown'); 1"); await sleep(2500)
const before = await js("getComputedStyle(document.querySelector('.mscreen[data-mscreen=\"countdown\"] .ccr-num')).fontSize")
// the demo's clock rewrites data-state every frame, so the hit has to be a real one: a click on the glass
{ const b = JSON.parse(await js("JSON.stringify((() => { const r = document.querySelector('.mscreen[data-mscreen=\"countdown\"] .cdn').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 400) } })())"))
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 })
  await sleep(500) }
const state = await js("document.querySelector('.mscreen[data-mscreen=\"countdown\"] .cdn').dataset.state")
const after = await js("getComputedStyle(document.querySelector('.mscreen[data-mscreen=\"countdown\"] .ccr-num')).fontSize")
out.hitState = state
out.hitWord = { count: before, hit: after, ratio: +(parseFloat(after) / parseFloat(before)).toFixed(3), screenPxSmaller: +((parseFloat(before) - parseFloat(after))).toFixed(1) }

// 4. the sheet title and the pill
await js("window.showcase.mode('mobile'); 1"); await sleep(1500)
await js("window.punchApp.go('scan'); 1"); await sleep(1500)
out.sheet = JSON.parse(await js(`JSON.stringify((() => { const pill = [...document.querySelectorAll('[data-howto]')].find((b) => b.offsetParent); const r = pill ? pill.getBoundingClientRect() : null; return { titles: [...document.querySelectorAll('#mSheet h3')].map((h) => h.textContent.trim()).filter((v, i, a) => a.indexOf(v) === i), pill: pill ? { text: pill.textContent.trim(), width: Math.round(r.width), scroll: pill.scrollWidth, client: pill.clientWidth, cls: pill.className } : null } })())`))
out.errors = errs
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill()
