// Build script to process HTML includes for static deployment
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../showcase/', import.meta.url))

async function processIncludes(html, file) {
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

async function buildFiles() {
  console.log('Processing HTML includes...')
  const htmlFiles = [
    'index.html'
  ]

  for (const filename of htmlFiles) {
    const filepath = join(ROOT, filename)
    console.log(`Processing ${filename}...`)
    try {
      let html = await readFile(filepath, 'utf8')
      html = await processIncludes(html, filepath)
      await writeFile(filepath, html, 'utf8')
      console.log(`✓ ${filename}`)
    } catch (err) {
      console.error(`✗ ${filename}: ${err.message}`)
    }
  }
  console.log('Build complete')
}

buildFiles()
