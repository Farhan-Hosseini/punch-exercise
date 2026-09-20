import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random()*90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'skn'+port)}`,'about:blank'],{stdio:'ignore'})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<120&&!t;i++){ try{ t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page') }catch{ await sleep(150) } }
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map(); let hits=[]
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const BODY = Buffer.from(JSON.stringify({probe:'x'.repeat(200)})).toString('base64')
ws.addEventListener('message',async e=>{ const m=JSON.parse(e.data)
  if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);return}
  if(m.method==='Fetch.requestPaused'){
    const u=m.params.request.url
    if(/probe\.json/.test(u)){ hits.push(u)
      await send('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:200,responseHeaders:[{name:'content-type',value:'application/json'},{name:'cache-control',value:'public, max-age=600'},{name:'etag',value:'"abc"'}],body:BODY})
    } else await send('Fetch.continueRequest',{requestId:m.params.requestId})
  }
})
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Fetch.enable',{patterns:[{urlPattern:'*'}]})
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(5000)
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
hits=[]
await js(`(async()=>{ await fetch('/probe.json'); })()`); await sleep(400)
const a=hits.length
await js(`(async()=>{ await fetch('/probe.json'); })()`); await sleep(400)
const b=hits.length
await js(`(async()=>{ await fetch('/probe.json',{cache:'no-store'}); })()`); await sleep(400)
const c=hits.length
await js(`(async()=>{ await fetch('/probe.json'); })()`); await sleep(400)
const d=hits.length
console.log('network hits after: 1st plain fetch =',a,'| 2nd plain fetch =',b,'(no new hit => served from HTTP cache)','| 3rd fetch cache:no-store =',c,'| 4th plain fetch =',d)
console.log('=> plain re-fetch cost a network request?', b>a, ' ; cache:no-store forced a network request?', c>b)
ws.close(); chrome.kill()
