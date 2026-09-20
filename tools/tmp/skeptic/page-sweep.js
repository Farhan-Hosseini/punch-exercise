(() => {
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
  const L = p => 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2])
  const NUM = /[^0-9.]+/                       // no escaped parens anywhere: nothing for a heredoc to eat
  function P(s) {
    s = String(s).trim()
    const isColorFn = s.indexOf('color(') === 0
    const isRgb = s.indexOf('rgb(') === 0 || s.indexOf('rgba(') === 0
    if (!isColorFn && !isRgb) return null
    const q = s.split(NUM).filter(Boolean).map(Number)
    if (q.length < 3 || q.slice(0, 3).some(Number.isNaN)) return null
    const k = isColorFn ? 255 : 1
    return [q[0] * k, q[1] * k, q[2] * k, q.length > 3 ? q[3] : 1]
  }
  const over = (f, b) => [f[0]*f[3]+b[0]*(1-f[3]), f[1]*f[3]+b[1]*(1-f[3]), f[2]*f[3]+b[2]*(1-f[3]), 1]
  // self-test: if the parser is broken, say so loudly instead of returning a clean sweep
  const selftest = {
    rgba: JSON.stringify(P('rgba(0, 0, 0, 0)')),
    rgb: JSON.stringify(P('rgb(245, 245, 247)')),
    colorfn: JSON.stringify(P('color(srgb 0.918431 0.918431 0.926275)')),
  }
  const out = [], unparsed = new Set()
  for (const el of document.querySelectorAll('#case .cd *')) {
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim()
    if (own.length < 4) continue
    const b = el.getBoundingClientRect(); if (b.width < 3 || b.height < 3) continue
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue
    let stack = [], e = el, bad = ''
    while (e && e.nodeType === 1) {
      const s = getComputedStyle(e)
      if (s.backgroundImage !== 'none') { bad = 'img:' + s.backgroundImage.slice(0, 24); break }
      const q = P(s.backgroundColor)
      if (!q) { bad = 'bg'; unparsed.add(s.backgroundColor); break }
      if (q[3] > 0) { stack.unshift(q); if (q[3] >= 0.999) break }
      e = e.parentElement
    }
    if (bad) { continue }
    let bg = [255, 255, 255, 1]; for (const l of stack) bg = over(l, bg)
    const fg = P(cs.color); if (!fg) { unparsed.add(cs.color); continue }
    const t = over(fg, bg)
    const ra = (Math.max(L(t), L(bg)) + 0.05) / (Math.min(L(t), L(bg)) + 0.05)
    if (Number.isNaN(ra)) { unparsed.add('NaN from ' + cs.color); continue }
    const px = parseFloat(cs.fontSize), w = parseInt(cs.fontWeight) || 400
    const need = (px >= 24 || (px >= 18.66 && w >= 700)) ? 3 : 4.5
    if (ra + 0.02 < need) out.push({ cls: String(el.className).slice(0, 30), px: +px.toFixed(1), w,
      ratio: +ra.toFixed(3), need, fg: cs.color, bg: 'rgb(' + bg.slice(0, 3).map(Math.round).join(',') + ')',
      cur: !!(el.closest('.cd-geo-note') && el.closest('.cd-geo-note').classList.contains('is-current')),
      t: own.slice(0, 34) })
  }
  return { selftest, fails: out.sort((a, b) => a.ratio - b.ratio), unparsed: [...unparsed].slice(0, 6) }
})()
