import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sn'+port)}`,'--window-size=1440,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
const reqs = new Map(); const errs = []
let recording = false
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (!recording) return
  if (m.method === 'Network.requestWillBeSent') reqs.set(m.params.requestId, { url: m.params.request.url, type: m.params.type, init: m.params.initiator?.type, bytes: 0, status: null })
  if (m.method === 'Network.responseReceived') { const r = reqs.get(m.params.requestId); if (r) { r.status = m.params.response.status; r.type = m.params.type; r.mime = m.params.response.mimeType } }
  if (m.method === 'Network.loadingFinished') { const r = reqs.get(m.params.requestId); if (r) r.bytes = m.params.encodedDataLength }
  if (m.method === 'Network.loadingFailed') { const r = reqs.get(m.params.requestId); if (r) r.failed = m.params.errorText }
  if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
})
const send = (m, p = {}) => new Promise(r => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async e => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Network.setCacheDisabled', { cacheDisabled: true })
// warm visit to clear storage
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); sessionStorage.clear(); 1')
// cold load, recording
recording = true
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(9000)
const mode = await js('(window.showcase && window.showcase.state && JSON.stringify(window.showcase.state())) || document.documentElement.getAttribute("data-mode") || "?"')
const domState = await js(`JSON.stringify({
  stageHidden: document.getElementById('phoneStage')?.hidden,
  stageClass: document.getElementById('phoneStage')?.className,
  animExtraDisplay: getComputedStyle(document.getElementById('animExtra')).display,
  vids: [...document.querySelectorAll('video[data-anim-clip]')].map(v => ({ poster: v.getAttribute('poster'), preload: v.preload, disp: getComputedStyle(v).display, off: v.offsetParent === null, rect: v.getBoundingClientRect().width })),
  caseEl: !!document.getElementById('case'), caseHidden: document.getElementById('case')?.hidden,
  caseDisp: document.getElementById('case') ? getComputedStyle(document.getElementById('case')).display : null,
  hitImgs: [...document.querySelectorAll('img[src*="screen-hit"]')].map(i => ({ src: i.getAttribute('src'), loading: i.loading, complete: i.complete, nw: i.naturalWidth, disp: getComputedStyle(i).display, off: i.offsetParent === null }))
})`)
const all = [...reqs.values()].filter(r => r.url.startsWith('http'))
const total = all.reduce((a, r) => a + (r.bytes || 0), 0)
const susp = all.filter(r => /poster|screen-hit/.test(r.url))
console.log('MODE STATE:', mode)
console.log('DOM:', domState)
console.log('TOTAL cold-load bytes:', total, 'reqs:', all.length)
console.log('--- suspect files ---')
for (const r of susp) console.log(r.status, String(r.bytes).padStart(8), r.type, r.init, r.url.replace('http://localhost:5770',''))
console.log('--- top 15 by bytes ---')
for (const r of all.sort((a,b)=>b.bytes-a.bytes).slice(0,15)) console.log(String(r.bytes).padStart(8), r.type, r.url.replace('http://localhost:5770',''))
console.log('ERRORS:', errs.slice(0,5))
ws.close(); chrome.kill()
