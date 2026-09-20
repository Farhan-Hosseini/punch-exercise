import { launch, conn, newTarget, sleep } from './cdp.mjs'
const { port, chrome } = await launch({ w: 1440, h: 1000 })
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const page = list.find((x) => x.type === 'page')
const c = await conn(page.webSocketDebuggerUrl)
await c.send('Runtime.enable'); await c.send('Page.enable'); await c.send('Log.enable')
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await c.js(`window.showcase.mode('animation'); 1`); await sleep(4000)

// wait for the embedded machine
const frameUp = await c.js(`(() => { const f = document.getElementById('linkedFrame'); return f && f.getAttribute('src') ? (f.contentDocument ? f.contentDocument.readyState : 'no-doc') : 'no-src' })()`)
console.log('frame:', frameUp, 'errors so far:', c.errs.length)
const before = c.errs.length

// second same-origin tab that only posts on the channel
const t2 = await newTarget(port, 'http://localhost:5770/qr.css')
await sleep(1200)
const c2 = await conn(t2.webSocketDebuggerUrl)
await c2.send('Runtime.enable')
console.log('tab2 origin:', await c2.js('location.origin'))
const post = async (label, expr) => {
  const n0 = c.errs.length
  const r = await c2.js(`(() => { const ch = new BroadcastChannel('punch-flow'); ch.postMessage(${expr}); ch.close(); return 'sent' })()`)
  await sleep(1400)
  const state = await c.js(`(() => { try { const d = document.getElementById('linkedFrame').contentDocument; return d.getElementById('machine').dataset.mscreen } catch (e) { return 'ERR ' + e.message } })()`)
  console.log(JSON.stringify({ label, send: r, mscreen: state, newErrors: c.errs.slice(n0) }))
}
await post('null', 'null')
await post('string', '"mscreen"')
await post('number', '42')
await post('no key', `{ type: 'mscreen' }`)
await post('object key', `{ type: 'mscreen', key: { a: 1 } }`)
await post('unknown key', `{ type: 'mscreen', key: 'zzz-not-a-screen' }`)
await post('opts string', `{ type: 'mscreen', key: 'scan', opts: 'hostile' }`)
await post('opts array', `{ type: 'mscreen', key: 'record', opts: [1,2,3] }`)
await post('proto key', `{ type: 'mscreen', key: '__proto__' }`)
await post('proto in opts', `JSON.parse('{"type":"mscreen","key":"countdown","opts":{"__proto__":{"polluted":"yes"}}}')`)
await post('bad countdown', `{ type: 'mscreen', key: 'countdown', opts: { start: 'x', seconds: -5, impactAt: 'y', score: 'nope' } }`)
await post('huge countdown', `{ type: 'mscreen', key: 'countdown', opts: { start: Date.now(), seconds: 1e9, score: 1e308 } }`)
await post('record name obj', `{ type: 'mscreen', key: 'record', opts: { name: '<img src=x onerror=window.__pwned=1>', score: {}, best: [] } }`)
await post('score xss-ish', `{ type: 'mscreen', key: 'score', opts: { score: '<svg onload=window.__pwned=1>', run: '__proto__' } }`)
await post('loading next loop', `{ type: 'mscreen', key: 'loading', opts: { next: 'loading', duration: -1 } }`)
await post('deep', `{ type: 'mscreen', key: 'result', opts: { a: new Array(50).fill(0) } }`)

const pollution = await c.js(`JSON.stringify({ proto: ({}).polluted || null, pwned: window.__pwned || null, frameProto: (() => { try { const w = document.getElementById('linkedFrame').contentWindow; return w.Object.prototype.polluted || null } catch(e) { return 'x' } })(), framePwned: (() => { try { return document.getElementById('linkedFrame').contentWindow.__pwned || null } catch(e) { return 'x' } })() })`)
console.log('pollution:', pollution)
console.log('TOTAL new errors after fuzz:', c.errs.length - before)
console.log('errors:', JSON.stringify(c.errs.slice(before), null, 1))
console.log('log errors:', JSON.stringify(c.logs.slice(0, 10), null, 1))
c.ws.close(); c2.ws.close(); chrome.kill()
