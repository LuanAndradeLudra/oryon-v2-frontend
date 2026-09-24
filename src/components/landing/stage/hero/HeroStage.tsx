import { useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { HeroWindow } from './HeroWindow'
import { ConversationSurface, ContactSurface, PipelineSurface } from './HeroSurfaces'
import {
  CAMERA_MAX, CANVAS, CANVAS_MEDIO, CANVAS_MOBILE, HERO_COMPOSITIONS, HERO_COMPOSITIONS_MEDIO,
  HERO_COMPOSITIONS_MOBILE, WIN, WIN_MEDIO, WIN_MOBILE, cameraPara, type HeroCompositionKey,
} from './heroComposition'
import type { HeroState } from './heroStory'

/**
 * O PALCO: uma tela de composição onde as três janelas se posicionam.
 *
 * O palco não recorta nem contém as superfícies — ele só coloca cada janela no
 * lugar. Quem recorta é cada janela, na própria borda. É a diferença entre
 * "uma câmera atravessando uma aplicação gigante" e "interfaces reais se
 * reorganizando", que era o ponto do PO.
 *
 * O palco não tem borda nem fundo próprio e não recorta o conteúdo: quem
 * recorta é cada janela, na própria borda. É a diferença entre "uma
 * demonstração dentro de uma caixa" e "interfaces flutuando no espaço da
 * seção".
 *
 * O fator de ajuste existe só para o conjunto caber na faixa reservada, e por
 * regime ele fica perto de 1 — não é ele que resolve legibilidade. As escalas
 * por janela ficam entre 0,58 e 1,0: moderadas, aplicadas a objetos inteiros,
 * nunca usadas para tornar legível algo que deveria ser maior por layout.
 */
export function HeroStage({
  at,
  composition,
  paused,
  ms = 1000,
}: {
  at: HeroState
  composition: HeroCompositionKey
  paused: boolean
  /** Duração vinda do ROTEIRO — é o cue que manda no ritmo, não uma constante
   *  escondida em cada componente. Câmera e janelas compartilham a mesma
   *  fonte; as diferenças entre elas são proporções desse valor. */
  ms?: number
}) {
  /**
   * REGIME, não escala única.
   *
   * A versão anterior espremia o mesmo canvas de 1240 em qualquer largura, e
   * numa janela de notebook isso virava 0,7 de escala — texto de 9px. Agora a
   * largura escolhe a DIREÇÃO: acima de 1280 a composição usa duas ou três
   * janelas; entre 768 e 1279 e no celular, uma janela dominante por vez, em
   * tamanho de leitura confortável.
   */
  const amplo = useMediaQuery('(min-width: 1280px)')
  const celular = !useMediaQuery('(min-width: 768px)')
  const regime = amplo ? 'amplo' : celular ? 'celular' : 'medio'

  const canvas = regime === 'amplo' ? CANVAS : regime === 'medio' ? CANVAS_MEDIO : CANVAS_MOBILE
  const janelas = regime === 'amplo' ? WIN : regime === 'medio' ? WIN_MEDIO : WIN_MOBILE
  const tabela = regime === 'amplo' ? HERO_COMPOSITIONS : regime === 'medio' ? HERO_COMPOSITIONS_MEDIO : HERO_COMPOSITIONS_MOBILE
  const poses = tabela[composition]
  // O enquadramento é DERIVADO da geometria da janela em foco, não escrito à
  // mão: mudar a pose de uma janela move a câmera junto, sem uma segunda
  // tabela de coordenadas para manter em dia.
  const variante = poses.conversa.variant ?? 'full'
  const tamConversa = variante === 'chat' ? janelas.conversaChat : janelas.conversaFull

  const palcoRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(1)
  const [palco, setPalco] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = palcoRef.current
    if (!el) return
    const medir = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w <= 0 || h <= 0) return
      // Margem para a câmera: no zoom máximo o conjunto ainda cabe, então
      // aproximar nunca corta uma janela pela borda do palco.
      setPalco({ w, h })
      setFit(Math.min(1, w / canvas.w, h / canvas.h) / CAMERA_MAX)
    }
    medir()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [canvas.w, canvas.h])

  const alvo = cameraPara('shot' in poses ? poses.shot : undefined, poses, janelas, canvas)
  /**
   * TRAVA DE BORDA da câmera.
   *
   * Visto na tela: enquadrar a ficha do contato — que fica à direita —
   * deslocava a composição inteira para a esquerda, e a janela de Conversas
   * saía pela borda da página, cortada ao meio. Aqui o deslocamento é limitado
   * ao que a composição escalada tem de sobra além do palco: a câmera pode
   * dirigir o olhar, mas nunca a ponto de a borda do canvas entrar em cena.
   *
   * Consequência de direção, e é a certa: quem posiciona é a COMPOSIÇÃO; a
   * câmera é ênfase, não solução de layout.
   */
  const escala = fit * alvo.scale
  const folgaX = Math.max(0, (canvas.w * escala - palco.w) / 2)
  const folgaY = Math.max(0, (canvas.h * escala - palco.h) / 2)
  const cam = {
    scale: alvo.scale,
    x: Math.max(-folgaX, Math.min(folgaX, alvo.x * escala)) / escala,
    y: Math.max(-folgaY, Math.min(folgaY, alvo.y * escala)) / escala,
  }

  return (
    <div ref={palcoRef} className="absolute inset-0 overflow-visible">
      {/* CÂMERA: um invólucro que translada e aproxima o palco inteiro. Não
          toca na geometria de nenhuma janela — por isso o conteúdo não reflui
          quando ela se move. `translate3d`/`scale`, nunca `top`/`left`. */}
      <motion.div
        className="absolute left-1/2 top-1/2 origin-center will-change-transform"
        style={{ width: canvas.w, height: canvas.h, x: '-50%', y: '-50%' }}
        initial={false}
        animate={{ scale: fit * cam.scale, translateX: cam.x, translateY: cam.y }}
        /* Pausar congela a câmera onde ela está: `duration: 0` para a
           animação corrente parar no quadro atual em vez de continuar até o
           destino enquanto o resto da demonstração está parado. */
        transition={{ duration: paused ? 0 : (ms * 1.15) / 1000, ease: [0.32, 0.72, 0, 1] }}
      >
        <HeroWindow
          title="Oryon · Conversas"
          pose={poses.conversa}
          width={tamConversa.w}
          height={tamConversa.h}
          duration={paused ? 0 : ms / 1000}
        >
          <ConversationSurface
            at={at}
            variant={variante}
            listWidth={janelas.lista}
            chatWidth={variante === 'full' ? janelas.chat : tamConversa.w}
            infoOpen={poses.contato.visible}
          />
        </HeroWindow>

        <HeroWindow title="Marina Alves · ficha" pose={poses.contato} width={janelas.contato.w} height={janelas.contato.h} duration={paused ? 0 : ms / 1000}>
          <ContactSurface at={at} />
        </HeroWindow>

        <HeroWindow title="Oryon · Funis · Vendas" pose={poses.funil} width={janelas.funil.w} height={janelas.funil.h} duration={paused ? 0 : ms / 1000}>
          <PipelineSurface at={at} paused={paused} />
        </HeroWindow>
      </motion.div>
    </div>
  )
}
