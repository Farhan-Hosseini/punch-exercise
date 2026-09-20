import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const NL = String.fromCharCode(10)
const port = 9500 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-color-profile=srgb','--force-prefers-reduced-motion=no-preference','--remote-debugging-port=' + port,'--user-data-dir=' + join(tmpdir(),'sk'+port),'--window-size=1600,1300','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch('http://127.0.0.1:' + port + '/json')).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description) })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return 'ERR:' + (r.result.exceptionDetails.exception?.description || JSON.stringify(r.result.exceptionDetails)); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1300, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)
await js("window.showcase.mode('mobile')"); await sleep(1200)
await js("window.punchApp.go('feed')"); await sleep(2500)

const IMGS = "JSON.stringify([].slice.call(document.querySelectorAll('#mApp img')).filter(function(i){var r=i.getBoundingClientRect();return r.width>60&&r.height>60}).map(function(i){var r=i.getBoundingClientRect();return Math.round(r.width)+'x'+Math.round(r.height)+' '+i.getAttribute('src')+' alt='+i.getAttribute('alt')}))"
console.log('FEED IMGS:'); console.log(JSON.parse(await js(IMGS) || '[]').join(NL))
const TXT = "document.getElementById('mApp').innerText"
const txt = await js(TXT)
console.log(NL + '--- phone innerText (feed) ---'); console.log(String(txt).split(NL).filter(s=>s.trim()).slice(0,70).join(' / '))
let shot = await send('Page.captureScreenshot', { format: 'png' })
if (shot.result) await writeFile('C:/Claude Database/punch-exercise/tools/tmp/skeptic/feed.png', Buffer.from(shot.result.data, 'base64'))

await js("window.showcase.mode('ds')"); await sleep(2500)
await js("document.getElementById('ds-photo').scrollIntoView({block:'start'}); 1"); await sleep(2500)
const CAST = "JSON.stringify([].slice.call(document.querySelectorAll('[data-ds-cast] .ds-castp')).map(function(b){return b.innerText.replace(/[\r\n]+/g,' | ')}))"
console.log(NL + 'CAST:'); console.log(JSON.parse(await js(CAST) || '[]').join(NL))
const TILES = "JSON.stringify([].slice.call(document.querySelectorAll('[data-ds-photos] .ds-ph')).slice(0,8).map(function(li){var a=li.querySelector('a');return li.innerText.replace(/[\r\n]+/g,' | ')+'  -> '+(a?a.href:'-')}))"
console.log(NL + 'FIRST 8 LIB TILES:'); console.log(JSON.parse(await js(TILES) || '[]').join(NL))
shot = await send('Page.captureScreenshot', { format: 'png' })
if (shot.result) await writeFile('C:/Claude Database/punch-exercise/tools/tmp/skeptic/ds-photo.png', Buffer.from(shot.result.data, 'base64'))
console.log(NL + 'errors:', errs.slice(0,3))
ws.close(); chrome.kill()
