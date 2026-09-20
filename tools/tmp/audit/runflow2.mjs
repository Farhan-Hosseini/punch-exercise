import { open, sleep } from './cdp.mjs'
const URL = 'http://localhost:5770/'
const c = await open({ W: 1440, H: 1000 })
await c.send('Page.navigate', { url: URL }); await sleep(3000)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: URL }); await sleep(6000)
await c.js(`window.showcase.mode('mobile');1`); await sleep(1200)
await c.js(`window.punchApp.credits = 3; 1`); await sleep(200)
// stay on punch and watch it run to completion, to learn the timing
await c.js(`window.punchApp.go('punch', { flow: true });1`)
const t1 = []
for (let i = 0; i < 18; i++) { await sleep(1000); t1.push(`${i+1}:${await c.js(`window.punchApp.page`)}/${await c.js(`document.getElementById('mPunch').dataset.state`)}`) }
console.log('STAYING on punch:'); console.log(t1.join(' '))

await c.js(`window.punchApp.go('default');1`); await sleep(600)
await c.js(`window.punchApp.go('punch', { flow: true });1`); await sleep(500)
await c.js(`window.punchApp.go('feed');1`)
const t2 = []
for (let i = 0; i < 18; i++) { await sleep(1000); t2.push(`${i+1}:${await c.js(`window.punchApp.page`)}/${await c.js(`document.getElementById('mPunch').dataset.state`)}`) }
console.log('LEFT for feed:'); console.log(t2.join(' '))
console.log('errors:', c.errs.slice(0,10).join('\n')||'(none)')
c.close()
