import { spawn, execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe'
// exactly cdp.mjs's flag list, MINUS the reduced-motion switch
const FULL=['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-color-profile=srgb',
 '--disk-cache-size=1','--media-cache-size=1','--disable-dev-shm-usage','--disable-extensions',
 '--disable-background-networking','--disable-component-update','--no-default-browser-check']
// exactly probe-pair.mjs's flag list
const PP=['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-color-profile=srgb']
async function run(label, extra){
  const port=9000+Math.floor(Math.random()*250); const dir=join(tmpdir(),'skst'+port)
  const ch=spawn(CHROME,[...extra,`--remote-debugging-port=${port}`,`--user-data-dir=${dir}`,'--window-size=1440,900','about:blank'],{stdio:'ignore'})
  let t; for(let i=0;i<120&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
  const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
  let id=0;const pend=new Map()
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}})
  const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
  const js=async e=>(await send('Runtime.evaluate',{expression:e,returnByValue:true})).result?.result?.value
  await send('Runtime.enable');await send('Page.enable')
  await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(2200)
  const v=await js(`matchMedia('(prefers-reduced-motion: reduce)').matches`)
  try{ws.close()}catch{};try{execSync('taskkill /PID '+ch.pid+' /T /F',{stdio:'ignore'})}catch{}
  return `${label.padEnd(40)} reduce=${v}`
}
for(let i=1;i<=3;i++) console.log(await run(`cdp.mjs flags minus switch, run ${i}`, FULL))
console.log(await run('probe-pair.mjs exact flags', PP))
console.log(await run('cdp.mjs flags PLUS switch=no-preference', [...FULL,'--force-prefers-reduced-motion=no-preference']))
