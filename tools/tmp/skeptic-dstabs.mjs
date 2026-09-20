import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9411
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1440,1000','about:blank'],{stdio:'ignore'})
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
let t
for(let i=0;i<90&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const pend=new Map();const errs=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data)
 if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}
 else if(m.method==='Runtime.exceptionThrown')errs.push(m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text)})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable');await send('Page.enable');await send('Accessibility.enable');await send('DOM.enable')
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(4000)
await js('localStorage.clear();1')
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(5500)
await js(`window.showcase.mode('ds');1`);await sleep(2500)

// 1. live DOM census of tab roles across the WHOLE document
console.log('DOM census:', await js(`JSON.stringify({
  tablist: [...document.querySelectorAll('[role=tablist]')].map(e=>({cls:e.className,label:e.getAttribute('aria-label')||e.getAttribute('aria-labelledby'),hidden:!e.offsetParent&&getComputedStyle(e).display==='none'})),
  tabpanel: [...document.querySelectorAll('[role=tabpanel]')].map(e=>e.id),
  tabs: [...document.querySelectorAll('[role=tab]')].map(e=>({txt:e.textContent.trim(),controls:e.getAttribute('aria-controls')||null}))
})`))

// 2. is the ds sample tablist actually rendered & in the a11y tree?
const box = await js(`JSON.stringify((()=>{const l=document.querySelector('[data-ds-tabs]');if(!l)return null;const b=l.getBoundingClientRect();l.scrollIntoView({block:'center'});const b2=l.getBoundingClientRect();return{w:b.width,h:b.height,vis:getComputedStyle(l).visibility,disp:getComputedStyle(l).display,ariaHiddenAncestor:!!l.closest('[aria-hidden=true]'),inertAncestor:!!l.closest('[inert]'),afterScrollTop:Math.round(b2.top)}})())`)
console.log('sample box:', box)
await sleep(600)
const nodeId = (await send('DOM.getDocument',{depth:-1,pierce:true})).result.root
const q = await send('DOM.querySelector',{nodeId:nodeId.nodeId,selector:'[data-ds-tabs]'})
const ax = await send('Accessibility.getPartialAXTree',{nodeId:q.result.nodeId,fetchRelatives:true})
const nodes = ax.result.nodes.filter(n=>['tablist','tab'].includes(n.role?.value))
console.log('AX nodes:', JSON.stringify(nodes.map(n=>({role:n.role.value,name:n.name?.value,ignored:n.ignored,props:(n.properties||[]).map(p=>p.name+'='+JSON.stringify(p.value.value))})),null,1))

// 3. click National and see what, if anything, changes in the figure
const before = await js(`(()=>{const f=document.querySelector('[data-ds-tabs]').closest('figure');return f.innerText.replace(/\s+/g,' ').slice(0,180)})()`)
await js(`[...document.querySelectorAll('[data-ds-tabs] [role=tab]')][1].click();1`)
await sleep(500)
const after = await js(`(()=>{const f=document.querySelector('[data-ds-tabs]').closest('figure');return f.innerText.replace(/\s+/g,' ').slice(0,180)})()`)
const sel = await js(`[...document.querySelectorAll('[data-ds-tabs] [role=tab]')].map(t=>t.getAttribute('aria-selected')+':'+t.tabIndex).join(' | ')`)
console.log('text before:', JSON.stringify(before))
console.log('text after :', JSON.stringify(after))
console.log('text changed:', before!==after, '| aria after click:', sel)
// does the red move? computed style of each tab
console.log('styles after click:', await js(`JSON.stringify([...document.querySelectorAll('[data-ds-tabs] [role=tab]')].map(t=>({t:t.textContent,bg:getComputedStyle(t).backgroundColor,c:getComputedStyle(t).color})))`))
// live regions anywhere?
console.log('live regions in ds:', await js(`JSON.stringify([...document.querySelectorAll('#ds [aria-live], #ds [role=status], #ds [role=alert]')].map(e=>e.getAttribute('aria-live')||e.getAttribute('role')))`))
console.log('errors:', errs.slice(0,5))
ws.close();chrome.kill()
