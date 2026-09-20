// PART B - effect: read the RIGHT attribute (data-mbackdrop, not data-backdrop) and measure the render.
import { launch, conn, newTarget, sleep } from './embedaudit/cdp.mjs'
import { writeFileSync } from "node:fs"
const OUT = []
const log = (...a) => { OUT.push(a.join(" ")); writeFileSync("tools/tmp/skeptic-B.log", OUT.join("\n")) }
const { port, chrome } = await launch({ w: 1440, h: 1000 })
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const c = await conn(list.find((x) => x.type === 'page').webSocketDebuggerUrl)
await c.send('Runtime.enable'); await c.send('Page.enable')
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await c.js('localStorage.clear(); 1')
await c.send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)
await c.js(`window.showcase.mode('animation'); 1`); await sleep(5000)

const probe = `(function(){
  try {
    var f = document.getElementById('linkedFrame'); if (!f) return 'NO FRAME';
    var d = f.contentDocument, r = d.documentElement;
    var sc = d.querySelector('.mscreen');
    var lights = [...d.querySelectorAll('.mscreen .ms-lights i')];
    var cs = function(el){ var s = getComputedStyle(el); return { bg: s.backgroundImage !== 'none' ? 'img' : s.backgroundColor, radius: s.borderTopLeftRadius, filter: s.filter, w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) } };
    return JSON.stringify({
      mbackdrop_ATTR: r.getAttribute('data-mbackdrop'),
      dataset_mbackdrop: r.dataset.mbackdrop,
      WRONG_dataset_backdrop: r.dataset.backdrop === undefined ? '(undefined - what the other auditor read)' : r.dataset.backdrop,
      appearance: r.dataset.appearance,
      screenBg: sc ? getComputedStyle(sc).backgroundColor : null,
      screenBgImage: sc ? (getComputedStyle(sc).backgroundImage !== 'none') : null,
      lightCount: lights.length,
      lights: lights.slice(0,6).map(cs)
    })
  } catch(e) { return 'ERR ' + e.message }
})()`

const t2 = await newTarget(port, 'http://localhost:5770/qr.css'); await sleep(1200)
const c2 = await conn(t2.webSocketDebuggerUrl); await c2.send('Runtime.enable')
const poke = async (label, obj) => {
  const n0 = c.errs.length
  await c2.js(`localStorage.setItem('punch-showcase.v5', ${JSON.stringify(JSON.stringify(obj))}); 1`)
  await sleep(1600)
  const p = await c.js(probe)
  log('### ' + label)
  log(typeof p === 'string' ? p : JSON.stringify(p))
  log('   newErrors: ' + JSON.stringify(c.errs.slice(n0)))
}
const base = { variant: 'arena', appearance: 'dark', logo: 'fist', decimals: 'on', sets: {}, mvar: {}, mscreen: 'default' }
log('### baseline (no poke)'); log(await c.js(probe))
await poke('valid backdrop smoke', { ...base, backdrop: 'smoke' })
const shotA = await c.send('Page.captureScreenshot', { format: 'png' })
writeFileSync('tools/tmp/skeptic-valid-smoke.png', Buffer.from(shotA.result.data, "base64"))
await poke('HOSTILE backdrop', { ...base, backdrop: 'not-a-backdrop"><script>window.__x=1</script>' })
const shotB = await c.send('Page.captureScreenshot', { format: 'png' })
writeFileSync('tools/tmp/skeptic-hostile.png', Buffer.from(shotB.result.data, "base64"))
log('injected __x in frame: ' + await c.js(`String(document.getElementById('linkedFrame').contentWindow.__x)`))
log('frame html head: ' + await c.js(`document.getElementById('linkedFrame').contentDocument.documentElement.outerHTML.slice(0,420)`))
// does a reload of the embed recover? (the boot path validates)
await c.js(`document.getElementById('linkedFrame').contentWindow.location.reload(); 1`); await sleep(6000)
log('### after embed reload (boot path)'); log(await c.js(probe))
log('TOTAL errors: ' + c.errs.length); log(JSON.stringify(c.errs.slice(0,6)))
c.ws.close(); c2.ws.close(); chrome.kill(); process.exit(0)
