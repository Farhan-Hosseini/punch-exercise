import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1600,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', e => { const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map(a => a.value || a.description).join(' ')) })
const send = (m, p = {}) => new Promise(r => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async e => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

const out = {}
out.markupPresent = await js(`!!document.querySelector('.mscreen[data-mscreen="stats"]')`)
out.statsJsRan = await js(`typeof window.yourRun === 'object' && Array.isArray(window.yourRun.runs)`)
out.navButtons = await js(`JSON.stringify([...document.querySelectorAll('.mpagebar [data-mscreen]')].map(b=>b.dataset.mscreen))`)
out.psecPages = await js(`JSON.stringify(window.PSec ? window.PSec.pages('machine') : null)`)
out.psecStatsSections = await js(`JSON.stringify(window.PSec ? window.PSec.sections('machine','stats').map(s=>s.key+':'+s.names.length) : null)`)
// the reproduction
await js(`window.showcase.mode('machine'); 1`); await sleep(1200)
await js(`window.showcase.mscreen('stats'); 1`); await sleep(1200)
out.afterCallDatasetMscreen = await js(`document.getElementById('machine').dataset.mscreen`)
out.afterCallStatsHidden = await js(`document.querySelector('.mscreen[data-mscreen="stats"]').hidden`)
out.afterCallResultVisible = await js(`(()=>{const el=document.querySelector('.mscreen[data-mscreen="result"]');return el? {hidden:el.hidden, h:Math.round(el.getBoundingClientRect().height)}:'screen slot'})()`)
out.screenSlotHidden = await js(`(()=>{const s=document.getElementById('screen'); return s? s.hidden : null})()`)
// payload evidence
out.resources = JSON.parse(await js(`JSON.stringify(performance.getEntriesByType('resource').filter(r=>/stats\.js|mscreens\.css|score\.js/.test(r.name)).map(r=>({n:r.name.split('/').slice(-1)[0], enc:r.encodedBodySize, dec:r.decodedBodySize, dur:Math.round(r.duration)})))`))
out.totalTransfer = await js(`Math.round(performance.getEntriesByType('resource').reduce((a,r)=>a+(r.encodedBodySize||0),0)/1024)+' KB enc, '+Math.round(performance.getEntriesByType('resource').reduce((a,r)=>a+(r.decodedBodySize||0),0)/1024)+' KB dec'`)
out.cssRuleCount = await js(`(()=>{let tot=0,yr=0;for(const s of document.styleSheets){let rs;try{rs=s.cssRules}catch{continue};if(!/mscreens\.css/.test(s.href||''))continue;for(const r of rs){tot++;if(/\.yr-|\.yr\b/.test(r.cssText.slice(0,400)))yr++}}return tot+' rules in mscreens.css, '+yr+' touch .yr'})()`)
// embeds
for (const mode of ['animation','ds']) { await js(`window.showcase.mode('${mode}'); 1`); await sleep(2500)
  await js(`scrollTo(0, document.body.scrollHeight); 1`); await sleep(2500); await js(`scrollTo(0,0);1`); await sleep(800)
  out['iframes_'+mode] = await js(`JSON.stringify([...document.querySelectorAll('iframe')].map(f=>({src:(f.getAttribute('src')||'(none)'), live:f.dataset.dsLive||'', w:Math.round(f.getBoundingClientRect().width)})))`) }
out.dsYourrunHidden = await js(`(()=>{const s=document.getElementById('ds-yourrun'); return s? {hidden:s.hidden, h:Math.round(s.getBoundingClientRect().height)}:null})()`)
out.errors = errs.slice(0, 10)
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill()
