/* Googlebot renders with a very tall viewport to trip lazy content. Try that, and then a full passive
   scroll, and see whether anything ever requests ?embed=machine without a click or a hover. */
import { launch, conn, sleep } from '../embedaudit/cdp.mjs'
const { port, chrome } = await launch({ w: 1440, h: 1000 })
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const c = await conn(list.find((x) => x.type === 'page').webSocketDebuggerUrl)
await c.send('Runtime.enable'); await c.send('Page.enable'); await c.send('Network.enable')
const reqs = []
c.ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.method === 'Network.requestWillBeSent') reqs.push(m.params.request.url)
})
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(2500)
await c.js('localStorage.clear(); 1')
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 12000, deviceScaleFactor: 1, mobile: false })
reqs.length = 0
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(9000)
console.log('== 1440x12000 tall render, no interaction ==')
console.log('embed requests   :', JSON.stringify(reqs.filter(u => /embed=machine/.test(u))))
console.log('iframe srcs      :', await c.js(`JSON.stringify([...document.querySelectorAll('iframe')].map(f=>f.getAttribute('src')))`))
console.log('scrollHeight     :', await c.js(`document.documentElement.scrollHeight`))

// now a full passive scroll of the default tab
for (let i = 0; i < 20; i++) { await c.js(`window.scrollBy(0, 2000); 1`); await sleep(250) }
await sleep(3000)
console.log('after full scroll:', JSON.stringify(reqs.filter(u => /embed=machine/.test(u))))

// and now what a *person* does: hover the Animation tab
await c.js(`(function(){var b=document.querySelector('.mode[data-mode="animation"]'); if(!b) return 'no btn'; b.dispatchEvent(new PointerEvent('pointerenter',{bubbles:true})); return 'hovered'})()`)
await sleep(3000)
console.log('after hovering Animation tab:', JSON.stringify(reqs.filter(u => /embed=machine/.test(u))))
console.log('errors:', JSON.stringify(c.errs.slice(0,5)))
c.ws.close(); chrome.kill(); process.exit(0)
