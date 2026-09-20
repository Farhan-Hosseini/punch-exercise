/* Downstream consequence: CSS rule-usage coverage of ds.css under mode('ds') vs mode('system'). */
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const KEYARG = process.argv[2] || 'ds'
const port = 9600 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'cv' + port)}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const sheets = new Map()
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'CSS.styleSheetAdded') sheets.set(m.params.header.styleSheetId, m.params.header.sourceURL)
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('DOM.enable'); await send('CSS.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await send('CSS.startRuleUsageTracking')
await js(`window.showcase.mode('${KEYARG}'); 1`); await sleep(4000)
await js(`(async()=>{const s=document.scrollingElement;for(let y=0;y<s.scrollHeight;y+=700){s.scrollTo(0,y);await new Promise(r=>setTimeout(r,60))}s.scrollTo(0,0);return s.scrollHeight})()`); await sleep(2500)
const cov = await send('CSS.stopRuleUsageTracking')
const used = (cov.result?.ruleUsage || []).filter(r => r.used)
const byFile = {}
for (const r of used) { const f = (sheets.get(r.styleSheetId) || '?').split('/').pop(); byFile[f] = (byFile[f] || 0) + 1 }
const mode = await js(`document.body.dataset.mode`)
const h = await js(`document.scrollingElement.scrollHeight`)
console.log(`key='${KEYARG}' -> body.dataset.mode='${mode}' pageScrollHeight=${h}  ds.css usedRules=${byFile['ds.css'] || 0}  styles.css=${byFile['styles.css'] || 0}  mpages.css=${byFile['mpages.css'] || 0}`)
ws.close(); chrome.kill()
