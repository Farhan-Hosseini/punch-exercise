import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const BLOCK = process.argv[2] === 'block'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk2' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).slice(0, 160))
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map((a) => a.value || a.description).join(' ').slice(0, 160))
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('DOM.enable'); await send('Accessibility.enable'); await send('Network.enable')
if (BLOCK) await send('Network.setBlockedURLs', { urls: ['*mpages/profile.js', '*mpages/connected.js'] })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

async function ax(sel) {
  const doc = await send('DOM.getDocument', { depth: 0 })
  const q = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: sel })
  const nodeId = q.result?.nodeId
  if (!nodeId) return { sel, missing: true }
  const r = await send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false })
  const n = (r.result?.nodes || [])[0]
  if (!n) return { sel, noAxNode: true }
  return { sel, role: n.role?.value, name: n.name?.value ?? null, ignored: !!n.ignored, ignoredReasons: (n.ignoredReasons || []).map((i) => i.name) }
}

// dangling IDREF sweep in the LIVE dom, split on a literal space (no regex escapes)
const DANGLE = `JSON.stringify((() => {
  const attrs = ['aria-labelledby','aria-describedby','aria-controls','aria-owns','aria-activedescendant']
  const out = []
  for (const el of document.querySelectorAll('[' + attrs.join('],[') + ']')) {
    for (const a of attrs) {
      const v = el.getAttribute(a); if (!v) continue
      for (const tok of v.trim().split(' ')) {
        if (!tok) continue
        if (!document.getElementById(tok)) out.push(el.tagName + (el.id ? '#' + el.id : '.' + (el.className || '').toString().split(' ')[0]) + ' ' + a + '=' + tok)
      }
    }
  }
  return out
})())`

const out = { blocked: BLOCK }
out.danglingAtLoad = JSON.parse(await js(DANGLE))
await js(`window.showcase.mode('mobile'); 1`); await sleep(1500)
await js(`window.punchApp && window.punchApp.go('profile'); 1`); await sleep(2200)
out.profile = {
  hitsHeadingExists: await js(`!!document.getElementById('mHitsH')`),
  badgesHeadingExists: await js(`!!document.getElementById('mBadgesH')`),
  hitsInnerChars: await js(`(document.getElementById('mHits')||{}).innerHTML?.length ?? -1`),
  badgesInnerChars: await js(`(document.getElementById('mBadges')||{}).innerHTML?.length ?? -1`),
  hitsBox: await js(`JSON.stringify((() => { const e = document.getElementById('mHits'); if (!e) return null; const b = e.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) } })())`),
  axHits: await ax('#mHits'),
  axBadges: await ax('#mBadges'),
  pageVisibleTextChars: await js(`(document.querySelector('.m-page[data-page="profile"]')||{}).innerText?.trim().length ?? -1`),
}
await js(`window.punchApp && window.punchApp.go('connected'); 1`); await sleep(1800)
out.connected = {
  titleExists: await js(`!!document.getElementById('mConnectedTitle')`),
  ax: await ax('.m-page[data-page="connected"]'),
  visibleTextChars: await js(`(document.querySelector('.m-page[data-page="connected"]')||{}).innerText?.trim().length ?? -1`),
  designsVisible: await js(`[...document.querySelectorAll('.m-page[data-page="connected"] .cxl')].filter(e => e.offsetParent !== null).length`),
}
out.danglingAfter = JSON.parse(await js(DANGLE))
out.errors = errs.slice(0, 8)
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill()
