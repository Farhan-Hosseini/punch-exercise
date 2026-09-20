// PART A - reachability: can the writing page ever persist a value the boot path would reject?
import { launch, conn, sleep } from './embedaudit/cdp.mjs'
const { port, chrome } = await launch({ w: 1440, h: 1000 })
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const c = await conn(list.find((x) => x.type === 'page').webSocketDebuggerUrl)
await c.send('Runtime.enable'); await c.send('Page.enable')
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

const KEYS = ['glow','lights','spot','beams','smoke','pulse','embers','grid']
const read = async () => JSON.parse(await c.js(`localStorage.getItem('punch-showcase.v5')`) || 'null')

// 1. every backdrop the Customise UI can reach
const seen = []
for (let i = 0; i < 10; i++) {
  await c.js(`window.showcase.backdrop(${JSON.stringify(KEYS[i % 8])}); 1`)
  await sleep(320)
  const s = await read(); seen.push(s && s.backdrop)
}
// 2. the public API asked for junk
const junkReturn = await c.js(`JSON.stringify(window.showcase.backdrop('not-a-backdrop"><script>window.__x=1</script>'))`)
await sleep(400)
const afterJunk = (await read()).backdrop

// 3. the Customise arrows, walked right round past the end of the list
await c.js(`window.showcase.mode('machine'); 1`); await sleep(1200)
const arrowSeen = []
for (let i = 0; i < 11; i++) {
  const hit = await c.js(`(function(){
    var rows=[...document.querySelectorAll('#custom .sec-row')];
    var r=rows.find(function(x){var n=x.querySelector('.sec-name');return n&&n.textContent.trim()==='Background'});
    if(!r) return 'no-row';
    r.querySelectorAll('.sec-btn')[1].click(); return 'ok'
  })()`)
  await sleep(300)
  arrowSeen.push(hit === 'ok' ? (await read()).backdrop : hit)
}
// 4. mvar / layout through their public APIs, asked for junk
await c.js(`window.showcase.mvar('result', 1e9); 1`); await sleep(400)
await c.js(`window.showcase.mvar('scan', '99'); 1`); await sleep(400)
const st = await read()
console.log(JSON.stringify({
  backdropsPersisted: seen,
  allValid: seen.every((k) => KEYS.includes(k)),
  junkApiReturned: junkReturn, backdropAfterJunkCall: afterJunk,
  arrowWalk: arrowSeen, arrowAllValid: arrowSeen.every((k) => KEYS.includes(k)),
  mvarPersisted: st.mvar, mvarTypes: Object.fromEntries(Object.entries(st.mvar||{}).map(([k,v])=>[k,typeof v+':'+v])),
  layoutPersisted: st.layout,
  errors: c.errs,
}, null, 1))
c.ws.close(); chrome.kill(); process.exit(0)
