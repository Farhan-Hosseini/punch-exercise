import { readFile, writeFile } from 'node:fs/promises'
import { join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = fileURLToPath(new URL('../../showcase/', import.meta.url))
async function processIncludes(html) {
  for (let depth = 0; depth < 4 && html.includes('<!-- include:'); depth++) {
    const parts = html.split(/<!-- include:([\w/.-]+) -->/)
    for (let i = 1; i < parts.length; i += 2) {
      const inc = normalize(join(ROOT, parts[i]))
      if (inc.startsWith(ROOT)) {
        try { parts[i] = await readFile(inc, 'utf8') } catch { parts[i] = `<!-- missing ${parts[i]} -->` }
      } else parts[i] = ''
    }
    html = parts.join('')
  }
  return html
}
const src = await readFile(join(ROOT, 'index.html'), 'utf8')
const built = await processIncludes(src)
const outPath = fileURLToPath(new URL('./built-index.html', import.meta.url))
await writeFile(outPath, built, 'utf8')
const bytes = Buffer.byteLength(built, 'utf8')
const comments = built.match(/<!--[\s\S]*?-->/g) || []
const cbytes = comments.reduce((a, c) => a + Buffer.byteLength(c, 'utf8'), 0)
console.log('source bytes      :', Buffer.byteLength(src,'utf8'))
console.log('built  bytes      :', bytes)
console.log('comment count     :', comments.length)
console.log('comment bytes     :', cbytes)
console.log('percent of file   :', (cbytes / bytes * 100).toFixed(2) + '%')
// top 10 longest
comments.map(c=>[Buffer.byteLength(c,'utf8'),c]).sort((a,b)=>b[0]-a[0]).slice(0,8)
  .forEach(([n,c])=>console.log('  ['+n+'] '+c.replace(/\s+/g,' ').slice(0,190)))
console.log('--- comments mentioning docs/ or .md ---')
comments.filter(c=>/docs\//.test(c)||/\.md\b/.test(c)).forEach(c=>console.log('  * '+c.replace(/\s+/g,' ').slice(0,260)))
console.log('--- comments mentioning round/review/client/feedback ---')
const rr = comments.filter(c=>/\bround (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)\b/i.test(c)||/\breview\b/i.test(c)||/\bclient\b/i.test(c))
console.log('  count:', rr.length)
rr.slice(0,14).forEach(c=>console.log('  * '+c.replace(/\s+/g,' ').slice(0,230)))
