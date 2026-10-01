import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

/**
 * A LINHA DO TEMPO da demonstração.
 *
 * Substitui a máquina de "um índice de cena por vez". O PO foi direto: a versão
 * anterior *"ainda parece uma apresentação de slides"*, e o motivo é
 * estrutural — com um índice só, câmera, composição e produto são obrigados a
 * mudar no mesmo instante, e isso É um slide.
 *
 * Aqui cada CUE carrega, opcionalmente, uma mudança de cada camada:
 *
 *  • `state`       — o produto (mensagem que chega, situação que muda, card
 *                    que anda)
 *  • `composition` — as janelas (qual domina, qual recua, quais dividem o
 *                    palco)
 *
 * Como as duas são independentes e cada cue tem seu próprio instante, a ficha
 * do contato pode terminar de entrar enquanto a situação ainda não mudou, e o
 * funil pode assumir o foco enquanto a conversa recua — sem que nada disso
 * precise coincidir com uma troca de cena.
 *
 * O relógio é de tempo decorrido, não de contagem de passos: pausar congela o
 * decorrido; retomar continua de onde parou; a animação do card lê o mesmo
 * `paused` e para junto. Um `setTimeout` por vez, sempre — o próximo cue
 * agenda o seguinte.
 */

export interface HeroCue<S extends string, C extends string> {
  /** Instante do cue, em ms desde o início do ciclo. */
  t: number
  /** O que o PRODUTO faz neste instante. */
  state?: S
  /** Como as JANELAS se reorganizam neste instante. */
  composition?: C
  /** Duração da reorganização, em ms. */
  ms?: number
}

interface Options<S extends string, C extends string> {
  cues: readonly HeroCue<S, C>[]
  /** Tempo parado no fim antes de recomeçar. */
  tailMs: number
  hostRef: React.RefObject<Element | null>
  /**
   * Índice do cue a exibir quando não há capacidade de animar. Decisão de
   * narrativa: o quadro que se explica sozinho, não necessariamente o último.
   */
  staticIndex: number
  /** Enquanto falso, o relógio não anda (ex.: a demonstração ainda carregando). */
  enabled?: boolean
  /** Chamado no fim do último cue. Devolvendo `true`, a linha do tempo NÃO
   *  recomeça sozinha: quem chamou troca a história (cues novos recomeçam do
   *  primeiro). Sem ele, o laço segue como sempre. */
  aoTerminar?: () => boolean
}

export interface HeroTimeline<S extends string, C extends string> {
  state: S
  composition: C
  /** Duração da reorganização em curso. */
  ms: number
  index: number
  paused: boolean
  canAnimate: boolean
  running: boolean
  togglePause: () => void
  restart: () => void
  /** Pula para um cue (os capítulos clicáveis embaixo do palco). */
  irPara: (index: number) => void
}

function canObserve(): boolean {
  if (typeof IntersectionObserver === 'undefined') return false
  try {
    new IntersectionObserver(() => {}).disconnect()
    return true
  } catch {
    return false
  }
}

