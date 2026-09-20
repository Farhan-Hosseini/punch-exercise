// Photos for the native pack: every raster image a design uses is uploaded to Figma once and referenced by hash.
// node tools/figma-native/images.mjs prep            -> build/figma/native/upload-list.json (files not uploaded yet)
// node tools/figma-native/images.mjs pairs <urls.txt> -> build/figma/native/pairs.json (one submit URL per line, in list order)
// node tools/figma-native/images.mjs apply <results>  -> merges hashes into hashes.json, placed node ids into cleanup.json
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

const ROOT = 'C:/Claude Database/punch-exercise'
const N = join(ROOT, 'build/figma/native')
const [cmd, arg] = process.argv.slice(2)
const readJSON = async (f, d) => { try { return JSON.parse(await readFile(f, 'utf8')) } catch { return d } }
const hashes = await readJSON(join(N, 'hashes.json'), {})

if (cmd === 'prep') {
  await mkdir(join(N, 'data'), { recursive: true })
  const srcs = new Set()
  for (const f of (await readdir(join(N, 'items'))).filter((x) => x.endsWith('.json'))) {
    const p = join(N, 'items', f)
    const tree = JSON.parse(await readFile(p, 'utf8'))
    let changed = false
    const walk = async (n) => {
      for (const fl of n.fl || []) {
        if (fl.k === 'data') {
          // a canvas, drawn by a script: saved as a PNG and referenced like any photo
          const b64 = fl.d.split(',')[1]
          const buf = Buffer.from(b64, 'base64')
          const id = createHash('sha1').update(buf).digest('hex').slice(0, 16)
          await writeFile(join(N, 'data', id + '.png'), buf)
          fl.k = 'img'; fl.src = 'data:' + id; fl.fit = 'cover'; delete fl.d
          changed = true
        }
        if (fl.k === 'img') srcs.add(fl.src)
      }
      for (const k of n.k || []) await walk(k)
    }
    await walk(tree)
    if (changed) await writeFile(p, JSON.stringify(tree))
  }
  const list = []
  for (const s of srcs) {
    if (hashes[s]) continue
    const file = s.startsWith('data:') ? `build/figma/native/data/${s.slice(5)}.png` : 'showcase' + decodeURIComponent(new URL(s).pathname)
    list.push({ src: s, file })
  }
  await writeFile(join(N, 'upload-list.json'), JSON.stringify(list, null, 1))
  console.log('images in use', srcs.size, 'to upload', list.length)
} else if (cmd === 'pairs') {
  const list = await readJSON(join(N, 'upload-list.json'), [])
  const urls = (await readFile(arg, 'utf8')).split(/\s+/).filter((u) => u.startsWith('http'))
  const pairs = urls.map((url, i) => (list[i] ? { file: list[i].file, url, src: list[i].src } : null)).filter(Boolean)
  await writeFile(join(N, 'pairs.json'), JSON.stringify(pairs, null, 1))
  console.log('pairs', pairs.length, 'of', list.length)
} else if (cmd === 'apply') {
  const results = await readJSON(arg, [])
  const pairs = await readJSON(join(N, 'pairs.json'), [])
  const cleanup = await readJSON(join(N, 'cleanup.json'), [])
  let n = 0
  results.forEach((r, i) => { if (r.ok && r.imageHash && pairs[i]) { hashes[pairs[i].src] = r.imageHash; n++; if (r.placedOnNodeId) cleanup.push(r.placedOnNodeId) } })
  await writeFile(join(N, 'hashes.json'), JSON.stringify(hashes, null, 1))
  await writeFile(join(N, 'cleanup.json'), JSON.stringify(cleanup))
  console.log('hashes', Object.keys(hashes).length, 'added', n, 'to clean', cleanup.length)
}
