import { useEffect, useState } from 'react'

/**
 * Revisão do épico ORY-94 (2ª rodada) — contra o "double-clickjacking": a aprovação da trava
 * humana é um clique só, e outra página pode abrir esta tela por baixo do segundo clique de um
 * duplo clique. O botão só libera com a página VISÍVEL e com FOCO, depois de um gesto feito
 * nesta página (mexer o ponteiro, tocar, teclar) e de uma espera curta desde que ela abriu.
 */
export const ESPERA_ANTES_DE_LIBERAR_MS = 600

export function useGestoNaPagina(ativo: boolean): boolean {
  const [tempoOk, setTempoOk] = useState(false)
  const [gesto, setGesto] = useState(false)
  const [visivel, setVisivel] = useState(() => paginaEmPrimeiroPlano())

  useEffect(() => {
    if (!ativo) return
    const relogio = window.setTimeout(() => setTempoOk(true), ESPERA_ANTES_DE_LIBERAR_MS)
    const aoGesto = () => {
      if (paginaEmPrimeiroPlano()) setGesto(true)
    }
    const aoMudar = () => {
      const agora = paginaEmPrimeiroPlano()
      setVisivel(agora)
      // Saiu do primeiro plano: o próximo clique precisa de um gesto novo nesta página.
      if (!agora) setGesto(false)
    }
    window.addEventListener('pointermove', aoGesto)
    window.addEventListener('touchstart', aoGesto)
    window.addEventListener('keydown', aoGesto)
    window.addEventListener('focus', aoMudar)
    window.addEventListener('blur', aoMudar)
    document.addEventListener('visibilitychange', aoMudar)
    return () => {
      // Desligou (ou religou): a próxima vez começa do zero, com espera e gesto novos.
      setTempoOk(false)
      setGesto(false)
      window.clearTimeout(relogio)
      window.removeEventListener('pointermove', aoGesto)
      window.removeEventListener('touchstart', aoGesto)
      window.removeEventListener('keydown', aoGesto)
      window.removeEventListener('focus', aoMudar)
      window.removeEventListener('blur', aoMudar)
      document.removeEventListener('visibilitychange', aoMudar)
    }
  }, [ativo])

  return ativo && tempoOk && gesto && visivel
}

function paginaEmPrimeiroPlano(): boolean {
  return document.visibilityState === 'visible' && document.hasFocus()
}
