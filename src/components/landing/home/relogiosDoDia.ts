import { useCallback, useEffect, useRef, useState } from 'react'
import { RITMO, duracaoDoSetor, fimDoLado, type Setor } from './dorConversas'

/**
 * OS RELÓGIOS DE "UM DIA NO WHATSAPP" (02/10): as duas conversas de um setor —
 * sem e com a Oryon — andam por relógios próprios. Usados pela seção "Por que
 * a Oryon" da home (carrossel de setores) e pela página /solucoes (uma área
 * por vez).
 *
 * Lado a lado (tablet e desktop) vê-se as duas ao mesmo tempo: os relógios
 * andam juntos enquanto a comparação está na tela, até o fim do setor (com a
 * pausa no fim). Empilhadas (celular) só se vê uma por vez: cada relógio anda
 * só com a sua conversa na faixa central da tela — rolou para fora, pausa;
 * voltou, retoma de onde parou — e para no fim da própria conversa.
 */

/** Respiro no fim de cada conversa empilhada, para o resultado assentar (tempo de roteiro). */
export const RESPIRO_FIM = 1200

/**
 * A conversa "na vista" no celular: a que cruza a faixa central da tela (os 10%
 * do meio). Só uma metade cabe ali por vez — a que a pessoa está olhando,
 * inclusive quando lê o checklist logo abaixo do aparelho.
 *
 * Ref de callback (estável), e não `useInView`: os aparelhos remontam a cada
 * setor (o carrossel desliza o antigo para fora enquanto o novo entra), e o
 * observador precisa seguir o elemento novo. Só o último elemento ligado conta.
 */
export function useNaFaixaCentral() {
  const [naFaixa, setNaFaixa] = useState(false)
  const atual = useRef<Element | null>(null)
  const ref = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    atual.current = el
    let observador: IntersectionObserver
    try {
      observador = new IntersectionObserver((entradas) => {
        for (const e of entradas) if (e.target === atual.current) setNaFaixa(e.isIntersecting)
      }, { rootMargin: '-45% 0px -45% 0px' })
    } catch {
      return // sem IntersectionObserver (ambiente de teste): fica fora da vista
    }
    observador.observe(el)
    return () => {
      observador.disconnect()
      if (atual.current === el) atual.current = null
    }
  }, [])
  return [ref, naFaixa] as const
}

/**
 * Os dois relógios de um setor (tempo real, em ms). `ativo` é falso com a
 * pausa ou sem movimento; `naTela` vale lado a lado, `semNaVista`/`comNaVista`
 * empilhadas. `zerar` recomeça as duas (troca de setor, "ver de novo").
 */
export function useRelogiosDoDia(setor: Setor, { ativo, ladoALado, naTela, semNaVista, comNaVista }: {
  ativo: boolean
  ladoALado: boolean
  naTela: boolean
  semNaVista: boolean
  comNaVista: boolean
}) {
  const [msSem, setMsSem] = useState(0)
  const [msCom, setMsCom] = useState(0)
  const total = duracaoDoSetor(setor) * RITMO
  // Lado a lado, as duas correm até o fim do setor (com a pausa no fim);
  // empilhadas, cada uma para no fim da própria conversa.
  const fimSem = ladoALado ? total : (fimDoLado(setor.sem) + RESPIRO_FIM) * RITMO
  const fimCom = ladoALado ? total : (fimDoLado(setor.com) + RESPIRO_FIM) * RITMO
  const correndoSem = ativo && (ladoALado ? naTela : semNaVista) && msSem < fimSem
  const correndoCom = ativo && (ladoALado ? naTela : comNaVista) && msCom < fimCom

  // Trocou de arranjo (girou o tablet, redimensionou): recomeça, para as duas
  // conversas não ficarem dessincronizadas lado a lado.
  const [arranjo, setArranjo] = useState(ladoALado)
  if (arranjo !== ladoALado) {
    setArranjo(ladoALado)
    setMsSem(0)
    setMsCom(0)
  }

  useEffect(() => {
    if (!correndoSem && !correndoCom) return
    let antes = performance.now()
    const id = window.setInterval(() => {
      const agora = performance.now()
      const passo = Math.min(agora - antes, 250)
      antes = agora
      if (correndoSem) setMsSem((m) => Math.min(m + passo, fimSem))
      if (correndoCom) setMsCom((m) => Math.min(m + passo, fimCom))
    }, 80)
    return () => window.clearInterval(id)
  }, [correndoSem, correndoCom, fimSem, fimCom])

  const zerar = useCallback(() => {
    setMsSem(0)
    setMsCom(0)
  }, [])

  return { msSem, msCom, total, fimSem, fimCom, zerar }
}
