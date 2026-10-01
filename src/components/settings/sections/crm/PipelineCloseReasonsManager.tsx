import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, GripVertical, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { useToast } from '@/hooks/useToast'
import { useDragReorder } from '@/hooks/useDragReorder'
import { pipelinesApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminTier } from '@/lib/roleHelpers'
import { getApiErrorMessage, cn } from '@/lib/utils'
import type { Pipeline, PipelineCloseReason } from '@/types'

interface PipelineCloseReasonsManagerProps {
  pipeline: Pipeline
  /** Refaz o fetch do funil selecionado — o interruptor do campo livre mora
   *  na própria linha do pipeline (`allowFreeCloseReason`). */
  onChanged: () => void
}

const OUTCOME_LABEL: Record<'won' | 'lost' | 'any', string> = {
  won: 'Ganho', lost: 'Perdido', any: 'Qualquer',
}

/** CRUD dos motivos de desfecho (D0-8) — o catálogo é compartilhado por todo
 *  funil do MESMO `kind` do tenant (§4.6: "todo funil sales compartilha o
 *  mesmo catálogo"), então uma mudança aqui afeta todos os funis desse tipo,
 *  não só o selecionado. `allowFreeCloseReason`, ao contrário, é POR funil. */
export function PipelineCloseReasonsManager({ pipeline, onChanged }: PipelineCloseReasonsManagerProps) {
  const { toast } = useToast()
  const { user: actor } = useAuth()
  const canManage = isAdminTier(actor?.role)
  const kind = pipeline.kind ?? 'sales'

  const [reasons, setReasons] = useState<PipelineCloseReason[] | null>(null)
  const [creating, setCreating] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newOutcome, setNewOutcome] = useState<'won' | 'lost' | 'any'>('lost')
  const [savingCreate, setSavingCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editOutcome, setEditOutcome] = useState<'won' | 'lost' | 'any'>('lost')
  const [savingFreeToggle, setSavingFreeToggle] = useState(false)

  const load = useCallback(() => {
    pipelinesApi.manageCloseReasons(kind).then((res) => setReasons(res.data)).catch(() => setReasons([]))
  }, [kind])

  useEffect(() => { setReasons(null); load() }, [load])

  const sorted = (reasons ?? []).slice().sort((a, b) => a.order - b.order)

  const { overIdx, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragReorder(
    sorted,
    async (reordered) => {
      setReasons(reordered)
      try {
        await pipelinesApi.reorderCloseReasons(kind, reordered.map((r) => r.id))
      } catch {
        toast('Erro ao reordenar. Recarregando...', 'error')
        load()
      }
    },
  )

  const handleCreate = async () => {
    if (!newLabel.trim()) return
    setSavingCreate(true)
    try {
      await pipelinesApi.createCloseReason({ kind, label: newLabel.trim(), outcome: newOutcome })
      toast('Motivo criado.', 'success')
      setNewLabel('')
      setNewOutcome('lost')
      setCreating(false)
      load()
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Erro ao criar motivo.'), 'error')
    } finally {
      setSavingCreate(false)
    }
  }

  const startEdit = (r: PipelineCloseReason) => {
    setEditingId(r.id)
    setEditLabel(r.label)
    setEditOutcome(r.outcome)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editLabel.trim()) return
    try {
      await pipelinesApi.updateCloseReason(editingId, { label: editLabel.trim(), outcome: editOutcome })
      toast('Motivo atualizado.', 'success')
      setEditingId(null)
      load()
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Erro ao atualizar motivo.'), 'error')
    }
  }

  const handleToggleActive = async (r: PipelineCloseReason) => {
    setReasons((prev) => (prev ?? []).map((x) => (x.id === r.id ? { ...x, active: !x.active } : x)))
    try {
      await pipelinesApi.updateCloseReason(r.id, { active: !r.active })
      toast(r.active ? 'Motivo desativado.' : 'Motivo ativado.', 'success')
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Erro ao atualizar motivo.'), 'error')
      load()
    }
  }

  const handleToggleFree = async (checked: boolean) => {
    setSavingFreeToggle(true)
    try {
      await pipelinesApi.update(pipeline.id, { allowFreeCloseReason: checked })
      toast(checked ? 'Campo livre ativado.' : 'Campo livre desativado.', 'success')
      onChanged()
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Erro ao atualizar o interruptor do motivo livre.'), 'error')
    } finally {
      setSavingFreeToggle(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-surface-500">
        Motivos de {kind === 'sales' ? 'Ganho/Perdido' : 'Concluído/Cancelado'} compartilhados por todo funil de{' '}
        {kind === 'sales' ? 'vendas' : 'processo'} do tenant. Desativar um motivo o tira dos modais de fechamento
        sem apagar o histórico de negócios já fechados com ele.
      </p>

      <div className="border-y border-surface-700">
        {reasons === null ? (
          <p className="text-sm text-surface-500 text-center py-10">Carregando…</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-surface-500 text-center py-10">Nenhum motivo configurado.</p>
        ) : (
          <ul className="divide-y divide-surface-700">
            {sorted.map((r, idx) => (
              <li
                key={r.id}
                draggable={canManage && editingId !== r.id}
                onDragStart={canManage ? () => handleDragStart(idx) : undefined}
                onDragOver={canManage ? (e) => handleDragOver(e, idx) : undefined}
                onDrop={canManage ? () => handleDrop(idx) : undefined}
                onDragEnd={canManage ? handleDragEnd : undefined}
                className={cn(
                  'flex items-center gap-3 px-1 py-3 transition-all duration-200',
                  overIdx === idx ? 'bg-brand-500/10 border-l-2 border-brand-500' : '',
                  !r.active && 'opacity-50',
                )}
              >
                <GripVertical className={cn('w-4 h-4 flex-shrink-0', canManage ? 'text-surface-600 cursor-grab' : 'text-surface-700')} />

                {editingId === r.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      size="sm"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      autoFocus
                      className="flex-1 min-w-0"
                    />
                    <SelectMenu size="sm" aria-label="Resultado do motivo" value={editOutcome} onChange={(e) => setEditOutcome(e.target.value as typeof editOutcome)} className="w-32">
                      <option value="won">Ganho</option>
                      <option value="lost">Perdido</option>
                      <option value="any">Qualquer</option>
                    </SelectMenu>
                    <button onClick={handleSaveEdit} className="p-1.5 rounded-xs text-accent-dark hover:bg-[var(--rowhover)]">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 rounded-xs text-surface-400 hover:bg-[var(--rowhover)]">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="text-sm font-medium text-surface-100">{r.label}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-xs bg-[var(--sf2)] border border-surface-700 text-surface-400">
                        {OUTCOME_LABEL[r.outcome]}
                      </span>
                      <span className="text-[11px] text-surface-600 font-mono">{r.key}</span>
                    </div>
                    {canManage && (
                      <button onClick={() => startEdit(r)} className="p-1.5 rounded-xs text-surface-400 hover:text-surface-100 hover:bg-[var(--rowhover)] transition-all">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <Switch checked={r.active} onChange={() => handleToggleActive(r)} disabled={!canManage} aria-label={`Motivo ${r.label} ativo`} />
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {canManage && (
        creating ? (
          <div className="flex items-center gap-2">
            <Input
              size="sm"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Nome do motivo"
              autoFocus
              className="flex-1 min-w-0"
            />
            <SelectMenu size="sm" aria-label="Resultado do motivo" value={newOutcome} onChange={(e) => setNewOutcome(e.target.value as typeof newOutcome)} className="w-32">
              <option value="won">Ganho</option>
              <option value="lost">Perdido</option>
              <option value="any">Qualquer</option>
            </SelectMenu>
            <Button size="sm" variant="primary" onClick={handleCreate} disabled={savingCreate || !newLabel.trim()}>
              {savingCreate ? 'Salvando...' : 'Adicionar'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setCreating(false); setNewLabel('') }}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="neutral" className="self-start" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setCreating(true)}>
            Novo motivo
          </Button>
        )
      )}

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-surface-700">
        <div>
          <p className="text-sm font-medium text-surface-200">Permitir motivo livre neste funil</p>
          <p className="text-xs text-surface-500 mt-0.5">
            Com o campo ligado, quem fecha o negócio pode digitar um texto livre ao lado da lista — gravado como
            "Outro" com a nota completa preservada.
          </p>
        </div>
        <Switch checked={!!pipeline.allowFreeCloseReason} onChange={handleToggleFree} disabled={!canManage || savingFreeToggle} aria-label="Permitir motivo livre neste funil" />
      </div>

    </div>
  )
}
