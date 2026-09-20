// Tidies a serialized tree (serialize.js) before it is packed, so the Figma file reads like one a designer built:
//   1. wrappers that draw nothing are folded away: a plain box around a single child becomes that child, and a box
//      whose only child is a plain box takes that box's children;
//   2. every frame whose children sit in a row, a column or a wrapping grid gets auto layout (al), inferred from the
//      measured boxes with the CSS flex settings (lay) breaking ties. Children taken out of the flow (ab) stay absolute.
// Text boxes are first given the geometry the renderer will draw them at, so the inferred gaps land where the browser
// put them. tidy() mutates and returns the tree; stats() counts what it did.
const T = 1.6 // px tolerance for "the same gap"
const TC = 2.5 // and for "the same cross edge": a browser's glyph box sits a pixel or two off its line box
const r1 = (v) => Math.round(v * 10) / 10
const counts = { frames: 0, auto: 0, folded: 0, hoisted: 0, fails: {} }

const draws = (n) => !!((n.fl && n.fl.length) || n.st || (n.fx && n.fx.length) || n.bl || n.rot || n.gray || n.video)
const plain = (n) => n.t === 'f' && !draws(n)

function inside(k, w, h) { return k.x >= -T && k.y >= -T && k.x + k.w <= w + T && k.y + k.h <= h + T }

// the box the renderer draws a text at: one line hugs its words, several lines keep the measured width; the height is
// the line height times the lines (the browser's range box is the glyphs' content area, shorter than the line box)
function textGeometry(d) {
  if (d.fin) return
  const lh = Math.max(0, ...d.runs.map((r) => r.lh || 0))
  const sz = Math.max(1, ...d.runs.map((r) => r.sz || 0))
  // lines: the explicit breaks, and what the height says (a tight line height makes the glyph boxes of two lines
  // overlap, which the browser's box count merges)
  const breaks = d.runs.reduce((n, r) => n + (r.s.match(/\n/g) || []).length, 0) + 1
  const est = lh ? Math.max(1, Math.round((d.h - sz * 1.2) / lh) + 1) : 1
  const lines = Math.max(breaks, est, d.one ? 1 : d.lines || 1)
  if (lines > breaks) d.one = 0
  d.lines = lines
  const H = lh ? lh * lines : d.h
  const y = d.y + (d.h - H) / 2
  const last = d.runs[d.runs.length - 1]
  const trail = last && last.ls > 0 ? last.ls : 0
  if (!d.one) {
    // wrapped text keeps the width its lines took (text-wrap: balance breaks well short of the box), with room for
    // Figma's glyphs to run a little wider without a word dropping to the next line; never wider than the box
    const w = Math.min((d.cw || d.w) + 2, d.w + Math.max(2, d.w * 0.03))
    const al = d.al === 'center' ? 0.5 : d.al === 'right' || d.al === 'end' ? 1 : 0
    d.x = r1(d.x + (d.w - w) * al); d.w = r1(w)
  } else if (trail) {
    // one line hugs its words; CSS counts the tracking after the last letter, Figma does not
    d.w = r1(d.w - trail)
  }
  d.y = r1(y); d.h = r1(H)
  d.fin = 1
  delete d.cw; delete d.cx
}

