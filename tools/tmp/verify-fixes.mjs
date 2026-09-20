// Checks every fix made in this pass against the running site, each with the negative control that would catch a
// false pass. node tools/tmp/verify-fixes.mjs [width]
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const W = Number(process.argv[2] || 1440)
const port = 9440 + Math.floor(Math.random() * 60)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'vf' + port)}`, `--window-size=${W},1000`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0
const pend = new Map()
let errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).split('\n')[0])
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map((a) => a.value || a.description).join(' ').split('\n')[0])
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 1000, deviceScaleFactor: 1, mobile: false })

const out = []
const ok = (name, pass, detail) => out.push({ name, pass, detail })

async function boot(seed) {
  await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
  await js('localStorage.clear(); 1')
  if (seed) await js(seed)
  errs = []
  await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
}

/* 1. a hostile saved state must not take the app down -------------------------------------------------- */
await boot(`localStorage.setItem('punch-showcase.v5.variant', JSON.stringify({ variant: 'constructor', logo: 'toString', mscreen: 'valueOf', mode: 'hasOwnProperty' })); localStorage.setItem('punch-showcase.app.v2.page', JSON.stringify({ page: 'constructor', device: 'x', credits: 0 })); 1`)
const hostile = await js(`JSON.stringify({ loader: !!document.querySelector('.loader.is-done, .loader[hidden]'), stage: !!document.querySelector('.stage, .phone-stage'), mode: document.documentElement.dataset.mode || null, page: (document.querySelector('.m-page:not([inert])') || {}).dataset ? (document.querySelector('.m-page:not([inert])').dataset.page || null) : null, phoneVisible: !!document.querySelector('.device-wrap') })`)
ok('hostile localStorage keys boot cleanly', errs.length === 0, `${errs.length} errors; ${hostile}`)

/* negative control: the guard must be what saves it, not luck ------------------------------------------ */
const ctrl = await js(`JSON.stringify({ hasOwnOnProto: Object.hasOwn({}, 'constructor'), bareLookup: !!({}).constructor })`)
ok('negative control: a bare lookup would have passed', ctrl.includes('"hasOwnOnProto":false') && ctrl.includes('"bareLookup":true'), ctrl)

/* 2. every tab, clean ---------------------------------------------------------------------------------- */
await boot(null)
const tabs = {}
for (const m of ['mobile', 'machine', 'animation', 'ds']) {
  await js(`window.showcase.mode('${m}'); 1`); await sleep(2200)
  tabs[m] = JSON.parse(await js(`JSON.stringify({ overflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth) })`))
}
ok('four tabs, no sideways scroll', Object.values(tabs).every((t) => t.overflow === 0), JSON.stringify(tabs))
ok('four tabs, no console errors', errs.length === 0, errs.slice(0, 3).join(' | '))

/* 3. the typeface picker: contrast and keyboard --------------------------------------------------------- */
await js("document.getElementById('openCustom').click(); 1"); await sleep(1200)
const faces = await js(`JSON.stringify((() => {
  const lum = (c) => { const [r, g, b] = c.match(/[\\d.]+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return +(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2)) }
  const tiles = [...document.querySelectorAll('.face-tile')]
  return tiles.map((t) => {
    const bg = getComputedStyle(t).backgroundColor
    const s = t.querySelector('.face-tile-s'), n = t.querySelector('.face-tile-n')
    return { face: t.dataset.typeface, tab: t.tabIndex, checked: t.getAttribute('aria-checked'), sample: ratio(getComputedStyle(s).color, bg), name: ratio(getComputedStyle(n).color, bg) }
  })
})())`)
const f = JSON.parse(faces)
ok('typeface samples meet AA large (3:1)', f.every((x) => x.sample >= 3), faces)
ok('typeface names meet AA (4.5:1)', f.every((x) => x.name >= 4.5), f.map((x) => `${x.face} ${x.name}`).join(', '))
ok('typeface picker is one tab stop', f.filter((x) => x.tab === 0).length === 1, f.map((x) => `${x.face}:${x.tab}`).join(' '))

// General settings folds away when the panel opens now, so the picker is unfolded before the keyboard reaches it
await js(`document.querySelector('.custom details[data-acc="shared"]').open = true; 1`); await sleep(300)
await js(`document.querySelector('.face-tile[tabindex="0"]').focus(); 1`)
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 })
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 })
await sleep(900)
const after = await js(`JSON.stringify({ checked: (document.querySelector('.face-tile[aria-checked="true"]') || {}).dataset?.typeface, focus: (document.activeElement || {}).dataset?.typeface })`)
ok('arrow key moves the typeface selection', after.includes('orbitron'), after)
await js("document.querySelector('.face-tile[data-typeface=\"arena\"]').click(); document.getElementById('closeCustom').click(); 1"); await sleep(800)

/* 4. the checkout does not keep what was typed ---------------------------------------------------------- */
await js("window.showcase.mode('mobile'); 1"); await sleep(1800)
await js("window.punchApp.go('checkout'); 1"); await sleep(1600)
const typed = await js(`(() => {
  const r = [...document.querySelectorAll('#payMethods [data-method]')].find((b) => b.dataset.method === 'card')
  if (r) r.click()
  const f = document.getElementById('payCardNo')
  if (!f) return 'no field'
  f.value = '4111 1111 1111 1111'
  f.dispatchEvent(new Event('input', { bubbles: true }))
  return f.value
})()`)
await sleep(700)
await js("window.punchApp.go('default'); 1"); await sleep(1500)
const cleared = await js(`JSON.stringify(['payCardNo', 'payCardExp', 'payCardCvc'].map((i) => (document.getElementById(i) || {}).value))`)
ok('card fields are empty after leaving the checkout', cleared === '["","",""]', `typed ${typed} -> ${cleared}`)
const attrs = await js(`JSON.stringify(['payCardNo', 'payCardExp', 'payCardCvc'].map((i) => { const e = document.getElementById(i); return e ? { ac: e.getAttribute('autocomplete'), op: e.hasAttribute('data-1p-ignore') && e.getAttribute('data-lpignore') === 'true' } : null }))`)
ok('card fields opt out of autofill', !attrs.includes('cc-') && !attrs.includes('"op":false'), attrs)

/* 5. the clips draw a focus ring inside their frame ------------------------------------------------------ */
await js("window.showcase.mode('animation'); 1"); await sleep(2500)
// :focus-visible only resolves while the element has keyboard focus, so the clip is focused for real first
await js(`document.querySelector('.anim-glass .anim-clip').setAttribute('tabindex', '0'); document.querySelector('.anim-glass .anim-clip').focus(); 1`)
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 })
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 })
await sleep(500)
const ring = await js(`JSON.stringify((() => {
  const v = document.querySelector('.anim-glass .anim-clip')
  if (!v) return { missing: true }
  v.focus()
  const cs = getComputedStyle(v)
  // the rule itself, read out of the stylesheet, so the answer does not depend on the focus state resolving here
  let rule = null
  for (const sh of document.styleSheets) { try { for (const r of sh.cssRules) { if (r.selectorText && r.selectorText.includes('.anim-glass .anim-clip:focus-visible')) rule = r.style.outlineOffset } } catch (e) {} }
  return { ruleOffset: rule, focusVisible: v.matches(':focus-visible'), liveOffset: cs.outlineOffset, parentOverflow: getComputedStyle(v.parentElement).overflow }
})())`)
ok('clip focus ring is drawn inside the clipped frame', ring.includes('"ruleOffset":"-3px"'), ring)

ok('no console errors across the whole pass', errs.length === 0, errs.slice(0, 4).join(' | '))

const fails = out.filter((o) => !o.pass)
for (const o of out) console.log(`${o.pass ? 'PASS' : 'FAIL'}  ${o.name}\n        ${o.detail}`)
console.log(`\n${out.length - fails.length}/${out.length} passed at ${W}px`)
ws.close(); chrome.kill()
process.exit(fails.length ? 1 : 0)
