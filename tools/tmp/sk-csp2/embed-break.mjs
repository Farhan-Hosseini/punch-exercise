// What does the live-machine iframe actually render, with and without the proposed CSP?
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const CSP = process.argv[2] || ''
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb',
  '--force-prefers-reduced-motion=no-preference',
  `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'skemb' + port)}`,
  '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
ws.addEventListener('message', async (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (m.method === 'Fetch.requestPaused') {
    const { requestId, responseHeaders = [], responseStatusCode } = m.params
    try {
      const b = (await send('Fetch.getResponseBody', { requestId })).result
      const hdrs = responseHeaders.filter((h) => !/^content-(length|security-policy)$/i.test(h.name))
      if (CSP) hdrs.push({ name: 'Content-Security-Policy', value: CSP })
      await send('Fetch.fulfillRequest', { requestId, responseCode: responseStatusCode || 200, responseHeaders: hdrs, body: b.base64Encoded ? b.body : Buffer.from(b.body, 'utf8').toString('base64') })
    } catch { await send('Fetch.continueRequest', { requestId }).catch(() => {}) }
  }
})
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Response', resourceType: 'Document' }] })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4500)
await js(`try{localStorage.clear()}catch(e){}; 1`)
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(7000)
await js(`try{window.showcase.mode('animation')}catch(e){}; 1`); await sleep(7000)

const probe = `(function(){
  var f=document.querySelector('iframe[src*="embed=machine"]');
  if(!f) return {err:'no iframe'};
  var d;
  try{ d=f.contentDocument }catch(e){ return {err:'x-origin'} }
  if(!d) return {err:'no doc'};
  var r=f.getBoundingClientRect();
  var root=d.documentElement;
  var mach=d.getElementById('machine');
  var mr=mach?mach.getBoundingClientRect():null;
  // the page chrome that an embed must NOT show
  var nav=d.querySelector('.nav, header.nav, #topnav, [data-nav]');
  return {
    embedFlag: String(root.dataset.embed),
    docMode: String(root.dataset.mode||root.getAttribute('data-mode')),
    zoomVar: d.defaultView.getComputedStyle(root).getPropertyValue('--zoom').trim(),
    machineVisible: mach? d.defaultView.getComputedStyle(mach).display : 'none',
    machineW: mr?Math.round(mr.width):0, machineH: mr?Math.round(mr.height):0,
    iframeW: Math.round(r.width), iframeH: Math.round(r.height),
    scrollH: d.documentElement.scrollHeight,
    hasVisibleNav: !!(nav && d.defaultView.getComputedStyle(nav).display!=='none'),
    bodyText: (d.body.innerText||'').replace(/\\s+/g,' ').slice(0,140)
  };
})()`
console.log(JSON.stringify({ csp: CSP || '(none)', iframe: JSON.parse(await js(`JSON.stringify(${probe})`)) }, null, 1))
ws.close(); chrome.kill()
