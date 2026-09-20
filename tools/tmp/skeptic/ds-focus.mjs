// Focused: DS tab under a candidate CSP. Measures the elements whose style="" carries LAYOUT or COLOUR,
// and screenshots the swatch + scale area.
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeFileSync } from 'node:fs'
const CSP = process.argv[2] || ''
const TAG = process.argv[3] || 'x'
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-color-profile=srgb',
  '--force-prefers-reduced-motion=no-preference',
  `--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'dsf'+port)}`,
  '--window-size=1440,1200','about:blank'],{stdio:'ignore'})
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<90&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map()
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
ws.addEventListener('message',async e=>{const m=JSON.parse(e.data)
  if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);return}
  if(m.method==='Fetch.requestPaused'){const{requestId,responseHeaders=[],responseStatusCode}=m.params
    try{const b=(await send('Fetch.getResponseBody',{requestId})).result
      const hdrs=responseHeaders.filter(h=>!/^content-(length|security-policy)$/i.test(h.name))
      if(CSP)hdrs.push({name:'Content-Security-Policy',value:CSP})
      await send('Fetch.fulfillRequest',{requestId,responseCode:responseStatusCode||200,responseHeaders:hdrs,body:b.base64Encoded?b.body:Buffer.from(b.body,'utf8').toString('base64')})
    }catch{await send('Fetch.continueRequest',{requestId}).catch(()=>{})}}})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable');await send('Page.enable')
await send('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Response',resourceType:'Document'}]})
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(4000)
await js('try{localStorage.clear()}catch(e){};1')
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(6500)
await js(`try{window.showcase.mode('ds')}catch(e){};1`); await sleep(3000)
const rep={csp:CSP||'(none)'}
// .ds-mark carries grid-row/grid-column in style=""  -> layout
rep.marks = await js(`JSON.stringify([...document.querySelectorAll('.ds-mark')].slice(0,10).map(el=>{const cs=getComputedStyle(el);const r=el.getBoundingClientRect();return {gr:cs.gridRow,gc:cs.gridColumn,x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width)}}))`)
// .ds-chip carries background:var(--...) -> colour
rep.chips = await js(`JSON.stringify([...document.querySelectorAll('.ds-chip')].slice(0,8).map(el=>{const cs=getComputedStyle(el);return {bg:cs.backgroundColor, kid:(el.firstElementChild?getComputedStyle(el.firstElementChild).backgroundColor:'-')}}))`)
// the opacity scale steps carry rgba() backgrounds
rep.steps = await js(`JSON.stringify([...document.querySelectorAll('.ds-step')].slice(0,8).map(el=>getComputedStyle(el).backgroundColor))`)
rep.markCount = await js(`document.querySelectorAll('.ds-mark').length`)
rep.stepCount = await js(`document.querySelectorAll('.ds-step').length`)
// screenshot the given-scales block (where .ds-mark lives)
const box = await js(`(()=>{const el=document.querySelector('[data-ds-given]');if(!el)return null;el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return JSON.stringify({x:Math.max(0,Math.round(r.x)),y:Math.max(0,Math.round(r.y)),w:Math.round(r.width),h:Math.min(1100,Math.round(r.height))})})()`)
await sleep(800)
if(box){const b=JSON.parse(box)
  const s=await send('Page.captureScreenshot',{format:'png',clip:{x:b.x,y:b.y,width:b.w,height:b.h,scale:1}})
  if(s.result?.data) writeFileSync(join(process.cwd(),`ds-${TAG}.png`),Buffer.from(s.result.data,'base64'))}
writeFileSync(join(process.cwd(),`ds-${TAG}.json`),JSON.stringify(rep,null,1))
console.log(TAG,'marks',rep.markCount,'steps',rep.stepCount)
console.log(' marks:',rep.marks)
console.log(' chips:',rep.chips)
console.log(' steps:',rep.steps)
ws.close();chrome.kill()
