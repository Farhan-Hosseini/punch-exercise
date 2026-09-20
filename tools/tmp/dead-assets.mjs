// Which files under showcase/assets is nothing referencing?
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, basename } from 'node:path'
const ROOT = 'C:/Claude Database/punch-exercise/showcase'

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) await walk(p, out); else out.push(p)
  }
  return out
}

const all = await walk(ROOT)
const assets = all.filter(p => p.replace(/\\/g, '/').includes('/assets/'))
const source = all.filter(p => /\.(html|css|js|mjs|json)$/.test(p) && !p.replace(/\\/g, '/').includes('/assets/'))
// plus the two manifests (json under assets) count as source that references things
const manifests = assets.filter(p => p.endsWith('manifest.json'))
const text = (await Promise.all([...source, ...manifests].map(p => readFile(p, 'utf8')))).join('\n')

const dead = []
for (const p of assets) {
  const rel = relative(ROOT, p).replace(/\\/g, '/')
  const b = basename(p)
  if (b === 'manifest.json') continue
  const noExt = b.replace(/\.[^.]+$/, '')
  if (text.includes(rel) || text.includes(b) || text.includes(noExt)) continue
  dead.push({ rel, size: (await stat(p)).size })
}
dead.sort((a, b) => b.size - a.size)
console.log('assets files:', assets.length, 'never-mentioned:', dead.length, 'bytes:', dead.reduce((a, d) => a + d.size, 0))
for (const d of dead.slice(0, 60)) console.log(String(d.size).padStart(9), d.rel)
// also: how many lib photos / videos does the manifest list vs how many exist
const photoDir = join(ROOT, 'assets/photos/lib')
const photoFiles = (await readdir(photoDir)).filter(n => /\.(jpg|webp|png)$/.test(n))
const pm = JSON.parse(await readFile(join(photoDir, 'manifest.json'), 'utf8'))
console.log('\nphotos/lib files on disk:', photoFiles.length, ' manifest entries:', pm.length)
const inManifest = new Set(pm.map(e => e.file))
console.log('on disk but not in manifest:', photoFiles.filter(n => !inManifest.has(n)).length)
console.log('in manifest but missing on disk:', pm.map(e => e.file).filter(n => !photoFiles.includes(n)))
const vDir = join(ROOT, 'assets/video/lib')
const vFiles = await readdir(vDir)
const vm = JSON.parse(await readFile(join(vDir, 'manifest.json'), 'utf8'))
console.log('video/lib files:', vFiles.length, 'manifest entries:', vm.length)
