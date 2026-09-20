// short-lived probe server (exits with the script) to test HTTP-cache reuse vs fetch(cache:'no-store')
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const hits = []
const BODY = JSON.stringify({ probe: 'x'.repeat(2000) })
const srv = createServer((req, res) => {
  if (req.url.startsWith('/probe.json')) {
    hits.push({ url: req.url, ifNoneMatch: req.headers['if-none-match'] || null, cc: req.headers['cache-control'] || null, pragma: req.headers['pragma'] || null })
    if (req.headers['if-none-match'] === '"abc"') { res.writeHead(304, { etag: '"abc"', 'cache-control': 'public, max-age=600' }); return res.end() }
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'public, max-age=600', etag: '"abc"' }); return res.end(BODY)
  }
  res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><title>p</title>')
})
await new Promise(r => srv.listen(0, '127.0.0.1', r))
const sp = srv.address().port
const port = 9800 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--disable-gpu','--no-first-run',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'skn2'+port)}`,'about:blank'], { stdio: 'ignore' })
const sleep = ms => new Promise(r => setTimeout(r, ms))
let t; for (let i=0;i<120&&!t;i++){ try{ t=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page') }catch{ await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0; const pend=new Map()
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}})
const send=(m,p={})=>new Promise(r=>{const n=++id;pend.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}))})
const js=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await send('Page.navigate',{url:`http://127.0.0.1:${sp}/`}); await sleep(1200)
hits.length = 0
const mark = []
await js(`(async()=>{ await fetch('/probe.json') })()`); await sleep(300); mark.push(['1 plain (cold)', hits.length])
await js(`(async()=>{ await fetch('/probe.json') })()`); await sleep(300); mark.push(['2 plain (should be cache hit)', hits.length])
await js(`(async()=>{ await fetch('/probe.json',{cache:'no-store'}) })()`); await sleep(300); mark.push(["3 cache:'no-store'", hits.length])
await js(`(async()=>{ await fetch('/probe.json') })()`); await sleep(300); mark.push(['4 plain again', hits.length])
console.log('cumulative requests that REACHED the server:')
for (const [k,v] of mark) console.log('  after', k.padEnd(32), '=', v)
console.log('server-side request log:', JSON.stringify(hits, null, 1))
ws.close(); chrome.kill(); srv.close(); process.exit(0)
