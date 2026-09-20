/* Same run as embed-cost.mjs pass B, but every 5770 response gets
   cache-control: public, max-age=600 instead of the dev server's no-store,
   to see whether the iframe's 3.5 MB is a dev-server artifact. */
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sc' + port)}`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0
const pend = new Map()
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
ws.addEventListener('message', async (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (m.method === 'Fetch.requestPaused') {
    const { requestId, responseStatusCode, responseHeaders } = m.params
    if (responseStatusCode == null) { send('Fetch.continueRequest', { requestId }); return }
    const hs = (responseHeaders || []).filter((h) => !/^cache-control$/i.test(h.name))
    hs.push({ name: 'cache-control', value: 'public, max-age=600' })
    const r = await send('Fetch.continueResponse', { requestId, responseCode: responseStatusCode, responseHeaders: hs })
    if (r.result?.error) { try { await send('Fetch.continueRequest', { requestId }) } catch {} }
  }
})
const sleepP = sleep
const withTimeout = (p, ms) => Promise.race([p, sleepP(ms).then(() => '__timeout')])
const js = async (e) => withTimeout(send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }).then((r) => r.result?.result?.value), 20000)
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Fetch.enable', { patterns: [{ urlPattern: 'http://localhost:5770/*', requestStage: 'Response' }] })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(2500)
await js('localStorage.clear(); 1')
await send('Network.clearBrowserCache')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(10000)
console.log('parent:', await js(`JSON.stringify((()=>{const r=performance.getEntriesByType('resource');return{n:r.length,kb:Math.round(r.reduce((a,x)=>a+(x.transferSize||0),0)/1024)}})())`))
console.log('mode:', await js(`window.showcase.mode('animation'); 1`))
await sleep(14000)
const probe = `JSON.stringify((()=>{const f=document.getElementById('linkedFrame');if(!f||!f.contentWindow)return{no:1};const w=f.contentWindow;const r=w.performance.getEntriesByType('resource');const zero=r.filter(x=>(x.transferSize||0)===0&&(x.decodedBodySize||0)>0);return{src:f.getAttribute('src'),els:w.document.querySelectorAll('*').length,n:r.length,transferKB:Math.round(r.reduce((a,x)=>a+(x.transferSize||0),0)/1024),decodedKB:Math.round(r.reduce((a,x)=>a+(x.decodedBodySize||0),0)/1024),fromCache:zero.length,cachedKB:Math.round(zero.reduce((a,x)=>a+x.decodedBodySize,0)/1024)}})())`
console.log('iframe:', await js(probe))
ws.close(); chrome.kill()
process.exit(0)
