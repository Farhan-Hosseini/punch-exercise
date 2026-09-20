// POSTs local images to the single-use upload URLs that the Figma MCP's upload_assets returns, eight at a time.
// node tools/figma-upload.mjs pairs.json [results.json]
// pairs.json: [{ "file": "build/figma/cap/machine/default/topad-0.png", "url": "https://mcp.figma.com/mcp/upload/.../submit?scaleMode=FILL" }, ...]
// Paths are relative to the project root (C:/Claude Database/punch-exercise) or absolute. Prints and writes each result:
// { file, ok, imageHash, placedOnNodeId, error }. The image hash can be reused in use_figma as an IMAGE fill on any node.
import { readFile, writeFile } from 'node:fs/promises'
import { basename, extname, isAbsolute, join } from 'node:path'

const ROOT = 'C:/Claude Database/punch-exercise'
const [pairsFile, outFile] = process.argv.slice(2)
const pairs = JSON.parse(await readFile(pairsFile, 'utf8'))
const TYPE = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' }
const results = new Array(pairs.length)

async function one(k) {
  const { file, url } = pairs[k]
  const path = isAbsolute(file) ? file : join(ROOT, file)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const bytes = await readFile(path)
      const form = new FormData()
      form.append('file', new Blob([bytes], { type: TYPE[extname(path).toLowerCase()] || 'application/octet-stream' }), basename(path))
      const r = await fetch(url, { method: 'POST', body: form })
      const text = await r.text()
      let j = {}
      try { j = JSON.parse(text) } catch { j = { raw: text.slice(0, 200) } }
      if (!r.ok || j.success === false) throw new Error(`${r.status} ${text.slice(0, 200)}`)
      results[k] = { file, ok: true, imageHash: j.imageHash, placedOnNodeId: j.placedOnNodeId, nodeId: j.nodeId, sizeBytes: j.sizeBytes, raw: j.imageHash ? undefined : j }
      return
    } catch (e) {
      if (attempt === 3) results[k] = { file, ok: false, error: String(e.message || e) }
      else await new Promise((r) => setTimeout(r, 800 * attempt))
    }
  }
}
let next = 0
await Promise.all(Array.from({ length: 8 }, async () => { while (next < pairs.length) await one(next++) }))
const bad = results.filter((r) => !r.ok)
if (outFile) await writeFile(outFile, JSON.stringify(results, null, 1))
console.log(JSON.stringify({ uploaded: results.length - bad.length, failed: bad.length, failures: bad.slice(0, 5) }))
