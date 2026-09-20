import { open } from '../a11y/cdp.mjs'
const c = await open({ W: 800, H: 600, tag: 'd3', motion: 'reduce' })
console.log(await c.js(`(() => {
  const re1 = /^rgba?\(([^)]+)\)$/
  const re2 = /^color\(srgb\s+([^)]+)\)$/
  const s1 = 'rgba(0, 0, 0, 0)', s2 = 'color(srgb 0.918431 0.918431 0.926275)'
  return JSON.stringify({ re1: re1.source, re2: re2.source, m1: !!s1.match(re1), m2: !!s2.match(re2),
    split1: s1.match(re1) ? s1.match(re1)[1].split(/[,\/\s]+/).filter(Boolean) : null })
})()`))
c.close()
