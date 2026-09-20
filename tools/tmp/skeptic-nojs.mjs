import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk3' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable')
await send('Emulation.setScriptExecutionDisabled', { value: true })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
// scripts are off, so read the DOM through CDP instead of Runtime.evaluate
const doc = await send('DOM.getDocument', { depth: -1, pierce: false })
function walk(n, acc) {
  if (!n) return acc
  if (n.nodeName === '#text' && n.nodeValue && n.nodeValue.trim()) acc.text += n.nodeValue.trim() + ' '
  for (const c of n.children || []) walk(c, acc)
  return acc
}
const acc = walk(doc.result.root, { text: '' })
const body = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: 'body' })
const box = await send('DOM.getBoxModel', { nodeId: body.result.nodeId }).catch(() => null)
const loader = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '#loader, .loader, [data-loader]' })
const shot = await send('Page.captureScreenshot', { format: 'png' })
const { writeFile } = await import('node:fs/promises')
await writeFile('tools/tmp/nojs.png', Buffer.from(shot.result.data, 'base64'))
// how much of that text is actually painted? sample: is <html> still marked as not-ready?
const html = await send('DOM.getOuterHTML', { nodeId: doc.result.root.nodeId })
const outer = html.result.outerHTML
console.log(JSON.stringify({
  scriptsDisabled: true,
  htmlOpeningTag: outer.slice(outer.indexOf('<html'), outer.indexOf('>', outer.indexOf('<html')) + 1),
  bodyClassAttr: (outer.match(/<body[^>]*>/) || [''])[0].slice(0, 200),
  loaderPresent: !!loader.result?.nodeId,
  domTextChars: acc.text.length,
  shot: 'tools/tmp/nojs.png',
}, null, 1))
ws.close(); chrome.kill()
