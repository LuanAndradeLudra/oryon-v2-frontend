// ─── Capabilities Tab ────────────────────────────────────────────────────────
//
// Phase 25 — UI for tenant admins to grant their WhatsApp agent permission to
// run CRM operations (status changes, assignment, tagging, pipeline moves).
//
// The catalog is duplicated client-side from
// agent-server/src/config/crmCapabilities/index.ts to keep this tab snappy
// without an extra fetch. Whenever the server-side catalog changes, mirror
// the change here. This is intentional: only labels/descriptions live here;
// the actual tool wiring is server-side and authoritative.
//
// Layout:
//   * One section per category (Conversa / Etiquetas / Funil).
//   * Each capability is a card with a master Switch and (when enabled) a
//     "Configurar limites" button that opens a Modal with constraint pickers.
//   * Save is debounced — every Switch toggle / constraint change auto-saves
//     in the background. The header shows a "Salvando…" indicator that fades
//     to "Salvo" on success. Avoids a separate Save bar this tab doesn't need.

import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle, ShieldCheck, AlertCircle, Loader2, ChevronRight, Sparkles,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/Switch'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { tagsApi, usersApi, stagesApi, pipelinesApi } from '@/services/api'
import { updateAgent } from '@/services/agentsApi'
import { pipelineKindOption } from '@/lib/pipelineKinds'
import type {
  AgentConfig,
  AgentCrmCapabilities,
  AgentCrmCapabilityConfig,
  ConversationStatus,
  CrmCapabilityCategory,
  CrmCapabilityConstraints,
  CrmCapabilityId,
} from '@/services/agentsApi'
import type { Tag, TenantStage, User, Pipeline } from '@/types'
import {
  CRM_CAPABILITIES_CATALOG,
  CRM_CATEGORY_META,
  STATUS_OPTIONS,
  type CrmCapabilityCatalogEntry,
} from './crmCapabilitiesCatalog'

type CatalogEntry = CrmCapabilityCatalogEntry
const CATALOG = CRM_CAPABILITIES_CATALOG
const CATEGORY_META = CRM_CATEGORY_META

