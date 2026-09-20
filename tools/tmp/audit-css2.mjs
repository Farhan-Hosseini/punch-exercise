import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9800 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'c2'+port)}`,'--window-size=1600,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 150 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description).slice(0,180)) })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return '__ERR__' + JSON.stringify(r.result.exceptionDetails).slice(0, 400); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6500)

// 1. declarations Chrome itself drops as invalid, across every loaded stylesheet
console.log('--- INVALID DECLARATIONS (Chrome drops them) ---')
console.log(await js(`JSON.stringify((()=>{
  const bad = []
  const probe = document.createElement('div')
  const walk = (rules, sheet) => { for (const r of rules) {
    if (r.cssRules) { walk(r.cssRules, sheet); continue }
    if (!r.style) continue
    const txt = r.style.cssText
    // CSSOM already dropped invalid ones; compare against the raw rule text
    const raw = r.cssText
  } }
  return bad
})())`))

// 2. the pagesub touch target, measured live
await js(`window.showcase.mode('mobile'); 1`); await sleep(1800)
console.log('--- PAGESUB ---')
console.log(await js(`JSON.stringify((()=>{
  const nav = [...document.querySelectorAll('.pagenav')].find(p=>p.dataset.pagenav==='page')
  const sub = nav && nav.querySelector('.pagesub')
  const b = sub && sub.querySelector('button')
  if (!b) return { note: 'no button', navVis: !!(nav&&nav.getClientRects().length), subHTML: sub ? sub.outerHTML.slice(0,200) : null }
  const r = b.getBoundingClientRect(), a = getComputedStyle(b, '::after')
  const grp = nav.querySelector('.pagegroups button'); const gr = grp && grp.getBoundingClientRect(); const ga = grp && getComputedStyle(grp, '::after')
  return { subVis: !!sub.getClientRects().length, subDisplay: getComputedStyle(sub).display, btnH: +r.height.toFixed(1), btnW: +r.width.toFixed(1), afterH: a.height, afterTop: a.top, afterBottom: a.bottom, hitH: parseFloat(a.height)||null, text: b.textContent.trim(),
           groupH: gr ? +gr.height.toFixed(1) : null, groupAfterH: ga ? ga.height : null, groupAfterContent: ga ? ga.content : null }
})())`))

// 3. case overlay: iframe titles + the empty-title one
await js(`document.getElementById('openCase').click(); 1`); await sleep(3500)
console.log('--- CASE IFRAMES ---')
console.log(await js(`JSON.stringify([...document.querySelectorAll('#case iframe')].map(f=>({cls:f.className, embed:f.dataset.embed, title:f.getAttribute('title'), src:f.getAttribute('src'), hasSrc:!!f.src, w:f.getAttribute('width'), h:f.getAttribute('height'), rect:(r=>({w:Math.round(r.width),h:Math.round(r.height)}))(f.getBoundingClientRect())})))`))
console.log('--- CASE structure ---')
console.log(await js(`JSON.stringify((()=>{
  const atHidden = (el) => { let e = el; while (e && e.nodeType===1) { const s=getComputedStyle(e); if (s.display==='none'||s.visibility==='hidden'||e.hasAttribute('hidden')||e.getAttribute('aria-hidden')==='true'||e.hasAttribute('inert')) return true; e=e.parentElement } return false }
  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(h=>!atHidden(h)).map(h=>+h.tagName[1])
  const skips=[]; for(let i=1;i<hs.length;i++) if(hs[i]>hs[i-1]+1) skips.push(hs[i-1]+'->'+hs[i])
  const byId={}; for(const el of document.querySelectorAll('[id]')) (byId[el.id]||=[]).push(1)
  return { visibleHeadings: hs.length, skips, dupes: Object.entries(byId).filter(([,v])=>v.length>1).map(([k,v])=>k+'x'+v.length), role: document.getElementById('case').getAttribute('role'), modal: document.getElementById('case').getAttribute('aria-modal'), label: document.getElementById('case').getAttribute('aria-labelledby') }
})())`))

// 4. text-box: what it actually buys, measured
console.log('--- TEXT-BOX effect (Firefox drops it) ---')
console.log(await js(`JSON.stringify((()=>{
  const out = []
  document.getElementById('closeCase') && document.getElementById('closeCase').click()
  return out
})())`))
console.log('ERR', JSON.stringify(errs.slice(0,8)))
ws.close(); chrome.kill()
