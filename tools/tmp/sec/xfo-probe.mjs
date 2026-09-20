// Adds arbitrary headers to the document response and reports whether the self-framed machine iframe still loads.
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const HDRS = JSON.parse(process.argv[2] || '{}')
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'xf'+port)}`,'--window-size=1440,1000','about:blank'],{stdio:'ignore'})
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<90&&!t;i++){ try{ t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page') }catch{ await sleep(150) } }
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map(); const logs=[]
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
ws.addEventListener('message',async(e)=>{ const m=JSON.parse(e.data)
  if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);return}
  if(m.method==='Log.entryAdded') logs.push(m.params.entry.text.slice(0,200))
  else if(m.method==='Fetch.requestPaused'){ const {requestId,responseHeaders=[],responseStatusCode}=m.params
    try{ const b=(await send('Fetch.getResponseBody',{requestId})).result
      const h=responseHeaders.filter(x=>!/^content-length$/i.test(x.name))
      for(const [k,v] of Object.entries(HDRS)) h.push({name:k,value:v})
      await send('Fetch.fulfillRequest',{requestId,responseCode:responseStatusCode||200,responseHeaders:h,body:b.base64Encoded?b.body:Buffer.from(b.body,'utf8').toString('base64')})
    }catch{ await send('Fetch.continueRequest',{requestId}).catch(()=>{}) } }
})
const js=async(e)=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
await send('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Response',resourceType:'Document'}]})
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(4000)
await js('try{localStorage.clear()}catch(e){};1')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(6000)
await js(`try{window.showcase.mode('animation')}catch(e){};1`); await sleep(4000)
const r = await js(`JSON.stringify((()=>{
  const f=document.getElementById('linkedFrame')
  let inner=null
  try{ const d=f&&f.contentDocument; inner = d ? { url:d.URL, bodyLen:(d.body&&d.body.innerHTML.length)||0, hasMachine: !!d.getElementById('machine') } : 'contentDocument null' }catch(e){ inner='THREW '+e.name }
  return { frameSrc: f&&f.getAttribute('src'), inner }
})())`)
console.log(JSON.stringify({ headers: HDRS, frame: JSON.parse(r), logs: [...new Set(logs)].filter(x=>/frame|X-Frame|ancestors|Refused/i.test(x)).slice(0,5) },null,1))
ws.close(); chrome.kill()
