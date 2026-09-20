/* Replicates tools/build.mjs processIncludes() exactly (read-only: writes nothing back into showcase/)
   and asks the one question the finding depends on: does the deployed index.html contain a link to ?embed=machine ? */
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join, normalize } from 'node:path'
const ROOT = 'C:/Claude Database/punch-exercise/showcase/'
async function processIncludes(html) {
  for (let depth = 0; depth < 4 && html.includes('<!-- include:'); depth++) {
    const parts = html.split(/<!-- include:([\w/.-]+) -->/)
    for (let i = 1; i < parts.length; i += 2) {
      const inc = normalize(join(ROOT, parts[i]))
      try { parts[i] = await readFile(inc, 'utf8') } catch { parts[i] = `<!-- missing -->` }
    }
    html = parts.join('')
  }
  return html
}
const src = await readFile(join(ROOT, 'index.html'), 'utf8')
const out = await processIncludes(src)
await writeFile('C:/Claude Database/punch-exercise/tools/tmp/skeptic-embed/built-index.html', out, 'utf8')
const lines = out.split('\n')
console.log('expanded bytes        :', out.length)
console.log('occurrences of embed= :', (out.match(/embed=machine/g) || []).length)
lines.forEach((l, i) => { if (/embed=machine/.test(l)) console.log('  line ' + (i + 1) + ': ' + l.trim().slice(0, 140)) })
console.log('href= containing embed:', JSON.stringify((out.match(/href="[^"]*embed[^"]*"/g) || [])))
console.log('src=  containing embed:', JSON.stringify((out.match(/src="[^"]*embed[^"]*"/g) || [])))
console.log('meta robots           :', JSON.stringify((out.match(/<meta[^>]*robots[^>]*>/gi) || [])))
console.log('link canonical        :', JSON.stringify((out.match(/<link[^>]*canonical[^>]*>/gi) || [])))
console.log('inline <script> blocks:', (out.match(/<script(?![^>]*\bsrc=)/g) || []).length)
console.log('external <script src> :', JSON.stringify((out.match(/<script[^>]*\bsrc="[^"]*"/g) || []).map(s => (s.match(/src="([^"]*)"/) || [])[1])))
