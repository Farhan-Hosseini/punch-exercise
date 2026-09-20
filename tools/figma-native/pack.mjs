// Packs serialized designs (build/figma/native/items) into carrier SVGs for Figma: each carrier holds the renderer and a
// batch of designs as base64 JSON inside one <text>, so the data never passes through a prompt.
// node tools/figma-native/pack.mjs <mode> [only]
//   modes: msections (Machine sections page), mscreens (Machine screens page), psections (Mobile sections), papp (Mobile app)
// Writes build/figma/native/carriers/<mode>-NN.svg and build/figma/native/carriers/<mode>.json (the list, in order).
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tidy, stats } from './layout.mjs'

const ROOT = 'C:/Claude Database/punch-exercise'
const N = join(ROOT, 'build/figma/native')
const [mode, only] = process.argv.slice(2)
const renderer = await readFile(join(ROOT, 'tools/figma-native/renderer.js'), 'utf8')
const refs = JSON.parse(await readFile(join(N, 'figma-refs.json'), 'utf8'))
let hashes = {}
try { hashes = JSON.parse(await readFile(join(N, 'hashes.json'), 'utf8')) } catch { console.log('no hashes.json yet: images will be grey') }
// every tree is tidied on the way in: plain wrappers folded, rows, columns and grids given auto layout
const load = async (f) => tidy(JSON.parse(await readFile(join(N, 'items', f), 'utf8')))
// the latest extraction's index: index-all.json when both surfaces were extracted together
const idx = async (w) => {
  try { const a = JSON.parse(await readFile(join(N, 'index-all.json'), 'utf8')); return { ...a, items: a.items.filter((it) => it.surface === w) } } catch { return JSON.parse(await readFile(join(N, `index-${w}.json`), 'utf8')) }
}
await mkdir(join(N, 'carriers'), { recursive: true })

const clean = (s) => String(s).replace(/[,=]/g, ' ').replace(/\s+/g, ' ').trim()
const SCREENS = ['default', 'attract', 'scan', 'countdown', 'loading', 'result', 'score', 'record']
const PAGES = ['default', 'scan', 'connect', 'connected', 'punch', 'topup', 'checkout', 'paid', 'failed', 'hit', 'reel', 'ranks', 'feed', 'profile']

// a label: the section's name over its set, in the file's own type
const label = (text, note, w) => ({
  t: 'f', n: 'Label / ' + text, w: Math.max(400, w), h: note ? 84 : 48, x: 0, y: 0,
  k: [{ t: 't', n: 'Name', x: 0, y: 0, w: 1200, h: 40, one: 1, al: 'left', runs: [{ s: text, f: 'Barlow', wt: 700, sz: 32, lh: 40, c: [0.96, 0.95, 0.94, 1] }] }]
    .concat(note ? [{ t: 't', n: 'Note', x: 0, y: 48, w: 1600, h: 30, one: 1, al: 'left', runs: [{ s: note, f: 'Barlow', wt: 500, sz: 22, lh: 30, c: [0.96, 0.95, 0.94, 0.62] }] }] : []),
})

function payload(items, extra = {}) {
  const imgs = {}
  const walk = (n) => { for (const f of n.fl || []) if (f.k === 'img' && hashes[f.src]) imgs[f.src] = hashes[f.src]; for (const k of n.k || []) walk(k) }
  for (const it of items) if (it.tree) walk(it.tree)
  return { renderer, items, hashes: imgs, icons: refs.icons, ...extra }
}
async function writeCarriers(name, batches) {
  const list = []
  for (const [k, b] of batches.entries()) {
    const json = JSON.stringify(b)
    const b64 = Buffer.from(json, 'utf8').toString('base64')
    const file = `${name}-${String(k).padStart(2, '0')}.svg`
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10"><text x="0" y="8" font-size="4" font-family="Inter">${b64}</text></svg>`
    await writeFile(join(N, 'carriers', file), svg)
    list.push({ file: `build/figma/native/carriers/${file}`, chars: b64.length, items: b.items.length, what: b.what })
  }
  await writeFile(join(N, 'carriers', `${name}.json`), JSON.stringify(list, null, 1))
  console.log(name, list.length, 'carriers', 'largest', Math.max(...list.map((l) => l.chars)))
}
// batches of items up to ~180k characters of JSON, never splitting a set
function batch(groups, cap = 180000) {
  // a set bigger than a carrier goes in parts: its designs first, and the join into a set with the last part
  const parts = []
  for (const g of groups) {
    if (JSON.stringify(g).length <= cap) { parts.push(g); continue }
    let cur = { ...g, items: [], combine: [] }, size = 0
    for (const it of g.items) {
      const n = JSON.stringify(it).length
      if (cur.items.length && size + n > cap) { parts.push(cur); cur = { ...g, items: [], combine: [] }; size = 0 }
      cur.items.push(it); size += n
    }
    cur.combine = g.combine || []
    parts.push(cur)
  }
  groups = parts
  const out = []
  let cur = null
  for (const g of groups) {
    const size = JSON.stringify(g).length
    if (!cur || cur.size + size > cap) { cur = { size: 0, groups: [] }; out.push(cur) }
    cur.groups.push(g); cur.size += size
  }
  return out
}

