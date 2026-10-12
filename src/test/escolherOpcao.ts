import { fireEvent } from '@testing-library/react'

/**
 * Ajudantes de teste para campos de seleção (01/10): servem ao `<select>`
 * nativo e ao `SelectMenu` (o select de vidro do DS), para o teste não
 * precisar saber qual dos dois está na tela — no celular o SelectMenu vira o
 * nativo, e as telas migram aos poucos.
 *
 * O projeto não usa `user-event`: tudo por `fireEvent`, como o resto da suíte.
 */

/** Escolhe a opção pelo valor (ou, sem valor igual, pelo rótulo visível). */
export function escolherOpcao(campo: HTMLElement, valorOuRotulo: string): void {
  if (campo instanceof HTMLSelectElement) {
    const opcoes = Array.from(campo.options)
    const opcao = opcoes.find((o) => o.value === valorOuRotulo) ?? opcoes.find((o) => o.text.trim() === valorOuRotulo)
    if (!opcao) throw new Error(`escolherOpcao: não há opção "${valorOuRotulo}" (há: ${opcoes.map((o) => o.value).join(', ')})`)
    fireEvent.change(campo, { target: { value: opcao.value } })
    return
  }
  const opcoes = abrirLista(campo)
  const opcao = opcoes.find((o) => o.getAttribute('data-valor') === valorOuRotulo)
    ?? opcoes.find((o) => o.textContent?.trim() === valorOuRotulo)
  if (!opcao) {
    fireEvent.keyDown(campo, { key: 'Escape' })
    throw new Error(`escolherOpcao: não há opção "${valorOuRotulo}" (há: ${opcoes.map((o) => o.getAttribute('data-valor')).join(', ')})`)
  }
  fireEvent.click(opcao)
}

/** Os valores das opções, na ordem (o `Array.from(select.options)` dos dois campos). */
export function valoresDasOpcoes(campo: HTMLElement): string[] {
  if (campo instanceof HTMLSelectElement) return Array.from(campo.options).map((o) => o.value)
  const jaAberta = campo.getAttribute('aria-expanded') === 'true'
  const valores = abrirLista(campo).map((o) => o.getAttribute('data-valor') ?? '')
  if (!jaAberta) fireEvent.keyDown(campo, { key: 'Escape' })
  return valores
}

/** Os rótulos visíveis das opções, na ordem. */
export function rotulosDasOpcoes(campo: HTMLElement): string[] {
  if (campo instanceof HTMLSelectElement) return Array.from(campo.options).map((o) => o.text.trim())
  const jaAberta = campo.getAttribute('aria-expanded') === 'true'
  const rotulos = abrirLista(campo).map((o) => o.textContent?.trim() ?? '')
  if (!jaAberta) fireEvent.keyDown(campo, { key: 'Escape' })
  return rotulos
}

function abrirLista(campo: HTMLElement): HTMLElement[] {
  if (campo.getAttribute('role') !== 'combobox') {
    throw new Error(`escolherOpcao: esperava um <select> ou um combobox, veio <${campo.tagName.toLowerCase()}>`)
  }
  if (campo.getAttribute('aria-expanded') !== 'true') fireEvent.click(campo)
  const id = campo.getAttribute('aria-controls')
  const lista = id ? document.getElementById(id) : null
  if (!lista) throw new Error('escolherOpcao: a lista não abriu (o campo está desabilitado?)')
  return Array.from(lista.querySelectorAll<HTMLElement>('[role="option"]'))
}
