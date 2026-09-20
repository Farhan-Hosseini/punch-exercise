import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const MODE = process.argv[2] || 'none'   // none | pair | scriptsonly
const port = 9400 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1440,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push('EXC ' + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text))
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push('ERR ' + m.params.args.map(a => a.value || a.description).join(' '))
})
const send = (m, p = {}) => new Promise(r => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async e => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); sessionStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)
await js(`window.showcase.mode('animation'); 1`); await sleep(4000)

const SB = MODE === 'pair' ? 'allow-scripts allow-same-origin' : MODE === 'scriptsonly' ? 'allow-scripts' : null
let applied = null
if (SB) {
  // apply the sandbox then force the frame to reload under it, exactly as the HTML attribute would have
  applied = await js(`(() => { const f = document.getElementById('linkedFrame'); f.setAttribute('sandbox', ${JSON.stringify(SB)}); f.classList.remove('is-ready'); f.src = './?embed=machine'; return f.getAttribute('sandbox') })()`)
  await sleep(8000)
}

const out = JSON.parse(await js(`JSON.stringify((() => {
  const f = document.getElementById('linkedFrame'); const o = {}
  o.sandboxAttr = f ? f.getAttribute('sandbox') : 'NO FRAME'
  o.src = f ? f.getAttribute('src') : null
  o.classes = f ? f.className : null
  try { o.frameOrigin = f.contentWindow.location.origin } catch (e) { o.frameOrigin = 'THREW: ' + e.name }
  try { o.contentDocumentReachable = !!f.contentDocument && !!f.contentDocument.getElementById('machine') } catch (e) { o.contentDocumentReachable = 'THREW: ' + e.name }
  try { o.mscreenOfGlass = f.contentDocument.getElementById('machine').dataset.mscreen } catch (e) { o.mscreenOfGlass = 'THREW: ' + e.name }
  try { o.showcaseApiInFrame = typeof f.contentWindow.showcase === 'object' ? typeof f.contentWindow.showcase.mscreen : 'no showcase' } catch (e) { o.showcaseApiInFrame = 'THREW: ' + e.name }
  try { const d = f.contentDocument; o.frameBodyChildren = d.body.children.length; o.frameTextLen = d.body.innerText.trim().length } catch (e) { o.frameBodyChildren = 'THREW: ' + e.name }
  return o
})())`))
console.log(JSON.stringify({ mode: MODE, sandboxApplied: applied, ...out, parentErrors: [...new Set(errs)].slice(0, 8) }, null, 1))
ws.close(); chrome.kill()