export function useHeroTimeline<S extends string, C extends string>(
  { cues, tailMs, hostRef, staticIndex, enabled = true, aoTerminar }: Options<S, C>,
): HeroTimeline<S, C> {
  const aoTerminarRef = useRef(aoTerminar)
  useEffect(() => { aoTerminarRef.current = aoTerminar }, [aoTerminar])
  const reduced = useReducedMotion()
  const [observable] = useState(canObserve)
  const canAnimate = !reduced && observable

  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [inView, setInView] = useState(false)
  const [tabVisible, setTabVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
  )

  useEffect(() => {
    if (!canAnimate) return
    const el = hostRef.current
    if (!el) return
    /**
     * Quanto do palco está visível, pela GEOMETRIA. O observador pode mentir:
     * medindo ao vivo em 24/09, um navegador embutido respondia
     * `isIntersecting: false` para um elemento inteiramente dentro da tela, e
     * o palco congelava. Quando os dois discordam, vale o retângulo.
     */
    const ratio = () => {
      const r = el.getBoundingClientRect()
      if (r.height <= 0) return 0
      return Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0)) / r.height
    }
    let answered = false
    const io = new IntersectionObserver((entries) => {
      answered = true
      for (const e of entries) setInView((e.isIntersecting && (e.intersectionRatio ?? 1) >= 0.3) || ratio() >= 0.3)
    }, { threshold: 0.3 })
    io.observe(el)
    const fallback = setTimeout(() => { if (!answered) setInView(ratio() >= 0.3) }, 800)
    return () => { clearTimeout(fallback); io.disconnect() }
  }, [canAnimate, hostRef])

  useEffect(() => {
    if (!canAnimate) return
    const onVis = () => setTabVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [canAnimate])

  const running = canAnimate && enabled && inView && tabVisible && !paused

  /** Nonce: sem ele, reiniciar já no primeiro cue seria um no-op silencioso. */
  const [runId, setRunId] = useState(0)

  const total = useMemo(() => (cues[cues.length - 1]?.t ?? 0) + tailMs, [cues, tailMs])

  /**
   * O que RESTA do cue corrente, em ms.
   *
   * Sem isto, pausar e retomar reiniciava o intervalo inteiro: uma pausa a 200
   * ms do fim de um cue devolvia 3 s de espera, e a demonstração ficava
   * visivelmente parada depois de retomar. Agora o relógio guarda o saldo:
   * pausar congela o que falta, retomar continua dali.
   */
  const restante = useRef<number | null>(null)

  useEffect(() => {
    if (!running || index >= cues.length) return
    const atual = cues[index]
    const proximo = cues[index + 1]
    const cheio = Math.max(120, (proximo ? proximo.t - atual.t : total - atual.t))
    const espera = restante.current ?? cheio
    const inicio = Date.now()
    const id = setTimeout(() => {
      restante.current = null
      if (index === cues.length - 1 && aoTerminarRef.current?.()) return
      setIndex((i) => (i + 1) % cues.length)
    }, espera)
    return () => {
      clearTimeout(id)
      const gasto = Date.now() - inicio
      // Só guarda saldo quando a interrupção NÃO foi o fim do cue: trocar de
      // cue zera o saldo logo acima, e sair da viewport ou pausar preserva.
      restante.current = gasto < espera ? Math.max(120, espera - gasto) : null
    }
  }, [running, index, cues, total, runId])

  // Trocar de cue por outro caminho (replay) descarta qualquer saldo pendente.
  useEffect(() => { restante.current = null }, [runId])

  // HISTÓRIA NOVA com o mesmo relógio (30/09: uma demonstração só para as
  // abas de "Como funciona"): outra lista de cues recomeça do primeiro.
  const cuesAnteriores = useRef(cues)
  useEffect(() => {
    if (cuesAnteriores.current === cues) return
    cuesAnteriores.current = cues
    restante.current = null
    setIndex(0)
    setRunId((n) => n + 1)
  }, [cues])

  const togglePause = useCallback(() => setPaused((p) => !p), [])
  const restart = useCallback(() => { restante.current = null; setIndex(0); setPaused(false); setRunId((n) => n + 1) }, [])
  const irPara = useCallback((i: number) => {
    restante.current = null
    setIndex(Math.max(0, Math.min(cues.length - 1, i)))
    setRunId((n) => n + 1)
  }, [cues.length])

  // Limitado à lista atual: no render em que a história troca, o índice da
  // anterior ainda não foi zerado.
  const efetivo = Math.min(canAnimate ? index : staticIndex, cues.length - 1)

  /**
   * Cada camada vale até ser trocada: o cue que move só a câmera não mexe no
   * produto, e vice-versa. Por isso o valor corrente é o último definido até
   * aqui, não o do cue atual.
   */
  const acumulado = useMemo(() => {
    let state = cues[0].state as S
    let composition = cues[0].composition as C
    let ms = cues[0].ms ?? 900
    for (let i = 0; i <= efetivo && i < cues.length; i++) {
      const c = cues[i]
      if (c.state) state = c.state
      if (c.composition) { composition = c.composition; ms = c.ms ?? 900 }
    }
    return { state, composition, ms }
  }, [cues, efetivo])

  return {
    ...acumulado,
    index: efetivo,
    paused,
    canAnimate,
    running,
    togglePause,
    restart,
    irPara,
  }
}
