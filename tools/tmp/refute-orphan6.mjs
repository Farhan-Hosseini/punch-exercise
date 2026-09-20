import { readFile } from 'node:fs/promises'
const R = 'C:/Claude Database/punch-exercise/showcase/'
const idx = await (await fetch('http://localhost:5770/')).text()
const names = ['cd-state','cd-run','cd-flow-arrow','cd-dot','cd-spot','cd-bar-fill','cd-n-ring','cd-brk','cd-node','cd-edge','cd-trail','cd-btn','cd-cap','cd-geometry']
const geom = await readFile(R + 'parts/case-geometry.html','utf8')
const run = await readFile(R + 'parts/case-run.html','utf8')
const state = await readFile(R + 'parts/case-state.html','utf8')
const jsAll = await readFile(R + 'case-diagrams.js','utf8')
console.log('class'.padEnd(16),'servedIdx','geometry','run','state','js')
for (const n of names) {
  console.log(n.padEnd(16), String(idx.includes(n)).padEnd(9), String(geom.includes(n)).padEnd(8), String(run.includes(n)).padEnd(4), String(state.includes(n)).padEnd(5), jsAll.includes(n))
}
