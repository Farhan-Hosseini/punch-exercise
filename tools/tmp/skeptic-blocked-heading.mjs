import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9800 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk5' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('DOM.enable'); await send('Accessibility.enable'); await send('Network.enable')
await send('Network.setBlockedURLs', { urls: ['*mpages/profile.js', '*mpages/connected.js'] })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js(`window.showcase.mode('mobile'); 1`); await sleep(1200)
await js(`window.punchApp && window.punchApp.go('connected'); 1`); await sleep(1800)
const doc = await send('DOM.getDocument', { depth: 0 })
const q = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '.m-page[data-page="connected"]' })
const tree = await send('Accessibility.getPartialAXTree', { nodeId: q.result.nodeId, fetchRelatives: true })
const headings = (tree.result.nodes || []).filter((n) => n.role?.value === 'heading').map((n) => n.name?.value)
console.log(JSON.stringify({
  connectedVisibleText: (await js(`document.querySelector('.m-page[data-page="connected"]').innerText.trim().slice(0,120)`)),
  headingsInSubtree: headings,
  h2TextInDom: await js(`[...document.querySelectorAll('.m-page[data-page="connected"] .cxl-title')].filter(e => e.offsetParent !== null).map(e => e.tagName + ':' + e.textContent.trim())`),
}, null, 1))
ws.close(); chrome.kill()