function fold(n) {
  for (const k of n.k || []) fold(k)
  if (!n.k) return
  // a wrapper with no box of its own (display: contents) hands its children to its parent
  n.k = n.k.flatMap((k) => {
    if (!plain(k) || !k.k || !k.k.length || (k.w > 0.5 && k.h > 0.5)) return [k]
    counts.dissolved = (counts.dissolved || 0) + 1
    return k.k.map((c) => ({ ...c, x: r1(c.x + k.x), y: r1(c.y + k.y), ...(k.ab ? { ab: 1 } : {}) }))
  })
  // a plain box around one child is that child
  n.k = n.k.map((k) => {
    if (!plain(k) || !k.k || k.k.length !== 1) return k
    const c = k.k[0]
    if (c.rot) return k
    if (k.clip && !inside(c, k.w, k.h)) return k
    if (k.o != null) {
      if (c.t === 't') c.runs.forEach((r) => { r.c = [r.c[0], r.c[1], r.c[2], Math.round(r.c[3] * k.o * 1000) / 1000] })
      else if (c.t === 'f') c.o = Math.round((c.o ?? 1) * k.o * 1000) / 1000
      else return k
    }
    c.x = r1(c.x + k.x); c.y = r1(c.y + k.y)
    // the wrapper's box is the text's real line box: centre the text in it rather than trust the glyph box
    if (c.t === 't' && Math.abs(k.h - c.h) <= 4) c.y = r1(k.y + (k.h - c.h) / 2)
    if (c.t === 't' && c.cx != null) c.cx = r1(c.cx + k.x)
    if (k.ab) c.ab = 1; else delete c.ab
    // the wrapper was the sibling that painted: it decides where its content stacks
    if (k.ps || c.ps) c.ps = 1
    if (k.z != null) c.z = k.z
    if (c.t === 'f' && /^(div|span|p|a|li|ul|section|article|figure|header|footer|button|label|strong|em|b|i|small)$/.test(c.n)) c.n = k.n
    counts.folded++
    return c
  })
  // a box whose only child is a plain box takes that box's children (and its layout)
  if (n.k.length === 1 && plain(n.k[0]) && n.k[0].k && n.k[0].k.length && n.k[0].o == null) {
    const c = n.k[0]
    if (!(c.clip && !c.k.every((g) => inside(g, c.w, c.h)))) {
      for (const g of c.k) {
        g.x = r1(g.x + c.x); g.y = r1(g.y + c.y)
        if (g.t === 't' && g.cx != null) g.cx = r1(g.cx + c.x)
      }
      n.k = c.k
      if (c.lay) n.lay = c.lay
      counts.hoisted++
    }
  }
}

// one line of children along an axis: gaps all equal (negative is fine: an overlapping avatar stack), one cross alignment
function line(kids, W, H, axis, lay) {
  const P = axis === 'H' ? ['x', 'w'] : ['y', 'h'], C = axis === 'H' ? ['y', 'h'] : ['x', 'w']
  const s = [...kids].sort((a, b) => a[P[0]] - b[P[0]])
  const gaps = []
  for (let i = 1; i < s.length; i++) gaps.push(s[i][P[0]] - (s[i - 1][P[0]] + s[i - 1][P[1]]))
  if (gaps.some((g) => Math.abs(g - gaps[0]) > T)) return null
  const gap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0
  if (gaps.length && -gap >= Math.min(...s.map((k) => k[P[1]]))) return null
  const lead = s[0][P[0]], end = s[s.length - 1][P[0]] + s[s.length - 1][P[1]]
  const size = axis === 'H' ? W : H, cross = axis === 'H' ? H : W
  if (lead < -T) return null
  const starts = s.map((k) => k[C[0]]), mids = s.map((k) => k[C[0]] + k[C[1]] / 2), ends = s.map((k) => k[C[0]] + k[C[1]])
  const same = (a) => a.every((v) => Math.abs(v - a[0]) <= TC)
  const hint = lay && lay.ai
  const wantC = hint === 'center' ? 'CENTER' : /end/.test(hint || '') ? 'MAX' : 'MIN'
  const ok = { MIN: same(starts), CENTER: same(mids), MAX: same(ends) }
  let ca = ok[wantC] ? wantC : ok.MIN ? 'MIN' : ok.CENTER ? 'CENTER' : ok.MAX ? 'MAX' : null
  // text of different sizes on one baseline: Figma aligns baselines itself
  if (!ca && axis === 'H' && /baseline/.test(hint || '') && s.every((k) => k.t === 't')) ca = 'BASELINE'
  if (!ca) return null
  const cLead = Math.min(...starts), cEnd = Math.max(...ends)
  if (cLead < -TC) return null
  // a child hanging off the trailing edge can only be placed from the leading one
  if ((ca === 'CENTER' || ca === 'MAX') && cross - cEnd < -TC) { if (ok.MIN) ca = 'MIN'; else return null }
  let cPadA = Math.max(0, cLead), cPadB = Math.max(0, cross - cEnd)
  if (ca === 'CENTER') {
    // the centre of the padded area must be the children's shared centre
    const mid = mids[0]
    const half = Math.min(mid, cross - mid) - Math.max(...s.map((k) => k[C[1]])) / 2
    if (half < -T) return null
    cPadA = Math.max(0, mid - Math.max(...s.map((k) => k[C[1]])) / 2)
    cPadB = Math.max(0, cross - mid - Math.max(...s.map((k) => k[C[1]])) / 2)
  }
  let pa = 'MIN'
  const jc = lay && lay.jc
  const centred = Math.abs((lead + end) / 2 - size / 2) <= T
  if (s.length > 1 && /space-between/.test(jc || '')) pa = 'SPACE_BETWEEN'
  else if (centred && (/center/.test(jc || '') || (lay && lay.ta === 'center') || (s.length === 1 && lay && lay.d !== 'block'))) pa = 'CENTER'
  else if (/end|right/.test((jc || '') + ' ' + ((lay && lay.ta) || '')) && end <= size + T) pa = 'MAX'
  if (pa !== 'MIN' && size - end < -T) pa = 'MIN'
  const padA = Math.max(0, lead), padB = Math.max(0, size - end)
  const pad = axis === 'H' ? [cPadA, padB, cPadB, padA] : [padA, cPadB, padB, cPadA] // top right bottom left
  return { m: axis, gap: r1(gap), pad: pad.map(r1), pa, ca, order: s, raw: [lead, size - end, cLead, cross - cEnd] }
}

