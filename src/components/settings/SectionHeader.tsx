import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { useContext } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { SettingsBreadcrumbCtx, FaixaDoTopoCtx } from './settingsBreadcrumb'
import { CABECALHO_FIXO } from './barraDeSalvar'
import { emFrase } from '@/lib/emFrase'

interface SectionHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
  /** Trilha "Workspace / CRM / Vocabulário" acima do título (README §3.9). */
  breadcrumb?: string[]
  /** Mostra "✓ Salvo" à direita do breadcrumb — feedback de autosave, não um botão. */
  saved?: boolean
  /** Página que é um formulário só: o cabeçalho fica preso no alto, com o
   *  Salvar à mão, na faixa do topo do layout (largura inteira). Fora do
   *  layout (testes), cai na faixa presa no próprio lugar. */
  fixo?: boolean
}

// Título de PÁGINA das Configurações (nível acima do SettingsSection):
// display font, SEM hairline abaixo (medido no PNG 2e: só as seções se
// separam por hairline). Um só por aba.
export function SectionHeader({ title, description, action, className, breadcrumb: breadcrumbProp, saved, fixo }: SectionHeaderProps) {
  const ctxBreadcrumb = useContext(SettingsBreadcrumbCtx)
  const faixa = useContext(FaixaDoTopoCtx)
  const breadcrumb = breadcrumbProp ?? ctxBreadcrumb
  const cabecalho = (
    <div className={cn('pb-3.5', fixo && !faixa && CABECALHO_FIXO, className)}>
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
          <h2 className={cn('text-xl font-display font-semibold text-surface-50', breadcrumb?.length && 'mt-2')} style={{ letterSpacing: '-.015em' }}>{emFrase(title)}</h2>
          {description && (
            <p className="mt-1 text-sm leading-[1.55] text-surface-400 max-w-[620px]">{description}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0 pb-0.5">{action}</div>}
      </div>
    </div>
  )
  return fixo && faixa ? createPortal(cabecalho, faixa) : cabecalho
}
