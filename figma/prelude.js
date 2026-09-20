// Helper prelude pasted at the top of every use_figma call for this file.
// Fonts are loaded lazily and cached per call.
const _loaded = new Set()
const F = async (family, style) => { const k = family + '|' + style; if (!_loaded.has(k)) { await figma.loadFontAsync({ family, style }); _loaded.add(k) } return { family, style } }
const hex = (h, opacity) => { const n = parseInt(h.slice(1), 16); const p = { type: 'SOLID', color: { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 } }; if (opacity !== undefined) p.opacity = opacity; return p }
const fill = (node, h, o) => { node.fills = [hex(h, o)]; return node }
const rect = (parent, name, x, y, w, h, color, r) => { const n = figma.createRectangle(); n.name = name; n.x = x; n.y = y; n.resize(Math.max(0.01, w), Math.max(0.01, h)); if (color) n.fills = [hex(color)]; else n.fills = []; if (r) n.cornerRadius = r; parent.appendChild(n); return n }
const frame = (parent, name, x, y, w, h, color) => { const n = figma.createFrame(); n.name = name; n.x = x; n.y = y; n.resize(w, h); n.fills = color ? [hex(color)] : []; n.clipsContent = true; if (parent) parent.appendChild(n); return n }
const line = (parent, name, x, y, w, h, color, o) => { const n = rect(parent, name, x, y, w, h, color); if (o !== undefined) n.fills = [hex(color, o)]; return n }
// text(parent, name, str, {x,y,w, family, style, size, color, align, lh, ls, opacity, upper})
const text = async (parent, name, str, o) => {
  const t = figma.createText(); t.name = name
  const fn = await F(o.family || 'Barlow', o.style || 'Medium')
  t.fontName = fn
  t.characters = String(str)
  t.fontSize = o.size || 32
  t.fills = [hex(o.color || '#ffffff', o.opacity)]
  if (o.lh) t.lineHeight = { unit: 'PIXELS', value: o.lh }
  if (o.ls !== undefined) t.letterSpacing = { unit: 'PERCENT', value: o.ls }
  if (o.upper) t.textCase = 'UPPER'
  t.textAlignHorizontal = o.align || 'LEFT'
  parent.appendChild(t)
  if (o.w) { t.textAutoResize = 'HEIGHT'; t.resize(o.w, t.height) } else t.textAutoResize = 'WIDTH_AND_HEIGHT'
  t.x = o.x || 0; t.y = o.y || 0
  if (o.align === 'RIGHT' && !o.w) t.x = (o.x || 0) - t.width
  if (o.align === 'CENTER' && !o.w) t.x = (o.x || 0) - t.width / 2
  return t
}
const row = (parent, name, x, y, o = {}) => { const n = figma.createAutoLayout('HORIZONTAL', Object.assign({ name }, o)); n.x = x; n.y = y; n.fills = []; parent.appendChild(n); return n }
const col = (parent, name, x, y, o = {}) => { const n = figma.createAutoLayout('VERTICAL', Object.assign({ name }, o)); n.x = x; n.y = y; n.fills = []; parent.appendChild(n); return n }
const ellipse = (parent, name, x, y, d, color) => { const n = figma.createEllipse(); n.name = name; n.x = x; n.y = y; n.resize(d, d); n.fills = color ? [hex(color)] : []; parent.appendChild(n); return n }
const stroke = (node, color, w, o) => { node.strokes = [hex(color, o)]; node.strokeWeight = w; node.strokeAlign = 'INSIDE'; return node }
const grad = (node, stops, angle) => { // vertical linear gradient by default: stops [[pos,'#hex',opacity]]
  const a = (angle === undefined ? 90 : angle) * Math.PI / 180
  const c = Math.cos(a), s = Math.sin(a)
  node.fills = [{ type: 'GRADIENT_LINEAR', gradientTransform: [[c, s, (1 - c - s) / 2], [-s, c, (1 + s - c) / 2]], gradientStops: stops.map(([p, h, o]) => { const q = hex(h); return { position: p, color: { r: q.color.r, g: q.color.g, b: q.color.b, a: o === undefined ? 1 : o } } }) }]
  return node
}
const byId = async (id) => await figma.getNodeByIdAsync(id)
const page = async (name) => { const p = figma.root.children.find((p) => p.name === name); await figma.setCurrentPageAsync(p); return p }
