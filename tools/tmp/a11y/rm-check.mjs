import { open, sleep } from './cdp.mjs'
for (const motion of ['no-preference', 'reduce']) {
  const c = await open({ W: 1440, H: 900, tag: 'rm', motion })
  await c.boot()
  console.log(motion, 'flag ->', await c.js(`matchMedia('(prefers-reduced-motion: reduce)').matches`))
  c.close()
}
// and via CDP emulation on top of the flag
const c = await open({ W: 1440, H: 900, tag: 'rm2', motion: 'no-preference' })
await c.boot()
console.log('before emulate ->', await c.js(`matchMedia('(prefers-reduced-motion: reduce)').matches`))
await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
console.log('after emulate reduce ->', await c.js(`matchMedia('(prefers-reduced-motion: reduce)').matches`))
await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
console.log('after emulate no-preference ->', await c.js(`matchMedia('(prefers-reduced-motion: reduce)').matches`))
c.close()
