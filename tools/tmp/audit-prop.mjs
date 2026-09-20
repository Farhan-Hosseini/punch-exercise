import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9915 + Math.floor(Math.random() * 12)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'pr'+port)}`,'--window-size=1600,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 150 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return '__ERR__' + JSON.stringify(r.result.exceptionDetails).slice(0, 300); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(7000)
console.log('A. is --mf-k set by anything other than @property?', await js(`JSON.stringify((()=>{
  const el = document.querySelector('.mf-fr-o')
  return { exists: !!el, computedMfK: el ? getComputedStyle(el).getPropertyValue('--mf-k') : null, computedF: el ? getComputedStyle(el).getPropertyValue('--f') : null, bg: el ? getComputedStyle(el).backgroundImage.slice(0, 120) : null }
})())`))
console.log('B. same declaration with an UNREGISTERED custom property (what a browser without @property computes):', await js(`JSON.stringify((()=>{
  const host = document.body
  const a = document.createElement('div'); a.style.cssText = 'position:absolute;left:-9999px;width:72px;height:72px;--f:.5;--m-red:#f00;--m-line-2:#333;background: conic-gradient(var(--m-red) calc(var(--f) * var(--mf-k) * 360deg), var(--m-line-2) 0);'
  const b = document.createElement('div'); b.style.cssText = 'position:absolute;left:-9999px;width:72px;height:72px;--f:.5;--m-red:#f00;--m-line-2:#333;background: conic-gradient(var(--m-red) calc(var(--f) * var(--UNREGISTERED) * 360deg), var(--m-line-2) 0);'
  host.append(a, b)
  const out = { registered: getComputedStyle(a).backgroundImage.slice(0, 140), unregistered: getComputedStyle(b).backgroundImage.slice(0, 140), unregisteredColor: getComputedStyle(b).backgroundColor }
  a.remove(); b.remove(); return out
})())`))
// where does .mf-fr-o live
console.log('C. where the ring lives:', await js(`JSON.stringify((()=>{
  const els = [...document.querySelectorAll('.mf-fr-o')]
  return { count: els.length, pages: [...new Set(els.map(e => { const p = e.closest('[data-page]'); const sv = e.closest('[data-sv]'); return (p ? p.dataset.page : '?') + ' / ' + (sv ? sv.getAttribute('data-sv') : '?') }))] }
})())`))
// D. the --rp reel: which path sets it
console.log('D. --rp on a reel bar:', await js(`JSON.stringify((()=>{ const el = document.querySelector('.rl-pb, [style*="--rp"]'); return { found: !!el, inline: el ? el.getAttribute('style') : null } })())`))
ws.close(); chrome.kill()
