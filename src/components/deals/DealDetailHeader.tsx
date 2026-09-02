// B2 (SCRUM-928) — cabeçalho da ficha: título editável, valor (com origem —
// itens ou valor livre), stepper clicável, dono, previsão, probabilidade
// efetiva com override, funil, origem/ator do último movimento, e as ações
// Mover ▾ · Marcar ganho/perdido · ⋯ (transferir de funil, excluir).
import { useState } from 'react'
import {
  X, Maximize2, ChevronDown, CheckCircle2, XCircle, MoreHorizontal,
  Trash2, ArrowRightLeft, Calendar, Percent,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { UserPicker } from '@/components/ui/UserPicker'
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { formatBRL } from '@/utils/money'
import { cn, formatRelativeTime } from '@/lib/utils'
import { pipelineKindOption, pipelineKindOf, terminalLabelsOf } from '@/lib/pipelineKinds'
import { originInfo } from '@/lib/dealCard'
import { moveTargets } from '@/lib/contactPipelines'
import { dealProbability } from '@/lib/dealProbability'
import { DealStageStepper } from './DealStageStepper'
import type { Deal, Pipeline, PipelineStage, User } from '@/types'

interface DealDetailHeaderProps {
  deal: Deal
  pipeline: Pipeline
  pipelines: Pipeline[]
  users: User[]
  lastMovedLabel: string | null
  onPatch: (patch: Partial<Deal> & { updateAmount?: boolean }) => Promise<void>
  onMoveToStage: (stage: PipelineStage) => void
  onTransferPipeline: (pipelineId: string) => void
  onDelete: () => void
  onClose?: () => void
  onExpand?: () => void
}

function InlineEditTitle({ value, onSave }: { value: string; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (draft.trim() === value || !draft.trim()) { setEditing(false); setDraft(value); return }
    setSaving(true)
    try { await onSave(draft.trim()); setEditing(false) } finally { setSaving(false) }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
          onBlur={handleSave}
          aria-label="Título do negócio"
          className="bg-surface-800 border border-brand-500/50 rounded-lg px-2 py-1 text-lg font-semibold text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 min-w-0 flex-1"
        />
        {saving && <span className="text-xs text-surface-500">salvando…</span>}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => { setDraft(value); setEditing(true) }}
      data-testid="deal-title"
      className="group flex items-center gap-1.5 text-left min-w-0"
    >
      <span className="text-lg font-semibold text-surface-50 truncate group-hover:text-brand-300 transition-colors">{value}</span>
    </button>
  )
}

