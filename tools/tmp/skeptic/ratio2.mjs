const lin = c => { c/=255; return c<=0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); };
const L = ([r,g,b]) => 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
const ratio = (a,b) => { const la=L(a), lb=L(b); const [hi,lo]=la>lb?[la,lb]:[lb,la]; return (hi+0.05)/(lo+0.05); };
const mix = (a,b,t) => a.map((v,i)=> v*t + b[i]*(1-t));   // t of a over b
const FRAME = [245,245,247];                               // .cs-diagram-frame, measured
const CARD  = [0.918431*255, 0.918431*255, 0.926275*255];  // .is-current, measured color(srgb ...)
const HOVER = mix(CARD, FRAME, 0.70);                      // color-mix(card 70%, transparent) over frame
const MUTED = [110,110,115];  // --cd-muted light
const INK   = [29,29,31];
const rows = [
  ['note-d 13px/400  NOT current (on frame)      ', MUTED, FRAME],
  ['note-d 13px/400  IS  current (on card)       ', MUTED, CARD],
  ['note-d 13px/400  hover (card 70% over frame) ', MUTED, HOVER],
  ['note-t 14.5px/600 IS current (on card)       ', INK,   CARD],
  ['spec-d 13px/400  (on frame)                  ', MUTED, FRAME],
];
for (const [n,f,b] of rows) {
  const r = ratio(f,b);
  console.log((r < 4.5 ? 'FAIL ' : 'pass ') + r.toFixed(3) + '  ' + n +
    '  fg ' + f.map(Math.round).join(',') + ' on ' + b.map(Math.round).join(','));
}
console.log('\nCARD exact:', CARD.map(v=>v.toFixed(2)).join(', '), '-> rounded', CARD.map(Math.round).join(','));
console.log('HOVER      :', HOVER.map(Math.round).join(','));
// what darkening reaches AA on the card
for (const v of [104,102,100,98,96,94,90]) console.log('  fg', v+','+v+','+(v+5), '->', ratio([v,v,v+5], CARD).toFixed(3));