// rows of children that wrap: every row starts at the same edge with the same gaps, rows the same distance apart, and
// Figma's own wrapping (fill a row until the next child does not fit) makes the same rows
function wrapGrid(kids, W, H) {
  // only a true grid: tiles of one width (anything else nests better as rows)
  if (kids.some((k) => Math.abs(k.w - kids[0].w) > T)) return null
  const s = [...kids].sort((a, b) => a.y - b.y || a.x - b.x)
  const rows = []
  for (const k of s) {
    const row = rows.find((r) => Math.abs(r[0].y - k.y) <= T)
    if (row) row.push(k); else rows.push([k])
  }
  if (rows.length < 2) return null
  rows.forEach((r) => r.sort((a, b) => a.x - b.x))
  let gap = null
  for (const r of rows) for (let i = 1; i < r.length; i++) {
    const g = r[i].x - (r[i - 1].x + r[i - 1].w)
    if (gap == null) gap = g; else if (Math.abs(g - gap) > T) return null
  }
  if (gap == null || gap < 0) return null
  const left = rows[0][0].x
  if (rows.some((r) => Math.abs(r[0].x - left) > T)) return null
  const bottoms = rows.map((r) => Math.max(...r.map((k) => k.y + k.h)))
  let rgap = null
  for (let i = 1; i < rows.length; i++) {
    const g = rows[i][0].y - bottoms[i - 1]
    if (rgap == null) rgap = g; else if (Math.abs(g - rgap) > T) return null
  }
  if (rgap < 0) return null
  const right = Math.max(...s.map((k) => k.x + k.w))
  // tiles that fill the frame to the pixel leave Figma no room to keep a row together: rows of their own are exact
  if (W - right < 1) return null
  for (let i = 0; i < rows.length - 1; i++) {
    const r = rows[i], nx = rows[i + 1][0]
    const endX = r[r.length - 1].x + r[r.length - 1].w
    if (endX + gap + nx.w <= right + 1 + T) return null // Figma would pull the next child up into this row
  }
  const top = Math.min(...rows[0].map((k) => k.y))
  if (left < -T || top < -T) return null
  // a pixel of slack on the right, so rounding never pushes the last tile of a row onto the next
  return { m: 'H', wrap: r1(rgap), gap: r1(gap), pad: [top, Math.max(0, W - right - 1), Math.max(0, H - bottoms[bottoms.length - 1]), left].map((v) => r1(Math.max(0, v))), pa: 'MIN', ca: 'MIN', order: rows.flat() }
}

