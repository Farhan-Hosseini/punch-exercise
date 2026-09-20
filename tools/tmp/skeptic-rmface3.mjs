import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random() * 90)
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
await send('Emulation.setDeviceMetricsOverride',{width:1600,height:3000,deviceScaleFactor:1,mobile:false})
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(5000)
await js(`window.showcase.mode('machine'); window.showcase.mscreen('record'); 1`);await sleep(2500)

// CSSOM again, this time report what we DO find so we know the scan works
console.log('SCAN:', await js(`JSON.stringify((()=>{
  let total=0, faceRules=[], recRules=0
  for(const sh of document.styleSheets){ let rules; try{rules=sh.cssRules}catch(e){ continue }
    const walk=(list)=>{ for(const r of list){ if(r.cssRules){walk(r.cssRules); continue}
      if(!r.selectorText) continue; total++
      if(r.selectorText.includes('mscreen-record')) recRules++
      if(r.selectorText.includes('rm-face')) faceRules.push({f:(sh.href||'inline').split('/').pop(), sel:r.selectorText, css:r.style.cssText}) } }
    walk(rules) }
  return {total, recRules, faceRules}
})())`))

// per-state computed display + geometry, one state at a time with an explicit reflow read
const states = {
  base: '',
  blockOnly: '.mscreen-record .rm-face{display:block !important}',
  inline: '.mscreen-record .rm-face{display:inline !important}',
  noFlexNone: '.mscreen-record .rm-face{flex:0 1 auto !important}',
  squeeze: '.mscreen-record .rm-who{height:120px !important}',
  squeezeNoFlex: '.mscreen-record .rm-who{height:120px !important} .mscreen-record .rm-face{flex:0 1 auto !important}'
}
await js(`window.__st=document.createElement('style');document.head.appendChild(window.__st);1`)
for (const [name, css] of Object.entries(states)) {
  await js(`window.__st.textContent=${JSON.stringify(css)};1`)
  await sleep(250)
  const r = await js(`JSON.stringify((()=>{
    const rec=document.querySelector('.mscreen-record')
    return [...rec.querySelectorAll('.rm-face')].map(el=>{const b=el.getBoundingClientRect();const cs=getComputedStyle(el)
      const i=el.querySelector('img'); const ib=i&&i.getBoundingClientRect()
      return cs.display+' shrink='+cs.flexShrink+' box='+b.width.toFixed(1)+'x'+b.height.toFixed(1)+' img='+(ib?ib.width.toFixed(1)+'x'+ib.height.toFixed(1):'-')})
  })())`)
  console.log(name.padEnd(15), r)
}
await js(`window.__st.remove();1`)
ws.close();chrome.kill()
