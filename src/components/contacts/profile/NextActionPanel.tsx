import { CalendarClock, Check, Circle, Plus, Sparkles, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { MockBadge } from './MockBadge'
import { cn } from '@/lib/utils'
import type { ContactTask } from '@/types/contactProfile'

interface NextActionPanelProps {
  tasks: ContactTask[]
  /** Sugestão da IA (aiNextBestAction do contato) — dado real, independente
   *  das tarefas mock. Renderiza mesmo quando o módulo de tarefas está off. */
  aiSuggestion?: string
  /** Criar tarefa — quando ausente, o módulo de tarefas está desativado
   *  (só a sugestão da IA aparece). */
  onAddTask?: () => void
  onToggleTask: (id: string) => void
}

function dueLabel(iso: string): string {
  const due = new Date(iso)
  const now = new Date()
  const diffDays = Math.round((due.getTime() - now.getTime()) / 86_400_000)
  if (diffDays < 0) return `venceu há ${Math.abs(diffDays)}d`
  if (diffDays === 0) return 'hoje'
  if (diffDays === 1) return 'amanhã'
  return due.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

/**
 * "Próxima ação" (padrão Pipedrive Focus): a pergunta que o vendedor faz é
 * "o que eu faço agora com este contato?". Contato sem próximo passo
 * agendado é sinalizado como pendência, não como estado neutro.
 */
export function NextActionPanel({ tasks, aiSuggestion, onAddTask, onToggleTask }: NextActionPanelProps) {
  const open = tasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
  const done = tasks.filter((t) => t.status === 'done')
  const tasksEnabled = !!onAddTask

  return (
    <Card noPadding className="overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2 shrink-0">
        <h3 className="text-sm font-semibold text-surface-100 inline-flex items-center gap-1.5">
          <CalendarClock className="w-4 h-4 text-surface-400" />
          Próxima ação
        </h3>
        {tasksEnabled && (
          <div className="flex items-center gap-1.5">
            <MockBadge />
            <button
              onClick={onAddTask}
              aria-label="Nova tarefa"
              className="p-1.5 rounded-md text-surface-500 hover:text-surface-200 hover:bg-surface-700 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="px-4 pb-4 flex flex-col gap-2 flex-1">
        {tasksEnabled && open.length === 0 ? (
          <button
            onClick={onAddTask}
            style={{ ['--chip']: 'var(--color-warning)' } as React.CSSProperties}
            className="color-chip flex items-center gap-2 rounded-lg border px-3 py-3 text-left hover:brightness-110 transition-all cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs font-medium">
              Nenhum próximo passo agendado — agendar follow-up
            </span>
          </button>
        ) : (
          open.map((task, idx) => (
            <button
              key={task.id}
              type="button"
              onClick={() => onToggleTask(task.id)}
              aria-label={`Concluir tarefa "${task.title}"`}
              className={cn(
                'group/task flex items-start gap-2.5 rounded-lg px-3 py-3 border text-left w-full transition-colors cursor-pointer',
                idx === 0
                  ? 'bg-surface-800/80 border-surface-700'
                  : 'bg-transparent border-transparent hover:bg-surface-800/40',
              )}
            >
              <span className="mt-0.5 text-surface-500 group-hover/task:text-brand-400 transition-colors flex-shrink-0">
                <Circle className="w-4 h-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block text-sm', idx === 0 ? 'text-surface-100 font-medium' : 'text-surface-300')}>
                  {task.title}
                </span>
                <span className={cn(
                  'block text-[11px] mt-0.5',
                  task.status === 'overdue' ? 'text-danger font-medium' : 'text-surface-400',
                )}>
                  {task.status === 'overdue' ? '⚠ ' : ''}{dueLabel(task.dueAt)}
                  {task.assigneeName ? ` · ${task.assigneeName}` : ''}
                </span>
              </span>
            </button>
          ))
        )}

        {done.length > 0 && (
          <p className="text-[11px] text-surface-400 inline-flex items-center gap-1 pl-1">
            <Check className="w-3 h-3" /> {done.length} concluída{done.length === 1 ? '' : 's'} nesta sessão
          </p>
        )}

        {aiSuggestion && (
          <div className="mt-auto rounded-lg bg-brand-500/[0.06] border border-brand-500/20 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-400 mb-1 inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Sugestão da IA
            </p>
            <p className="text-xs text-surface-200 leading-relaxed">{aiSuggestion}</p>
          </div>
        )}

        {!tasksEnabled && !aiSuggestion && (
          <p className="text-xs text-surface-500 py-2">Nenhuma sugestão no momento.</p>
        )}
      </div>
    </Card>
  )
}
