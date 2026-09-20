import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9412
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1440,1000','about:blank'],{stdio:'ignore'})
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
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(4000)
await js('localStorage.clear();1')
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(5500)
await js(`window.showcase.mode('ds');1`);await sleep(3000)

console.log('ancestor chain:', await js(`JSON.stringify((()=>{const l=document.querySelector('[data-ds-tabs]');const out=[];let e=l;while(e&&e!==document.documentElement){const s=getComputedStyle(e);const b=e.getBoundingClientRect();out.push({tag:e.tagName.toLowerCase(),cls:(e.className||'').toString().slice(0,60),id:e.id,disp:s.display,cv:s.contentVisibility,vis:s.visibility,op:s.opacity,hidden:e.hasAttribute('hidden'),w:Math.round(b.width),h:Math.round(b.height)});e=e.parentElement}return out})())`,))

// scroll it properly into view via the real scroller, wait, re-measure
await js(`document.querySelector('[data-ds-tabs]').scrollIntoView({block:'center'});1`)
await sleep(1500)
console.log('after scrollIntoView:', await js(`JSON.stringify((()=>{const l=document.querySelector('[data-ds-tabs]');const b=l.getBoundingClientRect();return{w:Math.round(b.width),h:Math.round(b.height),top:Math.round(b.top),scrollY:Math.round(scrollY),docH:document.documentElement.scrollHeight}})())`))
const doc=(await send('DOM.getDocument',{depth:-1,pierce:true})).result.root
const q=await send('DOM.querySelector',{nodeId:doc.nodeId,selector:'[data-ds-tabs]'})
const ax=await send('Accessibility.getPartialAXTree',{nodeId:q.result.nodeId,fetchRelatives:true})
console.log('AX partial (tab roles):',JSON.stringify(ax.result.nodes.filter(n=>['tablist','tab'].includes(n.role?.value)).map(n=>({role:n.role.value,name:n.name?.value,ignored:n.ignored,reasons:(n.ignoredReasons||[]).map(r=>r.name),props:(n.properties||[]).map(p=>p.name+'='+JSON.stringify(p.value.value))})),null,1))

// full tree scan for the sample tabs by name
const full=await send('Accessibility.getFullAXTree',{})
const hits=full.result.nodes.filter(n=>['Global','National','Dubai'].includes(n.name?.value)&&n.role?.value!=='StaticText')
console.log('full AX hits for Global/National/Dubai:',JSON.stringify(hits.map(n=>({role:n.role.value,name:n.name.value,ignored:n.ignored})),null,1))
const tl=full.result.nodes.filter(n=>n.role?.value==='tablist')
console.log('full AX tablists:',JSON.stringify(tl.map(n=>({name:n.name?.value,ignored:n.ignored})),null,1))

// keyboard reachability: can Tab focus reach it?
await js(`document.querySelector('[data-ds-tabs] [role=tab][aria-selected=true]').focus();1`)
console.log('focused after .focus():', await js(`document.activeElement===document.querySelector('[data-ds-tabs] [role=tab][aria-selected=true]')`))
console.log('activeElement:', await js(`document.activeElement.tagName+'.'+document.activeElement.className+' txt='+document.activeElement.textContent.trim()`))
ws.close();chrome.kill()
