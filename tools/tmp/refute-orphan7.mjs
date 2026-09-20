import { readFile } from 'node:fs/promises'
const R = 'C:/Claude Database/punch-exercise/showcase/'
const css = (await readFile(R + 'case-diagrams.css','utf8')).replace(/\/\*[\s\S]*?\*\//g,'')
const idx = await (await fetch('http://localhost:5770/')).text()
let js = await readFile(R + 'case-diagrams.js','utf8')
const cut = (s,n)=>{const a=s.indexOf('function '+n); if(a<0)return s; let d=0,i=s.indexOf('{',a); for(;i<s.length;i++){if(s[i]==='{')d++;else if(s[i]==='}'){d--;if(!d)break}} return s.slice(0,a)+s.slice(i+1)}
const hay = idx + cut(cut(js,'initState'),'initRun')
function rules(src){const out=[];let d=0,st=0,sel='';for(let i=0;i<src.length;i++){const c=src[i]
  if(c==='{'){if(d===0){sel=src.slice(st,i);st=i+1}d++}
  else if(c==='}'){d--;if(d===0){out.push({sel:sel.trim(),body:src.slice(st,i)});st=i+1}}}return out}
let deadParts=0,liveParts=0,deadBytes=0,liveBytes=0
const flat=[]
for(const r of rules(css)){ if(/^@media|^@supports/.test(r.sel)) flat.push(...rules(r.body)); else if(!/^@/.test(r.sel)) flat.push(r) }
for(const r of flat){
  const parts=r.sel.split(',').map(s=>s.trim()).filter(Boolean)
  if(!parts.length) continue
  const per=(r.sel.length+r.body.length+3)/parts.length
  for(const p of parts){
    const cls=[...p.matchAll(/\.(cd-[\w-]+)/g)].map(m=>m[1])
    const dead = cls.length>0 && cls.some(c=>!hay.includes(c))
    if(dead){deadParts++;deadBytes+=per}else{liveParts++;liveBytes+=per}
  }
}
console.log(JSON.stringify({cssTotal:css.length,deadSelectorParts:deadParts,liveSelectorParts:liveParts,deadBytesProportional:Math.round(deadBytes),liveBytesProportional:Math.round(liveBytes)},null,1))