// ─── Tab Component ──────────────────────────────────────────────────────────

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function CapabilitiesTab({
  agent,
  onUpdate,
}: {
  agent: AgentConfig
  onUpdate: (updated: AgentConfig) => void
}) {
  // Server is the source of truth; we keep a local copy that mirrors it
  // optimistically. `dirty` flips when the user tweaks anything; the
  // debounced effect below auto-saves whenever it does.
  const initialCaps = agent.crm_capabilities?.capabilities ?? []
  const [caps, setCaps] = useState<AgentCrmCapabilityConfig[]>(initialCaps)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [editingCap, setEditingCap] = useState<CrmCapabilityId | null>(null)

  useEffect(() => {
    setCaps(agent.crm_capabilities?.capabilities ?? [])
  }, [agent.id, agent.crm_capabilities])

  // Debounced auto-save: collapse rapid switch toggles into one PATCH.
  useEffect(() => {
    const initial = JSON.stringify(agent.crm_capabilities?.capabilities ?? [])
    const current = JSON.stringify(caps)
    if (initial === current) {
      setSaveState((s) => (s === 'saved' ? 'saved' : 'idle'))
      return
    }
    setSaveState('saving')
    const timer = setTimeout(async () => {
      try {
        const payload: AgentCrmCapabilities = { capabilities: caps }
        const updated = await updateAgent(agent.id, { crm_capabilities: payload })
        onUpdate(updated)
        setSaveState('saved')
        setErrorMsg(null)
      } catch (err) {
        setSaveState('error')
        setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar')
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [caps, agent.id, agent.crm_capabilities, onUpdate])

  const grouped = useMemo(() => {
    const out: Record<CrmCapabilityCategory, CatalogEntry[]> = {
      conversation: [], contact: [], tags: [], pipeline: [],
    }
    for (const c of CATALOG) out[c.category].push(c)
    return out
  }, [])

  const findCap = (id: CrmCapabilityId): AgentCrmCapabilityConfig | undefined =>
    caps.find((c) => c.id === id)

  const upsertCap = (id: CrmCapabilityId, patch: Partial<AgentCrmCapabilityConfig>) => {
    setCaps((prev) => {
      const existing = prev.find((c) => c.id === id)
      if (existing) {
        return prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
      }
      return [...prev, { id, enabled: false, ...patch }]
    })
  }

  const toggleCap = (entry: CatalogEntry, next: boolean) => {
    upsertCap(entry.id, {
      enabled: next,
      // First-enable applies the catalog's default constraints so the
      // conservative defaults (e.g. blocking 'resolved') don't leak.
      ...(next && !findCap(entry.id)?.constraints && entry.defaultConstraints
        ? { constraints: entry.defaultConstraints }
        : {}),
    })
  }

  const updateConstraints = (id: CrmCapabilityId, constraints: CrmCapabilityConstraints) => {
    upsertCap(id, { constraints })
  }

  const editingEntry = editingCap ? CATALOG.find((c) => c.id === editingCap) ?? null : null
  const editingState = editingCap ? findCap(editingCap) : undefined

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-surface-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-400" />
            Capacidades de CRM
          </h3>
          <p className="text-xs text-surface-500 mt-1 max-w-prose">
            Escolha quais operações o agente pode executar quando estiver atendendo um cliente no WhatsApp.
            Estas ações ficam <strong>visíveis no histórico do contato</strong> e na aba "Atividade do agente IA"
            do painel de Conversas.
          </p>
        </div>
        <SaveIndicator state={saveState} error={errorMsg} />
      </header>

      {(['conversation', 'tags', 'pipeline'] as CrmCapabilityCategory[]).map((cat) => {
        const entries = grouped[cat]
        if (!entries || entries.length === 0) return null
        const meta = CATEGORY_META[cat]
        return (
          <section key={cat} className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-surface-500">
              {meta.icon}
              {meta.label}
            </div>
            <div className="space-y-2">
              {entries.map((entry) => {
                const state = findCap(entry.id)
                const enabled = !!state?.enabled
                const constraintsSummary = describeConstraints(entry, state?.constraints)
                return (
                  <CapabilityCard
                    key={entry.id}
                    entry={entry}
                    enabled={enabled}
                    constraintsSummary={constraintsSummary}
                    onToggle={(v) => toggleCap(entry, v)}
                    onEdit={() => setEditingCap(entry.id)}
                  />
                )
              })}
            </div>
          </section>
        )
      })}

      {caps.length === 0 && (
        <EmptyState
          icon={Sparkles}
          title="Nenhuma capacidade habilitada"
          hint="Habilite ao menos uma capacidade acima para que seu agente WhatsApp possa executar ações no CRM."
        />
      )}

      {editingEntry && (
        <ConstraintsModal
          open
          entry={editingEntry}
          state={editingState}
          onClose={() => setEditingCap(null)}
          onSave={(c) => updateConstraints(editingEntry.id, c)}
        />
      )}
    </div>
  )
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function SaveIndicator({ state, error }: { state: SaveState; error: string | null }) {
  if (state === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-surface-500">
        <Loader2 className="w-3 h-3 animate-spin" />
        Salvando…
      </span>
    )
  }
  if (state === 'saved') {
    return (
      <motion.span
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="inline-flex items-center gap-1.5 text-xs text-status-success-400"
      >
        <CheckCircle className="w-3 h-3" />
        Salvo
      </motion.span>
    )
  }
  if (state === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-status-error-400" title={error ?? ''}>
        <AlertCircle className="w-3 h-3" />
        Erro ao salvar
      </span>
    )
  }
  return null
}

function CapabilityCard({
  entry, enabled, constraintsSummary, onToggle, onEdit,
}: {
  entry: CatalogEntry
  enabled: boolean
  constraintsSummary: string
  onToggle: (v: boolean) => void
  onEdit: () => void
}) {
  const hasConstraints = entry.supports.length > 0
  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-colors',
        enabled
          ? 'border-brand-700/40 bg-brand-950/20'
          : 'border-surface-800 bg-surface-950/40',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex h-7 w-7 items-center justify-center rounded-md',
            enabled ? 'bg-brand-700/30 text-brand-300' : 'bg-surface-900 text-surface-500',
          )}
        >
          {entry.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-surface-100">{entry.label}</div>
          <div className="text-xs text-surface-500 mt-0.5">{entry.description}</div>
        </div>
        <Switch checked={enabled} onChange={onToggle} />
      </div>
      {enabled && hasConstraints && (
        <button
          type="button"
          onClick={onEdit}
          className="mt-3 ml-10 inline-flex items-center gap-1.5 text-[11px] font-medium text-surface-300 hover:text-surface-100"
        >
          <span className="text-surface-500">Limites:</span>
          <span>{constraintsSummary}</span>
          <ChevronRight className="w-3 h-3 text-surface-600" />
        </button>
      )}
    </div>
  )
}

