import { readFile } from 'node:fs/promises'
const R = 'C:/Claude Database/punch-exercise/showcase/'
const css = await readFile(R + 'case-diagrams.css', 'utf8')
const idx = await (await fetch('http://localhost:5770/')).text()
// every js file's text, to catch classes added at runtime
const jsFiles = ['case-diagrams.js','case.js','app.js','psec.js','ds.js','mobile.js','format.js']
let jsText = ''
for (const f of jsFiles) { try { jsText += await readFile(R + f, 'utf8') } catch {} }
const hay = idx + '\n' + jsText

// split top-level rules, keeping @media blocks' inner rules
function rules(src) {
  const out = []; let depth = 0, start = 0, sel = ''
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (c === '{') { if (depth === 0) { sel = src.slice(start, i); start = i + 1 } depth++ }
    else if (c === '}') { depth--; if (depth === 0) { out.push({ sel: sel.trim(), body: src.slice(start, i), bytes: i - (start - sel.length - 1) }); start = i + 1 } }
  }
  return out
}
const top = rules(css.replace(/\/\*[\s\S]*?\*\//g, ''))
let deadBytes = 0, liveBytes = 0, deadSel = 0, liveSel = 0
const deadNames = new Set()
function judge(sel, bytes) {
  const cls = [...sel.matchAll(/\.(cd-[\w-]+)/g)].map(m => m[1])
  if (!cls.length) { liveBytes += bytes; liveSel++; return }
  const anyLive = cls.some(c => hay.includes(c))
  if (anyLive) { liveBytes += bytes; liveSel++ } else { deadBytes += bytes; deadSel++; cls.forEach(c => deadNames.add(c)) }
}
for (const r of top) {
  if (/^@media|^@supports/.test(r.sel)) { for (const inner of rules(r.body)) judge(inner.sel, inner.bytes) }
  else if (/^@/.test(r.sel)) { liveBytes += r.bytes; liveSel++ }
  else judge(r.sel, r.bytes)
}
console.log(JSON.stringify({ cssTotal: css.length, deadBytes, liveBytes, deadRules: deadSel, liveRules: liveSel, deadClassSample: [...deadNames].slice(0, 25) }, null, 1))

// JS function spans
const js = await readFile(R + 'case-diagrams.js', 'utf8')
for (const name of ['initState','initRun','initGeometry']) {
  const s = js.indexOf('function ' + name)
  if (s < 0) { console.log(name, 'not found'); continue }
  let d = 0, i = js.indexOf('{', s)
  for (; i < js.length; i++) { if (js[i] === '{') d++; else if (js[i] === '}') { d--; if (!d) break } }
  console.log(name, 'bytes =', i - s + 1)
}
console.log('case-diagrams.js total =', js.length)
