import { readFile } from 'node:fs/promises'
const ORDER = ['styles.css', 'sections.css', 'mscreens.css', 'qr.css', 'mobile.css', 'mpages.css', 'nav.css', 'pay.css', 'ds.css', 'brief.css', 'case.css', 'anim.css']
function scan(src, file) {
  const rules = []; let i = 0, buf = '', stack = []
  const lineOf = (pos) => src.slice(0, pos).split('\n').length
  while (i < src.length) {
    const c = src[i]
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; continue }
    if (c === '"' || c === "'") { const q = c; let j = i + 1; while (j < src.length && src[j] !== q) { if (src[j] === '\\') j++; j++ } buf += src.slice(i, j + 1); i = j + 1; continue }
    if (c === '{') { stack.push({ sel: buf.trim(), start: i + 1, line: lineOf(i) }); buf = ''; i++; continue }
    if (c === '}') { const top = stack.pop(); if (top) rules.push({ file, sel: top.sel, line: top.line, body: src.slice(top.start, i), ctx: stack.map((s) => s.sel).join('|') }); buf = ''; i++; continue }
    buf += c; i++
  }
  return rules.filter((r) => !/^@/.test(r.sel) && !/\{/.test(r.body))
}
function decls(body) {
  const out = []; let i = 0, buf = '', d = 0
  while (i < body.length) {
    const c = body[i]
    if (c === '/' && body[i + 1] === '*') { const e = body.indexOf('*/', i + 2); i = e < 0 ? body.length : e + 2; continue }
    if (c === '"' || c === "'") { const q = c; let j = i + 1; while (j < body.length && body[j] !== q) { if (body[j] === '\\') j++; j++ } buf += body.slice(i, j + 1); i = j + 1; continue }
    if (c === '(') d++; if (c === ')') d--
    if (c === ';' && d === 0) { if (buf.trim()) out.push(buf.trim()); buf = ''; i++; continue }
    buf += c; i++
  }
  if (buf.trim()) out.push(buf.trim())
  return out.map((s) => { const k = s.indexOf(':'); return k < 0 ? null : { prop: s.slice(0, k).trim().toLowerCase(), value: s.slice(k + 1).trim() } }).filter(Boolean)
}
const map = new Map()
for (const f of ORDER) {
  const src = await readFile('tools/tmp/css/' + f, 'utf8')
  for (const r of scan(src, f)) {
    if (r.ctx) continue // top-level rules only: a media/container context is a deliberate override
    const key = r.sel.replace(/\s+/g, ' ').trim()
    if (!key || /%$|^from$|^to$/.test(key)) continue
    for (const d of decls(r.body)) {
      if (/^--/.test(d.prop)) continue
      const k = key + ' ## ' + d.prop
      if (!map.has(k)) map.set(k, [])
      map.get(k).push({ file: f, line: r.line, value: d.value, imp: /!important/.test(d.value) })
    }
  }
}
const cross = []
for (const [k, hits] of map) {
  if (hits.length < 2) continue
  const files = new Set(hits.map((h) => h.file))
  if (files.size < 2) continue
  const vals = new Set(hits.map((h) => h.value))
  if (vals.size < 2) continue
  cross.push({ key: k, hits })
}
console.log('CROSS-FILE SAME-SELECTOR SAME-PROPERTY CONFLICTS:', cross.length)
for (const c of cross.slice(0, 30)) {
  console.log(' ', c.key)
  for (const h of c.hits) console.log('     ', h.file + ':' + h.line, '=', h.value.slice(0, 64), h.imp ? '!IMPORTANT' : '')
}
