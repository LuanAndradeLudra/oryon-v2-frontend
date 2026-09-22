import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { useContext } from 'react'
import { cn } from '@/lib/utils'
import { SettingsBreadcrumbCtx } from './settingsBreadcrumb'

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
// display font, SEM hairline abaixo (medido no PNG 2e: só as seções se
// separam por hairline). Um só por aba.
export function SectionHeader({ title, description, action, className, breadcrumb: breadcrumbProp, saved }: SectionHeaderProps) {
  const ctxBreadcrumb = useContext(SettingsBreadcrumbCtx)
  const breadcrumb = breadcrumbProp ?? ctxBreadcrumb
  return (
    <div className={cn('pb-3.5', className)}>
      {(breadcrumb?.length || saved) && (
        <div className="flex items-center justify-between gap-3">
          {breadcrumb && breadcrumb.length > 0 && (
            <p className="text-xs text-surface-500 truncate">{breadcrumb.slice(0, -1).map((b) => <span key={b}>{b}<span className="mx-1.5">/</span></span>)}<span className="text-surface-400">{breadcrumb[breadcrumb.length - 1]}</span></p>
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
          <h2 className={cn('text-xl font-display font-bold text-surface-50', breadcrumb?.length && 'mt-2')} style={{ letterSpacing: '-.015em' }}>{title}</h2>
          {description && (
            <p className="mt-1 text-[13px] leading-[1.55] text-surface-400 max-w-[620px]">{description}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0 pb-0.5">{action}</div>}
      </div>
    </div>
  )
}
