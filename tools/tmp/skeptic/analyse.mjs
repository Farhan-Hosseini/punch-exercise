import { readFile, writeFile } from 'node:fs/promises'
const D = 'C:/Claude Database/punch-exercise/tools/tmp/skeptic/'
const rules = JSON.parse(await readFile(D + 'rules.json', 'utf8')).filter((r) => r.sel)
const srcAll = await readFile(D + 'src.txt', 'utf8')            // everything, incl. assets/ and orphan parts
const srcShipped = await readFile(D + 'src-shipped.txt', 'utf8') // minus the two orphan parts

const classRe = /\.(-?[_a-zA-Z][\w-]*)/g
// every literal class token that appears in a class attribute or classList call anywhere in source
const inSrc = (txt, c) => txt.includes(c)

// interpolation prefixes that JS actually uses: `foo-${x}` -> prefix "foo-"
const prefixes = [...new Set([...srcAll.matchAll(/([\w-]{2,})\$\{/g)].map((m) => m[1]))]
const suffixes = [...new Set([...srcAll.matchAll(/\}([\w-]{2,})/g)].map((m) => m[1]))]

const byClass = {}, dead = []
for (const r of rules) {
  const classes = [...new Set([...r.sel.matchAll(classRe)].map((m) => m[1]))]
  if (!classes.length) continue
  const missing = classes.filter((c) => !inSrc(srcShipped, c))
  if (!missing.length) continue
  const onlyOrphan = missing.every((c) => inSrc(srcAll, c))
  // could any missing class be assembled by a template literal?
  const constructible = missing.filter((c) => prefixes.some((p) => c.startsWith(p) && p.length >= 3) || suffixes.some((s) => c.endsWith(s) && s.length >= 3))
  dead.push({ ...r, missing, onlyOrphan, constructible })
  for (const c of missing) byClass[c] = (byClass[c] || 0) + r.bytes
}
const A = dead.filter((d) => !d.onlyOrphan)
const B = dead.filter((d) => d.onlyOrphan)
const sum = (a) => a.reduce((x, r) => x + r.bytes, 0)
console.log('rules with a class token that is in NO shipped source :', A.length, 'rules,', sum(A), 'chars of cssText')
console.log('   of those, only findable in the two orphan parts    :', B.length, 'rules,', sum(B))
console.log('   of A, class could be built by a template prefix    :', A.filter((d) => d.constructible.length).length)
console.log('\n-- A rules whose missing class MIGHT be constructible (need hand check) --')
for (const d of A.filter((x) => x.constructible.length).sort((a, b) => b.bytes - a.bytes).slice(0, 25)) console.log(String(d.bytes).padStart(6), d.sheet.padEnd(16), d.sel, ' [', d.constructible.join(' '), ']')
console.log('\n-- distinct missing class names, by bytes (top 60) --')
const list = Object.entries(byClass).sort((a, b) => b[1] - a[1])
list.slice(0, 60).forEach(([c, b]) => console.log(String(b).padStart(6), '.' + c))
console.log('\ndistinct missing class names total:', list.length)
await writeFile(D + 'A.json', JSON.stringify({ A, classes: list }, null, 1))
