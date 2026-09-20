import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9411
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'skmvar' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map(a => a.value || a.description).join(' '))
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return 'THREW: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result?.result?.value }
const jj = async (e) => JSON.parse(await js(`JSON.stringify((() => { ${e} })())`))
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

console.log('--- A. static state of the DOM ---')
console.log('.msv anywhere in document:', await js(`document.querySelectorAll('.msv').length`))
console.log('.mscreen articles:', await jj(`return [...document.querySelectorAll('.mscreen')].map(a => ({ key: a.dataset.mscreen, msvKids: a.querySelectorAll(':scope > .msv').length, anyMsv: a.querySelectorAll('.msv').length }))`))
console.log('mpagebar buttons:', await jj(`return [...document.querySelectorAll('.mpagebar [data-mscreen]')].map(b => b.dataset.mscreen)`))

console.log('\n--- B. showcase.mvar() return value, every screen ---')
await js(`window.showcase.mode('machine'); 1`); await sleep(1500)
const keys = ['default','attract','scan','countdown','loading','result','score','record','stats']
for (const k of keys) {
  const before = await js(`document.getElementById('machine').dataset.mscreen`)
  const ret = await js(`(() => { const v = window.showcase.mvar('${k}', 1); return v === undefined ? '<<undefined>>' : JSON.stringify(v) })()`)
  await sleep(250)
  const after = await js(`document.getElementById('machine').dataset.mscreen`)
  const vis = await js(`(document.querySelector('.mscreen:not([hidden])')||{dataset:{}}).dataset.mscreen || '<<none visible>>'`)
  console.log(`  mvar('${k}',1) -> ${ret}   machineEl.dataset.mscreen ${before} -> ${after}   visible article: ${vis}`)
}

console.log('\n--- C. what landed in localStorage ---')
await sleep(600)
console.log('raw punch-showcase.v5 .mvar:', await js(`(() => { try { return JSON.stringify(JSON.parse(localStorage.getItem('punch-showcase.v5')).mvar) } catch(e) { return 'ERR '+e.message } })()`))
console.log('full key list in saved state:', await js(`(() => { try { return Object.keys(JSON.parse(localStorage.getItem('punch-showcase.v5'))).join(',') } catch(e) { return 'ERR' } })()`))

console.log('\n--- D. the Customise Layout fallback row ---')
await js(`(document.getElementById('openCustom')||document.querySelector('[data-open="custom"]')||{click(){}}).click(); 1`); await sleep(900)
console.log('#mflowRows children:', await js(`(document.getElementById('mflowRows')||{children:[]}).children.length`))
console.log('rows labelled Layout:', await jj(`return [...document.querySelectorAll('.sec-row')].map(r => r.textContent.replace(/\s+/g,' ').trim().slice(0,60)).filter(t => /Layout/i.test(t))`))
console.log('showcase.sections(machine, scan):', await js(`JSON.stringify(window.showcase.sections('machine','scan').map(s=>s.key))`))

console.log('\n--- E. does the polluted mvar survive a reload and hurt anything? ---')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
console.log('mvar after reload:', await js(`(() => { try { return JSON.stringify(JSON.parse(localStorage.getItem('punch-showcase.v5')).mvar) } catch(e) { return 'ERR' } })()`))
console.log('mode after reload:', await js(`document.documentElement.dataset.mode || (window.showcase && 'n/a')`))
console.log('visible mscreen after reload:', await js(`(document.querySelector('.mscreen:not([hidden])')||{dataset:{}}).dataset.mscreen || 'none'`))
console.log('console errors:', JSON.stringify(errs.slice(0, 10)))
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'skmvar' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
