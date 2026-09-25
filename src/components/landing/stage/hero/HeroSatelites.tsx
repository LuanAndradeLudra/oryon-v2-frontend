import type { CSSProperties, ReactNode } from 'react'
import { motion, useReducedMotion, type MotionValue } from 'framer-motion'
import { cn } from '@/lib/utils'
import { HERO } from './heroRealData'

/**
 * A BANDEJA — a moldura de todas as janelas do palco (a âncora e as
 * satélites). Referência: a bandeja da Attio (6 px de respiro nas
 * laterais e embaixo, 0 no topo, onde ficam os três pontos; 16 px por fora,
 * 12 px por dentro), refeita para os DOIS temas:
 *
 *  • escuro — a profundidade vem de LUZ, não de sombra: um fio claro no topo,
 *    um contorno de 8 % e sombras longas de baixa opacidade (sombra preta sobre
 *    fundo quase preto não aparece);
 *  • claro — as cinco sombras em camadas quase invisíveis da referência.
 *
 * OPACA, por decisão do PO (24/09): nada da tela principal pode aparecer
 * através de uma moldura que a sobrepõe — o "vidro" translúcido da referência
 * deixava a âncora vazar por baixo das satélites. Fundo sólido em `surface-800`
 * (escuro #161E1E, claro #FFFFFF), um degrau acima do conteúdo, para a moldura
 * se destacar do app que ela emoldura.
 *
 * O conteúdo de dentro é SEMPRE do produto; a bandeja é só a moldura em volta.
 */
export function Bandeja({
  titulo, children, className, style, conteudoClassName,
}: {
  titulo: string
  children: ReactNode
  className?: string
  style?: CSSProperties
  conteudoClassName?: string
}) {
  return (
    <div
      className={cn(
        // Cores da moldura em tokens (`--bandeja-*`, index.css): no claro, cinza
        // muito claro — distinto do app branco e da página quase branca.
        'hero-bandeja flex flex-col rounded-[16px] p-1.5 pt-0 bg-[var(--bandeja-bg)]',
        'ring-1 ring-[var(--bandeja-borda)]',
        'shadow-[inset_0_1px_0_rgba(255,255,255,.07),0_26px_60px_-18px_rgba(0,0,0,.75)]',
        '[[data-theme=light]_&]:shadow-[0_0_0_1px_rgba(11,13,24,.04),0_1px_2px_rgba(11,13,24,.04),0_3px_6px_rgba(11,13,24,.04),0_8px_14px_rgba(11,13,24,.05),0_16px_28px_rgba(11,13,24,.06)]',
        className,
      )}
      style={style}
    >
      <div className="h-[30px] flex-shrink-0 flex items-center gap-1.5 px-2">
        <span className="w-[9px] h-[9px] rounded-full bg-[#FF5F57]" />
        <span className="w-[9px] h-[9px] rounded-full bg-[#FEBC2E]" />
        <span className="w-[9px] h-[9px] rounded-full bg-[#28C840]" />
        <span className="ml-2 text-[11.5px] font-medium text-[var(--bandeja-titulo)] truncate">{titulo}</span>
      </div>
      <div
        className={cn(
          'relative flex-1 min-h-0 overflow-hidden rounded-[12px] ring-1 ring-[var(--bandeja-conteudo-borda)] bg-surface-950',
          conteudoClassName,
        )}
      >
        {children}
      </div>
    </div>
  )
}

/** Posição de uma satélite no palco (coordenadas do canvas de desenho). */
export interface PoseSatelite {
  x: number
  y: number
  w: number
  /** Canto que aponta para a âncora — a satélite "brota" dali. */
  origem: string
}

/**
 * Uma satélite: entra desfocando para nítido e crescendo a partir do canto
 * voltado para a âncora (técnica medida na Attio: desfoque de 3 px, escala
 * perto de 0,94, sem passar do ponto). Sai do mesmo jeito, ao contrário.
 */
