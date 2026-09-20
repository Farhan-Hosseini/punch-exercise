import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export async function open({ W = 1440, H = 1000 } = {}) {
  const port = 9400 + Math.floor(Math.random() * 190)
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
    ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb',
     '--force-prefers-reduced-motion=no-preference', '--js-flags=--expose-gc',
     `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'au' + port)}`,
     `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' })
  let t
  for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  let id = 0; const pend = new Map(); const errs = []
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
    else if (m.method === 'Runtime.exceptionThrown') errs.push('EXC ' + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text))
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push('ERR ' + m.params.args.map(a => a.value || a.description).join(' '))
    else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errs.push('LOG ' + m.params.entry.text + ' @' + (m.params.entry.url||''))
  })
  const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
  const js = async (e) => {
    const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })
    if (r.result?.exceptionDetails) return { __err: r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text }
    return r.result?.result?.value
  }
  const jsj = async (e) => { const v = await js(`JSON.stringify(${e})`); return typeof v === 'string' ? JSON.parse(v) : v }
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable'); await send('Performance.enable')
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
  const metrics = async () => {
    await send('HeapProfiler.collectGarbage')
    const m = (await send('Performance.getMetrics')).result.metrics
    const g = (n) => m.find((x) => x.name === n)?.value
    return { nodes: g('Nodes'), listeners: g('JSEventListeners'), docs: g('Documents'), heapMB: +( (g('JSHeapUsedSize')||0)/1048576 ).toFixed(1) }
  }
  const close = () => { try { ws.close() } catch {} ; chrome.kill() }
  return { send, js, jsj, errs, metrics, close }
}
