// Build script for static deployment (Netlify): processes HTML includes and writes the concatenated CSS files
// that serve-showcase.mjs otherwise generates on the fly (sections.css, mscreens.css, mpages.css).
//
// It expands showcase/index.html over itself, which is what a static host needs and what the source must never be
// left as: the include markers are the only copy of where each part goes. So it only writes with --in-place, which
// netlify.toml passes and a local run does not.
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../showcase/', import.meta.url))

async function processIncludes(html) {
  for (let depth = 0; depth < 4 && html.includes('<!-- include:'); depth++) {
    const parts = html.split(/<!-- include:([\w/.-]+) -->/)
    for (let i = 1; i < parts.length; i += 2) {
      const inc = normalize(join(ROOT, parts[i]))
      if (!inc.startsWith(ROOT)) throw new Error(`include escapes the showcase folder: ${parts[i]}`)
      // a part that cannot be read used to become an HTML comment and the build still exited 0, so a deploy could
      // go out with a hole in the page and Netlify would call it green
      parts[i] = await readFile(inc, 'utf8')
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
  const inPlace = process.argv.includes('--in-place')
  console.log('Writing concatenated CSS...')
  await writeConcatCss()

  console.log('Processing HTML includes...')
  const filepath = join(ROOT, 'index.html')
  let html = await readFile(filepath, 'utf8')
  const marks = (html.match(/<!-- include:/g) || []).length
  html = await processIncludes(html)
  if (!inPlace) {
    console.log(`! index.html left alone: expanding it here would drop its ${marks} include markers.`)
    console.log('  Pass --in-place to write the expanded file (netlify.toml does).')
    return
  }
  await writeFile(filepath, html, 'utf8')
  console.log(`✓ index.html (${marks} includes expanded)`)

  console.log('Build complete')
}

buildFiles().catch((err) => { console.error(err); process.exit(1) })
