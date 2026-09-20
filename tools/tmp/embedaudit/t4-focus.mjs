import { launch, conn, sleep } from './cdp.mjs'
const { port, chrome } = await launch({ w: 1440, h: 1000 })
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const c = await conn(list.find((x) => x.type === 'page').webSocketDebuggerUrl)
await c.send('Runtime.enable'); await c.send('Page.enable')
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await c.js(`window.showcase.mode('animation'); 1`); await sleep(4500)
const EXPR = [
  '(function(){',
  ' var d = document.activeElement;',
  ' if (!d) return "none";',
  ' var name = d.tagName.toLowerCase();',
  ' if (d.id) name += "#" + d.id;',
  ' var cn = (typeof d.className === "string") ? d.className : "";',
  ' if (cn) name += "." + cn.trim().split(" ")[0];',
  ' var extra = "";',
  ' try { var f = document.getElementById("linkedFrame"); if (f && f.contentDocument) { var i = f.contentDocument.activeElement; if (i && i !== f.contentDocument.body) { extra = " >>FRAME>> " + i.tagName.toLowerCase() + (i.id ? "#" + i.id : ""); } } } catch (e) { extra = " >>?"; }',
  ' var t = (d.innerText || d.value || d.title || "").toString().trim().slice(0, 26).replace(/\s+/g, " ");',
  ' return name + extra + " | " + t;',
  '})()',
].join('\n')
const where = () => c.js(EXPR)
const tab = async () => { for (const type of ['rawKeyDown', 'keyUp']) await c.send('Input.dispatchKeyEvent', { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 }) }
console.log('probe check:', JSON.stringify(await where()))
await c.js(`document.querySelectorAll("a,button")[0].focus(); 1`)
const seen = []
for (let i = 0; i < 70; i++) { await tab(); seen.push(await where()) }
console.log(seen.map((s, i) => i + ': ' + (typeof s === 'string' ? s : JSON.stringify(s))).join('\n'))
console.log('\niframe tabindex:', await c.js(`document.getElementById('linkedFrame').getAttribute('tabindex')`))
console.log('iframe inert/aria:', await c.js(`(function(){var f=document.getElementById('linkedFrame');return JSON.stringify({inert:f.inert,hidden:f.hidden,ariaHidden:f.getAttribute('aria-hidden'),parentInert:!!f.closest('[inert]')})})()`))
console.log('errors:', JSON.stringify(c.errs.slice(0, 5)))
c.ws.close(); chrome.kill(); process.exit(0)
