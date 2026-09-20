import { open, sleep } from '../a11y/cdp.mjs'
const PIN = process.argv[2] === 'pin'
const c = await open({ W: 1440, H: 900, tag: 'sw2', motion: 'reduce' })
await c.boot()
await c.js(`document.getElementById('openCase').click(); 1`); await sleep(4500)
const H = await c.js(`document.getElementById('caseScroll').scrollHeight`)
for (let y=0;y<H;y+=900){ await c.js(`document.getElementById('caseScroll').scrollTo(0,${y});1`); await sleep(80) }
await c.js(`document.querySelector('.cd-geo-list').scrollIntoView({block:'center'}); 1`); await sleep(2000)
if (PIN) { await c.js(`document.querySelectorAll('.cd-geo-note')[2].classList.add('is-current'); 1`); await sleep(800) }
const r = await c.jsn(`(() => {
  const lin=v=>{v/=255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4)}
  const L=p=>0.2126*lin(p[0])+0.7152*lin(p[1])+0.0722*lin(p[2])
  function P(s){ s=String(s).trim()
    let m=s.match(/^color\(srgb\s+([^)]+)\)$/)
    if(m){const q=m[1].split(/[\/\s]+/).filter(Boolean).map(Number); if(q.slice(0,3).some(Number.isNaN)) return null; return [q[0]*255,q[1]*255,q[2]*255,q.length>3?q[3]:1]}
    m=s.match(/^rgba?\(([^)]+)\)$/)
    if(m){const q=m[1].split(/[,\/\s]+/).filter(Boolean).map(Number); if(q.slice(0,3).some(Number.isNaN)) return null; return [q[0],q[1],q[2],q.length>3?q[3]:1]}
    return null }
  const over=(f,b)=>[f[0]*f[3]+b[0]*(1-f[3]),f[1]*f[3]+b[1]*(1-f[3]),f[2]*f[3]+b[2]*(1-f[3]),1]
  const out=[], unparsed=new Set()
  for (const el of document.querySelectorAll('#case .cd *')) {
    const own=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').trim()
    if (own.length<4) continue
    const b=el.getBoundingClientRect(); if (b.width<3||b.height<3) continue
    const cs=getComputedStyle(el); if (cs.visibility==='hidden'||cs.display==='none') continue
    let stack=[],e=el,bad=''
    while(e&&e.nodeType===1){const s=getComputedStyle(e); if(s.backgroundImage!=='none'){bad='img';break}
      const q=P(s.backgroundColor); if(!q){bad='bg:'+s.backgroundColor; unparsed.add(s.backgroundColor); break}
      if(q[3]>0){stack.unshift(q); if(q[3]>=0.999)break} e=e.parentElement}
    if(bad) continue
    let bg=[255,255,255,1]; for(const l of stack) bg=over(l,bg)
    const fg=P(cs.color); if(!fg){unparsed.add(cs.color); continue}
    const t=over(fg,bg)
    const ra=(Math.max(L(t),L(bg))+0.05)/(Math.min(L(t),L(bg))+0.05)
    if(Number.isNaN(ra)) { unparsed.add('NaN:'+cs.color+'|'+bg.join(',')); continue }
    const px=parseFloat(cs.fontSize), w=parseInt(cs.fontWeight)||400
    const need=(px>=24||(px>=18.66&&w>=700))?3:4.5
    if(ra+0.02<need) out.push({cls:String(el.className).slice(0,30), px:+px.toFixed(1), w, ratio:+ra.toFixed(3), need,
      fg:cs.color, bg:'rgb('+bg.slice(0,3).map(Math.round).join(',')+')', t:own.slice(0,34)})
  }
  return { fails: out.sort((a,b)=>a.ratio-b.ratio), unparsed:[...unparsed].slice(0,8) }
})()`)
console.log('pinned is-current:', PIN, '| fails:', r.fails.length, '| unparsed forms:', JSON.stringify(r.unparsed))
for (const f of r.fails) console.log(' ', f.ratio+'/'+f.need, (f.px+'px/'+f.w).padEnd(10), (f.fg+' on '+f.bg).padEnd(42), f.cls.padEnd(20), '"'+f.t+'"')
c.close()
