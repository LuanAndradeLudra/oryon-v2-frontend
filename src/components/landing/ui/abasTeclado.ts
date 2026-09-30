import type { KeyboardEvent } from 'react'

/**
 * Navegação de teclado das abas da landing (padrão WAI-ARIA de "tabs"): as
 * setas ←/→ andam entre as abas, Home/End vão para a primeira/última, e a aba
 * escolhida já é ativada e recebe o foco. Só a aba ativa entra na ordem do Tab
 * (`tabIndex` móvel, feito no componente). Auditoria WIG, 30/09.
 */
export function teclasDasAbas<T extends string>(ids: readonly T[], atual: T, escolher: (id: T) => void, prefixoId: string) {
  return (e: KeyboardEvent<HTMLElement>) => {
    const i = ids.indexOf(atual)
    let proximo = -1
    if (e.key === 'ArrowRight') proximo = (i + 1) % ids.length
    else if (e.key === 'ArrowLeft') proximo = (i - 1 + ids.length) % ids.length
    else if (e.key === 'Home') proximo = 0
    else if (e.key === 'End') proximo = ids.length - 1
    if (proximo < 0) return
    e.preventDefault()
    const id = ids[proximo]
    escolher(id)
    requestAnimationFrame(() => document.getElementById(`${prefixoId}${id}`)?.focus())
  }
}
