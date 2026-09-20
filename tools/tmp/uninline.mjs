// tools/build.mjs writes its expanded HTML back over showcase/index.html, which loses the include markers the
// source is authored with. This puts them back: every part file, expanded the same way, swapped for its marker,
// longest first so an outer part collapses before the parts nested inside it are looked for.
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = fileURLToPath(new URL('../../showcase/', import.meta.url))

async function expand(html) {
  for (let depth = 0; depth < 4 && html.includes('<!-- include:'); depth++) {
    const parts = html.split(/<!-- include:([\w/.-]+) -->/)
    for (let i = 1; i < parts.length; i += 2) {
      const inc = normalize(join(ROOT, parts[i]))
      parts[i] = inc.startsWith(ROOT) ? await readFile(inc, 'utf8').catch(() => `<!-- missing ${parts[i]} -->`) : ''
    }
    html = parts.join('')
  }
  return html
}

const expanded = []
for (const dir of ['parts', 'sections']) {
  for (const n of (await readdir(join(ROOT, dir))).filter((x) => x.endsWith('.html'))) {
    expanded.push({ marker: `<!-- include:${dir}/${n} -->`, body: await expand(await readFile(join(ROOT, dir, n), 'utf8')) })
  }
}
expanded.sort((a, b) => b.body.length - a.body.length)

const before = await readFile(join(ROOT, 'index.html'), 'utf8')
const goal = await expand(before)
let html = before
const hit = []
for (const { marker, body } of expanded) {
  const n = html.split(body).length - 1
  if (n) { html = html.split(body).join(marker); hit.push(`${marker} x${n}`) }
}
console.log('collapsed:', hit.length, 'includes')
// round trip: fully expanding what we are about to write must give back exactly what the file expanded to before
const back = await expand(html)
console.log('round trip:', back === goal ? 'identical' : `DIFFERS (${back.length} vs ${goal.length})`)
if (back !== goal) process.exit(1)
await writeFile(join(ROOT, 'index.html'), html, 'utf8')
console.log('index.html restored,', (html.match(/<!-- include:/g) || []).length, 'markers')
