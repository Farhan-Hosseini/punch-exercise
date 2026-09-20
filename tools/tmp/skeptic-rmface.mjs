import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9400 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-color-profile=srgb','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1600,1000','about:blank'],{stdio:'ignore'})
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<90&&!t;i++){try{t=(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const pend=new Map();const errs=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data)
 if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}
 else if(m.method==='Runtime.exceptionThrown')errs.push(m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text)
 else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errs.push(m.params.args.map(a=>a.value||a.description).join(' '))})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async(e)=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable');await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false})
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(5500)
await js(`window.showcase.mode('machine'); 1`);await sleep(2500)

// 1. Does the CSSOM actually hold both declarations, and which wins?
const cssom = await js(`JSON.stringify((()=>{
  const hits=[]
  for(const sh of document.styleSheets){
    let rules; try{rules=sh.cssRules}catch{continue}
    const walk=(list)=>{for(const r of list){ if(r.cssRules) walk(r.cssRules)
      else if(r.selectorText && /\.rm-face\s*$/.test(r.selectorText)){
        hits.push({sel:r.selectorText, cssText:r.style.cssText, display:r.style.display, flex:r.style.flex, len:r.style.length,
          all:Array.from(r.style).join(',')})}}}
    walk(rules)
  }
  return hits
})())`)

// 2. Real geometry of every .rm-face in the record screen
const geom = await js(`JSON.stringify((()=>{
  const rec=document.querySelector('.mscreen-record'); if(!rec) return {err:'no .mscreen-record'}
  const faces=[...rec.querySelectorAll('.rm-face')]
  const m=(el)=>{const b=el.getBoundingClientRect();const cs=getComputedStyle(el)
    return {cls:el.className, tag:el.tagName, w:+b.width.toFixed(2), h:+b.height.toFixed(2),
      display:cs.display, flexGrow:cs.flexGrow, flexShrink:cs.flexShrink, flexBasis:cs.flexBasis,
      overflow:cs.overflow, borderRadius:cs.borderRadius,
      parentDisplay:getComputedStyle(el.parentElement).display, parentDir:getComputedStyle(el.parentElement).flexDirection,
      img: (()=>{const i=el.querySelector('img'); if(!i) return null; const ib=i.getBoundingClientRect()
        return {w:+ib.width.toFixed(2),h:+ib.height.toFixed(2), dx:+(ib.left-b.left).toFixed(2), dy:+(ib.top-b.top).toFixed(2), complete:i.complete, nw:i.naturalWidth}})()}}
  return faces.map(m)
})())`)

// 3. A/B: force display:block only (drop the grid) -> does anything move?
const ab = await js(`JSON.stringify((()=>{
  const rec=document.querySelector('.mscreen-record')
  const faces=[...rec.querySelectorAll('.rm-face')]
  const snap=()=>faces.map(el=>{const b=el.getBoundingClientRect();const i=el.querySelector('img');const ib=i?i.getBoundingClientRect():null
    return [+b.width.toFixed(2),+b.height.toFixed(2), ib?+ib.width.toFixed(2):null, ib?+ib.height.toFixed(2):null, ib?+(ib.left-b.left).toFixed(2):null]})
  const base=snap()
  const st=document.createElement('style'); document.head.appendChild(st)
  st.textContent='.mscreen-record .rm-face{display:block !important}'
  const blockOnly=snap()
  st.textContent='.mscreen-record .rm-face{flex:0 1 auto !important}'
  const noFlexNone=snap()
  st.textContent='.mscreen-record .rm-face{display:inline !important}'
  const inlineIfNeither=snap()
  st.remove()
  const after=snap()
  return {base, blockOnly, noFlexNone, inlineIfNeither, restored:JSON.stringify(after)===JSON.stringify(base)}
})())`)
const shot=await send('Page.captureScreenshot',{format:'png',clip:await js(`JSON.stringify((()=>{const el=document.querySelector('.mscreen-record .rm-hands');const b=el.getBoundingClientRect();return {x:Math.max(0,b.left-10),y:Math.max(0,b.top-10),width:Math.min(1590,b.width+20),height:Math.min(990,b.height+20),scale:1}})())`).then(s=>JSON.parse(s))})
await writeFile('build/skeptic-rmface.png',Buffer.from(shot.result.data,'base64'))
console.log('CSSOM:',cssom)
console.log('GEOM:',geom)
console.log('AB:',ab)
console.log('ERRORS:',JSON.stringify(errs.slice(0,6)))
ws.close();chrome.kill()
