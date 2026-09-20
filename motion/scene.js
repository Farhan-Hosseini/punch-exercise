/* PunchApp score reveal, final spec (revision 2), section 6.
   A deterministic canvas scene: drawMachine(ctx, t) paints the 1080 x 3840 glass at clip
   time t in seconds. Nothing reads the wall clock, so every exported frame is exactly the
   instant it claims to be.

   One gravity constant drives every rise and fall (12,557 px/s^2 at 2.56 px/mm).
   The charge launches when the reading is in (t 400 ms after contact), loses a fifth of
   its speed breaking the friend's mark, stops at the hit's true height and holds there
   while the integer falls onto the plate. Shakes are vertical only. No full-field flash. */
const Scene = (() => {
  const W = 1080, H = 3840
  const G = 12557
  const C = {
    ink950: '#0B0908', ink900: '#1C1817', white: '#FFFFFF', red: '#EB1110',
    red800: '#750808', red900: '#5E0606', qrGround: '#D9D9D9', black: '#000000',
  }
  const ORB = 'Orbitron', NUM = '"Saira ExtraCondensed"', INTER = 'Inter'
  const w = (a) => `rgba(255,255,255,${a})`

  // ---- geometry (spec 2.3) ------------------------------------------------------------------
  const X0 = 104, X1 = 1016
  const RAIL = { x: 16, w: 48, top: 504, bottom: 3720 }
  const PLATE = { y: 364, h: 140, labelX: 136, base: 478 }
  const CROWN_BASE = 352
  const Z2 = { x: 104, y: 552, w: 912, h: 1216 }
  const Z3 = { headBase: 1872, tile: { x: 104, y: 1880, s: 561, module: 17, quiet: 68 }, stills: { x: 696, y: 1880, w: 96, h: 128, gap: 16 }, col: 696 }
  const Z4 = { h1: 2560, h2: 2672, pay: 2752, n1: 2828, n2: 2878 }
  const towerY = (h) => 3840 - Math.min(h, 1) * 3336

  // ---- the scenario (spec 5.0) ------------------------------------------------------------------
  const HERO = { integer: '402,176', decimals: '.240', y: 1744 }
  const FRIEND_Y = 2180, TODAY_Y = 1384

  // ---- timeline in seconds from contact; clip time = t + 0.6 ------------------------------------
  const LEAD = 0.6
  const T = {}
  T.launch = 0.4
  const d1 = 3840 - FRIEND_Y, d2 = FRIEND_Y - HERO.y
  T.v0 = Math.sqrt(2 * G * d1 + 2 * G * d2 / 0.64) // 7,668 px/s
  T.v1 = Math.sqrt(T.v0 * T.v0 - 2 * G * d1) // 4,136 px/s at the mark
  T.toMark = (T.v0 - T.v1) / G // 281 ms
  T.mark = T.launch + T.toMark // 0.681
  T.stop = 0.05
  T.resume = T.mark + T.stop // 0.731
  T.v2 = 0.8 * T.v1 // 3,309 px/s
  T.apex = T.resume + T.v2 / G // 0.995
  T.hang = 0.24
  T.release = T.apex + T.hang // 1.235
  T.fallDist = CROWN_BASE + 64 // 416
  T.land = T.release + Math.sqrt(2 * T.fallDist / G) // 1.492
  T.label = T.land + 0.3 // 1.792
  T.still0 = T.label + 0.16 // stillness from 1.952
  T.drain = T.still0 + 0.6 // 2.552
  T.floor = T.drain + Math.sqrt(2 * (3840 - HERO.y) / G) // 3.130
  T.newStill = T.drain + 0.08 // 2.632
  T.replay = T.drain + 0.24 // 2.792
  T.z4 = T.drain + 0.32 // 2.872
  T.tab = T.replay + 0.12 // 2.912
  T.contactReplay = T.replay + 1.2 // 3.992
  T.slowEnd = T.replay + 2.4 // 5.192
  T.realEnd = T.slowEnd + 0.7 // 5.892
  T.end = 6.4

  // ---- maths --------------------------------------------------------------------------------------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
  const lerp = (a, b, k) => a + (b - a) * k
  const seg = (t, a, d) => clamp((t - a) / d)
  const outCubic = (x) => 1 - Math.pow(1 - x, 3)
  const inCubic = (x) => x * x * x
  const outQuad = (x) => 1 - (1 - x) * (1 - x)
  const inOutSine = (x) => -(Math.cos(Math.PI * x) - 1) / 2
  function bezier(x1, y1, x2, y2) { // CSS cubic-bezier as a function of progress
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
    const sx = (u) => ((ax * u + bx) * u + cx) * u
    const sy = (u) => ((ay * u + by) * u + cy) * u
    const dx = (u) => (3 * ax * u + 2 * bx) * u + cx
    return (x) => { let u = x; for (let i = 0; i < 8; i++) { const e = sx(u) - x; const d = dx(u); if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break; u -= e / d } return sy(clamp(u)) }
  }
  const recoil = bezier(0.34, 1.56, 0.64, 1)
  // plate spring k 900, c 28, m 1: impulse response
  const SPR = { w: 30, z: 28 / 60 }; SPR.wd = SPR.w * Math.sqrt(1 - SPR.z * SPR.z)
  const impulse = (dt, v) => dt < 0 ? 0 : (v / SPR.wd) * Math.exp(-SPR.z * SPR.w * dt) * Math.sin(SPR.wd * dt)

  function edgeY(t) {
    if (t < T.launch) return 3840
    if (t < T.mark) { const x = t - T.launch; return 3840 - (T.v0 * x - G * x * x / 2) }
    if (t < T.resume) return FRIEND_Y
    if (t < T.apex) { const x = t - T.resume; return FRIEND_Y - (T.v2 * x - G * x * x / 2) }
    if (t < T.drain) return HERO.y
    const x = t - T.drain
    return Math.min(3860, HERO.y + G * x * x / 2)
  }
  function edgeV(t) {
    if (t >= T.launch && t < T.mark) return T.v0 - G * (t - T.launch)
    if (t >= T.resume && t < T.apex) return T.v2 - G * (t - T.resume)
    if (t >= T.drain && t < T.floor) return G * (t - T.drain)
    return 0
  }
  function canvasY(t) {
    let y = 0
    const c = t
    if (c >= 0 && c < 0.05) y = -16 * outCubic(c / 0.05)
    else if (c >= 0.05 && c < 0.25) y = -16 * (1 - recoil((c - 0.05) / 0.2))
    const l = t - T.land
    const keys = [22, -12, 6, -2, 0]
    if (l >= 0 && l < 0.2) { const i = Math.floor(l / 0.05); y += lerp(keys[i], keys[i + 1], (l - i * 0.05) / 0.05) }
    return y
  }
  const plateY = (t) => impulse(t - T.land, 950) + impulse(t - T.label, 180)

  // ---- assets and text helpers -----------------------------------------------------------------------
  const imgs = {}
  const load = (k, src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => { imgs[k] = i; res() }; i.onerror = () => rej(new Error('image ' + src)); i.src = src })
  const font = (ctx, weight, size, fam, track = 0) => { ctx.font = `${weight} ${size}px ${fam}`; ctx.letterSpacing = `${(size * track).toFixed(2)}px` }
  function text(ctx, str, x, y, weight, size, fam, color, track = 0, align = 'left') {
    font(ctx, weight, size, fam, track); ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(str, x, y)
  }
  function cover(ctx, img, x, y, ww, hh, zoom = 1, fx = 0.5, fy = 0.5, dx = 0) {
    const s = Math.max(ww / img.width, hh / img.height) * zoom
    const iw = img.width * s, ih = img.height * s
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, ww, hh); ctx.clip()
    ctx.drawImage(img, x + (ww - iw) * fx + dx, y + (hh - ih) * fy, iw, ih)
    ctx.restore()
  }
  function cells(ctx, str, x, base, size, cell, sep, color) {
    font(ctx, 900, size, NUM); ctx.fillStyle = color; ctx.textAlign = 'center'
    let cx = x
    for (const ch of str) { const cw = (ch === ',' || ch === '.') ? sep : cell; ctx.fillText(ch, cx + cw / 2, base); cx += cw }
    return cx - x
  }

  // ---- layers -----------------------------------------------------------------------------------------
  function drawCharge(ctx, t) {
    if (t < T.launch || t >= T.floor) return
    const y = edgeY(t), v = edgeV(t)
    ctx.fillStyle = C.red
    ctx.fillRect(-20, y, W + 40, H + 40 - y)
    let thick = 16
    if (t >= T.apex && t < T.drain) thick = lerp(16, 28, outCubic(seg(t, T.apex, 0.12)))
    ctx.fillStyle = C.white
    ctx.fillRect(-20, y - thick / 2, W + 40, thick)
    const smear = v / 120
    if (smear > 1) {
      const rising = t < T.apex
      const y0 = rising ? y + thick / 2 : y - thick / 2
      const g = ctx.createLinearGradient(0, y0, 0, rising ? y0 + smear : y0 - smear)
      g.addColorStop(0, w(0.8)); g.addColorStop(1, w(0))
      ctx.fillStyle = g
      ctx.fillRect(-20, rising ? y0 : y0 - smear, W + 40, smear)
    }
  }

  function drawLines(ctx, t) {
    // today's line: draws at t 120, held through the stillness, retracts into the rail at settle
    if (t >= 0.12) {
      const k = outCubic(seg(t, 0.12, 0.12))
      let right = W * k
      if (t >= T.drain) right = lerp(W, RAIL.x + RAIL.w, inCubic(seg(t, T.drain, 0.24)))
      if (t < T.drain + 0.24) {
        ctx.fillStyle = w(0.24); ctx.fillRect(0, TODAY_Y - 3, right, 6)
        if (right > 300) text(ctx, 'TODAY', X0, TODAY_Y - 12, 700, 40, ORB, w(0.64 * clamp((right - 300) / 200)), 0.04)
      }
    }
    // the friend's run line
    if (t >= 0.2 && t < T.resume + 0.4) {
      if (t < T.resume) {
        const k = outCubic(seg(t, 0.2, 0.12))
        const thick = t >= T.mark ? lerp(4, 10, outCubic(seg(t, T.mark, 0.03))) : 4
        ctx.fillStyle = w(0.64); ctx.fillRect(0, FRIEND_Y - thick / 2, W * k, thick)
      } else {
        const x = t - T.resume, a = 1 - x / 0.4
        const fall = G * x * x / 2, slide = 80 * outCubic(clamp(x / 0.3)), rot = (6 * Math.PI / 180) * outCubic(clamp(x / 0.2))
        ctx.fillStyle = w(0.64 * a)
        ctx.save(); ctx.translate(540 - slide, FRIEND_Y + fall); ctx.rotate(-rot); ctx.fillRect(-540, -5, 540, 10); ctx.restore()
        ctx.save(); ctx.translate(540 + slide, FRIEND_Y + fall); ctx.rotate(rot); ctx.fillRect(0, -5, 540, 10); ctx.restore()
      }
    }
    // the apex edge left behind at settle, retracting into the rail
    if (t >= T.drain && t < T.drain + 0.24) {
      const right = lerp(W, RAIL.x + RAIL.w, inCubic(seg(t, T.drain, 0.24)))
      ctx.fillStyle = C.white; ctx.fillRect(0, HERO.y - 14, right, 28)
    }
  }

  function drawRail(ctx, t) {
    ctx.fillStyle = w(0.16); ctx.fillRect(RAIL.x, RAIL.top, RAIL.w, RAIL.bottom - RAIL.top)
    let top = null
    if (t >= T.launch && t < T.apex) top = edgeY(t)
    else if (t >= T.apex) top = HERO.y
    if (top !== null && top < RAIL.bottom) { ctx.fillStyle = C.red; ctx.fillRect(RAIL.x, Math.max(RAIL.top, top), RAIL.w, RAIL.bottom - Math.max(RAIL.top, top)) }
    // today tick
    ctx.fillStyle = w(0.64); ctx.fillRect(RAIL.x, TODAY_Y - 4, RAIL.w, 8)
    // the friend's tick: run top before this hit lands, plain after
    const friendTop = t < T.apex
    ctx.fillStyle = friendTop ? C.white : w(0.4); ctx.fillRect(RAIL.x, FRIEND_Y - 8, RAIL.w, 16)
    // notch
    if (t >= T.apex) {
      const s = lerp(1.3, 1, outCubic(seg(t, T.apex, 0.16)))
      let nh = 16
      const cb = t - T.contactReplay
      if (cb >= 0 && cb < 0.2) nh = lerp(16, 20, Math.sin(Math.PI * cb / 0.2))
      ctx.save(); ctx.translate(40, HERO.y); ctx.scale(s, s)
      ctx.fillStyle = C.white; ctx.fillRect(-28, -nh / 2, 56, nh)
      ctx.restore()
    }
  }

  function drawPlate(ctx, t) {
    const off = plateY(t)
    const y = PLATE.y + off
    ctx.fillStyle = C.ink900; ctx.fillRect(0, y, W, PLATE.h)
    // top edge: 4 px white 40% at rest, 12 px white on landing, 8 px on the replay contact beat
    let eh = 4, ea = 0.4
    const l = t - T.land
    if (l >= 0 && l < 0.2) { const k = Math.sin(Math.PI * l / 0.2); eh = lerp(4, 12, k); ea = lerp(0.4, 1, k) }
    const cb = t - T.contactReplay
    if (cb >= 0 && cb < 0.2) { const k = Math.sin(Math.PI * cb / 0.2); eh = lerp(4, 8, k); ea = lerp(0.4, 1, k) }
    ctx.fillStyle = w(ea); ctx.fillRect(0, y, W, eh)
    // the bell edge: the top of the tower
    ctx.fillStyle = C.white; ctx.fillRect(0, PLATE.y + PLATE.h - 12 + off, W, 12)
    return off
  }

  function drawCrown(ctx, t) {
    const off = drawPlate(ctx, t)
    // ghost cells until landing
    if (t < T.land) {
      let a = 0.08
      if (t >= T.apex) a = lerp(0.08, 0.18, seg(t, T.apex, T.hang))
      cells(ctx, '000,000', X0, CROWN_BASE + off, 344, 138, 84, w(a))
    }
    if (t >= T.release) {
      let base, sx = 1, sy = 1
      if (t < T.land) {
        const x = t - T.release
        base = -64 + G * x * x / 2
        const k = (G * x) / (G * (T.land - T.release))
        sy = 1 + 0.06 * k; sx = 1 - 0.03 * k
      } else {
        base = CROWN_BASE + off
        const l = t - T.land
        if (l < 0.033) { sy = 0.88; sx = 1.05 }
        else if (l < 0.133) { const k = outQuad(seg(l, 0.033, 0.1)); sy = lerp(0.88, 1.04, k); sx = lerp(1.05, 0.99, k) }
        else { const k = inOutSine(seg(l, 0.133, 0.2)); sy = lerp(1.04, 1, k); sx = lerp(0.99, 1, k) }
      }
      const cx = X0 + 456
      ctx.save(); ctx.translate(cx, base); ctx.scale(sx, sy); ctx.translate(-cx, -base)
      cells(ctx, HERO.integer, X0, base, 344, 138, 84, C.white)
      ctx.restore()
      if (t >= T.land) {
        // decimals cut in with the landing, static, white 64%
        cells(ctx, HERO.decimals, X1 - (29 + 3 * 48), PLATE.base + off, 120, 48, 29, w(0.64))
      }
    }
    if (t >= T.label) {
      const k = outCubic(seg(t, T.label, 0.16))
      const s = lerp(1.3, 1, k)
      ctx.save()
      ctx.globalAlpha = k
      const cy = PLATE.base + off - 23
      ctx.translate(PLATE.labelX, cy); ctx.scale(s, s); ctx.translate(-PLATE.labelX, -cy)
      text(ctx, 'RUN LEADER', PLATE.labelX, PLATE.base + off, 900, 64, ORB, C.white, 0.04)
      ctx.restore()
    }
  }

  function drawZ2(ctx, t) {
    // Armed: live camera, mirrored, until the camera blinks at contact
    if (t < 0) {
      cover(ctx, imgs.live, Z2.x, Z2.y, Z2.w, Z2.h, 1.02 + 0.02 * (t + LEAD), 0.5, 0.5)
      tab(ctx, "YOU'RE ON CAMERA", 1)
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(Z2.x, 1560, Z2.w, 208)
      return
    }
    if (t < 1 / 60) { ctx.fillStyle = C.black; ctx.fillRect(Z2.x, Z2.y, Z2.w, Z2.h); return }
    if (t < T.replay) return
    // Result: replay rises 24 px and fades in; the clip starts at the slow span
    const k = outCubic(seg(t, T.replay, 0.32))
    ctx.save(); ctx.globalAlpha = k; ctx.translate(0, 24 * (1 - k))
    // footage time: 0.6 s around contact at 0.25x, then 0.7 s real, then hold
    let ft
    if (t < T.slowEnd) ft = 1.2 + (t - T.replay) * 0.25
    else if (t < T.realEnd) ft = 1.8 + (t - T.slowEnd)
    else ft = 2.5
    // the placeholder still stands in for footage: a slow push and a small travel toward the pad,
    // with a one-frame jolt of 1.5% on the contact frame (footage time 1.5)
    const travel = (ft - 1.2) / 1.3
    let zoom = 1.04 + 0.05 * travel
    if (Math.abs(ft - 1.5) < 0.02) zoom += 0.015
    cover(ctx, imgs.replay, Z2.x, Z2.y, Z2.w, Z2.h, zoom, 0.5, 0.45, -18 * travel)
    // progress line with the contact tick (loop of 4.3 s: 1.2 real, 2.4 slow, 0.7 real)
    const loopPos = t < T.slowEnd ? (1.2 + (t - T.replay)) / 4.3 : Math.min(1, (3.6 + (t - T.slowEnd)) / 4.3)
    ctx.fillStyle = w(0.16); ctx.fillRect(Z2.x, 1760, Z2.w, 8)
    ctx.fillStyle = C.red; ctx.fillRect(Z2.x, 1760, Z2.w * loopPos, 8)
    ctx.fillStyle = C.white; ctx.fillRect(Z2.x + Z2.w * (2.4 / 4.3) - 2, 1752, 4, 16)
    const ta = t < T.tab ? 0 : (t < T.slowEnd ? seg(t, T.tab, 0.12) : 1 - seg(t, T.slowEnd, 0.12))
    if (ta > 0) tab(ctx, 'SLOW MOTION', ta)
    ctx.restore()
  }
  function tab(ctx, label, a) {
    font(ctx, 700, 40, ORB, 0.04)
    const tw = ctx.measureText(label).width
    ctx.save(); ctx.globalAlpha *= a
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(Z2.x, 576, tw + 32, 64)
    ctx.fillStyle = C.white; ctx.textAlign = 'left'; ctx.fillText(label, Z2.x + 16, 624)
    ctx.restore()
  }

  function drawHitIt(ctx, t) {
    if (t >= 0.3) return
    const x = Math.max(0, t)
    ctx.save()
    ctx.globalAlpha = t < 0 ? 1 : 1 - x / 0.3
    ctx.beginPath(); ctx.rect(Z2.x, Z2.y, Z2.w, Z2.h); ctx.clip()
    text(ctx, 'HIT IT', 136, 1720 + G * x * x / 2, 900, 160, ORB, C.white, 0.04)
    ctx.restore()
  }

  function drawZ3(ctx, t) {
    text(ctx, 'KEEP YOUR HITS', X0, Z3.headBase, 900, 72, ORB, C.white, 0.04)
    const T3 = Z3.tile
    ctx.fillStyle = C.qrGround; ctx.fillRect(T3.x, T3.y, T3.s, T3.s)
    const n = QR_MATRIX.length
    ctx.fillStyle = C.black
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (QR_MATRIX[r][c]) ctx.fillRect(T3.x + T3.quiet + c * T3.module, T3.y + T3.quiet + r * T3.module, T3.module, T3.module)
    // stills: Omar (hit 1), then Sara (this hit) slots in at settle
    const S = Z3.stills
    const kick = impulse(t - T.mark, 420)
    drawStill(ctx, imgs.omar, S.x, S.y - kick, t < T.newStill ? (t >= 0.2 && t < T.resume ? 'white' : (t < 0.2 ? 'white' : 'none')) : 'none', 1)
    if (t >= T.newStill) {
      const k = outCubic(seg(t, T.newStill, 0.16))
      const s = lerp(1.3, 1, k)
      const x = S.x + S.w + S.gap
      ctx.save(); ctx.globalAlpha = k
      ctx.translate(x + S.w / 2, S.y + S.h / 2); ctx.scale(s, s); ctx.translate(-(x + S.w / 2), -(S.y + S.h / 2))
      drawStill(ctx, imgs.sara, x, S.y, 'red', 1)
      ctx.restore()
    }
    text(ctx, 'No app needed.', Z3.col, 2208, 600, 36, INTER, C.white)
    text(ctx, 'Or type this', Z3.col, 2254, 600, 36, INTER, w(0.7))
    text(ctx, 'at pnch.app', Z3.col, 2300, 600, 36, INTER, w(0.7))
    text(ctx, 'KTR BXM', Z3.col, 2441, 900, 52, ORB, C.white, 0.08)
  }
  function drawStill(ctx, img, x, y, edge, a) {
    const S = Z3.stills
    ctx.save(); ctx.globalAlpha *= a
    cover(ctx, img, x, y, S.w, S.h, 1, 0.5, 0.35)
    if (edge === 'white') { ctx.fillStyle = C.white; ctx.fillRect(x, y, S.w, 6) }
    if (edge === 'red') { ctx.fillStyle = C.red; ctx.fillRect(x, y, S.w, 6) }
    ctx.restore()
  }

  function drawZ4(ctx, t) {
    if (t < T.z4) return
    const k = outCubic(seg(t, T.z4, 0.32))
    ctx.save(); ctx.globalAlpha = k; ctx.translate(0, 24 * (1 - k))
    text(ctx, 'WHO TOPS', X0, Z4.h1, 900, 104, ORB, C.white, 0.04)
    text(ctx, 'THAT?', X0, Z4.h2, 900, 104, ORB, C.white, 0.04)
    font(ctx, 700, 48, INTER)
    const pay = 'Pay at the reader to take a turn.'
    const pw = ctx.measureText(pay).width
    text(ctx, pay, X0, Z4.pay, 700, 48, INTER, C.white)
    arrow(ctx, X0 + pw + 24, Z4.pay - 18)
    text(ctx, 'Every hit is filmed for its replay.', X0, Z4.n1, 700, 40, INTER, C.white)
    text(ctx, 'Replays nobody keeps are deleted.', X0, Z4.n2, 700, 40, INTER, C.white)
    ctx.restore()
  }
  function arrow(ctx, x, cy) { // 64 px arrow pointing up and to the right, toward the reader beside the glass
    ctx.save(); ctx.translate(x + 32, cy); ctx.rotate(-Math.PI / 4)
    ctx.fillStyle = C.white
    ctx.fillRect(-28, -4, 42, 8)
    ctx.beginPath(); ctx.moveTo(32, 0); ctx.lineTo(10, -20); ctx.lineTo(10, 20); ctx.closePath(); ctx.fill()
    ctx.restore()
  }

  function drawBase(ctx, t) {
    let col = C.red900
    if (t >= 0 && t < T.floor) col = C.red
    ctx.fillStyle = col; ctx.fillRect(-20, 3720, W + 40, 160)
    const f = t - T.floor
    if (f >= 0 && f < 0.3) { ctx.fillStyle = `rgba(235,17,16,${1 - outCubic(f / 0.3)})`; ctx.fillRect(-20, 3720, W + 40, 160) }
  }

  function drawMachine(ctx, clip) {
    const t = clip - LEAD
    ctx.save()
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip()
    ctx.fillStyle = C.ink950; ctx.fillRect(0, 0, W, H)
    ctx.translate(0, canvasY(t))
    ctx.fillStyle = C.ink950; ctx.fillRect(-20, -40, W + 40, H + 80)
    drawBase(ctx, t)
    drawCharge(ctx, t)
    drawLines(ctx, t)
    drawZ2(ctx, t)
    drawZ3(ctx, t)
    drawZ4(ctx, t)
    drawRail(ctx, t)
    drawCrown(ctx, t)
    drawHitIt(ctx, t)
    ctx.restore()
  }

  // ---- presentation cut, 1920 x 1080 ----------------------------------------------------------------
  const BEATS = [
    [0, 'Armed', 'The next friend steps up. The run code is already on the glass.'],
    [LEAD, 'Contact', 'The panel jolts before any number exists.'],
    [LEAD + T.launch, 'Charge', 'It launches once the reading is in, under one gravity.'],
    [LEAD + T.mark, 'Break', "The friend's mark resists, freezes it for 50 ms and costs a fifth of its speed."],
    [LEAD + T.apex, 'Hang', 'Height has given the verdict. The number is still above the glass.'],
    [LEAD + T.release, 'Drop', 'The integer falls under the same gravity onto the plate.'],
    [LEAD + T.land, 'Landing', 'The plate flexes, the panel judders, the number never moves again.'],
    [LEAD + T.still0, 'Stillness', 'Height and number read together, even for eyes that looked up late.'],
    [LEAD + T.drain, 'Settle', 'The charge drains, the marks become the rail, the new still slots in.'],
    [LEAD + T.replay, 'Replay', 'Slow motion around contact. One code keeps the whole run.'],
  ]
  function renderPresent(ctx, clip) {
    const PW = 1920, PH = 1080
    ctx.fillStyle = C.ink950; ctx.fillRect(0, 0, PW, PH)
    // the column at full frame height: 1080 px stands for the 1.5 m panel
    const s = PH / H, colX = 120
    ctx.save(); ctx.translate(colX, 0); ctx.scale(s, s); drawMachine(ctx, clip); ctx.restore()
    ctx.fillStyle = w(0.14); ctx.fillRect(colX - 2, 0, 2, PH); ctx.fillRect(colX + W * s, 0, 2, PH)
    // two regions at three times the column's scale
    const cs = s * 3, cx = 520, cw = W * cs
    const crop = (y0, y1, top, label) => {
      ctx.save(); ctx.translate(cx, top); ctx.beginPath(); ctx.rect(0, 0, cw, (y1 - y0) * cs); ctx.clip()
      ctx.scale(cs, cs); ctx.translate(0, -y0); drawMachine(ctx, clip); ctx.restore()
      ctx.fillStyle = w(0.14); ctx.fillRect(cx, top - 2, cw, 2); ctx.fillRect(cx, top + (y1 - y0) * cs, cw, 2)
      text(ctx, label, cx, top - 18, 600, 20, INTER, w(0.56))
      // where this region sits on the column
      ctx.fillStyle = w(0.3); ctx.fillRect(colX + W * s + 10, y0 * s, 4, (y1 - y0) * s)
    }
    crop(0, 540, 96, 'Crown and plate, three times the column')
    crop(1740, 2262, 628, "The friend's mark and the run stills, same scale")
    // right column: what is happening and why
    const rx = 1500
    let idx = 0
    for (let i = 0; i < BEATS.length; i++) if (clip >= BEATS[i][0]) idx = i
    const beat = BEATS[idx]
    text(ctx, 'RING THE BELL', rx, 110, 700, 22, ORB, w(0.56), 0.06)
    text(ctx, beat[1].toUpperCase(), rx, 206, 900, 50, ORB, C.white, 0.04)
    font(ctx, 400, 25, INTER)
    wrap(ctx, beat[2], rx, 256, 340, 36, w(0.82))
    const ms = Math.round((clip - LEAD) * 1000)
    text(ctx, clip < LEAD ? 'Before contact' : ms + ' ms after contact', rx, 440, 600, 22, INTER, w(0.56))
    const ly = 520, lh = 40
    BEATS.forEach((b, i) => {
      const y = ly + i * lh
      const col = i === idx ? C.white : (i < idx ? w(0.56) : w(0.26))
      if (i === idx) { ctx.fillStyle = C.red; ctx.fillRect(rx, y - 18, 6, 24) }
      text(ctx, b[1], rx + 24, y, i === idx ? 700 : 500, 22, INTER, col)
    })
    const barY = ly + BEATS.length * lh + 8
    ctx.fillStyle = w(0.14); ctx.fillRect(rx, barY, 340, 4)
    ctx.fillStyle = C.red; ctx.fillRect(rx, barY, 340 * clamp(clip / (T.end + LEAD)), 4)
    font(ctx, 400, 18, INTER)
    wrap(ctx, 'Panel 1.5 m tall. One stage gravity, 12,557 px/s², drives every rise and fall.', rx, barY + 52, 340, 26, w(0.46))
  }
  function wrap(ctx, str, x, y, maxW, lh, color) {
    ctx.fillStyle = color; ctx.textAlign = 'left'
    const words = str.split(' '); let line = '', yy = y
    for (const wd of words) { const test = line ? line + ' ' + wd : wd; if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = wd; yy += lh } else line = test }
    if (line) ctx.fillText(line, x, yy)
  }

  return {
    DURATION: T.end + LEAD,
    T, LEAD,
    async init() {
      await Promise.all([
        load('live', '/assets/figma/live_sara_3x4.jpg'),
        load('replay', '/assets/figma/replay_sara_3x4.jpg'),
        load('omar', '/assets/figma/still_omar.jpg'),
        load('sara', '/assets/figma/still_sara.jpg'),
      ])
    },
    render(ctx, clip) { drawMachine(ctx, clip) },
    renderPresent,
  }
})()
