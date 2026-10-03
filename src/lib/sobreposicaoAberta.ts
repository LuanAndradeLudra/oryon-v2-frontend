/**
 * Há um diálogo, gaveta ou menu aberto na página?
 *
 * Revisão 03/10: o atalho global J/K/E/R de Conversas só se calava em campo de
 * texto. Com o "Arquivar" aberto (foco no botão Cancelar), J trocava de
 * conversa por baixo do modal — e confirmar arquivava a conversa NOVA. Atalho
 * de página nunca age com uma sobreposição aberta.
 */
export function haSobreposicaoAberta(doc: Document = document): boolean {
  return !!doc.querySelector('[aria-modal="true"], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]')
}