/* ------------------------------------------------------------------ the sections pages: every design a variant */
async function sections(surface, pageId, order, colors) {
  const ix = await idx(surface)
  const byPage = new Map()
  for (const it of ix.items) {
    if (it.kind === 'section') {
      const k = it.page
      if (!byPage.has(k)) byPage.set(k, { label: it.pageLabel, secs: new Map() })
      const p = byPage.get(k)
      if (!p.secs.has(it.sec)) p.secs.set(it.sec, { label: it.secLabel, items: [] })
      p.secs.get(it.sec).items.push(it)
    }
  }
  // the shared chrome and grounds, as their own group
  const every = { label: surface === 'machine' ? 'Every screen' : 'Every page', secs: new Map() }
  for (const it of ix.items) {
    if (it.kind !== 'chrome' && it.kind !== 'background') continue
    const k = it.sec
    if (!every.secs.has(k)) every.secs.set(k, { label: it.secLabel, items: [] })
    every.secs.get(k).items.push(it)
  }
  const groups = []
  const prefix = surface === 'machine' ? 'Machine' : 'Phone'
  const GAP = surface === 'machine' ? 80 : 40, PAD = surface === 'machine' ? 60 : 32, SGAP = surface === 'machine' ? 200 : 120
  let sx = 0
  const pagesInOrder = order.filter((k) => byPage.has(k)).map((k) => [k, byPage.get(k)]).concat([['every', every]])
  for (const [key, p] of pagesInOrder) {
    let y = 160, maxW = 0
    const sectionName = `${prefix} / ${p.label}`
    for (const [sec, s] of p.secs) {
      const items = s.items.sort((a, b) => a.i - b.i)
      // an item saved without its size takes the size of its own tree
      for (const it of items) if (!(it.w > 0) || !(it.h > 0)) { const t = await load(it.file); it.w = t.w; it.h = t.h }
      const rowW = items.reduce((a, it) => a + Math.ceil(it.w), 0) + GAP * (items.length - 1) + PAD * 2
      const rowH = Math.max(...items.map((it) => Math.ceil(it.h))) + PAD * 2
      const setName = `${prefix} / ${p.label} / ${s.label}`
      const tmp = (it) => `__tmp__${surface}__${key}__${sec}__${it.i}`
      const g = {
        what: setName,
        section: { name: sectionName, x: sx, y: 0 },
        items: [],
        combine: [{ name: setName, section: sectionName, x: 120, y: y + 110, members: items.map((it) => [tmp(it), 'Design=' + clean(it.name || 'Design ' + (it.i + 1))]), gap: GAP, pad: PAD,
          description: `${s.label} on ${p.label}: ${items.length} designs, chosen in the showcase's Customise panel. Built from the running showcase.` }],
        colors,
      }
      g.items.push({ id: 'label-' + sec, tree: label(s.label, `${items.length} designs`, rowW), target: { section: sectionName, x: 120, y, name: 'Label / ' + s.label } })
      for (const it of items) g.items.push({ id: tmp(it), tree: await load(it.file), target: { section: sectionName, x: 120, y: y + 110, name: tmp(it), component: true } })
      groups.push(g)
      y += 110 + rowH + SGAP
      maxW = Math.max(maxW, rowW)
    }
    groups.push({ what: sectionName + ' title', section: { name: sectionName, x: sx, y: 0 }, items: [{ id: 'title-' + key, tree: label(p.label, surface === 'machine' ? 'Every section of this screen, each design a variant' : 'Every section of this page, each design a variant', 1200), target: { section: sectionName, x: 120, y: 40, name: 'Title / ' + p.label } }], fit: sectionName, colors })
    sx += maxW + 240 + 400
  }
  return groups
}

