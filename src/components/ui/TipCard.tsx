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
      className={cn(
        'flex items-start gap-4 bg-[#1A2424] border border-[#2E4040] rounded-lg px-5 py-4',
        // Auditoria de contraste 01/10: no claro o brand-950 é branco — o card
        // sumia na página (fundo = página, borda 1,17:1). PO (2G): cinza-azulado
        // neutro + ícone branco em quadrado teal sólido.
        '[[data-theme=light]_&]:bg-[#F1F5F9] [[data-theme=light]_&]:border-[#CBD5E1]',
        className,
      )}
    >
      <div className="w-8 h-8 rounded-md bg-[#0F766E] [&_svg]:!text-white flex items-center justify-center flex-shrink-0 mt-0.5">
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
