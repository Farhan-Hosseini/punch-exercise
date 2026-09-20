import { readFile, readdir } from 'node:fs/promises'
import { join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = fileURLToPath(new URL('../../showcase/', import.meta.url))
async function processIncludes(html) {
  for (let d = 0; d < 4 && html.includes('<!-- include:'); d++) {
    const parts = html.split(/<!-- include:([\w/.-]+) -->/)
    for (let i = 1; i < parts.length; i += 2) {
      const inc = normalize(join(ROOT, parts[i]))
      if (inc.startsWith(ROOT)) { try { parts[i] = await readFile(inc, 'utf8') } catch { parts[i] = `<!-- missing -->` } } else parts[i] = ''
    }
    html = parts.join('')
  }
  return html
}
const src = await readFile(join(ROOT, 'index.html'), 'utf8')
const out = await processIncludes(src)
const B = (s) => Buffer.byteLength(s, 'utf8')
const dirBytes = async (d, ext) => {
  const names = (await readdir(join(ROOT, d))).filter(n => n.endsWith(ext))
  let n = 0; for (const f of names) n += Buffer.byteLength(await readFile(join(ROOT, d, f), 'utf8'), 'utf8')
  return { files: names.length, bytes: n }
}
console.log(JSON.stringify({
  index_source: B(src), index_expanded: B(out),
  sections_css: await dirBytes('sections', '.css'), sections_html: await dirBytes('sections', '.html'),
  mscreens_css: await dirBytes('mscreens', '.css'), mscreens_js: await dirBytes('mscreens', '.js'),
  mpages_css: await dirBytes('mpages', '.css'), mpages_js: await dirBytes('mpages', '.js'),
  parts_html: await dirBytes('parts', '.html'),
}, null, 1))
