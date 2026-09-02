// ─── Page Header ─────────────────────────────────────────────────────────────
// Cabeçalho canônico de página/área de conteúdo: título display, subtítulo
// opcional e slot de ações. Páginas que usam o TopBar para ações primárias
// (padrão do app) usam este header apenas quando têm área de conteúdo própria
// com identidade (ex.: relatórios, admin). Para seções internas de settings,
// continuar usando SectionHeader.

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Ações à direita (botões, filtros). */
  actions?: ReactNode
  /** Linha extra abaixo (ex.: SegmentedControl, chips de filtro). */
  children?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, actions, children, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3 px-6 pt-5 pb-4 border-b border-surface-800 flex-shrink-0', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-display font-bold text-surface-50 truncate">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-surface-400">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
