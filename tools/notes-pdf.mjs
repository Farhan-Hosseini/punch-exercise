// Typesets deliverables/notes.md as an A4 page with Inter, then prints it to PDF with headless Chrome.
import { readFile, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
const md = await readFile('deliverables/notes.md', 'utf8')
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\[EDIT:(.+?)\]/g, '<mark>[EDIT:$1]</mark>')
let html = '', inList = false
for (const line of md.split(/\r?\n/)) {
  if (line.startsWith('# ')) { html += `<h1>${inline(line.slice(2))}</h1>`; continue }
  if (line.startsWith('- ')) { if (!inList) { html += '<ul>'; inList = true } html += `<li>${inline(line.slice(2))}</li>`; continue }
  if (inList) { html += '</ul>'; inList = false }
  if (line.trim()) html += `<p>${inline(line)}</p>`
}
if (inList) html += '</ul>'
const font = (w) => pathToFileURL(resolve(`node_modules/@fontsource/inter/files/inter-latin-${w}-normal.woff2`)).href
const orb = pathToFileURL(resolve('node_modules/@fontsource/orbitron/files/orbitron-latin-900-normal.woff2')).href
const page = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Inter;font-weight:400;src:url(${font(400)})}
@font-face{font-family:Inter;font-weight:600;src:url(${font(600)})}
@font-face{font-family:Orbitron;font-weight:900;src:url(${orb})}
@page{size:A4;margin:16mm 18mm}
body{font-family:Inter,sans-serif;color:#221E1D;font-size:9.4pt;line-height:1.42;margin:0}
h1{font-family:Orbitron,sans-serif;font-weight:900;font-size:15pt;letter-spacing:.04em;margin:0 0 3mm;text-transform:uppercase}
h1::after{content:"";display:block;width:14mm;height:1.2mm;background:#EB1110;margin-top:2.4mm}
p{margin:0 0 2.2mm}
ul{margin:0 0 2.2mm;padding-left:4mm}
li{margin:0 0 1.2mm}
strong{font-weight:600}
mark{background:#FFFAE7;color:#221E1D;padding:0 .6mm}
</style><body>${html}</body>`
await writeFile('deliverables/notes.html', page)
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const out = resolve('deliverables/notes.pdf')
const r = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--user-data-dir=${resolve('C:/gtmp/punch/pdfprof')}`, `--print-to-pdf=${out}`, pathToFileURL(resolve('deliverables/notes.html')).href], { stdio: 'inherit' })
console.log('chrome exit', r.status, out)
