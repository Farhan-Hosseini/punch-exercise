// Build script for static deployment (Netlify): processes HTML includes and writes the concatenated CSS files
// that serve-showcase.mjs otherwise generates on the fly (sections.css, mscreens.css, mpages.css).
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../showcase/', import.meta.url))

async function processIncludes(html) {
  for (let depth = 0; depth < 4 && html.includes('<!-- include:'); depth++) {
    const parts = html.split(/<!-- include:([\w/.-]+) -->/)
    for (let i = 1; i < parts.length; i += 2) {
      const inc = normalize(join(ROOT, parts[i]))
      if (inc.startsWith(ROOT)) {
        try {
          parts[i] = await readFile(inc, 'utf8')
        } catch {
          parts[i] = `<!-- missing ${parts[i]} -->`
        }
      } else {
        parts[i] = ''
      }
    }
    html = parts.join('')
  }
  return html
}

async function writeConcatCss() {
  // matches the CONCAT map in tools/serve-showcase.mjs: every design's own CSS file, joined, sorted by name
  const CONCAT = { 'sections.css': 'sections', 'mscreens.css': 'mscreens', 'mpages.css': 'mpages' }
  for (const [out, dir] of Object.entries(CONCAT)) {
    const dirPath = join(ROOT, dir)
    const names = (await readdir(dirPath)).filter((n) => n.endsWith('.css')).sort()
    const body = (await Promise.all(names.map((n) => readFile(join(dirPath, n), 'utf8')))).join('\n')
    await writeFile(join(ROOT, out), body, 'utf8')
    console.log(`✓ ${out} (${names.length} files)`)
  }
}

async function buildFiles() {
  console.log('Writing concatenated CSS...')
  await writeConcatCss()

  console.log('Processing HTML includes...')
  const filepath = join(ROOT, 'index.html')
  let html = await readFile(filepath, 'utf8')
  html = await processIncludes(html)
  await writeFile(filepath, html, 'utf8')
  console.log('✓ index.html')

  console.log('Build complete')
}

buildFiles().catch((err) => { console.error(err); process.exit(1) })
