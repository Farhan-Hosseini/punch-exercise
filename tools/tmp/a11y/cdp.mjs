import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rmSync } from 'node:fs'
import { execSync } from 'node:child_process'
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export async function open({ W = 1440, H = 1000, motion = 'no-preference', tag = 'a11y' } = {}) {
  const port = 9500 + Math.floor(Math.random() * 400)
  const args = ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb',
    '--disk-cache-size=1', '--media-cache-size=1', '--disable-dev-shm-usage', '--disable-extensions',
    '--disable-background-networking', '--disable-component-update', '--no-default-browser-check',
    `--force-prefers-reduced-motion=${motion}`,
    `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), tag + port)}`, `--window-size=${W},${H}`, 'about:blank']
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', args, { stdio: 'ignore' })
  let t
  for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
  if (!t) { chrome.kill(); throw new Error('no chrome target') }
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  let id = 0; const pend = new Map(); const errs = []
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
    else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).split('\n')[0])
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map((a) => a.value || a.description).join(' ').split('\n')[0])
  })
  const send = (m, p = {}) => new Promise((r, j) => { const n = ++id; pend.set(n, (msg) => (msg.error ? j(new Error(m + ': ' + msg.error.message)) : r(msg))); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
  const js = async (e) => {
    const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text)
    return r.result?.result?.value
  }
  const jsn = async (e) => JSON.parse(await js(`JSON.stringify(${e})`))
  await send('Runtime.enable'); await send('Page.enable'); await send('DOM.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
  // the --force-prefers-reduced-motion flag is a no-op in this build: matchMedia still says reduce.
  // CDP emulation is the only thing that actually flips it.
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: motion }] })
  async function boot(url = 'http://localhost:5770/') {
    await send('Page.navigate', { url }); await sleep(3500)
    try { await js('localStorage.clear(); 1') } catch {}
    await send('Page.navigate', { url }); await sleep(6000)
  }
  async function key(k, opts = {}) {
    const map = { Tab: 9, Enter: 13, Escape: 27, ' ': 32, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Home: 36, End: 35 }
    const code = { Tab: 'Tab', Enter: 'Enter', Escape: 'Escape', ' ': 'Space', ArrowLeft: 'ArrowLeft', ArrowUp: 'ArrowUp', ArrowRight: 'ArrowRight', ArrowDown: 'ArrowDown', Home: 'Home', End: 'End' }[k]
    const base = { key: k, code, windowsVirtualKeyCode: map[k], nativeVirtualKeyCode: map[k], modifiers: opts.shift ? 8 : 0 }
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base })
    if (k === ' ' || k === 'Enter') await send('Input.dispatchKeyEvent', { type: 'char', text: k === ' ' ? ' ' : '\r', ...base })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
    await sleep(opts.wait ?? 90)
  }
  const profile = join(tmpdir(), tag + port)
  const close = () => { try { ws.close() } catch {} ; try { execSync('taskkill /PID ' + chrome.pid + ' /T /F', { stdio: 'ignore' }) } catch {}; chrome.kill(); setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }) } catch {} }, 2500).unref?.() }
  return { send, js, jsn, key, boot, errs, close, port }
}
