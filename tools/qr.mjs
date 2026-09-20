// Generates a scannable QR as an SVG path and as a JS matrix for the canvas scene.
import QRCode from 'qrcode'
import { writeFile } from 'node:fs/promises'
const url = process.argv[2] || 'https://punch.app/c/7KQ2-M4'
const qr = QRCode.create(url, { errorCorrectionLevel: 'Q' })
const n = qr.modules.size
const bits = []
for (let y = 0; y < n; y++) { const r = []; for (let x = 0; x < n; x++) r.push(qr.modules.get(x, y) ? 1 : 0); bits.push(r) }
let d = ''
for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (bits[y][x]) d += `M${x} ${y}h1v1h-1z`
const svg = (fg, bg, quiet = 4) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-quiet} ${-quiet} ${n + 2 * quiet} ${n + 2 * quiet}" shape-rendering="crispEdges">${bg ? `<rect x="${-quiet}" y="${-quiet}" width="${n + 2 * quiet}" height="${n + 2 * quiet}" fill="${bg}"/>` : ''}<path d="${d}" fill="${fg}"/></svg>`
await writeFile('assets/qr/qr-dark-on-light.svg', svg('#0f0d0d', '#ffffff'))
await writeFile('assets/qr/qr-light-on-dark.svg', svg('#ffffff', null))
await writeFile('motion/qr.js', `// ${url}\nconst QR_MATRIX = ${JSON.stringify(bits)}\n`)
console.log('qr', n, 'modules for', url)
