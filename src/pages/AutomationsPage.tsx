import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Workflow, Plus, ToggleLeft, ToggleRight, Pencil, Trash2, Play,
  BookOpen, Search, ChevronRight, Zap, ChevronDown, ChevronUp,
  Lightbulb, ListChecks, GitBranch, Layers, Copy, Check, ListFilter,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { useAuth } from '@/contexts/AuthContext'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import { useRegisterTopBarActions } from '@/contexts/TopBarActionsContext'
import { AutomationWizard } from '@/components/automations/AutomationWizard'
import { MobileFeatureGate } from '@/components/common/MobileFeatureGate'
import { useIsMobile } from '@/hooks/useIsMobile'
import { WhatsappLineRequiredBanner } from '@/components/shared/WhatsappLineRequiredBanner'
import { TypeBadge, TYPE_CONFIG } from '@/components/automations/TypeBadge'
import { automationsApi } from '@/services/api'
import { WabaAssignmentBadge } from '@/components/common/WabaAssignmentBadge'
import { WhatsappLineChip } from '@/components/common/WhatsappLineChip'
import { AssignWabaModal } from '@/components/common/AssignWabaModal'
import { LineFilterChip, lineMatches, type LineFilterValue } from '@/components/common/LineFilterChip'
import { useContextMenu } from '@/hooks/useContextMenu'
import type { ContextMenuEntry } from '@/components/ui/ContextMenu'
import { cn } from '@/lib/utils'
import type { Automation, AutomationType, AutomationStatus } from '@/types'

// ── Status strip ──────────────────────────────────────────────────────────────

