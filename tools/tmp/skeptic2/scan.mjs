import { readdirSync, statSync, readFileSync } from 'node:fs'
import { join, relative, basename, extname, sep as SEP } from 'node:path'
const ROOT = 'C:/Claude Database/punch-exercise/showcase'
const walk = (d, out = []) => { for (const n of readdirSync(d)) { const p = join(d, n); const s = statSync(p); s.isDirectory() ? walk(p, out) : out.push(p) } return out }
const all = walk(ROOT).map(p => p.split(SEP).join('/'))
const assets = all.filter(p => p.includes('/assets/'))
// every text file OUTSIDE assets = the site's code
const codeExt = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.txt', '.md'])
const code = all.filter(p => !p.includes('/assets/') && codeExt.has(extname(p)))
// plus manifests inside assets
const manifests = assets.filter(p => p.endsWith('manifest.json'))
// plus every text file inside assets EXCEPT howto/src (so we can test howto/src independently)
const assetText = assets.filter(p => codeExt.has(extname(p)) && !p.includes('/assets/howto/src/'))
const corpusFiles = [...new Set([...code, ...manifests, ...assetText])]
let corpus = corpusFiles.map(p => { try { return readFileSync(p, 'utf8') } catch { return '' } }).join('\n\u0000\n')
// also the repo's tools/ so we can report "referenced by tooling only"
const TOOLS = 'C:/Claude Database/punch-exercise/tools'
const toolFiles = walk(TOOLS).map(p => p.split(SEP).join('/')).filter(p => !p.includes('/tmp/') && codeExt.has(extname(p)))
const toolCorpus = toolFiles.map(p => { try { return readFileSync(p, 'utf8') } catch { return '' } }).join('\n')

const runtimeDirs = ['assets/ds/bg/', 'assets/app/avatars/', 'assets/app/feed/', 'assets/photos/lib/', 'assets/ds/photos/', 'assets/video/lib/']
const binExt = new Set(['.png','.jpg','.jpeg','.webp','.svg','.mp4','.webm','.woff','.woff2','.gif','.avif','.mp3','.json','.html','.css','.js','.mjs'])
const res = []
for (const p of assets) {
  const rel = relative(ROOT, p).split(SEP).join('/')
  if (runtimeDirs.some(d => rel.startsWith(d))) continue
  const base = basename(rel)
  const stem = base.replace(/\.[^.]+$/, '')
  const hit = corpus.includes(rel) || corpus.includes(base) || (stem.length > 3 && corpus.includes(stem))
  if (!hit) {
    const t = toolCorpus.includes(rel) || toolCorpus.includes(base) || (stem.length > 3 && toolCorpus.includes(stem))
    res.push({ rel, size: statSync(p).size, tool: t })
  }
}
res.sort((a,b)=>b.size-a.size)
const total = res.reduce((s,r)=>s+r.size,0)
console.log(`UNREFERENCED: ${res.length} files, ${total} B`)
const byDir = {}
for (const r of res) { const d = r.rel.split('/').slice(0,-1).join('/'); byDir[d] = (byDir[d]||0) + r.size }
for (const [d,s] of Object.entries(byDir).sort((a,b)=>b[1]-a[1])) console.log(`  ${d}  ${s}`)
console.log('--- top 30 ---')
for (const r of res.slice(0,30)) console.log(`${String(r.size).padStart(9)}  ${r.tool?'TOOLREF':'       '}  ${r.rel}`)
console.log('--- all names ---')
console.log(res.map(r=>r.rel).join('\n'))
