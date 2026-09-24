import type { CSSProperties, ReactNode } from 'react'
import { motion, useReducedMotion, type MotionValue } from 'framer-motion'
import { cn } from '@/lib/utils'
import { HERO } from './heroRealData'

/**
 * A BANDEJA — a moldura de todas as janelas do palco (a âncora e as
 * satélites). Referência: a bandeja translúcida da Attio (6 px de respiro nas
 * laterais e embaixo, 0 no topo, onde ficam os três pontos; 16 px por fora,
 * 12 px por dentro), refeita para os DOIS temas:
 *
 *  • escuro — a profundidade vem de LUZ, não de sombra: um fio claro no topo,
 *    um contorno de 8 % e sombras longas de baixa opacidade (sombra preta sobre
 *    fundo quase preto não aparece);
 *  • claro — as cinco sombras em camadas quase invisíveis da referência.
 *
 * O conteúdo de dentro é SEMPRE do produto; a bandeja é só o "vidro" em volta.
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
        'hero-bandeja flex flex-col rounded-[16px] p-1.5 pt-0 backdrop-blur-md',
        'bg-white/[.045] ring-1 ring-white/[.08]',
        '[[data-theme=light]_&]:bg-[rgba(246,248,248,.82)] [[data-theme=light]_&]:ring-black/[.06]',
        className,
      )}
      style={style}
    >
      <div className="h-[30px] flex-shrink-0 flex items-center gap-1.5 px-2">
        <span className="w-[9px] h-[9px] rounded-full bg-[#FF5F57]" />
        <span className="w-[9px] h-[9px] rounded-full bg-[#FEBC2E]" />
        <span className="w-[9px] h-[9px] rounded-full bg-[#28C840]" />
        <span className="ml-2 text-[11.5px] font-medium text-surface-400 truncate">{titulo}</span>
      </div>
      <div
        className={cn(
          'relative flex-1 min-h-0 overflow-hidden rounded-[12px] ring-1 ring-black/40 bg-surface-950',
          '[[data-theme=light]_&]:ring-black/[.06]',
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
  pose, visivel, atraso = 0, titulo, children, conteudoClassName, y,
}: {
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
    <motion.div
      className="absolute"
      style={{ left: pose.x, top: pose.y, width: pose.w, transformOrigin: pose.origem, zIndex: 30, y }}
      // Montada só quando a demonstração fica pronta: nasce escondida para a
      // primeira entrada também ser animada.
      initial={{ opacity: 0, scale: 0.94, filter: 'blur(3px)' }}
      animate={visivel
        ? { opacity: 1, scale: 1, filter: 'blur(0px)' }
        : { opacity: 0, scale: 0.94, filter: 'blur(3px)' }}
      transition={semMovimento
        ? { duration: 0 }
        : { type: 'spring', stiffness: 210, damping: 30, mass: 0.9, delay: visivel ? atraso : 0 }}
    >
      <Bandeja titulo={titulo} conteudoClassName={conteudoClassName} className="hero-satelite">
        {children}
      </Bandeja>
    </motion.div>
  )
}

export const TITULOS_SATELITES = {
  celular: `WhatsApp · ${HERO.person}`,
  notificacoes: 'Notificações',
  linhaDoTempo: `${HERO.person} · atividade`,
}
