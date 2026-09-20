// Simulate a real host's cache semantics on top of the dev server (which sends no-store),
// by rewriting response headers via CDP Fetch interception. Two modes:
//   netlify  -> "public, max-age=0, must-revalidate" + ETag   (Netlify's documented default)
//   immutable-> assets/fonts get "public, max-age=31536000, immutable"; everything else as netlify
// Then: load twice, and report how many requests the SECOND load puts on the wire.
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
const MODE = process.argv[2] || 'netlify'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sw'+port)}`,'--window-size=1440,1000','about:blank'], { stdio: 'ignore' })
const sleep = ms => new Promise(r => setTimeout(r, ms))
let t
for (let i=0;i<90&&!t;i++){ try{ t=(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page') }catch{ await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r, { once: true }))
let id=0; const pend=new Map()
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
const etags=new Map()
let wire=[]           // requests that actually reached the interceptor (i.e. hit the network)
let counting=false
ws.addEventListener('message', async e => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (m.method !== 'Fetch.requestPaused') return
  const p = m.params
  const path = new URL(p.request.url).pathname
  try {
    if (!p.responseStatusCode) { await send('Fetch.continueRequest', { requestId: p.requestId }); return }
    const inm = Object.entries(p.request.headers).find(([k])=>k.toLowerCase()==='if-none-match')?.[1]
    const body = await send('Fetch.getResponseBody', { requestId: p.requestId })
    const raw = body.result?.body || ''
    const etag = '"' + createHash('sha1').update(raw).digest('hex').slice(0,16) + '"'
    const ct = p.responseHeaders.find(h=>h.name.toLowerCase()==='content-type')?.value || 'application/octet-stream'
    const longLived = MODE==='immutable' && (path.startsWith('/assets/') || path.startsWith('/fonts/'))
    const cc = longLived ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate'
    if (counting) wire.push({ path, revalidated: inm === etag })
    if (inm && inm === etag) {
      await send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 304, responseHeaders: [{name:'etag',value:etag},{name:'cache-control',value:cc}] })
    } else {
      await send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{name:'content-type',value:ct},{name:'etag',value:etag},{name:'cache-control',value:cc}], body: body.result?.base64Encoded ? raw : Buffer.from(raw,'utf8').toString('base64') })
    }
  } catch { try { await send('Fetch.continueRequest', { requestId: p.requestId }) } catch {} }
})
await send('Runtime.enable'); await send('Page.enable')
await send('Fetch.enable', { patterns: [{ urlPattern: 'http://localhost:5770/*', requestStage: 'Response' }] })
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(9000)   // cold: fills the cache
await js('localStorage.clear(); 1')
wire=[]; counting=true
const t0 = Date.now()
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(9000)   // warm: second visit
const entries = JSON.parse(await js('JSON.stringify(performance.getEntriesByType("resource").map(e=>({n:e.name.replace("http://localhost:5770",""),s:Math.round(e.transferSize),d:Math.round(e.duration)})))'))
const fromCache = entries.filter(e=>e.s===0)
console.log('MODE:', MODE)
console.log('warm visit -> resource entries:', entries.length, '| served from cache with NO network (transferSize 0):', fromCache.length, '| revalidated on the wire:', entries.length - fromCache.length)
console.log('warm transferSize total bytes:', entries.reduce((a,e)=>a+e.s,0))
console.log('interceptor saw on the wire:', wire.length, '| of which 304-able:', wire.filter(w=>w.revalidated).length)
console.log('load event ms:', await js('Math.round(performance.timing.loadEventEnd-performance.timing.navigationStart)'))
ws.close(); chrome.kill()
