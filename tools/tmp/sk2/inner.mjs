import { open, sleep } from './cdp.mjs'
const c = await open({ w: 1600, h: 1000 })
await c.send('Page.navigate', { url: 'http://localhost:5770/?embed=machine' }); await sleep(7000)
console.log('EMBED page as a top-level document:')
console.log(JSON.stringify(await c.jsj(`({
  embedFlag: document.documentElement.dataset.embed,
  stylesheetLinks: document.querySelectorAll('link[rel=stylesheet]').length,
  cssRulesTotal: [...document.styleSheets].reduce((n,s)=>{try{return n+s.cssRules.length}catch(e){return n}},0),
  scriptTags: document.querySelectorAll('script[src]').length,
  domNodes: document.getElementsByTagName('*').length,
  docBytesHint: document.documentElement.outerHTML.length,
  machineVisible: !!document.getElementById('machine'),
  phonePresent: !!document.querySelector('.device-wrap'),
  dsPresent: !!document.getElementById('ds'),
  casePresent: !!document.getElementById('case'),
  briefPresent: !!document.getElementById('brief'),
  animExtraPresent: !!document.getElementById('animExtra'),
  mpagesPresent: document.querySelectorAll('[class*=mpage],[data-mpage]').length
})`), null, 1))
c.close()
