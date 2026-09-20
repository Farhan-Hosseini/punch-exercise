// For every selector that never matched, is its class name present ANYWHERE in the shipped source?
// A class that appears in no served HTML and no JS string can never be produced -> the rule is definitively dead.
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
const ROOT = 'C:/Claude Database/punch-exercise/showcase'
const ORPHANS = ['parts/case-run.html', 'parts/case-state.html']

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) { if (!/assets$|node_modules/.test(p)) await walk(p, out) } else out.push(p)
  }
  return out
}
const files = (await walk(ROOT)).filter(p => /\.(html|js)$/.test(p) && !p.replace(/\\/g, '/').includes('/assets/'))
const shipped = [], orphan = []
for (const p of files) {
  const rel = relative(ROOT, p).replace(/\\/g, '/')
  const txt = await readFile(p, 'utf8')
  if (ORPHANS.includes(rel)) orphan.push(txt); else shipped.push(txt)
}
const shippedTxt = shipped.join('\n'), orphanTxt = orphan.join('\n')

const { left } = JSON.parse(await readFile('C:/Claude Database/punch-exercise/tools/tmp/dead-selectors.json', 'utf8'))
const classRe = /\.(-?[_a-zA-Z][\w-]*)/g
const groups = { noSource: [], onlyOrphan: [], present: [] }
for (const r of left) {
  const classes = [...new Set([...r.sel.matchAll(classRe)].map(m => m[1]))]
  if (!classes.length) { groups.present.push({ ...r, why: 'no class token' }); continue }
  const missing = classes.filter(c => !shippedTxt.includes(c))
  const onlyOrphan = missing.filter(c => orphanTxt.includes(c))
  if (missing.length && missing.length === onlyOrphan.length) groups.onlyOrphan.push({ ...r, classes: missing })
  else if (missing.length) groups.noSource.push({ ...r, classes: missing.filter(c => !orphanTxt.includes(c)) })
  else groups.present.push(r)
}
const sum = (a) => a.reduce((x, r) => x + r.bytes, 0)
console.log('never-matched selectors:', left.length, 'bytes', sum(left))
console.log(' A. class appears in NO source at all      :', groups.noSource.length, 'selectors,', sum(groups.noSource), 'bytes')
console.log(' B. class only in the orphaned case parts  :', groups.onlyOrphan.length, 'selectors,', sum(groups.onlyOrphan), 'bytes')
console.log(' C. class does exist in source (transient) :', groups.present.length, 'selectors,', sum(groups.present), 'bytes')
const bySheet = (g) => { const o = {}; for (const r of g) for (const s of r.sheets) o[s] = (o[s] || 0) + r.bytes; return Object.entries(o).sort((a, b) => b[1] - a[1]) }
console.log('\nA by sheet:', JSON.stringify(bySheet(groups.noSource)))
console.log('B by sheet:', JSON.stringify(bySheet(groups.onlyOrphan)))
console.log('\n--- A: top rules whose classes exist nowhere ---')
for (const r of groups.noSource.sort((a, b) => b.bytes - a.bytes).slice(0, 40)) console.log(String(r.bytes).padStart(6), r.sheets.join(',').padEnd(18), r.sel, '   [missing: ' + r.classes.join(' ') + ']')
console.log('\n--- B: rules that only the orphaned parts could ever match ---')
for (const r of groups.onlyOrphan.sort((a, b) => b.bytes - a.bytes).slice(0, 15)) console.log(String(r.bytes).padStart(6), r.sheets.join(',').padEnd(18), r.sel)
// the missing class names, most bytes first
const byClass = {}
for (const r of groups.noSource) for (const c of r.classes) byClass[c] = (byClass[c] || 0) + r.bytes
console.log('\n--- class names that exist in CSS but in no HTML/JS (top 40) ---')
Object.entries(byClass).sort((a, b) => b[1] - a[1]).slice(0, 40).forEach(([c, b]) => console.log(String(b).padStart(6), '.' + c))
