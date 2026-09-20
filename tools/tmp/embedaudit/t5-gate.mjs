import { launch, conn, sleep } from './cdp.mjs'
const { port, chrome } = await launch({ w: 420, h: 900 })
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const c = await conn(list.find((x) => x.type === 'page').webSocketDebuggerUrl)
await c.send('Runtime.enable'); await c.send('Page.enable')
await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3000)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

const AUDIT = [
 '(function(){',
 ' function vis(el){ var s = getComputedStyle(el); if (s.display === "none" || s.visibility === "hidden") return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }',
 ' var gate = document.querySelector(".deskgate");',
 ' var gs = getComputedStyle(gate);',
 ' var sel = "a[href], button, input, select, textarea, video[controls], iframe, [tabindex]:not([tabindex=\'-1\'])";',
 ' var all = [].slice.call(document.querySelectorAll(sel));',
 ' var reachable = all.filter(function(el){ return !gate.contains(el) && vis(el) && !el.closest("[inert]") && !el.hasAttribute("disabled"); });',
 ' var names = reachable.slice(0, 25).map(function(el){ var t = el.tagName.toLowerCase(); var id = el.id ? "#" + el.id : ""; var cn = (typeof el.className === "string" && el.className) ? "." + el.className.trim().split(" ")[0] : ""; return t + id + cn + "::" + (el.innerText || el.title || el.getAttribute("aria-label") || "").toString().trim().slice(0,24).replace(/\s+/g," "); });',
 ' return JSON.stringify({',
 '  gateDisplay: gs.display, gateZ: gs.zIndex, gateRole: gate.getAttribute("role"),',
 '  bodyOverflow: getComputedStyle(document.body).overflow,',
 '  scrollH: document.documentElement.scrollHeight, clientH: document.documentElement.clientHeight,',
 '  focusableBehindGate: reachable.length, names: names,',
 '  ariaHiddenOnBehind: !!document.querySelector("main[aria-hidden=\'true\']"),',
 '  inertUsed: document.querySelectorAll("[inert]").length,',
 '  bodyTextLen: document.body.innerText.length',
 ' });',
 '})()'].join('\n')
console.log('== 390px, normal visit ==')
console.log(await c.js(AUDIT))
console.log('gate is only CSS? removing data-embed test:')
await c.send('Page.navigate', { url: 'http://localhost:5770/?embed=machine' }); await sleep(5000)
console.log('== 390px, ?embed=machine ==')
console.log(await c.js(AUDIT))
console.log('embed flag:', await c.js(`document.documentElement.dataset.embed || "none"`))
console.log('machine visible:', await c.js(`(function(){var m=document.getElementById("machine");if(!m)return "no machine";var r=m.getBoundingClientRect();return JSON.stringify({w:Math.round(r.width),h:Math.round(r.height),display:getComputedStyle(m).display})})()`))
console.log('errors:', JSON.stringify(c.errs.slice(0, 6)))
c.ws.close(); chrome.kill(); process.exit(0)