/* ------------------------------------------------------------------ the composed pages: the base with its slots as instances */
async function composed(surface, order, setsPage) {
  const ix = await idx(surface)
  const prefix = surface === 'machine' ? 'Machine' : 'Phone'
  const groups = []
  let x = 0
  for (const key of order) {
    const base = ix.items.find((it) => it.kind === 'base' && it.page === key)
    if (!base) continue
    const secs = new Map()
    for (const it of ix.items) if (it.kind === 'section' && it.page === key && !it.whole) secs.set(it.sec, `${prefix} / ${it.pageLabel} / ${it.secLabel}`)
    const slotMap = Object.fromEntries(secs)
    const everyName = surface === 'machine' ? 'Every screen' : 'Every page'
    // the shared chrome fills its slots, unless the page has a section of its own under the same key (the Result's sponsor)
    // the machine's chrome lives on the Components page as Machine / Header, Machine / Sponsor strip, Machine / Background
    const chromeName = (it) => (surface === 'machine' ? `Machine / ${it.secLabel.replace(/\s*\(machine\)$/, '')}` : `${prefix} / ${everyName} / ${it.secLabel}`)
    for (const it of ix.items) if ((it.kind === 'chrome' || it.kind === 'background') && !(it.sec in slotMap)) slotMap[it.sec] = chromeName(it)
    const tree = await load(base.file)
    // on the glass, a section drawn over the whole screen (a stage, an overlay) goes on top of the screen at 0, 0
    if (surface === 'machine') {
      const wholes = new Map()
      for (const it of ix.items) if (it.kind === 'section' && it.page === key && it.whole) wholes.set(it.sec, `${prefix} / ${it.pageLabel} / ${it.secLabel}`)
      for (const [sec, name] of wholes) { slotMap[sec] = name; tree.k = [...(tree.k || []), { t: 'slot', key: sec, x: 0, y: 0, w: tree.w, h: tree.h, ab: 1 }] }
    }
    const w = Math.round(tree.w), h = Math.round(base.h || tree.h)
    groups.push({
      what: `${prefix} screen ${base.pageLabel}`,
      section: { name: surface === 'machine' ? 'Screens' : 'Pages', x: 0, y: 0 },
      items: [{ id: 'screen-' + key, tree: { ...tree, h }, target: { section: surface === 'machine' ? 'Screens' : 'Pages', x: 120 + x, y: 200, name: base.pageLabel, slotMap, lookup: surface === 'machine' ? [setsPage, '1:3'] : setsPage, radius: surface === 'phone' ? 55 : 0 } },
        { id: 'screen-label-' + key, tree: label(base.pageLabel, surface === 'machine' ? '1080 x 3840' : '440 wide, full height', 600), target: { section: surface === 'machine' ? 'Screens' : 'Pages', x: 120 + x, y: 90, name: 'Label / ' + base.pageLabel } }],
      fit: surface === 'machine' ? 'Screens' : 'Pages',
    })
    x += w + (surface === 'machine' ? 240 : 160)
  }
  return groups
}

const colorsFor = (s) => refs.colors[s]
let groups, pageId
if (mode === 'msections') { pageId = '1:5'; groups = await sections('machine', pageId, SCREENS, colorsFor('machine')) }
else if (mode === 'psections') { pageId = '1:7'; groups = await sections('phone', pageId, PAGES, colorsFor('phone')) }
else if (mode === 'mscreens') { pageId = '1:4'; groups = await composed('machine', SCREENS, '1:5'); groups.forEach((g) => { g.colors = colorsFor('machine') }) }
else if (mode === 'papp') { pageId = '1:6'; groups = await composed('phone', PAGES, '1:7'); groups.forEach((g) => { g.colors = colorsFor('phone') }) }
else if (mode === 'dslooks') {
  // the Home screen in each of the four looks, whole, for the Design system's look cards
  pageId = '1:2'
  const ix = JSON.parse(await readFile(join(N, 'index-looks.json'), 'utf8'))
  groups = []
  let x = 0
  for (const it of ix.items) {
    const tree = await load(it.file)
    groups.push({ what: 'Look ' + it.name + ' ' + it.surface, section: { name: 'Look renders', x: 0, y: -6000 }, colors: colorsFor(it.surface === 'machine' ? 'machine' : 'phone'),
      items: [{ id: 'look-' + it.surface + '-' + it.i, tree: { ...tree, x: 0, y: 0 }, target: { section: 'Look renders', x: 120 + x, y: 120, name: `${it.surface === 'machine' ? 'Machine' : 'Phone'}, Home / ${it.name}`, radius: it.surface === 'phone' ? 55 : 0 } }], fit: 'Look renders' })
    x += Math.round(tree.w) + 120
  }
}
else throw new Error('mode?')
if (only) groups = groups.filter((g) => g.what.toLowerCase().includes(only.toLowerCase()))
const batches = batch(groups).map((b) => {
  const items = b.groups.flatMap((g) => g.items)
  const combine = b.groups.flatMap((g) => g.combine || [])
  const sectionsList = [...new Map(b.groups.map((g) => [g.section.name, g.section])).values()]
  const fit = [...new Set(b.groups.map((g) => g.fit || g.section.name))]
  return { ...payload(items, { pageId, combine, sections: sectionsList, fit, colors: b.groups[0].colors }), what: b.groups.map((g) => g.what).join(' | ') }
})
await writeCarriers(mode + (only ? '-' + only.replace(/\W+/g, '') : ''), batches)
const st = stats()
console.log('frames', st.frames, 'auto layout', st.auto, 'folded', st.folded, 'hoisted', st.hoisted, 'not auto', JSON.stringify(st.fails))