// a row or column whose gaps differ is still one line: the children closest together are grouped into their own auto
// layout frame, split at the widest gaps, until every level has a single gap (how a designer nests auto layout)
function nested(kids, W, H, axis, lay, depth = 0) {
  if (depth > 4 || kids.length < 3) return null
  const P = axis === 'H' ? ['x', 'w'] : ['y', 'h']
  const s = [...kids].sort((a, b) => a[P[0]] - b[P[0]])
  const gaps = []
  for (let i = 1; i < s.length; i++) gaps.push(s[i][P[0]] - (s[i - 1][P[0]] + s[i - 1][P[1]]))
  if (gaps.some((g) => g < -T)) return null
  const G = Math.max(...gaps)
  const segs = [[s[0]]]
  for (let i = 1; i < s.length; i++) { if (Math.abs(gaps[i - 1] - G) <= T) segs.push([s[i]]); else segs[segs.length - 1].push(s[i]) }
  if (segs.length < 2) return null
  const units = []
  for (const seg of segs) {
    if (seg.length === 1) { units.push(seg[0]); continue }
    const x0 = Math.min(...seg.map((k) => k.x)), y0 = Math.min(...seg.map((k) => k.y))
    const x1 = Math.max(...seg.map((k) => k.x + k.w)), y1 = Math.max(...seg.map((k) => k.y + k.h))
    const g = { t: 'f', n: 'Group', x: r1(x0), y: r1(y0), w: r1(x1 - x0), h: r1(y1 - y0), k: seg.map((k) => ({ ...k, x: r1(k.x - x0), y: r1(k.y - y0) })) }
    const inner = line(g.k, g.w, g.h, axis, lay) || nested(g.k, g.w, g.h, axis, lay, depth + 1)
    if (!inner) return null
    g.k = inner.order; delete inner.order; delete inner.regroup; g.al = inner; g.grp = 1
    counts.groups = (counts.groups || 0) + 1
    units.push(g)
  }
  return line(units, W, H, axis, lay)
}

// children that overlap along an axis form one band (a row when stacking vertically, a column when side by side)
function bands(kids, axis) {
  const [P, S] = axis === 'V' ? ['y', 'h'] : ['x', 'w']
  const s = [...kids].sort((a, b) => a[P] - b[P])
  const out = []
  let end = -Infinity
  for (const k of s) {
    if (out.length && k[P] < end - TC) { out[out.length - 1].push(k); end = Math.max(end, k[P] + k[S]) } else { out.push([k]); end = k[P] + k[S] }
  }
  return out
}
function group(members, depth) {
  const x0 = Math.min(...members.map((k) => k.x)), y0 = Math.min(...members.map((k) => k.y))
  const x1 = Math.max(...members.map((k) => k.x + k.w)), y1 = Math.max(...members.map((k) => k.y + k.h))
  const g = { t: 'f', n: 'Group', x: r1(x0), y: r1(y0), w: r1(x1 - x0), h: r1(y1 - y0), k: members.map((k) => ({ ...k, x: r1(k.x - x0), y: r1(k.y - y0) })) }
  const inner = arrange(g.k, g.w, g.h, {}, depth + 1)
  if (!inner) return null
  g.k = inner.order; delete inner.order; delete inner.regroup; g.al = inner; g.grp = 1
  counts.groups = (counts.groups || 0) + 1
  return g
}
// the auto layout for a set of children: one line; a grid of equal tiles; rows (or columns) of their own; or a line
// with its closest children grouped. regroup: the order holds new Group frames
function arrange(kids, W, H, lay, depth = 0) {
  if (depth > 5) return null
  const pref = lay.d === 'flex' ? (/column/.test(lay.fd) ? 'V' : 'H') : lay.d === 'grid' ? 'V' : lay.ta ? 'H' : 'V'
  const tries = pref === 'H' ? ['H', 'V'] : ['V', 'H']
  for (const ax of tries) { const r = line(kids, W, H, ax, lay); if (r) return r }
  if (kids.length > 2) { const g = wrapGrid(kids, W, H); if (g) return g }
  for (const outer of tries) {
    const bs = bands(kids, outer)
    if (bs.length < 2 || bs.length === kids.length) continue
    const units = []
    let ok = true
    for (const b of bs) { if (b.length === 1) units.push(b[0]); else { const g = group(b, depth); if (!g) { ok = false; break } units.push(g) } }
    if (!ok) continue
    const r = line(units, W, H, outer, lay) || nested(units, W, H, outer, lay, depth)
    if (r) { r.regroup = 1; return r }
  }
  for (const ax of tries) { const r = nested(kids, W, H, ax, lay, depth); if (r) { r.regroup = 1; return r } }
  return null
}

