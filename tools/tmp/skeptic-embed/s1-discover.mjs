/* Passive render, like a crawler: navigate, wait, touch nothing. Report every href, every iframe src,
   and every document-type network request the page made. */
import { launch, conn, sleep } from '../embedaudit/cdp.mjs'
const { port, chrome } = await launch({ w: 1440, h: 1000 })
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const c = await conn(list.find((x) => x.type === 'page').webSocketDebuggerUrl)
await c.send('Runtime.enable'); await c.send('Page.enable'); await c.send('Network.enable')
const reqs = []
c.ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.method === 'Network.requestWillBeSent') reqs.push({ type: m.params.type, url: m.params.request.url })
})
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(2500)
await c.js('localStorage.clear(); sessionStorage.clear(); 1')
reqs.length = 0
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(9000)

console.log('== PASSIVE RENDER, no interaction, 9s ==')
console.log('mode              :', await c.js(`document.documentElement.dataset.mode || (window.showcase && JSON.stringify(Object.keys(window.showcase))) || "?"`))
console.log('doc requests      :', JSON.stringify(reqs.filter(r => r.type === 'Document').map(r => r.url)))
console.log('any embed request :', JSON.stringify(reqs.filter(r => /embed=machine/.test(r.url)).map(r => r.type + ' ' + r.url)))
console.log('anchors total     :', await c.js(`document.querySelectorAll('a[href]').length`))
console.log('anchor hrefs      :', await c.js(`JSON.stringify([...new Set([...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')))].slice(0,60))`))
console.log('iframe srcs       :', await c.js(`JSON.stringify([...document.querySelectorAll('iframe')].map(f=>({id:f.id||f.dataset.embed||f.dataset.dsLive||'?', src:f.getAttribute('src')})))`))
console.log('link rels         :', await c.js(`JSON.stringify([...document.querySelectorAll('link[rel]')].map(l=>l.rel+':'+(l.getAttribute('href')||'')).slice(0,30))`))
console.log('meta names        :', await c.js(`JSON.stringify([...document.querySelectorAll('meta[name]')].map(m=>m.name))`))
console.log('title             :', await c.js(`document.title`))
console.log('errors            :', JSON.stringify(c.errs.slice(0, 6)))
c.ws.close(); chrome.kill(); process.exit(0)
