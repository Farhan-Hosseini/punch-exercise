import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1600,1000','about:blank'],{stdio:'ignore'})
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<90&&!t;i++){try{t=(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const pend=new Map()
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async(e)=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable');await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false})
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(5000)
await js(`window.showcase.mode('machine'); 1`);await sleep(2500)
console.log('SHEETS:', await js(`JSON.stringify([...document.styleSheets].map(s=>{let n=0;try{n=s.cssRules.length}catch(e){n='X:'+e.name} return (s.href||'inline').split('/').pop()+'#'+n}))`))
console.log('ANCESTRY:', await js(`JSON.stringify((()=>{
  const el=document.querySelector('.mscreen-record .rm-face'); if(!el) return 'none'
  const out=[]; let n=el
  while(n && n!==document.documentElement){const cs=getComputedStyle(n);const b=n.getBoundingClientRect()
    out.push({t:n.tagName+'.'+(typeof n.className==='string'?n.className.split(' ').slice(0,3).join('.'):''),
      d:cs.display, v:cs.visibility, op:cs.opacity, cv:cs.contentVisibility, tr:cs.transform.slice(0,30),
      w:Math.round(b.width), h:Math.round(b.height), hidden:n.hasAttribute('hidden')})
    n=n.parentElement}
  return out
})())`))
console.log('SCREENS:', await js(`JSON.stringify([...document.querySelectorAll('[class*=mscreen-]')].slice(0,14).map(e=>{const b=e.getBoundingClientRect();const cs=getComputedStyle(e);return e.className.split(' ').find(c=>c.startsWith('mscreen-'))+' d='+cs.display+' w='+Math.round(b.width)+' h='+Math.round(b.height)}))`))
console.log('API:', await js(`JSON.stringify(Object.keys(window.showcase||{}))`))
ws.close();chrome.kill()
