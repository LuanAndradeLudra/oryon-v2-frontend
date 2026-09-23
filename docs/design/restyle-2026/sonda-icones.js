(() => {
  const o = { oryon: {}, lucide: {} };
  document.querySelectorAll('svg').forEach((s) => {
    const r = s.getBoundingClientRect(); if (!r.width) return;
    const cw = parseFloat(getComputedStyle(s).width);
    if (!cw) return;
    const fam = s.hasAttribute('data-oryon-icon') ? 'oryon' : 'lucide';
    const key = cw.toFixed(1);
    o[fam][key] = o[fam][key] || { n: 0, rect: +r.width.toFixed(1), ratio: +(r.width / cw).toFixed(3), sw: getComputedStyle(s).strokeWidth };
    o[fam][key].n++;
  });
  return o;
})()
