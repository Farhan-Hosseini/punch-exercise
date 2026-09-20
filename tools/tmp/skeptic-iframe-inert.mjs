// Which ancestor makes each iframe inert, and is ANY of the seven in the a11y tree?
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'cc'+port)}`,'--window-size=1440,900','about:blank'], { stdio: 'ignore' })
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
console.log('=== A. case overlay CLOSED, DS tab active (the state where the ds/linked frames live) ===')
await js("window.showcase.mode('ds'); 1"); await sleep(4000)
const Hd = await js("(document.scrollingElement||document.body).scrollHeight")
for (let y = 0; y < Hd; y += 800) { await js(`window.scrollTo(0,${y});1`); await sleep(70) }
await sleep(2500)
console.log(await js(`JSON.stringify([...document.querySelectorAll('iframe')].map(f=>{
  const ih=f.closest('[inert]'); const ah=f.closest('[aria-hidden="true"]')
  return {who:f.id||f.dataset.embed||f.dataset.dsLive||Object.keys(f.dataset)[0], title:f.title,
          inertAncestor: ih? (ih.tagName.toLowerCase()+'.'+(ih.className||'')+(ih.id?'#'+ih.id:'')) : null,
          ariaHiddenAncestor: ah? (ah.tagName.toLowerCase()+'.'+(ah.className||'')+(ah.id?'#'+ah.id:'')) : null}
}),null,1)`))
async function ax(sel, label) {
  const doc = (await send('DOM.getDocument', { depth: -1 })).result
  const q = (await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: sel })).result
  if (!q.nodeId) return console.log(label, '-> no match')
  const n = (await send('Accessibility.getPartialAXTree', { nodeId: q.nodeId, fetchRelatives: false })).result.nodes[0]
  console.log(label, JSON.stringify({ role: n?.role?.value, name: n?.name?.value ?? null, ignored: !!n?.ignored, reasons: (n?.ignoredReasons||[]).map(x=>x.name) }))
}
for (const [s,l] of [['#linkedFrame','  linkedFrame       '],['iframe[data-ds-monframe]','  dsMonframe        '],['iframe[data-ds-live="stats"]','  ds live stats     '],['iframe[data-ds-live="score"]','  ds live score     '],['iframe[data-ds-flowframe]','  dsFlowframe       ']]) await ax(s,l)
ws.close(); chrome.kill()
