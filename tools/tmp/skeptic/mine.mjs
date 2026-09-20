// Independent re-derivation: classes named in served CSS that appear in NO shipped html/js.
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
const ROOT = 'C:/Claude Database/punch-exercise/showcase'
const slash = (p) => p.split('\\').join('/')
async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) { if (!/node_modules/.test(p)) await walk(p, out) } else out.push(p)
  }
  return out
}
const all = (await walk(ROOT)).map(slash)
const rel = (p) => slash(relative(ROOT, p))
// every source the browser could ever execute or render, INCLUDING assets/ and the orphan parts
const srcFiles = all.filter((p) => /\.(html|js|mjs|svg|json)$/.test(p))
let srcAll = '', srcShipped = ''
const ORPHANS = ['parts/case-run.html', 'parts/case-state.html']
for (const p of srcFiles) {
  const t = await readFile(p, 'utf8')
  srcAll += '\n' + t
  if (!ORPHANS.includes(rel(p))) srcShipped += '\n' + t
}
for (const p of (await walk('C:/Claude Database/punch-exercise/tools')).map(slash).filter((p) => /\.(mjs|js|html)$/.test(p) && !p.includes('/tmp/'))) srcAll += '\n' + (await readFile(p, 'utf8'))

// CSS exactly as the browser gets it
const idx = await readFile(join(ROOT, 'index.html'), 'utf8')
const links = [...idx.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1])
const caseHtml = await readFile(join(ROOT, 'parts/case.html'), 'utf8')
for (const m of caseHtml.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)) links.push(m[1])
const CONCAT = { 'sections.css': 'sections', 'mscreens.css': 'mscreens', 'mpages.css': 'mpages' }
const sheets = {}
for (const l of links) {
  if (CONCAT[l]) {
    const dir = join(ROOT, CONCAT[l])
    const names = (await readdir(dir)).filter((n) => n.endsWith('.css')).sort()
    sheets[l] = (await Promise.all(names.map((n) => readFile(join(dir, n), 'utf8')))).join('\n')
  } else sheets[l] = await readFile(join(ROOT, l), 'utf8')
}
const totalBytes = Object.values(sheets).reduce((a, s) => a + Buffer.byteLength(s), 0)
console.log('sheets:', links.join(' '))
console.log('total CSS bytes on a cold load:', totalBytes)
await writeFile('C:/Claude Database/punch-exercise/tools/tmp/skeptic/sheets.json', JSON.stringify(sheets))
await writeFile('C:/Claude Database/punch-exercise/tools/tmp/skeptic/src.txt', srcAll)
await writeFile('C:/Claude Database/punch-exercise/tools/tmp/skeptic/src-shipped.txt', srcShipped)
