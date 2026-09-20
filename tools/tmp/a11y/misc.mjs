import { open, sleep } from './cdp.mjs'
const out = {}

// ---------- 1. topbar contrast, sampled from real pixels (its background is a radial gradient)
{
  const c = await open({ W: 1440, H: 900, tag: 'm1', motion: 'no-preference' })
  await c.boot()
  const LIB = `
  const srgbLin = (v) => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  const lum = (c) => 0.2126 * srgbLin(c[0] / 255) + 0.7152 * srgbLin(c[1] / 255) + 0.0722 * srgbLin(c[2] / 255)
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) }
  const over = (fg, bg) => { const a = fg[3]; return [fg[0]*a + bg[0]*(1-a), fg[1]*a + bg[1]*(1-a), fg[2]*a + bg[2]*(1-a), 1] }
  const rgb = (s) => { const p = s.match(/[\\d.]+/g).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1] }
  `
  async function pixelContrast(sel, dx, dy) {
    const r = await c.jsn(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { x: b.left, y: b.top, w: b.width, h: b.height, color: cs.color, px: parseFloat(cs.fontSize), wt: cs.fontWeight } })()`)
    if (!r) return { sel, missing: true }
    const clip = { x: Math.round(r.x + dx), y: Math.round(r.y + dy), width: 3, height: 3, scale: 1 }
    const s = await c.send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: false })
    const bg = await c.js(`(async () => { const img = new Image(); img.src = 'data:image/png;base64,${s.result.data}'; await img.decode()
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height
      const cx = cv.getContext('2d', { colorSpace: 'srgb' }); cx.drawImage(img, 0, 0)
      const d = cx.getImageData(0, 0, img.width, img.height).data; return [d[0], d[1], d[2]].join(',') })()`)
    const res = await c.js(`(() => { ${LIB}
      const bg = [${bg}, 1]
      const fg = rgb(${JSON.stringify(r.color)})
      const t = over(fg, bg)
      const need = (${r.px} >= 24 || (${r.px} >= 18.66 && ${parseInt(r.wt) || 400} >= 700)) ? 3 : 4.5
      return JSON.stringify({ ratio: +ratio(t, bg).toFixed(2), need, bg: 'rgb(' + bg.slice(0,3).join(',') + ')', fg: ${JSON.stringify(r.color)}, px: ${r.px} }) })()`)
    return { sel, ...JSON.parse(res) }
  }
  await c.js(`window.showcase.mode('machine'); 1`); await sleep(2800)
  out.topbarPixelContrast = []
  for (const [sel, dx, dy] of [['.crumb-title b', -4, 6], ['.crumb-text > span', -4, 6], ['.briefbtn span', -6, 6],
    ['.mode[data-mode="mobile"] .long', -8, 6], ['.mode[aria-pressed="true"] .long', -8, 6],
    ['.pagebar button:not([aria-current])', -6, 6], ['.pagebar button[aria-current]', -6, 6], ['#openCase .case-long', -8, 6]]) {
    out.topbarPixelContrast.push(await pixelContrast(sel, dx, dy))
  }
  // 2. how is the untitled iframe exposed?
  await c.js(`document.getElementById('openCase').click(); 1`); await sleep(4500)
  await c.send('Accessibility.enable')
  const tree = await c.send('Accessibility.getFullAXTree').then(r => r.result)
  out.iframeAx = tree.nodes.filter(n => /iframe/i.test(n.role?.value || '')).map(n => ({ role: n.role?.value, name: n.name?.value, ignored: n.ignored }))
  out.caseHeroIframe = await c.jsn(`(() => { const f = document.querySelector('.cs-embed[data-embed="hero"]'); const b = f.getBoundingClientRect(); return { title: f.getAttribute('title'), src: f.getAttribute('src'), w: Math.round(b.width), h: Math.round(b.height), visible: b.width > 0 } })()`)
  c.close()
}

// ---------- 3. the Customise panel as a sheet, under 1180 px
{
  const c = await open({ W: 1024, H: 800, tag: 'm2', motion: 'no-preference' })
  await c.boot()
  await c.js(`window.showcase.mode('machine'); document.getElementById('openCustom').click(); 1`); await sleep(1800)
  out.sheet = await c.jsn(`(() => {
    const p = document.getElementById('custom'), b = p.getBoundingClientRect()
    return { scrimOn: !document.getElementById('customScrim').hidden, stageInert: document.getElementById('stage').inert,
      topbarInert: document.querySelector('.topbar').inert, bodyOverflow: getComputedStyle(document.body).overflow,
      panelRect: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)], vw: innerWidth, vh: innerHeight,
      offRight: Math.round(b.right - innerWidth), offBottom: Math.round(b.bottom - innerHeight),
      bodyScrollable: document.scrollingElement.scrollHeight - document.scrollingElement.clientHeight }
  })()`)
  // what can Tab reach while the sheet is open
  await c.js(`document.activeElement.blur && document.activeElement.blur(); 1`)
  const where = []
  for (let i = 0; i < 60; i++) {
    await c.key('Tab', { wait: 45 })
    where.push(await c.js(`(() => { const a = document.activeElement; if (a === document.body) return 'BODY'
      return (a.closest('#custom') ? 'custom' : a.closest('.topbar') ? 'topbar' : a.closest('#stage') ? 'STAGE' : a.closest('#phoneStage') ? 'PHONE' : 'other') })()`))
  }
  out.sheetTabReach = [...new Set(where)]
  c.close()
}

// ---------- 4. the help dialog at a short viewport
{
  const c = await open({ W: 1280, H: 620, tag: 'm3', motion: 'no-preference' })
  await c.boot()
  await c.js(`window.showcase.mode('machine'); document.getElementById('openHelp').click(); 1`); await sleep(2500)
  out.helpShort = await c.jsn(`(() => { const card = document.querySelector('.help-card')
    return { overflow: card.scrollHeight - card.clientHeight, tabIndex: card.tabIndex, closeInsideCard: card.contains(document.getElementById('closeHelp')), focus: document.activeElement.id } })()`)
  const before = await c.js(`document.querySelector('.help-card').scrollTop`)
  for (let i = 0; i < 2; i++) {
    await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'PageDown', code: 'PageDown', windowsVirtualKeyCode: 34, nativeVirtualKeyCode: 34 })
    await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'PageDown', code: 'PageDown', windowsVirtualKeyCode: 34, nativeVirtualKeyCode: 34 })
    await sleep(200)
  }
  out.helpShort.afterPageDown = await c.js(`document.querySelector('.help-card').scrollTop`)
  out.helpShort.before = before
  c.close()
}
console.log(JSON.stringify(out, null, 1))
