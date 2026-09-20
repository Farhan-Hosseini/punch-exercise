import { readFile } from 'node:fs/promises'
const src = await readFile('tools/tmp/served.html', 'utf8')
// 1. block-level content inside <p> (the HTML parser will auto-close the p and restructure the tree)
const BLOCK = /<(div|p|ul|ol|dl|section|article|aside|header|footer|nav|main|h[1-6]|table|figure|figcaption|form|fieldset|hr|pre|blockquote|address|details|video|iframe)[\s>/]/i
const pBad = []
{
  const re = /<p(\s[^>]*)?>/gi
  let m
  while ((m = re.exec(src))) {
    const start = m.index + m[0].length
    const end = src.indexOf('</p>', start)
    const inner = src.slice(start, end < 0 ? Math.min(start + 2000, src.length) : end)
    const b = inner.match(BLOCK)
    if (b) pBad.push({ line: src.slice(0, m.index).split('\n').length, open: m[0].slice(0, 90), offender: b[0], snippet: inner.replace(/\s+/g, ' ').slice(0, 120) })
  }
}
// 2. interactive inside interactive in the RAW source (a/button/input/select/textarea/label)
const inter = []
{
  const stack = []
  const re = /<(\/?)(a|button|input|select|textarea|label)(\s[^>]*)?(\/?)>/gi
  let m
  while ((m = re.exec(src))) {
    const close = m[1] === '/', tag = m[2].toLowerCase(), attrs = m[3] || '', self = m[4] === '/'
    if (tag === 'input') { if (stack.length) inter.push({ line: src.slice(0, m.index).split('\n').length, inner: tag, outer: stack[stack.length - 1].tag, snip: m[0].slice(0, 100) }); continue }
    if (close) { for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { stack.splice(i); break } ; continue }
    if (self) continue
    if (tag === 'a' && !/\shref[=\s>]/i.test(attrs)) { stack.push({ tag, attrs }); continue }
    if (stack.length) {
      const outer = stack[stack.length - 1]
      const outerIsInteractive = outer.tag !== 'a' || /\shref[=\s>]/i.test(outer.attrs)
      const innerIsInteractive = tag !== 'a' || /\shref[=\s>]/i.test(attrs)
      if (outerIsInteractive && innerIsInteractive && !(outer.tag === 'label' && tag !== 'label')) inter.push({ line: src.slice(0, m.index).split('\n').length, inner: tag, outer: outer.tag, snip: m[0].slice(0, 110) })
    }
    stack.push({ tag, attrs })
  }
}
console.log('BLOCK INSIDE <p>:', pBad.length)
for (const p of pBad.slice(0, 20)) console.log('  line', p.line, p.open, '| contains', p.offender, '|', p.snippet)
console.log('INTERACTIVE INSIDE INTERACTIVE:', inter.length)
for (const i of inter.slice(0, 20)) console.log('  line', i.line, i.outer, '>', i.inner, '|', i.snip)
