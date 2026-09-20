import { launch, conn, sleep } from '../embedaudit/cdp.mjs'
const { port, chrome } = await launch({ w: 1440, h: 1000 })
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const c = await conn(list.find((x) => x.type === 'page').webSocketDebuggerUrl)
await c.send('Runtime.enable'); await c.send('Page.enable')
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3000)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await c.js(`window.showcase.mode('machine'); 1`); await sleep(1500)
console.log('count designs:', await c.js(`JSON.stringify(window.showcase.sections('machine','countdown').find(s=>s.key==='count'))`))

// 1. does the exception escape setMscreen? evaluate an expression AFTER the call in the same statement list
console.log('--- does the RangeError escape setMscreen? ---')
const r = await c.js(`(function(){ var before = document.getElementById('machine').dataset.mscreen;
  window.showcase.mscreen('countdown', {seconds: Infinity});
  return JSON.stringify({ reachedNextLine: true, before: before, after: document.getElementById('machine').dataset.mscreen }) })()`)
console.log('escape test:', r)
await sleep(1000)
console.log('panel after throw:', await c.js(`document.getElementById('custom').textContent.replace(/\\s+/g,' ').slice(0,120)`))

// 2. the 5e5 hang, in a fresh reload so nothing is confounded
console.log('--- reload, then seconds 5e5 ---')
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await c.js(`window.showcase.mode('machine'); 1`); await sleep(1500)
const t0 = Date.now()
c.js(`window.showcase.mscreen('countdown', {seconds: 5e5}); 1`)  // deliberately not awaited
for (const wait of [3000, 5000, 10000, 20000, 30000]) {
  const st = await Promise.race([c.js(`document.querySelectorAll('[data-ccr-ticks] > *').length`), sleep(wait).then(() => '__UNRESPONSIVE__')])
  console.log(`t+${((Date.now()-t0)/1000).toFixed(1)}s  ticks=${st}`)
  if (st !== '__UNRESPONSIVE__') break
}
const st2 = await Promise.race([c.js(`JSON.stringify({ticks:document.querySelectorAll('[data-ccr-ticks] > *').length, ds:document.getElementById('machine').dataset.mscreen})`), sleep(45000).then(() => '__STILL_UNRESPONSIVE_AFTER_45s__')])
console.log('final:', st2, 'elapsed', ((Date.now()-t0)/1000).toFixed(1) + 's')
console.log('ALL ERRORS:', JSON.stringify(c.errs, null, 1))
c.ws.close(); chrome.kill(); process.exit(0)
