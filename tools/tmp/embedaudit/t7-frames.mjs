import { launch, conn, sleep } from './cdp.mjs'
const { port, chrome } = await launch({ w: 1440, h: 1000 })
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const c = await conn(list.find((x) => x.type === 'page').webSocketDebuggerUrl)
const docs = []; let bytes = 0; const reqs = []
c.ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.method === 'Network.requestWillBeSent') { reqs.push(m.params.request.url); if (m.params.type === 'Document') docs.push(m.params.request.url) }
  if (m.method === 'Network.loadingFinished') bytes += m.params.encodedDataLength || 0
})
await c.send('Runtime.enable'); await c.send('Page.enable'); await c.send('Network.enable')
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await c.js('localStorage.clear(); 1')
const mark = () => ({ docs: docs.length, reqs: reqs.length, mb: +(bytes / 1048576).toFixed(1) })
docs.length = 0; reqs.length = 0; bytes = 0
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(7000)
console.log('after first load       :', JSON.stringify(mark()))
await c.js(`window.showcase.mode('animation'); 1`); await sleep(5000)
console.log('after animation tab    :', JSON.stringify(mark()))
console.log('embed doc requests     :', JSON.stringify(docs.filter(u => u.includes('embed=machine'))))
console.log('frames now             :', await c.js(`(function(){return JSON.stringify([].slice.call(document.querySelectorAll('iframe')).map(function(f){return {id:f.id||f.dataset.embed||f.dataset.dsLive||'?',src:f.getAttribute('src')||'(none)'}}))})()`))
console.log('recursion check (embed has its own linked frame src?):', await c.js(`(function(){try{var d=document.getElementById('linkedFrame').contentDocument;var inner=d.querySelectorAll('iframe');return JSON.stringify({count:inner.length,srcs:[].slice.call(inner).map(function(f){return f.getAttribute('src')||'(none)'})})}catch(e){return 'ERR '+e.message}})()`))
console.log('embed wrote showcase key?:', await c.js(`localStorage.getItem('punch-showcase.v5') ? 'present' : 'absent'`))
await c.js(`document.getElementById('openCase').click(); 1`); await sleep(2500)
await c.js(`(function(){var s=document.getElementById('caseScroll');s.scrollTop=s.scrollHeight;return 1})()`); await sleep(6000)
console.log('after case study open  :', JSON.stringify(mark()))
console.log('embed doc requests all :', JSON.stringify(docs.filter(u => u.includes('embed=machine'))))
console.log('total frames           :', await c.js(`document.querySelectorAll('iframe').length + ' / with src: ' + [].slice.call(document.querySelectorAll('iframe')).filter(function(f){return f.getAttribute('src')}).length`))
console.log('errors:', JSON.stringify(c.errs.slice(0, 10)))
c.ws.close(); chrome.kill(); process.exit(0)
