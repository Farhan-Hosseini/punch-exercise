import { launch, conn, newTarget, sleep } from '../embedaudit/cdp.mjs'
const { port, chrome } = await launch({ w: 1440, h: 1000 })
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const c = await conn(list.find((x) => x.type === 'page').webSocketDebuggerUrl)
await c.send('Runtime.enable'); await c.send('Page.enable'); await c.send('Log.enable')
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: 'http://localhost:5770/?embed=machine' }); await sleep(6000)
console.log('embed origin:', await c.js('location.origin'), 'href:', await c.js('location.href'))
const t2 = await newTarget(port, 'http://localhost:5770/qr.css'); await sleep(1000)
const c2 = await conn(t2.webSocketDebuggerUrl); await c2.send('Runtime.enable')
console.log('2nd tab origin:', await c2.js('location.origin'))
const probe = `(function(){var m=document.getElementById('machine');var a=document.querySelector('.mscreen[data-mscreen="countdown"]');var n=a?a.querySelectorAll('*').length:-1;var t=document.querySelector('[data-ccr-ticks]');var w=document.querySelector('.mscreen[data-mscreen="countdown"] .ccr-num');return JSON.stringify({ms:m?m.dataset.mscreen:null,hidden:a?a.hidden:null,nodes:n,ticks:t?t.children.length:-1,word:w?w.textContent.trim():null})})()`
const state = () => Promise.race([c.js(probe), sleep(4000).then(() => '__RENDERER_UNRESPONSIVE__')])
const post = async (label, expr) => {
  const n0 = c.errs.length
  await c2.js(`(function(){var ch=new BroadcastChannel('punch-flow');ch.postMessage(${expr});ch.close();return 1})()`)
  await sleep(1500)
  const st = await state()
  console.log(JSON.stringify({ label, state: st, newErrors: c.errs.slice(n0) }))
  return st
}
console.log('--- baseline well-formed 20 ---')
await post('seconds 20 (baseline)', `{type:'mscreen',key:'countdown',opts:{start:Date.now(),seconds:20}}`)
console.log('--- Infinity, then recovery (NOT confounded by a prior hang) ---')
await post('seconds Infinity', `{type:'mscreen',key:'countdown',opts:{start:Date.now(),seconds:Infinity}}`)
await sleep(1500)
await post('recover: countdown 20', `{type:'mscreen',key:'countdown',opts:{start:Date.now(),seconds:20}}`)
await post('recover: key score', `{type:'mscreen',key:'score',opts:{score:812.4}}`)
await post('recover: countdown 20 again', `{type:'mscreen',key:'countdown',opts:{start:Date.now(),seconds:20}}`)
console.log('ALL ERRORS:', JSON.stringify(c.errs, null, 1))
c.ws.close(); c2.ws.close(); chrome.kill(); process.exit(0)
