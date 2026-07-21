import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Plus, Search, Zap, ChevronRight, ChevronDown, Check, ListFilter,
  Workflow, AlertTriangle, Sparkles, ToggleLeft, ToggleRight,
  Pencil, Copy, Trash2, CopyPlus, Phone, X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'

import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import { useRegisterTopBarActions } from '@/contexts/TopBarActionsContext'
import { useCopilotContext } from '@/contexts/CopilotContext'
import { AutomationBuilder } from '@/components/automations/AutomationBuilder'
import { AutomationDetail, type AutomationBuilderSection } from '@/components/automations/AutomationDetail'
import { MobileFeatureGate } from '@/components/common/MobileFeatureGate'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { useIsMobile } from '@/hooks/useIsMobile'
import { WhatsappLineRequiredBanner } from '@/components/shared/WhatsappLineRequiredBanner'
import { automationsApi } from '@/services/api'
import { WabaAssignmentBadge } from '@/components/common/WabaAssignmentBadge'
import { WhatsappLineChip } from '@/components/common/WhatsappLineChip'
import { AssignWabaModal } from '@/components/common/AssignWabaModal'
import { LineFilterChip, lineMatches, type LineFilterValue } from '@/components/common/LineFilterChip'
import { useContextMenuCtx } from '@/components/ui/contextMenuCore'
import type { ContextMenuEntry } from '@/components/ui/ContextMenu'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { DataTable, type DataTableColumn, type DataTableSort } from '@/components/ui/DataTable'
import { Switch } from '@/components/ui/Switch'
import { useTableSelection } from '@/hooks/useTableSelection'
import {
  triggerChipLabel, actionLabel, agentBehaviorDeviates,
  deriveAttention, attentionCount, TYPE_ACCENT, type AttentionFlag,
} from '@/components/automations/automationText'
import { AutomationsMobileList } from '@/components/automations/AutomationsMobileList'
import { TYPE_CONFIG } from '@/components/automations/TypeBadge'
import { showToast } from '@/hooks/useToast'
import { relativeDate, cn } from '@/lib/utils'
import type { Automation, AutomationType, AutomationStatus } from '@/types'

// ── Filtros ──────────────────────────────────────────────────────────────────

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

// Prompt diagnóstico para "Resolver com IA" — despacha o problema pro Copilot,
// que já tem a tool update_automation com card de aprovação editável.
function resolvePrompt(a: Automation, flag: AttentionFlag): string {
  return `A automação "${a.name}" está com um problema: ${flag.hint} Analise o gatilho, as condições e as ações dela e proponha uma correção.`
}

function TypeFilterChip({ value, onChange }: { value: AutomationType | 'all'; onChange: (v: AutomationType | 'all') => void }) {
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
        <div className="absolute left-0 top-full mt-1.5 w-56 rounded-lg overlay-surface border z-30 overflow-hidden">
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
                      isActive ? 'bg-brand-500/10 text-surface-100' : 'text-surface-300 hover:bg-surface-800',
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

// ── Contagens de status (alimentam o SegmentedControl) ───────────────────────

interface Counts { total: number; active: number; inactive: number; draft: number; totalExec: number }

// ── Empty state (nenhuma automação) ──────────────────────────────────────────

function EmptyStateBlank({ onNew }: { onNew: () => void }) {
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
      <button
        onClick={onNew}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-surface-950 text-sm font-semibold transition-colors shadow-lg shadow-brand-900/30"
      >
        <Plus className="w-4 h-4" />
        Criar automação
      </button>
    </div>
  )
}

