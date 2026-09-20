/* Re-run the same measurement, but rewrite the dev server's `cache-control: no-store`
   into what Netlify actually serves for a static file: revalidate + a strong etag.
   Only Document/Stylesheet/Script/Font are intercepted. */
import { open, sleep } from './cdp.mjs'
import { createHash } from 'node:crypto'
const c = await open({ w: 1600, h: 1000 })
const reqs = new Map(); let phase = 'initial'; const bucket = {}
const add = (p) => (bucket[p] ||= { n: 0, bytes: 0, byType: {}, cached: 0, docs: [] })
c.on((m) => {
  if (m.method === 'Network.requestWillBeSent') reqs.set(m.params.requestId, { url: m.params.request.url, phase, type: m.params.type })
  else if (m.method === 'Network.responseReceived') { const r = reqs.get(m.params.requestId); if (r) { r.type = m.params.type; r.disk = m.params.response.fromDiskCache; r.status = m.params.response.status } }
  else if (m.method === 'Network.requestServedFromCache') { const r = reqs.get(m.params.requestId); if (r) r.mem = true }
  else if (m.method === 'Network.loadingFinished') {
    const r = reqs.get(m.params.requestId); if (!r) return
    const b = add(r.phase); b.n++; b.bytes += m.params.encodedDataLength
    if (r.mem || r.disk) b.cached++
    const t = r.type || '?'; b.byType[t] = (b.byType[t] || 0) + m.params.encodedDataLength
    if (t === 'Document') b.docs.push(r.url.replace('http://localhost:5770/','') + ' ' + m.params.encodedDataLength + (r.mem?' MEM':'') + (r.disk?' DISK':''))
  }
})
await c.send('Fetch.enable', { patterns: ['Document','Stylesheet','Script','Font'].map((resourceType) => ({ urlPattern: '*', requestStage: 'Response', resourceType })) })
c.on(async (m) => {
  if (m.method !== 'Fetch.requestPaused') return
  const p = m.params
  try {
    if (p.responseStatusCode === 304) { await c.send('Fetch.continueResponse', { requestId: p.requestId }); return }
    const body = await c.send('Fetch.getResponseBody', { requestId: p.requestId })
    const b64 = body.result?.body ?? ''
    const etag = '"' + createHash('sha1').update(b64).digest('hex').slice(0, 16) + '"'
    const headers = (p.responseHeaders || []).filter((h) => !/^(cache-control|etag|age)$/i.test(h.name))
    headers.push({ name: 'cache-control', value: 'public, max-age=0, must-revalidate' }, { name: 'etag', value: etag })
    await c.send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: p.responseStatusCode || 200, responseHeaders: headers, body: b64 })
  } catch (e) { try { await c.send('Fetch.continueResponse', { requestId: p.requestId }) } catch {} }
})
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await c.js('localStorage.clear(); 1')
reqs.clear(); for (const k of Object.keys(bucket)) delete bucket[k]
phase = 'initial'
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(8000)
for (const mode of ['machine','ds','animation']) { phase = mode; await c.js(`window.showcase.mode('${mode}'); 1`); await sleep(8000) }
phase = 'case'
await c.js(`document.getElementById('openCase').click(); 1`); await sleep(3000)
await c.js(`(()=>{const d=document.getElementById('case'); const s=d.querySelector('.cs-scroll')||d; let h=s.scrollHeight; for(let y=0;y<h;y+=600) s.scrollTop=y; return h})()`); await sleep(8000)
for (const [k, v] of Object.entries(bucket)) {
  console.log(`\n${k}: ${v.n} req, ${v.bytes.toLocaleString()} B  (${v.cached} served from cache)`)
  for (const [t, b] of Object.entries(v.byType).sort((a,z)=>z[1]-a[1])) console.log('   ', t, b.toLocaleString())
  if (v.docs.length) console.log('    Documents:', JSON.stringify(v.docs))
}
console.log('errors:', c.errs.slice(0,6))
c.close()
