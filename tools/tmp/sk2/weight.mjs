import { open, sleep } from './cdp.mjs'
const CACHE_DISABLED = process.argv[2] === 'nocache'
const c = await open({ w: 1600, h: 1000 })
const reqs = new Map(); let phase = 'initial'
const bucket = {}
const add = (p) => (bucket[p] ||= { n: 0, bytes: 0, byType: {}, docs: [] })
c.on((m) => {
  if (m.method === 'Network.requestWillBeSent') reqs.set(m.params.requestId, { url: m.params.request.url, phase, type: m.params.type })
  else if (m.method === 'Network.responseReceived') { const r = reqs.get(m.params.requestId); if (r) { r.type = m.params.type; r.fromCache = m.params.response.fromDiskCache; r.status = m.params.response.status } }
  else if (m.method === 'Network.requestServedFromCache') { const r = reqs.get(m.params.requestId); if (r) r.memCache = true }
  else if (m.method === 'Network.loadingFinished') {
    const r = reqs.get(m.params.requestId); if (!r) return
    const b = add(r.phase); b.n++; b.bytes += m.params.encodedDataLength
    const t = r.type || '?'; b.byType[t] = (b.byType[t] || 0) + m.params.encodedDataLength
    if (t === 'Document') b.docs.push(r.url.replace('http://localhost:5770/', '') + ' ' + m.params.encodedDataLength + (r.memCache ? ' MEM' : '') + (r.fromCache ? ' DISK' : ''))
  }
})
await c.send('Network.setCacheDisabled', { cacheDisabled: CACHE_DISABLED })
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await c.js('localStorage.clear(); 1')
// fresh start, counted
reqs.clear(); for (const k of Object.keys(bucket)) delete bucket[k]
phase = 'initial'
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
for (const mode of ['machine', 'ds', 'animation']) {
  phase = mode
  await c.js(`window.showcase.mode('${mode}'); 1`); await sleep(6000)
}
phase = 'case'
await c.js(`document.getElementById('openCase').click(); 1`); await sleep(3000)
await c.js(`(()=>{const d=document.getElementById('case'); const s=d.querySelector('[class*=scroll],.cs-scroll')||d; let h=s.scrollHeight; for(let y=0;y<h;y+=600) s.scrollTop=y; return h})()`); await sleep(6000)
await c.js(`(()=>{const d=document.getElementById('case'); const s=d.querySelector('.cs-scroll')||d; s.scrollTop=s.scrollHeight; return 1})()`); await sleep(5000)
console.log('cacheDisabled =', CACHE_DISABLED)
for (const [k, v] of Object.entries(bucket)) {
  console.log(`\n${k}: ${v.n} req, ${v.bytes.toLocaleString()} B`)
  for (const [t, b] of Object.entries(v.byType).sort((a,z)=>z[1]-a[1])) console.log('   ', t, b.toLocaleString())
  if (v.docs.length) console.log('    Documents:', JSON.stringify(v.docs))
}
const served = [...reqs.values()].filter(r => r.memCache || r.fromCache).length
console.log('\nrequests served from cache (mem or disk):', served, 'of', reqs.size)
console.log('iframe srcs:', await c.js(`JSON.stringify([...document.querySelectorAll('iframe')].map(f=>f.getAttribute('src')))`))
console.log('errors:', c.errs.slice(0,6))
c.close()