// ── Delete confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ automation, onConfirm, onCancel }: {
  automation: Automation; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative z-10 bg-surface-950 overlay-frame border rounded-2xl w-full max-w-sm p-6 text-center"
      >
        <div className="w-12 h-12 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-5 h-5 text-danger" />
        </div>
        <h3 className="text-sm font-semibold text-surface-100 mb-1">Excluir automação?</h3>
        <p className="text-xs text-surface-500 mb-5">
          "<span className="text-surface-300">{automation.name}</span>" será removida permanentemente.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl border border-surface-700 text-surface-300 hover:text-surface-100 text-sm font-medium transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-xl bg-danger hover:bg-danger/90 text-white text-sm font-semibold transition-colors">
            Excluir
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function DuplicateToLineModal({ automation, lines, onPick, onCancel }: {
  automation: Automation
  lines: { id: string; label?: string; displayPhoneNumber: string }[]
  onPick: (lineId: string) => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        className="relative z-10 bg-surface-950 overlay-frame border rounded-2xl w-full max-w-sm p-5"
      >
        <h3 className="text-sm font-semibold text-surface-100 mb-1">Duplicar para outra linha</h3>
        <p className="text-xs text-surface-500 mb-4">
          Cria uma cópia de "<span className="text-surface-300">{automation.name}</span>" como rascunho na linha escolhida.
        </p>
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {lines.map((l) => {
            const isCurrent = l.id === automation.whatsappNumberId
            return (
              <button
                key={l.id}
                onClick={() => onPick(l.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-surface-800 bg-surface-900 hover:border-brand-500/40 hover:bg-surface-800 transition-colors text-left"
              >
                <Phone className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                <span className="text-xs font-medium text-surface-200 flex-1 truncate">{l.label || l.displayPhoneNumber}</span>
                {isCurrent && <span className="text-[10px] text-surface-500 flex-shrink-0">atual</span>}
              </button>
            )
          })}
        </div>
        <button onClick={onCancel} className="w-full mt-4 py-2 rounded-xl border border-surface-700 text-surface-300 hover:text-surface-100 text-sm font-medium transition-colors">
          Cancelar
        </button>
      </motion.div>
    </div>
  )
}

// Barra de ações em massa — enxuta (Ativar/Desativar/Excluir), com confirmação
// inline pra exclusão. Kill-switch de incidente: pausar tudo de uma linha ruim.
function BulkBar({ count, onActivate, onDeactivate, onDelete, onClear }: {
  count: number
  onActivate: () => void
  onDeactivate: () => void
  onDelete: () => void
  onClear: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const btn = 'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors'
  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 overlay-surface border rounded-xl flex items-center gap-1 pl-4 pr-2 py-2"
    >
      {confirming ? (
        <>
          <span className="text-sm text-surface-200">Excluir <span className="font-semibold text-danger">{count}</span> {count === 1 ? 'automação' : 'automações'}?</span>
          <div className="h-5 w-px bg-surface-700 mx-1" />
          <button onClick={() => setConfirming(false)} className={cn(btn, 'text-surface-300 hover:bg-surface-700')}>Cancelar</button>
          <button onClick={() => { onDelete(); setConfirming(false) }} className={cn(btn, 'text-white bg-danger hover:bg-danger/90')}>
            <Trash2 className="w-3.5 h-3.5" /> Excluir
          </button>
        </>
      ) : (
        <>
          <div className="text-sm text-surface-200 pr-1">
            <span className="font-semibold text-brand-300">{count}</span> {count === 1 ? 'selecionada' : 'selecionadas'}
          </div>
          <div className="h-5 w-px bg-surface-700 mx-1" />
          <button onClick={onActivate} className={cn(btn, 'text-surface-100 hover:bg-surface-700')}>
            <ToggleRight className="w-4 h-4 text-status-active" /> Ativar
          </button>
          <button onClick={onDeactivate} className={cn(btn, 'text-surface-100 hover:bg-surface-700')}>
            <ToggleLeft className="w-4 h-4 text-surface-400" /> Desativar
          </button>
          <div className="h-5 w-px bg-surface-700 mx-1" />
          <button onClick={() => setConfirming(true)} className={cn(btn, 'text-danger hover:bg-danger/10')}>
            <Trash2 className="w-3.5 h-3.5" /> Excluir
          </button>
          <button onClick={onClear} aria-label="Limpar seleção" className="p-1.5 ml-1 text-surface-400 hover:text-surface-100 hover:bg-surface-700 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </>
      )}
    </motion.div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS_BASE: { value: AutomationStatus | 'all'; label: string }[] = [
  { value: 'all',      label: 'Todas'     },
  { value: 'active',   label: 'Ativas'    },
  { value: 'inactive', label: 'Inativas'  },
  { value: 'draft',    label: 'Rascunho'  },
]

export function AutomationsPage() {
  const isMobile = useIsMobile()
  const { numbers: whatsappLines, loading: waLoading } = useWorkspaceNumber()
  const hasWhatsappLine = whatsappLines.length > 0
  const multiLine = whatsappLines.length > 1
  const { open: openContextMenu } = useContextMenuCtx()
  const [searchParams, setSearchParams] = useSearchParams()
  const { open: openCopilot } = useCopilotContext()

  const [automations, setAutomations]   = useState<Automation[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<AutomationStatus | 'all'>('all')
  const [typeFilter, setTypeFilter]     = useState<AutomationType | 'all'>('all')
  const [lineFilter, setLineFilter]     = useState<LineFilterValue>('all')
  const [attentionOnly, setAttentionOnly] = useState(false)
  const [sort, setSort]                 = useState<DataTableSort>({ key: 'atividade', dir: 'desc' })
  const [selectedId, setSelectedId]     = useState<string | null>(null)

  const [wizardOpen, setWizardOpen]         = useState(false)
  const [editTarget, setEditTarget]         = useState<Automation | null>(null)
  const [editSection, setEditSection]       = useState<AutomationBuilderSection | undefined>(undefined)
  const [deleteTarget, setDeleteTarget]     = useState<Automation | null>(null)
  const [assignWabaTarget, setAssignWabaTarget] = useState<Automation | null>(null)
  const [dupToLineTarget, setDupToLineTarget]   = useState<Automation | null>(null)

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

  // Deep-link: /automations?automation=:id abre o detalhe; ?atencao=1 filtra.
  // Consumido uma vez e limpo da URL (padrão ContactsPage).
  useEffect(() => {
    const autoParam = searchParams.get('automation')
    const atencaoParam = searchParams.get('atencao')
    if (!autoParam && atencaoParam !== '1') return
    if (autoParam) setSelectedId(autoParam)
    if (atencaoParam === '1') setAttentionOnly(true)
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  const handleToggle = async (automation: Automation) => {
    try {
      const res = await automationsApi.toggle(automation.id)
      setAutomations(prev => prev.map(a => a.id === automation.id ? res.data : a))
    } catch {
      showToast('Não foi possível alterar o status da automação', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await automationsApi.delete(deleteTarget.id)
      setAutomations(prev => prev.filter(a => a.id !== deleteTarget.id))
      if (selectedId === deleteTarget.id) setSelectedId(null)
      showToast('Automação excluída', 'success')
    } catch {
      showToast('Não foi possível excluir', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleDuplicate = async (a: Automation) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, tenantId, executionCount, lastExecutedAt, createdAt, updatedAt, ...rest } = a
    try {
      const res = await automationsApi.create({ ...rest, name: `${a.name} (cópia)`, status: 'draft' })
      setAutomations(prev => [res.data, ...prev])
      setSelectedId(res.data.id)
      showToast('Automação duplicada como rascunho', 'success')
    } catch {
      showToast('Não foi possível duplicar', 'error')
    }
  }

  const handleDuplicateToLine = async (a: Automation, lineId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, tenantId, executionCount, lastExecutedAt, createdAt, updatedAt, ...rest } = a
    try {
      const res = await automationsApi.create({
        ...rest, name: `${a.name} (cópia)`, status: 'draft',
        whatsappNumberId: lineId, needsWabaAssignment: false,
      })
      setAutomations(prev => [res.data, ...prev])
      setSelectedId(res.data.id)
      showToast('Automação duplicada para a linha escolhida', 'success')
    } catch {
      showToast('Não foi possível duplicar', 'error')
    } finally {
      setDupToLineTarget(null)
    }
  }

  const bulkSetActive = async (activate: boolean) => {
    const targets = selectedItems.filter(a => activate ? a.status !== 'active' : a.status === 'active')
    clearSelection()
    if (targets.length === 0) return
    const results = await Promise.allSettled(targets.map(a => automationsApi.toggle(a.id)))
    const updated: Automation[] = []
    let failed = 0
    results.forEach((r) => { if (r.status === 'fulfilled') updated.push(r.value.data); else failed++ })
    if (updated.length) setAutomations(prev => prev.map(a => updated.find(u => u.id === a.id) ?? a))
    const verb = activate ? 'ativada(s)' : 'desativada(s)'
    if (failed === 0) showToast(`${updated.length} ${verb}`, 'success')
    else showToast(`${updated.length} ${verb}, ${failed} falhou`, 'warning')
  }

  const bulkDelete = async () => {
    const targets = [...selectedItems]
    clearSelection()
    if (targets.length === 0) return
    const results = await Promise.allSettled(targets.map(a => automationsApi.delete(a.id)))
    const deleted = new Set<string>()
    let failed = 0
    results.forEach((r, i) => { if (r.status === 'fulfilled') deleted.add(targets[i].id); else failed++ })
    if (deleted.size) {
      setAutomations(prev => prev.filter(a => !deleted.has(a.id)))
      if (selectedId && deleted.has(selectedId)) setSelectedId(null)
    }
    if (failed === 0) showToast(`${deleted.size} excluída(s)`, 'success')
    else showToast(`${deleted.size} excluída(s), ${failed} falhou`, 'warning')
  }

  const handleSaved = (automation: Automation) => {
    setAutomations(prev => {
      const idx = prev.findIndex(a => a.id === automation.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = automation; return next }
      return [automation, ...prev]
    })
    setSelectedId(automation.id)
    setWizardOpen(false)
    setEditTarget(null)
  }

  const openNew = () => {
    if (!hasWhatsappLine) return
    setEditTarget(null)
    setEditSection(undefined)
    setWizardOpen(true)
  }
  const openEdit = (a: Automation, section?: AutomationBuilderSection) => {
    setEditTarget(a)
    setEditSection(section)
    setWizardOpen(true)
  }

  useRegisterTopBarActions(
    <div className="flex items-center gap-2">
      <button
        onClick={() => openCopilot('Quero criar uma automação. Objetivo: ')}
        disabled={!hasWhatsappLine}
        title={!hasWhatsappLine ? 'Conecte uma linha WhatsApp antes de criar automações' : undefined}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-700 text-surface-300 hover:text-surface-100 hover:border-surface-600 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Descrever com IA
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

  // Derivados
  const counts = useMemo<Counts>(() => ({
    total: automations.length,
    active: automations.filter(a => a.status === 'active').length,
    inactive: automations.filter(a => a.status === 'inactive').length,
    draft: automations.filter(a => a.status === 'draft').length,
    totalExec: automations.reduce((s, a) => s + a.executionCount, 0),
  }), [automations])

  const attentionK = useMemo(() => attentionCount(automations), [automations])

  const statusOptions = useMemo(() => STATUS_OPTIONS_BASE.map(o => ({
    ...o,
    count: o.value === 'all' ? counts.total
      : o.value === 'active' ? counts.active
      : o.value === 'inactive' ? counts.inactive
      : counts.draft,
  })), [counts])

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    return automations.filter(a => {
      if (!lineMatches(lineFilter, { whatsappNumberId: a.whatsappNumberId })) return false
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      if (typeFilter !== 'all' && a.type !== typeFilter) return false
      if (attentionOnly && deriveAttention(a).length === 0) return false
      if (s && !a.name.toLowerCase().includes(s) && !a.description.toLowerCase().includes(s)) return false
      return true
    })
  }, [automations, statusFilter, typeFilter, search, lineFilter, attentionOnly])

  const sortedRows = useMemo(() => {
    const rows = [...filtered]
    rows.sort((a, b) => {
      if (sort.key === 'nome') {
        const c = a.name.localeCompare(b.name, 'pt-BR')
        return sort.dir === 'asc' ? c : -c
      }
      const ta = a.lastExecutedAt ? new Date(a.lastExecutedAt).getTime() : -Infinity
      const tb = b.lastExecutedAt ? new Date(b.lastExecutedAt).getTime() : -Infinity
      let c = ta - tb
      if (c === 0) c = a.executionCount - b.executionCount
      return sort.dir === 'asc' ? c : -c
    })
    return rows
  }, [filtered, sort])

  const selected = useMemo(() => automations.find(a => a.id === selectedId) ?? null, [automations, selectedId])

  const getId = useCallback((a: Automation) => a.id, [])
  const { selectedIds, toggle: toggleSelect, selectAll, clear: clearSelection, count: selCount, selectedItems } = useTableSelection(automations, getId)
  const allVisibleSelected = sortedRows.length > 0 && sortedRows.every(a => selectedIds.has(a.id))

  const rowMenu = (a: Automation, e: React.MouseEvent) => {
    e.preventDefault()
    const isActive = a.status === 'active'
    const items: ContextMenuEntry[] = [
      { label: 'Editar', icon: Pencil, onClick: () => openEdit(a) },
      { label: 'Duplicar', icon: CopyPlus, onClick: () => handleDuplicate(a) },
      { label: 'Copiar nome', icon: Copy, onClick: () => navigator.clipboard?.writeText(a.name).catch(() => {}) },
      { separator: true },
      { label: isActive ? 'Desativar' : 'Ativar', icon: isActive ? ToggleLeft : ToggleRight, onClick: () => handleToggle(a) },
      { separator: true },
      { label: 'Excluir', icon: Trash2, danger: true, onClick: () => setDeleteTarget(a) },
    ]
    openContextMenu(e.clientX, e.clientY, items)
  }

  // Colunas
  const columns = useMemo<DataTableColumn<Automation>[]>(() => {
    const cols: DataTableColumn<Automation>[] = [
      {
        key: 'estado', header: '', widthClass: 'w-20',
        render: (a) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Switch checked={a.status === 'active'} onChange={() => handleToggle(a)} />
          </div>
        ),
      },
      {
        key: 'nome', header: 'Nome', sortable: true,
        render: (a) => {
          const accent = TYPE_ACCENT[a.type] ?? '#2DD4BF'
          return (
            <div className="flex items-center gap-3 min-w-0 max-w-[280px]">
              <span
                className="color-chip w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border"
                style={{ ['--chip']: accent } as React.CSSProperties}
                title={TYPE_CONFIG[a.type]?.label}
              >
                {TYPE_CONFIG[a.type]?.icon}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-sm font-medium text-surface-100 truncate min-w-0">{a.name}</p>
                  {a.status === 'draft' && (
                    <span className="color-chip px-1.5 py-0.5 rounded-full text-[9px] font-semibold border flex-shrink-0" style={{ ['--chip']: 'var(--color-status-pending)' } as React.CSSProperties}>
                      Rascunho
                    </span>
                  )}
                </div>
                {a.description && <p className="text-[11px] text-surface-500 truncate">{a.description}</p>}
              </div>
            </div>
          )
        },
      },
      {
        key: 'fluxo', header: 'Fluxo',
        render: (a) => {
          const acts = a.actions ?? []
          return (
            <div className="flex items-center gap-1.5 min-w-0 max-w-[420px]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-800 border border-surface-700 text-[11px] text-surface-200 whitespace-nowrap flex-shrink-0">
                <Zap className="w-3 h-3 text-surface-400" />{triggerChipLabel(a)}
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
              {agentBehaviorDeviates(a) && (
                <span title="Comportamento de IA personalizado" className="flex-shrink-0">
                  <Sparkles className="w-3 h-3 text-brand-400/70" />
                </span>
              )}
            </div>
          )
        },
      },
      ...(multiLine ? [{
        key: 'linha', header: 'Linha', responsiveClass: 'hidden xl:table-cell',
        render: (a: Automation) => (
          <div onClick={(e) => e.stopPropagation()}>
            {a.needsWabaAssignment
              ? <WabaAssignmentBadge onClick={() => setAssignWabaTarget(a)} />
              : <WhatsappLineChip whatsappNumberId={a.whatsappNumberId} />}
          </div>
        ),
      } as DataTableColumn<Automation>] : []),
      {
        key: 'atividade', header: 'Atividade', align: 'right', sortable: true, responsiveClass: 'hidden md:table-cell',
        render: (a) => (
          <div className="text-right whitespace-nowrap">
            <span className="text-xs text-surface-200 tabular-nums">{a.executionCount.toLocaleString('pt-BR')}</span>
            <span className="text-[11px] text-surface-500"> · {a.lastExecutedAt ? relativeDate(a.lastExecutedAt) : '—'}</span>
          </div>
        ),
      },
      {
        key: 'atencao', header: '', align: 'center', widthClass: 'w-10',
        render: (a) => {
          const flags = deriveAttention(a)
          return flags.length > 0
            ? <span title={flags[0].hint} className="inline-flex"><AlertTriangle className="w-3.5 h-3.5 text-warning" /></span>
            : null
        },
      },
    ]
    return cols
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiLine])

  const showToolbar = !loading && automations.length > 0

  return (
    <>
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isMobile && <MobilePageHeader title="Automações" />}

        {/* Gate WhatsApp */}
        {!waLoading && !hasWhatsappLine && (
          <div className="px-6 pt-5">
            <WhatsappLineRequiredBanner resource="automações" />
          </div>
        )}

        {/* Toolbar */}
        {showToolbar && (
          <div className="flex items-center gap-3 px-6 py-3 flex-shrink-0">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar automação..."
                className="w-full bg-surface-900 border border-surface-700 rounded-xl pl-8 pr-3 py-1.5 text-sm text-surface-200 placeholder-surface-600 focus:outline-none focus:border-brand-500/50"
              />
            </div>
            <SegmentedControl label="Filtrar por status" options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
            <TypeFilterChip value={typeFilter} onChange={setTypeFilter} />
            <LineFilterChip value={lineFilter} onChange={setLineFilter} />
            <div className="flex-1" />
            {attentionK > 0 && (
              <button
                onClick={() => setAttentionOnly(v => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                  attentionOnly
                    ? 'bg-warning/15 border-warning/40 text-warning'
                    : 'bg-surface-800 border-surface-700/60 text-surface-300 hover:border-warning/40 hover:text-warning',
                )}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Atenção
                <span className="min-w-[18px] px-1 rounded-full bg-warning/20 text-[10px] text-center tabular-nums">{attentionK}</span>
              </button>
            )}
          </div>
        )}

        {/* Conteúdo */}
        {!loading && automations.length === 0 && !waLoading && hasWhatsappLine ? (
          <EmptyStateBlank onNew={openNew} />
        ) : isMobile ? (
          // Mobile: lista vertical de cards — a tabela larga (Fluxo, Atividade,
          // Linha) fica inutilizável em viewport estreita.
          <AutomationsMobileList
            automations={sortedRows}
            loading={loading}
            multiLine={multiLine}
            onOpenDetail={(a) => setSelectedId(a.id)}
            onToggle={handleToggle}
          />
        ) : (
          <div className="flex-1 min-w-0 overflow-hidden flex flex-col px-4 py-3">
            <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-surface-800 overflow-hidden bg-surface-900/20">
              <DataTable
                columns={columns}
                rows={sortedRows}
                rowKey={(a) => a.id}
                loading={loading}
                emptyIcon={Workflow}
                emptyTitle="Nenhuma automação encontrada"
                emptyHint="Ajuste os filtros ou crie uma nova automação."
                sort={sort}
                onSortChange={setSort}
                onRowClick={(a) => setSelectedId(a.id)}
                onRowContextMenu={rowMenu}
                selectedKeys={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={() => allVisibleSelected ? clearSelection() : selectAll(sortedRows.map(a => a.id))}
                activeKey={selectedId}
                className="flex-1 min-h-0"
              />
            </div>
          </div>
        )}
      </main>

      {/* Detalhe em drawer — desliza da direita em todas as telas (mesmo modelo do builder) */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              key="detail-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/40 z-[39]"
              onClick={() => setSelectedId(null)}
            />
            <motion.div
              key="detail-panel"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.9 }}
              className="fixed top-0 right-0 bottom-0 w-full sm:w-[34rem] z-40 bg-surface-950 border-l overlay-frame flex flex-col"
            >
              <AutomationDetail
                automation={selected}
                onToggle={handleToggle}
                onEdit={(a, section) => openEdit(a, section)}
                onDuplicate={handleDuplicate}
                onDuplicateToLine={multiLine ? (a) => setDupToLineTarget(a) : undefined}
                onDelete={setDeleteTarget}
                onResolveWithAI={(a, flag) => openCopilot(resolvePrompt(a, flag))}
                onClose={() => setSelectedId(null)}
                variant="overlay"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Wizard (criação/edição — será substituído pelo builder) */}
      {isMobile ? (
        <MobileFeatureGate
          open={wizardOpen}
          onClose={() => { setWizardOpen(false); setEditTarget(null) }}
          featureName={editTarget ? 'Editar automação' : 'Criar automação'}
          description="O construtor de automações tem gatilhos, condições e ações encadeadas. No celular fica apertado — abra no desktop para configurar com tranquilidade."
        />
      ) : (
        <AutomationBuilder
          open={wizardOpen}
          onClose={() => { setWizardOpen(false); setEditTarget(null); setEditSection(undefined) }}
          onSaved={handleSaved}
          editTarget={editTarget}
          preset={null}
          initialSection={editSection}
          onDescribeWithAI={() => { setWizardOpen(false); setEditTarget(null); openCopilot('Quero criar uma automação. Objetivo: ') }}
        />
      )}

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirm automation={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
        )}
      </AnimatePresence>

      {/* Assign-WABA */}
      {assignWabaTarget && (
        <AssignWabaModal
          resourceType="automation"
          resourceId={assignWabaTarget.id}
          resourceName={assignWabaTarget.name}
          currentNumberId={assignWabaTarget.whatsappNumberId}
          onClose={() => setAssignWabaTarget(null)}
          onSaved={() => { setAssignWabaTarget(null); load() }}
        />
      )}

      {/* Duplicar para outra linha */}
      <AnimatePresence>
        {dupToLineTarget && (
          <DuplicateToLineModal
            automation={dupToLineTarget}
            lines={whatsappLines}
            onPick={(lineId) => handleDuplicateToLine(dupToLineTarget, lineId)}
            onCancel={() => setDupToLineTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* Ações em massa */}
      <AnimatePresence>
        {selCount > 0 && (
          <BulkBar
            count={selCount}
            onActivate={() => bulkSetActive(true)}
            onDeactivate={() => bulkSetActive(false)}
            onDelete={bulkDelete}
            onClear={clearSelection}
          />
        )}
      </AnimatePresence>
    </>
  )
}
