import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'; import { join } from 'node:path'
const port = 9481
const udd = join(tmpdir(),'sk'+port)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${udd}`,'--window-size=1600,1100','about:blank'], { stdio:'ignore' })
const sleep = ms => new Promise(r=>setTimeout(r,ms))
let t; for(let i=0;i<120&&!t;i++){try{t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page')}catch{await sleep(150)}}
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map(); let errs=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data)
  if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}
  else if(m.method==='Runtime.exceptionThrown') errs.push((m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text||'').split('\n').slice(0,2).join(' | '))
  else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error') errs.push('console.error: '+m.params.args.map(a=>a.value||a.description).join(' ').split('\n')[0])})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>{const r=await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true}); if(r.result?.exceptionDetails) return {__throw:r.result.exceptionDetails.exception?.description}; return r.result?.result?.value}
await send('Runtime.enable'); await send('Page.enable')

const V5 = (o) => `localStorage.setItem('punch-showcase.v5', JSON.stringify(Object.assign({variant:'arena',appearance:'dark',typeface:'arena',viewV:3,sets:{},layout:{},mode:'mobile',logo:'fist',mscreen:'default',mvar:{},backdrop:'glow',decimals:'on',scoreV:2}, ${JSON.stringify(o)})))`
const cases = {
  'A clean baseline':        `1`,
  'B variant=__proto__':     V5({ variant: '__proto__' }),
  'C variant=constructor':   V5({ variant: 'constructor' }),
  'D variant=toString':      V5({ variant: 'toString' }),
  'E variant=bogus-string':  V5({ variant: 'zzz' }),
  'F logo=__proto__':        V5({ logo: '__proto__' }),
}
const out = {}
for (const [name, poison] of Object.entries(cases)) {
  await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(2500)
  await js(`localStorage.clear(); ${poison}; 1`)
  errs = []
  await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(6000)
  const probe = await js(`(() => {
    const q = s => document.querySelector(s);
    const vis = s => { const e=q(s); if(!e) return 'missing'; const r=e.getBoundingClientRect(); const cs=getComputedStyle(e); return (r.width>2&&r.height>2&&cs.visibility!=='hidden'&&cs.display!=='none') ? Math.round(r.width)+'x'+Math.round(r.height) : 'hidden'; };
    return JSON.stringify({
      textLen: (document.body.innerText||'').trim().length,
      loaderGone: !document.documentElement.classList.contains('is-loading') && !q('.loader:not([hidden])'),
      showcase: typeof window.showcase, psec: typeof window.PSec, punchApp: typeof window.punchApp,
      htmlVariant: document.documentElement.dataset.variant || null,
      phone: vis('.phone'), stage: vis('#stage'),
      onPage: (q('.m-page.is-on')||{dataset:{}}).dataset.page || null,
      customBtn: !!q('#customBtn'), caseBtn: !!q('#openCase'),
    })
  })()`)
  // now try to interact: open Customise, switch to machine, open case
  const after = await js(`(async () => {
    const r = {};
    try { window.showcase && window.showcase.mode && window.showcase.mode('machine'); r.modeMachine='ok' } catch(e){ r.modeMachine='THREW: '+e.message }
    await new Promise(z=>setTimeout(z,1200));
    r.stageAfter = (()=>{const e=document.querySelector('#glass')||document.querySelector('#stage'); if(!e) return 'missing'; const b=e.getBoundingClientRect(); return Math.round(b.width)+'x'+Math.round(b.height)})();
    try { const b=document.getElementById('customBtn'); if(b){b.click(); r.customClick='ok'} else r.customClick='no button' } catch(e){ r.customClick='THREW: '+e.message }
    await new Promise(z=>setTimeout(z,900));
    const p=document.getElementById('custom'); r.panelOpen = p ? (p.hidden? 'hidden' : Math.round(p.getBoundingClientRect().width)+'px wide') : 'missing';
    r.panelRows = document.querySelectorAll('#custom [data-slot], #custom .row').length;
    try { window.showcase && window.showcase.mode && window.showcase.mode('mobile') } catch(e){ r.back='THREW: '+e.message }
    return JSON.stringify(r)
  })()`)
  out[name] = { probe: JSON.parse(probe||'{}'), after: JSON.parse(after||'{}'), errors: [...new Set(errs)].slice(0,4) }
}
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill()
await sleep(800); try { await rm(udd, { recursive:true, force:true }) } catch {}
