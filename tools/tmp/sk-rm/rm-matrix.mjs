// independent: what does prefers-reduced-motion report under each launch config?
import { spawn, execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'

const configs = [
  ['A no flag at all',                    []],
  ['B flag=no-preference',                ['--force-prefers-reduced-motion=no-preference']],
  ['C flag=reduce',                       ['--force-prefers-reduced-motion=reduce']],
  ['D bare flag',                         ['--force-prefers-reduced-motion']],
  ['E flag=0',                            ['--force-prefers-reduced-motion=0']],
  ['F flag=false',                        ['--force-prefers-reduced-motion=false']],
]

async function run(label, extra, emulate) {
  const port = 9700 + Math.floor(Math.random() * 250)
  const dir = join(tmpdir(), 'skrm' + port)
  const args = ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    ...extra, `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, '--window-size=1440,900', 'about:blank']
  const ch = spawn(CHROME, args, { stdio: 'ignore' })
  let t
  for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x => x.type === 'page') } catch { await sleep(150) } }
  if (!t) { ch.kill(); return `${label}: NO TARGET` }
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise(r => ws.addEventListener('open', r, { once: true }))
  let id = 0; const pend = new Map()
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
  const send = (m, p = {}) => new Promise(r => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
  const js = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true })).result?.result?.value
  await send('Runtime.enable'); await send('Page.enable')
  await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(2500)
  if (emulate) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: emulate }] })
  const reduce = await js(`matchMedia('(prefers-reduced-motion: reduce)').matches`)
  const nopref = await js(`matchMedia('(prefers-reduced-motion: no-preference)').matches`)
  const ver    = await js(`navigator.userAgent.match(/Chrome\/[\d.]+/)[0]`)
  try { ws.close() } catch {}
  try { execSync('taskkill /PID ' + ch.pid + ' /T /F', { stdio: 'ignore' }) } catch {}
  return `${label.padEnd(34)} reduce=${String(reduce).padEnd(5)} no-preference=${String(nopref).padEnd(5)} ${ver}`
}

for (const [label, extra] of configs) console.log(await run(label, extra, null))
console.log(await run('G no flag + emulate no-preference', [], 'no-preference'))
console.log(await run('H no flag + emulate reduce', [], 'reduce'))
console.log(await run('I flag=no-pref + emulate no-pref', ['--force-prefers-reduced-motion=no-preference'], 'no-preference'))
