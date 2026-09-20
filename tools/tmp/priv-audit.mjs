import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9411
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'pa'+port)}`,'--window-size=1440,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
let t
for (let i=0;i<90 && !t;i++){ try{ t=(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page') }catch{ await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r, { once:true }))
let id=0; const pend=new Map(); const errs=[]; const reqs=[]
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method==='Network.requestWillBeSent') reqs.push(m.params.request.url)
  else if (m.method==='Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
  else if (m.method==='Runtime.consoleAPICalled' && m.params.type==='error') errs.push(m.params.args.map(a=>a.value||a.description).join(' '))
})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(3000)
await js('localStorage.clear(); sessionStorage.clear(); 1')
reqs.length = 0
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(6000)

const dump = async (label) => {
  const v = await js(`JSON.stringify({ local: Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])), session: Object.fromEntries(Object.keys(sessionStorage).map(k=>[k,sessionStorage.getItem(k)])), cookie: document.cookie })`)
  return { label, ...JSON.parse(v) }
}
const snaps = [await dump('boot')]

// drive every surface
for (const mode of ['machine','animation','ds','mobile']) { await js(`window.showcase.mode('${mode}'); 1`); await sleep(1800) }
snaps.push(await dump('all-modes'))

// walk every phone page
await js(`window.showcase.mode('mobile'); 1`); await sleep(1200)
const pages = JSON.parse(await js(`JSON.stringify([...document.querySelectorAll('.m-page')].map(p=>p.dataset.page))`))
for (const p of pages) { await js(`window.punchApp.go('${p}'); 1`); await sleep(700) }
snaps.push(await dump('all-phone-pages'))

// open the checkout, choose card, type a card number, then leave and come back
const cardRaw = await send('Runtime.evaluate',{expression:`(async () => {
  const sleep = ms => new Promise(r=>setTimeout(r,ms))
  window.punchApp.go('checkout'); await sleep(900)
  const radios = [...document.querySelectorAll('#payMethods [data-method], #payMethods input, #payMethods button')].map(e=>({tag:e.tagName, m:e.dataset.method||'', txt:(e.textContent||'').trim().slice(0,30)}))
  const card = [...document.querySelectorAll('#payMethods [data-method="card"]')][0]
  if (card) { card.click(); await sleep(700) }
  const no=document.getElementById('payCardNo'), ex=document.getElementById('payCardExp'), cv=document.getElementById('payCardCvc')
  const set=(el,v)=>{ el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})) }
  set(no,'4111111111111111'); set(ex,'1230'); set(cv,'737')
  await sleep(300)
  const hiddenNow = document.getElementById('payNewCard').hidden
  document.getElementById('payNow').click(); await sleep(7000)
  const paidHTML = (document.querySelector('.m-page[data-page="paid"]')||{}).innerHTML||''
  const pan = no.value
  window.punchApp.go('feed'); await sleep(800)
  const stillThere = document.getElementById('payCardNo').value
  return { radios: radios.slice(0,8), newCardHidden: hiddenNow, panInField: pan, panAfterLeaving: stillThere, paidMentions4444: /1111/.test(paidHTML), paidEnding: (paidHTML.match(/ending[^<]{0,12}/i)||[''])[0] }
})()`, awaitPromise:true, returnByValue:true})
const cardRes = cardRaw.result?.result?.value ?? { error: JSON.stringify(cardRaw.result?.exceptionDetails || cardRaw.result) }
snaps.push(await dump('after-card-typed'))

// does a reload keep it?
await send('Page.navigate',{url:'http://localhost:5770/'}); await sleep(6000)
const afterReload = await js(`JSON.stringify({ page: (JSON.parse(localStorage.getItem('punch-mobile.v1')||'{}')).page, field: (document.getElementById('payCardNo')||{}).value })`)

const hosts = [...new Set(reqs.map(u => { try { return new URL(u).host || u.slice(0,24) } catch { return u.slice(0,24) } }))]
const nonLocal = hosts.filter(h => !/^localhost(:|$)|^127\.0\.0\.1/.test(h))
console.log(JSON.stringify({ hosts, nonLocal, totalRequests: reqs.length, snaps, cardRes, afterReload: JSON.parse(afterReload), errors: errs.slice(0,10) }, null, 1))
ws.close(); chrome.kill()
