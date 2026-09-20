/* Run code QR, Version 2-Q, decodes to HTTPS://PNCH.APP/DXB2KTRBXMHN (from motion/qr.js). */
window.QR_MATRIX = [[1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1],[1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1],[1,0,1,1,1,0,1,0,0,1,0,1,0,0,0,1,1,0,1,0,1,1,1,0,1],[1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1],[1,0,1,1,1,0,1,0,1,0,1,0,0,0,1,1,0,0,1,0,1,1,1,0,1],[1,0,0,0,0,0,1,0,1,1,0,1,0,0,0,0,1,0,1,0,0,0,0,0,1],[1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],[0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0],[0,1,0,1,1,0,1,1,1,0,1,0,0,1,0,1,1,1,0,1,1,1,0,1,0],[0,1,1,0,0,0,0,1,1,0,1,1,0,1,0,1,1,1,0,0,0,0,0,0,0],[0,0,0,1,1,1,1,0,1,1,0,1,0,1,1,1,1,1,1,0,0,0,1,0,0],[1,0,0,0,1,0,0,0,0,1,0,0,1,0,1,1,0,0,0,1,1,0,1,0,1],[1,0,0,1,1,0,1,1,0,1,1,0,0,1,0,0,1,1,0,1,0,1,1,0,1],[1,1,1,1,1,0,0,0,0,1,1,1,1,1,0,0,1,1,0,0,0,0,1,1,1],[0,1,0,0,0,1,1,0,1,1,1,1,1,1,0,0,1,0,1,1,0,1,0,1,0],[1,0,0,0,0,1,0,0,0,1,0,1,0,0,1,0,1,1,0,0,0,1,1,0,0],[1,0,1,1,0,0,1,0,1,1,1,1,0,0,1,1,1,1,1,1,1,0,1,1,0],[0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,1,1,0,1,0],[1,1,1,1,1,1,1,0,1,0,1,0,1,0,0,0,1,0,1,0,1,1,0,0,1],[1,0,0,0,0,0,1,0,0,0,1,1,0,1,0,1,1,0,0,0,1,0,1,0,0],[1,0,1,1,1,0,1,0,1,0,1,1,0,0,0,1,1,1,1,1,1,1,1,0,0],[1,0,1,1,1,0,1,0,1,1,0,1,1,1,1,0,0,1,0,1,0,1,1,1,0],[1,0,1,1,1,0,1,0,0,1,0,1,1,0,0,1,1,0,1,1,1,1,0,1,0],[1,0,0,0,0,0,1,0,1,0,0,1,1,0,0,1,1,0,1,0,1,0,1,1,1],[1,1,1,1,1,1,1,0,0,0,1,0,0,0,0,1,1,0,0,0,0,1,1,0,1]];

/* The one QR style, shared by the phone and the machine (qr.css): the phone app's code on its glass tile.
   Ink is currentColor, so the tile's tokens colour it in every look. Put <div class="pqr" data-pqr></div> anywhere
   and size it with --pqr-size; PunchQR.mount fills it (done on load for every [data-pqr], and again on demand). */
window.PunchQR = (() => {
  const matrix = () => window.QR_MATRIX || []
  function svg(label) {
    const m = matrix(), n = m.length
    let d = ''
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) d += `M${x} ${y}h1v1h-1z`
    return `<svg viewBox="-.5 -.5 ${n + 1} ${n + 1}" shape-rendering="crispEdges" role="img" aria-label="${label || 'Machine QR code'}"><path d="${d}" fill="currentColor"/></svg>`
  }
  function mount(el, opts = {}) {
    if (!el) return el
    const label = opts.label || el.dataset.pqrLabel || 'Machine QR code'
    const glow = opts.glow ?? el.dataset.pqrGlow !== 'off'
    const scan = opts.scan ?? el.dataset.pqrScan !== 'off'
    el.classList.add('pqr')
    el.innerHTML = (glow ? '<img class="pqr-glow" src="assets/app/qr-glow.svg" alt="" aria-hidden="true">' : '') +
      `<span class="pqr-frame"><span class="pqr-code">${svg(label)}</span>${scan ? '<span class="pqr-scan" aria-hidden="true"></span>' : ''}<span class="pqr-done" aria-hidden="true"></span></span>`
    el.dataset.pqrMounted = '1'
    return el
  }
  function mountAll(root = document) {
    root.querySelectorAll('[data-pqr]:not([data-pqr-mounted])').forEach((el) => mount(el))
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mountAll())
  else mountAll()
  return { svg, mount, mountAll }
})()