export function Satelite({
  pose, visivel, atraso = 0, titulo, children, conteudoClassName, y, nome,
}: {
  /** Identifica a janela para o foco (`data-satelite`). */
  nome?: string
  pose: PoseSatelite
  visivel: boolean
  atraso?: number
  titulo: string
  children: ReactNode
  conteudoClassName?: string
  /** Paralaxe do scroll (motion value de fora), opcional. */
  y?: MotionValue<number>
}) {
  const semMovimento = useReducedMotion()
  return (
    /* Posição: quando a cena troca de diagonal, a janela que continua em cena
       DESLIZA para o canto novo (mola lenta, sem passar do ponto). Escondida,
       ela só troca de lugar — não há deslize que ninguém vê. */
    <motion.div
      className="absolute"
      data-obstaculo={visivel ? 'sim' : undefined}
      data-satelite={nome}
      style={{ width: pose.w, zIndex: 30, y }}
      initial={{ left: pose.x, top: pose.y }}
      animate={{ left: pose.x, top: pose.y }}
      transition={semMovimento || !visivel
        ? { duration: 0 }
        : { type: 'spring', stiffness: 45, damping: 16, mass: 1 }}
    >
      <motion.div
        style={{ transformOrigin: pose.origem }}
        // Montada só quando a demonstração fica pronta: nasce escondida para a
        // primeira entrada também ser animada.
        initial={{ opacity: 0, scale: 0.94, filter: 'blur(3px)' }}
        animate={visivel
          ? { opacity: 1, scale: 1, filter: 'blur(0px)' }
          : { opacity: 0, scale: 0.94, filter: 'blur(3px)' }}
        transition={semMovimento
          ? { duration: 0 }
          : { type: 'spring', stiffness: 75, damping: 20, mass: 1, delay: visivel ? atraso : 0 }}
      >
        <Bandeja titulo={titulo} conteudoClassName={conteudoClassName} className="hero-satelite">
          {children}
        </Bandeja>
      </motion.div>
    </motion.div>
  )
}

/**
 * O APARELHO — a segunda família de moldura do palco: um celular.
 *
 * A bandeja diz "janela de computador"; o aparelho diz "no bolso". Corpo
 * escuro de 7 px com cantos de 36 px (borda fina, PO 25/09), ilha baixa no topo e um brilho fino na borda
 * (luz, não sombra). O que vai dentro continua sendo do produto: o WhatsApp da
 * cliente (`TemplatePreview`) ou o Oryon mobile de verdade (um iframe da
 * demonstração a 390 px, com a `AppShellMobile` real).
 */
export function Aparelho({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'hero-aparelho relative rounded-[36px] p-[7px] bg-[#0B0F10]',
        'ring-1 ring-white/[.14] [[data-theme=light]_&]:ring-black/[.18]',
        className,
      )}
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,.10), 0 30px 70px -20px rgba(0,0,0,.55), 0 0 0 1px rgba(0,0,0,.5)' }}
    >
      <div className="relative overflow-hidden rounded-[29px] bg-surface-950">
        {children}
        {/* Ilha do topo, por cima do conteúdo, como num aparelho de verdade. */}
        <span aria-hidden className="absolute left-1/2 top-[7px] -translate-x-1/2 h-[16px] w-[70px] rounded-full bg-black" />
      </div>
    </div>
  )
}

/**
 * Uma satélite em forma de APARELHO: entra subindo e endireitando de uma leve
 * inclinação 3D (como alguém levantando o celular para mostrar), e sai
 * deitando de volta. Movimento distinto do "brotar" das janelas, para as duas
 * famílias de moldura não se confundirem.
 */
export function SateliteAparelho({
  pose, visivel, atraso = 0, children, y, lado = 'direita',
}: {
  pose: PoseSatelite
  visivel: boolean
  atraso?: number
  children: ReactNode
  y?: MotionValue<number>
  /** De que lado da âncora está — a inclinação aponta para o centro. */
  lado?: 'esquerda' | 'direita'
}) {
  const semMovimento = useReducedMotion()
  const giro = lado === 'direita' ? -14 : 14
  const escondido = { opacity: 0, y: 60, rotateX: 18, rotateY: giro, rotateZ: lado === 'direita' ? 3 : -3, scale: 0.92 }
  return (
    <div className="absolute" style={{ left: pose.x, top: pose.y, width: pose.w, zIndex: 35, perspective: 1400 }}>
      <motion.div
        data-obstaculo={visivel ? 'sim' : undefined}
        style={{ y, transformOrigin: '50% 100%' }}
        initial={escondido}
        animate={visivel ? { opacity: 1, y: 0, rotateX: 0, rotateY: 0, rotateZ: 0, scale: 1 } : escondido}
        transition={semMovimento
          ? { duration: 0 }
          : { type: 'spring', stiffness: 60, damping: 17, mass: 1.1, delay: visivel ? atraso : 0 }}
      >
        <Aparelho>{children}</Aparelho>
      </motion.div>
    </div>
  )
}

export const TITULOS_SATELITES = {
  celular: `WhatsApp · ${HERO.person}`,
  notificacoes: 'Notificações',
  linhaDoTempo: `${HERO.person} · atividade`,
  negocio: 'Negócio · Vendas',
}
