import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'; import { join } from 'node:path'
const port = 9455
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'po'+port)}`,'--window-size=1440,1000','about:blank'], { stdio:'ignore' })
const sleep = ms => new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<90&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map(); let errs=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data)
  if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}
  else if(m.method==='Runtime.exceptionThrown') errs.push((m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text||'').split('\n')[0])
  else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error') errs.push(m.params.args.map(a=>a.value||a.description).join(' ').split('\n')[0])})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
const cases = {
  'v5.mvar hostile': `localStorage.setItem('punch-showcase.v5', JSON.stringify({variant:'arena',appearance:'dark',typeface:'arena',viewV:3,sets:{},layout:{},mode:'machine',logo:'fist',mscreen:'default',mvar:{default:-9,scan:'<img src=x onerror=alert(1)>'},backdrop:'glow',decimals:'on',scoreV:2}))`,
  'v5.sets hostile': `localStorage.setItem('punch-showcase.v5', JSON.stringify({variant:'arena',appearance:'dark',typeface:'arena',viewV:3,sets:{arena:{score:'<img src=x onerror=1>',accent:'zz',on:'nope'}},layout:{header:'<b>x</b>'},mode:'machine',logo:'fist',mscreen:'default',mvar:{},backdrop:'glow',decimals:'on',scoreV:2}))`,
  'v5.sets array': `localStorage.setItem('punch-showcase.v5', JSON.stringify({variant:'arena',appearance:'dark',typeface:'arena',viewV:3,sets:[1,2,3],layout:null,mode:'ds',logo:'fist',mscreen:'default',mvar:{},backdrop:'glow',decimals:'on',scoreV:2}))`,
  'app.v2 hostile': `localStorage.setItem('punch-showcase.app.v2', JSON.stringify({page:'<img src=x onerror=1>',device:'evil',board:'x',connect:-4,nav:99,fit:'y',fitV:2,credits:'NaN',reelView:'evil'}))`,
  'app.v2 page=__proto__': `localStorage.setItem('punch-showcase.app.v2', JSON.stringify({page:'__proto__',device:'iphone',fitV:2,credits:0}))`,
  'psec hostile': `localStorage.setItem('punch-psec.v2', JSON.stringify({'phone/reel':{secs:-7},'global':'a string','machine/scan':{code:1e9}}))`,
  'saved hostile': `localStorage.setItem('punch-saved.v2', JSON.stringify({keys:['"]><img src=x onerror=1>', 1, null, {a:1}]}))`,
  'reel hostile': `localStorage.setItem('punch-reel.v1', JSON.stringify({autoplay:'x',audience:'constructor',slowmo:{},captions:[],saver:1}))`,
  'feed view hostile': `localStorage.setItem('punch-feed-view.v1', '<img src=x>')`,
  'acc hostile': `localStorage.setItem('punch-acc.v2', '[[[')`,
}
const out = {}
for (const [name, poison] of Object.entries(cases)) {
  await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(3000)
  await js(`localStorage.clear(); ${poison}; 1`)
  errs = []
  await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(6000)
  const state = await js(`JSON.stringify((()=>{ const b=document.body; return { alerted: !!window.__x, loaderDone: !!document.querySelector('#loader.is-done'), visibleText: (document.body.innerText||'').trim().length, mode: document.documentElement.dataset.mode||'', phonePages: document.querySelectorAll('.m-page:not([hidden])').length, injectedImgs: document.querySelectorAll('img[src="x"]').length } })())`)
  // walk phone pages to shake out late throws
  await js(`try{ window.showcase.mode('mobile'); }catch(e){}; 1`); await sleep(1200)
  const walk = await js(`(async()=>{ const s=ms=>new Promise(r=>setTimeout(r,ms)); try{ for(const p of [...document.querySelectorAll('.m-page')].map(p=>p.dataset.page)){ window.punchApp.go(p); await s(350) } }catch(e){ return 'walk threw: '+e.message } return 'ok' })()`)
  out[name] = { ...JSON.parse(state||'{}'), walk, errors: [...new Set(errs)].slice(0,4) }
}
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill()
