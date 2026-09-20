import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9300 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-color-profile=srgb','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1600,1200','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description?.split('\n')[0]) })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return 'ERR:' + (r.result.exceptionDetails.exception?.description || '').split('\n')[0]; return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1200, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)

console.log('mode ->', await js("window.showcase.mode('mobile')"))
await sleep(1200)
console.log('go feed ->', await js("window.punchApp.go('feed'); window.punchApp.page"))
await sleep(2500)

// what the feed actually renders: name, place, quote, and the img the post uses
const feed = await js(`JSON.stringify([...document.querySelectorAll('#mApp [data-page="feed"] article, #mApp .fd-post, #mApp [class*="post"]')].slice(0,12).map(a=>({cls:a.className,txt:a.innerText.replace(/\s+/g,' ').slice(0,180),imgs:[...a.querySelectorAll('img')].map(i=>i.getAttribute('src'))})))`)
console.log('FEED:', feed)
const shot1 = await send('Page.captureScreenshot', { format: 'png' })
if (shot1.result) await writeFile('C:/Claude Database/punch-exercise/tools/tmp/skeptic/feed.png', Buffer.from(shot1.result.data, 'base64'))

// DS tab: is the provenance actually shown to a visitor?
console.log('mode ->', await js("window.showcase.mode('ds')"))
await sleep(2500)
await js("document.getElementById('ds-photo')?.scrollIntoView({block:'start'}); 1"); await sleep(2500)
console.log('photofoot:', await js("document.querySelector('[data-ds-photofoot]')?.textContent"))
console.log('castnote :', await js("document.querySelector('[data-ds-castnote]')?.textContent"))
console.log('cast     :', await js("JSON.stringify([...document.querySelectorAll('[data-ds-cast] .ds-castp')].map(b=>b.innerText.replace(/\n/g,' | ')))"))
console.log('first 6 lib tiles:', await js("JSON.stringify([...document.querySelectorAll('[data-ds-photos] .ds-ph')].slice(0,6).map(li=>li.innerText.replace(/\n/g,' | ')))"))
console.log('tiles total:', await js("document.querySelectorAll('[data-ds-photos] .ds-ph').length"))
const shot2 = await send('Page.captureScreenshot', { format: 'png' })
if (shot2.result) await writeFile('C:/Claude Database/punch-exercise/tools/tmp/skeptic/ds-photo.png', Buffer.from(shot2.result.data, 'base64'))
console.log('errors:', errs.slice(0,5))
ws.close(); chrome.kill()
