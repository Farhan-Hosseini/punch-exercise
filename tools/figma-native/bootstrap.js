/* ==========================================================================
   The bootstrap: what to paste into use_figma after send.mjs has uploaded a mode's carriers.

   Each carrier is an SVG holding one batch of the pack as base64 inside a <text>, so the data never passes through a
   prompt. Figma imports it as a FRAME on the Cover page with a single TEXT child; this reads that text back, decodes
   it, runs renderer.js on it, and removes the carrier.

     node tools/figma-native/pack.mjs <mode>          -> carriers/<mode>-NN.svg + <mode>.json (in order)
     upload_assets count N                            -> N submit URLs
     node tools/figma-native/send.mjs <mode> <uuid...> -> POSTs them and prints the carrier node ids, in order
     use_figma with this file, IDS set to those ids    -> renders them

   Notes that cost a run each to learn:
   - Figma's sandbox has figma.base64Decode and atob but no TextDecoder, so UTF-8 is decoded by hand below. The copy
     has curly quotes in it, so a byte-per-character decode is not enough.
   - setCurrentPageAsync is called once per use_figma call, so every carrier in one call must target one page. They do:
     a mode is one page.
   - Two or three carriers per call is a comfortable batch. A set too big for one carrier is split across several, and
     only the last part carries the combine, so render them in the order send.mjs printed.
   - Rendering replaces what it finds under the same name. Anything the showcase has since dropped (a design, a
     section, a whole page) survives as a stale layer: check against tools/figma-native/expected.mjs and remove it.
   ========================================================================== */
const IDS = ['CARRIER-NODE-ID', 'CARRIER-NODE-ID']
function utf8(bytes) {
  const parts = [], buf = []
  let i = 0
  const flush = () => { if (buf.length) { parts.push(String.fromCharCode.apply(null, buf)); buf.length = 0 } }
  while (i < bytes.length) {
    const b = bytes[i++]
    if (b < 0x80) buf.push(b)
    else if (b < 0xE0) buf.push(((b & 0x1F) << 6) | (bytes[i++] & 0x3F))
    else if (b < 0xF0) buf.push(((b & 0x0F) << 12) | ((bytes[i++] & 0x3F) << 6) | (bytes[i++] & 0x3F))
    else {
      const cp = ((b & 0x07) << 18) | ((bytes[i++] & 0x3F) << 12) | ((bytes[i++] & 0x3F) << 6) | (bytes[i++] & 0x3F)
      const x = cp - 0x10000
      buf.push(0xD800 + (x >> 10), 0xDC00 + (x & 0x3FF))
    }
    if (buf.length >= 4096) flush()
  }
  flush()
  return parts.join('')
}
const fontList = await figma.listAvailableFontsAsync()
let moved = false
const out = []
for (const id of IDS) {
  const n = await figma.getNodeByIdAsync(id)
  if (!n) { out.push({ id, err: 'missing' }); continue }
  const t = n.type === 'TEXT' ? n : n.findOne((x) => x.type === 'TEXT')
  const P = JSON.parse(utf8(figma.base64Decode(t.characters)))
  if (!moved) { const pg = await figma.getNodeByIdAsync(P.pageId); await figma.setCurrentPageAsync(pg); moved = true }
  const run = new Function('figma', 'P', 'CTX', P.renderer)
  const res = await run(figma, P, { fontList })
  n.remove()
  out.push({ id, what: P.what, made: (res.made || []).length, sets: (res.sets || []).map((s) => s.name + ' (' + s.variants + ')'), log: (res.log || []).slice(0, 8) })
}
return out
