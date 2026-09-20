import { open, sleep } from './cdp.mjs'
const MODE = process.argv[2] || 'machine'
const OPEN = process.argv[3] || ''   // '', 'custom', 'brief', 'help', 'case'
const N = Number(process.argv[4] || 120)
const c = await open({ W: 1600, H: 1000, tag: 'tb' })
await c.boot()

const SNAP = `(() => {
  const a = document.activeElement
  if (!a || a === document.body) return { tag: a ? a.tagName : 'none', body: true }
  const path = (e) => { const p = []; while (e && e.nodeType === 1 && p.length < 7) { p.unshift(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.classList && e.classList[0] ? '.' + e.classList[0] : '')); e = e.parentElement } return p.join('>') }
  const cs = getComputedStyle(a)
  const b = a.getBoundingClientRect()
  const inside = (sel) => !!a.closest(sel)
  return {
    tag: a.tagName, id: a.id, cls: (typeof a.className === 'string' ? a.className : ''), path: path(a),
    label: (a.getAttribute('aria-label') || a.textContent || '').split(String.fromCharCode(10)).join(' ').split('  ').join(' ').trim().slice(0, 44),
    outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor,
    shadow: cs.boxShadow.slice(0, 80), bg: cs.backgroundColor, bd: cs.borderColor + ' ' + cs.borderWidth,
    rect: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)],
    onScreen: b.width > 0 && b.height > 0 && b.bottom > -2 && b.top < innerHeight + 2 && b.right > -2 && b.left < innerWidth + 2,
    inTopbar: inside('.topbar'), inCustom: inside('#custom'), inCase: inside('#case'), inBrief: inside('#brief'), inHelp: inside('#help'),
    inStage: inside('#stage'), inPhone: inside('#phoneStage'), inDs: inside('#dsStage'),
    tabindex: a.getAttribute('tabindex')
  }
})()`

await c.js(`window.showcase.mode('${MODE}'); 1`); await sleep(2500)
if (OPEN === 'custom') { await c.js(`document.getElementById('openCustom').click(); 1`); await sleep(1200) }
if (OPEN === 'brief') { await c.js(`document.getElementById('openBrief').click(); 1`); await sleep(2500) }
if (OPEN === 'help') { await c.js(`document.getElementById('openHelp').click(); 1`); await sleep(2500) }
if (OPEN === 'case') { await c.js(`document.getElementById('openCase').click(); 1`); await sleep(4000) }
// start from a clean slate
await c.js(`document.activeElement && document.activeElement.blur && document.activeElement.blur(); document.body.focus && 1`)

const seq = []
for (let i = 0; i < N; i++) {
  await c.key('Tab', { wait: 55 })
  const s = await c.jsn(SNAP)
  seq.push(s)
}
const key = (s) => (s.body ? 'BODY' : s.path + '|' + s.label)
// find the cycle
const first = key(seq[0])
let cycle = seq.length
for (let i = 1; i < seq.length; i++) if (key(seq[i]) === first) { cycle = i; break }
console.log(JSON.stringify({ mode: MODE, open: OPEN, cycleLength: cycle, uniq: new Set(seq.map(key)).size }, null, 0))
const shown = seq.slice(0, Math.min(cycle, N))
console.log(shown.map((s, i) => `${String(i).padStart(3)} ${s.body ? '[BODY]' : ''}${key(s)}  out=${s.outline} on=${s.onScreen} ti=${s.tabindex} where=${['topbar','custom','case','brief','help','stage','phone','ds'].filter(w => s['in' + w[0].toUpperCase() + w.slice(1)]).join(',')}`).join('\n'))
console.log('ERRORS', JSON.stringify(c.errs.slice(0, 6)))
c.close()
