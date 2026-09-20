/* Score reveal: "The Tower".
   A deterministic canvas scene. render(ctx, t) draws the instant t (seconds);
   nothing reads the wall clock, so every exported frame is exactly its timestamp.

   Physical model
   - The strike launches a fill up the 1.5 m column with constant deceleration:
     height(u) = 2u - u^2 for u in [0,1], so velocity falls linearly to zero at the apex.
   - The counter is driven by the fill height, not by time, so the digits slow in lockstep.
   - After the hold, the fill falls with gravity (ease-in quad) while the number rises
     into the top strip: a counterweight.
   - Shakes are damped sines; the landing is a spring with one overshoot. */
const Scene = (() => {
  const W = 1080, H = 3840, M = 56
  const C = {
    black: '#000000', ink: '#0b0a0a', white: '#ffffff',
    red: '#eb1110', redHot: '#ff4a3d', redDeep: '#5e0606',
    yellow: '#ffab00', green: '#00c853', grey: 'rgba(255,255,255,0.5)',
  }

  // ---- the punch being revealed ------------------------------------------------------
  const SCORE = 612480.355
  const FLOOR = 3840, HOUSE_Y = 450
  const APEX_Y = 1040 // 83rd percentile on this machine
  const MARKS = [
    { y: HOUSE_Y, label: 'HOUSE RECORD', who: '@NOOR', kind: 'house' },
    { y: 1190, label: "TODAY'S BEST", who: '@LINA', kind: 'today' },
    { y: 1560, label: 'EARLIER', who: '@OMAR', kind: 'session' },
  ]

  // ---- timeline (seconds) -------------------------------------------------------------
  const T = {
    impact: 0.5,
    marksIn: 0.58,
    climb: 0.84, climbDur: 1.45,
    qualifier: 2.58,
    drain: 3.4, drainDur: 0.55,
    replay: 3.7,
    dock: 4.3,
    again: 4.8,
    end: 8.5,
  }
  T.apex = T.climb + T.climbDur

  const SHELF = 1700 // resting baseline of the number during the climb
  const NUM_SIZE = 360, NUM_SIZE_TOP = 300, NUM_X = 62
  const REPLAY = { x: M, y: 560, w: W - 2 * M, h: 1180 }
  const DOCK_Y = 1790

  const imgs = {}
  const load = (k, src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => { imgs[k] = i; res() }; i.onerror = () => rej(new Error('image ' + src)); i.src = src })

  // ---- maths ----------------------------------------------------------------------------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
  const lerp = (a, b, t) => a + (b - a) * t
  const seg = (t, a, d) => clamp((t - a) / d)
  const outExpo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x))
  const inQuad = (x) => x * x
  const inOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
  const spring = (x, zeta = 0.42, w = 18) => { if (x <= 0) return 0; const wd = w * Math.sqrt(1 - zeta * zeta); return 1 - Math.exp(-zeta * w * x) * (Math.cos(wd * x) + (zeta * w / wd) * Math.sin(wd * x)) }
  const shake = (t, t0, amp, dur, hz) => { const x = t - t0; if (x < 0 || x > dur) return [0, 0]; const d = Math.pow(1 - x / dur, 2); return [Math.sin(x * hz * 6.2832) * amp * d, Math.sin(x * hz * 6.2832 * 0.77 + 1.3) * amp * 0.66 * d] }
  const climbH = (t) => { const u = seg(t, T.climb, T.climbDur); return 2 * u - u * u }
  const passTime = (y) => { const k = (FLOOR - y) / (FLOOR - APEX_Y); if (k > 1) return Infinity; return T.climb + (1 - Math.sqrt(1 - k)) * T.climbDur }

  function edgeY(t) {
    if (t < T.climb) return FLOOR + 20
    if (t < T.drain) return lerp(FLOOR, APEX_Y, climbH(t))
    return lerp(APEX_Y, FLOOR + 40, inQuad(seg(t, T.drain, T.drainDur)))
  }

  // ---- drawing helpers ----------------------------------------------------------------------
  const font = (ctx, w, s, fam) => { ctx.font = `${w} ${s}px ${fam}` }
  const ORB = 'Orbitron', SAIRA = '"Saira ExtraCondensed"', INTER = 'Inter'
  function fit(ctx, text, w, s, fam, maxW) { let size = s; font(ctx, w, size, fam); while (ctx.measureText(text).width > maxW && size > 20) { size -= 2; font(ctx, w, size, fam) } return size }
  function cover(ctx, img, x, y, w, h, zoom = 1, fx = 0.5, fy = 0.4) {
    const s = Math.max(w / img.width, h / img.height) * zoom
    const iw = img.width * s, ih = img.height * s
    ctx.drawImage(img, x + (w - iw) * fx, y + (h - ih) * fy, iw, ih)
  }

  // Odometer: six fixed cells and a comma. `rate` is units per second; a drum turning
  // faster than nine glyphs a second is drawn as one glyph smeared along its travel.
  const CAP = 0.70
  function drawScore(ctx, value, rate, x, baseline, size, alpha = 1) {
    const cell = size * 0.404, comma = size * 0.231
    const pad = size * 0.09, D = size * CAP + 2 * pad
    font(ctx, 800, size, SAIRA)
    ctx.textAlign = 'center'
    ctx.fillStyle = C.white
    const V = Math.max(0, value)
    let cx = x
    for (let i = 0; i < 6; i++) {
      const place = Math.pow(10, 5 - i)
      const raw = V / place
      const whole = Math.floor(raw)
      const digit = whole % 10
      const spin = Math.abs(rate) / place
      const lead = whole === 0 && (i < 5 || V < 1)
      const centre = cx + cell / 2
      ctx.save()
      ctx.beginPath(); ctx.rect(cx - size * 0.05, baseline - size * CAP - pad, cell + size * 0.1, D); ctx.clip()
      if (spin > 9) {
        const n = 9
        for (let k = 0; k < n; k++) {
          const o = (k / (n - 1) - 0.5) * D * 0.7
          ctx.globalAlpha = alpha * (lead ? 0.08 : 0.17) * (1 - Math.abs(k / (n - 1) - 0.5))
          ctx.fillText(String(digit), centre, baseline + o)
        }
      } else {
        const r = place === 1 ? raw - whole : (V % place) / place
        let f = place === 1 ? r : Math.max(0, (r - 0.9) / 0.1)
        f = f < 0.5 ? 0.5 * Math.pow(2 * f, 3) : 1 - 0.5 * Math.pow(2 * (1 - f), 3)
        ctx.globalAlpha = alpha * (lead ? 0.2 : 1)
        ctx.fillText(String(digit), centre, baseline - f * D)
        if (f > 0.001) ctx.fillText(String((digit + 1) % 10), centre, baseline - f * D + D)
      }
      ctx.restore()
      cx += cell
      if (i === 2) { ctx.globalAlpha = alpha * (V < 1000 ? 0.2 : 1); ctx.fillText(',', cx + comma / 2, baseline); cx += comma }
    }
    ctx.globalAlpha = 1
    return cx - x
  }
  const scoreWidth = (size) => size * (0.404 * 6 + 0.231)

  // ---- scene layers ---------------------------------------------------------------------------
  function drawFill(ctx, t) {
    const y = edgeY(t)
    if (y >= H) return
    // slosh after the stop: the centre keeps travelling, the walls do not
    const dt = t - T.apex
    const A = t >= T.apex && t < T.drain ? 26 * Math.exp(-5.2 * dt) * Math.sin(6.2832 * 1.7 * dt) : 0
    const edge = (x) => y - A * 0.5 * (1 + Math.cos(6.2832 * (x / W - 0.5)))
    ctx.beginPath()
    ctx.moveTo(-60, H + 60)
    for (let x = -60; x <= W + 60; x += 20) ctx.lineTo(x, edge(x))
    ctx.lineTo(W + 60, H + 60)
    ctx.closePath()
    const g = ctx.createLinearGradient(0, y, 0, Math.min(H, y + 2600))
    g.addColorStop(0, C.redHot); g.addColorStop(0.04, C.red); g.addColorStop(1, C.redDeep)
    ctx.fillStyle = g
    ctx.fill()
    // hot leading edge
    ctx.save()
    ctx.shadowColor = 'rgba(255,90,70,0.9)'; ctx.shadowBlur = 60
    ctx.strokeStyle = C.white; ctx.lineWidth = 12
    ctx.beginPath()
    for (let x = -60; x <= W + 60; x += 20) (x === -60 ? ctx.moveTo : ctx.lineTo).call(ctx, x, edge(x))
    ctx.stroke()
    ctx.restore()
  }

  // where the number is this instant, so mark labels can step out of its way
  function numberBox(t) {
    if (t < T.marksIn) return null
    let baseline, size = NUM_SIZE
    if (t < T.apex) baseline = Math.min(SHELF, edgeY(t) - 70)
    else { const k = inOutCubic(seg(t, T.drain, T.drainDur)); baseline = lerp(APEX_Y - 70, 380, k); size = lerp(NUM_SIZE, NUM_SIZE_TOP, k) }
    return { top: baseline - size * CAP - 30, bottom: baseline + size * 0.16 }
  }

  function drawMarks(ctx, t, resultPhase) {
    const armed = outExpo(seg(t, T.marksIn, 0.3))
    const ey = edgeY(t)
    MARKS.forEach((m, i) => {
      const a = outExpo(seg(t, T.marksIn + i * 0.04, 0.22))
      if (a <= 0) return
      const pt = passTime(m.y)
      const passed = t >= pt && t < T.drain + 0.2
      const kickT = t - pt
      const kick = kickT > 0 && kickT < 0.6 ? -18 * Math.exp(-7 * kickT) * Math.cos(6.2832 * 2.2 * kickT) : 0
      const flash = kickT > 0 ? Math.exp(-5 * kickT) : 0
      const y = m.y + kick
      const inside = ey < m.y - 6 // the fill has covered this line
      const wLine = (W - 2 * M) * a
      if (resultPhase && m.kind !== 'house') return // result: only the house line keeps its full-width form
      let lineCol, lineH = m.kind === 'house' ? 8 : 6
      if (m.kind === 'house') lineCol = C.yellow
      else if (inside) lineCol = 'rgba(0,0,0,0.28)'
      else lineCol = `rgba(255,255,255,${0.5 + 0.5 * flash})`
      ctx.fillStyle = lineCol
      ctx.fillRect(M, y - lineH / 2, wLine, lineH)
      if (flash > 0.02 && !inside) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(M, y - 5, W - 2 * M, 10) }
      const nb = numberBox(t)
      const lyBase = m.kind === 'house' && t >= T.drain ? lerp(y - 30, y + 70, inOutCubic(seg(t, T.drain, 0.3))) : y - 30
      const labelTop = lyBase - 40, labelBottom = lyBase + 6
      const hidden = nb && labelBottom > nb.top && labelTop < nb.bottom
      const fadeInside = inside ? (t >= T.apex ? Math.max(0, 1 - (t - T.apex) / 0.2) * 0.55 : 0.55) : 1
      ctx.globalAlpha = a * fadeInside * (hidden ? 0 : 1)
      font(ctx, 700, 48, ORB); ctx.textAlign = 'left'
      ctx.fillStyle = inside ? 'rgba(0,0,0,0.55)' : (m.kind === 'house' ? C.yellow : C.white)
      const label = passed ? 'PASSED' : m.label
      const ly = m.kind === 'house' && t >= T.drain ? lerp(y - 30, y + 70, inOutCubic(seg(t, T.drain, 0.3))) : y - 30
      ctx.fillText(label, M, ly)
      font(ctx, 600, 52, INTER); ctx.textAlign = 'right'
      ctx.fillText(m.who, W - M, ly)
      ctx.globalAlpha = 1
    })
  }

  function drawReady(ctx, t) {
    ctx.fillStyle = C.black; ctx.fillRect(0, 0, W, H)
    // live mirrored feed in the eye band
    ctx.save()
    ctx.beginPath(); ctx.rect(REPLAY.x, REPLAY.y, REPLAY.w, REPLAY.h); ctx.clip()
    ctx.translate(W, 0); ctx.scale(-1, 1)
    cover(ctx, imgs.cam, W - REPLAY.x - REPLAY.w, REPLAY.y, REPLAY.w, REPLAY.h, 1.05 + t * 0.03, 0.5, 0.32)
    ctx.restore()
    const g = ctx.createLinearGradient(0, REPLAY.y + REPLAY.h - 520, 0, REPLAY.y + REPLAY.h)
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.78)')
    ctx.fillStyle = g; ctx.fillRect(REPLAY.x, REPLAY.y + REPLAY.h - 520, REPLAY.w, 520)
    ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(M + 44, REPLAY.y + 60, 14, 0, 6.2832); ctx.fill()
    font(ctx, 700, 44, ORB); ctx.fillStyle = C.white; ctx.textAlign = 'left'; ctx.fillText('LIVE', M + 76, REPLAY.y + 76)
    const s = fit(ctx, 'READY', 900, 240, ORB, REPLAY.w - 60)
    ctx.fillText('READY', M + 30, REPLAY.y + REPLAY.h - 70)
    MARKS.forEach((m) => {
      if (m.y > REPLAY.y && m.y < REPLAY.y + REPLAY.h) return
      ctx.fillStyle = m.kind === 'house' ? C.yellow : 'rgba(255,255,255,0.35)'
      ctx.fillRect(M, m.y - 3, W - 2 * M, 6)
    })
    // marks inside the feed as notches on its frame
    MARKS.forEach((m) => {
      if (!(m.y > REPLAY.y && m.y < REPLAY.y + REPLAY.h)) return
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.fillRect(0, m.y - 3, M - 12, 6); ctx.fillRect(W - M + 12, m.y - 3, M - 12, 6)
    })
    font(ctx, 900, 200, ORB)
    fit(ctx, 'HIT IT', 900, 200, ORB, W - 2 * M)
    ctx.fillStyle = C.white; ctx.textAlign = 'left'
    ctx.fillText('HIT IT', M, 2160)
  }

  function drawNumber(ctx, t) {
    if (t < T.marksIn) return
    const ey = edgeY(t)
    const intro = outExpo(seg(t, T.marksIn, 0.16))
    let baseline, size = NUM_SIZE, value, rate, scale = 1
    if (t < T.apex) {
      const u = seg(t, T.climb, T.climbDur)
      value = SCORE * (2 * u - u * u)
      rate = t >= T.climb ? SCORE * (2 - 2 * u) / T.climbDur : 0
      baseline = Math.min(SHELF, ey - 70)
    } else {
      value = Math.floor(SCORE); rate = 0
      const apexBase = APEX_Y - 70
      scale = lerp(1.1, 1, spring(t - T.apex))
      const k = inOutCubic(seg(t, T.drain, T.drainDur))
      baseline = lerp(apexBase, 380, k)
      size = lerp(NUM_SIZE, NUM_SIZE_TOP, k)
    }
    // bloom at the stamp
    const bl = t >= T.apex ? Math.exp(-3.2 * (t - T.apex)) : 0
    if (bl > 0.01) {
      const cy = baseline - size * 0.35
      const rg = ctx.createRadialGradient(W / 2, cy, 40, W / 2, cy, 760)
      rg.addColorStop(0, `rgba(255,60,40,${0.5 * bl})`); rg.addColorStop(1, 'rgba(255,60,40,0)')
      ctx.fillStyle = rg; ctx.fillRect(0, cy - 800, W, 1600)
    }
    const wNum = scoreWidth(size)
    const cx = NUM_X + wNum / 2, cy = baseline - size * 0.35
    ctx.save()
    ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-cx, -cy)
    drawScore(ctx, value, rate, NUM_X, baseline, size, intro)
    ctx.restore()
  }

  function drawQualifier(ctx, t) {
    if (t < T.qualifier) return
    const k = inOutCubic(seg(t, T.drain, T.drainDur))
    const a = outExpo(seg(t, T.qualifier, 0.24))
    const text = 'BEST TODAY'
    if (k <= 0) {
      const s = fit(ctx, text, 900, 120, ORB, W - 2 * M)
      ctx.globalAlpha = a
      ctx.fillStyle = C.white; ctx.textAlign = 'left'
      ctx.fillText(text, M, APEX_Y + 60 + s * 0.72 + 40 * (1 - a))
      ctx.globalAlpha = 1
    } else {
      // travels to the top strip, right-aligned, smaller
      const s = lerp(fit(ctx, text, 900, 120, ORB, W - 2 * M), 60, k)
      font(ctx, 900, s, ORB)
      const wText = ctx.measureText(text).width
      const x = lerp(M, W - M - wText, k)
      const y = lerp(APEX_Y + 60 + s * 0.72, 112, k)
      ctx.globalAlpha = 1 - 0.0 * k
      ctx.fillStyle = k < 0.5 ? C.white : C.white
      ctx.textAlign = 'left'
      ctx.fillText(text, x, y)
      ctx.globalAlpha = 1
    }
  }

  function drawResult(ctx, t) {
    // replay rising out of the chest line
    const r = outExpo(seg(t, T.replay, 0.5))
    if (r > 0) {
      const top = lerp(REPLAY.y + REPLAY.h, REPLAY.y, r)
      ctx.save()
      ctx.beginPath(); ctx.rect(REPLAY.x, top, REPLAY.w, REPLAY.y + REPLAY.h - top); ctx.clip()
      const slow = seg(t, T.replay + 0.5, 1.8)
      const zoom = 1.18 - 0.1 * outExpo(slow) + 0.04 * seg(t, T.replay + 2.3, 4)
      cover(ctx, imgs.cam, REPLAY.x, REPLAY.y, REPLAY.w, REPLAY.h, zoom, 0.46, 0.3)
      // slow-motion treatment: a faint echo of the fist
      if (t < T.replay + 2.3) {
        ctx.globalAlpha = 0.18 * (1 - slow)
        cover(ctx, imgs.cam, REPLAY.x - 26, REPLAY.y, REPLAY.w, REPLAY.h, zoom * 1.03, 0.46, 0.3)
        ctx.globalAlpha = 1
      }
      const g = ctx.createLinearGradient(0, REPLAY.y, 0, REPLAY.y + 260)
      g.addColorStop(0, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g; ctx.fillRect(REPLAY.x, REPLAY.y, REPLAY.w, 260)
      font(ctx, 700, 44, ORB); ctx.fillStyle = C.white; ctx.textAlign = 'left'
      ctx.fillText(t < T.replay + 2.3 ? 'REPLAY  SLOW' : 'REPLAY', REPLAY.x + 36, REPLAY.y + 84)
      ctx.restore()
    }
    // the mark this punch left, as notches on the replay frame plus a tag
    const mk = outExpo(seg(t, T.drain + 0.25, 0.24))
    if (mk > 0) {
      ctx.fillStyle = C.red
      ctx.fillRect(0, APEX_Y - 6, (M - 12) * mk, 12)
      ctx.fillRect(W - (M - 12) * mk, APEX_Y - 6, (M - 12) * mk, 12)
      if (r > 0.6) {
        ctx.globalAlpha = mk
        ctx.fillRect(REPLAY.x, APEX_Y - 3, REPLAY.w, 6)
        const tagW = 170
        ctx.fillRect(REPLAY.x, APEX_Y - 70, tagW, 64)
        font(ctx, 700, 40, ORB); ctx.fillStyle = C.white; ctx.textAlign = 'left'
        ctx.fillText('YOU', REPLAY.x + 26, APEX_Y - 22)
        ctx.globalAlpha = 1
      }
    }
    // the handoff dock at chest height
    const d = outExpo(seg(t, T.dock, 0.5))
    if (d > 0) {
      ctx.save()
      ctx.translate(-W * (1 - d), 0)
      const tile = 470
      ctx.fillStyle = C.white; ctx.fillRect(M, DOCK_Y, tile, tile)
      const mod = 14, n = QR_MATRIX.length, qs = mod * n, ox = M + (tile - qs) / 2, oy = DOCK_Y + (tile - qs) / 2
      ctx.fillStyle = C.black
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (QR_MATRIX[y][x]) ctx.fillRect(ox + x * mod, oy + y * mod, mod, mod)
      const colX = M + tile + 48, colW = W - M - colX
      fit(ctx, 'KEEP IT', 900, 96, ORB, colW)
      ctx.fillStyle = C.white; ctx.textAlign = 'left'
      ctx.fillText('KEEP IT', colX, DOCK_Y + 76)
      font(ctx, 600, 44, INTER); ctx.fillStyle = 'rgba(255,255,255,0.72)'
      ctx.fillText('Scan, or type', colX, DOCK_Y + 168)
      ctx.fillText('this code in the app.', colX, DOCK_Y + 224)
      const cs = fit(ctx, 'K7F 3QM', 800, 170, SAIRA, colW)
      ctx.fillStyle = C.white
      ctx.fillText('K7F 3QM', colX - 4, DOCK_Y + tile - 8)
      ctx.restore()
    }
    // go again
    const g2 = seg(t, T.again, 0.5)
    if (g2 > 0) {
      const lines = [
        { txt: 'GO AGAIN', w: 900, s: 150, fam: ORB, col: C.white, y: 2560 },
        { txt: 'Climb past your mark.', w: 600, s: 64, fam: INTER, col: C.white, y: 2680 },
        { txt: 'Add a credit.', w: 600, s: 64, fam: INTER, col: 'rgba(255,255,255,0.6)', y: 2770 },
      ]
      lines.forEach((l, i) => {
        const a = outExpo(seg(t, T.again + i * 0.08, 0.4))
        ctx.globalAlpha = a
        fit(ctx, l.txt, l.w, l.s, l.fam, W - 2 * M)
        ctx.fillStyle = l.col; ctx.textAlign = 'left'
        ctx.fillText(l.txt, M, l.y + 40 * (1 - a))
      })
      ctx.globalAlpha = 1
    }
  }

  function drawFoot(ctx) {
    font(ctx, 500, 40, INTER); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.textAlign = 'left'
    ctx.fillText('This machine records video.', M, 3700)
    ctx.fillText('Unclaimed clips delete after 24 hours.', M, 3756)
  }

  function render(ctx, t) {
    ctx.save()
    if (t < T.impact) { drawReady(ctx, t); drawFoot(ctx); ctx.restore(); return }
    const since = t - T.impact
    if (since < 1 / 60) { ctx.fillStyle = C.white; ctx.fillRect(0, 0, W, H); ctx.restore(); return }
    if (since < 3 / 60) { ctx.fillStyle = C.red; ctx.fillRect(0, 0, W, H); ctx.restore(); return }

    ctx.fillStyle = C.black; ctx.fillRect(0, 0, W, H)
    const [ax, ay] = shake(t, T.impact, 18, 0.34, 14)
    const [bx, by] = shake(t, T.apex, 10, 0.26, 11)
    ctx.translate(ax + bx, ay + by)
    // overscan so the shake never reveals an edge
    ctx.fillStyle = C.black; ctx.fillRect(-40, -40, W + 80, H + 80)

    const resultPhase = t >= T.drain + 0.2
    drawFill(ctx, t)
    drawMarks(ctx, t, resultPhase)
    if (t >= T.replay) drawResult(ctx, t)
    drawNumber(ctx, t)
    drawQualifier(ctx, t)
    drawFoot(ctx)
    ctx.restore()
  }

  return {
    DURATION: T.end,
    async init() { await load('cam', '/assets/camera/7187919.jpg') },
    render,
  }
})()
