// NEGATIVE CONTROL: the same probe, run on the *named* sibling iframe (seq) and on a
// temporarily un-hidden copy of the hero iframe, to prove the probe can see an exposed frame.
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9600 + Math.floor(Math.random() * 90)
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
await js("document.getElementById('openCase').click(); 1"); await sleep(3000)
// scroll to the machine chapter so the seq embed exists & paints
const H = await js("document.getElementById('caseScroll').scrollHeight")
for (let y = 0; y < H; y += 800) { await js(`document.getElementById('caseScroll').scrollTo(0, ${y}); 1`); await sleep(80) }
await sleep(2500)
async function ax(sel, label) {
  const doc = (await send('DOM.getDocument', { depth: -1 })).result
  const q = (await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: sel })).result
  if (!q.nodeId) return console.log(label, '-> selector did not match')
  const p = (await send('Accessibility.getPartialAXTree', { nodeId: q.nodeId, fetchRelatives: false })).result
  const n = p.nodes[0]
  console.log(label, JSON.stringify({ role: n?.role?.value, name: n?.name?.value ?? null, ignored: !!n?.ignored, reasons: (n?.ignoredReasons||[]).map(x=>x.name) }))
}
await ax('iframe[data-embed="seq"]', 'CONTROL named sibling (seq)      :')
await ax('iframe[data-embed="hero"]', 'SUBJECT hero, as shipped         :')
// now strip the aria-hidden and re-measure the SAME node: does the probe then see an unnamed frame?
await js(`document.querySelector('[data-hero-stage]').removeAttribute('aria-hidden'); document.querySelector('.cs-hero-glass').removeAttribute('inert'); 1`)
await sleep(600)
await ax('iframe[data-embed="hero"]', 'CONTROL hero with aria-hidden off:')
ws.close(); chrome.kill()
