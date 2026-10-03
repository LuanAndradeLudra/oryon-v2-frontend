import { useCallback, useEffect, useRef } from 'react'

/**
 * Proteção contra resposta atrasada ao TROCAR de registro sem remontar
 * (revisão 03/10, causa estrutural). Foi o padrão de bug mais recorrente:
 * conversa, contato, negócio, funil, filtro — a resposta da carga anterior
 * chegava depois e ocupava a tela (ou a ação seguinte ia para o registro
 * errado).
 *
 * Uso:
 *   const iniciarCarga = useCargaAtual(contactId)
 *   const vale = iniciarCarga()
 *   const r = await api.algo(contactId)
 *   if (!vale()) return   // trocou de registro OU outra carga começou depois
 *
 * `vale()` é falso quando a chave mudou ou quando uma carga mais nova começou.
 */
export function useCargaAtual<K>(chave: K): () => () => boolean {
  const atual = useRef(chave)
  const geracao = useRef(0)
  useEffect(() => { atual.current = chave }, [chave])
  return useCallback(() => {
    const minha = ++geracao.current
    const k = chave
    return () => minha === geracao.current && atual.current === k
  }, [chave])
}
