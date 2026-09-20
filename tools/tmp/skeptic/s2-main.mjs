import { launch, conn, sleep } from '../embedaudit/cdp.mjs'
const { port, chrome } = await launch({ w: 1440, h: 1000 })
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const c = await conn(list.find((x) => x.type === 'page').webSocketDebuggerUrl)
await c.send('Runtime.enable'); await c.send('Page.enable'); await c.send('Log.enable')
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3000)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await c.js(`window.showcase.mode('machine'); 1`); await sleep(1500)
const probe = `(function(){
  var a=document.querySelector('.mscreen[data-mscreen="countdown"]');
  var t=document.querySelector('[data-ccr-ticks]');
  var panel=document.getElementById('custom');
  var cur=document.querySelector('.mpagebar [data-mscreen][aria-current]');
  return JSON.stringify({
    machineDs: document.getElementById('machine').dataset.mscreen,
    countdownHidden: a?a.hidden:null,
    ticksInDom: t?t.children.length:-1,
    barCurrent: cur?cur.dataset.mscreen:null,
    panelText: panel?panel.textContent.replace(/\\s+/g,' ').slice(0,140):null
  })})()`
const state = (ms=4000) => Promise.race([c.js(probe), sleep(ms).then(() => '__RENDERER_UNRESPONSIVE__')])
const run = async (label, js) => {
  const n0 = c.errs.length
  const r = await Promise.race([c.js(js), sleep(4000).then(()=>'__EVAL_TIMEOUT__')])
  await sleep(1200)
  const st = await state()
  console.log(JSON.stringify({ label, evalResult: r, state: st, newErrors: c.errs.slice(n0) }, null, 1))
  return st
}
console.log('=== A. normal countdown via the documented hook ===')
await run('mscreen countdown {seconds:20}', `window.showcase.mscreen('countdown', {seconds:20, punch:false}); 1`)
console.log('=== B. switch to score so the panel/bar has a known state ===')
await run('mscreen score', `window.showcase.mscreen('score', {score: 812.4}); 1`)
console.log('=== C. seconds: Infinity through the same public hook ===')
await run('mscreen countdown {seconds:Infinity}', `window.showcase.mscreen('countdown', {seconds:Infinity}); 1`)
console.log('=== D. can a later well-formed call repair the ring? ===')
await run('mscreen countdown {seconds:20} again', `window.showcase.mscreen('countdown', {seconds:20, punch:false}); 1`)
await sleep(2000)
console.log('after 2s settle:', await state())
console.log('=== E. ticks array vs DOM (is the early-return the reason?) ===')
console.log(await c.js(`(function(){var g=document.querySelector('[data-ccr-ticks]');return JSON.stringify({domChildren:g.children.length, arcEmpty: !!document.querySelector('.ccr-arc.is-empty')})})()`))
console.log('ALL ERRORS:', JSON.stringify(c.errs, null, 1))
c.ws.close(); chrome.kill(); process.exit(0)
