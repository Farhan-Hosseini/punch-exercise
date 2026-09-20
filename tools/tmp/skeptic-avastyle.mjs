import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const POISON = process.argv[2] === 'poison'
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
   '--force-prefers-reduced-motion=no-preference',
   `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'sk' + port)}`,
   '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []; const netHits = []
ws.addEventListener('message', async (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
  if (m.method === 'Network.requestWillBeSent') { const u = m.params.request.url; if (/evil\.example|attacker/.test(u)) netHits.push(u) }
  if (m.method === 'Fetch.requestPaused') {
    const u = m.params.request.url
    if (POISON && /assets\/photos\/lib\/manifest\.json/.test(u)) {
      const raw = JSON.parse(await readFile('C:/Claude Database/punch-exercise/showcase/assets/photos/lib/manifest.json', 'utf8'))
      const rows = Array.isArray(raw) ? raw : (raw.photos || raw.items || raw.images)
      let n = 0
      for (const r of rows) {
        if (!/^crowd-/.test(r.player || '')) continue
        n++
        // three shapes of hostile focal, rotated over the crowd rows
        if (n % 3 === 1) r.focal = '55% 35%;background-image:url(https://evil.example/leak-str)'
        else if (n % 3 === 2) r.focal = { x: '0;background-image:url(https://evil.example/leak-obj)', y: 30 }
        else r.focal = { x: 50, y: '35%;background-image:url(https://evil.example/leak-y)' }
      }
      const body = Buffer.from(JSON.stringify(raw)).toString('base64')
      await send('Fetch.fulfillRequest', { requestId: m.params.requestId, responseCode: 200,
        responseHeaders: [{ name: 'content-type', value: 'application/json' }, { name: 'access-control-allow-origin', value: '*' }], body })
      return
    }
    await send('Fetch.continueRequest', { requestId: m.params.requestId })
  }
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => {
  const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) return 'EXCEPTION: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text)
  return r.result?.result?.value
}
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] })
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('try{localStorage.clear()}catch(e){}; 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await js(`window.showcase.mode('mobile'); 1`); await sleep(2000)
await js(`window.punchApp && window.punchApp.go('reel'); 1`); await sleep(3000)

// which players actually landed in the reel
const players = await js(`JSON.stringify((()=>{const out=[];document.querySelectorAll('#mReelTrack .m-reel-slide').forEach((s,i)=>{if(i<40)out.push(s.dataset.who||s.getAttribute('data-who')||'')});return out})())`)

// open the three-dots menu on each slide in turn and record the style attribute actually written
const probe = `(async () => {
  const seen = []
  const slides = [...document.querySelectorAll('#mReelTrack .m-reel-slide')]
  for (let i = 0; i < Math.min(slides.length, 25); i++) {
    const b = slides[i].querySelector('[data-ract="more"]')
    if (!b) continue
    b.click()
    await new Promise(r => setTimeout(r, 120))
    const a = document.getElementById('mReelMenuAva')
    seen.push({ i, title: (document.getElementById('mReelMenuTitle')||{}).textContent, src: a ? a.getAttribute('src') : null, style: a ? a.getAttribute('style') : null })
    const c = document.querySelector('#mReelMenu [data-rsheet-close]')
    if (c) c.click()
    await new Promise(r => setTimeout(r, 120))
  }
  return JSON.stringify(seen)
})()`
const menu = await js(probe)
// scroll the feed a lot to pull in lib-/vid- players, then probe again
await js(`(async()=>{const f=document.getElementById('mReelTrack'); for(let k=0;k<25;k++){ f.scrollTop = f.scrollHeight; await new Promise(r=>setTimeout(r,120)) } return 1})()`)
await sleep(1500)
const menu2 = await js(probe)
const styleDump = await js(`JSON.stringify([...document.querySelectorAll('#mReelTrack img, #mReelGrid img, #mReelComList img')].slice(0,80).map(i=>i.getAttribute('style')).filter(Boolean))`)
console.log(JSON.stringify({ poisoned: POISON, players: JSON.parse(players||'[]'), menu: JSON.parse(menu||'[]'), menu2: JSON.parse(menu2||'[]'), inlineStyles: JSON.parse(styleDump||'[]'), evilRequests: netHits, errors: errs.slice(0, 6) }, null, 1))
ws.close(); chrome.kill()
