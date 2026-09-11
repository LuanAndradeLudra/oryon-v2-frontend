import { useState, useEffect, useCallback } from 'react'
import { Route } from 'lucide-react'
import { Switch } from '@/components/ui/Switch'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/hooks/useToast'
import { pipelineRoutingApi, pipelinesApi, whatsappNumbersApi, usersApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminTier } from '@/lib/roleHelpers'
import { getActivePipelines } from '@/lib/utils'
import type { Pipeline, PipelineChannelRouting, WhatsAppNumber, User, OwnerRule } from '@/types'

/** Estado de edição de uma linha — sempre alinhado com a rota salva (ou os defaults, se não houver). */
interface RowDraft {
  pipelineId: string
  autoCreateDeal: boolean
  defaultStageId: string
  ownerRule: OwnerRule
  ownerUserId: string
}

function draftFromRouting(routing: PipelineChannelRouting | undefined, defaultPipelineId: string): RowDraft {
  return {
    pipelineId: routing?.pipelineId ?? defaultPipelineId,
    autoCreateDeal: routing?.autoCreateDeal ?? false,
    defaultStageId: routing?.defaultStageId ?? '',
    ownerRule: routing?.ownerRule ?? 'unassigned',
    ownerUserId: routing?.ownerUserId ?? '',
  }
}

const OWNER_RULE_LABELS: Record<OwnerRule, string> = {
  unassigned: 'Sem dono (fila)',
  conversation_assignee: 'Atendente da conversa',
  fixed_user: 'Usuário fixo',
}

