import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-color-profile=srgb','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sf'+port)}`,'--window-size=1440,1000','about:blank'],{stdio:'ignore'})
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
let t
for(let i=0;i<120&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws=new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const pend=new Map();const reqs=new Set();const errs=[]
ws.addEventListener('message',(e)=>{const m=JSON.parse(e.data)
  if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}
  else if(m.method==='Network.requestWillBeSent'){const u=m.params.request.url;if(/\.woff2?(\?|$)/i.test(u))reqs.add(u.replace(/^https?:\/\/[^/]+/,''))}
  else if(m.method==='Runtime.exceptionThrown')errs.push(m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text)})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async(e)=>{const r=await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true});if(r.result?.exceptionDetails)return {__err:r.result.exceptionDetails.text+' '+(r.result.exceptionDetails.exception?.description||'')};return r.result?.result?.value}
await send('Runtime.enable');await send('Page.enable');await send('Network.enable')
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate',{url:'http://localhost:5770/'});await sleep(6000)

const log=[]
const drive=async(label,expr,wait=350)=>{const v=await js(expr);await sleep(wait);log.push(label+' -> '+JSON.stringify(v)?.slice(0,90))}

const MSCREENS=['attract','scan','countdown','record','score','stats','loading','default']
const MPAGES=['default','scan','connect','connected','punch','hit','failed','feed','ranks','reel','profile']

for(const face of ['arena','orbitron','chakra']){
  await js(`document.querySelector('button[data-typeface="${face}"]')?.click(); 1`); await sleep(500)
  for(const app of ['dark','light']){
    await js(`window.showcase.appearance('${app}'); 1`); await sleep(400)
    for(const m of ['mobile','machine','animation','ds']){
      await js(`window.showcase.mode('${m}'); 1`); await sleep(700)
      if(m==='machine'){
        for(const s of MSCREENS){
          await js(`window.showcase.mscreen('${s}'); 1`); await sleep(450)
          // every Customise design on this screen
          const secs=await js(`JSON.stringify(window.showcase.sections('machine','${s}'))`)
          const arr=JSON.parse(secs||'[]')
          for(const sec of arr){for(let i=0;i<(sec.names||[]).length;i++){await js(`window.showcase.sec('machine','${s}','${sec.key}',${i}); 1`);await sleep(120)}}
          for(let i=0;i<8;i++){const n=await js(`window.showcase.mvar('${s}',${i})`);await sleep(120);if(!n)break}
        }
      }
      if(m==='mobile'){
        for(const p of MPAGES){
          await js(`document.querySelector('.pagebar [data-page="${p}"]')?.click(); 1`); await sleep(450)
          const secs=await js(`JSON.stringify(window.showcase.sections('phone','${p}'))`)
          const arr=JSON.parse(secs||'[]')
          for(const sec of arr){for(let i=0;i<(sec.names||[]).length;i++){await js(`window.showcase.sec('phone','${p}','${sec.key}',${i}); 1`);await sleep(110)}}
        }
      }
      if(m==='ds'){ await js(`scrollTo(0,document.body.scrollHeight); 1`);await sleep(900);await js(`scrollTo(0,document.body.scrollHeight/2); 1`);await sleep(600) }
    }
  }
}
// overlays
for(const b of ['openCase','openBrief','openHelp']){
  await js(`document.getElementById('${b}')?.click(); 1`); await sleep(1500)
  await js(`(()=>{const sc=document.querySelector('.cs-scroll,.bf-scroll,.hp-scroll')||document.scrollingElement;let y=0;const h=sc.scrollHeight;const step=()=>{y+=600;sc.scrollTop=y};for(let i=0;i<Math.ceil(h/600);i++)step();return h})()`); await sleep(2500)
  await js(`document.querySelector('#closeCase,#closeBrief,#closeHelp')?.click(); 1`); await sleep(600)
}
await sleep(2500)

const fonts=await js(`JSON.stringify([...document.fonts].map(f=>f.family+' '+f.weight+' '+f.status))`)
// every font-family value declared anywhere in the CSSOM (incl. the iframe's own doc is separate)
const decls=await js(`JSON.stringify((()=>{const out={};const walk=(rules)=>{for(const r of rules){if(r.cssRules)walk(r.cssRules);const s=r.style;if(!s)continue;const ff=s.getPropertyValue('font-family')||'';if(ff)(out[ff.trim()]=out[ff.trim()]||[]).push((r.selectorText||'@'+r.constructor.name).slice(0,70));for(let i=0;i<s.length;i++){const p=s[i];if(p.startsWith('--')&&/serif|Anton|Archivo|Sora|Unbounded|Poppins|Inter|Barlow|Orbitron|Chakra|Shoulders/i.test(s.getPropertyValue(p)))(out[s.getPropertyValue(p).trim()]=out[s.getPropertyValue(p).trim()]||[]).push('VAR '+p+' @ '+(r.selectorText||'').slice(0,40))}}}
for(const ss of document.styleSheets){try{walk(ss.cssRules)}catch(e){out['__unreadable__:'+ss.href]=[String(e)]}}
return out})())`)
// which families actually render, over every element currently in the doc + iframe
console.log(JSON.stringify({requestedWoff2:[...reqs].sort(),fonts:JSON.parse(fonts||'[]'),declaredFamilies:Object.keys(JSON.parse(decls||'{}')).sort(),errors:errs.slice(0,6)},null,1))
console.log('--- decl detail ---')
const d=JSON.parse(decls||'{}')
for(const k of Object.keys(d))if(/Archivo|Sora|Unbounded|Poppins/i.test(k))console.log(k,'=>',d[k].length,'rules; e.g.',d[k].slice(0,3))
ws.close();chrome.kill()
