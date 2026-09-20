import { open, sleep } from './cdp.mjs'
import { writeFile, mkdir } from 'node:fs/promises'
const c = await open({ W: 1440, H: 950, tag: 'fx', motion: 'no-preference' })
await c.boot()
await mkdir('build/a11y', { recursive: true })
await c.js(`window.showcase.mode('machine'); document.getElementById('openCustom').click(); 1`); await sleep(2000)
async function shoot(sel, name, pad = 10) {
  await c.js(`document.querySelector('${sel}').scrollIntoView({ block: 'center' }); 1`); await sleep(700)
  const r = await c.jsn(`(() => { const b = document.querySelector('${sel}').getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height } })()`)
  const clip = { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: r.w + pad * 2, height: r.h + pad * 2, scale: 3 }
  const s = await c.send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: false })
  await writeFile('build/a11y/' + name + '.png', Buffer.from(s.result.data, 'base64'))
  console.log(name, JSON.stringify(clip))
}
await shoot('.faces', 'faces-dark')
await c.js(`document.querySelector('[data-appearance-btn="light"]').click(); 1`); await sleep(1400)
await shoot('.faces', 'faces-light')
c.close()