export function PipelineRoutingSettings() {
  const { toast } = useToast()
  const { user: actor } = useAuth()
  // Espelha @Roles(ADMIN, BUSINESS_ADMIN) na escrita de /settings/pipeline-routing.
  // GET é aberto, mas configurar/remover roteamento fica só p/ admin.
  const canManage = isAdminTier(actor?.role)

  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [routings, setRoutings] = useState<PipelineChannelRouting[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const fetchAll = useCallback(() => {
    setLoading(true)
    Promise.all([
      whatsappNumbersApi.list().then((r) => r.data).catch(() => []),
      pipelinesApi.list().then((r) => r.data).catch(() => []),
      pipelineRoutingApi.list().then((r) => r.data).catch(() => []),
      usersApi.list().then((r) => r.data).catch(() => []),
    ]).then(([nums, pipes, routes, us]) => {
      setNumbers(nums)
      setPipelines(pipes)
      setRoutings(routes)
      setUsers(us)
      const defaultPipelineId = pipes.find((p) => p.isDefault)?.id ?? pipes[0]?.id ?? ''
      const nextDrafts: Record<string, RowDraft> = {}
      for (const n of nums) {
        const routing = routes.find((r) => r.whatsappNumberId === n.id)
        nextDrafts[n.id] = draftFromRouting(routing, defaultPipelineId)
      }
      setDrafts(nextDrafts)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateDraft = (numberId: string, patch: Partial<RowDraft>) => {
    setDrafts((prev) => ({ ...prev, [numberId]: { ...prev[numberId], ...patch } }))
  }

  const handleSave = async (numberId: string) => {
    const draft = drafts[numberId]
    if (!draft?.pipelineId) {
      toast('Selecione um pipeline antes de salvar.', 'error')
      return
    }
    if (draft.ownerRule === 'fixed_user' && !draft.ownerUserId) {
      toast('Selecione o usuário fixo antes de salvar.', 'error')
      return
    }
    setSaving(numberId)
    try {
      const { data } = await pipelineRoutingApi.upsert(numberId, {
        pipelineId: draft.pipelineId,
        autoCreateDeal: draft.autoCreateDeal,
        defaultStageId: draft.defaultStageId || null,
        ownerRule: draft.ownerRule,
        ownerUserId: draft.ownerRule === 'fixed_user' ? draft.ownerUserId : null,
      })
      setRoutings((prev) => [...prev.filter((r) => r.whatsappNumberId !== numberId), data])
      toast('Roteamento salvo.', 'success')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Erro ao salvar roteamento.', 'error')
    } finally {
      setSaving(null)
    }
  }

  const handleRemove = async (numberId: string) => {
    setRemoving(numberId)
    try {
      await pipelineRoutingApi.remove(numberId)
      setRoutings((prev) => prev.filter((r) => r.whatsappNumberId !== numberId))
      const defaultPipelineId = pipelines.find((p) => p.isDefault)?.id ?? pipelines[0]?.id ?? ''
      setDrafts((prev) => ({ ...prev, [numberId]: draftFromRouting(undefined, defaultPipelineId) }))
      toast('Roteamento removido — a linha volta a usar o pipeline default.', 'success')
    } catch {
      toast('Erro ao remover roteamento.', 'error')
    } finally {
      setRemoving(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-surface-500 text-center py-10">Carregando…</p>
  }

  return (
    <>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-surface-100">Roteamento por canal</h3>
        <p className="text-xs text-surface-500 mt-0.5">
          Define em qual pipeline um negócio é auto-criado quando chega mensagem em cada linha WhatsApp.
          Linhas sem roteamento configurado usam o pipeline default do tenant e não criam negócio automaticamente.
        </p>
      </div>

      {numbers.length === 0 ? (
        <p className="text-sm text-surface-500 text-center py-10">Nenhuma linha WhatsApp conectada.</p>
      ) : (
        <div className="space-y-3">
          {numbers.map((n) => {
            const draft = drafts[n.id]
            if (!draft) return null
            const hasRouting = routings.some((r) => r.whatsappNumberId === n.id)
            const selectedPipeline = pipelines.find((p) => p.id === draft.pipelineId)
            const stages = selectedPipeline?.stages ?? []
            // Seletor só oferece funis ativos — mas se a rota já salva aponta pra
            // um funil que foi arquivado depois, mantém ele visível (marcado) pra
            // não quebrar a linha silenciosamente; só some quando o usuário troca.
            const pipelineOptions = selectedPipeline?.isArchived
              ? [...getActivePipelines(pipelines), selectedPipeline]
              : getActivePipelines(pipelines)

            return (
              <div
                key={n.id}
                className="bg-surface-900 border border-surface-800 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Route className="w-4 h-4 text-surface-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-surface-100">{n.label || n.displayPhoneNumber}</span>
                  <span className="text-xs text-surface-500">{n.displayPhoneNumber}</span>
                  {hasRouting && (
                    <span className="text-[10px] text-brand-400 bg-brand-900/20 border border-brand-800/50 px-1.5 py-0.5 rounded-full ml-auto">
                      Roteado
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] text-surface-500 mb-1 block">Pipeline</label>
                    <Select
                      value={draft.pipelineId}
                      disabled={!canManage}
                      onChange={(e) => updateDraft(n.id, { pipelineId: e.target.value, defaultStageId: '' })}
                    >
                      {pipelineOptions.length === 0 && <option value="">Nenhum pipeline</option>}
                      {pipelineOptions.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}{p.isDefault ? ' (default)' : ''}{p.isArchived ? ' (arquivado)' : ''}</option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="text-[11px] text-surface-500 mb-1 block">Estágio inicial</label>
                    <Select
                      value={draft.defaultStageId}
                      disabled={!canManage}
                      onChange={(e) => updateDraft(n.id, { defaultStageId: e.target.value })}
                    >
                      <option value="">Primeiro estágio do pipeline</option>
                      {stages
                        .filter((s) => !s.isWon && !s.isLost)
                        .sort((a, b) => a.order - b.order)
                        .map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                    </Select>
                  </div>

                  <div>
                    <label className="text-[11px] text-surface-500 mb-1 block">Dono do negócio</label>
                    <Select
                      value={draft.ownerRule}
                      disabled={!canManage}
                      onChange={(e) => updateDraft(n.id, { ownerRule: e.target.value as OwnerRule })}
                    >
                      {(Object.keys(OWNER_RULE_LABELS) as OwnerRule[]).map((rule) => (
                        <option key={rule} value={rule}>{OWNER_RULE_LABELS[rule]}</option>
                      ))}
                    </Select>
                  </div>

                  {draft.ownerRule === 'fixed_user' ? (
                    <div>
                      <label className="text-[11px] text-surface-500 mb-1 block">Usuário</label>
                      <Select
                        value={draft.ownerUserId}
                        disabled={!canManage}
                        onChange={(e) => updateDraft(n.id, { ownerUserId: e.target.value })}
                      >
                        <option value="">Selecione…</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                        ))}
                      </Select>
                    </div>
                  ) : (
                    <div className="flex items-end gap-2 pb-2">
                      <Switch
                        checked={draft.autoCreateDeal}
                        onChange={() => updateDraft(n.id, { autoCreateDeal: !draft.autoCreateDeal })}
                        disabled={!canManage}
                      />
                      <span className="text-xs text-surface-400">Auto-criar negócio no 1º contato</span>
                    </div>
                  )}
                </div>

                {draft.ownerRule === 'fixed_user' && (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={draft.autoCreateDeal}
                      onChange={() => updateDraft(n.id, { autoCreateDeal: !draft.autoCreateDeal })}
                      disabled={!canManage}
                    />
                    <span className="text-xs text-surface-400">Auto-criar negócio no 1º contato</span>
                  </div>
                )}

                {canManage && (
                  <div className="flex items-center gap-2 justify-end pt-1">
                    {hasRouting && (
                      <button
                        onClick={() => handleRemove(n.id)}
                        disabled={removing === n.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-surface-400 hover:text-red-400 hover:bg-red-900/20 transition-all disabled:opacity-50"
                      >
                        {removing === n.id ? 'Removendo…' : 'Remover roteamento'}
                      </button>
                    )}
                    <button
                      onClick={() => handleSave(n.id)}
                      disabled={saving === n.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-surface-950 transition-all disabled:opacity-50"
                    >
                      {saving === n.id ? 'Salvando…' : 'Salvar'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
