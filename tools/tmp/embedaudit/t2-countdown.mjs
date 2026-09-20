import { launch, conn, newTarget, sleep } from './cdp.mjs'
const SECONDS = process.argv[2] || '1e9'
const { port, chrome } = await launch({ w: 1440, h: 1000 })
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const page = list.find((x) => x.type === 'page')
const c = await conn(page.webSocketDebuggerUrl)
let dead = null
c.ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.method === 'Inspector.targetCrashed' || m.method === 'Inspector.detached') dead = m.method })
c.ws.addEventListener('close', () => { dead = dead || 'ws closed' })
await c.send('Runtime.enable'); await c.send('Page.enable'); await c.send('Inspector.enable')
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: 'http://localhost:5770/?embed=machine' }); await sleep(5000)
console.log('boot ok, mscreen =', await c.js(`document.getElementById('machine').dataset.mscreen`))
const t2 = await newTarget(port, 'http://localhost:5770/qr.css')
await sleep(1000)
const c2 = await conn(t2.webSocketDebuggerUrl); await c2.send('Runtime.enable')
const t0 = Date.now()
await c2.js(`(()=>{const ch=new BroadcastChannel('punch-flow');ch.postMessage({type:'mscreen',key:'countdown',opts:{start:Date.now(),seconds:${SECONDS}}});ch.close();return 1})()`)
console.log('posted seconds =', SECONDS)
// poll with a hard timeout so a hung renderer is visible
for (let i = 0; i < 12; i++) {
  const r = await Promise.race([c.js(`document.getElementById('machine').dataset.mscreen + '|' + (document.querySelector('.mscreen[data-mscreen="countdown"] [data-count]')?.textContent || '').slice(0,40) + '|nodes=' + document.querySelectorAll('.mscreen[data-mscreen="countdown"] *').length`), sleep(3000).then(() => '__TIMEOUT__')])
  console.log(i, Date.now() - t0 + 'ms', JSON.stringify(r), 'dead=' + dead)
  if (r === '__TIMEOUT__') break
  await sleep(1000)
}
console.log('errors:', JSON.stringify(c.errs.slice(0, 6)))
console.log('final dead =', dead)
try { c.ws.close(); c2.ws.close() } catch {}
chrome.kill()
process.exit(0)
