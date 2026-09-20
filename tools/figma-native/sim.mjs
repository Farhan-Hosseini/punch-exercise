// Lays out every tidied tree the way Figma's auto layout will (padding, gap, alignment, hug, fill, grow, wrap) and
// compares each child's place with the box the browser drew it in. Text is taken at the browser's size, so what this
// reports is the tidy pass's own mistakes, not font differences. node tools/figma-native/sim.mjs [filter] [--list]
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tidy } from './layout.mjs'

const N = 'C:/Claude Database/punch-exercise/build/figma/native/items'
const pat = new RegExp(process.argv[2] || '.')
const TOL = 2.5
const bad = []
let frames = 0

// the size a node ends up at: a hugging frame measures its content, anything else keeps its box
function size(n) {
  if (n.t !== 'f' || !n.al || !n.k) return [n.w, n.h]
  const a = n.al, kids = n.k.filter((k) => !k.ab)
  const [pt, pr, pb, pl] = a.pad
  const sz = kids.map((k) => size(k))
  const P = a.m === 'H' ? 0 : 1, C = 1 - P
  let w = n.w, h = n.h
  if (a.hugP && !a.wrap) {
    const content = sz.reduce((s, x) => s + x[P], 0) + a.gap * Math.max(0, kids.length - 1)
    const v = content + (a.m === 'H' ? pl + pr : pt + pb)
    if (a.m === 'H' && n.fill !== 'h') w = v; if (a.m === 'V' && n.fill !== 'v') h = v
  }
  if (a.hugC && !a.wrap) {
    const v = Math.max(0, ...sz.map((x) => x[C])) + (a.m === 'H' ? pt + pb : pl + pr)
    if (a.m === 'H' && n.fill !== 'v') h = v; if (a.m === 'V' && n.fill !== 'h') w = v
  }
  return [w, h]
}

function check(n, path, file) {
  for (const k of n.k || []) check(k, path + '/' + (k.n || k.t), file)
  if (n.t !== 'f' || !n.al) return
  if (!n.k) { bad.push({ off: 999, file, path: path + ' (layout without children)' }); return }
  frames++
  const a = n.al, kids = n.k.filter((k) => !k.ab)
  const [W, H] = size(n)
  const [pt, pr, pb, pl] = a.pad
  const H_ = a.m === 'H'
  const inner = H_ ? W - pl - pr : H - pt - pb
  const innerC = H_ ? H - pt - pb : W - pl - pr
  const sz = kids.map((k) => {
    let [w, h] = size(k)
    if (k.fill === 'h') w = H_ ? w : innerC
    if (k.fill === 'v') h = H_ ? innerC : h
    return [w, h]
  })
  const P = H_ ? 0 : 1, C = 1 - P
  if (a.wrap != null) {
    // rows, filled until the next child does not fit
    let x = pl, y = pt, rowH = 0
    kids.forEach((k, i) => {
      const [w, h] = sz[i]
      if (x > pl && x + w > W - pr + 0.01) { x = pl; y += rowH + a.wrap; rowH = 0 }
      report(k, x, y, path, file)
      x += w + a.gap; rowH = Math.max(rowH, h)
    })
    return
  }
  const grow = kids.filter((k) => k.grow)
  const fixed = sz.reduce((s, x, i) => s + (kids[i].grow ? 0 : x[P]), 0) + a.gap * Math.max(0, kids.length - 1)
  if (grow.length) { const each = Math.max(0, inner - fixed) / grow.length; kids.forEach((k, i) => { if (k.grow) sz[i][P] = each }) }
  const content = sz.reduce((s, x) => s + x[P], 0) + a.gap * Math.max(0, kids.length - 1)
  let pos = (H_ ? pl : pt), gap = a.gap
  if (a.pa === 'CENTER') pos += (inner - content) / 2
  else if (a.pa === 'MAX') pos += inner - content
  else if (a.pa === 'SPACE_BETWEEN' && kids.length > 1) gap = (inner - (content - a.gap * (kids.length - 1))) / (kids.length - 1)
  kids.forEach((k, i) => {
    const s = sz[i]
    const cLead = H_ ? pt : pl
    let c = cLead
    if (a.ca === 'CENTER') c = cLead + (innerC - s[C]) / 2
    else if (a.ca === 'MAX') c = cLead + innerC - s[C]
    else if (a.ca === 'BASELINE') c = null
    report(k, H_ ? pos : c, H_ ? c : pos, path, file)
    pos += s[P] + gap
  })
}
function report(k, x, y, path, file) {
  const dx = x == null ? 0 : Math.abs(x - k.x), dy = y == null ? 0 : Math.abs(y - k.y)
  if (dx > TOL || dy > TOL) bad.push({ off: Math.round(Math.max(dx, dy)), file, path: path + ' > ' + (k.n || k.t) + (k.runs ? ' "' + k.runs.map((r) => r.s).join('').slice(0, 20) + '"' : '') })
}

const files = (await readdir(N)).filter((f) => f.endsWith('.json') && pat.test(f))
for (const f of files) {
  const t = tidy(JSON.parse(await readFile(join(N, f), 'utf8')))
  check(t, t.n, f)
}
bad.sort((a, b) => b.off - a.off)
console.log('files', files.length, 'auto layout frames', frames, 'children off', bad.length, 'in files', new Set(bad.map((b) => b.file)).size)
for (const b of bad.slice(0, process.argv.includes('--list') ? 200 : 30)) console.log(b.off, b.file, b.path)
