import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9413
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1600,1000','about:blank'],{stdio:'ignore'})
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
let t
for(let i=0;i<90&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const pend=new Map()
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable');await send('Page.enable');await send('Accessibility.enable');await send('DOM.enable')
await send('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false})
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(4000)
await js('localStorage.clear();1')
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(6000)
console.log('viewport:',await js(`innerWidth+'x'+innerHeight`),'| gate visible:',await js(`getComputedStyle(document.querySelector('.deskgate')).display`))
console.log('showcase api:',await js(`Object.keys(window.showcase||{}).join(',')`))
await js(`window.showcase.mode('ds');1`);await sleep(3500)
console.log('dsStage:',await js(`JSON.stringify((()=>{const s=document.getElementById('dsStage');return{hidden:s.hasAttribute('hidden'),disp:getComputedStyle(s).display,h:Math.round(s.getBoundingClientRect().height)}})())`))
console.log('doc height:',await js(`document.documentElement.scrollHeight`))
const l=async()=>await js(`JSON.stringify((()=>{const e=document.querySelector('[data-ds-tabs]');const b=e.getBoundingClientRect();return{w:Math.round(b.width),h:Math.round(b.height),top:Math.round(b.top)}})())`)
console.log('tablist box:',await l())
await js(`document.querySelector('[data-ds-tabs]').scrollIntoView({block:'center'});1`);await sleep(1200)
console.log('tablist box after scroll:',await l())
const doc=(await send('DOM.getDocument',{depth:-1,pierce:true})).result.root
const q=await send('DOM.querySelector',{nodeId:doc.nodeId,selector:'[data-ds-tabs]'})
const ax=await send('Accessibility.getPartialAXTree',{nodeId:q.result.nodeId,fetchRelatives:true})
console.log('AX partial:',JSON.stringify(ax.result.nodes.filter(n=>['tablist','tab'].includes(n.role?.value)).map(n=>({role:n.role.value,name:n.name?.value,ignored:n.ignored,props:(n.properties||[]).map(p=>p.name+'='+JSON.stringify(p.value.value))})),null,1))
// keyboard: can a real Tab press reach the sample tab? walk focus from the section heading
console.log('tabindexes:',await js(`JSON.stringify([...document.querySelectorAll('[data-ds-tabs] [role=tab]')].map(t=>({txt:t.textContent,ti:t.tabIndex,sel:t.getAttribute('aria-selected')})))`))
await js(`document.querySelector('[data-ds-tabs] [role=tab][aria-selected=true]').focus();1`)
console.log('focus landed:',await js(`document.activeElement.getAttribute('role')+':'+document.activeElement.textContent.trim()`))
// press ArrowRight via real key events
await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39})
await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39})
await sleep(400)
console.log('after ArrowRight:',await js(`document.activeElement.textContent.trim()+' | '+[...document.querySelectorAll('[data-ds-tabs] [role=tab]')].map(t=>t.getAttribute('aria-selected')).join(',')`))
const fig=async()=>await js(`document.querySelector('[data-ds-tabs]').closest('figure').innerText.replace(/\s+/g,' ').trim()`)
console.log('figure text now:',JSON.stringify(await fig()))
const ax2=await send('Accessibility.getPartialAXTree',{nodeId:q.result.nodeId,fetchRelatives:true})
console.log('AX partial after:',JSON.stringify(ax2.result.nodes.filter(n=>['tablist','tab'].includes(n.role?.value)).map(n=>({role:n.role.value,name:n.name?.value,ignored:n.ignored,props:(n.properties||[]).map(p=>p.name+'='+JSON.stringify(p.value.value))})),null,1))
ws.close();chrome.kill()
