/* What a person who somehow lands on ?embed=machine actually gets, at phone and desktop size. */
import { launch, conn, sleep } from '../embedaudit/cdp.mjs'
const { port, chrome } = await launch({ w: 1440, h: 1000 })
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const c = await conn(list.find((x) => x.type === 'page').webSocketDebuggerUrl)
await c.send('Runtime.enable'); await c.send('Page.enable')
const AUDIT = `(function(){
  function vis(el){var s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden')return false;var r=el.getBoundingClientRect();return r.width>0&&r.height>0}
  var gate=document.querySelector('.deskgate');
  var sel="a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])";
  var all=[].slice.call(document.querySelectorAll(sel));
  var reach=all.filter(function(el){return !gate.contains(el)&&vis(el)&&!el.closest('[inert]')});
  return JSON.stringify({
    title:document.title,
    gate:getComputedStyle(gate).display,
    reachable:reach.length,
    sampleNames:reach.slice(0,8).map(function(e){return e.tagName+(e.id?'#'+e.id:'')}),
    linksHome:[].slice.call(document.querySelectorAll('a[href]')).filter(function(a){var h=a.getAttribute('href');return h==='/'||h==='./'||h==='index.html'}).length,
    bodyTextLen:document.body.innerText.length,
    firstText:document.body.innerText.trim().slice(0,120).replace(/\s+/g,' ')
  })})()`
for (const [w, h, mobile] of [[390, 844, true], [1440, 1000, false]]) {
  await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile })
  await c.send('Page.navigate', { url: 'http://localhost:5770/?embed=machine' }); await sleep(6000)
  console.log(`== ${w}x${h} ?embed=machine ==`)
  console.log(await c.js(AUDIT))
  console.log('embed flag:', await c.js(`document.documentElement.dataset.embed||'none'`))
}
console.log('errors:', JSON.stringify(c.errs.slice(0, 6)))
c.ws.close(); chrome.kill(); process.exit(0)
