import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = fileURLToPath(new URL('../build/', import.meta.url))
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json', '.jpg':'image/jpeg', '.css':'text/css' }
createServer(async (req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0])
  const file = join(ROOT, normalize(p === '/' ? '/composer.html' : p))
  try {
    let body = await readFile(file)
    if (req.url.includes('light') && file.endsWith('.html')) body = Buffer.concat([body, Buffer.from('<script>document.documentElement.dataset.theme="light"<\/script>')])
    if (req.url.includes('edit') && file.endsWith('.html')) body = Buffer.concat([body, Buffer.from(`<script>setTimeout(()=>{document.getElementById('mEdit').click();const s=document.getElementById('scrub');s.value=1200;s.dispatchEvent(new Event('input'));},900)<\/script>`)])
    if (req.url.includes('test') && file.endsWith('.html')) body = Buffer.concat([body, Buffer.from(`<div id="probe" style="position:fixed;left:0;top:0;z-index:99;background:#ff0;color:#000;font:12px monospace;padding:6px;width:1400px"></div>
<script>
const read = () => ['plate','stage','claim','verdict','footer'].map(id => { const n = document.querySelector('#pick-'+id+' s'); return id+':'+(n?n.textContent:'-') }).join('  ')
setTimeout(() => {
  const out = []
  out.push('ALL VISIBLE  ' + read())
  document.getElementById('eye-verdict').click()
  out.push('VERDICT HIDDEN  ' + read())
  document.getElementById('pick-plate').click()
  const plus = document.querySelectorAll('.stepper button')[1]
  plus.click(); plus.click()
  out.push('PLATE +160  ' + read())
  document.getElementById('eye-verdict').click()
  out.push('VERDICT BACK  ' + read())
  document.getElementById('probe').textContent = out.join('   ||   ')
}, 1200)
<\/script>`)])
    if (req.url.includes('probe') && file.endsWith('.html')){
      body = Buffer.concat([body, Buffer.from(`<div id="probe" style="position:fixed;left:0;top:0;z-index:99;background:#ff0;color:#000;font:11px monospace;padding:4px;max-width:400px"></div>
<script>setTimeout(()=>{const vw=document.documentElement.clientWidth;const bad=[...document.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>vw+1}).map(e=>e.tagName+'.'+(e.className||'')+' r'+Math.round(e.getBoundingClientRect().right)+' w'+Math.round(e.getBoundingClientRect().width));document.getElementById('probe').textContent='vw'+vw+' sw'+document.documentElement.scrollWidth+' | '+bad.slice(0,10).join(' / ')},1500)<\/script>`)])
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' })
    res.end(body)
  } catch { res.writeHead(404); res.end('not found') }
}).listen(5766, () => console.log('composer on http://localhost:5766'))
