import { readFile } from 'node:fs/promises'
const R = 'C:/Claude Database/punch-exercise/showcase/'
const css = (await readFile(R + 'case-diagrams.css','utf8')).replace(/\/\*[\s\S]*?\*\//g,'')
const idx = await (await fetch('http://localhost:5770/')).text()
let js = await readFile(R + 'case-diagrams.js','utf8')
const cut=(s,n)=>{const a=s.indexOf('function '+n);if(a<0)return s;let d=0,i=s.indexOf('{',a);for(;i<s.length;i++){if(s[i]==='{')d++;else if(s[i]==='}'){d--;if(!d)break}}return s.slice(0,a)+s.slice(i+1)}
const hay = idx + cut(cut(js,'initState'),'initRun')
function rules(src){const out=[];let d=0,st=0,sel='';for(let i=0;i<src.length;i++){const c=src[i]
  if(c==='{'){if(d===0){sel=src.slice(st,i);st=i+1}d++}
  else if(c==='}'){d--;if(d===0){out.push({sel:sel.trim(),body:src.slice(st,i)});st=i+1}}}return out}
const flat=[]
for(const r of rules(css)){ if(/^@media|^@supports/.test(r.sel)) flat.push(...rules(r.body)); else if(!/^@/.test(r.sel)) flat.push(r) }
let wholeDeadRules=0, wholeDeadBytes=0, mixedRules=0, mixedSelBytes=0
const isDead=(p)=>{const c=[...p.matchAll(/\.(cd-[\w-]+)/g)].map(m=>m[1]);return c.length>0&&c.some(x=>!hay.includes(x))}
for(const r of flat){
  const parts=r.sel.split(',').map(s=>s.trim()).filter(Boolean)
  if(!parts.length)continue
  const dead=parts.filter(isDead)
  if(dead.length===parts.length){wholeDeadRules++;wholeDeadBytes+=r.sel.length+r.body.length+3}
  else if(dead.length){mixedRules++;mixedSelBytes+=dead.reduce((a,p)=>a+p.length+1,0)}
}
console.log(JSON.stringify({wholeDeadRules,wholeDeadBytes,mixedRules,deadSelectorTextInMixedRules:mixedSelBytes,exactDeletable:wholeDeadBytes+mixedSelBytes,cssTotal:css.length},null,1))
