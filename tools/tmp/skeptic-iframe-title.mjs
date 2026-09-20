// Does the hero iframe at case.html:64 reach assistive tech at all?
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'cc' + port)}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' })
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
await js("document.getElementById('openCase').click(); 1"); await sleep(5000)

// 1. DOM state of the hero iframe and its ancestors
console.log('--- DOM state ---')
console.log(await js(`JSON.stringify((()=>{
  const f = document.querySelector('iframe[data-embed="hero"]')
  if(!f) return 'NOT FOUND'
  const anc=[]; let p=f
  while(p && p!==document.documentElement){ anc.push({tag:p.tagName.toLowerCase(), cls:p.className||'', ariaHidden:p.getAttribute('aria-hidden'), inert:p.hasAttribute('inert'), inertProp:p.inert===true}); p=p.parentElement }
  return { title: JSON.stringify(f.title), src: f.src, cls: f.className, rect: f.getBoundingClientRect().toJSON(),
           closestAriaHidden: !!f.closest('[aria-hidden="true"]'), closestInert: !!f.closest('[inert]'), ancestors: anc }
})())`, null, 2))

// 2. the REAL accessibility tree: is the node there, and is it ignored?
const { nodes } = (await send('Accessibility.getFullAXTree', { depth: -1 })).result
const frames = nodes.filter(n => (n.role?.value === 'Iframe') || (n.role?.value||'').toLowerCase().includes('frame') || n.ignored && (n.role?.value==='Iframe'))
console.log('--- AX tree iframe-ish nodes ---')
for (const n of nodes) {
  const r = n.role?.value || ''
  if (/iframe|frame|webarea/i.test(r)) {
    console.log(JSON.stringify({ role: r, name: n.name?.value ?? null, ignored: !!n.ignored, ignoredReasons: (n.ignoredReasons||[]).map(x=>x.name+'='+JSON.stringify(x.value?.value ?? x.value?.relatedNodes?.length)) }))
  }
}
// 3. resolve the exact backendNodeId of our iframe and look it up in the AX tree
const doc = (await send('DOM.getDocument', { depth: -1, pierce: false })).result
const q = (await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'iframe[data-embed="hero"]' })).result
console.log('--- partial AX for THAT node ---')
const part = (await send('Accessibility.getPartialAXTree', { nodeId: q.nodeId, fetchRelatives: true })).result
const self = part.nodes[0]
console.log(JSON.stringify({ role: self?.role?.value, name: self?.name?.value ?? null, ignored: !!self?.ignored, ignoredReasons: (self?.ignoredReasons||[]).map(x=>({ name:x.name, value:x.value?.value })) }, null, 2))
// 4. sanity: are the six named iframes exposed (not aria-hidden)?
console.log('--- all iframes on the page, a11y containment ---')
console.log(await js(`JSON.stringify([...document.querySelectorAll('iframe')].map(f=>({id:f.id||f.dataset.embed||f.dataset.dsLive||Object.keys(f.dataset)[0], title:f.title, hiddenByAria:!!f.closest('[aria-hidden="true"]'), inert:!!f.closest('[inert]')})),null,1)`))
ws.close(); chrome.kill()
