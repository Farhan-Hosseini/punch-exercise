import { open, sleep } from '../a11y/cdp.mjs'
const c = await open({ W: 1440, H: 900, tag: 'sw', motion: 'reduce' })
await c.boot()
await c.js(`document.getElementById('openCase').click(); 1`); await sleep(4500)
const H = await c.js(`document.getElementById('caseScroll').scrollHeight`)
for (let y=0;y<H;y+=900){ await c.js(`document.getElementById('caseScroll').scrollTo(0,${y});1`); await sleep(80) }
await c.js(`document.getElementById('caseScroll').scrollTop = 0; 1`); await sleep(2500)
// pin every cd board onto its card state so the resting selected-item background is in play everywhere
await c.js(`document.querySelectorAll('.cd-geo-note').forEach((b,i)=>{ if(i===2) b.classList.add('is-current') }); 1`); await sleep(600)
const r = await c.jsn(`(() => {
  const lin=v=>{v/=255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4)}
  const L=p=>0.2126*lin(p[0])+0.7152*lin(p[1])+0.0722*lin(p[2])
  const P=s=>{let m=String(s).match(/rgba?\(([^)]+)\)/); if(m){const q=m[1].split(/[,\/\s]+/).filter(Boolean).map(Number);return [q[0],q[1],q[2],q.length>3?q[3]:1]}
    m=String(s).match(/color\(srgb ([^)]+)\)/); if(m){const q=m[1].split(/[\/\s]+/).filter(Boolean).map(Number);return [q[0]*255,q[1]*255,q[2]*255,q.length>3?q[3]:1]} return null}
  const over=(f,b)=>[f[0]*f[3]+b[0]*(1-f[3]),f[1]*f[3]+b[1]*(1-f[3]),f[2]*f[3]+b[2]*(1-f[3]),1]
  const out=[]
  for (const el of document.querySelectorAll('#case .cd *')) {
    const own=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').trim()
    if (own.length<4) continue
    const b=el.getBoundingClientRect(); if (b.width<3||b.height<3) continue
    const cs=getComputedStyle(el); if (cs.visibility==='hidden') continue
    let stack=[],e=el,bad=''
    while(e&&e.nodeType===1){const s=getComputedStyle(e); if(s.backgroundImage!=='none'){bad='img';break}
      const q=P(s.backgroundColor); if(!q){bad='parse:'+s.backgroundColor;break}
      if(q[3]>0){stack.unshift(q); if(q[3]>=0.999)break} e=e.parentElement}
    if(bad) continue
    let bg=[255,255,255,1]; for(const l of stack) bg=over(l,bg)
    const fg=P(cs.color); if(!fg) continue
    const t=over(fg,bg); const ra=(Math.max(L(t),L(bg))+0.05)/(Math.min(L(t),L(bg))+0.05)
    const px=parseFloat(cs.fontSize), w=parseInt(cs.fontWeight)||400
    const need=(px>=24||(px>=18.66&&w>=700))?3:4.5
    if(ra+0.02<need) out.push({cls:el.className.toString().slice(0,34), px:+px.toFixed(1), w, ratio:+ra.toFixed(3), need,
      fg:cs.color, bg:'rgb('+bg.slice(0,3).map(Math.round).join(',')+')', t:own.slice(0,34)})
  }
  return out.sort((a,b)=>a.ratio-b.ratio)
})()`)
console.log('case-diagram contrast fails:', r.length)
for (const f of r) console.log(' ', f.ratio+'/'+f.need, (f.px+'px/'+f.w).padEnd(10), (f.fg+' on '+f.bg).padEnd(40), f.cls.padEnd(24), '"'+f.t+'"')
c.close()
