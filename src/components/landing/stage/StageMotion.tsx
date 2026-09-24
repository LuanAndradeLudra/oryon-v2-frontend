import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { StageMotionContext, useStageAnimate } from './stageContext'

export function StageMotionProvider({ animate, children }: { animate: boolean; children: ReactNode }) {
  return <StageMotionContext.Provider value={{ animate }}>{children}</StageMotionContext.Provider>
}

/** Entrada de um elemento do quadro (opacity + translate curto). */
export function StageEnter({
  children, className, from = 'below',
}: { children: ReactNode; className?: string; from?: 'below' | 'left' | 'right' | 'none' }) {
  const animate = useStageAnimate()
  if (!animate) return <div className={className}>{children}</div>
  const x = from === 'left' ? -10 : from === 'right' ? 10 : 0
  const y = from === 'below' ? 8 : 0
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x, y }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
