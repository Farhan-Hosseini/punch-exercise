import { launch, conn, sleep } from './cdp.mjs'
const { port, chrome } = await launch({ w: 1440, h: 1000 })
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const c = await conn(list.find((x) => x.type === 'page').webSocketDebuggerUrl)
await c.send('Runtime.enable'); await c.send('Page.enable')
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6500)

const key = async (k, code, vk) => { for (const type of ['rawKeyDown', 'keyUp']) await c.send('Input.dispatchKeyEvent', { type, key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }) }
const tab = async (shift) => { for (const type of ['rawKeyDown', 'keyUp']) await c.send('Input.dispatchKeyEvent', { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, modifiers: shift ? 8 : 0 }) }
const FOCUS = '(function(){var d=document.activeElement;if(!d)return "none";var n=d.tagName.toLowerCase()+(d.id?"#"+d.id:"");var cn=(typeof d.className==="string"&&d.className)?"."+d.className.trim().split(" ")[0]:"";var box=d.closest(".case")?"IN-CASE":d.closest(".brief")?"IN-BRIEF":d.closest(".helpwrap")?"IN-HELP":d.closest(".custom")?"IN-CUSTOM":d.closest(".topbar")?"IN-TOPBAR":d.closest(".stage,.phone-stage,.ds-stage")?"IN-STAGE":"BODY";return box+" "+n+cn})()'
const STATE = (sel) => `(function(){var e=document.querySelector(${JSON.stringify(sel)});return JSON.stringify({open:e.classList.contains("is-open"),hidden:e.hidden,bodyOverflow:document.body.style.overflow,topbarInert:!!document.querySelector(".topbar").inert,stageInert:!!document.getElementById("stage").inert,phoneInert:!!document.getElementById("phoneStage").inert,dsInert:!!document.getElementById("dsStage").inert,customInert:!!document.getElementById("custom").inert,ariaModal:e.getAttribute("aria-modal"),role:e.getAttribute("role")})})()`

for (const [name, btn, sel] of [['case', 'openCase', '.case'], ['brief', 'openBrief', '.brief'], ['help', 'openHelp', '.helpwrap']]) {
  console.log('\n===== ' + name + ' =====')
  await c.js(`document.getElementById('${btn}').click(); 1`); await sleep(1200)
  console.log('open    :', await c.js(STATE(sel)))
  console.log('focus   :', await c.js(FOCUS))
  // tab forward 40 times: does focus ever leave the dialog?
  const out = []
  for (let i = 0; i < 40; i++) { await tab(false); const w = await c.js(FOCUS); if (!String(w).startsWith('IN-' + name.toUpperCase()) && String(w) !== 'BODY body') out.push(i + ':' + w) }
  console.log('escaped :', out.length ? JSON.stringify(out.slice(0, 8)) : 'never left the dialog')
  // shift-tab 10
  const back = []
  for (let i = 0; i < 12; i++) { await tab(true); const w = await c.js(FOCUS); if (!String(w).startsWith('IN-' + name.toUpperCase()) && String(w) !== 'BODY body') back.push(i + ':' + w) }
  console.log('escBack :', back.length ? JSON.stringify(back.slice(0, 8)) : 'never left the dialog')
  await key('Escape', 'Escape', 27); await sleep(900)
  console.log('afterEsc:', await c.js(STATE(sel)))
  console.log('focusOn :', await c.js(FOCUS))
}
console.log('\nerrors:', JSON.stringify(c.errs.slice(0, 8)))
c.ws.close(); chrome.kill(); process.exit(0)
