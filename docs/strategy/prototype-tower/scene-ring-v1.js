/* Score reveal: "Ring the Bell".
   Deterministic canvas scene. render(ctx, t) draws clip time t (seconds). No wall clock.

   Physics, all at the panel's true scale (2.56 px per mm):
   - stage gravity is half of real gravity: 4.905 m/s^2 x 2560 px/m = 12,557 px/s^2
   - the charge is launched with v0 = sqrt(2 g d) so it stops exactly at its apex (ballistic rise)
   - the integer is released above the glass and falls under the same gravity onto the plate
   - the plate is a damped spring (k 900, c 28, m 1) excited by impulses; the integer rides it
   - every drop, drain and fall uses the same g, so durations come from distances */
const Scene = (() => {
  const W = 1080, H = 3840
  const G = 12557

  const C = {
    ground: '#0B0908', raised: '#1C1817', white: '#FFFFFF',
    red: '#EB1110', red900: '#5E0606', yellow: '#FFAB00', black: '#000000',
  }
  const ORB = 'Orbitron', NUM = '"Saira ExtraCondensed"', INTER = 'Inter'

  // ---- geometry ---------------------------------------------------------------------------
  const GEO = {
    measure: [64, 976],
    rail: { x: 1028, w: 32, top: 560, bottom: 3720 },
    bell: { x: 1024, y: 512, size: 40 },
    crown: { baseline: 352 },
    plate: { x: 64, w: 996, y: 364, h: 140, labelX: 96, baseline: 478 },
    replay: { x: 64, y: 552, w: 912, h: 1216 },
    claim: { y: 1832, tile: 396, module: 12, colX: 508 },
    again: { y1: 2451, y2: 2563, sub: 2643 },
    notice: [3600, 3648],
    base: { y: 3720, h: 120 },
    todayLine: 1196,
  }
  // tower scale: y = 3840 - h * 3280, h = score / bell
  const towerY = (h) => 3840 - h * 3280

  // ---- the hit ------------------------------------------------------------------------------
  const HIT = { integer: '736,582', decimals: '.240', value: 736582.24, bell: 812406 }
  const APEX = towerY(HIT.value / HIT.bell) // 866

  // ---- timeline (clip seconds) ----------------------------------------------------------------
  const T = { contact: 0.6, launch: 0.72 }
  T.rise = Math.sqrt(2 * (3840 - APEX) / G) // 0.688
  T.v0 = G * T.rise
  T.apex = T.launch + T.rise // 1.408
  T.hang = 0.24
  T.release = T.apex + T.hang // 1.648
  T.dropDist = GEO.crown.baseline + 30 // 382
  T.dropDur = Math.sqrt(2 * T.dropDist / G) // 0.247
  T.land = T.release + T.dropDur // 1.895
  T.decimals = T.land + 0.14
  T.drain = T.land + 0.2
  T.drainDur = Math.sqrt(2 * (3840 - APEX) / G) // 0.688
  T.wipe = T.land + 0.28
  T.label = T.land + 0.46
  T.floor = T.drain + T.drainDur
  T.settle = T.floor
  T.replayStart = T.settle + 0.32
  T.end = 9.0
  // replay loop: 1.7 s real, 2.4 s at 0.25x (0.6 s of footage) around contact, 0.7 s real
  const REPLAY_LOOP = 4.8, REPLAY_CONTACT = 2.9
  T.replayContact = T.replayStart + REPLAY_CONTACT

  const passT = (y) => { // when the rising edge crosses y
    const d = 3840 - y, a = G / 2, b = -T.v0
    const disc = b * b - 4 * a * d
    if (disc < 0) return Infinity
    return T.launch + (-b - Math.sqrt(disc)) / (2 * a)
  }
  T.today = passT(GEO.todayLine)

  // ---- maths -------------------------------------------------------------------------------------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
  const lerp = (a, b, t) => a + (b - a) * t
  const seg = (t, a, d) => clamp((t - a) / d)
  const outCubic = (x) => 1 - Math.pow(1 - x, 3)
  const outQuad = (x) => 1 - (1 - x) * (1 - x)
  const inOutSine = (x) => -(Math.cos(Math.PI * x) - 1) / 2
  const outBack = (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2)

  // damped spring impulse response: k 900, c 28, m 1
  const SPR = (() => { const w = 30, z = 28 / (2 * w), wd = w * Math.sqrt(1 - z * z); return { w, z, wd } })()
  const springImpulse = (dt, v0) => dt < 0 ? 0 : (v0 / SPR.wd) * Math.exp(-SPR.z * SPR.w * dt) * Math.sin(SPR.wd * dt)
  const plateKicks = () => [[T.land, 950], [T.decimals, 180], [T.label, 180], [T.replayContact, 250]]
  const plateOffset = (t) => plateKicks().reduce((s, [t0, v]) => s + springImpulse(t - t0, v), 0)

  function canvasOffset(t) {
    // contact: the cabinet jolts up 16 px in 50 ms, returns in 200 ms with a 3 px overshoot
    let y = 0
    const c = t - T.contact
    if (c >= 0 && c < 0.05) y = -16 * outCubic(c / 0.05)
    else if (c >= 0.05 && c < 0.25) y = -16 * (1 - outBack((c - 0.05) / 0.2, 1.2))
    // landing: a vertical judder in 50 ms steps
    const l = t - T.land
    const steps = [22, -12, 6, -2, 0]
    if (l >= 0 && l < 0.25) y += steps[Math.min(4, Math.floor(l / 0.05))]
    return y
  }

  // ---- assets ---------------------------------------------------------------------------------------
  const imgs = {}
  const load = (k, src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => { imgs[k] = i; res() }; i.onerror = () => rej(new Error('image ' + src)); i.src = src })
  const font = (ctx, w, s, fam, track = 0) => { ctx.font = `${w} ${s}px ${fam}`; ctx.letterSpacing = `${(s * track).toFixed(2)}px` }
  function cover(ctx, img, x, y, w, h, zoom = 1, fx = 0.5, fy = 0.4, mirror = false) {
    const s = Math.max(w / img.width, h / img.height) * zoom
    const iw = img.width * s, ih = img.height * s
    ctx.save()
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip()
    if (mirror) { ctx.translate(x * 2 + w, 0); ctx.scale(-1, 1) }
    ctx.drawImage(img, x + (w - iw) * fx, y + (h - ih) * fy, iw, ih)
    ctx.restore()
  }

  // ---- numerals in fixed cells ------------------------------------------------------------------------
  const INT = { size: 344, cell: 138, comma: 84 }
  const DEC = { size: 120, cell: 48, point: 29 }
  function drawCells(ctx, str, x, baseline, spec, alphaFor) {
    font(ctx, 900, spec.size, NUM)
    ctx.textAlign = 'center'
    let cx = x
    for (let i = 0; i < str.length; i++) {
      const ch = str[i]
      const sep = ch === ',' || ch === '.'
      const w = sep ? (spec.comma || spec.point) : spec.cell
      ctx.globalAlpha = alphaFor ? alphaFor(i, ch) : 1
      ctx.fillText(ch, cx + w / 2, baseline)
      cx += w
    }
    ctx.globalAlpha = 1
    return cx - x
  }

  // ---- layers ---------------------------------------------------------------------------------------------
  function drawRail(ctx, t) {
    const R = GEO.rail
    ctx.fillStyle = 'rgba(255,255,255,0.16)'
    ctx.fillRect(R.x, R.top, R.w, R.bottom - R.top)
    drawBell(ctx, GEO.bell.x, GEO.bell.y, GEO.bell.size)
    // TODAY tick with its rotated label
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillRect(R.x, GEO.todayLine - 3, R.w, 6)
    ctx.save()
    ctx.translate(1006, GEO.todayLine + 8)
    ctx.rotate(-Math.PI / 2)
    font(ctx, 700, 36, ORB, 0.04)
    ctx.fillStyle = 'rgba(255,255,255,0.64)'
    ctx.textAlign = 'left'
    ctx.fillText('TODAY', 0, 12)
    ctx.restore()
    // red fill follows the charge up, then stays to the notch
    let top = null
    if (t >= T.launch && t < T.apex) top = edgeY(t)
    else if (t >= T.apex) top = APEX
    if (top !== null) {
      ctx.fillStyle = C.red
      ctx.fillRect(R.x, top, R.w, R.bottom - top)
    }
    // gap from the notch up to the target, fades in last
    const gap = outCubic(seg(t, T.settle + 0.64, 0.32))
    if (gap > 0) {
      ctx.fillStyle = `rgba(255,255,255,${0.4 * gap})`
      ctx.fillRect(R.x, R.top, R.w, APEX - 5 - R.top)
    }
    // notch
    if (t >= T.apex) {
      const pulse = t >= T.replayContact ? Math.max(0, 1 - (t - T.replayContact) / 0.3) : 0
      const nh = 10 + 2 * Math.sin(Math.PI * clamp(pulse))
      ctx.fillStyle = C.white
      ctx.fillRect(R.x - 4, APEX - nh / 2, 40, nh)
    }
  }

  function drawBell(ctx, x, y, s) {
    ctx.save()
    ctx.translate(x + s / 2, y + 4)
    ctx.fillStyle = 'rgba(255,255,255,0.64)'
    ctx.beginPath()
    ctx.moveTo(-s * 0.36, s * 0.72)
    ctx.quadraticCurveTo(-s * 0.36, s * 0.12, 0, s * 0.1)
    ctx.quadraticCurveTo(s * 0.36, s * 0.12, s * 0.36, s * 0.72)
    ctx.lineTo(s * 0.46, s * 0.8)
    ctx.lineTo(-s * 0.46, s * 0.8)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath(); ctx.arc(0, s * 0.9, s * 0.1, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }

  function edgeY(t) {
    if (t < T.launch) return 3840
    if (t < T.apex) { const x = t - T.launch; return 3840 - (T.v0 * x - G * x * x / 2) }
    if (t < T.drain) return APEX
    const x = t - T.drain
    return Math.min(3840, APEX + G * x * x / 2)
  }
  function edgeV(t) {
    if (t >= T.launch && t < T.apex) return T.v0 - G * (t - T.launch)
    if (t >= T.drain && t < T.floor) return G * (t - T.drain)
    return 0
  }

  function drawCharge(ctx, t) {
    if (t < T.launch || t >= T.floor) return
    const y = edgeY(t)
    const v = edgeV(t)
    ctx.fillStyle = C.red
    ctx.fillRect(0, y, W, H - y)
    const thick = t >= T.apex && t < T.drain ? lerp(16, 28, outCubic(seg(t, T.apex, 0.12))) : 16
    const smear = v / 120
    const rising = t < T.apex
    ctx.fillStyle = C.white
    ctx.fillRect(0, y - thick / 2, W, thick)
    if (smear > 1) {
      const g = rising
        ? ctx.createLinearGradient(0, y + thick / 2, 0, y + thick / 2 + smear)
        : ctx.createLinearGradient(0, y - thick / 2, 0, y - thick / 2 - smear)
      g.addColorStop(0, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      if (rising) ctx.fillRect(0, y + thick / 2, W, smear)
      else ctx.fillRect(0, y - thick / 2 - smear, W, smear)
    }
  }

  function drawTodayLine(ctx, t) {
    if (t < T.launch) return
    const y = GEO.todayLine
    const draw = outCubic(seg(t, T.launch, 0.12))
    if (t < T.today) {
      ctx.fillStyle = C.white
      ctx.fillRect(0, y - 3, W * draw, 6)
      return
    }
    const x = t - T.today
    if (x > 0.4) return
    const a = 1 - x / 0.4
    const fall = G * x * x / 2
    const rot = 6 * Math.PI / 180 * outCubic(clamp(x / 0.15))
    ctx.fillStyle = `rgba(255,255,255,${a})`
    ctx.save(); ctx.translate(0, y + fall); ctx.rotate(rot); ctx.fillRect(0, -3, 540, 6); ctx.restore()
    ctx.save(); ctx.translate(W, y + fall); ctx.rotate(-rot); ctx.fillRect(-540, -3, 540, 6); ctx.restore()
  }

  function drawPlate(ctx, t) {
    const P = GEO.plate
    const off = plateOffset(t)
    const y = P.y + off
    ctx.fillStyle = C.raised
    ctx.fillRect(P.x, y, P.w, P.h)
    const wipe = outCubic(seg(t, T.wipe, 0.18))
    if (wipe > 0) {
      const cx = 570, left = cx - (cx - P.x) * wipe, right = cx + (P.x + P.w - cx) * wipe
      ctx.fillStyle = C.red
      ctx.fillRect(left, y, right - left, P.h)
    }
    const inFlare = t >= T.land && t < T.land + 0.2
    const edge = 4 + (inFlare ? 8 * Math.sin(Math.PI * (t - T.land) / 0.2) : 0)
    ctx.fillStyle = `rgba(255,255,255,${inFlare ? 0.8 : 0.18})`
    ctx.fillRect(P.x, y, P.w, edge)
    return off
  }

  function drawStamp(ctx, t, t0, draw) {
    if (t < t0) return
    const k = outCubic(seg(t, t0, 0.16))
    const s = lerp(1.3, 1.0, k)
    ctx.save()
    ctx.globalAlpha = clamp((t - t0) / 0.05)
    draw(s)
    ctx.restore()
  }

  function drawCrown(ctx, t) {
    const off = drawPlate(ctx, t)
    const P = GEO.plate
    const base = GEO.crown.baseline
    const x0 = GEO.measure[0]
    ctx.fillStyle = C.white
    if (t < T.land) {
      let a = 0.08
      if (t >= T.apex) a = lerp(0.08, 0.18, seg(t, T.apex, T.hang))
      drawCells(ctx, '000,000', x0, base + off, INT, () => a)
    }
    if (t >= T.release) {
      let by = base, sx = 1, sy = 1
      if (t < T.land) {
        const x = t - T.release
        by = -30 + G * x * x / 2
        const v = x / T.dropDur
        sy = 1 + 0.06 * v; sx = 1 - 0.03 * v
      } else {
        const l = t - T.land
        if (l < 1 / 60) { sy = 0.88; sx = 1.05 }
        else if (l < 0.116) { const k = outQuad(seg(l, 1 / 60, 0.1)); sy = lerp(0.88, 1.04, k); sx = lerp(1.05, 0.99, k) }
        else { const k = inOutSine(seg(l, 0.116, 0.2)); sy = lerp(1.04, 1, k); sx = lerp(0.99, 1, k) }
        by = base + off
      }
      const cx = x0 + 456
      ctx.save()
      ctx.translate(cx, by); ctx.scale(sx, sy); ctx.translate(-cx, -by)
      ctx.fillStyle = C.white
      drawCells(ctx, HIT.integer, x0, by, INT)
      ctx.restore()
    }
    drawStamp(ctx, t, T.decimals, (s) => {
      const w = 3 * DEC.cell + DEC.point
      const x = GEO.measure[1] - w
      const cy = P.baseline + off - 40
      ctx.translate(x + w / 2, cy); ctx.scale(s, s); ctx.translate(-(x + w / 2), -cy)
      ctx.fillStyle = C.white
      drawCells(ctx, HIT.decimals, x, P.baseline + off, DEC)
    })
    drawStamp(ctx, t, T.label, (s) => {
      const cy = P.baseline + off - 26
      ctx.translate(P.labelX + 330, cy); ctx.scale(s, s); ctx.translate(-(P.labelX + 330), -cy)
      font(ctx, 900, 72, ORB, 0.04)
      ctx.fillStyle = C.white; ctx.textAlign = 'left'
      ctx.fillText("TODAY'S BEST", P.labelX, P.baseline + off)
    })
  }

  function drawArmed(ctx, t) {
    const R = GEO.replay
    if (t < T.contact) {
      cover(ctx, imgs.cam, R.x, R.y, R.w, R.h, 1.04 + 0.02 * t, 0.5, 0.3, true)
      font(ctx, 700, 40, ORB, 0.04)
      const w = ctx.measureText("YOU'RE ON CAMERA").width
      ctx.fillStyle = 'rgba(11,9,8,0.7)'
      ctx.fillRect(R.x, R.y, w + 64, 96)
      ctx.fillStyle = C.white; ctx.textAlign = 'left'
      ctx.fillText("YOU'RE ON CAMERA", R.x + 32, 616)
    }
    const c = t - T.contact
    if (c < 0.45) {
      const fall = c > 0 ? G * c * c / 2 : 0
      ctx.globalAlpha = c > 0 ? clamp(1 - c / 0.3) : 1
      font(ctx, 900, 160, ORB, 0.04)
      ctx.fillStyle = C.white; ctx.textAlign = 'left'
      ctx.fillText('HIT IT', GEO.measure[0], 1947 + fall)
      ctx.globalAlpha = 1
    }
  }

  function settleIn(t, i) { const k = outCubic(seg(t, T.settle + i * 0.08, 0.32)); return { a: k, dy: 24 * (1 - k) } }

  function drawReplay(ctx, t) {
    const R = GEO.replay
    const s = settleIn(t, 0)
    if (s.a <= 0) return
    ctx.save()
    ctx.globalAlpha = s.a
    ctx.translate(0, s.dy)
    let zoom = 1.02
    if (t >= T.replayStart) {
      const u = (t - T.replayStart) % REPLAY_LOOP
      let footage
      if (u < 1.7) footage = u
      else if (u < 4.1) footage = 1.7 + (u - 1.7) * 0.25
      else footage = 2.3 + (u - 4.1)
      zoom = 1.0 + 0.06 * footage / 3.0
      const toContact = footage - 2.0
      if (Math.abs(toContact) < 0.08) zoom += 0.02 * (1 - Math.abs(toContact) / 0.08)
    }
    cover(ctx, imgs.cam, R.x, R.y, R.w, R.h, zoom, 0.46, 0.3)
    if (t < T.replayStart) { ctx.fillStyle = 'rgba(11,9,8,0.35)'; ctx.fillRect(R.x, R.y, R.w, R.h) }
    const u = t >= T.replayStart ? ((t - T.replayStart) % REPLAY_LOOP) / REPLAY_LOOP : 0
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(R.x, R.y + R.h - 8, R.w, 8)
    ctx.fillStyle = C.red; ctx.fillRect(R.x, R.y + R.h - 8, R.w * u, 8)
    ctx.fillStyle = C.white; ctx.fillRect(R.x + R.w * (REPLAY_CONTACT / REPLAY_LOOP) - 2, R.y + R.h - 16, 4, 16)
    ctx.restore()
  }

  function drawClaim(ctx, t) {
    const s = settleIn(t, 1)
    if (s.a <= 0) return
    const K = GEO.claim
    ctx.save()
    ctx.globalAlpha = s.a
    ctx.translate(0, s.dy)
    const x = GEO.measure[0], y = K.y
    ctx.fillStyle = C.white; ctx.fillRect(x, y, K.tile, K.tile)
    const n = QR_MATRIX.length, qs = n * K.module, ox = x + (K.tile - qs) / 2, oy = y + (K.tile - qs) / 2
    ctx.fillStyle = C.black
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (QR_MATRIX[r][c]) ctx.fillRect(ox + c * K.module, oy + r * K.module, K.module, K.module)
    ctx.fillStyle = C.white; ctx.textAlign = 'left'
    font(ctx, 900, 88, ORB, 0.04)
    ctx.fillText('KEEP', K.colX, 1895)
    ctx.fillText('THIS HIT', K.colX, 1991)
    font(ctx, 600, 40, INTER)
    ctx.fillText('Scan with your camera.', K.colX, 2063)
    ctx.fillText('No app needed.', K.colX, 2115)
    font(ctx, 600, 36, INTER); ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fillText('Or type this at pnch.app', K.colX, 2171)
    font(ctx, 900, 64, ORB, 0.08); ctx.fillStyle = C.white
    ctx.fillText('KTR BVM', K.colX, 2228)
    ctx.restore()
  }

  function drawAgain(ctx, t) {
    const s = settleIn(t, 2)
    if (s.a <= 0) return
    const A = GEO.again
    ctx.save()
    ctx.globalAlpha = s.a
    ctx.translate(0, s.dy)
    ctx.fillStyle = C.white; ctx.textAlign = 'left'
    font(ctx, 900, 104, ORB, 0.04)
    ctx.fillText('NOW RING', GEO.measure[0], A.y1)
    ctx.fillText('THE BELL', GEO.measure[0], A.y2)
    font(ctx, 700, 48, INTER)
    ctx.fillText('Tap your card to go again.', GEO.measure[0], A.sub)
    const ax = 900, ay = A.sub - 48
    ctx.fillRect(ax - 5, ay, 10, 44)
    ctx.beginPath(); ctx.moveTo(ax - 22, ay + 36); ctx.lineTo(ax + 22, ay + 36); ctx.lineTo(ax, ay + 64); ctx.closePath(); ctx.fill()
    ctx.restore()
  }

  function drawRunway(ctx) {
    font(ctx, 600, 36, INTER)
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.textAlign = 'left'
    ctx.fillText('Every hit is filmed for its replay.', GEO.measure[0], GEO.notice[0])
    ctx.fillText('Replays nobody keeps are deleted.', GEO.measure[0], GEO.notice[1])
  }

  function drawBase(ctx, t) {
    const c = t - T.contact
    ctx.fillStyle = c >= 0 && c < 0.3 ? C.red : C.red900
    ctx.fillRect(0, GEO.base.y, W, GEO.base.h)
    const f = t - T.floor
    if (f >= 0 && f < 0.3) { ctx.fillStyle = `rgba(235,17,16,${1 - f / 0.3})`; ctx.fillRect(0, GEO.base.y, W, GEO.base.h) }
  }

  function render(ctx, t) {
    ctx.save()
    ctx.fillStyle = C.ground
    ctx.fillRect(0, 0, W, H)
    ctx.translate(0, canvasOffset(t))
    ctx.fillStyle = C.ground
    ctx.fillRect(0, -40, W, H + 80)
    drawRunway(ctx)
    drawBase(ctx, t)
    drawArmed(ctx, t)
    drawReplay(ctx, t)
    drawClaim(ctx, t)
    drawAgain(ctx, t)
    drawRail(ctx, t)
    drawTodayLine(ctx, t)
    drawCharge(ctx, t)
    drawCrown(ctx, t)
    ctx.restore()
  }

  return {
    DURATION: T.end,
    T, APEX,
    async init() { await load('cam', '/assets/camera/7187919.jpg') },
    render,
  }
})()
