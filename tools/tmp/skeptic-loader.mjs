import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = Number(process.argv[2] || 1600)
const THROTTLE = process.argv.includes('--slow')
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sl'+port)}`,`--window-size=${W},1000`,'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; const to = setTimeout(() => { if (pend.has(n)) { pend.delete(n); r({ timeout: true }) } }, 20000); pend.set(n, (v) => { clearTimeout(to); r(v) }); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 1000, deviceScaleFactor: 1, mobile: false })
// record when the loader finishes, from the very first document
await send('Page.addScriptToEvaluateOnNewDocument', { source: `
  window.__mark = {}
  var tick = function () {
    var l = document.getElementById('loader')
    if (l && l.classList.contains('is-done')) { if (!window.__mark.loaderDone) window.__mark.loaderDone = performance.now(); return }
    if (performance.now() < 30000) requestAnimationFrame(tick); else setTimeout(tick, 30)
  }
  tick(); setInterval(function(){ var l=document.getElementById('loader'); if(l&&l.classList.contains('is-done')&&!window.__mark.loaderDone) window.__mark.loaderDone=performance.now() }, 16)
` })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js('try{localStorage.clear();sessionStorage.clear()}catch(e){}; 1')
await send('Network.clearBrowserCache'); await send('Network.setCacheDisabled', { cacheDisabled: true })
if (THROTTLE) await send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 10e6 / 8, uploadThroughput: 1e6 / 8 })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(THROTTLE ? 20000 : 10000)
const out = JSON.parse(await js(`JSON.stringify((()=>{
  const res = performance.getEntriesByType('resource')
  const lib = res.filter(r=>r.name.includes('/assets/photos/lib/') && r.name.endsWith('.jpg'))
  const nav = performance.getEntriesByType('navigation')[0]||{}
  const byName = lib.map(r=>({n:r.name.split('/').pop(), start:Math.round(r.startTime), end:Math.round(r.responseEnd), kb:Math.round(r.transferSize/1024)})).sort((a,b)=>a.start-b.start)
  const lazyCount = [...document.images].filter(i=>i.src.includes('/photos/lib/')).length
  const lazyAll = [...document.images].filter(i=>i.src.includes('/photos/lib/')).every(i=>i.loading==='lazy')
  const gating = [...document.images].filter(i=>i.loading!=='lazy' && !i.closest('[hidden]')).map(i=>i.src.split('/').slice(-2).join('/'))
  return { loaderDoneMs: Math.round(window.__mark.loaderDone||-1),
    domContentLoaded: Math.round(nav.domContentLoadedEventEnd||-1), loadEvent: Math.round(nav.loadEventEnd||-1),
    firstLibStart: byName[0]&&byName[0].start, lastLibEnd: byName.length?Math.max(...byName.map(r=>r.end)):-1,
    libCount: byName.length, libImgEls: lazyCount, allLibAreLazy: lazyAll,
    loaderGatingImages: gating, libTimeline: byName }
})())`))
console.log(JSON.stringify({ throttled: THROTTLE, ...out }, null, 1))
ws.close(); chrome.kill()
