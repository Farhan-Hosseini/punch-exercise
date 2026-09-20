// Delete the reporter's group-A rules from the live CSSOM and see whether the page changes.
import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'pv' + port)}`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 90 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(4000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

const { left } = JSON.parse(await readFile('C:/Claude Database/punch-exercise/tools/tmp/dead-selectors.json', 'utf8'))
// rebuild the reporter's group A exactly (selector strings only)
const { execSync } = await import('node:child_process')
const A = JSON.parse(await readFile('C:/Claude Database/punch-exercise/tools/tmp/skeptic/groupA-sels.json', 'utf8'))

const measure = async (label) => JSON.parse(await js(`JSON.stringify((() => {
  const bar = document.querySelector('.rl-acts-bar')
  const gp = document.querySelector('.pay-mark-gpay')
  const g = (el, ...p) => el ? Object.fromEntries(p.map(k => [k, getComputedStyle(el)[k]])) : null
  const box = (el) => el ? (b => ({ w: Math.round(b.width), h: Math.round(b.height) }))(el.getBoundingClientRect()) : null
  return { label: ${JSON.stringify(label)}, barStyle: g(bar, 'display', 'alignItems', 'height'), barBox: box(bar),
           actBox: box(document.querySelector('.rl-acts-bar .rl-act')),
           gpStyle: g(gp, 'backgroundColor', 'fontFamily', 'fontSize'), gpBox: box(gp) }
})())`))

// phone -> reel, actions design 3 = "bar"; android so the Google Pay mark exists
await js(`window.showcase.mode('mobile'); 1`); await sleep(2000)
await js(`document.querySelector('[data-device="android"]')?.click(); 1`); await sleep(1200)
await js(`window.showcase.sec('phone','reel','actions',3); window.punchApp.go('reel'); 1`); await sleep(1500)
await js(`window.punchApp.go('checkout'); window.showcase.sec('phone','checkout','method',1); 1`); await sleep(900)
await js(`window.punchApp.go('reel'); 1`); await sleep(1200)
const before = await measure('before')

const removed = await js(`(() => {
  const dead = new Set(${JSON.stringify(A)})
  let n = 0
  const strip = (sheet, list) => { for (let i = list.length - 1; i >= 0; i--) { const r = list[i]; if (r.type === 1 && dead.has(r.selectorText)) { list === sheet.cssRules ? sheet.deleteRule(i) : r.parentRule.deleteRule(i); n++ } else if (r.cssRules) strip(sheet, r.cssRules) } }
  for (const s of document.styleSheets) { try { strip(s, s.cssRules) } catch {} }
  return n
})()`)
await sleep(600)
const after = await measure('after')
console.log('group A selectors handed to the page:', A.length, '-> rules deleted from the live CSSOM:', removed)
console.log(JSON.stringify({ before, after }, null, 1))
ws.close(); chrome.kill()
