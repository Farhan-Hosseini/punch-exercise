import { readFile, readdir, writeFile } from 'node:fs/promises'
// A small, careful CSS scanner: splits into rules with their raw declaration text, aware of comments and strings.
function scan(src, file) {
  const rules = []
  let i = 0, sel = '', buf = '', stack = []
  const line = (pos) => src.slice(0, pos).split('\n').length
  while (i < src.length) {
    const c = src[i]
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; continue }
    if (c === '"' || c === "'") { const q = c; let j = i + 1; while (j < src.length && src[j] !== q) { if (src[j] === '\\') j++; j++ } buf += src.slice(i, j + 1); i = j + 1; continue }
    if (c === '{') { stack.push({ sel: buf.trim(), start: i + 1, line: line(i) }); buf = ''; i++; continue }
    if (c === '}') {
      const top = stack.pop()
      if (top) { const body = src.slice(top.start, i); if (!/^\s*@/.test(top.sel) || /^@(media|supports|container|layer|scope)/.test(top.sel) === false) rules.push({ file, sel: top.sel, line: top.line, body, ctx: stack.map((s) => s.sel).join(' | ') }) }
      buf = ''; i++; continue
    }
    buf += c; i++
  }
  return rules
}
function decls(body) {
  const out = []
  let i = 0, buf = '', depth = 0
  while (i < body.length) {
    const c = body[i]
    if (c === '/' && body[i + 1] === '*') { const e = body.indexOf('*/', i + 2); i = e < 0 ? body.length : e + 2; continue }
    if (c === '"' || c === "'") { const q = c; let j = i + 1; while (j < body.length && body[j] !== q) { if (body[j] === '\\') j++; j++ } buf += body.slice(i, j + 1); i = j + 1; continue }
    if (c === '(') depth++
    if (c === ')') depth--
    if (c === '{') { // a nested block (shouldn't happen for leaf rules) - skip whole
      let d = 1, j = i + 1; while (j < body.length && d) { if (body[j] === '{') d++; else if (body[j] === '}') d--; j++ } buf = ''; i = j; continue
    }
    if (c === ';' && depth === 0) { if (buf.trim()) out.push(buf.trim()); buf = ''; i++; continue }
    buf += c; i++
  }
  if (buf.trim()) out.push(buf.trim())
  return out.map((d) => { const k = d.indexOf(':'); return k < 0 ? null : { prop: d.slice(0, k).trim().toLowerCase(), value: d.slice(k + 1).trim(), raw: d } }).filter(Boolean)
}
const dir = 'tools/tmp/css'
const files = (await readdir(dir)).filter((f) => f.endsWith('.css'))
const dupProps = [], backdropNoPrefix = [], allRules = []
for (const f of files) {
  const src = await readFile(dir + '/' + f, 'utf8')
  const rules = scan(src, f)
  for (const r of rules) {
    if (/^@/.test(r.sel) && !/^@(media|supports|container|layer|scope)/.test(r.sel)) { /* keyframes step etc still fine */ }
    const ds = decls(r.body)
    allRules.push({ ...r, ds })
    const seen = new Map()
    for (const d of ds) {
      if (seen.has(d.prop)) {
        const prev = seen.get(d.prop)
        if (prev.value !== d.value && !/^--/.test(d.prop)) dupProps.push({ file: f, line: r.line, sel: r.sel.replace(/\s+/g, ' ').slice(0, 120), prop: d.prop, first: prev.value.slice(0, 70), second: d.value.slice(0, 70) })
      }
      seen.set(d.prop, d)
    }
    const hasBd = ds.some((d) => d.prop === 'backdrop-filter')
    const hasWk = ds.some((d) => d.prop === '-webkit-backdrop-filter')
    if (hasBd && !hasWk) backdropNoPrefix.push({ file: f, line: r.line, sel: r.sel.replace(/\s+/g, ' ').slice(0, 120), value: ds.find((d) => d.prop === 'backdrop-filter').value.slice(0, 60) })
  }
}
// same selector declared twice in the same file with the same property, different values (later wins silently)
const bySel = new Map()
for (const r of allRules) {
  const key = r.file + '||' + r.ctx + '||' + r.sel.replace(/\s+/g, ' ').trim()
  if (!bySel.has(key)) bySel.set(key, [])
  bySel.get(key).push(r)
}
const sameSelConflicts = []
for (const [key, rs] of bySel) {
  if (rs.length < 2) continue
  if (/^@|keyframes|\d+%|^from$|^to$/.test(rs[0].sel)) continue
  const props = new Map()
  for (const r of rs) for (const d of r.ds) {
    if (/^--/.test(d.prop)) continue
    if (props.has(d.prop) && props.get(d.prop).value !== d.value) sameSelConflicts.push({ file: r.file, sel: r.sel.replace(/\s+/g, ' ').slice(0, 110), ctx: r.ctx.slice(0, 60), prop: d.prop, lineA: props.get(d.prop).line, valA: props.get(d.prop).value.slice(0, 60), lineB: r.line, valB: d.value.slice(0, 60) })
    props.set(d.prop, { value: d.value, line: r.line })
  }
}
const feat = {}
for (const f of files) {
  const src = await readFile(dir + '/' + f, 'utf8')
  for (const [k, re] of Object.entries({ textBox: /text-box\s*:/g, textBoxTrim: /text-box-trim\s*:/g, container: /@container/g, has: /:has\(/g, colorMix: /color-mix\(/g, property: /@property/g, supports: /@supports/g })) {
    const n = (src.match(re) || []).length; if (n) feat[k] = (feat[k] || 0) + n
  }
}
await writeFile('tools/tmp/out-css.json', JSON.stringify({ dupProps, backdropNoPrefix, sameSelConflicts, feat, ruleCount: allRules.length }, null, 1))
console.log('rules scanned', allRules.length)
console.log('DUP PROPS IN ONE BLOCK:', dupProps.length)
for (const d of dupProps.slice(0, 40)) console.log('  ', d.file + ':' + d.line, d.sel, '|', d.prop, ':', d.first, '=>', d.second)
console.log('SAME-SELECTOR CONFLICTS:', sameSelConflicts.length)
for (const d of sameSelConflicts.slice(0, 40)) console.log('  ', d.file, d.sel, '|', d.prop, d.lineA + ':' + d.valA, '=>', d.lineB + ':' + d.valB)
console.log('backdrop-filter without -webkit-:', backdropNoPrefix.length)
for (const d of backdropNoPrefix.slice(0, 25)) console.log('  ', d.file + ':' + d.line, d.sel, '|', d.value)
console.log('FEAT', JSON.stringify(feat))
