import { open, sleep } from './cdp.mjs'
import { writeFile, mkdir } from 'node:fs/promises'
const LIGHT = process.argv[2] === 'light'
const c = await open({ W: 1440, H: 950, tag: 'ff', motion: 'no-preference' })
await c.boot()
await mkdir('build/a11y', { recursive: true })
await c.js(`window.showcase.mode('mobile'); 1`); await sleep(2500)
if (LIGHT) { await c.js(`document.getElementById('openCustom').click(); 1`); await sleep(900); await c.js(`document.querySelector('[data-appearance-btn="light"]').click(); 1`); await sleep(1200); await c.js(`document.getElementById('closeCustom').click(); 1`); await sleep(900) }
console.log('structure:', await c.js(`(() => { const f = document.querySelector('.mh-friend'); return f.outerHTML.slice(0, 600) })()`))
console.log('stack behind .mh-f-when:', await c.js(`(() => {
  const t = document.querySelector('.mh-f-when'); let e = t, out = []
  while (e && e.nodeType === 1 && out.length < 6) { const s = getComputedStyle(e); out.push(e.tagName + '.' + (e.classList[0]||'') + ' bg=' + s.backgroundColor + ' img=' + (s.backgroundImage === 'none' ? '-' : 'YES') + ' pos=' + s.position + ' z=' + s.zIndex); e = e.parentElement }
  const sib = [...t.closest('.mh-friend').querySelectorAll('img')].map(i => i.className + ' ' + (i.getAttribute('src')||'').slice(-24) + ' ' + getComputedStyle(i).position)
  return JSON.stringify({ chain: out, imgs: sib }, null, 1)
})()`))
await c.js(`document.querySelector('.mh-friend').scrollIntoView({ block: 'center' }); 1`); await sleep(900)
const r = await c.jsn(`(() => { const b = document.querySelector('.mh-friend').getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height } })()`)
const s = await c.send('Page.captureScreenshot', { format: 'png', clip: { x: Math.max(0, r.x - 6), y: Math.max(0, r.y - 6), width: r.w + 12, height: r.h + 12, scale: 3 }, captureBeyondViewport: false })
await writeFile('build/a11y/friend-' + (LIGHT ? 'light' : 'dark') + '.png', Buffer.from(s.result.data, 'base64'))
console.log('shot written')
c.close()