// children in the order CSS paints them: negative z-index, boxes in the flow, positioned boxes, positive z-index
function paintOrder(n) {
  for (const k of n.k || []) paintOrder(k)
  if (!n.k || n.k.length < 2) return
  const layer = (k) => ((k.z || 0) < 0 ? 0 : !k.ps ? 1 : !k.z ? 2 : 3)
  n.k = n.k.map((k, i) => ({ k, i })).sort((a, b) => layer(a.k) - layer(b.k) || (a.k.z || 0) - (b.k.z || 0) || a.i - b.i).map((x) => x.k)
}

function fail(why) { counts.fails[why] = (counts.fails[why] || 0) + 1; return null }

// no two boxes overlap (so the order they stack in cannot matter)
function clear(kids) {
  for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
    const a = kids[i], b = kids[j]
    if (Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1) return false
  }
  return true
}

function infer(n) {
  const lay = n.lay || {}
  if (n.k.some((k) => k.rot)) {
    if (n.k.filter((k) => !k.ab).some((k) => k.rot)) return fail('rotated child')
  }
  // children placed absolutely in CSS that sit clear of each other are a layout all the same: they join the flow
  if (n.k.some((k) => k.ab) && !n.k.some((k) => k.rot) && clear(n.k)) {
    // cleared first: the groups arrange() builds copy their members
    const was = n.k.map((k) => k.ab)
    for (const k of n.k) delete k.ab
    const r = arrange(n.k, n.w, n.h, lay)
    if (!r) n.k.forEach((k, i) => { if (was[i]) k.ab = 1 })
    if (r) {
      if (n.k.length === 1) {
        // one child pinned to an edge (bottom: 24px, right: 24px) keeps that edge
        const k = n.k[0]
        if (r.pa === 'MIN') { const lead = r.m === 'V' ? k.y : k.x, trail = r.m === 'V' ? n.h - k.y - k.h : n.w - k.x - k.w; if (trail >= 0 && trail < lead - T) r.pa = 'MAX' }
        if (r.ca === 'MIN') { const lead = r.m === 'V' ? k.x : k.y, trail = r.m === 'V' ? n.w - k.x - k.w : n.h - k.y - k.h; if (trail >= 0 && trail < lead - T) r.ca = 'MAX' }
      }
      counts.promoted = (counts.promoted || 0) + 1
      return r
    }
  }
  const flow = n.k.filter((k) => !k.ab)
  if (!flow.length) return fail('all absolute')
  const r = arrange(flow, n.w, n.h, lay)
  if (r) return r
  return fail(flow.length === 1 ? 'one child off the grid' : 'uneven gaps or alignment')
}

