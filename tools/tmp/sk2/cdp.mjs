import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export async function open (opts = {}) {
  const port = 9400 + Math.floor(Math.random() * 500)
  const args = ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb',
    '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`,
    `--user-data-dir=${join(tmpdir(), 'sk2' + port)}`, `--window-size=${opts.w || 1600},${opts.h || 1000}`, 'about:blank']
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', args, { stdio: 'ignore' })
  let t
  for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  let id = 0; const pend = new Map(); const errs = []; const handlers = []
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
    else {
      if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
      else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map(a => a.value || a.description).join(' '))
      for (const h of handlers) h(m)
    }
  })
  const send = (m, p = {}, sid) => new Promise((r, j) => { const n = ++id; pend.set(n, r); const o = { id: n, method: m, params: p }; if (sid) o.sessionId = sid; ws.send(JSON.stringify(o)) })
  const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
  const jsj = async (e) => JSON.parse(await js(`JSON.stringify(${e})`))
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
  return { send, js, jsj, errs, on: (h) => handlers.push(h), close: () => { try { ws.close() } catch {} ; chrome.kill() } }
}
