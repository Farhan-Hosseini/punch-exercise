import { launch, conn, newTarget, sleep } from './cdp.mjs'
const { port, chrome } = await launch({ w: 1440, h: 1000 })
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const c = await conn(list.find((x) => x.type === 'page').webSocketDebuggerUrl)
await c.send('Runtime.enable'); await c.send('Page.enable'); await c.send('Log.enable')
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: 'http://localhost:5770/?embed=machine' }); await sleep(6000)
const t2 = await newTarget(port, 'http://localhost:5770/qr.css'); await sleep(1000)
const c2 = await conn(t2.webSocketDebuggerUrl); await c2.send('Runtime.enable')
const post = async (label, expr) => {
  const n0 = c.errs.length
  await c2.js(`(function(){var ch=new BroadcastChannel('punch-flow');ch.postMessage(${expr});ch.close();return 1})()`)
  await sleep(1500)
  const st = await Promise.race([c.js(`document.getElementById('machine').dataset.mscreen + '|nodes=' + document.querySelectorAll('.mscreen[data-mscreen="countdown"] *').length`), sleep(4000).then(() => '__RENDERER_UNRESPONSIVE__')])
  console.log(JSON.stringify({ label, state: st, newErrors: c.errs.slice(n0) }))
  return st
}
await post('seconds Infinity', `{type:'mscreen',key:'countdown',opts:{start:Date.now(),seconds:Infinity}}`)
await post('seconds 5e5', `{type:'mscreen',key:'countdown',opts:{start:Date.now(),seconds:5e5}}`)
await post('back to 20', `{type:'mscreen',key:'countdown',opts:{start:Date.now(),seconds:20}}`)
console.log('all errors:', JSON.stringify(c.errs, null, 1))
console.log('log errors:', JSON.stringify(c.logs.slice(0, 6), null, 1))
c.ws.close(); c2.ws.close(); chrome.kill(); process.exit(0)
