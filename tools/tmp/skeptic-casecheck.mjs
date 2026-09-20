// Exact-case resolver: walk every include marker transitively from showcase/index.html
// and confirm each path exists with EXACT case as readdir reports it (what Linux/Netlify sees).
import { readFile, readdir } from 'node:fs/promises'
import { join, dirname, basename } from 'node:path'
const ROOT = 'C:/Claude Database/punch-exercise/showcase/'
const cache = new Map()
async function listing(dir){ if(!cache.has(dir)) cache.set(dir, await readdir(dir).catch(()=>null)); return cache.get(dir) }
async function existsExact(rel){
  const full = join(ROOT, rel)
  const names = await listing(dirname(full))
  if (!names) return 'NO_DIR'
  return names.includes(basename(full)) ? 'OK' : 'CASE_OR_MISSING'
}
const seen = new Set(); const queue = ['index.html']; let total=0; const bad=[]
while (queue.length){
  const f = queue.shift(); if (seen.has(f)) continue; seen.add(f)
  const txt = await readFile(join(ROOT,f),'utf8').catch(()=>null); if (txt===null) continue
  for (const m of txt.matchAll(/<!-- include:([\w/.-]+) -->/g)){
    total++
    const r = await existsExact(m[1])
    if (r!=='OK') bad.push(`${f} -> ${m[1]} [${r}]`)
    queue.push(m[1])
  }
}
console.log('files walked:', seen.size)
console.log('include markers found (transitive):', total)
console.log('markers with no exact-case file:', bad.length)
bad.forEach(b=>console.log('  BAD', b))
