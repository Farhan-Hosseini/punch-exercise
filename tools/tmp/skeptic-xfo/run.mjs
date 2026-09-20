// Skeptic probe for the "no frame-ancestors / X-Frame-Options" finding.
// A: cross-origin (file:// = opaque origin) page frames http://localhost:5770/ with NO header  -> does it render?
// B: same, but CDP injects `Content-Security-Policy: frame-ancestors 'self'`                   -> negative control
// C: top-level load with frame-ancestors 'self', Animation tab  -> does the SELF-embed survive?
// D: top-level load with X-Frame-Options: DENY, Animation tab   -> does the SELF-embed break? (the reporter's "trap")
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const HERE = 'C:/Claude Database/punch-exercise/tools/tmp/skeptic-xfo'
mkdirSync(HERE, { recursive: true })
const ATTACKER = join(HERE, 'attacker.html')
writeFileSync(ATTACKER, `<!doctype html><meta charset=utf-8><title>attacker</title>
<body style="margin:0;background:#f0f">
<h1 id=h>third-party page</h1>
<iframe id=f src="http://localhost:5770/" width="1200" height="800" style="border:4px solid lime"></iframe>
</body>`)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function run (label, { header, topUrl, attacker }) {
  const port = 9500 + Math.floor(Math.random() * 400)
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--force-prefers-reduced-motion=no-preference', '--allow-file-access-from-files',
    `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'xfo' + port)}`,
    '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
  let t
  for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  let id = 0; const pend = new Map(); const logs = []; const seenHeaders = {}
  const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
  ws.addEventListener('message', async (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
    if (m.method === 'Log.entryAdded') { const x = m.params.entry.text || ''; if (/Refused to (display|frame)|frame-ancestors|X-Frame-Options/i.test(x)) logs.push(x.slice(0, 260)) }
    else if (m.method === 'Fetch.requestPaused') {
      const { requestId, responseHeaders = [], responseStatusCode, request } = m.params
      try {
        const b = (await send('Fetch.getResponseBody', { requestId })).result
        const hdrs = responseHeaders.filter((h) => !/^content-(length|security-policy)$|^x-frame-options$/i.test(h.name))
        if (request.url.startsWith('http://localhost:5770') && header) hdrs.push(header)
        if (request.url.startsWith('http://localhost:5770')) seenHeaders[request.url.slice(21) || '/'] = responseHeaders.map(h => h.name.toLowerCase()).join(',')
        await send('Fetch.fulfillRequest', { requestId, responseCode: responseStatusCode || 200, responseHeaders: hdrs, body: b.base64Encoded ? b.body : Buffer.from(b.body, 'utf8').toString('base64') })
      } catch { await send('Fetch.continueRequest', { requestId }).catch(() => {}) }
    }
  })
  const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
  await send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Response', resourceType: 'Document' }] })

  const out = { label, header: header ? `${header.name}: ${header.value}` : '(none injected)' }

  if (attacker) {
    await send('Page.navigate', { url: 'file:///' + ATTACKER.replace(/\\/g, '/') })
    await sleep(8000)
    const tree = (await send('Page.getFrameTree')).result.frameTree
    const kids = (tree.childFrames || []).map((c) => ({ url: (c.frame.url || '').slice(0, 60), unreachable: c.frame.unreachableUrl || null, secOrigin: (c.frame.securityOrigin || '').slice(0, 40) }))
    out.childFrames = kids
    // cross-origin: we cannot read the doc, but a LOADED frame reports its own subframe count (the showcase lazily adds its own iframes)
    out.frameWindowExists = await js(`!!document.getElementById('f').contentWindow`)
    out.crossOriginDocBlocked = await js(`(()=>{try{ document.getElementById('f').contentDocument && document.getElementById('f').contentDocument.title; return 'readable(SAME-ORIGIN/blocked-errorpage)'}catch(e){return 'SecurityError(real cross-origin doc loaded)'}})()`)
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    out.screenshotBytes = Buffer.from(shot.result.data, 'base64').length
  } else {
    await send('Page.navigate', { url: topUrl }); await sleep(4000)
    await js('try{localStorage.clear()}catch(e){}; 1')
    await send('Page.navigate', { url: topUrl }); await sleep(6500)
    await js(`try{window.showcase.mode('animation')}catch(e){}; 1`); await sleep(5000)
    out.selfEmbed = JSON.parse(await js(`JSON.stringify((()=>{
      const f = document.getElementById('linkedFrame')
      if (!f) return { found:false }
      let docOk=false, bodyKids=-1, innerHTMLLen=-1, err=null
      try { const d=f.contentDocument; docOk=!!d; if(d){ bodyKids=d.body?d.body.childElementCount:-2; innerHTMLLen=d.documentElement?d.documentElement.innerHTML.length:-2 } } catch(e){ err=String(e).slice(0,80) }
      return { found:true, src:f.getAttribute('src'), isReady:f.classList.contains('is-ready'),
               docAccessible:docOk, bodyChildElementCount:bodyKids, docHTMLLength:innerHTMLLen, error:err }
    })())`))
  }
  out.refusalLogs = logs.slice(0, 4)
  out.serverSentHeadersFor_root = seenHeaders['/'] || seenHeaders['/?embed=machine'] || '(n/a)'
  ws.close(); chrome.kill()
  return out
}

const results = []
results.push(await run('A cross-origin frame, NO header (today)', { attacker: true, header: null }))
results.push(await run("B cross-origin frame, frame-ancestors 'self' (negative control)", { attacker: true, header: { name: 'Content-Security-Policy', value: "frame-ancestors 'self'" } }))
results.push(await run("C self-embed under frame-ancestors 'self'", { topUrl: 'http://localhost:5770/', header: { name: 'Content-Security-Policy', value: "frame-ancestors 'self'" } }))
results.push(await run('D self-embed under X-Frame-Options: DENY', { topUrl: 'http://localhost:5770/', header: { name: 'X-Frame-Options', value: 'DENY' } }))
console.log(JSON.stringify(results, null, 1))
