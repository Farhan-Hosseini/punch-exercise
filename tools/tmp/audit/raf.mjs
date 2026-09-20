import { open, sleep } from './cdp.mjs'
const URL = 'http://localhost:5770/'
const c = await open({ W: 1440, H: 1000 })
await c.send('Page.navigate', { url: URL }); await sleep(3000)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: URL }); await sleep(7000)
const patch = [
  '(function(){',
  '  if(!window.__raw){',
  '    window.__raw = window.requestAnimationFrame.bind(window);',
  '    window.__stacks = {};',
  '    window.__count = 0;',
  '    window.requestAnimationFrame = function(cb){',
  '      window.__count++;',
  '      var st = (new Error()).stack.split(String.fromCharCode(10)).slice(2,4).join(" <- ");',
  '      window.__stacks[st] = (window.__stacks[st]||0)+1;',
  '      return window.__raw(cb);',
  '    };',
  '  }',
  '  window.__count = 0; window.__stacks = {}; return 1;',
  '})()',
].join('\n')
async function sample(label) {
  const ok = await c.js(patch)
  await sleep(3000)
  const n = await c.js('window.__count')
  const top = await c.jsj('Object.entries(window.__stacks).sort(function(a,b){return b[1]-a[1]}).slice(0,6)')
  console.log(`${label}: patch=${JSON.stringify(ok)} ${n} rAF schedules in 3s (${Math.round(n/3)}/s)`)
  if (Array.isArray(top)) for (const [s, k] of top) console.log(`    ${String(k).padStart(4)}  ${String(s).replace(/https?:\/\/[^/]+\//g,'').slice(0,150)}`)
}
await c.js(`window.showcase.mode('mobile');1`); await sleep(1500)
await sample('A. Mobile tab at rest, machine never opened')
await c.js(`window.showcase.mode('machine');1`); await sleep(500)
await c.js(`window.showcase.mscreen('result');1`); await sleep(2500)
await c.js(`window.showcase.mode('mobile');1`); await sleep(1500)
await sample('B. Mobile tab at rest, after one visit to the Result screen')
await c.js(`window.showcase.mode('machine');1`); await sleep(400)
await c.js(`window.showcase.mscreen('loading');1`); await sleep(2000)
await c.js(`window.showcase.mode('mobile');1`); await sleep(1500)
await sample('C. Mobile tab at rest, after one visit to the Reading screen')
c.close()
