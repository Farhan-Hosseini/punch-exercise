import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9610 + Math.floor(Math.random() * 70)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'ae'+port)}`,'--window-size=1440,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('DOM.enable'); await send('Accessibility.enable')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)

async function ax(sel) {
  const doc = await send('DOM.getDocument', { depth: -1, pierce: false })
  const q = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: sel })
  if (!q.result?.nodeId) return { sel, err: 'not found' }
  const r = await send('Accessibility.getPartialAXTree', { nodeId: q.result.nodeId, fetchRelatives: false })
  const n = r.result?.nodes?.[0]
  return { sel, ignored: n?.ignored, ignoredReasons: (n?.ignoredReasons || []).map(x => x.name + '=' + JSON.stringify(x.value?.value)), role: n?.role?.value, name: n?.name?.value,
    expanded: n?.properties?.find(p => p.name === 'expanded')?.value?.value ?? null }
}
const attrs = (sel) => js(`JSON.stringify((()=>{const e=document.querySelector('${sel}');return e?{expanded:e.getAttribute('aria-expanded'),haspopup:e.getAttribute('aria-haspopup')}:null})())`)

const out = {}
// baseline, everything closed
out.closed = { case: await ax('#openCase'), brief: await ax('#openBrief'), help: await ax('#openHelp'), custom: await ax('#openCustom'),
  topbarInert: await js('document.querySelector(".topbar").inert') }

for (const [k, btn] of [['case','#openCase'],['brief','#openBrief'],['help','#openHelp'],['custom','#openCustom']]) {
  await js(`document.querySelector('${btn}').click(); 1`); await sleep(900)
  out[k + '_open'] = {
    dialogOpen: await js(`!!document.querySelector('.case.is-open, .brief.is-open, .helpwrap.is-open')`),
    topbarInert: await js('document.querySelector(".topbar").inert'),
    openerAX: await ax(btn),
    openerAttrs: JSON.parse(await attrs(btn)),
  }
  // close again
  await js(`document.querySelectorAll('#closeCase,#closeBrief,#closeHelp,#closeCustom').forEach(b=>{const o=b.closest('.case,.brief,.helpwrap,.custom');if(o&&o.classList.contains('is-open'))b.click()}); 1`)
  await sleep(900)
}
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill()