// sizing once the layout is known: children that span the cross axis fill it, flex items that grow keep growing, and
// a frame whose padding is even on an axis (its size is its content) hugs it. Trailing space left over in a fixed
// start-aligned frame is padded like the leading side.
function finish(n, root) {
  const al = n.al
  const kids = n.k.filter((k) => !k.ab)
  const [pt, pr, pb, pl] = al.pad
  const inner = al.m === 'H' ? n.h - pt - pb : n.w - pr - pl
  if (!al.wrap && al.ca === 'MIN') for (const k of kids) {
    if (k.t !== 'f' && k.t !== 'slot' && !(k.t === 't' && !k.one)) continue
    const size = al.m === 'H' ? k.h : k.w
    if (inner > 0 && (Math.abs(size - inner) <= T || (k.t === 't' && Math.abs(size - 2 - inner) <= T))) k.fill = al.m === 'H' ? 'v' : 'h'
  }
  const lay = n.lay || {}
  const sameAxis = lay.d === 'flex' && /column/.test(lay.fd || '') === (al.m === 'V')
  // Figma shares the free space equally among children that fill: only one grower, or growers of one size, match CSS
  const growers = kids.filter((k) => k.gr && k.t !== 't')
  const P = al.m === 'H' ? 'w' : 'h'
  if (!al.wrap && sameAxis && growers.length && growers.every((k) => Math.abs(k[P] - growers[0][P]) <= T)) for (const k of growers) k.grow = 1
  const grows = kids.some((k) => k.grow)
  const crossFill = kids.some((k) => k.fill === (al.m === 'H' ? 'v' : 'h'))
  const [lead, trail, cLead, cTrail] = al.raw || (al.m === 'H' ? [pl, pr, pt, pb] : [pt, pb, pl, pr])
  delete al.raw
  const inside = (a, b) => a >= -0.5 && b >= -0.5
  if (!root && !al.wrap) {
    if (!grows && al.pa !== 'SPACE_BETWEEN' && inside(lead, trail) && Math.abs(lead - trail) <= 1.01) al.hugP = 1
    // and the widest child spans the frame between the paddings (children a pixel or two apart would shrink it)
    const crossSize = al.m === 'H' ? n.h : n.w, widest = Math.max(0, ...kids.map((k) => (al.m === 'H' ? k.h : k.w)))
    if (!crossFill && al.ca !== 'BASELINE' && inside(cLead, cTrail) && Math.abs(cLead - cTrail) <= 1.01 && Math.abs(crossSize - cLead - cTrail - widest) <= 1) al.hugC = 1
  }
  if (!al.hugP && !grows && al.pa === 'MIN' && !al.wrap) { if (al.m === 'H') al.pad[1] = Math.min(pr, pl); else al.pad[2] = Math.min(pb, pt) }
  if (!al.hugC && !crossFill && al.ca === 'MIN' && !al.wrap) { if (al.m === 'H') al.pad[2] = Math.min(pb, pt); else al.pad[1] = Math.min(pr, pl) }
  if (al.hugP) counts.hug = (counts.hug || 0) + 1
  for (const k of kids) if (k.grp) { delete k.grp; finish(k, false) }
}

function layout(n, root = false) {
  for (const k of n.k || []) layout(k)
  if (n.t !== 'f' || !n.k || !n.k.length) return
  counts.frames++
  const al = infer(n)
  if (!al) return
  // flow children take their places in the new order; absolute ones keep their slots (and their stacking)
  if (al.regroup) {
    // the flow children were regrouped: they go in, in order, where the first of them stood
    const at = n.k.findIndex((k) => !k.ab)
    const abs = n.k.filter((k) => k.ab)
    n.k = [...abs.slice(0, at), ...al.order, ...abs.slice(at)]
    delete al.regroup
  } else {
    const slots = n.k.map((k, i) => (k.ab ? null : i)).filter((i) => i != null)
    const next = [...n.k]
    al.order.forEach((k, j) => { next[slots[j]] = k })
    n.k = next
  }
  delete al.order
  n.al = al
  finish(n, root)
  counts.auto++
}

// a picture or a scrim that covers its whole frame and paints under everything else in it is the frame's own fill
function absorb(n) {
  for (const k of n.k || []) absorb(k)
  if (n.t !== 'f' || !n.k) return
  while (n.k.length) {
    const c = n.k[0]
    if (c.t !== 'f' || (c.k && c.k.length) || c.st || (c.fx && c.fx.length) || c.bl || c.rot || c.video || !(c.fl && c.fl.length)) break
    if (Math.abs(c.x) > 1 || Math.abs(c.y) > 1 || Math.abs(c.w - n.w) > 1 || Math.abs(c.h - n.h) > 1) break
    const rc = (c.r || [0, 0, 0, 0]).join(), rn = (n.r || [0, 0, 0, 0]).join()
    if (rc !== rn && !(n.clip && rc === '0,0,0,0')) break
    const op = c.o == null ? 1 : c.o
    n.fl = [...(n.fl || []), ...c.fl.map((f) => ({ ...f, ...(op < 1 ? { op: (f.op == null ? 1 : f.op) * op } : {}), ...(c.gray && f.k === 'img' ? { gray: 1 } : {}) }))]
    n.k.shift()
    counts.absorbed = (counts.absorbed || 0) + 1
  }
  if (!n.k.length) delete n.k
}

function texts(n) {
  if (n.t === 't') textGeometry(n)
  for (const k of n.k || []) texts(k)
}

export function tidy(tree) {
  texts(tree)
  fold(tree)
  paintOrder(tree)
  absorb(tree)
  layout(tree, true)
  return tree
}
export const stats = () => counts
