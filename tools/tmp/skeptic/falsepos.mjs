// Re-run the reporter's own grouping, then intersect group A with the classes I observed live.
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
const ROOT = 'C:/Claude Database/punch-exercise/showcase'
const slash = (p) => p.split('\\').join('/')
const ORPHANS = ['parts/case-run.html', 'parts/case-state.html']
async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) { if (!/assets$|node_modules/.test(p)) await walk(p, out) } else out.push(p)
  }
  return out
}
const files = (await walk(ROOT)).filter((p) => /\.(html|js)$/.test(p) && !slash(p).includes('/assets/'))
let shipped = '', orphan = ''
for (const p of files) {
  const rel = slash(relative(ROOT, p)); const txt = await readFile(p, 'utf8')
  if (ORPHANS.includes(rel)) orphan += '\n' + txt; else shipped += '\n' + txt
}
const { left } = JSON.parse(await readFile('C:/Claude Database/punch-exercise/tools/tmp/dead-selectors.json', 'utf8'))
const classRe = /\.(-?[_a-zA-Z][\w-]*)/g
const A = []
for (const r of left) {
  const classes = [...new Set([...r.sel.matchAll(classRe)].map((m) => m[1]))]
  if (!classes.length) continue
  const missing = classes.filter((c) => !shipped.includes(c))
  const onlyOrphan = missing.filter((c) => orphan.includes(c))
  if (missing.length && missing.length !== onlyOrphan.length) A.push({ ...r, classes: missing.filter((c) => !orphan.includes(c)) })
}
const live = Object.keys(JSON.parse(await readFile('C:/Claude Database/punch-exercise/tools/tmp/skeptic/live.json', 'utf8')))
const sum = (a) => a.reduce((x, r) => x + r.bytes, 0)
const bad = A.filter((r) => r.classes.some((c) => live.includes(c)))
console.log('reporter group A                        :', A.length, 'selectors,', sum(A), 'bytes')
console.log('of those, naming a class I saw IN THE DOM:', bad.length, 'selectors,', sum(bad), 'bytes')
for (const r of bad.sort((a, b) => b.bytes - a.bytes)) console.log(String(r.bytes).padStart(5), r.sheets.join(','), r.sel, '  [claimed missing:', r.classes.join(' ') + ']')
