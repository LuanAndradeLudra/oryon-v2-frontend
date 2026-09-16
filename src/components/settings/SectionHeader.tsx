import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
  /** Trilha "Workspace / CRM / Vocabulário" acima do título (README §3.9). */
  breadcrumb?: string[]
  /** Mostra "✓ Salvo" à direita do breadcrumb — feedback de autosave, não um botão. */
  saved?: boolean
}

// Título de PÁGINA das Configurações (nível acima do SettingsSection):
// display font + hairline abaixo. Um só por aba — dá a âncora tipográfica
// que os cards antigos tentavam dar com borda.
export function SectionHeader({ title, description, action, className, breadcrumb, saved }: SectionHeaderProps) {
  return (
    <div className={cn('pb-6 mb-2 border-b border-surface-800/60', className)}>
      {(breadcrumb?.length || saved) && (
        <div className="flex items-center justify-between gap-3 mb-2">
          {breadcrumb && breadcrumb.length > 0 && (
            <p className="text-xs text-surface-500 truncate">{breadcrumb.join(' / ')}</p>
          )}
          {saved && (
            <span className="flex items-center gap-1 text-xs text-success flex-shrink-0">
              <Check className="w-3 h-3" /> Salvo
            </span>
          )}
        </div>
      )}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-surface-50 tracking-tight">{title}</h2>
          {description && (
            <p className="mt-1.5 text-[13px] leading-[1.55] text-surface-400 max-w-xl">{description}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0 pb-0.5">{action}</div>}
      </div>
    </div>
  )
}
