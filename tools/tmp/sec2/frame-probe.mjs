// Independent framing probe.
// argv[2] = JSON headers to inject on the DOCUMENT response of localhost:5770
// argv[3] = 'cross'  -> attacker page at http://127.0.0.1:5770/attack.html frames http://localhost:5770/ (cross-origin)
//           'self'   -> load http://localhost:5770/ and drive mode('animation'), check the self-framed machine
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const HDRS = JSON.parse(process.argv[2] || '{}')
const MODE = process.argv[3] || 'self'
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',
   `--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'fp'+port)}`,'--window-size=1440,1000','about:blank'],{stdio:'ignore'})
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
let t; for (let i=0;i<90&&!t;i++){ try{ t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page') }catch{ await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map(); const logs=[]
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const ATTACK = `<!doctype html><meta charset=utf-8><title>attacker</title>
<body style="margin:0"><h1 id=h>not the showcase</h1>
<iframe id=v src="http://localhost:5770/" style="width:1400px;height:900px;border:0;opacity:.35;position:absolute;top:0;left:0"
 onload="window.__loaded=(window.__loaded||0)+1" onerror="window.__err=1"></iframe>`
ws.addEventListener('message', async (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (m.method === 'Log.entryAdded') logs.push(m.params.entry.text.slice(0,220))
  else if (m.method === 'Fetch.requestPaused') {
    const { requestId, request, responseHeaders = [], responseStatusCode } = m.params
    // serve the attacker document ourselves (no extra server started)
    if (request.url.includes('/attack.html')) {
      const body = Buffer.from(ATTACK,'utf8').toString('base64')
      await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'content-type',value:'text/html; charset=utf-8'}],body})
      return
    }
    try {
      const b = (await send('Fetch.getResponseBody',{requestId})).result
      const h = responseHeaders.filter(x=>!/^content-length$/i.test(x.name))
      for (const [k,v] of Object.entries(HDRS)) h.push({name:k,value:v})
      await send('Fetch.fulfillRequest',{requestId,responseCode:responseStatusCode||200,responseHeaders:h,
        body: b.base64Encoded ? b.body : Buffer.from(b.body,'utf8').toString('base64')})
    } catch { await send('Fetch.continueRequest',{requestId}).catch(()=>{}) }
  }
})
const js=async(e)=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
if (!process.env.NOFETCH) await send('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Response',resourceType:'Document'}]})
let out
if (MODE === 'cross') {
  if (process.env.NOFETCH) {
    // no interception: build the attacker page in a real cross-origin document (127.0.0.1:5770 serves its index, we then replace it)
    await send('Page.navigate',{url:'http://127.0.0.1:5770/nonexistent-attacker-path'}); await sleep(1500)
    await js(`document.open();document.write(${JSON.stringify(ATTACK)});document.close();1`)
  } else {
    await send('Page.navigate',{url:'http://127.0.0.1:5770/attack.html'})
  }
  await sleep(9000)
  const tree = (await send('Page.getFrameTree')).result?.frameTree
  const kids = (tree?.childFrames||[]).map(c=>({url:c.frame.url, unreachable:c.frame.unreachableUrl||null, origin:c.frame.securityOrigin}))
  console.log('FRAMETREE '+JSON.stringify(kids))
  out = await js(`JSON.stringify((()=>{
    const f=document.getElementById('v'); let inner=null
    try{ const d=f.contentDocument
      inner = d ? { url:d.URL, title:d.title, bodyLen:(d.body&&d.body.innerHTML.length)||0,
                    modeBtns:d.querySelectorAll('.mode').length, hasCustom: !!d.getElementById('custom') } : 'contentDocument null'
    }catch(err){ inner='THREW '+err.name }
    return { topOrigin: location.origin, frameSrc:f.getAttribute('src'), inner,
             onloadFired: window.__loaded||0, childFrames: window.length,
             crossWindowReachable: (()=>{ try{ return typeof f.contentWindow.length === 'number' }catch(e){ return 'THREW '+e.name } })() }
  })())`)
} else {
  await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(3000)
  await js('try{localStorage.clear()}catch(e){};1')
  await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(7000)
  await js(`try{window.showcase.mode('animation')}catch(e){};1`); await sleep(5000)
  out = await js(`JSON.stringify((()=>{
    const f=document.getElementById('linkedFrame'); let inner=null
    try{ const d=f&&f.contentDocument
      inner = d ? { url:d.URL, bodyLen:(d.body&&d.body.innerHTML.length)||0, hasMachine: !!d.getElementById('machine'),
                    embedAttr: d.documentElement.dataset.embed || null } : 'contentDocument null'
    }catch(err){ inner='THREW '+err.name }
    const r=f?f.getBoundingClientRect():null
    return { frameSrc: f&&f.getAttribute('src'), frameBox: r?{w:Math.round(r.width),h:Math.round(r.height)}:null, ready: f&&f.classList.contains('is-ready'), inner }
  })())`)
}
if (process.env.SHOT) {
  const img = (await send('Page.captureScreenshot',{format:'png'})).result?.data
  if (img) { const { writeFileSync } = await import('node:fs'); writeFileSync(process.env.SHOT, Buffer.from(img,'base64')) }
}
console.log(JSON.stringify({ mode:MODE, headers:HDRS, result: JSON.parse(out),
  logs:[...new Set(logs)].filter(x=>/frame|ancestors|Refused|CSP|Content Security/i.test(x)).slice(0,6) }, null, 1))
ws.close(); chrome.kill(); process.exit(0)
