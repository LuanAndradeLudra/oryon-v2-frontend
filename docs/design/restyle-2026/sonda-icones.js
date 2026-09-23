(() => {
  const o = { oryon: {}, lucide: {} };
  document.querySelectorAll('svg').forEach((s) => {
    const r = s.getBoundingClientRect(); if (!r.width) return;
    const cw = parseFloat(getComputedStyle(s).width);
    if (!cw) return;
    const fam = s.hasAttribute('data-oryon-icon') ? 'oryon' : 'lucide';
    const key = cw.toFixed(1);
    // Histograma de traço POR ELEMENTO. A versão anterior gravava o `sw` só
    // do primeiro elemento do balde e contava os demais — um Plus de 2.2
    // seguido de 102 ícones de 1.75 saía como "103 @ 2.2" (falso positivo
    // pego pelo Farol, 23/09).
    o[fam][key] = o[fam][key] || { n: 0, rect: +r.width.toFixed(1), ratio: +(r.width / cw).toFixed(3), sw: {} };
    o[fam][key].n++;
    const sw = getComputedStyle(s).strokeWidth;
    o[fam][key].sw[sw] = (o[fam][key].sw[sw] || 0) + 1;
  });
  return o;
})()
