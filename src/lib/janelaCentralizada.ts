// ─── Janela (pop-up) centralizada sobre a do app ─────────────────────────────
// `window.open` com só largura/altura deixa o navegador escolher a posição —
// no Chrome/Windows a janela cai no canto superior esquerdo da tela. Aqui a
// posição é calculada pelo centro da janela atual (funciona com dois
// monitores: screenX/screenY já são da tela onde o app está). PO 13/10.

export function abrirJanelaCentralizada(url: string, nome: string, largura: number, altura: number): Window | null {
  const esquerda = Math.max(0, Math.round(window.screenX + (window.outerWidth - largura) / 2))
  const topo = Math.max(0, Math.round(window.screenY + (window.outerHeight - altura) / 2))
  return window.open(url, nome, `width=${largura},height=${altura},left=${esquerda},top=${topo}`)
}
