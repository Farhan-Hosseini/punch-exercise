import { open, sleep } from './cdp.mjs'
const c = await open({ W: 400, H: 1400 })
await c.send('Network.enable')
let bytes = 0, reqs = 0
const orig = c.send
await c.send('Page.navigate', { url: 'http://localhost:5770/?embed=machine' }); await sleep(8000)
console.log('EMBED page (./?embed=machine)')
console.log('  total nodes        :', await c.js(`document.querySelectorAll('*').length`))
console.log('  #dsStage present   :', await c.js(`!!document.getElementById('dsStage')`), ' nodes:', await c.js(`document.getElementById('dsStage')?.querySelectorAll('*').length`))
console.log('  #case present      :', await c.js(`!!document.getElementById('case')`), ' nodes:', await c.js(`document.getElementById('case')?.querySelectorAll('*').length`))
console.log('  #brief present     :', await c.js(`!!document.getElementById('brief')`), ' nodes:', await c.js(`document.getElementById('brief')?.querySelectorAll('*').length`))
console.log('  #mApp (phone)      :', await c.js(`!!document.getElementById('mApp')`), ' nodes:', await c.js(`document.getElementById('mApp')?.querySelectorAll('*').length`))
console.log('  #custom panel      :', await c.js(`!!document.getElementById('custom')`), ' nodes:', await c.js(`document.getElementById('custom')?.querySelectorAll('*').length`))
console.log('  window.designSystem:', await c.js(`typeof window.designSystem`))
console.log('  scripts loaded     :', await c.js(`document.querySelectorAll('script[src]').length`))
const m = await c.metrics(); console.log('  metrics            :', JSON.stringify(m))
console.log('  errors             :', c.errs.slice(0,8).join(' | ')||'(none)')
c.close()
