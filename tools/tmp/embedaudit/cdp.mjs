import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export async function launch({ w = 1440, h = 1000, motion = true } = {}) {
  const port = 9400 + Math.floor(Math.random() * 400)
  const args = ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb',
    `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'ea' + port)}`, `--window-size=${w},${h}`]
  if (motion) args.push('--force-prefers-reduced-motion=no-preference')
  args.push('about:blank')
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', args, { stdio: 'ignore' })
  let list
  for (let i = 0; i < 120 && !list; i++) { try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json() } catch { await sleep(150) } }
  return { port, chrome }
}
export async function conn(wsUrl) {
  const ws = new WebSocket(wsUrl)
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  let id = 0; const pend = new Map(); const errs = []; const logs = []
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
    else if (m.method === 'Runtime.exceptionThrown') errs.push('EXC ' + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text))
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push('ERR ' + m.params.args.map(a => a.value || a.description).join(' '))
    else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') logs.push('LOG ' + m.params.entry.text)
  })
  const send = (method, params = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method, params })) })
  const js = async (expression, ctx) => {
    const p = { expression, awaitPromise: true, returnByValue: true }
    if (ctx) p.contextId = ctx
    const r = await send('Runtime.evaluate', p)
    if (r.result?.exceptionDetails) return { __throw: r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text }
    return r.result?.result?.value
  }
  return { ws, send, js, errs, logs }
}
export async function newTarget(port, url) {
  const r = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json()
  return r
}
