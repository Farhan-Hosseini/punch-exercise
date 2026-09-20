import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9400 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-prefers-reduced-motion=no-preference',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'ah'+port)}`,'--window-size=1600,1000','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0,800)); return r.result?.result?.value }
await send('Runtime.enable'); await send('Page.enable')
await send('Page.navigate', { url: 'about:blank' }); await sleep(400)
const html = await readFile('tools/tmp/served.html', 'utf8')
await send('Runtime.evaluate', { expression: 'window.__SRC = ' + JSON.stringify(html) + '; 1' })

const fn = function () {
  const doc = new DOMParser().parseFromString(window.__SRC, 'text/html')
  const cls = (el) => (el && typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')
  const sig = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + cls(el)
  const path = (el) => { const a = []; let e = el; while (e && e !== doc.body) { a.unshift(sig(e)); e = e.parentElement } return a.join(' > ') }
  const all = [...doc.querySelectorAll('[id]')]
  const byId = {}
  for (const el of all) (byId[el.id] ||= []).push(path(el))
  const dupes = Object.entries(byId).filter(([, v]) => v.length > 1).map(([k, v]) => ({ id: k, count: v.length, where: v }))
  const ids = new Set(Object.keys(byId))
  const dangling = []
  for (const attr of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-activedescendant', 'aria-details', 'aria-errormessage', 'for', 'list', 'headers']) {
    for (const el of doc.querySelectorAll('[' + attr + ']')) {
      const v = (el.getAttribute(attr) || '').trim()
      if (!v) continue
      const toks = attr === 'for' && el.tagName === 'LABEL' ? [v] : v.split(/\s+/)
      for (const tk of toks) if (tk && !ids.has(tk)) dangling.push({ attr, value: tk, on: sig(el), outer: el.outerHTML.slice(0, 180) })
    }
  }
  const INTER = 'a[href],button,input,select,textarea,summary,[tabindex],[role=button],[role=link],[role=tab],[role=checkbox],[role=switch]'
  const nested = []
  for (const el of doc.querySelectorAll(INTER)) {
    const p = el.parentElement && el.parentElement.closest(INTER)
    if (p) nested.push({ inner: sig(el), outer: sig(p), html: p.outerHTML.slice(0, 240) })
  }
  const listBad = []
  for (const l of doc.querySelectorAll('ul,ol')) for (const c of l.children) if (!['LI', 'SCRIPT', 'TEMPLATE'].includes(c.tagName)) listBad.push({ list: path(l), child: c.tagName.toLowerCase(), html: c.outerHTML.slice(0, 160) })
  for (const l of doc.querySelectorAll('dl')) for (const c of l.children) if (!['DT', 'DD', 'DIV', 'SCRIPT', 'TEMPLATE'].includes(c.tagName)) listBad.push({ list: path(l), child: c.tagName.toLowerCase(), html: c.outerHTML.slice(0, 160) })
  const forms = [...doc.querySelectorAll('form')].map((f) => ({ sig: sig(f), nested: !!(f.parentElement && f.parentElement.closest('form')) }))
  const emptyP = [...doc.querySelectorAll('p')].filter((p) => !p.hasChildNodes()).map((p) => path(p))
  const imgsNoDim = [...doc.querySelectorAll('img')].filter((i) => !i.hasAttribute('width') || !i.hasAttribute('height')).map((i) => ({ src: i.getAttribute('src'), sig: sig(i), alt: i.getAttribute('alt') }))
  const imgsNoAlt = [...doc.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).map((i) => ({ src: i.getAttribute('src'), path: path(i) }))
  const vids = [...doc.querySelectorAll('video')].map((v) => ({ src: v.getAttribute('src') || (v.querySelector('source') ? v.querySelector('source').getAttribute('src') : null), w: v.getAttribute('width'), h: v.getAttribute('height'), sig: sig(v), poster: v.getAttribute('poster') }))
  const iframes = [...doc.querySelectorAll('iframe')].map((f) => ({ src: f.getAttribute('src'), title: f.getAttribute('title'), sig: sig(f), html: f.outerHTML.slice(0, 260) }))
  const headings = [...doc.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => ({ tag: h.tagName, text: h.textContent.trim().replace(/\s+/g, ' ').slice(0, 60), path: path(h) }))
  const landmarks = { main: doc.querySelectorAll('main').length, header: doc.querySelectorAll('header').length, nav: doc.querySelectorAll('nav').length, footer: doc.querySelectorAll('footer').length, aside: doc.querySelectorAll('aside').length, section: doc.querySelectorAll('section').length }
  const inputs = [...doc.querySelectorAll('input,select,textarea')].map((i) => ({ sig: sig(i), type: i.getAttribute('type'), labelled: !!(i.id && doc.querySelector('label[for="' + i.id + '"]')) || i.hasAttribute('aria-label') || i.hasAttribute('aria-labelledby') || !!i.closest('label'), path: path(i) }))
  const buttonsNoName = [...doc.querySelectorAll('button')].filter((b) => !b.textContent.trim() && !b.hasAttribute('aria-label') && !b.hasAttribute('aria-labelledby') && !b.hasAttribute('title')).map((b) => ({ sig: sig(b), html: b.outerHTML.slice(0, 160) }))
  const roleTabs = [...doc.querySelectorAll('[role=tab]')].map((t) => ({ sig: sig(t), controls: t.getAttribute('aria-controls'), sel: t.getAttribute('aria-selected') }))
  const tablist = doc.querySelectorAll('[role=tablist]').length
  const tabpanels = [...doc.querySelectorAll('[role=tabpanel]')].map((p) => ({ sig: sig(p), labelledby: p.getAttribute('aria-labelledby') }))
  const ariaHiddenFocusable = [...doc.querySelectorAll('[aria-hidden="true"]')].flatMap((h) => [...h.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].filter((x) => x.getAttribute('tabindex') !== '-1').map((x) => ({ hidden: sig(h), focusable: sig(x) })))
  return { totalIds: all.length, uniqueIds: ids.size, dupes, dangling, nested, listBad, forms, emptyP, imgsNoDim, imgsNoAlt, vids, iframes, headings, landmarks, inputsUnlabelled: inputs.filter((i) => !i.labelled), buttonsNoName, roleTabs, tablist, tabpanels, ariaHiddenFocusable }
}
const out = await js('JSON.stringify((' + fn.toString() + ')())')
await writeFile('tools/tmp/out-html.json', out)
const o = JSON.parse(out)
console.log('ids total', o.totalIds, 'unique', o.uniqueIds)
console.log('DUPES:', o.dupes.length)
for (const d of o.dupes) console.log('  ', d.id, 'x' + d.count)
console.log('DANGLING:', o.dangling.length)
for (const d of o.dangling) console.log('  ', d.attr, '->', d.value, 'on', d.on)
console.log('NESTED INTERACTIVE:', o.nested.length)
console.log('LIST BAD:', o.listBad.length)
console.log('LANDMARKS', JSON.stringify(o.landmarks))
console.log('H1 count', o.headings.filter((h) => h.tag === 'H1').length)
console.log('IFRAMES', JSON.stringify(o.iframes, null, 1))
console.log('VIDEOS', JSON.stringify(o.vids, null, 1))
console.log('imgs no dim', o.imgsNoDim.length, 'imgs no alt', o.imgsNoAlt.length)
console.log('inputs unlabelled', o.inputsUnlabelled.length, 'buttons no name', o.buttonsNoName.length)
console.log('emptyP', o.emptyP.length, 'forms', JSON.stringify(o.forms))
console.log('aria-hidden focusable', o.ariaHiddenFocusable.length)
ws.close(); chrome.kill()
