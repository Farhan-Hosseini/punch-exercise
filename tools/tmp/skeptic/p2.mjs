import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9400 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-color-profile=srgb','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'sk'+port)}`,'--window-size=1600,1300','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description?.split('\n')[0]) })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return 'ERR:' + (r.result.exceptionDetails.exception?.description || '').split('\n')[0]; return r.result?.result?.value }
const fn = async (body) => js('(function(){' + body + '})()')
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1300, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5500)
await js("window.showcase.mode('mobile')"); await sleep(1200)
await js("window.punchApp.go('feed')"); await sleep(2500)

console.log('FEED TEXT:\n' + await fn(`
 var app=document.getElementById('mApp');
 var out=[]; var seen=new Set();
 app.querySelectorAll('img').forEach(function(i){ var r=i.getBoundingClientRect(); if(r.width>60&&r.height>60){ out.push(Math.round(r.width)+'x'+Math.round(r.height)+'  '+i.getAttribute('src')+'  alt='+JSON.stringify(i.getAttribute('alt'))) } });
 return out.join('\n');
`))
console.log('\n--- visible post copy ---\n' + await fn(`
 var p=document.querySelector('#mApp [data-page="feed"]')||document.getElementById('mApp');
 return p.innerText.split('\n').filter(function(s){return s.trim()}).slice(0,60).join(' / ');
`))
const shot = await send('Page.captureScreenshot', { format: 'png' })
if (shot.result) await writeFile('C:/Claude Database/punch-exercise/tools/tmp/skeptic/feed.png', Buffer.from(shot.result.data, 'base64'))

// DS cast + credits, rendered
await js("window.showcase.mode('ds')"); await sleep(2500)
await js("document.getElementById('ds-photo').scrollIntoView({block:'start'}); 1"); await sleep(2500)
console.log('\nCAST: ' + await fn(`return [].slice.call(document.querySelectorAll('[data-ds-cast] .ds-castp')).map(function(b){return b.innerText.split('\n').join(' | ')}).join('\n')`))
console.log('\nFIRST 8 LIB TILES: ' + await fn(`return [].slice.call(document.querySelectorAll('[data-ds-photos] .ds-ph')).slice(0,8).map(function(li){return li.innerText.split('\n').join(' | ')+'  href='+(li.querySelector('a')?li.querySelector('a').href:'-')}).join('\n')`))
const shot2 = await send('Page.captureScreenshot', { format: 'png' })
if (shot2.result) await writeFile('C:/Claude Database/punch-exercise/tools/tmp/skeptic/ds-photo.png', Buffer.from(shot2.result.data, 'base64'))
console.log('\nerrors:', errs.slice(0,5))
ws.close(); chrome.kill()
