import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

// Título de PÁGINA das Configurações (nível acima do SettingsSection):
// display font + hairline abaixo. Um só por aba — dá a âncora tipográfica
// que os cards antigos tentavam dar com borda.
export function SectionHeader({ title, description, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-end justify-between gap-4 pb-6 mb-2 border-b border-surface-800/60', className)}>
      <div>
        <h2 className="text-2xl font-display font-bold text-surface-50 tracking-tight">{title}</h2>
        {description && (
          <p className="mt-1.5 text-sm text-surface-400 max-w-xl">{description}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0 pb-0.5">{action}</div>}
    </div>
  )
}
