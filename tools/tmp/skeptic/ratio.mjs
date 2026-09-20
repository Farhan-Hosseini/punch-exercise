const lin = c => { c/=255; return c<=0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); };
const L = ([r,g,b]) => 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
const ratio = (a,b) => { const la=L(a), lb=L(b); const [hi,lo]=la>lb?[la,lb]:[lb,la]; return (hi+0.05)/(lo+0.05); };
const cases = [
  ['fg 110,110,115 on 234,234,236 (reporter claim)', [110,110,115],[234,234,236]],
  ['fg 110,110,115 on 244,244,244 (card = ink5% on white)', [110,110,115],[244,244,244]],
  ['fg 110,110,115 on 255,255,255 (page white)', [110,110,115],[255,255,255]],
  ['fg 90,90,95 on 234,234,236 (proposed fix)', [90,90,95],[234,234,236]],
];
for (const [n,f,b] of cases) console.log(n.padEnd(52), ratio(f,b).toFixed(3));
