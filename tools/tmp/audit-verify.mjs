// Focused checks: which diagrams exist, which @font-face families ever load, video behaviour, global API callers.
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const W = 1600
const port = 9700 + Math.floor(Math.random() * 200)
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', '--force-prefers-reduced-motion=no-preference', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'vf' + port)}`, `--window-size=${W},1000`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let t
for (let i = 0; i < 250 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page') } catch { await sleep(150) } }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0; const pend = new Map(); const errs = []
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return }
  if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map(a => a.value || a.description).join(' ')) })
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(3500)
await js('localStorage.clear(); 1')
await send('Page.navigate', { url: 'http://localhost:5770/' }); await sleep(7000)

console.log('--- globals exposed on window ---')
console.log(await js(`JSON.stringify(Object.keys(window).filter(k=>/^(Punch|PSec|showcase|ds|lucide|punch)/i.test(k)))`))
console.log('\n--- the three stylesheet files the dev server concatenates exist on disk? (build.mjs writes them) ---')
for (const f of ['sections.css', 'mscreens.css', 'mpages.css']) console.log(f, await js(`fetch('${f}').then(r=>r.status)`))

// exercise everything that draws diagrams
await js(`window.showcase.mode('mobile'); 1`); await sleep(1500)
await js(`document.getElementById('openCase').click(); 1`); await sleep(3000)
await js(`(async()=>{const s=document.querySelector('#case .case-scroll')||document.getElementById('case');for(let y=0;y<s.scrollHeight;y+=400){s.scrollTop=y;await new Promise(r=>setTimeout(r,70))}return s.scrollHeight})()`)
await sleep(3000)
console.log('\n--- diagrams present in the served case study (.cd[data-cd]) ---')
console.log(await js(`JSON.stringify([...document.querySelectorAll('.cd[data-cd]')].map(e=>e.dataset.cd))`))
console.log('elements with class cd-state / cd-run anywhere:', await js(`document.querySelectorAll('.cd-state, .cd-run').length`))
console.log('case-diagrams.js loaded?', await js(`!!document.querySelector('script[src*="case-diagrams"]')`))

// fonts
await js(`window.showcase.mode('ds'); 1`); await sleep(3500)
await js(`(async()=>{const s=document.scrollingElement;for(let y=0;y<s.scrollHeight;y+=600){s.scrollTo(0,y);await new Promise(r=>setTimeout(r,60))}s.scrollTo(0,0);return 1})()`); await sleep(2000)
for (const tf of ['orbitron', 'chakra', 'arena']) { await js(`document.documentElement.dataset.typeface='${tf}'; 1`); await sleep(800) }
await js(`window.showcase.mode('machine'); 1`); await sleep(2500)
for (const s of JSON.parse(await js(`JSON.stringify(window.PSec.pages('machine'))`))) { await js(`window.showcase.mscreen('${s}'); 1`); await sleep(500) }
await js(`window.showcase.mode('mobile'); 1`); await sleep(1500)
console.log('\n--- @font-face entries and whether they ever loaded ---')
console.log(await js(`JSON.stringify([...document.fonts].map(f=>({f:f.family,w:f.weight,s:f.status})))`))

// video
await js(`window.showcase.mode('animation'); 1`); await sleep(5000)
await js(`(async()=>{const s=document.scrollingElement;for(let y=0;y<s.scrollHeight;y+=500){s.scrollTo(0,y);await new Promise(r=>setTimeout(r,80))}return 1})()`); await sleep(4000)
console.log('\n--- <video> on the animation tab ---')
console.log(await js(`JSON.stringify([...document.querySelectorAll('video')].filter(v=>v.closest('.anim')||v.dataset.animClip!==undefined).map(v=>({src:(v.currentSrc||v.src||'').split('/').pop(),poster:!!v.poster,preload:v.preload,readyState:v.readyState,paused:v.paused,w:Math.round(v.getBoundingClientRect().width),h:Math.round(v.getBoundingClientRect().height),vw:v.videoWidth,vh:v.videoHeight})))`))
console.log('\n--- every <video> in the document: how many, how many with a poster, how many preload!=none ---')
console.log(await js(`JSON.stringify((()=>{const v=[...document.querySelectorAll('video')];return{count:v.length,noPoster:v.filter(x=>!x.getAttribute('poster')).map(x=>(x.currentSrc||x.src||x.getAttribute('src')||'?').split('/').pop()),eager:v.filter(x=>x.preload!=='none').length}})())`))
console.log('\nerrors:', errs.length, JSON.stringify(errs.slice(0, 10)))
ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(join(tmpdir(), 'vf' + port), { recursive: true, force: true }) } catch { /* still held */ } }, 600)   // the profile is 57 MB; leave nothing behind
