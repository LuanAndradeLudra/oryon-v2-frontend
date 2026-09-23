(() => {
  // Acha o sintoma REAL: controles-irmaos na mesma barra com altura ou raio
  // diferentes entre si. Sem grep, sem falso positivo — medido no DOM.
  const clicavel = (el) => ['BUTTON', 'A', 'INPUT', 'SELECT'].includes(el.tagName) || el.getAttribute('role') === 'button';
  const achados = [];
  document.querySelectorAll('div,nav,header,section').forEach((cont) => {
    const cs = getComputedStyle(cont);
    if (cs.display !== 'flex' || cs.flexDirection === 'column') return;
    const filhos = [...cont.children].map((ch) => {
      if (clicavel(ch)) return ch;
      const dentro = [...ch.querySelectorAll('*')].filter(clicavel);
      return dentro.length === 1 ? dentro[0] : null;
    }).filter(Boolean);
    if (filhos.length < 2) return;
    const medidas = filhos.map((el) => { const r = el.getBoundingClientRect(); const c = getComputedStyle(el);
      return { t: ((el.textContent || '').trim() || el.getAttribute('aria-label') || el.placeholder || '').slice(0, 14),
        h: +r.height.toFixed(1), r: c.borderTopLeftRadius, role: el.getAttribute('role') || el.tagName }; })
      .filter((m) => m.h >= 18 && m.h <= 56);
    if (medidas.length < 2) return;
    // tabs de um mesmo segmentado sao legitimamente iguais entre si; ignorar grupos de role=tab
    if (medidas.every((m) => m.role === 'tab')) return;
    const alturas = [...new Set(medidas.map((m) => m.h))];
    const raios = [...new Set(medidas.map((m) => m.r))];
    if (alturas.length > 1 || raios.length > 1) {
      const y = Math.round(cont.getBoundingClientRect().y);
      achados.push({ y, alturas, raios, itens: medidas.map((m) => `${m.t || m.role}:${m.h}/${m.r}`) });
    }
  });
  return { url: location.pathname, tema: document.documentElement.getAttribute('data-theme'), n: achados.length, achados: achados.slice(0, 8) };
})()