// ─── Constraints Modal ──────────────────────────────────────────────────────

function ConstraintsModal({
  open, entry, state, onClose, onSave,
}: {
  open: boolean
  entry: CatalogEntry
  state: AgentCrmCapabilityConfig | undefined
  onClose: () => void
  onSave: (c: CrmCapabilityConstraints) => void
}) {
  const [draft, setDraft] = useState<CrmCapabilityConstraints>(state?.constraints ?? {})
  useEffect(() => { setDraft(state?.constraints ?? {}) }, [state, entry.id])

  const handleSave = () => {
    onSave(normalize(draft))
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Limites — ${entry.label}`}
      footer={
        <div className="flex justify-end gap-2 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-md text-surface-300 hover:text-surface-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1.5 text-sm rounded-md bg-brand-600 hover:bg-brand-500 text-white font-medium"
          >
            Salvar limites
          </button>
        </div>
      }
    >
      <div className="space-y-5 px-4 py-3">
        <p className="text-xs text-surface-500">
          Listas vazias = <strong>sem restrição</strong> (o agente pode usar qualquer item permitido pelo sistema).
          Quando você seleciona itens, o agente fica restrito apenas a eles.
        </p>
        {entry.supports.includes('statuses') && (
          <StatusesPicker value={draft.allowedStatuses ?? []} onChange={(v) => setDraft((d) => ({ ...d, allowedStatuses: v }))} />
        )}
        {entry.supports.includes('users') && (
          <UsersPicker value={draft.allowedUserIds ?? []} onChange={(v) => setDraft((d) => ({ ...d, allowedUserIds: v }))} />
        )}
        {entry.supports.includes('tags') && (
          <TagsPicker value={draft.allowedTagIds ?? []} onChange={(v) => setDraft((d) => ({ ...d, allowedTagIds: v }))} />
        )}
        {entry.supports.includes('stages') && (
          <StagesPicker value={draft.allowedStageKeys ?? []} onChange={(v) => setDraft((d) => ({ ...d, allowedStageKeys: v }))} />
        )}
        {entry.supports.includes('dealFlags') && (
          <DealFlagsPicker
            canClose={draft.canClose ?? false}
            canEnter={draft.canEnter ?? false}
            allowBackward={draft.allowBackward ?? false}
            onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          />
        )}
        {entry.supports.includes('pipelines') && (
          <PipelinesPicker value={draft.allowedPipelineIds ?? []} onChange={(v) => setDraft((d) => ({ ...d, allowedPipelineIds: v }))} />
        )}
      </div>
    </Modal>
  )
}

function StatusesPicker({ value, onChange }: { value: ConversationStatus[]; onChange: (v: ConversationStatus[]) => void }) {
  return (
    <PickerSection title="Status permitidos" hint="Quais status o agente pode aplicar à conversa.">
      <div className="space-y-1.5">
        {STATUS_OPTIONS.map((opt) => {
          const selected = value.includes(opt.id)
          const isResolved = opt.id === 'resolved'
          return (
            <label
              key={opt.id}
              className={cn(
                'flex items-start gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-surface-900/60',
                selected && 'bg-surface-900/40',
              )}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onChange(selected ? value.filter((v) => v !== opt.id) : [...value, opt.id])}
                className="mt-0.5"
              />
              <div className="text-xs">
                <div className="text-surface-200 font-medium">
                  {opt.label}
                  {isResolved && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-status-warn-400">Cuidado</span>
                  )}
                </div>
                <div className="text-surface-500">{opt.help}</div>
              </div>
            </label>
          )
        })}
      </div>
    </PickerSection>
  )
}

function UsersPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    usersApi.list()
      .then((r) => alive && setUsers(r.data ?? []))
      .catch(() => alive && setUsers([]))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])
  return (
    <PickerSection title="Atendentes permitidos" hint="O agente só poderá atribuir conversas a estes usuários.">
      {loading ? (
        <div className="text-xs text-surface-500 px-2 py-1.5">Carregando…</div>
      ) : (
        <CheckboxList
          items={users.filter((u) => u.isActive).map((u) => ({
            id: u.id,
            label: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email,
            sub: u.email,
          }))}
          value={value}
          onChange={onChange}
        />
      )}
    </PickerSection>
  )
}

function TagsPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    tagsApi.list()
      .then((r) => alive && setTags(r.data ?? []))
      .catch(() => alive && setTags([]))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])
  return (
    <PickerSection title="Etiquetas permitidas" hint="O agente só poderá usar estas etiquetas.">
      {loading ? (
        <div className="text-xs text-surface-500 px-2 py-1.5">Carregando…</div>
      ) : (
        <CheckboxList
          items={tags.map((t) => ({ id: t.id, label: t.name, color: t.color }))}
          value={value}
          onChange={onChange}
        />
      )}
    </PickerSection>
  )
}

function StagesPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [stages, setStages] = useState<TenantStage[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    stagesApi.list()
      .then((r) => alive && setStages(r.data ?? []))
      .catch(() => alive && setStages([]))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])
  return (
    <PickerSection title="Estágios permitidos" hint='Estágios "terminais" como Ganho/Perdido vêm desmarcados por padrão — o agente não os move sem opt-in.'>
      {loading ? (
        <div className="text-xs text-surface-500 px-2 py-1.5">Carregando…</div>
      ) : (
        <CheckboxList
          items={stages.map((s) => ({
            id: s.key,
            label: s.label,
            sub: s.isTerminal ? 'Estágio terminal' : undefined,
            color: s.color,
          }))}
          value={value}
          onChange={onChange}
        />
      )}
    </PickerSection>
  )
}

function DealFlagsPicker({
  canClose, canEnter, allowBackward, onChange,
}: {
  canClose: boolean
  canEnter: boolean
  allowBackward: boolean
  onChange: (patch: Partial<Pick<CrmCapabilityConstraints, 'canClose' | 'canEnter' | 'allowBackward'>>) => void
}) {
  const rows: Array<{ key: 'canClose' | 'canEnter' | 'allowBackward'; checked: boolean; label: string; hint: string }> = [
    {
      key: 'canClose', checked: canClose,
      label: 'Fechar registro',
      hint: 'Só funil de PROCESSO (Concluído/Cancelado). Ganho/perdido de venda é sempre decisão humana — o backend recusa mesmo com este opt-in ligado.',
    },
    {
      key: 'canEnter', checked: canEnter,
      label: 'Colocar em outro funil',
      hint: 'O agente pode colocar o contato num funil onde ele ainda não está (só funis com critério de entrada configurado).',
    },
    {
      key: 'allowBackward', checked: allowBackward,
      label: 'Retroceder etapa',
      hint: 'Sem isto, o agente só avança etapas — nunca volta o registro pra trás.',
    },
  ]
  return (
    <PickerSection title="Fechar, entrar em funil e retroceder" hint="Cada um destes é opt-in — desligado por padrão.">
      <div className="space-y-1">
        {rows.map((r) => (
          <label
            key={r.key}
            className={cn(
              'flex items-start gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-surface-900/60',
              r.checked && 'bg-surface-900/40',
            )}
          >
            <input
              type="checkbox"
              checked={r.checked}
              onChange={() => onChange({ [r.key]: !r.checked })}
              className="mt-0.5"
            />
            <div className="text-xs">
              <div className="text-surface-200 font-medium">{r.label}</div>
              <div className="text-surface-500">{r.hint}</div>
            </div>
          </label>
        ))}
      </div>
    </PickerSection>
  )
}

function PipelinesPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    pipelinesApi.list()
      .then((r) => alive && setPipelines(r.data ?? []))
      .catch(() => alive && setPipelines([]))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])
  return (
    <PickerSection title="Funis permitidos" hint="Escopo de enter_pipeline/mover para outro funil. Vazio = todos os funis que o setor do agente enxerga.">
      {loading ? (
        <div className="text-xs text-surface-500 px-2 py-1.5">Carregando…</div>
      ) : (
        <CheckboxList
          items={pipelines.filter((p) => !p.isArchived).map((p) => ({
            id: p.id,
            label: p.name,
            sub: pipelineKindOption(p.kind).label,
          }))}
          value={value}
          onChange={onChange}
        />
      )}
    </PickerSection>
  )
}

function PickerSection({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-surface-200">{title}</div>
      <div className="text-[11px] text-surface-500 mt-0.5">{hint}</div>
      <div className="mt-2 max-h-60 overflow-y-auto rounded-md border border-surface-800 bg-surface-950/40 p-1.5">
        {children}
      </div>
    </div>
  )
}

function CheckboxList({
  items, value, onChange,
}: {
  items: Array<{ id: string; label: string; sub?: string; color?: string }>
  value: string[]
  onChange: (v: string[]) => void
}) {
  if (items.length === 0) {
    return <div className="text-xs text-surface-500 px-2 py-1.5">Nenhum item disponível.</div>
  }
  return (
    <div className="space-y-0.5">
      {items.map((it) => {
        const selected = value.includes(it.id)
        return (
          <label
            key={it.id}
            className={cn(
              'flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer hover:bg-surface-900/60',
              selected && 'bg-surface-900/40',
            )}
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onChange(selected ? value.filter((v) => v !== it.id) : [...value, it.id])}
            />
            {it.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: it.color }} />}
            <div className="text-xs flex-1 min-w-0">
              <div className="text-surface-200 truncate">{it.label}</div>
              {it.sub && <div className="text-surface-500 truncate text-[11px]">{it.sub}</div>}
            </div>
          </label>
        )
      })}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function describeConstraints(entry: CatalogEntry, c: CrmCapabilityConstraints | undefined): string {
  if (!c) return 'Sem limites'
  const parts: string[] = []
  if (entry.supports.includes('statuses')) {
    if (c.allowedStatuses && c.allowedStatuses.length > 0) parts.push(`${c.allowedStatuses.length} status`)
  }
  if (entry.supports.includes('users')) {
    if (c.allowedUserIds && c.allowedUserIds.length > 0) parts.push(`${c.allowedUserIds.length} atendente(s)`)
  }
  if (entry.supports.includes('tags')) {
    if (c.allowedTagIds && c.allowedTagIds.length > 0) parts.push(`${c.allowedTagIds.length} etiqueta(s)`)
  }
  if (entry.supports.includes('stages')) {
    if (c.allowedStageKeys && c.allowedStageKeys.length > 0) parts.push(`${c.allowedStageKeys.length} estágio(s)`)
  }
  if (entry.supports.includes('dealFlags')) {
    if (c.canClose) parts.push('fecha')
    if (c.canEnter) parts.push('entra em funil')
    if (c.allowBackward) parts.push('retrocede')
  }
  if (entry.supports.includes('pipelines')) {
    if (c.allowedPipelineIds && c.allowedPipelineIds.length > 0) parts.push(`${c.allowedPipelineIds.length} funil(is)`)
  }
  return parts.length === 0 ? 'Sem limites' : parts.join(' · ')
}

/** Strip empty arrays so the persisted JSON stays minimal. */
function normalize(c: CrmCapabilityConstraints): CrmCapabilityConstraints {
  const out: CrmCapabilityConstraints = {}
  if (c.allowedStatuses && c.allowedStatuses.length > 0) out.allowedStatuses = c.allowedStatuses
  if (c.allowedUserIds && c.allowedUserIds.length > 0) out.allowedUserIds = c.allowedUserIds
  if (c.allowedTagIds && c.allowedTagIds.length > 0) out.allowedTagIds = c.allowedTagIds
  if (c.allowedStageKeys && c.allowedStageKeys.length > 0) out.allowedStageKeys = c.allowedStageKeys
  if (c.canClose) out.canClose = true
  if (c.canEnter) out.canEnter = true
  if (c.allowBackward) out.allowBackward = true
  if (c.allowedPipelineIds && c.allowedPipelineIds.length > 0) out.allowedPipelineIds = c.allowedPipelineIds
  return out
}
