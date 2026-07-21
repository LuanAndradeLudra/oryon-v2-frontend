import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TipCardProps {
  icon: ReactNode
  title: string
  description: string
  /** Mostra o X de fechar no canto — a maioria dos usos tem. */
  onDismiss?: () => void
  /** CTA opcional (link ou botão) renderizado sob a descrição. */
  children?: ReactNode
  className?: string
}

/** Cartão de dica de onboarding — mesmo bloco que estava copiado e colado em
 *  6 telas (Dashboard, Campanhas, Copilot, Perfil da Empresa, Minha Conta).
 *  Cada tela mantém seu próprio texto/CTA/gatilho de dispensa (via
 *  `!checklist.<item>` + `markDone('<item>')`) — só o shell visual é comum. */
export function TipCard({ icon, title, description, onDismiss, children, className }: TipCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className={cn('flex items-start gap-4 bg-brand-950/50 border border-brand-500/20 rounded-2xl px-5 py-4', className)}
    >
      <div className="w-8 h-8 rounded-xl bg-brand-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-surface-100">{title}</p>
        <p className="text-xs text-surface-400 mt-0.5 leading-relaxed">{description}</p>
        {children}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-surface-500 hover:text-surface-300 transition-colors mt-0.5"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  )
}
