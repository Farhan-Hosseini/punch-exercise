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

const all = walk(SHOW)
const TEXT = /\.(html|js|mjs|css|json|md|txt)$/i
// EVERY text file that ships in showcase/, INCLUDING manifests that live inside assets/
const src = all.filter((f) => TEXT.test(f.p))
const blob = src.map((f) => readFileSync(f.p, 'utf8')).join('\n')

const BIN = /\.(png|jpg|jpeg|webp|gif|svg|mp4|webm|woff2?|ttf|otf|mp3|wav|avif|json)$/i
const assets = all.filter((f) => slash(relative(SHOW, f.p)).startsWith('assets/') && !TEXT.test(f.p))

// prefix-aware: an asset counts as referenced if its full basename appears,
// OR if a prefix of its stem (>=5 chars) appears immediately before a template hole `${`
// i.e. the file is built by concatenation.
function referenced(b) {
  if (blob.includes(b)) return 'literal'
  const stem = b.replace(/\.[^.]+$/, '')
  for (let n = stem.length - 1; n >= 5; n--) {
    const pre = stem.slice(0, n)
    // prefix followed by a template hole
    if (blob.includes(pre + '${')) return 'concat:' + pre + '${'
  }
  // whole stem appears without extension (e.g. manifest stores stem only)
  if (blob.includes(stem)) return 'stem'
  return null
}

const orphans = []
const how = {}
for (const a of assets) {
  const b = basename(a.p)
  const r = referenced(b)
  if (r) how[r.split(':')[0]] = (how[r.split(':')[0]] || 0) + 1
  else orphans.push(a)
}
const sum = (arr) => arr.reduce((s, x) => s + x.size, 0)
console.log('text sources scanned:', src.length)
console.log('binary assets:', assets.length, (sum(assets) / 1048576).toFixed(1) + 'MB')
console.log('referenced by:', how)
console.log('ORPHANS:', orphans.length, (sum(orphans) / 1048576).toFixed(2) + 'MB')
const g = {}
for (const a of orphans.sort((x, y) => y.size - x.size)) {
  const r = slash(relative(SHOW, a.p))
  const d = r.replace(/\/[^/]*$/, '')
  ;(g[d] = g[d] || []).push(basename(r) + ' ' + Math.round(a.size / 1024) + 'K')
}
let out = ''
for (const [d, v] of Object.entries(g)) out += `\n${d} (${v.length}): ` + v.join(' | ')
console.log(out)
