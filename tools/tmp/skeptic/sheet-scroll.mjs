import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeFile } from 'node:fs/promises'
const W = Number(process.argv[2] || 1024), H = Number(process.argv[3] || 800)
const MODE = process.argv[4] || 'machine'
const port = 9500 + Math.floor(Math.random() * 300)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-color-profile=srgb','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,`--window-size=${W},${H}`,'about:blank'], { stdio: 'ignore' })
const sleep = ms => new Promise(r => setTimeout(r, ms))
let t
for (let i=0;i<120 && !t;i++){ try { t=(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r, { once: true }))
let id=0; const pend=new Map(); const errs=[]
ws.addEventListener('message', e => { const m=JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method==='Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text)
  else if (m.method==='Runtime.consoleAPICalled' && m.params.type==='error') errs.push(m.params.args.map(a=>a.value||a.description).join(' ')) })
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setFocusEmulationEnabled', { enabled: true })
await send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:1,mobile:false})
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(5500)
await js(`window.showcase.mode('${MODE}'); 1`); await sleep(2500)

const snap = () => js(`JSON.stringify((()=>{const b=document.body,de=document.documentElement
 const cs=getComputedStyle(b), csh=getComputedStyle(de)
 const cu=document.getElementById('custom'), sc=document.getElementById('customScrim')
 const ae=document.activeElement
 return { scrollY: Math.round(window.scrollY), docScrollable: Math.max(0, de.scrollHeight - de.clientHeight),
  bodyOverflowInline: b.style.overflow, bodyOverflowY: cs.overflowY, htmlOverflowY: csh.overflowY,
  customOpen: cu?.classList.contains('is-open')||false, scrimHidden: sc?.hidden, scrimOn: sc?.classList.contains('is-on')||false,
  active: ae ? (ae.id || ae.tagName + (ae.className? '.'+String(ae.className).split(' ')[0] : '')) : null,
  activeInPanel: !!(ae && cu && cu.contains(ae)),
  activeInBody: !!(ae && document.querySelector('.custom-body')?.contains(ae)),
  bodyScrollerScrollable: (()=>{const cb=document.querySelector('.custom-body'); return cb? Math.max(0, cb.scrollHeight-cb.clientHeight):null})(),
  bodyScrollerTop: (()=>{const cb=document.querySelector('.custom-body'); return cb? Math.round(cb.scrollTop):null})(),
  mode: document.documentElement.dataset.mode || window.showcase?.current || null }})())`)

const key = async (k, code, vk) => {
  for (const type of ['keyDown','rawKeyDown','keyUp']) {
    if (type==='rawKeyDown') continue
    await send('Input.dispatchKeyEvent', { type, key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
  }
  await sleep(500)
}
const out = { W, H, MODE }
out.beforeOpen = JSON.parse(await snap())
// open via a real CDP mouse click on the Customise button
const btn = JSON.parse(await js(`JSON.stringify((()=>{const b=document.getElementById('openCustom');const r=b.getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})())`))
for (const type of ['mousePressed','mouseReleased']) await send('Input.dispatchMouseEvent',{type,x:btn.x,y:btn.y,button:'left',clickCount:1})
await sleep(900)
out.afterOpen = JSON.parse(await snap())
// PageDown with focus where the app put it
await key('PageDown','PageDown',34)
out.afterPageDown = JSON.parse(await snap())
await key('ArrowDown','ArrowDown',40); await key('ArrowDown','ArrowDown',40)
out.afterArrowDown = JSON.parse(await snap())
// wheel over the scrim (left side of the page, away from the panel)
await send('Input.dispatchMouseEvent',{type:'mouseWheel',x:Math.round(W*0.25),y:Math.round(H*0.6),deltaX:0,deltaY:400,button:'none'})
await sleep(600)
out.afterWheelOnScrim = JSON.parse(await snap())
// wheel over the panel itself
await send('Input.dispatchMouseEvent',{type:'mouseWheel',x:W-120,y:Math.round(H*0.6),deltaX:0,deltaY:600,button:'none'})
await sleep(600)
out.afterWheelOnPanel = JSON.parse(await snap())
const shot = await send('Page.captureScreenshot',{format:'png'})
await writeFile(`C:/Claude Database/punch-exercise/tools/tmp/skeptic/sheet-${W}-${MODE}.png`, Buffer.from(shot.result.data,'base64'))
// close and see where the page ended up
await js(`document.getElementById('closeCustom').click(); 1`); await sleep(900)
out.afterClose = JSON.parse(await snap())
out.errors = errs.slice(0,6)
console.log(JSON.stringify(out,null,1))
ws.close(); chrome.kill()
