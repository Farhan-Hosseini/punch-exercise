import { readdirSync, statSync, readFileSync } from 'node:fs'
import { join, relative, basename } from 'node:path'

const ROOT = 'C:/Claude Database/punch-exercise'
const SHOW = join(ROOT, 'showcase')
const slash = (s) => s.split('\\').join('/')

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else out.push({ p, size: st.size })
  }
  return out
}

const assets = walk(join(SHOW, 'assets'))
const TEXT = /\.(html|js|mjs|css|json|md|svg|txt|toml)$/i
const srcFiles = walk(ROOT).filter((f) => {
  const r = slash(relative(ROOT, f.p))
  if (r.startsWith('node_modules/')) return false
  if (r.startsWith('showcase/assets/')) return false
  if (r.startsWith('build/')) return false
  if (r.startsWith('tools/tmp/')) return false
  return TEXT.test(r)
})
const blob = srcFiles.map((f) => readFileSync(f.p, 'utf8')).join('\n')

const showSrc = srcFiles.filter((f) => slash(relative(ROOT, f.p)).startsWith('showcase/'))
const showBlob = showSrc.map((f) => readFileSync(f.p, 'utf8')).join('\n')

const orphansShow = []
const orphansAll = []
for (const a of assets) {
  const b = basename(a.p)
  const stem = b.replace(/\.[^.]+$/, '')
  if (!showBlob.includes(b) && !showBlob.includes(stem)) orphansShow.push(a)
  if (!blob.includes(b) && !blob.includes(stem)) orphansAll.push(a)
}
const sum = (arr) => arr.reduce((s, a) => s + a.size, 0)
console.log('source text files scanned (showcase only):', showSrc.length, ' whole repo:', srcFiles.length)
console.log('total assets', assets.length, (sum(assets) / 1048576).toFixed(1) + 'MB')
console.log('orphan vs showcase/ sources (basename OR stem):', orphansShow.length, (sum(orphansShow) / 1048576).toFixed(2) + 'MB')
console.log('orphan vs WHOLE repo sources:', orphansAll.length, (sum(orphansAll) / 1048576).toFixed(2) + 'MB')

const orphansBase = assets.filter((a) => !showBlob.includes(basename(a.p)))
console.log('orphan basename-only vs showcase/:', orphansBase.length, (sum(orphansBase) / 1048576).toFixed(2) + 'MB')

console.log('\n--- top 30 orphans (stem-aware, showcase-only blob) ---')
orphansShow
  .sort((x, y) => y.size - x.size)
  .slice(0, 30)
  .forEach((a) => console.log(String(Math.round(a.size / 1024)).padStart(6) + 'K', slash(relative(ROOT, a.p))))
console.log('\n--- orphan counts by dir ---')
const byDir = {}
for (const a of orphansShow) {
  const d = slash(relative(ROOT, a.p)).replace(/\/[^/]*$/, '')
  byDir[d] = (byDir[d] || 0) + 1
}
Object.entries(byDir)
  .sort((a, b) => b[1] - a[1])
  .forEach(([d, c]) => console.log(String(c).padStart(4), d))
