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
const guard = (p, ms, tag) => Promise.race([p, sleep(ms).then(() => '(timeout ' + tag + ')')])
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(2500)
await c.js('localStorage.clear(); 1')
reqs.length = 0
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(8000)
console.log('scrollHeight:', await guard(c.js('document.documentElement.scrollHeight'), 4000, 'h'))
for (let i = 0; i < 24; i++) {
  await c.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 700, y: 500, deltaX: 0, deltaY: 900 })
  await sleep(200)
}
await sleep(4000)
console.log('embed requests after 24 wheel scrolls:', JSON.stringify(reqs.filter(u => /embed=machine/.test(u))))
console.log('iframe srcs :', await guard(c.js(`JSON.stringify([...document.querySelectorAll('iframe')].map(f=>f.getAttribute('src')))`), 5000, 'f'))
c.ws.close(); chrome.kill(); process.exit(0)
