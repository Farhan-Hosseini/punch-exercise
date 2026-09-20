import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, basename, dirname } from 'node:path'
const ROOT = 'C:/Claude Database/punch-exercise/showcase'
const CONSTRUCTED = ['assets/ds/bg', 'assets/app/avatars', 'assets/app/feed', 'assets/photos/lib', 'assets/ds/photos', 'assets/video/lib']
const slash = (p) => p.split('\\').join('/')
async function walk(d, o = []) { for (const e of await readdir(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) await walk(p, o); else o.push(p) } return o }
const all = await walk(ROOT)
const assets = all.filter(p => slash(p).includes('/assets/'))
const source = all.filter(p => /\.(html|css|js|mjs|json)$/.test(p) && !slash(p).includes('/assets/'))
const manifests = assets.filter(p => p.endsWith('manifest.json'))
const text = (await Promise.all([...source, ...manifests].map(p => readFile(p, 'utf8')))).join('\n')
const byDir = {}, dead = []
for (const p of assets) {
  const rel = slash(relative(ROOT, p)), dir = slash(dirname(rel))
  if (basename(p) === 'manifest.json') continue
  if (CONSTRUCTED.some(c => dir === c || dir.startsWith(c + '/'))) continue
  const b = basename(p), noExt = b.replace(/\.[^.]+$/, '')
  if (text.includes(rel) || text.includes(b) || text.includes(noExt)) continue
  const s = (await stat(p)).size
  dead.push({ rel, size: s }); byDir[dir] = (byDir[dir] || 0) + s
}
dead.sort((a, b) => b.size - a.size)
console.log('unreferenced (excluding runtime-constructed dirs):', dead.length, 'files,', dead.reduce((a, d) => a + d.size, 0), 'bytes')
console.log('\nby directory:'); Object.entries(byDir).sort((a, b) => b[1] - a[1]).forEach(([d, b]) => console.log(String(b).padStart(9), d))
console.log('\nall:'); dead.forEach(d => console.log(String(d.size).padStart(9), d.rel))
