// Lista de automações em cards verticais — substitui a DataTable larga em
// viewport estreita (colunas Fluxo/Atividade/Linha não cabem). Mantém as
// mesmas informações da linha desktop (tipo, rascunho, fluxo, atenção,
// atividade, linha) num card tocável; edição/criação continua bloqueada
// atrás do MobileFeatureGate (builder de passos não cabe no celular).

import { AlertTriangle, ChevronRight, Sparkles, Workflow, Zap } from 'lucide-react'
import { CardListView } from '@/components/common/CardListView'
import { EmptyState } from '@/components/ui/EmptyState'
import { Switch } from '@/components/ui/Switch'
import { WhatsappLineChip } from '@/components/common/WhatsappLineChip'
import { WabaAssignmentBadge } from '@/components/common/WabaAssignmentBadge'
import { TYPE_CONFIG } from './TypeBadge'
import {
  triggerChipLabel, actionLabel, agentBehaviorDeviates,
  deriveAttention, TYPE_ACCENT,
} from './automationText'
import { relativeDate } from '@/lib/utils'
import type { Automation } from '@/types'

interface AutomationsMobileListProps {
  automations: Automation[]
  loading: boolean
  multiLine: boolean
  onOpenDetail: (automation: Automation) => void
  onToggle: (automation: Automation) => void
}

function AutomationCard({
  automation, multiLine, onOpenDetail, onToggle,
}: {
  automation: Automation
  multiLine: boolean
  onOpenDetail: (a: Automation) => void
  onToggle: (a: Automation) => void
}) {
  const accent = TYPE_ACCENT[automation.type] ?? '#2DD4BF'
  const acts = automation.actions ?? []
  const flags = deriveAttention(automation)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetail(automation)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetail(automation) } }}
      className="w-full flex items-stretch gap-3 px-4 py-3.5 bg-surface-900/40 border border-surface-800 rounded-xl hover:bg-surface-900 active:bg-surface-800 transition-colors text-left cursor-pointer"
    >
      <span
        className="color-chip w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border"
        style={{ ['--chip']: accent } as React.CSSProperties}
        title={TYPE_CONFIG[automation.type]?.label}
      >
        {TYPE_CONFIG[automation.type]?.icon}
      </span>

      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        {/* Linha 1: nome + rascunho + switch */}
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-surface-50 truncate flex-1">{automation.name}</p>
          {automation.status === 'draft' && (
            <span
              className="color-chip px-1.5 py-0.5 rounded-full text-[9px] font-semibold border flex-shrink-0"
              style={{ ['--chip']: 'var(--color-status-pending)' } as React.CSSProperties}
            >
              Rascunho
            </span>
          )}
          <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
            <Switch checked={automation.status === 'active'} onChange={() => onToggle(automation)} />
          </div>
        </div>

        {/* Linha 2: fluxo (gatilho → ação) */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-800 border border-surface-700 text-[11px] text-surface-200 whitespace-nowrap flex-shrink-0">
            <Zap className="w-3 h-3 text-surface-400" />{triggerChipLabel(automation)}
          </span>
          {acts.length > 0 ? (
            <>
              <ChevronRight className="w-3 h-3 text-surface-600 flex-shrink-0" />
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-800 border border-surface-700 text-[11px] text-surface-200 whitespace-nowrap truncate">
                {actionLabel(acts[0])}
              </span>
              {acts.length > 1 && <span className="text-[11px] text-surface-500 flex-shrink-0">+{acts.length - 1}</span>}
            </>
          ) : (
            <span className="text-[11px] text-surface-600 italic flex-shrink-0">sem ações</span>
          )}
          {agentBehaviorDeviates(automation) && (
            <span title="Comportamento de IA personalizado" className="flex-shrink-0">
              <Sparkles className="w-3 h-3 text-brand-400/70" />
            </span>
          )}
        </div>

        {/* Linha 3: atividade + linha WhatsApp */}
        <div className="flex items-center gap-2 flex-wrap text-[11px] text-surface-500">
          <span className="tabular-nums text-surface-300">{automation.executionCount.toLocaleString('pt-BR')}</span>
          <span>· {automation.lastExecutedAt ? relativeDate(automation.lastExecutedAt) : 'nunca executou'}</span>
          {multiLine && (
            automation.needsWabaAssignment
              ? <WabaAssignmentBadge onClick={() => onOpenDetail(automation)} />
              : <WhatsappLineChip whatsappNumberId={automation.whatsappNumberId} />
          )}
        </div>

        {/* Linha 4: atenção (se houver) */}
        {flags.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-warning">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{flags[0].hint}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function AutomationsMobileList({ automations, loading, multiLine, onOpenDetail, onToggle }: AutomationsMobileListProps) {
  return (
    <div className="flex-1 overflow-auto">
      <CardListView
        items={automations}
        getKey={(a) => a.id}
        isLoading={loading}
        className="gap-2 p-3"
        emptyState={
          <EmptyState
            icon={Workflow}
            title="Nenhuma automação encontrada"
            hint="Ajuste os filtros ou crie uma nova automação."
          />
        }
        renderCard={(automation) => (
          <AutomationCard
            automation={automation}
            multiLine={multiLine}
            onOpenDetail={onOpenDetail}
            onToggle={onToggle}
          />
        )}
      />
    </div>
  )
}
