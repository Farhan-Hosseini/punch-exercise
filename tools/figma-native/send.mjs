// Uploads a mode's carriers to the submit URLs upload_assets gave, in order, and prints the carrier node ids for the
// bootstrap. node tools/figma-native/send.mjs <mode> <uuid> <uuid> ...   (the uuids of the submit URLs, in order)
// Optional: FROM=n starts at the carrier with that index.
import { readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const ROOT = 'C:/Claude Database/punch-exercise'
const N = join(ROOT, 'build/figma/native')
const [mode, ...uuids] = process.argv.slice(2)
const list = JSON.parse(await readFile(join(N, 'carriers', `${mode}.json`), 'utf8'))
const from = Number(process.env.FROM || 0)
const pairs = uuids.map((u, i) => (list[from + i] ? { file: list[from + i].file, url: `https://mcp.figma.com/mcp/upload/${u}/submit?scaleMode=FILL` } : null)).filter(Boolean)
await writeFile(join(N, 'send-pairs.json'), JSON.stringify(pairs))
execFileSync('node', [join(ROOT, 'tools/figma-upload.mjs'), join(N, 'send-pairs.json'), join(N, 'send-results.json')], { stdio: 'inherit' })
const res = JSON.parse(await readFile(join(N, 'send-results.json'), 'utf8'))
console.log(JSON.stringify(res.map((r) => r.placedOnNodeId)))
