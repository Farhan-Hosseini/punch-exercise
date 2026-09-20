// Runs inside Figma (use_figma), called as new Function('figma', 'P', 'CTX', source). Rebuilds the layer trees made by
// serialize.js as native Figma layers under the parents CTX gives it, and returns what it made.
// P: { items: [{ id, tree, target: { parentId, x, y, name, component, description, slotMap } }], hashes: { src: imageHash }, icons: { name: componentId } }
// CTX: { fontList } (figma.listAvailableFontsAsync(), fetched once per call by the bootstrap)
return (async () => {
  const log = []
  const FAMILY_MAP = { 'SF Pro Text': 'Inter', 'SF Pro Display': 'Inter', 'SF Pro': 'Inter', '-apple-system': 'Inter', 'system-ui': 'Inter', 'Segoe UI': 'Inter', 'Helvetica Neue': 'Inter', 'Helvetica': 'Inter', 'Arial': 'Inter', 'sans-serif': 'Inter', 'Arial Narrow': 'Barlow Condensed', 'Roboto': 'Roboto', 'monospace': 'Roboto Mono', 'ui-monospace': 'Roboto Mono' }
  const byFamily = new Map()
  for (const f of CTX.fontList) {
    const k = f.fontName.family
    if (!byFamily.has(k)) byFamily.set(k, [])
    byFamily.get(k).push(f.fontName.style)
  }
  const WEIGHT_NAMES = { 100: ['Thin'], 200: ['ExtraLight', 'Extra Light'], 300: ['Light'], 400: ['Regular'], 500: ['Medium'], 600: ['SemiBold', 'Semi Bold'], 700: ['Bold'], 800: ['ExtraBold', 'Extra Bold'], 900: ['Black'] }
  const fontMemo = new Map(), loaded = new Set()
  function pickFont(family, weight, italic) {
    const key = family + '|' + weight + '|' + italic
    if (fontMemo.has(key)) return fontMemo.get(key)
    let fam = byFamily.has(family) ? family : (FAMILY_MAP[family] && byFamily.has(FAMILY_MAP[family]) ? FAMILY_MAP[family] : 'Inter')
    if (!byFamily.has(fam)) fam = 'Inter'
    const styles = byFamily.get(fam) || ['Regular']
    const w = Math.min(900, Math.max(100, Math.round(weight / 100) * 100))
    const order = [w, w + 100, w - 100, w + 200, w - 200, w + 300, w - 300, 400, 700].filter((x) => x >= 100 && x <= 900)
    let style = null
    for (const ww of order) {
      for (const nm of WEIGHT_NAMES[ww]) {
        const want = italic ? (nm === 'Regular' ? 'Italic' : nm + ' Italic') : nm
        if (styles.includes(want)) { style = want; break }
      }
      if (style) break
    }
    if (!style) style = styles.includes('Regular') ? 'Regular' : styles[0]
    const fn = { family: fam, style }
    fontMemo.set(key, fn)
    return fn
  }
  async function need(fn) {
    const k = fn.family + '|' + fn.style
    if (loaded.has(k)) return
    await figma.loadFontAsync(fn)
    loaded.add(k)
  }
  const rgb = (c) => ({ r: c[0], g: c[1], b: c[2] })
  const VARS = []
  for (const [id, name, r, g, bb] of P.colors || []) {
    try { const v = await figma.variables.getVariableByIdAsync(id); if (v) VARS.push({ v, r, g, b: bb }) } catch (e) { /* a missing variable stays unbound */ }
  }
  let bound = 0
  function solid(c) {
    const p = { type: 'SOLID', color: rgb(c), opacity: c[3] }
    if (c[3] >= 0.999 && VARS.length) {
      const hit = VARS.find((x) => Math.abs(x.r - c[0]) < 0.004 && Math.abs(x.g - c[1]) < 0.004 && Math.abs(x.b - c[2]) < 0.004)
      if (hit) { bound++; return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: rgb(c), opacity: 1 }, 'color', hit.v) }
    }
    return p
  }
  function linear(g, w, h) {
    const th = (g.a * Math.PI) / 180, dx = Math.sin(th), dy = -Math.cos(th)
    const L = Math.abs(w * dx) + Math.abs(h * dy) || 1
    const Cx = w / 2, Cy = h / 2
    const P0x = Cx - (dx * L) / 2, P0y = Cy - (dy * L) / 2
    const t = [[(w * dx) / L, (h * dy) / L, -(P0x * dx + P0y * dy) / L], [(w * -dy) / L, (h * dx) / L, 0.5 - (Cx * -dy + Cy * dx) / L]]
    return { type: 'GRADIENT_LINEAR', gradientTransform: t, gradientStops: g.s.map(([p, c]) => ({ position: Math.min(1, Math.max(0, p)), color: { r: c[0], g: c[1], b: c[2], a: c[3] } })) }
  }
  function radial(g, w, h) {
    const Cx = g.cxPx ? g.cx : g.cx * w, Cy = g.cyPx ? g.cy : g.cy * h
    let rx, ry
    if (g.rx != null) { rx = g.rxu === '%' ? (g.rx / 100) * w : g.rx; ry = g.ryu === '%' ? (g.ry / 100) * h : g.ry }
    else {
      const fx = Math.max(Cx, w - Cx), fy = Math.max(Cy, h - Cy)
      if (g.circle) { rx = ry = Math.hypot(fx, fy) } else { rx = fx * Math.SQRT2; ry = fy * Math.SQRT2 }
    }
    rx = Math.max(rx, 0.5); ry = Math.max(ry, 0.5)
    const t = [[w / (2 * rx), 0, 0.5 - Cx / (2 * rx)], [0, h / (2 * ry), 0.5 - Cy / (2 * ry)]]
    return { type: 'GRADIENT_RADIAL', gradientTransform: t, gradientStops: g.s.map(([p, c]) => ({ position: Math.min(1, Math.max(0, p)), color: { r: c[0], g: c[1], b: c[2], a: c[3] } })) }
  }
  function imagePaint(f, w, h) {
    const hash = P.hashes[f.src]
    if (!hash) { log.push('no image ' + f.src); return { type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3 }, opacity: 1 } }
    if (f.fit === 'contain') return { type: 'IMAGE', imageHash: hash, scaleMode: 'FIT' }
    if (!f.nw || !f.nh || !w || !h) return { type: 'IMAGE', imageHash: hash, scaleMode: 'FILL' }
    const s = Math.max(w / f.nw, h / f.nh)
    const fx = Math.min(1, w / s / f.nw), fy = Math.min(1, h / s / f.nh)
    const pos = String(f.pos || '50% 50%').split(/\s+/)
    const pc = (v) => (v && v.endsWith('%') ? parseFloat(v) / 100 : v === 'left' || v === 'top' ? 0 : v === 'right' || v === 'bottom' ? 1 : 0.5)
    const px0 = pc(pos[0]), py0 = pc(pos[1] || pos[0])
    return { type: 'IMAGE', imageHash: hash, scaleMode: 'CROP', imageTransform: [[fx, 0, (1 - fx) * px0], [0, fy, (1 - fy) * py0]] }
  }
  function paints(list, w, h) {
    const out = []
    for (const f of list || []) {
      let p = null
      if (f.k === 'solid') p = solid(f.c)
      else if (f.k === 'lin') p = linear(f, w, h)
      else if (f.k === 'rad') p = radial(f, w, h)
      else if (f.k === 'img') p = imagePaint(f, w, h)
      if (!p) continue
      if (f.op != null) p = { ...p, opacity: (p.opacity == null ? 1 : p.opacity) * f.op }
      if (f.gray && p.type === 'IMAGE') p = { ...p, filters: { saturation: -1 } }
      out.push(p)
    }
    return out
  }
  function effects(list) {
    const out = []
    for (const e of list || []) {
      if (e.k === 'drop' || e.k === 'in') out.push({ type: e.k === 'drop' ? 'DROP_SHADOW' : 'INNER_SHADOW', color: { r: e.c[0], g: e.c[1], b: e.c[2], a: e.c[3] }, offset: { x: e.x, y: e.y }, radius: Math.max(0, e.b), spread: e.s || 0, visible: true, blendMode: 'NORMAL' })
      else if (e.k === 'blur') out.push({ type: 'LAYER_BLUR', radius: e.b * 2, visible: true })
      else if (e.k === 'bg') out.push({ type: 'BACKGROUND_BLUR', radius: e.b * 2, visible: true })
    }
    return out
  }
  const BLEND = { multiply: 'MULTIPLY', screen: 'SCREEN', overlay: 'OVERLAY', 'soft-light': 'SOFT_LIGHT', 'hard-light': 'HARD_LIGHT', lighten: 'LIGHTEN', darken: 'DARKEN', 'color-dodge': 'COLOR_DODGE', 'color-burn': 'COLOR_BURN', difference: 'DIFFERENCE', exclusion: 'EXCLUSION', 'plus-lighter': 'LINEAR_DODGE', luminosity: 'LUMINOSITY', color: 'COLOR', hue: 'HUE', saturation: 'SATURATION' }
  const isAuto = (p) => !!p && p.type !== 'PAGE' && p.type !== 'SECTION' && 'layoutMode' in p && p.layoutMode !== 'NONE'
  // in an auto layout parent a child in the flow is placed by the layout (and may fill the cross axis); one taken out of
  // the flow is positioned absolutely where the browser drew it
  function inFlow(node, d, parent) {
    if (!isAuto(parent)) return false
    if (d.ab) { node.layoutPositioning = 'ABSOLUTE'; return false }
    if (d.fill === 'h') node.layoutSizingHorizontal = 'FILL'
    if (d.fill === 'v') node.layoutSizingVertical = 'FILL'
    if (d.grow) node.layoutGrow = 1
    return true
  }
  function autoLayout(f, d) {
    const a = d.al
    f.layoutMode = a.m === 'H' ? 'HORIZONTAL' : 'VERTICAL'
    f.primaryAxisSizingMode = 'FIXED'
    f.counterAxisSizingMode = 'FIXED'
    if (a.wrap != null) { f.layoutWrap = 'WRAP'; f.counterAxisSpacing = a.wrap }
    f.itemSpacing = a.gap
    // CSS measures padding from the border edge, and an outline takes no room: strokes stay out of the layout
    f.strokesIncludedInLayout = false
    f.paddingTop = a.pad[0]; f.paddingRight = a.pad[1]; f.paddingBottom = a.pad[2]; f.paddingLeft = a.pad[3]
    f.primaryAxisAlignItems = a.pa
    f.counterAxisAlignItems = a.ca
    f.resize(Math.max(0.01, d.w), Math.max(0.01, d.h))
  }
  const EXP = new Map()
  function place(node, d, parent) {
    EXP.set(node.id, d)
    parent.appendChild(node)
    if (inFlow(node, d, parent)) return
    if (d.rot) {
      const th = (d.rot * Math.PI) / 180, c = Math.cos(th), s = Math.sin(th)
      const cx = d.x + d.w / 2, cy = d.y + d.h / 2
      node.relativeTransform = [[c, -s, cx - (c * d.w) / 2 + (s * d.h) / 2], [s, c, cy - (s * d.w) / 2 - (c * d.h) / 2]]
    } else { node.x = d.x; node.y = d.y }
  }
  const CASE = { uppercase: 'UPPER', lowercase: 'LOWER', capitalize: 'TITLE' }
  async function text(d, parent) {
    const t = figma.createText()
    t.name = (d.runs.map((r) => r.s).join('').replace(/\s+/g, ' ').trim().slice(0, 40)) || 'text'
    const fonts = d.runs.map((r) => pickFont(r.f, r.wt, r.it))
    for (const fn of fonts) await need(fn)
    t.fontName = fonts[0]
    t.characters = d.runs.map((r) => r.s).join('')
    let at = 0
    d.runs.forEach((r, i) => {
      const a = at, b = at + r.s.length
      at = b
      if (b <= a) return
      t.setRangeFontName(a, b, fonts[i])
      t.setRangeFontSize(a, b, Math.max(1, r.sz))
      t.setRangeFills(a, b, [solid(r.c)])
      t.setRangeLineHeight(a, b, r.lh ? { unit: 'PIXELS', value: r.lh } : { unit: 'AUTO' })
      if (r.ls) t.setRangeLetterSpacing(a, b, { unit: 'PIXELS', value: r.ls })
      if (r.tt && CASE[r.tt]) t.setRangeTextCase(a, b, CASE[r.tt])
      if (r.td && /underline/.test(r.td)) t.setRangeTextDecoration(a, b, 'UNDERLINE')
      if (r.td && /line-through/.test(r.td)) t.setRangeTextDecoration(a, b, 'STRIKETHROUGH')
    })
    const AL = { left: 'LEFT', center: 'CENTER', right: 'RIGHT', justify: 'JUSTIFIED', start: 'LEFT', end: 'RIGHT' }
    t.textAlignHorizontal = AL[d.al] || 'LEFT'
    if (d.sh) t.effects = d.sh.map((s) => ({ type: 'DROP_SHADOW', color: { r: s.c[0], g: s.c[1], b: s.c[2], a: s.c[3] }, offset: { x: s.x, y: s.y }, radius: s.b, spread: 0, visible: true, blendMode: 'NORMAL' }))
    EXP.set(t.id, d)
    parent.appendChild(t)
    // d.fin: layout.mjs already gave the text the box it is drawn in
    if (d.one && d.fixw) {
      // tracked text: the browser's box, trailing tracking included, so spacing around it is the browser's
      t.textAutoResize = 'NONE'
      t.resize(Math.max(1, d.w), Math.max(1, d.h))
      if (inFlow(t, d, parent)) return t
      t.x = d.x; t.y = d.y
      return t
    }
    if (d.one) {
      t.textAutoResize = 'WIDTH_AND_HEIGHT'
      if (inFlow(t, d, parent)) return t
      const al = t.textAlignHorizontal
      t.x = al === 'RIGHT' ? d.x + d.w - t.width : al === 'CENTER' ? d.x + (d.w - t.width) / 2 : d.x
      t.y = d.y + (d.h - t.height) / 2
    } else {
      const w = d.fin ? d.w : Math.max(d.w, d.cw || 0) + 2
      t.resize(Math.max(1, w), Math.max(1, d.h))
      t.textAutoResize = 'HEIGHT'
      if (inFlow(t, d, parent)) return t
      t.x = d.fin ? d.x : d.cw ? d.cx : d.x
      t.y = d.y
    }
    return t
  }
  function svgNode(d, parent) {
    let v
    try { v = figma.createNodeFromSvg(d.m) } catch (e) { log.push('svg failed ' + d.n + ': ' + e.message); v = figma.createFrame(); v.fills = [] }
    v.name = d.n || 'Vector art'
    if (Math.abs(v.width - d.w) > 0.5 || Math.abs(v.height - d.h) > 0.5) { try { v.rescale(Math.min(d.w / v.width, d.h / v.height)) } catch (e) { v.resize(Math.max(1, d.w), Math.max(1, d.h)) } }
    place(v, d, parent)
    return v
  }
  async function icon(d, parent) {
    const id = P.icons && P.icons[d.name]
    if (id) {
      const comp = await figma.getNodeByIdAsync(id)
      if (comp && comp.type === 'COMPONENT') {
        const inst = comp.createInstance()
        inst.name = 'Icon / ' + d.name
        inst.resize(Math.max(1, d.w), Math.max(1, d.h))
        if (d.c) for (const n of inst.findAll((x) => 'strokes' in x && x.strokes && x.strokes.length)) n.strokes = [solid(d.c)]
        place(inst, d, parent)
        return inst
      }
    }
    if (d.m) return svgNode({ ...d, n: 'Icon / ' + d.name }, parent)
    return null
  }
  async function build(d, parent) {
    if (d.t === 't') return text(d, parent)
    if (d.t === 'svg') return svgNode(d, parent)
    if (d.t === 'icon') return icon(d, parent)
    if (d.t === 'slot') {
      const want = CTX.slotMap && CTX.slotMap[d.key]
      const comp = want ? (CTX.byName.get(want) || (/^\d+:\d+$/.test(want) ? await figma.getNodeByIdAsync(want) : null)) : null
      if (comp) {
        const inst = comp.type === 'COMPONENT_SET' ? comp.defaultVariant.createInstance() : comp.createInstance()
        place(inst, d, parent)
        return inst
      }
      if (want) log.push('no set named ' + want)
      if (d.w < 1 || d.h < 1) return null
      const ph = figma.createFrame(); ph.name = 'slot / ' + d.key; ph.fills = []; ph.resize(Math.max(1, d.w), Math.max(1, d.h)); place(ph, d, parent); return ph
    }
    const f = figma.createFrame()
    f.name = d.n || 'Frame'
    f.resize(Math.max(0.01, d.w), Math.max(0.01, d.h))
    f.fills = paints(d.fl, d.w, d.h)
    if (d.gray) f.fills = f.fills.map((p) => (p.type === 'IMAGE' ? { ...p, filters: { saturation: -1 } } : p))
    if (d.st) {
      f.strokes = [solid(d.st.c)]
      f.strokeAlign = d.st.align || 'INSIDE'
      const [a, b, c, e] = d.st.w
      if (a === b && b === c && c === e) f.strokeWeight = a
      else { f.strokeTopWeight = a; f.strokeRightWeight = b; f.strokeBottomWeight = c; f.strokeLeftWeight = e }
      if (d.st.dash) f.dashPattern = [Math.max(2, a * 2), Math.max(2, a * 2)]
    }
    if (d.r) { f.topLeftRadius = d.r[0]; f.topRightRadius = d.r[1]; f.bottomRightRadius = d.r[2]; f.bottomLeftRadius = d.r[3] }
    if (d.fx) f.effects = effects(d.fx)
    if (d.o != null) f.opacity = d.o
    if (d.bl && BLEND[d.bl]) f.blendMode = BLEND[d.bl]
    f.clipsContent = !!d.clip
    // its own layout first: a resize after it is placed would undo a fill set by the parent's layout
    if (d.al) autoLayout(f, d)
    if (parent) place(f, d, parent)
    for (const k of d.k || []) {
      try { await build(k, f) } catch (e) { log.push('child failed in ' + f.name + ': ' + e.message) }
    }
    // a frame whose size is its content hugs it (unless its parent stretches it on that axis)
    if (d.al && (d.al.hugP || d.al.hugC)) {
      const hugW = d.al.m === 'H' ? d.al.hugP : d.al.hugC, hugH = d.al.m === 'H' ? d.al.hugC : d.al.hugP
      try {
        if (hugW && d.fill !== 'h' && !(d.grow && isAuto(f.parent) && f.parent.layoutMode === 'HORIZONTAL')) f.layoutSizingHorizontal = 'HUG'
        if (hugH && d.fill !== 'v' && !(d.grow && isAuto(f.parent) && f.parent.layoutMode === 'VERTICAL')) f.layoutSizingVertical = 'HUG'
      } catch (e) { log.push('hug failed in ' + f.name + ': ' + e.message) }
    }
    if (!parent) EXP.set(f.id, d)
    return f
  }


  // After a build: each child in an auto layout flow is where the browser put it (within TOL px), or the frame is
  // reported, and one that is badly off (over HEAL px) goes back to fixed positions so the design is never wrong.
  const TOL = 2.5, HEAL = 4
  const CHECK = { auto: 0, none: 0, abs: 0, drift: 0, healed: 0, worst: [] }
  function expected(c, e) {
    if (c.type === 'TEXT' && e.one && !e.fixw) {
      const al = c.textAlignHorizontal
      return [al === 'RIGHT' ? e.x + e.w - c.width : al === 'CENTER' ? e.x + (e.w - c.width) / 2 : e.x, e.y + (e.h - c.height) / 2]
    }
    return [e.x, e.y]
  }
  function setBack(c, e) {
    if (c.type === 'TEXT') {
      if (e.one && !e.fixw) { const al = c.textAlignHorizontal; c.x = al === 'RIGHT' ? e.x + e.w - c.width : al === 'CENTER' ? e.x + (e.w - c.width) / 2 : e.x; c.y = e.y + (e.h - c.height) / 2 }
      else { c.x = e.x; c.y = e.y }
      return
    }
    if ((Math.abs(c.width - e.w) > 0.5 || Math.abs(c.height - e.h) > 0.5) && 'resize' in c && !e.rot) { try { c.resize(Math.max(0.01, e.w), Math.max(0.01, e.h)) } catch (x) { /* a vector keeps its size */ } }
    if (e.rot) return
    c.x = e.x; c.y = e.y
  }
  function verify(f, path) {
    if (!('children' in f)) return
    for (const c of f.children) if (c.type !== 'INSTANCE') verify(c, path + '/' + c.name)
    const d = EXP.get(f.id)
    if (!d || f.type === 'INSTANCE') return
    if (!isAuto(f)) { if (f.children.length) CHECK.none++; return }
    CHECK.auto++
    // a hugging frame that came out a different size (another font's widths) keeps the browser's size instead
    if (Math.abs(f.width - d.w) > TOL && f.layoutSizingHorizontal === 'HUG') { f.layoutSizingHorizontal = 'FIXED'; f.resize(Math.max(0.01, d.w), f.height); CHECK.sized = (CHECK.sized || 0) + 1 }
    if (Math.abs(f.height - d.h) > TOL && f.layoutSizingVertical === 'HUG') { f.layoutSizingVertical = 'FIXED'; f.resize(f.width, Math.max(0.01, d.h)); CHECK.sized = (CHECK.sized || 0) + 1 }
    let worst = 0, who = ''
    for (const c of f.children) {
      if (c.layoutPositioning === 'ABSOLUTE') { CHECK.abs++; continue }
      const e = EXP.get(c.id)
      if (!e) continue
      const [x, y] = expected(c, e)
      const off = Math.max(Math.abs(c.x - x), Math.abs(c.y - y))
      if (off > worst) { worst = off; who = c.name }
    }
    const sizeOff = Math.max(Math.abs(f.width - d.w), Math.abs(f.height - d.h))
    if (worst <= TOL && sizeOff <= TOL) return
    const entry = path + ' [' + Math.round(worst) + ' ' + who.slice(0, 20) + (sizeOff > TOL ? ' size ' + Math.round(sizeOff) : '') + ']'
    if (worst > HEAL || sizeOff > HEAL) {
      // back to the browser's boxes: the frame keeps no layout rather than a wrong one
      f.layoutMode = 'NONE'
      f.resize(Math.max(0.01, d.w), Math.max(0.01, d.h))
      for (const c of f.children) { const e = EXP.get(c.id); if (e) setBack(c, e) }
      CHECK.healed++
      if (CHECK.worst.length < 40) CHECK.worst.push('HEALED ' + entry)
    } else {
      CHECK.drift++
      if (CHECK.worst.length < 40) CHECK.worst.push(entry)
    }
  }
  const page = figma.currentPage
  const DARK = { type: 'SOLID', color: { r: 0.075, g: 0.075, b: 0.085 } }
  function section(name) {
    let sn = page.children.find((n) => n.type === 'SECTION' && n.name === name)
    if (!sn) {
      const spec = (P.sections || []).find((x) => x.name === name) || { x: 0, y: 0 }
      sn = figma.createSection()
      sn.name = name
      page.appendChild(sn)
      sn.x = spec.x; sn.y = spec.y
      sn.fills = [DARK]
      sn.resizeWithoutConstraints(2000, 2000)
    }
    return sn
  }
  CTX.byName = new Map()
  for (const pid of new Set(P.items.flatMap((it) => [].concat(it.target.lookup || []).filter(Boolean)))) {
    const lp = await figma.getNodeByIdAsync(pid)
    if (lp) { await lp.loadAsync(); for (const n of lp.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] })) if (!CTX.byName.has(n.name)) CTX.byName.set(n.name, n) }
  }
  const made = []
  for (const it of P.items) {
    const parent = it.target.section ? section(it.target.section) : await figma.getNodeByIdAsync(it.target.parentId)
    if (!parent) { log.push('no parent for ' + it.id); continue }
    // a rebuild replaces what an earlier run left under the same name
    for (const old of parent.children.filter((n) => n.name === (it.target.name || '') && !it.target.component)) old.remove()
    CTX.slotMap = it.target.slotMap || null
    const root = await build({ ...it.tree, x: 0, y: 0 }, null)
    root.name = it.target.name || root.name
    parent.appendChild(root)
    try { verify(root, root.name) } catch (e) { log.push('check failed in ' + root.name + ': ' + e.message) }
    if (it.target.radius) { root.cornerRadius = it.target.radius; root.clipsContent = true }
    let node = root
    if (it.target.component) {
      node = figma.createComponentFromNode(root)
      if (it.target.description) node.description = it.target.description
    }
    parent.appendChild(node)
    node.x = it.target.x || 0
    node.y = it.target.y || 0
    made.push({ id: it.id, node: node.id, w: Math.round(node.width), h: Math.round(node.height) })
  }
  const sets = []
  for (const c of P.combine || []) {
    const sn = section(c.section)
    for (const old of sn.children.filter((n) => n.type === 'COMPONENT_SET' && n.name === c.name)) old.remove()
    const want = new Map(c.members)
    const comps = sn.children.filter((n) => n.type === 'COMPONENT' && want.has(n.name))
    comps.sort((a, b) => c.members.findIndex((m) => m[0] === a.name) - c.members.findIndex((m) => m[0] === b.name))
    if (!comps.length) { log.push('nothing to combine for ' + c.name); continue }
    for (const k of comps) k.name = want.get(k.name)
    const set = figma.combineAsVariants(comps, sn)
    set.name = c.name
    if (c.description) set.description = c.description
    set.layoutMode = 'HORIZONTAL'
    set.itemSpacing = c.gap
    set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = c.pad
    set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO'
    set.counterAxisAlignItems = 'MIN'
    set.fills = [{ type: 'SOLID', color: { r: 0.11, g: 0.11, b: 0.125 } }]
    set.cornerRadius = 24
    set.x = c.x; set.y = c.y
    sets.push({ name: set.name, id: set.id, variants: set.children.length })
  }
  for (const name of P.fit || []) {
    const sn = page.children.find((n) => n.type === 'SECTION' && n.name === name)
    if (!sn || !sn.children.length) continue
    let w = 0, h = 0
    for (const k of sn.children) { w = Math.max(w, k.x + k.width); h = Math.max(h, k.y + k.height) }
    sn.resizeWithoutConstraints(Math.ceil(w + 120), Math.ceil(h + 120))
  }
  return { made, sets, bound, log: log.slice(0, 30), check: CHECK }
})()
