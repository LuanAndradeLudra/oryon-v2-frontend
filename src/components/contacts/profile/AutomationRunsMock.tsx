import { Workflow, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { MockBadge } from './MockBadge'
import { cn } from '@/lib/utils'
import type { AutomationRun, AutomationRunStatus } from '@/types/contactProfile'

interface AutomationRunsMockProps {
  runs: AutomationRun[]
}

// Chips saturados (.color-chip) via tokens theme-aware.
const STATUS_META: Record<AutomationRunStatus, { label: string; Icon: typeof CheckCircle2; chip: string }> = {
  completed: { label: 'Concluída', Icon: CheckCircle2, chip: 'var(--color-accent-green)' },
  running:   { label: 'Em execução', Icon: Loader2, chip: 'var(--color-brand-500)' },
  failed:    { label: 'Falhou', Icon: XCircle, chip: 'var(--color-danger)' },
}

/** Aba Automações — mock; será alimentada por GET /contacts/:id/automation-runs
 *  (a coluna automation_runs.contactId já existe no backend, falta o endpoint). */
export function AutomationRunsMock({ runs }: AutomationRunsMockProps) {
  if (runs.length === 0) {
    return (
      <EmptyState
        icon={Workflow}
        title="Nenhuma automação executada."
        hint="As automações disparadas para este contato aparecerão aqui."
      />
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end"><MockBadge /></div>
      {runs.map((run) => {
        const meta = STATUS_META[run.status]
        return (
          <div
            key={run.id}
            className="flex items-center gap-3 rounded-xl border border-surface-700 bg-surface-800 px-4 py-3"
          >
            <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0">
              <Workflow className="w-4 h-4 text-surface-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-100 truncate">{run.automationName}</p>
              <p className="text-xs text-surface-500 mt-0.5">
                Gatilho: {run.trigger} · {run.stepsDone}/{run.stepsTotal} passos ·{' '}
                {new Date(run.startedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </p>
            </div>
            <span
              className="color-chip inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium flex-shrink-0"
              style={{ ['--chip']: meta.chip } as React.CSSProperties}
            >
              <meta.Icon className={cn('w-3 h-3', run.status === 'running' && 'animate-spin')} />
              {meta.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
