import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9600 + Math.floor(Math.random() * 90)
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
await send('Emulation.setDeviceMetricsOverride',{width:1600,height:3000,deviceScaleFactor:1,mobile:false})
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(5000)
await js(`window.showcase.mode('machine'); 1`);await sleep(1800)
await js(`window.showcase.mscreen('record'); 1`);await sleep(2500)

console.log('VISIBLE:', await js(`JSON.stringify((()=>{const a=document.querySelector('.mscreen-record');const b=a.getBoundingClientRect();return {d:getComputedStyle(a).display,w:Math.round(b.width),h:Math.round(b.height),hidden:a.hasAttribute('hidden')}})())`))

console.log('CSSOM:', await js(`JSON.stringify((()=>{
  const hits=[]
  for(const sh of document.styleSheets){ let rules; try{rules=sh.cssRules}catch{continue}
    const walk=(list)=>{ for(const r of list){ if(r.cssRules) walk(r.cssRules)
      else if(r.selectorText && r.selectorText.indexOf('.rm-face')>-1){
        hits.push({file:(sh.href||'inline').split('/').pop(), sel:r.selectorText, props:Array.from(r.style), display:r.style.getPropertyValue('display'), flex:r.style.getPropertyValue('flex'), css:r.style.cssText})}}}
    walk(rules) }
  return hits
})())`))

console.log('GEOM:', await js(`JSON.stringify((()=>{
  const rec=document.querySelector('.mscreen-record')
  return [...rec.querySelectorAll('.rm-face')].map(el=>{const b=el.getBoundingClientRect();const cs=getComputedStyle(el);const i=el.querySelector('img');const ib=i&&i.getBoundingClientRect()
    return {cls:el.className, tag:el.tagName, w:+b.width.toFixed(2), h:+b.height.toFixed(2), display:cs.display,
      shrink:cs.flexShrink, grow:cs.flexGrow, basis:cs.flexBasis, parent:getComputedStyle(el.parentElement).display+'/'+getComputedStyle(el.parentElement).flexDirection,
      parentH:+el.parentElement.getBoundingClientRect().height.toFixed(2),
      img: ib&&{w:+ib.width.toFixed(2),h:+ib.height.toFixed(2),dx:+(ib.left-b.left).toFixed(2),dy:+(ib.top-b.top).toFixed(2),complete:i.complete,nw:i.naturalWidth}}})
})())`))

console.log('AB:', await js(`JSON.stringify((()=>{
  const rec=document.querySelector('.mscreen-record')
  const faces=[...rec.querySelectorAll('.rm-face')]
  const snap=()=>faces.map(el=>{const b=el.getBoundingClientRect();const i=el.querySelector('img');const ib=i&&i.getBoundingClientRect()
    return [+b.width.toFixed(2),+b.height.toFixed(2), ib?+ib.width.toFixed(2):null, ib?+ib.height.toFixed(2):null, ib?+(ib.left-b.left).toFixed(2):null, ib?+(ib.top-b.top).toFixed(2):null]})
  const st=document.createElement('style'); document.head.appendChild(st)
  const run=(css)=>{st.textContent=css; void rec.offsetHeight; return snap()}
  const base=run('')
  const blockOnly=run('.mscreen-record .rm-face{display:block !important}')
  const noFlexNone=run('.mscreen-record .rm-face{flex:0 1 auto !important}')
  const neither=run('.mscreen-record .rm-face{display:inline !important}')
  const after=run('')
  st.remove()
  return {base, blockOnly, noFlexNone, neither, restored:JSON.stringify(after)===JSON.stringify(base)}
})())`))

// fallback-letter path: what does a .rm-face look like with no img (the grid's real job)?
console.log('NOIMG:', await js(`JSON.stringify((()=>{
  const rec=document.querySelector('.mscreen-record')
  const f=rec.querySelector('.rm-face')
  const clone=f.cloneNode(false); clone.textContent='S'
  f.parentElement.insertBefore(clone, f.nextSibling)
  void rec.offsetHeight
  const st=document.createElement('style'); document.head.appendChild(st)
  const rd=()=>{const b=clone.getBoundingClientRect();const r=document.createRange();r.selectNodeContents(clone);const tb=r.getBoundingClientRect()
    return {face:[+b.width.toFixed(1),+b.height.toFixed(1)], glyphDx:+(tb.left-b.left).toFixed(1), glyphDy:+(tb.top-b.top).toFixed(1), glyphW:+tb.width.toFixed(1), display:getComputedStyle(clone).display}}
  const asIs=rd()
  st.textContent='.mscreen-record .rm-face{display:block !important}'; void rec.offsetHeight
  const asBlock=rd()
  st.remove(); clone.remove()
  return {asIs, asBlock}
})())`))

const clip=JSON.parse(await js(`JSON.stringify((()=>{const el=document.querySelector('.mscreen-record .rm-hands');const b=el.getBoundingClientRect();return {x:Math.max(0,b.left-16),y:Math.max(0,b.top-16),width:Math.min(1580,b.width+32),height:Math.min(2900,b.height+32),scale:1}})())`))
const shot=await send('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:true})
await writeFile('build/skeptic-rmface.png',Buffer.from(shot.result.data,'base64'))
console.log('ERRORS:',JSON.stringify(errs.slice(0,6)))
ws.close();chrome.kill()
