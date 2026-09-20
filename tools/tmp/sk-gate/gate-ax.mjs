import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = Number(process.argv[2] || 390), H = Number(process.argv[3] || 844)
const URL_ = process.argv[4] || 'http://localhost:5770/'
const port = 9400 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'gx' + port)}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' })
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
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map(a => a.value || a.description).join(' '))
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return { __err: r.result.exceptionDetails.text + ' ' + (r.result.exceptionDetails.exception?.description||'') }; return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable'); await send('Accessibility.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 768 })
await send('Page.navigate', { url: URL_ }); await sleep(3500)
await js('try{localStorage.clear()}catch(e){}; 1')
await send('Page.navigate', { url: URL_ }); await sleep(6000)

// full accessibility tree: what a screen reader actually gets
const ax = (await send('Accessibility.getFullAXTree')).result?.nodes || []
const live = ax.filter(n => !n.ignored).map(n => ({
  role: n.role?.value,
  name: n.name?.value,
  props: Object.fromEntries((n.properties||[]).map(p => [p.name, p.value?.value]))
}))
const modalProps = ax.filter(n => (n.properties||[]).some(p => p.name === 'modal')).map(n => ({ role: n.role?.value, name: n.name?.value, modal: (n.properties||[]).find(p=>p.name==='modal')?.value?.value }))

const dom = JSON.parse(await js(`JSON.stringify((() => {
  const g = document.querySelector('.deskgate')
  const cs = g ? getComputedStyle(g) : null
  const inGate = (el) => g && g.contains(el)
  const FOCUSABLE = 'a[href],button,input,select,textarea,summary,iframe,[tabindex]:not([tabindex="-1"]),video[controls],audio[controls]'
  const vis = (el) => { const s = getComputedStyle(el); if (s.display==='none'||s.visibility==='hidden') return false; const b=el.getBoundingClientRect(); return b.width>0||b.height>0 }
  const focusOutside = [...document.querySelectorAll(FOCUSABLE)].filter(el => !inGate(el) && vis(el)).map(el => el.tagName+'.'+(el.className||'').toString().split(' ')[0])
  const bodyKids = [...document.body.children].filter(el => el.tagName!=='SCRIPT').map(el => ({ tag: el.tagName, cls: (el.className||'').toString().split(' ')[0], display: getComputedStyle(el).display, hidden: el.hasAttribute('hidden'), inert: el.inert===true, ariaHidden: el.getAttribute('aria-hidden') }))
  return {
    gateExists: !!g,
    gateDisplay: cs && cs.display, gateVisibility: cs && cs.visibility, gateZ: cs && cs.zIndex,
    gateRole: g && g.getAttribute('role'),
    gateAriaModal: g && g.getAttribute('aria-modal'),
    gateTabindex: g && g.getAttribute('tabindex'),
    bodyOverflow: getComputedStyle(document.body).overflow,
    scrollHeight: document.documentElement.scrollHeight, innerHeight: innerHeight, innerWidth: innerWidth,
    focusOutside, bodyKids,
    dataEmbed: document.documentElement.dataset.embed || null,
    loaderDone: !!document.getElementById('loader')?.classList.contains('is-done'),
    active: document.activeElement && (document.activeElement.tagName + '.' + (document.activeElement.className||'').toString().split(' ')[0])
  }
})())`))

// synthetic Tab x5 through the real input pipeline
for (let i = 0; i < 5; i++) {
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 })
  await sleep(120)
}
const afterTab = await js(`document.activeElement ? document.activeElement.tagName + '.' + (document.activeElement.className||'').toString().split(' ')[0] : 'null'`)

console.log(JSON.stringify({ url: URL_, viewport: [W, H], dom, afterTab, axLiveCount: live.length, axLive: live, modalProps, errors: errs.slice(0, 6) }, null, 1))
const shot = await send('Page.captureScreenshot', { format: 'png' })
await writeFile(join('C:/Claude Database/punch-exercise/tools/tmp/sk-gate', `gate-${W}x${H}${URL_.includes('embed')?'-embed':''}.png`), Buffer.from(shot.result.data, 'base64'))
ws.close(); chrome.kill()
