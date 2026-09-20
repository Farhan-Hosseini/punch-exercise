import { open, sleep } from './cdp.mjs'
const c = await open({ W: 1600, H: 1000, tag: 'fd' })
await c.boot()
await c.js(`window.showcase.mode('mobile'); 1`); await sleep(2500)
if (process.env.NEGCTL) await c.js(`(()=>{const s=document.createElement('style');s.textContent='*:focus-visible,*:focus,*:focus-visible *,*:focus *{outline:none !important;box-shadow:none !important}';document.head.appendChild(s);return 1})()`)
await c.js(`document.activeElement && document.activeElement.blur && document.activeElement.blur(); 1`)
const PROPS = `['outlineStyle','outlineWidth','outlineColor','outlineOffset','boxShadow','borderColor','borderWidth','borderStyle','backgroundColor','backgroundImage','color','opacity','filter','transform','textDecorationLine','content','visibility','scale']`
const sigOf = (expr) => `(() => { const a = ${expr}; if (!a) return null
  const props = ${PROPS}
  const one = (el, pe) => { const cs = getComputedStyle(el, pe); return props.map(p => cs[p]).join('|') }
  const nodes = [a, ...a.querySelectorAll('*')].slice(0, 60)
  return nodes.map(n => one(n, null) + '//' + one(n, '::before') + '//' + one(n, '::after')).join('~~') })()`
for (let i = 0; i < 4; i++) await c.key('Tab', { wait: 100 })
const who = await c.js(`document.activeElement.tagName + '.' + document.activeElement.className`)
const focused = await c.js(sigOf('document.activeElement'))
await c.js(`window.__last = document.activeElement; document.activeElement.blur(); 1`); await sleep(120)
const blurred = await c.js(sigOf('window.__last'))
console.log('element:', who)
console.log('equal?', focused === blurred)
const fa = focused.split('~~'), ba = blurred.split('~~')
for (let i = 0; i < Math.max(fa.length, ba.length); i++) if (fa[i] !== ba[i]) console.log('node', i, '\n  F:', fa[i], '\n  B:', ba[i])
c.close()
