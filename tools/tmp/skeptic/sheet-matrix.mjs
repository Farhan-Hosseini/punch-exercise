import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9800 + Math.floor(Math.random() * 150)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sm'+port)}`,'--window-size=1200,900','about:blank'], { stdio: 'ignore' })
const sleep = ms => new Promise(r => setTimeout(r, ms))
let t
for (let i=0;i<120 && !t;i++){ try { t=(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r, { once: true }))
let id=0; const pend=new Map()
ws.addEventListener('message', e => { const m=JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setFocusEmulationEnabled',{enabled:true})
const pageDown = async () => { for (const type of ['keyDown','keyUp']) await send('Input.dispatchKeyEvent',{type,key:'PageDown',code:'PageDown',windowsVirtualKeyCode:34,nativeVirtualKeyCode:34}); await sleep(550) }
const click = async (sel) => { const p = JSON.parse(await js(`JSON.stringify((()=>{const b=document.querySelector('${sel}');if(!b)return null;const r=b.getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})())`)); if(!p) return false; for (const type of ['mousePressed','mouseReleased']) await send('Input.dispatchMouseEvent',{type,x:p.x,y:p.y,button:'left',clickCount:1}); await sleep(900); return true }
const rows = []
for (const [W,H,mode,overlay] of [[800,800,'machine','custom'],[1179,800,'machine','custom'],[1180,800,'machine','custom'],[1024,800,'mobile','custom'],[1024,800,'ds','custom'],[1024,800,'machine','case'],[1024,800,'machine','brief'],[1024,800,'machine','help'],[767,800,'machine','custom']]) {
  await send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:1,mobile:false})
  await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(3000)
  await js('localStorage.clear(); 1')
  await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(5200)
  await js(`window.showcase.mode('${mode}'); 1`); await sleep(2000)
  const opener = { custom:'#openCustom', case:'#openCase', brief:'#openBrief', help:'#openHelp' }[overlay]
  const opened = await click(opener)
  const pre = JSON.parse(await js(`JSON.stringify({y:Math.round(scrollY),scrollable:Math.max(0,document.documentElement.scrollHeight-document.documentElement.clientHeight),ovf:document.body.style.overflow,active:document.activeElement?.id||document.activeElement?.tagName,gate:getComputedStyle(document.querySelector('.deskgate')).display,scrim:document.getElementById('customScrim')?.hidden})`))
  await pageDown()
  const post = JSON.parse(await js(`JSON.stringify({y:Math.round(scrollY)})`))
  rows.push({ W, mode, overlay, opened, ...pre, yAfterPageDown: post.y, moved: post.y - pre.y })
}
console.log(JSON.stringify(rows,null,1))
ws.close(); chrome.kill()
