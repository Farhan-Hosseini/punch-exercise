import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random() * 60)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1600,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 200 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return '__ERR__' + JSON.stringify(r.result.exceptionDetails).slice(0,500); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(7000)
await js(`window.showcase.mode('machine'); 1`); await sleep(1500)
await js(`window.showcase.mscreen('result'); 1`); await sleep(2000)
console.log('SLOTS', await js(`JSON.stringify(window.showcase.slots())`))
console.log('FIT0', await js(`JSON.stringify(window.showcase.fit())`))

const M = `(() => {
  const out = { n: 0, boxes: [], fit: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fit'))||1, clip: [] }
  const els = [...document.querySelectorAll('#screenContent *')].filter(e => e.getBoundingClientRect().height > 0)
  for (const e of els) {
    const cs = getComputedStyle(e)
    const trimmed = cs.textBoxTrim && cs.textBoxTrim !== 'none'
    const r = e.getBoundingClientRect()
    out.boxes.push({ c: (e.className||'').toString().slice(0,44), t:+r.top.toFixed(2), b:+r.bottom.toFixed(2), h:+r.height.toFixed(2), tr: trimmed?1:0 })
    if (trimmed) out.n++
  }
  for (const e of document.querySelectorAll('#screenContent *')) {
    const cs = getComputedStyle(e)
    if (!/hidden|clip/.test(cs.overflowY+cs.overflowX)) continue
    if (e.scrollHeight - e.clientHeight > 1) out.clip.push({ c:(e.className||'').toString().slice(0,40), dy: e.scrollHeight - e.clientHeight })
  }
  const sc = document.querySelector('#screenContent'); out.contentH = sc? +sc.getBoundingClientRect().height.toFixed(2) : 0
  const sr = document.querySelector('#screen'); out.screenH = sr? +sr.getBoundingClientRect().height.toFixed(2) : 0
  out.scrollH = sc ? sc.scrollHeight : 0; out.clientH = sc ? sc.clientHeight : 0
  return out
})()`
const OFF = `(() => { let s=document.getElementById('nofftb'); if(!s){s=document.createElement('style');s.id='nofftb';document.head.appendChild(s)} s.textContent='*, *::before, *::after { text-box-trim: none !important; }'; return 1 })()`
const ON  = `(() => { const s=document.getElementById('nofftb'); if(s) s.textContent=''; return 1 })()`

const slots = JSON.parse(await js(`JSON.stringify(window.showcase.slots())`))
const rows = []
for (const s of slots) {
  if (!['hero','cta','photo','video'].includes(s.key)) continue
  for (let i = 0; i < s.designs.length; i++) {
    await js(ON); await js(`window.showcase.set('${s.key}', ${i}); 1`); await sleep(700)
    const b = JSON.parse(await js(`JSON.stringify(${M})`))
    if (!b.n) { rows.push({ slot:s.key, i, name:s.designs[i], trimmed:0, note:'no trimmed element in this design' }); continue }
    await js(OFF); await sleep(700)
    const a = JSON.parse(await js(`JSON.stringify(${M})`))
    let moved=0, maxDh=0, maxDt=0, worst=null
    const n = Math.min(b.boxes.length, a.boxes.length)
    for (let k=0;k<n;k++){ const dh=a.boxes[k].h-b.boxes[k].h, dt=Math.abs(a.boxes[k].t-b.boxes[k].t)
      if (Math.abs(dh)>0.5||dt>0.5) moved++
      if (dt>maxDt) maxDt=dt
      if (dh>maxDh){maxDh=dh; worst={c:b.boxes[k].c, h:b.boxes[k].h, h2:a.boxes[k].h, pct:+((dh)/b.boxes[k].h*100).toFixed(1)}} }
    rows.push({ slot:s.key, i, name:s.designs[i], trimmed:b.n, boxes:n, sameLen: b.boxes.length===a.boxes.length,
      moved, maxTopShift:+maxDt.toFixed(2), maxGrow:+maxDh.toFixed(2), worst,
      contentH:[b.contentH,a.contentH], overflowPx:[b.scrollH-b.clientH, a.scrollH-a.clientH],
      clipBefore:b.clip.length, clipAfter:a.clip.length, clipNew: a.clip.filter(x=>!b.clip.some(y=>y.c===x.c)).slice(0,3) })
  }
}
for (const r of rows) console.log(JSON.stringify(r))
ws.close(); chrome.kill()
