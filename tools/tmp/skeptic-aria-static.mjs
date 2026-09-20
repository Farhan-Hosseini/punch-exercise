const html = await (await fetch('http://localhost:5770/')).text()
const ids = new Set()
for (const m of html.matchAll(/ id="([^"]+)"/g)) ids.add(m[1])
const attrs = ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-details', 'aria-errormessage', 'aria-activedescendant']
const dangling = []
let refs = 0
for (const a of attrs) {
  const re = new RegExp(a + '="([^"]+)"', 'g')
  for (const m of html.matchAll(re)) {
    for (const tok of m[1].trim().split(/\s+/)) {
      refs++
      if (!ids.has(tok)) {
        const at = m.index
        const line = html.slice(0, at).split('\n').length
        const tag = html.slice(html.lastIndexOf('<', at), at + m[0].length + 30).replace(/\s+/g, ' ').slice(0, 190)
        dangling.push({ attr: a, id: tok, servedLine: line, tag })
      }
    }
  }
}
let labelFor = 0; const labelBad = []
for (const m of html.matchAll(/<label[^>]* for="([^"]+)"/g)) { labelFor++; if (!ids.has(m[1])) labelBad.push(m[1]) }
console.log(JSON.stringify({ bytes: html.length, totalIds: ids.size, idrefsChecked: refs, danglingCount: dangling.length, dangling, labelFor, labelBad }, null, 1))
