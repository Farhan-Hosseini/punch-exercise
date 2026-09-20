import { readdirSync, statSync, readFileSync } from 'node:fs'
import { join, relative, extname } from 'node:path'
const ROOT = 'C:/Claude Database/punch-exercise/showcase'
const slash = (p) => relative(ROOT, p).split('\\').join('/')
function walk(d, out = []) { for (const n of readdirSync(d)) { const p = join(d, n); const s = statSync(p); s.isDirectory() ? walk(p, out) : out.push(p) } return out }
const all = walk(ROOT)
const SRC_EXT = new Set(['.html', '.js', '.css', '.json', '.mjs'])
const srcFiles = all.filter((p) => SRC_EXT.has(extname(p)) && !slash(p).startsWith('assets/'))
const manifests = all.filter((p) => p.endsWith('manifest.json'))
let corpus = ''
for (const f of [...srcFiles, ...manifests]) corpus += readFileSync(f, 'utf8') + '\n'
console.log('source files scanned:', srcFiles.length, '+ manifests', manifests.length, '| corpus bytes', corpus.length)

const assetFiles = all.filter((p) => slash(p).startsWith('assets/'))
let assetBytes = 0
for (const p of assetFiles) assetBytes += statSync(p).size
console.log('asset files:', assetFiles.length, 'bytes', assetBytes)

const unref = []
for (const p of assetFiles) {
  const rel = slash(p)
  const base = rel.split('/').pop()
  const stem = base.replace(/\.[^.]+$/, '')
  if (corpus.includes(base) || corpus.includes(rel) || corpus.includes(stem)) continue
  unref.push([rel, statSync(p).size])
}
unref.sort((a, b) => b[1] - a[1])
const total = unref.reduce((s, x) => s + x[1], 0)
console.log('\nUNREFERENCED (basename/stem/path absent from all source + manifests):', unref.length, 'files,', total, 'bytes')
const byDir = {}
for (const [r, s] of unref) { const d = r.split('/').slice(0, 3).join('/'); byDir[d] = (byDir[d] || 0) + s }
console.log('\nby dir:')
for (const [d, s] of Object.entries(byDir).sort((a, b) => b[1] - a[1])) console.log('  ', s, d)
console.log('\nall unreferenced files:')
for (const [r, s] of unref) console.log('  ', s, r)
