// Prints a tidied node (and two levels below) from one design: node tools/figma-native/peek.mjs <file> <name> [depth]
import { readFile } from 'node:fs/promises'
import { tidy } from './layout.mjs'
const [file, name, depth = 2] = process.argv.slice(2)
const t = tidy(JSON.parse(await readFile('C:/Claude Database/punch-exercise/build/figma/native/items/' + file, 'utf8')))
const find = (n) => { if (n.n === name) return n; for (const k of n.k || []) { const r = find(k); if (r) return r } }
const pr = (n, d = 0) => {
  console.log(' '.repeat(d * 2) + n.t + ' ' + (n.n || '') + (n.runs ? ' "' + n.runs.map((r) => r.s).join('').slice(0, 24) + '"' : '') + ` @${n.x},${n.y} ${n.w}x${n.h}` + (n.ab ? ' AB' : '') + (n.ps ? ' PS' : '') + (n.grow ? ' GROW' : '') + (n.fill ? ' FILL' + n.fill : '') + (n.t === 'f' && n.al ? ' AL ' + JSON.stringify(n.al) : '') + (n.lay ? ' lay ' + JSON.stringify(n.lay) : ''))
  if (d < depth) for (const k of n.k || []) pr(k, d + 1)
}
pr(find(t) || t)
