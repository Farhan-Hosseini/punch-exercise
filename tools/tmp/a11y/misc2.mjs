import { open, sleep } from './cdp.mjs'
const c = await open({ W: 1440, H: 900, tag: 'm4', motion: 'no-preference' })
await c.boot()
await c.send('Accessibility.enable')
const LIB = `
const srgbLin = (v) => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
const lum = (c) => 0.2126 * srgbLin(c[0] / 255) + 0.7152 * srgbLin(c[1] / 255) + 0.0722 * srgbLin(c[2] / 255)
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) }
const over = (fg, bg) => { const a = fg[3]; return [fg[0]*a + bg[0]*(1-a), fg[1]*a + bg[1]*(1-a), fg[2]*a + bg[2]*(1-a), 1] }
const rgb = (s) => { const p = s.match(/[0-9.]+/g).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1] }
`
// sample INSIDE the painted button box, in its padding, never over a glyph
async function pixelContrast(textSel, boxSel) {
  const r = await c.jsn(`(() => { const t = document.querySelector(${JSON.stringify(textSel)}); if (!t) return null
    const box = ${JSON.stringify(boxSel)} ? t.closest(${JSON.stringify(boxSel)}) : t
    const b = box.getBoundingClientRect(); const tb = t.getBoundingClientRect(); const cs = getComputedStyle(t)
    // a point inside the box, above the text line, clear of the glyphs
    return { sx: Math.round(b.left + 3), sy: Math.round(b.top + 2), color: cs.color, px: parseFloat(cs.fontSize), wt: parseInt(cs.fontWeight) || 400,
             boxBg: getComputedStyle(box).backgroundColor, gap: Math.round(tb.top - b.top) } })()`)
  if (!r) return { textSel, missing: true }
  const s = await c.send('Page.captureScreenshot', { format: 'png', clip: { x: r.sx, y: r.sy, width: 2, height: 2, scale: 1 }, captureBeyondViewport: false })
  const bg = await c.js(`(async () => { const img = new Image(); img.src = 'data:image/png;base64,${s.result.data}'; await img.decode()
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height
    const cx = cv.getContext('2d', { colorSpace: 'srgb' }); cx.drawImage(img, 0, 0)
    const d = cx.getImageData(0, 0, img.width, img.height).data; return [d[0], d[1], d[2]].join(',') })()`)
  const res = await c.js(`(() => { ${LIB}
    const bg = [${bg}, 1], fg = rgb(${JSON.stringify(r.color)})
    const need = (${r.px} >= 24 || (${r.px} >= 18.66 && ${r.wt} >= 700)) ? 3 : 4.5
    return JSON.stringify({ ratio: +ratio(over(fg, bg), bg).toFixed(2), need }) })()`)
  return { sel: textSel, ...JSON.parse(res), sampledBg: 'rgb(' + bg + ')', declaredBoxBg: r.boxBg, fg: r.color, px: r.px, gapAboveText: r.gap }
}
await c.js(`window.showcase.mode('machine'); 1`); await sleep(2800)
const rows = []
for (const [t, box] of [['.crumb-title b', '.crumb-title'], ['.crumb-text > span', '.crumb-text'], ['.briefbtn span', '.briefbtn'],
  ['.mode[data-mode="mobile"] .long', '.mode'], ['.mode[aria-pressed="true"] .long', '.mode'],
  ['.pagenav:not([hidden]) .pagebar button:not([aria-current])', 'button'], ['.pagenav:not([hidden]) .pagebar button[aria-current]', 'button'],
  ['#openCase .case-long', '#openCase'], ['#animPlay span', '#animPlay']]) {
  rows.push(await pixelContrast(t, box))
}
console.log('TOPBAR (pixel-sampled background, inside each control box):')
for (const r of rows) console.log(' ', r.missing ? r.sel + ' MISSING' : `${r.ratio}/${r.need}  ${r.px}px  fg=${r.fg} on sampled ${r.sampledBg} (declared ${r.declaredBoxBg})  ${r.sel}`)

// the untitled iframe: how the AX tree exposes it
await c.js(`document.getElementById('openCase').click(); 1`); await sleep(4500)
const ids = await c.jsn(`(() => { const f = document.querySelector('.cs-embed[data-embed="hero"]'); f.scrollIntoView({block:'center'}); return 1 })()`)
await sleep(800)
const doc = await c.send('DOM.getDocument', { depth: -1, pierce: false })
const node = await c.send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '.cs-embed[data-embed="hero"]' })
const ax = await c.send('Accessibility.getPartialAXTree', { nodeId: node.result.nodeId, fetchRelatives: false })
console.log('\nAX for the case hero iframe:', JSON.stringify(ax.result.nodes.map(n => ({ role: n.role?.value, name: n.name?.value, nameFrom: (n.name?.sources || []).filter(s => s.value).map(s => s.type + '=' + JSON.stringify(s.value?.value)), ignored: n.ignored, ignoredReasons: (n.ignoredReasons || []).map(r => r.name) })), null, 1))
// compare with a titled one
const n2 = await c.send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '.cs-embed[data-embed="seq"]' })
if (n2.result.nodeId) {
  const ax2 = await c.send('Accessibility.getPartialAXTree', { nodeId: n2.result.nodeId, fetchRelatives: false })
  console.log('AX for the titled seq iframe:', JSON.stringify(ax2.result.nodes.map(n => ({ role: n.role?.value, name: n.name?.value, ignored: n.ignored })), null, 1))
}
console.log('ERRORS', JSON.stringify(c.errs.slice(0, 6)))
c.close()