function StatusStrip({ automations }: { automations: Automation[] }) {
  const total   = automations.length
  const active  = automations.filter(a => a.status === 'active').length
  const inactive = automations.filter(a => a.status === 'inactive').length
  const draft   = automations.filter(a => a.status === 'draft').length
  const totalExec = automations.reduce((s, a) => s + a.executionCount, 0)

  const items = [
    { label: 'Total',      value: total,     color: 'text-surface-200' },
    { label: 'Ativas',     value: active,    color: 'text-status-active' },
    { label: 'Inativas',   value: inactive,  color: 'text-surface-400' },
    { label: 'Rascunho',   value: draft,     color: 'text-status-pending'   },
    { label: 'Execuções',  value: totalExec.toLocaleString('pt-BR'), color: 'text-brand-400' },
  ]

  return (
    <div className="flex items-center gap-6 px-6 py-3 border-b border-surface-800 bg-surface-950 flex-shrink-0">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className={cn('text-sm font-bold', item.color)}>{item.value}</span>
          <span className="text-xs text-surface-400">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Filter bar ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: AutomationStatus | 'all'; label: string }[] = [
  { value: 'all',      label: 'Todas'     },
  { value: 'active',   label: 'Ativas'    },
  { value: 'inactive', label: 'Inativas'  },
  { value: 'draft',    label: 'Rascunho'  },
]

const TYPE_OPTIONS: { value: AutomationType | 'all'; label: string }[] = [
  { value: 'all',             label: 'Todos os tipos'   },
  { value: 'boas_vindas',     label: 'Boas-vindas'      },
  { value: 'follow_up',       label: 'Follow-up'        },
  { value: 'fora_horario',    label: 'Fora do horário'  },
  { value: 'triagem_keyword', label: 'Triagem'          },
  { value: 'estagio_crm',     label: 'Estágio CRM'      },
  { value: 'inatividade',     label: 'Inatividade'      },
  { value: 'custom',          label: 'Personalizado'    },
]

interface FilterBarProps {
  search: string
  onSearch: (v: string) => void
  status: AutomationStatus | 'all'
  onStatus: (v: AutomationStatus | 'all') => void
  typeFilter: AutomationType | 'all'
  onType: (v: AutomationType | 'all') => void
  lineFilter: LineFilterValue
  onLineFilter: (v: LineFilterValue) => void
}

/**
 * Type-filter dropdown styled to match LineFilterChip so the filter row
 * reads as a single coherent chip cluster.
 */
function TypeFilterChip({
  value,
  onChange,
}: {
  value: AutomationType | 'all'
  onChange: (v: AutomationType | 'all') => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const label = TYPE_OPTIONS.find(o => o.value === value)?.label ?? 'Todos os tipos'

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
          'bg-surface-800 border border-surface-700/60 text-surface-200 hover:border-surface-600',
          open && 'border-brand-500/40 ring-2 ring-brand-500/10',
        )}
      >
        <ListFilter className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
        <span className="max-w-[160px] truncate">{label}</span>
        <ChevronDown className={cn('w-3 h-3 text-surface-500 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-56 rounded-lg border border-surface-700/60 bg-surface-900 shadow-xl z-30 overflow-hidden">
          <ul className="max-h-72 overflow-y-auto py-1">
            {TYPE_OPTIONS.map((opt, i) => {
              const isActive = value === opt.value
              return (
                <li key={opt.value}>
                  {i === 1 && <div className="mx-3 my-1 border-t border-surface-800/60" />}
                  <button
                    type="button"
                    onClick={() => { onChange(opt.value); setOpen(false) }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors',
                      isActive
                        ? 'bg-brand-500/10 text-surface-100'
                        : 'text-surface-300 hover:bg-surface-800',
                    )}
                  >
                    <span className="flex-1 font-medium">{opt.label}</span>
                    {isActive && <Check className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function FilterBar({ search, onSearch, status, onStatus, typeFilter, onType, lineFilter, onLineFilter }: FilterBarProps) {
  return (
    <div className="flex items-center gap-3 px-6 py-3 border-b border-surface-800 flex-shrink-0">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
        <input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Buscar automação..."
          className="w-full bg-surface-900 border border-surface-700 rounded-xl pl-8 pr-3 py-1.5 text-sm text-surface-200 placeholder-surface-600 focus:outline-none focus:border-brand-500/50"
        />
      </div>

      {/* Status filter */}
      <div className="flex items-center bg-surface-800 border border-surface-700 rounded-xl p-0.5">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onStatus(opt.value)}
            className={cn(
              'px-3 py-1 rounded-lg text-xs font-medium transition-colors',
              status === opt.value
                ? 'bg-surface-700 text-surface-100'
                : 'text-surface-500 hover:text-surface-300'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Type filter chip — matches LineFilterChip visual treatment */}
      <TypeFilterChip value={typeFilter} onChange={onType} />

      {/* Line filter — multi-WABA only; hides itself in single-line tenants. */}
      <LineFilterChip value={lineFilter} onChange={onLineFilter} />
    </div>
  )
}

// ── Automation card (horizontal row) ─────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  send_message:        'Enviar template',
  send_text:           'Enviar texto',
  assign_agent:        'Atribuir agente',
  assign_dept:         'Transferir setor',
  add_tag:             'Adicionar tag',
  remove_tag:          'Remover tag',
  change_stage:        'Mover estágio',
  set_lead_score:      'Definir score',
  resolve_conversation:'Resolver conv.',
  send_note:           'Nota interna',
  send_webhook:        'Webhook',
}

interface AutomationCardProps {
  automation: Automation
  onEdit: (a: Automation) => void
  onToggle: (a: Automation) => void
  onDelete: (a: Automation) => void
  onAssignWaba: (a: Automation) => void
}

function AutomationCard({ automation, onEdit, onToggle, onDelete, onAssignWaba }: AutomationCardProps) {
  const cfg      = TYPE_CONFIG[automation.type]
  const isActive = automation.status === 'active'
  const isDraft  = automation.status === 'draft'

  const actionChips = automation.actions.map((a, i) => (
    <span
      key={i}
      className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-700 border border-surface-600 text-[11px] text-surface-200 whitespace-nowrap"
    >
      {ACTION_LABELS[a.type] ?? a.type}
    </span>
  ))

  const buildContextMenu = useCallback((): ContextMenuEntry[] => [
    { label: 'Editar', icon: Pencil, onClick: () => onEdit(automation) },
    {
      label: 'Copiar nome',
      icon: Copy,
      onClick: () => navigator.clipboard.writeText(automation.name).catch(() => {}),
    },
    { separator: true },
    {
      label: isActive ? 'Desativar' : 'Ativar',
      icon: isActive ? ToggleLeft : ToggleRight,
      onClick: () => onToggle(automation),
    },
    { separator: true },
    { label: 'Excluir', icon: Trash2, danger: true, onClick: () => onDelete(automation) },
  ], [automation, isActive, onEdit, onToggle, onDelete])

  const { onContextMenu } = useContextMenu(buildContextMenu)

  return (
    <div
      onContextMenu={onContextMenu}
      className={cn(
        'group relative bg-surface-800 border rounded-2xl px-4 py-3 flex items-center gap-4 transition-colors duration-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)]',
        isActive  ? 'border-surface-600 hover:border-surface-500'  :
        isDraft   ? 'border-surface-600/60'                        :
                    'border-surface-600/50',
      )}
    >
      {/* Status indicator bar */}
      <div
        className={cn(
          'absolute left-0 top-3 bottom-3 w-[3px] rounded-full',
          isActive ? 'bg-status-active' : isDraft ? 'bg-status-pending/50' : 'bg-surface-700',
        )}
      />

      {/* Type icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-surface-200 border border-surface-600"
        style={{ backgroundColor: cfg.bg }}
      >
        {cfg.icon}
      </div>

      {/* Name + description — fixed width col */}
      <div className="w-52 flex-shrink-0 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-surface-100 truncate">{automation.name}</span>
          {isDraft && (
            <span className="color-chip inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border flex-shrink-0" style={{ ['--chip']: 'var(--color-status-pending)' } as React.CSSProperties}>
              Rascunho
            </span>
          )}
          {/* Explicit override of the AI-agent silencing rule — only shown
              when it differs from the default ('auto'), so the card stays
              uncluttered for the common case. */}
          {automation.agentBehavior === 'always_silence' && (
            <span
              title="Quando esta automação dispara, a IA não responde."
              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-surface-700 text-surface-200 border border-surface-600 flex-shrink-0"
            >
              IA silenciada
            </span>
          )}
          {automation.agentBehavior === 'never_silence' && (
            <span
              title="A IA continua respondendo em paralelo a esta automação."
              className="color-chip inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border flex-shrink-0"
              style={{ ['--chip']: 'var(--color-brand-500)' } as React.CSSProperties}
            >
              IA em paralelo
            </span>
          )}
          {automation.needsWabaAssignment && (
            <WabaAssignmentBadge
              className="flex-shrink-0"
              onClick={() => onAssignWaba(automation)}
            />
          )}
          <WhatsappLineChip
            whatsappNumberId={automation.whatsappNumberId}
            className="flex-shrink-0"
          />
        </div>
        {automation.description && (
          <p className="text-[11px] text-surface-400 mt-0.5 truncate">{automation.description}</p>
        )}
      </div>

      {/* Type badge */}
      <div className="flex-shrink-0">
        <TypeBadge type={automation.type} size="sm" />
      </div>

      {/* Flow: trigger → actions */}
      <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-700 border border-surface-600 text-[11px] text-surface-200 flex-shrink-0">
          <Zap className="w-3 h-3" />
          {automation.trigger.type === 'custom' && automation.trigger.eventLabel
            ? automation.trigger.eventLabel
            : cfg.triggerLabel}
        </span>
        {actionChips.length > 0 && (
          <>
            <ChevronRight className="w-3 h-3 text-surface-600 flex-shrink-0" />
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              {actionChips}
            </div>
          </>
        )}
        {actionChips.length === 0 && (
          <>
            <ChevronRight className="w-3 h-3 text-surface-600 flex-shrink-0" />
            <span className="text-[11px] text-surface-600 italic">Sem ações configuradas</span>
          </>
        )}
      </div>

      {/* Executions */}
      <div className="flex-shrink-0 flex items-center gap-1 text-xs text-surface-400 w-32 justify-end">
        <Play className="w-3 h-3" />
        <span>{automation.executionCount.toLocaleString('pt-BR')}</span>
        {automation.lastExecutedAt && (
          <span className="text-surface-500 hidden xl:inline">
            · {new Date(automation.lastExecutedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </span>
        )}
      </div>

      {/* Toggle */}
      <button
        onClick={() => onToggle(automation)}
        className="flex-shrink-0 transition-opacity hover:opacity-80"
        title={isActive ? 'Desativar' : 'Ativar'}
      >
        {isActive
          ? <ToggleRight className="w-6 h-6 text-status-active" />
          : <ToggleLeft  className="w-6 h-6 text-surface-600" />
        }
      </button>

      {/* Actions — visible on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={() => onEdit(automation)}
          className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-colors"
          title="Editar"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(automation)}
          className="p-1.5 rounded-lg text-surface-500 hover:text-danger hover:bg-danger/10 transition-colors"
          title="Excluir"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Guide card ─────────────────────────────────────────────────────────────────

const GUIDE_STEPS = [
  {
    icon: <Zap className="w-4 h-4" />,
    color: '#f59e0b',
    title: 'Escolha um gatilho',
    desc: 'O gatilho é o evento que dispara a automação. Ex: nova mensagem recebida, mudança de estágio no CRM, palavra-chave detectada, inatividade ou horário fora do expediente.',
  },
  {
    icon: <GitBranch className="w-4 h-4" />,
    color: '#6366f1',
    title: 'Defina condições (opcional)',
    desc: 'Filtre em quais situações a automação deve agir. Combine condições com lógica E/OU: estágio do contato, tags, canal, setor, score do lead, intenção detectada etc.',
  },
  {
    icon: <Layers className="w-4 h-4" />,
    color: '#10b981',
    title: 'Adicione ações em sequência',
    desc: 'Cada automação pode executar até 5 ações em ordem. Envie mensagens, atribua agentes, mude o estágio, adicione tags, defina o score, resolva a conversa ou acione um webhook externo.',
  },
  {
    icon: <ListChecks className="w-4 h-4" />,
    color: '#3b82f6',
    title: 'Dicas de boas práticas',
    desc: 'Use "Rascunho" para testar antes de ativar. Combine triagem por palavra-chave + mudança de estágio + atribuição para criar fluxos completos de qualificação automática.',
  },
]

function GuideCard() {
  const [open, setOpen] = useState(false)

  return (
    <div className="mx-6 mt-4 mb-2 bg-surface-900 border border-brand-500/20 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-800/50 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-brand-600/15 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
          <Lightbulb className="w-3.5 h-3.5 text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-surface-200">Como criar automações eficientes</span>
          <span className="text-[11px] text-surface-500 ml-2">— clique para ver o guia completo</span>
        </div>
        {open
          ? <ChevronUp   className="w-4 h-4 text-surface-500 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-surface-500 flex-shrink-0" />
        }
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {GUIDE_STEPS.map((step, i) => (
                <div key={i} className="bg-surface-950 border border-surface-800 rounded-xl p-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
                    style={{ backgroundColor: step.color + '20', color: step.color }}
                  >
                    {step.icon}
                  </div>
                  <p className="text-xs font-semibold text-surface-200 mb-1">{step.title}</p>
                  <p className="text-[11px] text-surface-500 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
            <div className="px-4 pb-4">
              <div className="bg-surface-950 border border-surface-800 rounded-xl p-3">
                <p className="text-[11px] font-semibold text-surface-300 mb-1.5">Exemplo de fluxo completo:</p>
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  <span className="color-chip px-2 py-0.5 rounded-md border" style={{ ['--chip']: 'var(--color-status-pending)' } as React.CSSProperties}>Gatilho: Palavra-chave "preço"</span>
                  <ChevronRight className="w-3 h-3 text-surface-600" />
                  <span className="color-chip px-2 py-0.5 rounded-md border" style={{ ['--chip']: 'var(--color-status-open)' } as React.CSSProperties}>Condição: Estágio = Novo</span>
                  <ChevronRight className="w-3 h-3 text-surface-600" />
                  <span className="color-chip px-2 py-0.5 rounded-md border" style={{ ['--chip']: 'var(--color-status-active)' } as React.CSSProperties}>Ação 1: Adicionar tag "Interesse"</span>
                  <ChevronRight className="w-3 h-3 text-surface-600" />
                  <span className="color-chip px-2 py-0.5 rounded-md border" style={{ ['--chip']: 'var(--color-status-active)' } as React.CSSProperties}>Ação 2: Mover → Qualificado</span>
                  <ChevronRight className="w-3 h-3 text-surface-600" />
                  <span className="color-chip px-2 py-0.5 rounded-md border" style={{ ['--chip']: 'var(--color-status-active)' } as React.CSSProperties}>Ação 3: Atribuir agente de vendas</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ onNew, onGallery }: { onNew: () => void; onGallery: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-5 py-20">
      <div className="w-16 h-16 rounded-2xl bg-brand-600/10 border border-brand-500/20 flex items-center justify-center">
        <Workflow className="w-8 h-8 text-brand-400" />
      </div>
      <div className="text-center">
        <h3 className="text-base font-semibold text-surface-200">Nenhuma automação configurada</h3>
        <p className="text-sm text-surface-500 mt-1 max-w-xs mx-auto">
          Automatize respostas, follow-ups e atribuições para economizar tempo e responder mais rápido.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onGallery}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-surface-700 text-surface-300 hover:text-surface-100 hover:border-surface-600 text-sm font-medium transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          Ver modelos prontos
        </button>
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-surface-950 text-sm font-semibold transition-colors shadow-lg shadow-brand-900/30"
        >
          <Plus className="w-4 h-4" />
          Criar automação
        </button>
      </div>
    </div>
  )
}

// ── Template gallery modal ─────────────────────────────────────────────────────

const GALLERY_TEMPLATES: Array<{
  type: AutomationType
  name: string
  description: string
  preset: Partial<Omit<Automation, 'id' | 'tenantId' | 'executionCount' | 'lastExecutedAt' | 'createdAt' | 'updatedAt'>>
}> = [
  {
    type: 'boas_vindas',
    name: 'Boas-vindas automático',
    description: 'Envia uma mensagem de boas-vindas imediatamente quando um novo contato inicia a primeira conversa.',
    preset: {
      name: 'Boas-vindas automático',
      description: 'Mensagem de boas-vindas para novos contatos',
      type: 'boas_vindas',
      status: 'active',
      trigger: { type: 'boas_vindas' },
      conditionsLogic: 'and',
      conditions: [],
      actions: [{ type: 'send_text', body: 'Olá! 👋 Bem-vindo(a). Como posso te ajudar hoje?' }],
    },
  },
  {
    type: 'follow_up',
    name: 'Follow-up após 24h',
    description: 'Envia um lembrete automaticamente quando não há resposta do cliente por 24 horas.',
    preset: {
      name: 'Follow-up 24h',
      description: 'Lembrete quando cliente não responde',
      type: 'follow_up',
      status: 'active',
      trigger: { type: 'follow_up', afterHours: 24 },
      conditionsLogic: 'and',
      conditions: [],
      actions: [{ type: 'send_text', body: 'Oi! Ainda posso te ajudar com algo? 😊' }],
    },
  },
  {
    type: 'fora_horario',
    name: 'Mensagem fora do horário',
    description: 'Informa ao cliente o horário de atendimento quando mensagens chegam fora do expediente.',
    preset: {
      name: 'Fora do horário comercial',
      description: 'Resposta automática fora do expediente',
      type: 'fora_horario',
      status: 'active',
      trigger: { type: 'fora_horario' },
      conditionsLogic: 'and',
      conditions: [],
      actions: [{ type: 'send_text', body: 'Olá! Nosso horário de atendimento é seg–sex das 9h às 18h. Retornaremos em breve!' }],
    },
  },
  {
    type: 'triagem_keyword',
    name: 'Triagem por palavra-chave',
    description: 'Detecta palavras como "problema", "urgente" e transfere para o time de suporte automaticamente.',
    preset: {
      name: 'Triagem — Suporte urgente',
      description: 'Detecta palavras de urgência e encaminha para suporte',
      type: 'triagem_keyword',
      status: 'active',
      trigger: { type: 'triagem_keyword', keywords: ['problema', 'urgente', 'erro'], matchMode: 'any' },
      conditionsLogic: 'and',
      conditions: [],
      actions: [{ type: 'assign_dept', departmentId: 'suporte', departmentName: 'Suporte' }],
    },
  },
  {
    type: 'estagio_crm',
    name: 'Ação ao mudar de estágio',
    description: 'Quando um contato atinge o estágio "Qualificado", atribui automaticamente a um agente de vendas.',
    preset: {
      name: 'Qualificado → Atribuir vendedor',
      description: 'Atribui contato qualificado a um vendedor',
      type: 'estagio_crm',
      status: 'draft',
      trigger: { type: 'estagio_crm', stageKey: 'qualified' },
      conditionsLogic: 'and',
      conditions: [],
      actions: [],
    },
  },
  {
    type: 'inatividade',
    name: 'Reengajamento por inatividade',
    description: 'Envia uma mensagem de reengajamento quando um contato fica sem interação por 7 dias.',
    preset: {
      name: 'Reengajamento 7 dias',
      description: 'Recupera contatos inativos há 7 dias',
      type: 'inatividade',
      status: 'active',
      trigger: { type: 'inatividade', afterDays: 7 },
      conditionsLogic: 'and',
      conditions: [],
      actions: [{ type: 'send_text', body: 'Olá! Faz um tempo que não conversamos. Posso te ajudar com algo? 😊' }],
    },
  },
  {
    type: 'custom',
    name: 'Evento personalizado (webhook)',
    description: 'Dispara a automação via webhook externo quando ocorre qualquer evento no seu sistema.',
    preset: {
      name: 'Evento externo — webhook',
      description: 'Automação disparada por webhook do sistema externo',
      type: 'custom',
      status: 'draft',
      trigger: { type: 'custom', eventCategory: 'conversa', eventKey: 'conversa_iniciada', eventLabel: 'Nova conversa iniciada' },
      conditionsLogic: 'and',
      conditions: [],
      actions: [],
    },
  },
]

function TemplateGallery({
  onSelect,
  onClose,
}: {
  onSelect: (preset: typeof GALLERY_TEMPLATES[number]['preset']) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.18 }}
        className="relative z-10 bg-surface-950 border border-surface-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800">
          <div>
            <h2 className="text-sm font-semibold text-surface-100">Modelos prontos</h2>
            <p className="text-xs text-surface-500 mt-0.5">Escolha um modelo para começar rapidamente</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto p-5 grid grid-cols-2 gap-3">
          {GALLERY_TEMPLATES.map((tpl) => {
            const cfg = TYPE_CONFIG[tpl.type]
            return (
              <button
                key={tpl.type}
                onClick={() => { onSelect(tpl.preset); onClose() }}
                className="text-left p-4 bg-surface-900 border border-surface-800 hover:border-surface-700 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-surface-400 border border-surface-700"
                    style={{ backgroundColor: cfg.bg }}
                  >
                    {cfg.icon}
                  </span>
                  <span className="text-xs font-semibold text-surface-200 group-hover:text-surface-100 transition-colors">
                    {tpl.name}
                  </span>
                </div>
                <p className="text-[11px] text-surface-500 leading-relaxed">{tpl.description}</p>
                <div className="mt-3">
                  <TypeBadge type={tpl.type} size="sm" />
                </div>
              </button>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}

// ── Delete confirm ─────────────────────────────────────────────────────────────

function DeleteConfirm({ automation, onConfirm, onCancel }: {
  automation: Automation
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative z-10 bg-surface-950 border border-surface-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center"
      >
        <div className="w-12 h-12 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-5 h-5 text-danger" />
        </div>
        <h3 className="text-sm font-semibold text-surface-100 mb-1">Excluir automação?</h3>
        <p className="text-xs text-surface-500 mb-5">
          "<span className="text-surface-300">{automation.name}</span>" será removida permanentemente.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-surface-700 text-surface-300 hover:text-surface-100 text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl bg-danger hover:bg-danger/90 text-white text-sm font-semibold transition-colors"
          >
            Excluir
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function AutomationsPage() {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  // Gate on active WhatsApp lines — backend rejects create_automation
  // with a 400 when tenant has no line, so we block the UI to avoid
  // letting the user fill out a long wizard that would fail at submit.
  const { numbers: whatsappLines, loading: waLoading } = useWorkspaceNumber()
  const hasWhatsappLine = whatsappLines.length > 0

  const [automations, setAutomations]     = useState<Automation[]>([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [statusFilter, setStatusFilter]   = useState<AutomationStatus | 'all'>('all')
  const [typeFilter, setTypeFilter]       = useState<AutomationType | 'all'>('all')
  const [wizardOpen, setWizardOpen]       = useState(false)
  const [editTarget, setEditTarget]       = useState<Automation | null>(null)
  const [wizardPreset, setWizardPreset]   = useState<Partial<typeof GALLERY_TEMPLATES[number]['preset']> | null>(null)
  const [galleryOpen, setGalleryOpen]     = useState(false)
  const [deleteTarget, setDeleteTarget]   = useState<Automation | null>(null)
  const [assignWabaTarget, setAssignWabaTarget] = useState<Automation | null>(null)
  // Local filter chip state — per-page, not persisted. Admin narrows
  // this view to a single line without affecting other pages.
  const [lineFilter, setLineFilter] = useState<LineFilterValue>('all')

  const currentUser = user ? { firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl } : undefined

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await automationsApi.list()
      setAutomations(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleToggle = async (automation: Automation) => {
    try {
      const res = await automationsApi.toggle(automation.id)
      setAutomations(prev => prev.map(a => a.id === automation.id ? res.data : a))
    } catch { /* ignore */ }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await automationsApi.delete(deleteTarget.id)
      setAutomations(prev => prev.filter(a => a.id !== deleteTarget.id))
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleSaved = (automation: Automation) => {
    setAutomations(prev => {
      const idx = prev.findIndex(a => a.id === automation.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = automation
        return next
      }
      return [automation, ...prev]
    })
    setWizardOpen(false)
    setEditTarget(null)
    setWizardPreset(null)
  }

  const openNew = () => {
    if (!hasWhatsappLine) return // blocked — banner explains why
    setEditTarget(null)
    setWizardPreset(null)
    setWizardOpen(true)
  }

  const openEdit = (a: Automation) => {
    setEditTarget(a)
    setWizardPreset(null)
    setWizardOpen(true)
  }

  const openFromGallery = (preset: typeof GALLERY_TEMPLATES[number]['preset']) => {
    if (!hasWhatsappLine) return // blocked — banner explains why
    setEditTarget(null)
    setWizardPreset(preset)
    setWizardOpen(true)
  }

  useRegisterTopBarActions(
    <div className="flex items-center gap-2">
      <button
        onClick={() => setGalleryOpen(true)}
        disabled={!hasWhatsappLine}
        title={!hasWhatsappLine ? 'Conecte uma linha WhatsApp antes de criar automações' : undefined}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-700 text-surface-400 hover:text-surface-200 hover:border-surface-600 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-surface-400 disabled:hover:border-surface-700"
      >
        <BookOpen className="w-3.5 h-3.5" />
        Modelos prontos
      </button>
      <button
        onClick={openNew}
        disabled={!hasWhatsappLine}
        title={!hasWhatsappLine ? 'Conecte uma linha WhatsApp antes de criar automações' : undefined}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-surface-950 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brand-600"
      >
        <Plus className="w-3.5 h-3.5" />
        Nova automação
      </button>
    </div>,
    [hasWhatsappLine],
  )

  // Filter (memoized to avoid recalculating on unrelated renders). Rows
  // without a whatsappNumberId stay visible regardless of the line
  // filter so the WabaAssignmentBadge can do its job — see lineMatches
  // helper for the rule.
  const filtered = useMemo(() => automations.filter(a => {
    if (!lineMatches(lineFilter, { whatsappNumberId: a.whatsappNumberId })) return false
    if (statusFilter !== 'all' && a.status !== statusFilter) return false
    if (typeFilter   !== 'all' && a.type   !== typeFilter)   return false
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) &&
        !a.description.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [automations, statusFilter, typeFilter, search, lineFilter])

  // Group by type for display
  const groups = useMemo(() => TYPE_OPTIONS.slice(1).reduce<Record<string, Automation[]>>((acc, opt) => {
    const list = filtered.filter(a => a.type === opt.value)
    if (list.length > 0) acc[opt.value] = list
    return acc
  }, {}), [filtered])

  return (
    <>
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* WhatsApp gate — rendered above everything so operator sees
            the blocker before scrolling through filters/lists. */}
        {!waLoading && !hasWhatsappLine && (
          <div className="px-6 pt-5">
            <WhatsappLineRequiredBanner resource="automações" />
          </div>
        )}

        {/* Status strip */}
        {!loading && <StatusStrip automations={automations} />}

        {/* Filter bar */}
        <FilterBar
          search={search}
          onSearch={setSearch}
          status={statusFilter}
          onStatus={setStatusFilter}
          typeFilter={typeFilter}
          onType={setTypeFilter}
          lineFilter={lineFilter}
          onLineFilter={setLineFilter}
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <>
              <GuideCard />
              <EmptyState onNew={openNew} onGallery={() => setGalleryOpen(true)} />
            </>
          ) : typeFilter !== 'all' ? (
            /* Flat list (horizontal rows) when filtering by type */
            <>
              <GuideCard />
              <div className="px-6 py-4 flex flex-col gap-2">
                {filtered.map(a => (
                  <AutomationCard
                    key={a.id}
                    automation={a}
                    onEdit={openEdit}
                    onToggle={handleToggle}
                    onDelete={setDeleteTarget}
                    onAssignWaba={setAssignWabaTarget}
                  />
                ))}
              </div>
            </>
          ) : (
            /* Grouped by type — each group is a horizontal list */
            <>
              <GuideCard />
              <div className="px-6 py-4 flex flex-col gap-6">
                {Object.entries(groups).map(([typeKey, list]) => {
                  const cfg = TYPE_CONFIG[typeKey as AutomationType]
                  return (
                    <div key={typeKey}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-surface-200">{cfg.icon}</span>
                        <h2 className="text-xs font-semibold text-surface-200 uppercase tracking-wider">{cfg.label}</h2>
                        <span className="text-xs text-surface-300">({list.length})</span>
                      </div>
                      <div className="flex flex-col gap-2">
                          {list.map(a => (
                            <AutomationCard
                              key={a.id}
                              automation={a}
                              onEdit={openEdit}
                              onToggle={handleToggle}
                              onDelete={setDeleteTarget}
                              onAssignWaba={setAssignWabaTarget}
                            />
                          ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Wizard — desktop only; mobile mostra gate */}
      {isMobile ? (
        <MobileFeatureGate
          open={wizardOpen}
          onClose={() => { setWizardOpen(false); setEditTarget(null); setWizardPreset(null) }}
          featureName={editTarget ? 'Editar automação' : 'Criar automação'}
          description="Wizard de automações tem múltiplos passos com gatilhos, condições e ações encadeadas. No celular fica apertado — abra no desktop para configurar com tranquilidade."
        />
      ) : (
        <AnimatePresence>
          {wizardOpen && (
            <AutomationWizard
              open={wizardOpen}
              onClose={() => { setWizardOpen(false); setEditTarget(null); setWizardPreset(null) }}
              onSaved={handleSaved}
              editTarget={editTarget}
              preset={wizardPreset}
            />
          )}
        </AnimatePresence>
      )}

      {/* Template gallery */}
      <AnimatePresence>
        {galleryOpen && (
          <TemplateGallery
            onSelect={openFromGallery}
            onClose={() => setGalleryOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirm
            automation={deleteTarget}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* Assign-WABA modal for legacy rows flagged by Migration #045 */}
      {assignWabaTarget && (
        <AssignWabaModal
          resourceType="automation"
          resourceId={assignWabaTarget.id}
          resourceName={assignWabaTarget.name}
          currentNumberId={assignWabaTarget.whatsappNumberId}
          onClose={() => setAssignWabaTarget(null)}
          onSaved={() => {
            setAssignWabaTarget(null)
            load() // refetch list — card loses the badge + gains the chip
          }}
        />
      )}
    </>
  )
}
