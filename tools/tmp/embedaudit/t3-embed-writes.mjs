import { launch, conn, sleep } from './cdp.mjs'
const { port, chrome } = await launch({ w: 1440, h: 1000 })
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const c = await conn(list.find((x) => x.type === 'page').webSocketDebuggerUrl)
await c.send('Runtime.enable'); await c.send('Page.enable')
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
// a clean slate, then a sentinel in every key the app touches, each with a shape the app will rewrite if it writes
await c.js(`localStorage.clear();
 localStorage.setItem('punch-acc.v2', JSON.stringify({ page: 1, page2: 1, shared: 0, SENTINEL: 'keep' }));
 localStorage.setItem('punch-psec.v2', JSON.stringify({ SENTINEL: 'keep' }));
 localStorage.setItem('punch-saved.v2', JSON.stringify({ keys: ['SENTINEL'] }));
 localStorage.setItem('punch-reel.v1', JSON.stringify({ SENTINEL: 'keep' }));
 localStorage.setItem('punch-feed-view.v1', 'SENTINEL');
 1`)
const before = await c.js(`JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])))`)
// now load ONLY the embedded copy as a top-level document: any write here is a write by the embed
await c.send('Page.navigate', { url: 'http://localhost:5770/?embed=machine' }); await sleep(6000)
const after = await c.js(`JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])))`)
const b = JSON.parse(before), a = JSON.parse(after)
const diff = {}
for (const k of new Set([...Object.keys(b), ...Object.keys(a)])) if (b[k] !== a[k]) diff[k] = { before: b[k] ?? null, after: a[k] ?? null }
console.log('BEFORE:', before)
console.log('AFTER :', after)
console.log('DIFF  :', JSON.stringify(diff, null, 1))
console.log('embed flag:', await c.js(`document.documentElement.dataset.embed || 'none'`))
console.log('acc details state:', await c.js(`JSON.stringify([...document.querySelectorAll('.custom details.acc')].map(d => ({ acc: d.dataset.acc, open: d.open, display: getComputedStyle(d).display })))`))
console.log('errors:', JSON.stringify(c.errs.slice(0, 6)))
c.ws.close(); chrome.kill(); process.exit(0)
