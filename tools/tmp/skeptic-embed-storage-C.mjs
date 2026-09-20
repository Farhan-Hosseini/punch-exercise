// PART C - the two questions left: does the hostile string ever become script, and does a reload recover?
import { launch, conn, newTarget, sleep } from './embedaudit/cdp.mjs'
import { writeFileSync } from 'node:fs'
const OUT = []; const log = (...a) => { OUT.push(a.join(' ')); writeFileSync('tools/tmp/skeptic-C.log', OUT.join('\n')) }
const { port, chrome } = await launch({ w: 1440, h: 1000 })
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const c = await conn(list.find((x) => x.type === 'page').webSocketDebuggerUrl)
await c.send('Runtime.enable'); await c.send('Page.enable')
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3000)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)
await c.js(`window.showcase.mode('animation'); 1`); await sleep(4500)
const t2 = await newTarget(port, 'http://localhost:5770/qr.css'); await sleep(900)
const c2 = await conn(t2.webSocketDebuggerUrl); await c2.send('Runtime.enable')
const HOSTILE = { variant: 'arena', appearance: 'dark', logo: 'fist', decimals: 'on', sets: {}, mvar: {}, mscreen: 'default',
  backdrop: 'not-a-backdrop"><script>window.__x=1</script><img src=x onerror="window.__y=1">' }
const n0 = c.errs.length
await c2.js(`localStorage.setItem('punch-showcase.v5', ${JSON.stringify(JSON.stringify(HOSTILE))}); 1`)
await sleep(1800)
log('attr now      : ' + await c.js(`document.getElementById('linkedFrame').contentDocument.documentElement.getAttribute('data-mbackdrop')`))
log('script ran __x: ' + await c.js(`String(document.getElementById('linkedFrame').contentWindow.__x)`))
log('img ran    __y: ' + await c.js(`String(document.getElementById('linkedFrame').contentWindow.__y)`))
log('script tags   : ' + await c.js(`document.getElementById('linkedFrame').contentDocument.querySelectorAll('script').length`))
log('errors        : ' + JSON.stringify(c.errs.slice(n0)))
// reload the embed: the boot path validates the SAME key
await c.js(`document.getElementById('linkedFrame').contentWindow.location.reload(); 1`); await sleep(6000)
log('after reload  : ' + await c.js(`document.getElementById('linkedFrame').contentDocument.documentElement.getAttribute('data-mbackdrop')`))
log('stored value  : ' + await c.js(`JSON.parse(localStorage.getItem('punch-showcase.v5')).backdrop`))
log('DONE. total errors ' + c.errs.length)
c.ws.close(); c2.ws.close(); chrome.kill(); process.exit(0)
