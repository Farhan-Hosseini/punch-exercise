import { launch, conn, newTarget, sleep } from './cdp.mjs'
const { port, chrome } = await launch({ w: 1440, h: 1000 })
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const A = await conn(list.find((x) => x.type === 'page').webSocketDebuggerUrl)
await A.send('Runtime.enable'); await A.send('Page.enable')
await A.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await A.js('localStorage.clear(); 1')
await A.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6500)
await A.js(`window.showcase.mode('animation'); 1`); await sleep(4500)

const t2 = await newTarget(port, 'http://localhost:5770/'); await sleep(7000)
const B = await conn(t2.webSocketDebuggerUrl); await B.send('Runtime.enable'); await B.send('Page.enable')
await B.js(`window.showcase.mode('animation'); 1`); await sleep(5000)
const glass = (c) => c.js(`(function(){try{return document.getElementById('linkedFrame').contentDocument.getElementById('machine').dataset.mscreen}catch(e){return 'ERR '+e.message}})()`)
const phone = (c) => c.js(`(window.punchApp && window.punchApp.page) || 'n/a'`)
console.log('start  A:', await phone(A), await glass(A), '| B:', await phone(B), await glass(B))
// drive tab A's phone to the ranks page (which announces 'attract') then to scan
for (const [label, page] of [['ranks', 'ranks'], ['scan', 'scan'], ['feed', 'feed']]) {
  await A.js(`(function(){var b=document.querySelector('.m-nav-item[data-page="${page}"]')||document.querySelector('[data-page="${page}"]');if(b&&b.click){b.click();return 'clicked'}if(window.punchApp&&window.punchApp.go){window.punchApp.go('${page}');return 'go'}return 'no'})()`)
  await sleep(2500)
  console.log(label.padEnd(6), 'A:', await phone(A), await glass(A), '| B:', await phone(B), await glass(B))
}
console.log('\nA errors:', JSON.stringify(A.errs.slice(0, 5)))
console.log('B errors:', JSON.stringify(B.errs.slice(0, 5)))
A.ws.close(); B.ws.close(); chrome.kill(); process.exit(0)
