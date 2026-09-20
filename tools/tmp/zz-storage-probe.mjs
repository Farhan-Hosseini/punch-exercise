// Boot robustness: does the page still come up when its saved state is corrupt, stale or out of range?
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9000 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', '--disk-cache-size=1', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'zzst' + port)}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => process.stderr.write(a.join(' ') + '\n')
let t
for (let i = 0; i < 150 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); let errors = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data), p = m.params
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (m.method === 'Runtime.exceptionThrown') errors.push('UNCAUGHT ' + String(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text).split('\n')[0])
  else if (m.method === 'Runtime.consoleAPICalled' && p.type === 'error') errors.push('console.error ' + p.args.map((a) => a.value || a.description).join(' ').split('\n')[0])
  else if (m.method === 'Log.entryAdded' && p.entry.level === 'error') errors.push(`log ${p.entry.text} ${p.entry.url || ''}`.slice(0, 200))
})
const send = (m, pr = {}) => new Promise((r) => {
  const n = ++id
  const to = setTimeout(() => { if (pend.has(n)) { pend.delete(n); errors.push('CDP TIMEOUT ' + m); r({}) } }, 15000)
  pend.set(n, (v) => { clearTimeout(to); r(v) })
  ws.send(JSON.stringify({ id: n, method: m, params: pr }))
})
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) { errors.push('EVAL ' + String(r.result.exceptionDetails.exception?.description || '').split('\n')[0]); return undefined } return r.result?.result?.value }
const jj = async (e) => { try { return JSON.parse(await js(`JSON.stringify((()=>{${e}})())`)) } catch { return null } }
await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5000)

const CASES = [
  ['corrupt psec', `localStorage.setItem('punch-psec.v2','{not json')`],
  ['psec is an array', `localStorage.setItem('punch-psec.v2','[1,2,3]')`],
  ['psec index far out of range', `localStorage.setItem('punch-psec.v2', JSON.stringify({'machine/score':{score:99},'phone/default':{welcome:-7},'global':{tabbar:42}}))`],
  ['psec names a page that is gone', `localStorage.setItem('punch-psec.v2', JSON.stringify({'machine/ghost':{nope:2},'phone/ghost':{nope:1}}))`],
  ['corrupt shell state', `localStorage.setItem('punch-showcase.v5','{oops')`],
  ['shell state with unknown mode + mscreen', `localStorage.setItem('punch-showcase.v5', JSON.stringify({mode:'ghost',mscreen:'ghost',logo:'ghost',backdrop:'ghost',appearance:'ghost',zoom:'x',layout:{score:99},mvar:{result:99}}))`],
  ['shell state is null', `localStorage.setItem('punch-showcase.v5','null')`],
  ['corrupt app state', `localStorage.setItem('punch-showcase.app.v2','{{{')`],
  ['app state with unknown page', `localStorage.setItem('punch-showcase.app.v2', JSON.stringify({page:'ghost',device:'ghost',credits:'many'}))`],
  ['corrupt accordion state', `localStorage.setItem('punch-acc.v2','nope')`],
]
const out = []
for (const [label, setup] of CASES) {
  log(label)
  await js(`localStorage.clear(); 1`)
  await js(setup + '; 1')
  errors = []
  await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5200)
  const st = await jj(`return { loaderDone: document.getElementById('loader')?.classList.contains('is-done'), mode: document.body.dataset.mode, mscreen: document.body.dataset.mscreen, page: window.punchApp ? window.punchApp.page : null, apis: !!(window.showcase && window.punchApp && window.PSec), bodyText: (document.body.innerText||'').trim().length }`)
  out.push({ case: label, ...st, errors: errors.slice(0, 4) })
}
const report = { cases: out }
const text = JSON.stringify(report, null, 1)
if (process.argv[2]) { try { writeFileSync(process.argv[2], text) } catch (e) { log('write ' + e.message) } }
process.stdout.write(text + '\n')
try { ws.close() } catch {}
chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'zzst' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600); process.exit(0)
