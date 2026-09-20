import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'gr'+port)}`,'--window-size=1440,900','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text) })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Accessibility.enable')
const probe = `JSON.stringify((()=>{
  const g=document.querySelector('.deskgate')
  const vis=[...document.body.children].filter(el=>el.tagName!=='SCRIPT'&&getComputedStyle(el).display!=='none').map(el=>el.tagName+'.'+(el.className||'').toString().split(' ')[0])
  const FOC='a[href],button,input,select,textarea,summary,iframe,[tabindex]:not([tabindex="-1"])'
  const okvis=(el)=>{const s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden')return false;const b=el.getBoundingClientRect();return b.width>0||b.height>0}
  return {w:innerWidth,gateDisplay:getComputedStyle(g).display,visibleBodyKids:vis,
    focusableOutsideGate:[...document.querySelectorAll(FOC)].filter(el=>!g.contains(el)&&okvis(el)).length,
    bodyOverflow:getComputedStyle(document.body).overflow, scrollH:document.documentElement.scrollHeight}
})())`
const axSummary = async () => { const ax=(await send('Accessibility.getFullAXTree')).result?.nodes||[]
  const live=ax.filter(n=>!n.ignored)
  return { count: live.length, outsideGate: live.filter(n=>!/DESKTOP|desktop|showcase puts|laptop/i.test(n.name?.value||'') && n.role?.value!=='RootWebArea' && n.role?.value!=='generic' && n.role?.value!=='alertdialog' && n.role?.value!=='heading' && n.role?.value!=='paragraph' && n.role?.value!=='StaticText' && n.role?.value!=='InlineTextBox').map(n=>n.role?.value+':'+(n.name?.value||'').slice(0,30)) } }

await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('try{localStorage.clear()}catch(e){};1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
const out = {}
// open the case study overlay, the Customise panel and the brief, all at desktop width
await js(`document.getElementById('openCase')?.click(); 1`); await sleep(1800)
out.caseOpenAtDesktop = JSON.parse(await js(probe))
out.axAtDesktopWithCase = (await axSummary()).count
// now shrink to a phone WITHOUT reloading - overlay still open in the DOM
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
await sleep(1500)
out.afterResizeToPhone = JSON.parse(await js(probe))
out.axAfterResize = await axSummary()
// and try to tab / scroll behind the gate
for (let i=0;i<6;i++){ await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,nativeVirtualKeyCode:9}); await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,nativeVirtualKeyCode:9}); await sleep(100) }
out.activeAfterTabs = await js(`document.activeElement.tagName+'.'+(document.activeElement.className||'').toString().split(' ')[0]`)
await send('Input.dispatchMouseEvent',{type:'mouseWheel',x:195,y:400,deltaX:0,deltaY:600}); await sleep(400)
out.scrollYAfterWheel = await js(`scrollY`)
out.errors = errs.slice(0,6)
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill()
