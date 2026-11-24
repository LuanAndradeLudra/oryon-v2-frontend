import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Revisão do épico ORY-94 (2ª rodada) — contra o "double-clickjacking": a aprovação da trava
 * humana é um clique só, e outra página pode abrir esta tela por baixo do segundo clique de um
 * duplo clique. O botão só libera com a página VISÍVEL e com FOCO, depois de um gesto feito
 * nesta página (mexer o ponteiro, tocar, teclar) e de uma espera curta desde que ela abriu.
 *
 * Revisão do épico (18/11, 3ª rodada): no toque, o `touchstart` do próprio toque que aprova
 * contava como o gesto e habilitava o botão antes do `click` do mesmo toque. Agora o gesto só
 * libera depois de uma folga, e o clique só vale se a interação dele (pointerdown, mousedown,
 * touchstart ou tecla) começou depois dessa folga: quem libera nunca é o próprio clique.
 */
export const ESPERA_ANTES_DE_LIBERAR_MS = 600
/** 3ª rodada: o gesto que libera tem de vir pelo menos isto antes do toque (ou tecla) que aprova. */
export const FOLGA_DO_GESTO_MS = 400
/** Uma interação mais velha que isto não é a do clique de agora (clique sem toque, ex.: leitor de tela). */
const VALIDADE_DO_INICIO_MS = 1500

export interface GestoNaPagina {
  /** O "Aprovar" pode aparecer habilitado. */
  liberado: boolean
  /** Chamar no clique do "Aprovar": o gesto veio antes da interação deste clique (não é ela). */
  cliqueValido: () => boolean
}

export function useGestoNaPagina(ativo: boolean): GestoNaPagina {
  const [tempoOk, setTempoOk] = useState(false)
  const [gesto, setGesto] = useState(false)
  const [visivel, setVisivel] = useState(() => paginaEmPrimeiroPlano())
  // Quando foi o 1º gesto desde que a página ficou em primeiro plano, e quando começou a interação mais recente.
  const gestoEm = useRef<number | null>(null)
  const inicioDaInteracao = useRef<number | null>(null)
  const relogioDoGesto = useRef<number | undefined>(undefined)

  // 3ª rodada: a visibilidade é acompanhada desde a montagem (antes, só com o pedido pronto: a aba
  // trazida para frente enquanto o pedido carregava ficava "invisível" e o botão, travado).
  useEffect(() => {
    const aoMudar = () => {
      const agora = paginaEmPrimeiroPlano()
      setVisivel(agora)
      // Saiu do primeiro plano: o próximo clique precisa de um gesto novo nesta página.
      if (!agora) {
        window.clearTimeout(relogioDoGesto.current)
        gestoEm.current = null
        setGesto(false)
      }
    }
    window.addEventListener('focus', aoMudar)
    window.addEventListener('blur', aoMudar)
    document.addEventListener('visibilitychange', aoMudar)
    return () => {
      window.removeEventListener('focus', aoMudar)
      window.removeEventListener('blur', aoMudar)
      document.removeEventListener('visibilitychange', aoMudar)
    }
  }, [])

  useEffect(() => {
    if (!ativo) return
    const relogio = window.setTimeout(() => setTempoOk(true), ESPERA_ANTES_DE_LIBERAR_MS)
    // Na captura, antes de qualquer outro ouvinte: o começo do toque ou da tecla deste clique.
    const aoComecar = () => {
      inicioDaInteracao.current = performance.now()
    }
    const aoGesto = () => {
      if (!paginaEmPrimeiroPlano()) return
      setVisivel(true)
      if (gestoEm.current !== null) return
      gestoEm.current = performance.now()
      // Só habilita depois da folga: o toque que fez o gesto termina com o botão ainda desabilitado.
      relogioDoGesto.current = window.setTimeout(() => setGesto(true), FOLGA_DO_GESTO_MS)
    }
    window.addEventListener('pointerdown', aoComecar, true)
    window.addEventListener('mousedown', aoComecar, true)
    window.addEventListener('touchstart', aoComecar, true)
    window.addEventListener('keydown', aoComecar, true)
    window.addEventListener('pointermove', aoGesto)
    window.addEventListener('touchstart', aoGesto)
    window.addEventListener('keydown', aoGesto)
    return () => {
      // Desligou (ou religou): a próxima vez começa do zero, com espera e gesto novos.
      setTempoOk(false)
      setGesto(false)
      gestoEm.current = null
      inicioDaInteracao.current = null
      window.clearTimeout(relogio)
      window.clearTimeout(relogioDoGesto.current)
      window.removeEventListener('pointerdown', aoComecar, true)
      window.removeEventListener('mousedown', aoComecar, true)
      window.removeEventListener('touchstart', aoComecar, true)
      window.removeEventListener('keydown', aoComecar, true)
      window.removeEventListener('pointermove', aoGesto)
      window.removeEventListener('touchstart', aoGesto)
      window.removeEventListener('keydown', aoGesto)
    }
  }, [ativo])

  const cliqueValido = useCallback(() => {
    const gestoFoiEm = gestoEm.current
    if (gestoFoiEm === null || !paginaEmPrimeiroPlano()) return false
    const agora = performance.now()
    const inicio = inicioDaInteracao.current
    // Sem uma interação recente (clique sem toque nem tecla), conta o próprio clique.
    const comecouEm = inicio !== null && agora - inicio <= VALIDADE_DO_INICIO_MS ? inicio : agora
    return comecouEm - gestoFoiEm >= FOLGA_DO_GESTO_MS
  }, [])

  return { liberado: ativo && tempoOk && gesto && visivel, cliqueValido }
}

function paginaEmPrimeiroPlano(): boolean {
  return document.visibilityState === 'visible' && document.hasFocus()
}
