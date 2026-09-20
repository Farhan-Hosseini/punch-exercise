import { readFile } from 'node:fs/promises'
const R = 'C:/Claude Database/punch-exercise/showcase/'
const css = await readFile(R + 'case-diagrams.css', 'utf8')
const idx = await (await fetch('http://localhost:5770/')).text()
let js = await readFile(R + 'case-diagrams.js', 'utf8')
// cut initState and initRun out of the haystack: they can never run, so class names they mention are not reachable
function cut(src, name) {
  const s = src.indexOf('function ' + name); if (s < 0) return src
  let d = 0, i = src.indexOf('{', s)
  for (; i < src.length; i++) { if (src[i] === '{') d++; else if (src[i] === '}') { d--; if (!d) break } }
  return src.slice(0, s) + src.slice(i + 1)
}
const jsLive = cut(cut(js, 'initState'), 'initRun')
let other = ''
for (const f of ['case.js','app.js','psec.js','ds.js','mobile.js','format.js']) { try { other += await readFile(R + f, 'utf8') } catch {} }
const hay = idx + '\n' + jsLive + '\n' + other

function rules(src) { const out = []; let depth = 0, start = 0, sel = ''
  for (let i = 0; i < src.length; i++) { const c = src[i]
    if (c === '{') { if (depth === 0) { sel = src.slice(start, i); start = i + 1 } depth++ }
    else if (c === '}') { depth--; if (depth === 0) { out.push({ sel: sel.trim(), body: src.slice(start, i), bytes: i - (start - sel.length - 1) }); start = i + 1 } } }
  return out }
const top = rules(css.replace(/\/\*[\s\S]*?\*\//g, ''))
let dead = 0, live = 0, dr = 0, lr = 0; const names = new Set()
function judge(sel, bytes) {
  const cls = [...sel.matchAll(/\.(cd-[\w-]+)/g)].map(m => m[1])
  if (!cls.length) { live += bytes; lr++; return }
  if (cls.some(c => hay.includes(c))) { live += bytes; lr++ } else { dead += bytes; dr++; cls.forEach(c => names.add(c)) }
}
for (const r of top) { if (/^@media|^@supports/.test(r.sel)) { for (const i of rules(r.body)) judge(i.sel, i.bytes) } else if (/^@/.test(r.sel)) { live += r.bytes; lr++ } else judge(r.sel, r.bytes) }
console.log(JSON.stringify({ cssTotal: css.length, deadBytes: dead, liveBytes: live, deadRules: dr, liveRules: lr, deadClassCount: names.size, sample: [...names].slice(0, 22) }, null, 1))
