import { readdirSync, statSync, readFileSync } from 'fs'
import { join } from 'path'
const files = []
;(function walk(d){ for(const e of readdirSync(d)){ const p=join(d,e); const s=statSync(p)
  if(s.isDirectory()) walk(p); else if(p.endsWith('.js')) files.push(p) } })('showcase')
// find every `attr='` occurrence that sits inside a backtick template literal
let hits=0, esc=0
for(const f of files){
  const src=readFileSync(f,'utf8'); const lines=src.split('\n')
  lines.forEach((ln,i)=>{
    // attribute-looking single quote: name=' preceded by whitespace or <tag
    const re=/[\s"'`][a-zA-Z-]+=\x27/g; let m
    while((m=re.exec(ln))){
      // only care if the line contains a backtick (template literal) i.e. HTML building
      if(!ln.includes('`')) continue
      hits++
      console.log(`SINGLE-QUOTED-ATTR ${f}:${i+1}  ...${ln.slice(Math.max(0,m.index-30), m.index+60).trim()}`)
    }
  })
  esc += (src.match(/\$\{esc\(/g)||[]).length
}
console.log('single-quoted attributes in template literals:', hits)
console.log('total ${esc( interpolations scanned:', esc)
console.log('files scanned:', files.length)
