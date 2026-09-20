import { open, sleep } from './cdp.mjs'
const URL = 'http://localhost:5770/'
const c = await open({ W: 1440, H: 1000 })
await c.send('Page.navigate', { url: URL }); await sleep(3000)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: URL }); await sleep(6000)
await c.js(`window.showcase.mode('mobile');1`); await sleep(1200)

// make sure the wallet has credits so the run can start
await c.js(`window.punchApp.credits = 3; 1`); await sleep(200)
await c.js(`window.punchApp.go('punch', { flow: true });1`); await sleep(600)
console.log('after entering punch, page =', await c.js(`window.punchApp.page`), 'punch state =', await c.js(`document.getElementById('mPunch').dataset.state`))
await c.js(`window.punchApp.go('feed');1`); await sleep(400)
console.log('navigated away, page =', await c.js(`window.punchApp.page`))
const trail = []
for (let i = 0; i < 20; i++) {
  await sleep(1000)
  trail.push(`${i + 1}s:${await c.js(`window.punchApp.page`)}`)
}
console.log('page each second after leaving punch:')
console.log(trail.join(' '))
console.log('errors:', c.errs.slice(0,10).join('\n')||'(none)')
c.close()
