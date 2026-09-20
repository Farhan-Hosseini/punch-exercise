/* ==========================================================================
   The virtual clock the recorders run the showcase on.

   Injected before any page script, it owns performance.now, Date, setTimeout, setInterval, requestAnimationFrame and
   requestIdleCallback, pauses and seeks every Web Animation, and pauses and seeks every <video>. Until a recorder
   calls window.__vt.freeze() it follows real time, so the page loads exactly as it always does. After that:

     __vt.step(ms)   run the timers and the rAF callbacks up to ms later, then seek every animation there
     __vt.videos()   pause and seek every video to the virtual time (awaits the seeks)
     __vt.settle()   two real frames, so what was stepped has been laid out and painted

   Math.random is seeded, so a run picks the same numbers every time.
   ========================================================================== */
export const SHIM = `(() => {
  if (window.__vt) return
  const N = {
    raf: window.requestAnimationFrame.bind(window), si: window.setInterval.bind(window), st: window.setTimeout.bind(window),
    now: performance.now.bind(performance), dnow: Date.now, D: Date,
  }
  const V = window.__vt = { t: N.now(), frozen: false, seq: 1, timers: new Map(), rafs: new Map() }
  const dateOff = N.dnow() - V.t
  performance.now = () => V.t
  const VDate = function (...a) {
    if (!new.target) return new N.D(V.t + dateOff).toString()
    return a.length ? new N.D(...a) : new N.D(V.t + dateOff)
  }
  VDate.prototype = N.D.prototype
  VDate.now = () => Math.floor(V.t + dateOff)
  VDate.parse = N.D.parse; VDate.UTC = N.D.UTC
  window.Date = VDate
  // a seeded random, so the confetti and the demo's picks are the same on every run
  let seed = 0x2F6E2B1
  Math.random = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }

  window.setTimeout = function (fn, ms, ...a) { const id = V.seq++; V.timers.set(id, { at: V.t + Math.max(0, Number(ms) || 0), fn, a, every: 0, n: id }); return id }
  window.setInterval = function (fn, ms, ...a) { const id = V.seq++; const every = Math.max(4, Number(ms) || 0); V.timers.set(id, { at: V.t + every, fn, a, every, n: id }); return id }
  window.clearTimeout = window.clearInterval = (id) => { V.timers.delete(id) }
  window.requestAnimationFrame = (fn) => { const id = V.seq++; V.rafs.set(id, fn); return id }
  window.cancelAnimationFrame = (id) => { V.rafs.delete(id) }
  window.requestIdleCallback = (fn) => window.setTimeout(() => fn({ didTimeout: false, timeRemaining: () => 8 }), 1)
  window.cancelIdleCallback = window.clearTimeout

  function runTimers(to) {
    for (let guard = 0; guard < 20000; guard++) {
      let pick = null
      for (const [id, t] of V.timers) if (t.at <= to && (!pick || t.at < pick[1].at || (t.at === pick[1].at && t.n < pick[1].n))) pick = [id, t]
      if (!pick) break
      const [id, t] = pick
      if (t.at > V.t) V.t = t.at
      if (t.every) { t.at += t.every; t.n = V.seq++ } else V.timers.delete(id)
      try { typeof t.fn === 'function' ? t.fn(...t.a) : (0, eval)(String(t.fn)) } catch (e) { console.error('timer', e && e.stack || e) }
    }
    if (to > V.t) V.t = to
  }
  function runRafs() {
    const list = [...V.rafs.values()]; V.rafs.clear()
    for (const fn of list) { try { fn(V.t) } catch (e) { console.error('raf', e && e.stack || e) } }
  }
  const advance = (to) => { runTimers(to); runRafs() }

  // until the recorder takes the clock, it follows real time so the page loads as it always does
  const pump = () => { if (V.frozen) return; advance(N.now()); N.raf(pump) }
  N.raf(pump)
  N.si(() => { if (!V.frozen) runTimers(N.now()) }, 8)

  // every Web Animation is paused and seeked to the virtual time; the page's own pause, play and seeks are respected
  const AP = Animation.prototype
  const O = { pause: AP.pause, play: AP.play, finish: AP.finish, reverse: AP.reverse, upr: AP.updatePlaybackRate }
  const CT = Object.getOwnPropertyDescriptor(AP, 'currentTime')
  const PR = Object.getOwnPropertyDescriptor(AP, 'playbackRate')
  const S = new WeakMap()
  const touch = (a, user) => { const s = S.get(a); if (!s) return; if (user === 'pause') s.user = 'pause'; else { if (user) s.user = user; s.rebase = true; s.done = false } }
  AP.pause = function () { touch(this, 'pause'); return O.pause.call(this) }
  AP.play = function () { touch(this, 'play'); return O.play.call(this) }
  AP.reverse = function () { touch(this, 'play'); return O.reverse.call(this) }
  AP.updatePlaybackRate = function (r) { touch(this); return O.upr.call(this, r) }
  AP.finish = function () { const r = O.finish.call(this); const s = S.get(this); if (s) s.done = true; return r }
  Object.defineProperty(AP, 'currentTime', { configurable: true, get: CT.get, set(v) { CT.set.call(this, v); touch(this) } })
  Object.defineProperty(AP, 'playbackRate', { configurable: true, get: PR.get, set(v) { PR.set.call(this, v); touch(this) } })
  V.count = 0
  function sync() {
    const all = document.getAnimations()
    V.count = all.length
    for (const a of all) {
      let s = S.get(a)
      if (!s) {
        const ps = a.playState
        s = { ct0: CT.get.call(a) ?? 0, vt0: V.t, user: ps === 'paused' ? 'pause' : 'play', done: ps === 'finished', rebase: false }
        S.set(a, s)
      }
      if (s.rebase) { s.ct0 = CT.get.call(a) ?? 0; s.vt0 = V.t; s.rebase = false }
      if (s.user === 'pause' || s.done) continue
      const rate = PR.get.call(a)
      const target = s.ct0 + (V.t - s.vt0) * rate
      const end = a.effect ? a.effect.getComputedTiming().endTime : 0
      if ((rate > 0 && Number.isFinite(end) && target >= end) || (rate < 0 && target <= 0)) { s.done = true; O.finish.call(a); continue }
      if (a.playState !== 'paused') O.pause.call(a)
      CT.set.call(a, target)
    }
  }

  // <video> is no Web Animation, so each frame it is paused and seeked to the virtual time: a replay inside the clip
  // plays at the speed the page plays it, however long the capture itself takes
  const VID = new WeakMap()
  V.videos = () => {
    const waits = []
    for (const v of document.querySelectorAll('video')) {
      if (!v.isConnected || !(v.currentSrc || v.src)) continue
      const r = v.getBoundingClientRect()
      if (r.width < 4 || r.height < 4) continue
      let s = VID.get(v)
      if (!s) { s = { vt0: V.t }; VID.set(v, s) }
      if (!v.paused) v.pause()
      if (v.readyState < 1) continue
      const d = v.duration || 0
      let t = (V.t - s.vt0) / 1000
      if (d > 0) t = v.loop ? t % d : Math.min(t, Math.max(0, d - 1 / 30))
      if (Math.abs(v.currentTime - t) < 1 / 120) continue
      waits.push(new Promise((res) => {
        let done = false
        const fin = () => { if (done) return; done = true; res(1) }
        v.addEventListener('seeked', fin, { once: true })
        N.st(fin, 150)
        try { v.currentTime = t } catch (e) { fin() }
      }))
    }
    return Promise.all(waits).then(() => waits.length)
  }
  V.freeze = () => { V.frozen = true; V.t = N.now(); sync(); return V.t }
  V.step = (ms) => { advance(V.t + ms); sync(); return V.t }
  V.settle = () => new Promise((res) => N.raf(() => N.raf(() => { sync(); res(V.t) })))
})()`