export function DealDetailHeader({
  deal, pipeline, pipelines, users, lastMovedLabel, onPatch, onMoveToStage, onTransferPipeline, onDelete, onClose, onExpand,
}: DealDetailHeaderProps) {
  const [ownerPickerOpen, setOwnerPickerOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [probEditing, setProbEditing] = useState(false)
  const [probDraft, setProbDraft] = useState('')

  const isSales = pipelineKindOf(pipeline) === 'sales'
  const kindOption = pipelineKindOption(pipelineKindOf(pipeline))
  const KindIcon = kindOption.icon
  const labels = terminalLabelsOf(pipeline)
  const stage = pipeline.stages.find((s) => s.id === deal.stageId) ?? null
  const targets = moveTargets(pipeline, deal.stageId)
  const wonStage = targets.terminal.find((s) => s.isWon)
  const lostStage = targets.terminal.find((s) => s.isLost)
  const owner = users.find((u) => u.id === deal.ownerUserId) ?? null
  const origin = originInfo(deal)
  const prob = dealProbability(deal, stage)
  const itemCount = deal.lineItems?.length ?? 0
  const otherPipelines = pipelines.filter((p) => p.id !== pipeline.id && !p.isArchived)

  const handleOwnerSelect = async (user: User | null) => {
    await onPatch({ ownerUserId: user?.id ?? null })
  }

  const handleExpectedCloseChange = async (v: string) => {
    await onPatch({ expectedCloseAt: v ? new Date(`${v}T00:00:00Z`).toISOString() : null })
  }

  const handleProbabilitySave = async () => {
    const trimmed = probDraft.trim()
    setProbEditing(false)
    if (trimmed === '') { await onPatch({ probability: null }); return }
    const n = Number(trimmed)
    if (!Number.isFinite(n) || n < 0 || n > 100) return
    await onPatch({ probability: Math.round(n) })
  }

  return (
    <div className="px-5 py-4 border-b border-surface-800 flex-shrink-0 flex flex-col gap-3">
      {/* Linha 1 — título + fechar/expandir */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <InlineEditTitle value={deal.title} onSave={(title) => onPatch({ title })} />
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-800 border border-surface-700 text-surface-300"
              title={kindOption.description}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: pipeline.color }} />
              <KindIcon className="w-3 h-3" /> {pipeline.name}
            </span>
            {deal.status !== 'open' && (
              <span className={cn(
                'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                deal.status === 'won' ? 'text-status-active border-status-active/40 bg-status-active-bg' : 'text-surface-400 border-surface-700 bg-surface-800',
              )}>
                {deal.status === 'won' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {deal.status === 'won' ? labels.won : labels.lost}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {onExpand && (
            <button type="button" onClick={onExpand} title="Abrir como página" className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all">
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
          {onClose && (
            <button type="button" onClick={onClose} title="Fechar" className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Linha 2 — stepper (etapas normais, clicável) */}
      {deal.status === 'open' && (
        <DealStageStepper pipeline={pipeline} deal={deal} onMoveToStage={onMoveToStage} />
      )}

      {/* Linha 3 — valor / dono / previsão / probabilidade */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        {isSales && (
          <div className="flex items-center gap-1.5" data-testid="deal-amount">
            <span className="text-surface-500">Valor</span>
            {itemCount > 0 ? (
              <span className="font-semibold text-surface-100 tabular-nums" title="Editar itens na aba Resumo">
                {formatBRL(deal.amountCents)} <span className="text-surface-500 font-normal">· {itemCount} {itemCount === 1 ? 'item' : 'itens'}</span>
              </span>
            ) : (
              <MoneyInput
                value={deal.amountCents}
                onChange={(cents) => void onPatch({ amountCents: cents, updateAmount: false })}
                aria-label="Valor do negócio"
                className="w-32 h-7 text-xs py-1"
              />
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <span className="text-surface-500">Dono</span>
          <UserPicker
            open={ownerPickerOpen}
            onClose={() => setOwnerPickerOpen(false)}
            users={users}
            selectedUserId={owner?.id}
            onSelect={handleOwnerSelect}
            anchor={
              <button
                type="button"
                onClick={() => setOwnerPickerOpen((v) => !v)}
                data-testid="deal-owner"
                className="inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity"
              >
                {owner ? (
                  <>
                    <Avatar name={`${owner.firstName} ${owner.lastName}`} size="xs" />
                    <span className="text-surface-200 font-medium">{owner.firstName} {owner.lastName}</span>
                  </>
                ) : (
                  <span className="text-surface-500 italic">sem dono</span>
                )}
              </button>
            }
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-surface-500" />
          <input
            type="date"
            aria-label="Previsão de fechamento"
            data-testid="deal-expected-close"
            value={deal.expectedCloseAt ? deal.expectedCloseAt.slice(0, 10) : ''}
            onChange={(e) => void handleExpectedCloseChange(e.target.value)}
            className="bg-transparent text-surface-200 text-xs outline-none border-b border-transparent hover:border-surface-700 focus:border-brand-500 transition-colors"
          />
        </div>

        {isSales && (
          <div className="flex items-center gap-1.5" data-testid="deal-probability">
            <Percent className="w-3.5 h-3.5 text-surface-500" />
            {probEditing ? (
              <input
                autoFocus
                type="number"
                min={0}
                max={100}
                value={probDraft}
                onChange={(e) => setProbDraft(e.target.value)}
                onBlur={handleProbabilitySave}
                onKeyDown={(e) => { if (e.key === 'Enter') handleProbabilitySave(); if (e.key === 'Escape') setProbEditing(false) }}
                className="w-14 bg-surface-800 border border-brand-500/50 rounded px-1.5 py-0.5 text-xs text-surface-100"
              />
            ) : (
              <button
                type="button"
                onClick={() => { setProbDraft(deal.probability != null ? String(deal.probability) : ''); setProbEditing(true) }}
                className="text-surface-200 hover:text-brand-300 transition-colors"
                title={deal.probability != null ? 'Override deste negócio' : 'Herdada da etapa — clique para sobrescrever'}
              >
                {prob.effective != null ? `${prob.effective}%` : '— não configurada'}
                {deal.probability != null && <span className="text-surface-500"> (override)</span>}
              </button>
            )}
          </div>
        )}

        {isSales && prob.configured && (
          <span className="text-surface-500" title="Valor × probabilidade efetiva">
            ponderado {formatBRL(prob.weightedAmountCents)}
          </span>
        )}
      </div>

      {/* Linha 4 — origem + último movimento */}
      <p className="text-[11px] text-surface-500 flex items-center gap-1.5" data-testid="deal-origin">
        <origin.icon className="w-3 h-3" /> {origin.label}
        {lastMovedLabel && <> · movido por {lastMovedLabel}</>}
        {deal.updatedAt && <> · {formatRelativeTime(deal.updatedAt)}</>}
      </p>

      {/* Linha 5 — ações */}
      <div className="flex items-center gap-2">
        <Dropdown
          open={moveOpen}
          onClose={() => setMoveOpen(false)}
          align="left"
          className="w-56"
          anchor={
            <button
              type="button"
              onClick={() => setMoveOpen((v) => !v)}
              disabled={deal.status !== 'open' || targets.normal.length === 0}
              data-testid="deal-move-button"
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium bg-surface-800 border border-surface-700 text-surface-200 hover:bg-surface-700 disabled:opacity-40 transition-colors"
            >
              Mover <ChevronDown className="w-3 h-3" />
            </button>
          }
        >
          <div className="px-1 py-1 flex flex-col gap-0.5">
            {targets.normal.map((s) => (
              <DropdownItem key={s.id} onClick={() => { setMoveOpen(false); onMoveToStage(s) }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} /> {s.label}
              </DropdownItem>
            ))}
          </div>
        </Dropdown>

        {deal.status === 'open' && wonStage && (
          <button
            type="button"
            onClick={() => onMoveToStage(wonStage)}
            data-testid="deal-mark-won"
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium text-status-active hover:bg-status-active-bg transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Marcar {labels.won.toLowerCase()}
          </button>
        )}
        {deal.status === 'open' && lostStage && (
          <button
            type="button"
            onClick={() => onMoveToStage(lostStage)}
            data-testid="deal-mark-lost"
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium text-surface-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" /> Marcar {labels.lost.toLowerCase()}
          </button>
        )}

        <Dropdown
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          align="right"
          className="w-52"
          anchor={
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              title="Mais ações"
              data-testid="deal-more-button"
              className="ml-auto p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-all"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          }
        >
          <div className="px-1 py-1 flex flex-col gap-0.5">
            <DropdownItem onClick={() => { setMoreOpen(false); setTransferOpen(true) }} disabled={otherPipelines.length === 0}>
              <ArrowRightLeft className="w-3.5 h-3.5" /> Transferir de funil
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem onClick={() => { setMoreOpen(false); setConfirmDelete(true) }} danger>
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </DropdownItem>
          </div>
        </Dropdown>
      </div>

      <TransferPipelineModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        pipelines={otherPipelines}
        onConfirm={onTransferPipeline}
      />

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); onDelete() }}
        title="Excluir negócio"
        description={`Tem certeza que deseja excluir "${deal.title}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        danger
      />
    </div>
  )
}

/** Modal simples (não Dropdown) de propósito — evita o bug de ancorar um
 *  popover a um item de OUTRO menu que já fechou (posição instável). */
function TransferPipelineModal({
  open, onClose, pipelines, onConfirm,
}: {
  open: boolean
  onClose: () => void
  pipelines: Pipeline[]
  onConfirm: (pipelineId: string) => void
}) {
  const [pipelineId, setPipelineId] = useState('')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Transferir para outro funil"
      className="max-w-sm"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            type="button"
            variant="primary"
            disabled={!pipelineId}
            onClick={() => { if (pipelineId) { onConfirm(pipelineId); setPipelineId('') } }}
          >
            Transferir
          </Button>
        </div>
      }
    >
      <Select value={pipelineId} onChange={(e) => setPipelineId(e.target.value)} aria-label="Funil de destino">
        <option value="">Escolha o funil…</option>
        {pipelines.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </Select>
    </Modal>
  )
}
