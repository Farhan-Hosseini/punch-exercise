import { open, sleep } from '../a11y/cdp.mjs'
import { readFile } from 'node:fs/promises'
const PIN = process.argv[2] === 'pin'
const SRC = await readFile(new URL('./page-sweep.js', import.meta.url), 'utf8')
const c = await open({ W: 1440, H: 900, tag: 'sw3', motion: 'reduce' })
await c.boot()
await c.js(`document.getElementById('openCase').click(); 1`); await sleep(4500)
const H = await c.js(`document.getElementById('caseScroll').scrollHeight`)
for (let y=0;y<H;y+=900){ await c.js(`document.getElementById('caseScroll').scrollTo(0,${y});1`); await sleep(80) }
await c.js(`document.querySelector('.cd-geo-list').scrollIntoView({block:'center'}); 1`); await sleep(2000)
if (PIN) { await c.js(`document.querySelectorAll('.cd-geo-note')[2].classList.add('is-current'); 1`); await sleep(800) }
const r = JSON.parse(await c.js(`JSON.stringify(${SRC})`))
console.log('PIN=' + PIN, '| parser self-test:', JSON.stringify(r.selftest))
console.log('fails:', r.fails.length, '| unparsed:', JSON.stringify(r.unparsed))
for (const f of r.fails) console.log(' ', f.ratio + '/' + f.need, (f.px+'px/'+f.w).padEnd(10), (f.fg+' on '+f.bg).padEnd(42), f.cls.padEnd(18), 'cur='+f.cur, '"'+f.t+'"')
c.close()
