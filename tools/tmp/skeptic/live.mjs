// Does the running app actually put the "exists in no markup and no script" classes into the DOM?
import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'lv' + port)}`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' })
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
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

const WATCH = ['rl-acts-rail', 'rl-acts-bubbles', 'rl-acts-capsule', 'rl-acts-bar', 'rl-acts-split',
  'pay-mark-apay', 'pay-mark-gpay', 'pay-mark-visa', 'pay-mark-paypal', 'pay-mark-card', 'pay-mark-add', 'pay-mark-sm',
  'rl-act', 'rl-speed', 'badge-play', 'panel-veil', 'pay-tokens', 'video-c-phone', 'm-aim-machine',
  'fit-note', 'm-replay', 'm-hit', 'm-ad-can', 'm-qr-frame', 'msa-rung-card', 'yh-frame', 'hero-d-burst', 'cs-mark', 'anim-case', 'm-punch-read', 'bf-jump', 'cs-tester-score', 'm-post-media', 'm-aim-trail', 'm-dial-fist']
const seen = {}
const probe = async (label) => {
  const r = JSON.parse(await js(`JSON.stringify(Object.fromEntries(${JSON.stringify(WATCH)}.map(c => [c, document.getElementsByClassName(c).length])))`))
  for (const [c, n] of Object.entries(r)) if (n) (seen[c] = seen[c] || []).push(label + ':' + n)
}
const PAGES = ['default', 'scan', 'connect', 'connected', 'failed', 'topup', 'checkout', 'paid', 'punch', 'hit', 'ranks', 'feed', 'reel', 'profile']
await js(`window.showcase.mode('mobile'); 1`); await sleep(2000)
for (const p of PAGES) {
  await js(`window.punchApp.go('${p}'); 1`); await sleep(900)
  await probe('phone/' + p)
}
// the reel page's five "actions" designs and five "progress" designs
for (let i = 0; i < 5; i++) {
  await js(`window.showcase.sec('phone', 'reel', 'actions', ${i}); window.punchApp.go('reel'); 1`); await sleep(900)
  await probe('reel/actions' + i)
}
// the checkout page's payment-method designs
const payDesigns = JSON.parse(await js(`JSON.stringify(window.showcase.sections('phone','checkout'))`) || '[]')
for (const s of payDesigns) {
  for (let i = 0; i < (s.names || []).length; i++) {
    await js(`window.showcase.sec('phone', 'checkout', '${s.key}', ${i}); window.punchApp.go('checkout'); 1`); await sleep(500)
    await probe(`checkout/${s.key}${i}`)
  }
}
// android too (the wallet mark flips)
await js(`(window.punchApp.device === 'android') ? 1 : (document.querySelector('[data-device="android"]')?.click(), 1)`); await sleep(1200)
await probe('android')
for (const p of ['checkout', 'paid']) { await js(`window.punchApp.go('${p}'); 1`); await sleep(700); await probe('android/' + p) }
for (const m of ['machine', 'animation', 'ds']) { await js(`window.showcase.mode('${m}'); 1`); await sleep(2500); await probe('mode/' + m) }
await js(`document.querySelector('#openCase')?.click(); 1`); await sleep(3000); await probe('case')

console.log(JSON.stringify({ payDesigns: payDesigns.map(d => d.key + ':' + (d.names || []).join('|')), seen, notSeen: WATCH.filter(c => !seen[c]), errors: errs.slice(0, 6) }, null, 1))
await writeFile('C:/Claude Database/punch-exercise/tools/tmp/skeptic/live.json', JSON.stringify(seen, null, 1))
ws.close(); chrome.kill()
