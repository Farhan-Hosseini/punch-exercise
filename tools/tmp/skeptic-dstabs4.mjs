import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9415
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1600,1000','about:blank'],{stdio:'ignore'})
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
let t
for(let i=0;i<90&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const pend=new Map();const errs=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}
 else if(m.method==='Runtime.exceptionThrown')errs.push(String(m.params.exceptionDetails?.exception?.description).slice(0,160))})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable');await send('Page.enable');await send('Accessibility.enable');await send('DOM.enable')
await send('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false})
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(7000)
await js(`window.showcase.mode('system');1`);await sleep(3000)
console.log('state:',await js(`JSON.stringify({mode:document.body.dataset.mode,dsHidden:document.getElementById('dsStage').hasAttribute('hidden'),docH:document.documentElement.scrollHeight})`))
const box=async()=>await js(`JSON.stringify((()=>{const e=document.querySelector('[data-ds-tabs]');const b=e.getBoundingClientRect();return{w:Math.round(b.width),h:Math.round(b.height),top:Math.round(b.top)}})())`)
console.log('tablist box:',await box())
await js(`document.querySelector('[data-ds-tabs]').scrollIntoView({block:'center'});1`);await sleep(1200)
console.log('after scroll:',await box())
const doc=(await send('DOM.getDocument',{depth:-1,pierce:true})).result.root
const q=await send('DOM.querySelector',{nodeId:doc.nodeId,selector:'[data-ds-tabs]'})
const ax=await send('Accessibility.getPartialAXTree',{nodeId:q.result.nodeId,fetchRelatives:true})
console.log('AX:',JSON.stringify(ax.result.nodes.filter(n=>['tablist','tab'].includes(n.role?.value)).map(n=>({role:n.role.value,name:n.name?.value,ignored:n.ignored,props:(n.properties||[]).map(p=>p.name+'='+JSON.stringify(p.value.value))})),null,1))
// real keyboard: focus the selected tab, ArrowRight, observe
await js(`document.querySelector('[data-ds-tabs] [role=tab][aria-selected=true]').focus();1`)
console.log('focused:',await js(`document.activeElement.getAttribute('role')+':'+document.activeElement.textContent.trim()`))
const figTxt=async()=>await js(`document.querySelector('[data-ds-tabs]').closest('figure').innerText.replace(/\s+/g,' ').trim()`)
const before=await figTxt()
await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39})
await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39})
await sleep(500)
const after=await figTxt()
console.log('focus after ArrowRight:',await js(`document.activeElement.textContent.trim()`))
console.log('aria-selected now:',await js(`[...document.querySelectorAll('[data-ds-tabs] [role=tab]')].map(t=>t.getAttribute('aria-selected')).join(',')`))
console.log('figure text changed:',before!==after)
console.log('figure text:',JSON.stringify(after.slice(0,200)))
const ax2=await send('Accessibility.getPartialAXTree',{nodeId:q.result.nodeId,fetchRelatives:true})
console.log('AX after:',JSON.stringify(ax2.result.nodes.filter(n=>['tablist','tab'].includes(n.role?.value)).map(n=>({role:n.role.value,name:n.name?.value,props:(n.properties||[]).map(p=>p.name+'='+JSON.stringify(p.value.value))})),null,1))
// how many other inert sample controls live in the DS tab, for context
console.log('ds sample control census:',await js(`JSON.stringify((()=>{const ds=document.getElementById('dsStage');const btns=[...ds.querySelectorAll('button')];return{buttons:btns.length,withListenerlessSample:btns.filter(b=>!b.id&&!b.getAttribute('data-ds-tabs')).length,searchInputs:ds.querySelectorAll('input[type=search]').length,navs:ds.querySelectorAll('[data-ds-nav]').length,tabs:ds.querySelectorAll('[role=tab]').length}})())`))
console.log('errors:',errs.slice(0,5))
ws.close();chrome.kill()
