// The names the four native pages should hold after a render, from the latest extraction. A rebuild replaces what it
// finds under the same name, so anything the showcase has since dropped (a design, a section, a whole page) survives
// as a stale layer until it is removed by name. This prints the list to check against.
// node tools/figma-native/expected.mjs [--json]
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = 'C:/Claude Database/punch-exercise'
const N = join(ROOT, 'build/figma/native')
const all = JSON.parse(await readFile(join(N, 'index-all.json'), 'utf8'))
const SCREENS = ['default', 'attract', 'scan', 'countdown', 'loading', 'result', 'score', 'record']
const PAGES = ['default', 'scan', 'connect', 'connected', 'punch', 'topup', 'checkout', 'paid', 'failed', 'hit', 'reel', 'saved', 'ranks', 'feed', 'profile']

const out = {}
for (const [surface, order, secPage, screenPage] of [['machine', SCREENS, '1:5', '1:4'], ['phone', PAGES, '1:7', '1:6']]) {
  const prefix = surface === 'machine' ? 'Machine' : 'Phone'
  const items = all.items.filter((it) => it.surface === surface)
  const byPage = new Map()
  for (const it of items) {
    if (it.kind !== 'section') continue
    if (!byPage.has(it.page)) byPage.set(it.page, { label: it.pageLabel, secs: new Map() })
    const p = byPage.get(it.page)
    if (!p.secs.has(it.sec)) p.secs.set(it.sec, { label: it.secLabel, designs: [] })
    p.secs.get(it.sec).designs.push(it.name)
  }
  const sections = [], sets = {}, screens = []
  for (const key of order) {
    const p = byPage.get(key)
    if (!p) continue
    const name = `${prefix} / ${p.label}`
    sections.push(name)
    screens.push(p.label)
    for (const [, s] of p.secs) sets[`${prefix} / ${p.label} / ${s.label}`] = s.designs.map((d) => `Design=${String(d).replace(/[,=]/g, ' ').replace(/\s+/g, ' ').trim()}`)
  }
  const every = `${prefix} / ${surface === 'machine' ? 'Every screen' : 'Every page'}`
  sections.push(every)
  for (const it of items) {
    if (it.kind !== 'chrome' && it.kind !== 'background') continue
    const k = `${prefix} / ${surface === 'machine' ? 'Every screen' : 'Every page'} / ${it.secLabel}`
    ;(sets[k] = sets[k] || []).push(`Design=${String(it.name).replace(/[,=]/g, ' ').replace(/\s+/g, ' ').trim()}`)
  }
  out[surface] = { secPage, screenPage, sections, screenSection: surface === 'machine' ? 'Screens' : 'Pages', screens, sets }
}

if (process.argv.includes('--json')) console.log(JSON.stringify(out))
else {
  for (const [surface, o] of Object.entries(out)) {
    console.log(`\n== ${surface}: sections page ${o.secPage}, screens page ${o.screenPage}`)
    console.log('sections:', o.sections.length)
    for (const s of o.sections) console.log('  ' + s)
    console.log('sets:', Object.keys(o.sets).length, 'designs:', Object.values(o.sets).reduce((a, b) => a + b.length, 0))
    console.log(`${o.screenSection}:`, o.screens.join(', '))
  }
}
