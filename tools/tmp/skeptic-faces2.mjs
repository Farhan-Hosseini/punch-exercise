import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'; import { join } from 'node:path'
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1440,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t; for (let i=0;i<90&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map()
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(4000)
await js('localStorage.clear(); 1'); await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(5500)
const KEYS={ArrowRight:39,' ':32,Enter:13}
async function key(k){const p={key:k,code:k===' '?'Space':k,windowsVirtualKeyCode:KEYS[k],nativeVirtualKeyCode:KEYS[k]}
  await send('Input.dispatchKeyEvent',{type:'rawKeyDown',...p})
  if(k===' ')await send('Input.dispatchKeyEvent',{type:'char',text:' ',key:' '})
  await send('Input.dispatchKeyEvent',{type:'keyUp',...p}); await sleep(300)}
await js(`document.getElementById('openCustom')?.click(); 1`); await sleep(1200)
const out={}
// Space on the 2nd face tile: does it still work at all?
await js(`document.querySelectorAll('.face-tile')[1].focus(); 1`); await sleep(200)
out.beforeSpace = await js(`document.documentElement.dataset.typeface`)
await key(' ')
out.afterSpace = await js(`document.documentElement.dataset.typeface`)
out.tabIndexesAfterSelect = JSON.parse(await js(`JSON.stringify([...document.querySelectorAll('.face-tile')].map(b=>b.tabIndex))`))
out.checkedAfterSelect = JSON.parse(await js(`JSON.stringify([...document.querySelectorAll('.face-tile')].map(b=>b.getAttribute('aria-checked')))`))
// does any other mode install roving on .faces?
out.perMode = {}
for (const m of ['machine','animation','ds','mobile']) {
  await js(`window.showcase.mode('${m}'); 1`); await sleep(1800)
  await js(`document.querySelectorAll('.face-tile')[0].focus(); 1`); await sleep(150)
  const f0 = await js(`document.activeElement.dataset.typeface||'none'`)
  await key('ArrowRight')
  out.perMode[m] = { ti: JSON.parse(await js(`JSON.stringify([...document.querySelectorAll('.face-tile')].map(b=>b.tabIndex))`)), from: f0, to: await js(`document.activeElement.dataset.typeface||'none'`) }
}
console.log(JSON.stringify(out,null,1)); ws.close(); chrome.kill()
