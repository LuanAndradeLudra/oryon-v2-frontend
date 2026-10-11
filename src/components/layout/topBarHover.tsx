/**
 * SCRUM-1253 (PO, 06/10) — hover animado dos botões de ícone da TopBar
 * (verificação, notificações, perfil).
 *
 * O botão vira `motion.button` com `{...topBarHoverProps}` e os filhos herdam
 * o estado "hover"/"tap" por variants: o fundo floresce do centro
 * (`<TopBarHoverBloom />`) e cada ícone tem o seu gesto (`ICON_FX`).
 * Com "reduzir movimento" no sistema, só o fundo aparece — sem escala nem giro.
 */
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'

// eslint-disable-next-line react-refresh/only-export-components -- props e variantes moram com os componentes que as usam
export const topBarHoverProps = {
  initial: 'rest',
  animate: 'rest',
  whileHover: 'hover',
  whileTap: 'tap',
} as const

const SPRING = { type: 'spring', stiffness: 420, damping: 26 } as const

const bloom: Variants = {
  rest: { opacity: 0, scale: 0.6, transition: { duration: 0.18 } },
  hover: { opacity: 1, scale: 1, transition: SPRING },
  tap: { opacity: 1, scale: 0.92, transition: SPRING },
}

/** Fundo do hover: nasce do centro, no tom de --rowhover. */
export function TopBarHoverBloom({ forceOn = false }: { forceOn?: boolean }) {
  return (
    <motion.span
      aria-hidden
      variants={bloom}
      animate={forceOn ? 'hover' : undefined}
      className="absolute inset-0 rounded-[6px] bg-[var(--rowhover)] pointer-events-none"
    />
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const ICON_FX = {
  /** Sino tocando — balança a partir do topo. */
  bell: {
    rest: { rotate: 0, scale: 1 },
    hover: { rotate: [0, -16, 13, -9, 6, -3, 0], scale: 1.08, transition: { rotate: { duration: 0.65, ease: 'easeInOut' }, scale: SPRING } },
    tap: { scale: 0.9, transition: SPRING },
  },
  /** Alerta — um pulo curto com pop. */
  alert: {
    rest: { y: 0, scale: 1 },
    hover: { y: [0, -3, 0], scale: [1, 1.14, 1.06], transition: { duration: 0.45, ease: 'easeOut' } },
    tap: { scale: 0.9, transition: SPRING },
  },
  /** Faísca do Copilot — cintila: gira e cresce. */
  sparkle: {
    rest: { rotate: 0, scale: 1 },
    hover: { rotate: [0, -18, 12, 0], scale: [1, 1.22, 1.1], transition: { duration: 0.55, ease: 'easeOut' } },
    tap: { scale: 0.88, transition: SPRING },
  },
  /** Lupa — inclina e avança, como quem procura. */
  search: {
    rest: { rotate: 0, x: 0, scale: 1 },
    hover: { rotate: -14, x: 1, scale: 1.12, transition: SPRING },
    tap: { scale: 0.9, transition: SPRING },
  },
  /** Avatar — sobe e cresce um pouco (sem halo, PO 06/10). */
  avatar: {
    rest: { y: 0, scale: 1 },
    hover: { y: -1.5, scale: 1.07, transition: SPRING },
    tap: { y: 0, scale: 0.93, transition: SPRING },
  },
} satisfies Record<string, Variants>

/** Envolve o ícone com o gesto escolhido (ou nenhum, com movimento reduzido). */
export function TopBarHoverIcon({ fx, className, children }: { fx: keyof typeof ICON_FX; className?: string; children: ReactNode }) {
  const reduzir = useReducedMotion()
  return (
    <motion.span
      variants={reduzir ? undefined : ICON_FX[fx]}
      style={fx === 'bell' ? { originX: 0.5, originY: 0.1 } : undefined}
      className={className ?? 'relative inline-flex'}
    >
      {children}
    </motion.span>
  )
}
