/* No stubbing. Load the site as a visitor does, open the reel, and read back what the
   manifest-fed attributes actually contain. Also try the only visitor-typed input that
   reaches the reel (the comment box) with an attribute-breakout payload. */
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const port = 9700 + Math.floor(Math.random() * 90)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`,
  `--user-data-dir=${join(tmpdir(), 'sk' + port)}`, '--window-size=1440,1000', 'about:blank',
], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 120 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description).slice(0, 140))
})
const send = (m, p = {}) => new Promise((r) => { const n = ++id; const to = setTimeout(() => { pend.delete(n); r({ __timeout: m }) }, 20000); pend.set(n, (v) => { clearTimeout(to); r(v) }); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__pwn=[];window.__pwnPush=(t)=>{window.__pwn.push(t);return 1}' })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(5000)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(6000)

const out = {}
await js(`window.showcase.mode('mobile'); 1`); await sleep(800)
await js(`window.punchApp.go('reel'); 1`); await sleep(4000)
await js(`(async()=>{for(let k=0;k<14;k++){window.punchReel&&window.punchReel.next&&window.punchReel.next();await new Promise(r=>setTimeout(r,220))}})()`)
await sleep(2500)

// 1. what the manifest actually put into the attributes, as served
out.videoAttrs = await js(`JSON.stringify([...document.querySelectorAll('#mReelTrack video.rl-video')].slice(0,4).map(v=>({poster:v.getAttribute('poster'),src:v.getAttribute('src'),style:v.getAttribute('style')})))`)
out.saveKeys = await js(`JSON.stringify([...document.querySelectorAll('#mReelTrack [data-save-key]')].slice(0,5).map(b=>b.getAttribute('data-save-key')))`)
// 2. any inline event handler anywhere in the phone? (would be the mark of a breakout)
out.inlineHandlers = await js(`(()=>{let n=0,ex=[];document.querySelectorAll('*').forEach(e=>{for(const a of e.attributes){if(/^on/i.test(a.name)){n++;if(ex.length<4)ex.push(e.tagName+'['+a.name+']')}}});return JSON.stringify({n,ex})})()`)
out.pwnAfterReel = await js('JSON.stringify(window.__pwn)')

// 3. the only visitor-typed text that reaches the reel: the comment box
await js(`(()=>{const b=document.querySelector('#mReelTrack .m-reel-slide.is-on [data-ract="comment"]');if(b){b.click();return 1}return 0})()`)
await sleep(1200)
const payload = `x" onerror="window.__pwnPush('comment')" <img src=q onerror=window.__pwnPush('comment-img')>`
out.commentTyped = await js(`(()=>{const i=document.getElementById('mReelComInput');if(!i)return 'no input';i.value=${JSON.stringify(payload)};i.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('mReelComForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));return 'submitted'})()`)
await sleep(1500)
out.commentRendered = await js(`(()=>{const li=document.querySelector('#mReelComList li');return li?li.innerHTML.slice(0,260):'none'})()`)
out.pwnAfterComment = await js('JSON.stringify(window.__pwn)')
out.commentImgTags = await js(`document.querySelectorAll('#mReelComList img[src="q"]').length`)
out.errors = errs.slice(0, 8)
console.log(JSON.stringify(out, null, 1))
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'sk' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600); process.exit(0)
