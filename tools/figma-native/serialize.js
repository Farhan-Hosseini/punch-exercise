/* Runs inside the showcase page. window.__figSer(root, opts) walks a rendered element and returns a compact layer tree
   that tools/figma-native/renderer.js rebuilds in Figma as native layers: frames with fills, gradients, borders, radii,
   shadows and blurs; text with its runs (family, weight, size, line height, tracking, colour, case); vectors from inline
   SVG; Lucide icons as instances; photos as image fills. Coordinates are relative to the parent node, in CSS pixels
   (the machine is serialized at zoom 100%, so CSS pixels are glass pixels).
   opts: { skip: selector of subtrees to leave out (with their place kept by the caller), name } */
(() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1
  const cx = cv.getContext('2d', { willReadFrequently: true })
  const colorCache = new Map()
  function col(str) {
    if (!str || str === 'transparent' || str === 'none') return null
    if (colorCache.has(str)) return colorCache.get(str)
    let out = null
    const m = /^rgba?\(([^)]+)\)$/.exec(str.trim())
    if (m) {
      const p = m[1].split(/[\s,\/]+/).filter(Boolean).map((v) => (v.endsWith('%') ? parseFloat(v) / 100 : Number(v)))
      out = [p[0] / 255, p[1] / 255, p[2] / 255, p.length > 3 ? p[3] : 1]
    } else {
      cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = str; cx.fillRect(0, 0, 1, 1)
      const d = cx.getImageData(0, 0, 1, 1).data
      out = [d[0] / 255, d[1] / 255, d[2] / 255, d[3] / 255]
      // the canvas reads black for a colour it cannot parse; keep that visible rather than silent
      if (!/^#|^(rgb|hsl|color|oklab|oklch|lab|lch)/.test(str) && out.join() === '0,0,0,1') out = [0, 0, 0, 1]
    }
    if (out && out[3] <= 0.003) out = null
    if (out) out = out.map((v) => Math.round(v * 1000) / 1000)
    colorCache.set(str, out)
    return out
  }
  const px = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0 }
  const r1 = (v) => Math.round(v * 10) / 10

  // split a CSS list at top-level commas (not inside parentheses)
  function splitTop(s) {
    const out = []; let depth = 0, cur = ''
    for (const ch of s) {
      if (ch === '(') depth++
      if (ch === ')') depth--
      if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = '' } else cur += ch
    }
    if (cur.trim()) out.push(cur.trim())
    return out
  }
  // colour stops: "rgb(1, 2, 3) 10%" or "rgba(..)" alone
  // L: the length of the gradient line in px, for stops given in px; a stop with two positions is two stops
  function stops(parts, L) {
    const res = []
    const pos = (v) => (v == null ? null : v.endsWith('%') ? parseFloat(v) / 100 : L ? px(v) / L : null)
    const raw = []
    for (const p of parts) {
      const m = /^(.*\))\s*(-?[\d.]+(?:%|px))?(?:\s+(-?[\d.]+(?:%|px)))?$/.exec(p) || /^(\S+)\s*(-?[\d.]+(?:%|px))?(?:\s+(-?[\d.]+(?:%|px)))?$/.exec(p)
      if (!m) continue
      const c = col(m[1]) || [0, 0, 0, 0]
      raw.push({ c, p: pos(m[2]) })
      if (m[3] != null) raw.push({ c, p: pos(m[3]) })
    }
    raw.forEach((s, i) => { if (s.p == null) s.p = raw.length === 1 ? 0 : i === 0 ? 0 : i === raw.length - 1 ? 1 : null })
    // stops without a position share the space between their neighbours
    for (let i = 1; i < raw.length - 1; i++) if (raw[i].p == null) {
      let j = i; while (raw[j].p == null) j++
      const a = raw[i - 1].p, b = raw[j].p
      for (let k = i; k < j; k++) raw[k].p = a + ((b - a) * (k - i + 1)) / (j - i + 1)
    }
    for (let i = 1; i < raw.length; i++) if (raw[i].p < raw[i - 1].p) raw[i].p = raw[i - 1].p
    for (const s of raw) res.push([Math.round(s.p * 10000) / 10000, s.c])
    return res
  }
  function tile(st) {
    const a = st[0][0], b = st[st.length - 1][0], P = b - a
    if (!(P > 0.002) || b >= 1) return st
    const out = []
    for (let k = 0; a + k * P < 1 && out.length < 400; k++) for (const [p, c] of st) { const q = p + k * P; if (q <= 1.0001 && (!out.length || q >= out[out.length - 1][0])) out.push([Math.round(q * 10000) / 10000, c]) }
    return out
  }
  function gradient(g, w = 0, h = 0) {
    const lin = /^(repeating-)?linear-gradient\((.*)\)$/.exec(g)
    if (lin) {
      const parts = splitTop(lin[2])
      let angle = 180
      if (/deg$/.test(parts[0])) { angle = parseFloat(parts.shift()) }
      else if (/^to /.test(parts[0])) {
        const t = parts.shift()
        angle = { 'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270, 'to top right': 45, 'to right top': 45, 'to bottom right': 135, 'to right bottom': 135, 'to bottom left': 225, 'to left bottom': 225, 'to top left': 315, 'to left top': 315 }[t] ?? 180
      } else if (/turn$/.test(parts[0])) angle = parseFloat(parts.shift()) * 360
      const th = (angle * Math.PI) / 180
      const L = Math.abs(w * Math.sin(th)) + Math.abs(h * Math.cos(th))
      const st = stops(parts, L)
      return { k: 'lin', a: angle, s: lin[1] ? tile(st) : st }
    }
    const rad = /^(repeating-)?radial-gradient\((.*)\)$/.exec(g)
    if (rad) {
      const parts = splitTop(rad[2])
      let shape = { cx: 0.5, cy: 0.5, rx: null, ry: null }
      if (!/^(rgb|#|hsl|color|oklab|transparent)/.test(parts[0])) {
        const head = parts.shift()
        const at = /at\s+([\d.]+)(%|px)?\s+([\d.]+)(%|px)?/.exec(head)
        if (at) shape = { ...shape, cx: parseFloat(at[1]) / (at[2] === 'px' ? 1 : 100), cy: parseFloat(at[3]) / (at[4] === 'px' ? 1 : 100), cxPx: at[2] === 'px', cyPx: at[4] === 'px' }
        const sz = /^([\d.]+)(px|%)\s+([\d.]+)(px|%)/.exec(head.trim())
        if (sz) { shape.rx = parseFloat(sz[1]); shape.rxu = sz[2]; shape.ry = parseFloat(sz[3]); shape.ryu = sz[4] }
        shape.circle = /circle/.test(head)
        shape.far = !/closest/.test(head)
      }
      return { k: 'rad', ...shape, s: stops(parts) }
    }
    return null
  }
  function shadows(s, inset) {
    if (!s || s === 'none') return []
    return splitTop(s).map((one) => {
      const isInset = /\binset\b/.test(one)
      const c = /(rgba?\([^)]*\)|#[0-9a-f]+|color\([^)]*\)|oklab\([^)]*\))/i.exec(one)
      const nums = one.replace(c ? c[0] : '', '').replace('inset', '').trim().split(/\s+/).map(px)
      return { i: isInset, c: col(c ? c[0] : 'rgba(0,0,0,.5)'), x: nums[0] || 0, y: nums[1] || 0, b: nums[2] || 0, s: nums[3] || 0 }
    }).filter((x) => x.c)
  }
  function textShadows(s) {
    if (!s || s === 'none') return []
    return splitTop(s).map((one) => {
      const c = /(rgba?\([^)]*\)|#[0-9a-f]+|color\([^)]*\))/i.exec(one)
      const nums = one.replace(c ? c[0] : '', '').trim().split(/\s+/).map(px)
      return { c: col(c ? c[0] : 'rgba(0,0,0,.5)'), x: nums[0] || 0, y: nums[1] || 0, b: nums[2] || 0 }
    }).filter((x) => x.c)
  }
  function radii(cs, w, h) {
    const one = (v) => { const p = v.split(' ')[0]; return p.endsWith('%') ? (parseFloat(p) / 100) * Math.min(w, h) : px(p) }
    const r = [one(cs.borderTopLeftRadius), one(cs.borderTopRightRadius), one(cs.borderBottomRightRadius), one(cs.borderBottomLeftRadius)].map((v) => Math.min(v, Math.min(w, h) / 2))
    return r.some((v) => v > 0.2) ? r.map(r1) : null
  }
  function fam(cs) {
    const list = cs.fontFamily.split(',').map((f) => f.trim().replace(/^["']|["']$/g, ''))
    return list[0] || 'Inter'
  }
  // opacity: an inline span's own opacity folds into its colour; the block's opacity is already on its frame
  function textRun(text, cs, useOpacity) {
    const run = { s: text, f: fam(cs), wt: +cs.fontWeight || 400, it: cs.fontStyle === 'italic' ? 1 : 0, sz: r1(px(cs.fontSize)) }
    const lh = cs.lineHeight === 'normal' ? null : px(cs.lineHeight)
    if (lh) run.lh = r1(lh)
    const ls = cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing)
    if (ls) run.ls = Math.round(ls * 100) / 100
    const c = col(cs.webkitTextFillColor && cs.webkitTextFillColor !== cs.color && cs.webkitTextFillColor !== 'rgba(0, 0, 0, 0)' ? cs.webkitTextFillColor : cs.color)
    run.c = c || [0, 0, 0, 1]
    if (cs.textTransform && cs.textTransform !== 'none') run.tt = cs.textTransform
    if (cs.textDecorationLine && cs.textDecorationLine !== 'none') run.td = cs.textDecorationLine
    const op = useOpacity ? +cs.opacity : 1
    if (op < 1) run.c = [run.c[0], run.c[1], run.c[2], Math.round(run.c[3] * op * 1000) / 1000]
    return run
  }
  const isInline = (el) => { const d = getComputedStyle(el).display; return d === 'inline' || d === 'contents' }
  function textOnly(el) {
    if (!el.childNodes.length) return false
    let hasText = false
    for (const n of el.childNodes) {
      if (n.nodeType === 3) { if (n.textContent.trim()) hasText = true; continue }
      if (n.nodeType !== 1) continue
      if (['IMG', 'SVG', 'svg', 'VIDEO', 'CANVAS', 'BR'].includes(n.tagName) && n.tagName !== 'BR') return false
      const cs = getComputedStyle(n)
      if (cs.display === 'none') continue
      if (!isInline(n)) return false
      if (n.querySelector('img, svg, video, canvas')) return false
      const b = cs.backgroundColor, bw = px(cs.borderTopWidth) + px(cs.borderBottomWidth)
      if ((col(b) || bw > 0 || cs.backgroundImage !== 'none') && n.textContent.trim()) return false
      if (n.textContent.trim()) hasText = true
    }
    return hasText
  }
  function collectRuns(el, runs, parentCs, depth = 0) {
    for (const n of el.childNodes) {
      if (n.nodeType === 3) {
        let t = n.textContent
        const cs = getComputedStyle(el)
        if (cs.whiteSpace === 'normal' || cs.whiteSpace === 'nowrap') t = t.replace(/\s+/g, ' ')
        if (t) runs.push(textRun(t, cs, depth > 0))
      } else if (n.nodeType === 1) {
        const cs = getComputedStyle(n)
        if (cs.display === 'none' || cs.visibility === 'hidden') continue
        if (n.tagName === 'BR') { runs.push({ ...textRun('\n', cs) }); continue }
        collectRuns(n, runs, cs, depth + 1)
      }
    }
    return runs
  }
  function trimRuns(runs) {
    // collapse leading and trailing whitespace across runs, and double spaces at run seams
    while (runs.length && !runs[0].s.trim() && runs[0].s !== '\n') runs.shift()
    while (runs.length && !runs[runs.length - 1].s.trim()) runs.pop()
    if (runs.length) { runs[0].s = runs[0].s.replace(/^\s+/, ''); runs[runs.length - 1].s = runs[runs.length - 1].s.replace(/\s+$/, '') }
    for (let i = 1; i < runs.length; i++) if (/\s$/.test(runs[i - 1].s) && /^\s/.test(runs[i].s)) runs[i].s = runs[i].s.replace(/^\s+/, '')
    return runs.filter((r) => r.s.length)
  }
  function lineCount(rects) {
    const rs = [...rects].sort((a, b) => a.top - b.top)
    let n = 0, bottom = -Infinity
    for (const r of rs) { if (r.top >= bottom - 1) { n++; bottom = r.bottom } else bottom = Math.max(bottom, r.bottom) }
    return Math.max(1, n)
  }
  function textBox(el) {
    const range = document.createRange()
    range.selectNodeContents(el)
    const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0)
    const b = range.getBoundingClientRect()
    return { b, lines: lineCount(rects) }
  }
  function svgMarkup(svg) {
    const clone = svg.cloneNode(true)
    const src = [svg, ...svg.querySelectorAll('*')], dst = [clone, ...clone.querySelectorAll('*')]
    src.forEach((o, i) => {
      const d = dst[i], cs = getComputedStyle(o)
      if (!d || !d.setAttribute) return
      if (o.tagName === 'text' || o.tagName === 'tspan') { d.setAttribute('font-family', fam(cs)); d.setAttribute('font-weight', cs.fontWeight); d.setAttribute('font-size', cs.fontSize) }
      for (const p of ['fill', 'stroke']) {
        const v = cs[p]
        if (!v) continue
        if (v === 'none') { d.setAttribute(p, 'none'); continue }
        if (/^url\(/.test(v)) continue
        const c = col(v)
        d.setAttribute(p, c ? `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})` : 'none')
        if (c && c[3] < 1) d.setAttribute(p + '-opacity', String(c[3]))
      }
      if (cs.strokeWidth && o !== svg) d.setAttribute('stroke-width', cs.strokeWidth)
      // dashes, caps and joins set in CSS (a gauge drawn as a dashed arc) travel with the markup
      if (cs.strokeDasharray && cs.strokeDasharray !== 'none') d.setAttribute('stroke-dasharray', cs.strokeDasharray.replace(/px/g, ''))
      if (cs.strokeDashoffset && parseFloat(cs.strokeDashoffset)) d.setAttribute('stroke-dashoffset', String(parseFloat(cs.strokeDashoffset)))
      if (cs.strokeLinecap && cs.strokeLinecap !== 'butt') d.setAttribute('stroke-linecap', cs.strokeLinecap)
      if (cs.strokeLinejoin && cs.strokeLinejoin !== 'miter') d.setAttribute('stroke-linejoin', cs.strokeLinejoin)
      if (+cs.opacity < 1) d.setAttribute('opacity', cs.opacity)
      d.removeAttribute('class'); d.removeAttribute('style')
    })
    const r = svg.getBoundingClientRect()
    clone.setAttribute('width', String(r1(r.width))); clone.setAttribute('height', String(r1(r.height)))
    if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    return clone.outerHTML
  }
  function fetchText(url) {
    try { const x = new XMLHttpRequest(); x.open('GET', url, false); x.send(); return x.status === 200 ? x.responseText : '' } catch { return '' }
  }
  const nameOf = (el) => {
    if (el.dataset && el.dataset.sv) return el.dataset.sv
    if (el.dataset && el.dataset.secLabel) return el.dataset.secLabel
    const c = [...(el.classList || [])].find((k) => !/^is-|^has-/.test(k))
    return c || el.tagName.toLowerCase()
  }
  const imgs = new Set()

  function pseudo(el, which, box) {
    const cs = getComputedStyle(el, which)
    if (!cs || cs.content === 'none' || cs.content === 'normal' || cs.display === 'none' || cs.visibility === 'hidden') return null
    const w = px(cs.width), h = px(cs.height)
    const bgc = col(cs.backgroundColor), bgi = cs.backgroundImage !== 'none' ? cs.backgroundImage : null
    const bw = px(cs.borderTopWidth) + px(cs.borderRightWidth) + px(cs.borderBottomWidth) + px(cs.borderLeftWidth)
    const text = /^["'](.*)["']$/.exec(cs.content || '')
    if (!w && !h && !text) return null
    if (!bgc && !bgi && !bw && !(text && text[1]) && cs.boxShadow === 'none') return null
    // a pseudo scaled to nothing (an unchecked radio's dot) is not drawn; any other scale shrinks it about its centre
    let sc = 1
    const mt = /matrix\(([^)]+)\)/.exec(cs.transform || '')
    if (mt) { const [a, b] = mt[1].split(',').map(Number); sc = Math.hypot(a, b) }
    if (sc < 0.02) return null
    let x = 0, y = 0
    const pcs = getComputedStyle(el)
    const bl = px(pcs.borderLeftWidth), bt = px(pcs.borderTopWidth)
    if (cs.position === 'absolute' || cs.position === 'fixed') {
      x = cs.left !== 'auto' ? px(cs.left) + bl : cs.right !== 'auto' ? box.width - px(pcs.borderRightWidth) - px(cs.right) - w : 0
      y = cs.top !== 'auto' ? px(cs.top) + bt : cs.bottom !== 'auto' ? box.height - px(pcs.borderBottomWidth) - px(cs.bottom) - h : 0
    } else if (w && h) {
      // in flow: a grid or flex parent that centres its items centres the pseudo too
      const grid = /grid/.test(pcs.display), flex = /flex/.test(pcs.display)
      const ctr = (v) => /center/.test(v || '')
      const hC = (grid && (ctr(pcs.justifyItems) || ctr(cs.justifySelf) || ctr(pcs.justifyContent))) || (flex && ctr(pcs.justifyContent))
      const vC = ((grid || flex) && (ctr(pcs.alignItems) || ctr(cs.alignSelf))) || (grid && ctr(pcs.alignContent))
      x = hC ? (box.width - w) / 2 : bl + px(pcs.paddingLeft)
      y = vC ? (box.height - h) / 2 : bt + px(pcs.paddingTop)
    }
    let nw = w || box.width, nh = h || box.height
    if (sc !== 1 && w && h) { x += (w - w * sc) / 2; y += (h - h * sc) / 2; nw = w * sc; nh = h * sc }
    const node = { t: 'f', n: which.replace('::', ''), x: r1(x), y: r1(y), w: r1(nw), h: r1(nh) }
    if (cs.position === 'absolute' || cs.position === 'fixed') node.ab = 1
    Object.assign(node, stacking(null, cs, getComputedStyle(el)))
    styleBox(node, cs, node.w, node.h)
    if (text && text[1]) node.k = [{ t: 't', x: 0, y: 0, w: node.w, h: node.h, al: cs.textAlign, runs: [textRun(text[1], cs)] }]
    return node
  }
  function styleBox(node, cs, w, h) {
    const fills = []
    const bg = col(cs.backgroundColor)
    if (cs.backgroundImage && cs.backgroundImage !== 'none') {
      for (const layer of splitTop(cs.backgroundImage).reverse()) {
        const u = /^url\(["']?(.*?)["']?\)$/.exec(layer)
        if (u) { imgs.add(u[1]); fills.push({ k: 'img', src: u[1], fit: cs.backgroundSize === 'contain' ? 'contain' : 'cover', pos: cs.backgroundPosition }); continue }
        const g = gradient(layer, w, h)
        if (g) fills.push(g)
      }
    }
    if (bg) fills.unshift({ k: 'solid', c: bg })
    if (fills.length) node.fl = fills
    const sides = ['Top', 'Right', 'Bottom', 'Left'].map((s) => ({ w: cs['border' + s + 'Style'] === 'none' ? 0 : px(cs['border' + s + 'Width']), c: col(cs['border' + s + 'Color']) }))
    if (sides.some((s) => s.w > 0 && s.c)) {
      const first = sides.find((s) => s.w > 0 && s.c)
      node.st = { c: first.c, w: sides.map((s) => (s.c ? r1(s.w) : 0)), dash: cs.borderTopStyle === 'dashed' || cs.borderTopStyle === 'dotted' }
    }
    if (!node.st && cs.outlineStyle && cs.outlineStyle !== 'none' && px(cs.outlineWidth) > 0 && col(cs.outlineColor)) {
      const ow = r1(px(cs.outlineWidth))
      node.st = { c: col(cs.outlineColor), w: [ow, ow, ow, ow], dash: cs.outlineStyle === 'dashed' || cs.outlineStyle === 'dotted', align: 'OUTSIDE' }
    }
    const r = radii(cs, w, h)
    if (r) node.r = r
    const sh = shadows(cs.boxShadow)
    const fx = []
    for (const s of sh) fx.push({ k: s.i ? 'in' : 'drop', c: s.c, x: s.x, y: s.y, b: s.b, s: s.s })
    const blur = /blur\(([\d.]+)px\)/.exec(cs.filter || '')
    if (blur) fx.push({ k: 'blur', b: parseFloat(blur[1]) })
    const dropf = /drop-shadow\(([^)]*\))\s*([-\d.]+px)\s+([-\d.]+px)\s+([\d.]+px)\)/.exec(cs.filter || '')
    if (dropf) fx.push({ k: 'drop', c: col(dropf[1]), x: px(dropf[2]), y: px(dropf[3]), b: px(dropf[4]), s: 0 })
    const bblur = /blur\(([\d.]+)px\)/.exec(cs.backdropFilter || cs.webkitBackdropFilter || '')
    if (bblur) fx.push({ k: 'bg', b: parseFloat(bblur[1]) })
    if (fx.length) node.fx = fx
    const op = +cs.opacity
    if (op < 1) node.o = Math.round(op * 1000) / 1000
    if (cs.overflow !== 'visible' || cs.overflowX !== 'visible' || cs.overflowY !== 'visible') node.clip = 1
    if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') node.bl = cs.mixBlendMode
  }
  // where a box paints among its siblings (CSS paints negative z-index, then boxes in the flow, then positioned boxes,
  // then positive z-index): ps = positioned (or a flex or grid item with a z-index), z = its z-index
  function stacking(el, cs, parentCs) {
    const pcs = parentCs || (el && el.parentElement ? getComputedStyle(el.parentElement) : null)
    const item = pcs && /flex|grid/.test(pcs.display)
    const out = {}
    if (cs.position !== 'static') out.ps = 1
    if (cs.zIndex !== 'auto' && (cs.position !== 'static' || item)) { out.ps = 1; const z = parseInt(cs.zIndex, 10); if (z) out.z = z }
    // a flex item that takes the free space grows in Figma too
    if (item && /flex/.test(pcs.display) && parseFloat(cs.flexGrow) > 0) out.gr = 1
    return out
  }
  // the back of a card turned away (rotateY past 90 degrees) with its back face hidden is not seen
  function turnedAway(cs) {
    if (cs.backfaceVisibility !== 'hidden') return false
    const m = /matrix3d\(([^)]+)\)/.exec(cs.transform || '')
    if (!m) return false
    const v = m[1].split(',').map(Number)
    return v[0] * v[5] - v[1] * v[4] < 0 || v[10] < 0
  }
  // the turn a box is drawn at: its transform's, plus the individual rotate property (not part of the computed transform)
  function rot(cs) {
    let deg = 0
    const m = /matrix\(([^)]+)\)/.exec(cs.transform || '')
    if (m) { const [a, b] = m[1].split(',').map(Number); deg = (Math.atan2(b, a) * 180) / Math.PI }
    const r = /(-?[\d.]+)(deg|turn|rad)\s*$/.exec(cs.rotate || '')
    if (r && !/^\s*[xy]\s/i.test(cs.rotate)) deg += r[2] === 'turn' ? parseFloat(r[1]) * 360 : r[2] === 'rad' ? (parseFloat(r[1]) * 180) / Math.PI : parseFloat(r[1])
    return Math.abs(deg) < 0.2 ? 0 : Math.round(deg * 10) / 10
  }

  function walk(el, parentBox, opts, depth) {
    if (depth > 40) return null
    if (opts.skip && el.matches && el.matches(opts.skip)) {
      let r = el.getBoundingClientRect()
      // a wrapper with display: contents has no box: its shown child stands for it
      if (getComputedStyle(el).display === 'contents') {
        const kid = [...el.children].find((c) => !c.hidden && c.getBoundingClientRect().height > 0)
        if (kid) r = kid.getBoundingClientRect()
      }
      const cl = el.classList || { contains: () => false }
      const key = (el.dataset && (el.dataset.sec || el.dataset.slot)) || (cl.contains('ms-lights') || cl.contains('m-bg') ? 'background' : cl.contains('m-status') ? 'status' : cl.contains('m-homebar') ? 'homebar' : '')
      const scs = getComputedStyle(el)
      if (scs.display === 'none') return null
      const slot = { t: 'slot', key, x: r1(r.left - parentBox.left), y: r1(r.top - parentBox.top), w: r1(r.width), h: r1(r.height) }
      if (scs.position === 'absolute' || scs.position === 'fixed') slot.ab = 1
      Object.assign(slot, stacking(el, scs))
      return slot
    }
    const cs = getComputedStyle(el)
    if (cs.display === 'none') return null
    // text kept for screen readers only (a 1 px clipped box) is not part of the picture
    if ((el.classList && el.classList.contains('sr-only')) || (cs.position === 'absolute' && el.offsetWidth <= 1 && el.offsetHeight <= 1 && cs.overflow === 'hidden')) return null
    const hidden = cs.visibility === 'hidden'
    if (+cs.opacity === 0) return null
    if (turnedAway(cs)) return null
    let r = el.getBoundingClientRect()
    const deg = rot(cs)
    let w = r.width, h = r.height
    if (deg) { w = el.offsetWidth || w; h = el.offsetHeight || h }
    const box = { left: deg ? r.left + r.width / 2 - w / 2 : r.left, top: deg ? r.top + r.height / 2 - h / 2 : r.top, width: w, height: h }
    const tag = el.tagName
    const base = { n: nameOf(el), x: r1(box.left - parentBox.left), y: r1(box.top - parentBox.top), w: r1(w), h: r1(h) }
    if (deg) base.rot = deg
    // out of the flow: auto layout keeps it where it is instead of stacking it
    if (cs.position === 'absolute' || cs.position === 'fixed') base.ab = 1
    Object.assign(base, stacking(el, cs))
    if (tag === 'svg' || tag === 'SVG') {
      if (hidden || w < 0.5 || h < 0.5) return null
      const host = el.closest('[data-lucide]')
      if (host && host.dataset.lucide && (el.classList.contains('lucide') || el.parentElement === host)) {
        const sc = getComputedStyle(el)
        return { t: 'icon', ...base, name: host.dataset.lucide, c: col(sc.stroke !== 'none' ? sc.stroke : sc.color), sw: px(sc.strokeWidth) || 1.75 }
      }
      return { t: 'svg', ...base, m: svgMarkup(el) }
    }
    if (tag === 'IMG') {
      if (hidden || w < 0.5 || h < 0.5) return null
      const src = el.currentSrc || el.src
      if (/\.svg(\?|$)/i.test(src)) {
        const text = fetchText(src)
        if (text) {
          // the file's own size and fit give way to the size it is drawn at (an attribute given twice is invalid SVG)
          const fit = cs.objectFit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'
          const m = text.replace(/<\?xml[^>]*>/, '').replace(/<!DOCTYPE[^>]*>/i, '')
            .replace(/<svg\b[^>]*>/, (tag) => tag.replace(/\s(width|height|preserveAspectRatio|style|overflow)="[^"]*"/g, '').replace(/<svg\b/, `<svg width="${r1(w)}" height="${r1(h)}" preserveAspectRatio="${fit}"`))
          return { t: 'svg', ...base, m }
        }
      }
      imgs.add(src)
      const node = { t: 'f', ...base }
      styleBox(node, cs, w, h)
      node.fl = [...(node.fl || []), { k: 'img', src, fit: cs.objectFit === 'contain' ? 'contain' : 'cover', pos: cs.objectPosition, nw: el.naturalWidth, nh: el.naturalHeight }]
      const gs = /grayscale\(([\d.]+)\)/.exec(cs.filter || ''); if (gs && parseFloat(gs[1]) > 0.5) node.gray = 1
      return node
    }
    if (tag === 'VIDEO') {
      const poster = el.getAttribute('poster')
      if (!poster || hidden) return null
      const u = new URL(poster, location.href).href
      imgs.add(u)
      const node = { t: 'f', ...base, n: 'video poster', fl: [{ k: 'img', src: u, fit: cs.objectFit === 'contain' ? 'contain' : 'cover', pos: cs.objectPosition, nw: el.videoWidth || 0, nh: el.videoHeight || 0 }], video: el.currentSrc || el.getAttribute('src') || '' }
      const r = radii(cs, w, h); if (r) node.r = r
      return node
    }
    if (tag === 'CANVAS') {
      if (hidden) return null
      try { const d = el.toDataURL('image/png'); return { t: 'f', ...base, n: 'canvas', fl: [{ k: 'data', d }] } } catch { return null }
    }
    if (['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'IFRAME', 'INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
      if (tag === 'INPUT' && !hidden && w > 1) {
        const node = { t: 'f', ...base }
        styleBox(node, cs, w, h)
        const val = el.value || el.placeholder || ''
        if (val) node.k = [{ t: 't', n: 'value', x: px(cs.paddingLeft), y: 0, w: w - px(cs.paddingLeft) - px(cs.paddingRight), h, al: cs.textAlign, va: 'c', runs: [textRun(val, el.value ? cs : getComputedStyle(el, '::placeholder'))] }]
        return node
      }
      return null
    }
    const node = { t: 'f', ...base }
    if (!hidden) styleBox(node, cs, w, h)
    // how CSS lays the children out: a hint for the auto layout that layout.mjs infers from the boxes
    if (/flex|grid/.test(cs.display)) node.lay = { d: cs.display.replace('inline-', ''), fd: cs.flexDirection, jc: cs.justifyContent, ai: cs.alignItems, fw: cs.flexWrap }
    else if (cs.textAlign === 'center' || cs.textAlign === 'right' || cs.textAlign === 'end') node.lay = { d: 'block', ta: cs.textAlign }
    const kids = []
    const before = hidden ? null : pseudo(el, '::before', box)
    if (before) kids.push(before)
    if (!hidden && textOnly(el)) {
      const runs = trimRuns(collectRuns(el, [], cs) || [])
      if (runs.length) {
        const tb = textBox(el)
        const t = { t: 't', n: 'text', runs, al: cs.textAlign === 'start' ? 'left' : cs.textAlign === 'end' ? 'right' : cs.textAlign }
        const ts = textShadows(cs.textShadow); if (ts.length) t.sh = ts
        const pl = px(cs.paddingLeft) + px(cs.borderLeftWidth), pr = px(cs.paddingRight) + px(cs.borderRightWidth)
        t.x = r1(tb.b.left - box.left); t.y = r1(tb.b.top - box.top); t.w = r1(tb.b.width); t.h = r1(tb.b.height)
        t.lines = tb.lines
        t.cw = r1(w - pl - pr); t.cx = r1(pl)
        if (cs.whiteSpace === 'nowrap' || tb.lines <= 1) t.one = 1
        kids.push(t)
      }
    } else {
      for (const n of el.childNodes) {
        if (n.nodeType === 3) {
          if (hidden || !n.textContent.trim()) continue
          const range = document.createRange(); range.selectNodeContents(n)
          const b = range.getBoundingClientRect()
          if (b.width < 0.5) continue
          const runs = trimRuns([textRun(n.textContent.replace(/\s+/g, ' '), cs)])
          if (!runs.length) continue
          const lines = lineCount([...range.getClientRects()].filter((q) => q.width > 0 && q.height > 0))
          kids.push({ t: 't', n: 'text', runs, al: cs.textAlign === 'start' ? 'left' : cs.textAlign, x: r1(b.left - box.left), y: r1(b.top - box.top), w: r1(b.width), h: r1(b.height), lines, one: lines <= 1 ? 1 : 0, cw: r1(b.width), cx: r1(b.left - box.left) })
        } else if (n.nodeType === 1) {
          const k = walk(n, box, opts, depth + 1)
          if (k) kids.push(k)
        }
      }
    }
    const after = hidden ? null : pseudo(el, '::after', box)
    if (after) kids.push(after)
    if (kids.length) node.k = kids
    // an empty invisible box adds nothing
    if (!node.k && !node.fl && !node.st && !node.fx) return (w > 0 && h > 0 && !hidden) ? null : null
    return node
  }

  window.__figSer = function (root, opts = {}) {
    imgs.clear()
    const r = root.getBoundingClientRect()
    const box = { left: r.left, top: r.top, width: r.width, height: r.height }
    const tree = walk(root, box, opts, 0) || { t: 'f', n: nameOf(root), x: 0, y: 0, w: r.width, h: r.height }
    tree.x = 0; tree.y = 0
    if (opts.name) tree.n = opts.name
    if (opts.height) tree.h = opts.height
    return { tree, images: [...imgs] }
  }
})()
