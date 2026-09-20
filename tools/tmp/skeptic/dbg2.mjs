import { open, sleep } from '../a11y/cdp.mjs'
const c = await open({ W: 1440, H: 900, tag: 'd2', motion: 'reduce' })
await c.boot()
await c.js(`document.getElementById('openCase').click(); 1`); await sleep(4500)
await c.js(`document.querySelector('.cd-geo-list').scrollIntoView({block:'center'}); 1`); await sleep(2000)
await c.js(`document.querySelectorAll('.cd-geo-note')[2].classList.add('is-current'); 1`); await sleep(800)
console.log(await c.js(`(() => {
  const lin=v=>{v/=255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4)}
  const L=p=>0.2126*lin(p[0])+0.7152*lin(p[1])+0.0722*lin(p[2])
  const P=s=>{let m=String(s).match(/rgba?\(([^)]+)\)/); if(m){const q=m[1].split(/[,\/\s]+/).filter(Boolean).map(Number);return [q[0],q[1],q[2],q.length>3?q[3]:1]}
    m=String(s).match(/color\(srgb ([^)]+)\)/); if(m){const q=m[1].split(/[\/\s]+/).filter(Boolean).map(Number);return [q[0]*255,q[1]*255,q[2]*255,q.length>3?q[3]:1]} return null}
  const out=[]
  let seen=0, skippedShort=0, skippedSize=0
  for (const el of document.querySelectorAll('#case .cd *')) {
    seen++
    if (!el.classList || !el.classList.contains('cd-geo-note-d')) continue
    const own=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').trim()
    const b=el.getBoundingClientRect()
    const cs=getComputedStyle(el)
    const pb=P(getComputedStyle(el.closest('.cd-geo-note')).backgroundColor)
    const fg=P(cs.color)
    const bg = pb && pb[3]>=0.999 ? pb : [245,245,247,1]
    const ra=(Math.max(L(fg),L(bg))+0.05)/(Math.min(L(fg),L(bg))+0.05)
    out.push({cur: el.closest('.cd-geo-note').classList.contains('is-current'), rawBg: getComputedStyle(el.closest('.cd-geo-note')).backgroundColor,
      parsedBg: pb && pb.map(x=>+x.toFixed(2)), parsedFg: fg, ownLen: own.length, w:Math.round(b.width), h:Math.round(b.height), ratio:+ra.toFixed(3)})
  }
  return JSON.stringify({seen, rows: out}, null, 1)
})()`))
c.close()
