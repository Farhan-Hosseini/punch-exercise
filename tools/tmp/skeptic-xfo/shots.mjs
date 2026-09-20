// Save the A (no header) and B (frame-ancestors 'self') cross-origin framing screenshots, with a correct
// cross-origin check: a cross-origin frame that LOADED returns contentDocument === null (it does not throw).
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const HERE = 'C:/Claude Database/punch-exercise/tools/tmp/skeptic-xfo'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function run (tag, header) {
  const port = 9900 + Math.floor(Math.random() * 90)
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--force-prefers-reduced-motion=no-preference',
    `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sh' + port)}`,
    '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' })
  let t
  for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  let id = 0; const pend = new Map()
  const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
  ws.addEventListener('message', async (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
    if (m.method === 'Fetch.requestPaused') {
      const { requestId, responseHeaders = [], responseStatusCode, request } = m.params
      try {
        const b = (await send('Fetch.getResponseBody', { requestId })).result
        const hdrs = responseHeaders.filter((h) => !/^content-(length|security-policy)$|^x-frame-options$/i.test(h.name))
        if (request.url.startsWith('http://localhost:5770') && header) hdrs.push(header)
        await send('Fetch.fulfillRequest', { requestId, responseCode: responseStatusCode || 200, responseHeaders: hdrs, body: b.base64Encoded ? b.body : Buffer.from(b.body, 'utf8').toString('base64') })
      } catch { await send('Fetch.continueRequest', { requestId }).catch(() => {}) }
    }
  })
  const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
  await send('Runtime.enable'); await send('Page.enable')
  await send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Response', resourceType: 'Document' }] })
  await send('Page.navigate', { url: 'file:///' + join(HERE, 'attacker.html').replace(/\\/g, '/') })
  await sleep(9000)
  const probe = JSON.parse(await js(`JSON.stringify((()=>{
    const f=document.getElementById('f')
    return { contentDocumentIsNull: f.contentDocument===null,
             subframeCountInsideFrame: f.contentWindow.length,
             frameOrigin: (()=>{try{return String(f.contentWindow.location.href).slice(0,40)}catch(e){return 'SecurityError -> a real cross-origin document is loaded'}})() }
  })())`))
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(HERE, tag + '.png'), Buffer.from(shot.result.data, 'base64'))
  ws.close(); chrome.kill()
  return { tag, header: header ? `${header.name}: ${header.value}` : '(none)', ...probe }
}
console.log(JSON.stringify([
  await run('A-no-header', null),
  await run('B-frame-ancestors-self', { name: 'Content-Security-Policy', value: "frame-ancestors 'self'" })
], null, 1))
