import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9400 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
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
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => {
  const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) return { __err: r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text }
  return r.result?.result?.value
}
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)

const report = {}
report.boot = JSON.parse(await js(`JSON.stringify((() => {
  const F = window.PunchFormat, A = window.punchApp
  const painted = [...document.querySelectorAll('[data-glass-rank]')].map((el) => el.dataset.glassRank + '=' + el.textContent)
  const dubai = (A ? A.leaders() : []).filter((p) => /Dubai/.test(p.city||'')).map((p) => p.id + ':' + p.score)
  return {
    hasApp: !!A, liveScore: A && A.score,
    dubaiBoard: dubai,
    ranksLive: F.ranks(A.score),
    ranks0: F.ranks(0), ranks1000: F.ranks(1000), ranks500k: F.ranks(500000), ranks999999: F.ranks(999999),
    painted,
  }
})())`))

// drive the Customise score control to the extremes and read back what the glass paints
const drive = async (v) => {
  await js(`(() => {
    const el = document.querySelector('#custom input[type=range][data-k="score"], #custom [data-k="score"], input[type=range]#cScore')
    return el ? el.id + '|' + el.dataset.k : 'none'
  })()`)
  return null
}
report.controls = await js(`JSON.stringify([...document.querySelectorAll('#custom input[type=range]')].map((i) => ({ id: i.id, k: i.dataset.k || '', min: i.min, max: i.max, val: i.value })))`)

const setScoreSlider = async (v) => {
  const r = await js(`(() => {
    const el = [...document.querySelectorAll('#custom input[type=range]')].find((i) => /score/i.test(i.id + ' ' + (i.dataset.k||'')))
    if (!el) return 'no-slider'
    el.value = ${v}
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    return el.id + '=' + el.value
  })()`)
  await sleep(900)
  const painted = await js(`JSON.stringify([...document.querySelectorAll('[data-glass-rank]')].map((el) => el.dataset.glassRank + '=' + el.textContent))`)
  const live = await js(`window.punchApp.score`)
  return { set: r, live, painted: JSON.parse(painted) }
}
report.slider999999 = await setScoreSlider(999999)
report.slider0 = await setScoreSlider(0)
// with the live score parked at 0, ask ranks() for a strong score -- the third-caller case
report.afterSlider0_ranks999999 = JSON.parse(await js(`JSON.stringify(window.PunchFormat.ranks(999999))`))
report.afterSlider0_ranksLive = JSON.parse(await js(`JSON.stringify(window.PunchFormat.ranks(window.punchApp.score))`))

// the phone's own "Where you rank" page (hit.js) at the live score 0
await js(`window.showcase.mode('mobile'); 1`); await sleep(1200)
await js(`window.punchApp.go('hit'); 1`); await sleep(1500)
report.hitPage = JSON.parse(await js(`JSON.stringify([...document.querySelectorAll('.yh-kt-rank, [class*="yh-"][class*="rank"]')].slice(0,10).map((el) => el.textContent.trim()))`))
report.hitAria = JSON.parse(await js(`JSON.stringify([...document.querySelectorAll('[aria-label*="Rank "]')].slice(0,8).map((el) => el.getAttribute('aria-label')))`))

// embed surface: does punchApp exist there?
await send('Page.navigate', { url: 'http://localhost:5770/?embed=machine' }); await sleep(5000)
report.embed = JSON.parse(await js(`JSON.stringify((() => {
  const A = window.punchApp, F = window.PunchFormat
  return { hasApp: !!A, score: A && A.score, ranksLive: A ? F.ranks(A.score) : null,
    painted: [...document.querySelectorAll('[data-glass-rank]')].map((el) => el.dataset.glassRank + '=' + el.textContent) }
})())`))

report.errors = errs.slice(0, 8)
console.log(JSON.stringify(report, null, 1))
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'sk' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
