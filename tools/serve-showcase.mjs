// Static server for the result-screen showcase: http://localhost:5770
import { createServer } from 'node:http'
import { readFile, readdir } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../showcase/', import.meta.url))
const PORT = Number(process.env.PORT) || 5770
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.mp4': 'video/mp4', '.gif': 'image/gif', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.webp': 'image/webp',
}

createServer(async (req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0])
  const file = normalize(join(ROOT, path === '/' ? 'index.html' : path))
  if (!file.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) { res.writeHead(403); return res.end() }
  try {
    let body
    const CONCAT = { '/sections.css': 'sections', '/mscreens.css': 'mscreens', '/mpages.css': 'mpages' }
    if (CONCAT[path]) {
      // every result section's designs, every machine screen's styles or every phone page's styles, concatenated
      // fresh on each request (sorted by file name, so _shared.css comes first)
      const dir = join(ROOT, CONCAT[path])
      const names = (await readdir(dir)).filter((n) => n.endsWith('.css')).sort()
      body = Buffer.from((await Promise.all(names.map((n) => readFile(join(dir, n), 'utf8')))).join('\n'))
      res.writeHead(200, { 'content-type': TYPES['.css'], 'cache-control': 'no-store' })
      return res.end(body)
    }
    body = await readFile(file)
    if (extname(file) === '.html') {
      // <!-- include:sections/x.html --> is replaced by that file, so each section lives in its own file
      // includes may include again (a part inside a part), up to four levels deep
      let html = body.toString('utf8')
      for (let depth = 0; depth < 4 && html.includes('<!-- include:'); depth++) {
        const parts = html.split(/<!-- include:([\w/.-]+) -->/)
        for (let i = 1; i < parts.length; i += 2) {
          const inc = normalize(join(ROOT, parts[i]))
          parts[i] = inc.startsWith(ROOT) ? await readFile(inc, 'utf8').catch(() => `<!-- missing ${parts[i]} -->`) : ''
        }
        html = parts.join('')
      }
      body = Buffer.from(html)
    }
    // video answers byte ranges (206), which Safari needs before it will play or seek a clip
    const range = extname(file) === '.mp4' && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '')
    if (range) {
      const size = body.length
      let start = range[1] === '' ? size - Number(range[2]) : Number(range[1])
      let end = range[1] !== '' && range[2] !== '' ? Number(range[2]) : size - 1
      if (!(start >= 0 && start < size && end >= start)) { res.writeHead(416, { 'content-range': `bytes */${size}` }); return res.end() }
      end = Math.min(end, size - 1)
      res.writeHead(206, { 'content-type': 'video/mp4', 'content-range': `bytes ${start}-${end}/${size}`, 'accept-ranges': 'bytes', 'content-length': end - start + 1, 'cache-control': 'no-store' })
      return res.end(body.subarray(start, end + 1))
    }
    const headers = { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }
    if (extname(file) === '.mp4') headers['accept-ranges'] = 'bytes'
    res.writeHead(200, headers)
    res.end(body)
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Not found')
  }
}).listen(PORT, () => console.log(`Punch App result screen on http://localhost:${PORT}`))
