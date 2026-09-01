import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { useMultiPipeline } from '@/hooks/useMultiPipeline'
import { dealsApi, contactsApi } from '@/services/api'
import { getDefaultPipeline, getPipelineStages, getApiErrorMessage, getActivePipelines } from '@/lib/utils'
import { pipelineKindOf, pipelineNoun } from '@/lib/pipelineKinds'
import { formatBRL } from '@/utils/money'
import { DealItemsEditor } from '@/components/deals/DealItemsEditor'
import {
  draftFromLineItem,
  itemsTotalCents,
  toLineItemPayload,
  validateItems,
  type DealItemDraft,
} from '@/components/deals/dealItems'
import type { Deal, Pipeline } from '@/types'

interface DealModalProps {
  open: boolean
  contactId: string
  editDeal?: Deal | null
  /** Funis de negócio do tenant — obrigatório escolher ao criar (spec:
   *  "selecionar obrigatoriamente em qual funil"). Não editável num negócio
   *  já existente por aqui (o funil do deal não muda por este quick-edit). */
  pipelines: Pipeline[]
  onClose: () => void
  onSaved: () => void
  /** F8 (SCRUM-873): nome do contato para pré-preencher o título em funil de processo. Omitido = busca `GET /contacts/:id`. */
  contactName?: string | null
  /** F9 (SCRUM-874): funil pré-selecionado ("Adicionar ao funil" em funil de venda). */
  initialPipelineId?: string | null
  /** F9 (SCRUM-874): conversa de origem — o registro nasce ligado a ela. */
  originConversationId?: string | null
  /** F9 (SCRUM-877): `409 open_exists` na criação → o chamador abre o modal de conflito. Sem isto, vira mensagem no formulário. */
  onConflict?: (info: { openDealId: string; pipelineId: string }) => void
}

export function DealModal({ open, contactId, editDeal, pipelines, onClose, onSaved, contactName, initialPipelineId, originConversationId, onConflict }: DealModalProps) {
  const { vocab } = useTenantVocab()
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  // A1 (SCRUM-153): a composição do negócio virou um componente próprio
  // (`DealItemsEditor`), que a A3/SCRUM-925 também embute no "Novo negócio".
  const [items, setItems] = useState<DealItemDraft[]>([])
  const multiPipeline = useMultiPipeline()
  const [pipelineId, setPipelineId] = useState('')
  const [pipelineStageId, setPipelineStageId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // "Mover para funil" (SCRUM-293) — ação independente do Salvar: troca o
  // pipeline de um deal ABERTO já existente, algo que o create/edit normal
  // nunca permitiu (funil era imutável fora da criação).
  const [movePipelineId, setMovePipelineId] = useState('')
  const [moving, setMoving] = useState(false)
  const [moveError, setMoveError] = useState('')
  // F8 (SCRUM-873): funil de PROCESSO não tem itens/valor e o título é o
  // contato (decisão (a): o card é o "registro" do contato). O tipo vem do
  // funil escolhido (create) ou do funil do registro (edit).
  const effectivePipeline = pipelines.find((p) => p.id === (editDeal?.pipelineId ?? pipelineId)) ?? null
  const isProcess = pipelineKindOf(effectivePipeline) === 'process'
  const [resolvedContactName, setResolvedContactName] = useState<string | null>(null)
  useEffect(() => {
    if (!open || editDeal || !isProcess) return
    if (contactName) { setResolvedContactName(contactName); return }
    let cancelled = false
    contactsApi.get(contactId)
      .then((res) => { if (!cancelled) setResolvedContactName(res.data?.displayName ?? null) })
      .catch(() => { /* sem nome, o usuário digita o título */ })
    return () => { cancelled = true }
  }, [open, editDeal, isProcess, contactName, contactId])
  useEffect(() => {
    if (open && !editDeal && isProcess && resolvedContactName && !title.trim()) setTitle(resolvedContactName)
    // `title` fora das deps de propósito: só pré-preenche quando está vazio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editDeal, isProcess, resolvedContactName])

  useEffect(() => {
    if (open) {
      setTitle(editDeal?.title ?? '')
      setNote(editDeal?.note ?? '')
      setItems(editDeal?.lineItems?.map(draftFromLineItem) ?? [])
      setError('')
      setMovePipelineId('')
      setMoveError('')
      // Sempre reseta pipelineId aqui — o modal nunca desmonta entre
      // aberturas (renderizado incondicionalmente pelo pai), então sem este
      // reset explícito o funil de um `editDeal` anterior vazava para a
      // sessão de criação seguinte no mesmo contato.
      setPipelineId(editDeal?.pipelineId ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editDeal])

  // Preenche o funil default assim que `pipelines` chegar, caso o modal já
  // tenha sido aberto antes do fetch resolver (mesma corrida corrigida em
  // NewContactDrawer/ImportContactsDrawer).
  useEffect(() => {
    if (open && !editDeal && !pipelineId && pipelines.length > 0) {
      const preset = initialPipelineId && pipelines.some((p) => p.id === initialPipelineId) ? initialPipelineId : null
      setPipelineId(preset ?? getDefaultPipeline(pipelines)?.id ?? '')
    }
  }, [open, editDeal, pipelines, pipelineId, initialPipelineId])

  // "Etapa do funil" — eixo distinto da "Situação do contato" (ciclo de
  // vida, seletor "Mover contato para" abaixo). Reativo à troca de funil: se
  // o estágio selecionado não existe mais no funil atual (trocou de funil,
  // ou é a primeira carga), recai pro 1º estágio não-terminal dele. Só se
  // aplica ao create — um deal existente não tem esse seletor.
  useEffect(() => {
    if (editDeal) return
    const opts = getPipelineStages(pipelines, pipelineId)
    if (!opts.some((s) => s.id === pipelineStageId)) {
      setPipelineStageId(opts[0]?.id ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editDeal, pipelineId, pipelines])

  const total = itemsTotalCents(items)
  // O formulário tem um `error` só; este recorte diz quais mensagens pertencem
  // à lista de itens, para o erro aparecer junto dela e não no topo do modal.
  const itemsFieldError = validateItems(items) === error && error ? error : undefined

  const handleSave = async () => {
    if (!title.trim()) {
      setError('O título é obrigatório.')
      return
    }
    // Gate de múltiplos funis (SCRUM-498): sem o flag não há campo "Funil"
    // nem `pipelineId`/`stageId` no POST — o backend legado rejeita campos
    // fora da whitelist (400).
    if (!editDeal && multiPipeline && !pipelineId) {
      setError('Selecione um funil.')
      return
    }
    // A1 (SCRUM-153): a validação da lista mora com o componente — item de
    // catálogo precisa de produto, item personalizado de nome e preço > 0.
    const itemsError = isProcess ? null : validateItems(items)
    if (itemsError) {
      setError(itemsError)
      return
    }
    setSaving(true)
    try {
      // Funil de processo não tem itens (F8-873) — mesmo que o usuário tenha
      // trocado de um funil de venda com itens rascunhados.
      const lineItems = toLineItemPayload(isProcess ? [] : items)
      if (editDeal) {
        await dealsApi.update(editDeal.id, {
          title: title.trim(),
          note: note.trim() || undefined,
          lineItems,
        })
      } else {
        await dealsApi.create({
          contactId,
          title: title.trim(),
          note: note.trim() || undefined,
          lineItems,
          ...(multiPipeline && { pipelineId, stageId: pipelineStageId || undefined }),
          ...(originConversationId ? { originConversationId } : {}),
        })
      }
      onSaved()
    } catch (e: unknown) {
      // F9 (SCRUM-877): conflito I1 vira o modal de conflito de quem chamou.
      const err = e as { response?: { status?: number; data?: { code?: string; openDealId?: string; pipelineId?: string } } }
      const body = err?.response?.data
      if (!editDeal && onConflict && err?.response?.status === 409 && body?.code === 'open_exists' && body.openDealId) {
        onConflict({ openDealId: body.openDealId, pipelineId: body.pipelineId ?? pipelineId })
        return
      }
      setError(getApiErrorMessage(e, 'Erro ao salvar.'))
    } finally {
      setSaving(false)
    }
  }

  const handleMovePipeline = async () => {
    if (!editDeal || !movePipelineId) return
    setMoving(true)
    setMoveError('')
    try {
      await dealsApi.movePipeline(editDeal.id, movePipelineId)
      onSaved()
    } catch (e: unknown) {
      // 409 do backend já vem com mensagem clara ("Este contato já tem um
      // negócio aberto no funil de destino.") — só repassa.
      setMoveError(getApiErrorMessage(e, 'Erro ao mover para o funil.'))
    } finally {
      setMoving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editDeal
        ? `Editar ${isProcess ? pipelineNoun(effectivePipeline) : vocab.deal.toLowerCase()}`
        : `Novo ${isProcess ? pipelineNoun(effectivePipeline) : vocab.deal.toLowerCase()}`}
      className="max-w-2xl"
    >
      <div className="flex flex-col gap-4">
        <FormField label="Título" required error={error === 'O título é obrigatório.' ? error : undefined}>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setError('')
            }}
            placeholder="Ex: Proposta — Plano Anual"
            autoFocus
          />
        </FormField>

        {/* Mover para funil (SCRUM-293) — só p/ deal ABERTO já existente; ação
            própria, imediata, independente do "Salvar" abaixo. */}
        {multiPipeline && editDeal && editDeal.status === 'open' && (
          <FormField
            label="Mover para funil"
            error={moveError}
            hint={getActivePipelines(pipelines).length <= 1 ? 'Nenhum outro funil disponível pra mover.' : undefined}
          >
            <div className="flex gap-2">
              <div className="flex-1">
                <Select
                  value={movePipelineId}
                  onChange={(e) => { setMovePipelineId(e.target.value); setMoveError('') }}
                  disabled={moving}
                >
                  <option value="">— selecionar funil de destino —</option>
                  {getActivePipelines(pipelines).filter((p) => p.id !== editDeal.pipelineId).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}{p.isDefault ? ' (padrão)' : ''}</option>
                  ))}
                </Select>
              </div>
              <button
                type="button"
                onClick={handleMovePipeline}
                disabled={!movePipelineId || moving}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-surface-700 hover:bg-surface-600 text-surface-200 disabled:opacity-50 transition-all whitespace-nowrap"
              >
                {moving ? 'Movendo...' : 'Mover'}
              </button>
            </div>
          </FormField>
        )}

        {/* A4 (SCRUM-926): o seletor de Status saiu daqui. Fechar um negócio
            é ação própria — arrastar para a coluna terminal no board, ou
            "Mover ▾ → Ganho/Perdido" na ficha/painel/aba — e passa pelo modal
            de motivo. Como campo de formulário, "Status: Ganho" fechava sem
            motivo nenhum, escondido atrás de um "Salvar" (e o backend agora
            responde 400 nesse caminho). Reabrir, que também morava aqui, mudou
            para a linha do registro fechado. */}
        {!editDeal && multiPipeline && (
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Funil" required error={error === 'Selecione um funil.' ? error : undefined}>
              <Select value={pipelineId} onChange={(e) => { setPipelineId(e.target.value); setError('') }}>
                {getActivePipelines(pipelines).length === 0 && <option value="">Nenhum funil disponível</option>}
                {getActivePipelines(pipelines).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.isDefault ? ' (padrão)' : ''}</option>
                ))}
              </Select>
            </FormField>
            {/* Etapa do FUNIL — eixo distinto da "Situação do contato" (ciclo
                de vida). Reativo ao funil escolhido ao lado. */}
            <FormField label="Estágio do funil" hint="Coluna do board em que o negócio nasce.">
              <Select value={pipelineStageId} onChange={(e) => setPipelineStageId(e.target.value)}>
                {getPipelineStages(pipelines, pipelineId).length === 0 && (
                  <option value="">Nenhum estágio disponível</option>
                )}
                {getPipelineStages(pipelines, pipelineId).map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </Select>
            </FormField>
          </div>
        )}

        {/* A1 (SCRUM-153): itens do negócio — dois botões (catálogo ×
            personalizado) e desconto espelhado R$↔%. Só em funil de VENDA: em
            processo não há valor nem composição (F8-873). O mesmo componente é
            embutido no passo 2 do "Novo negócio" (A3 · SCRUM-925). */}
        {!isProcess && (
        <FormField label="Itens">
          <DealItemsEditor
            value={items}
            onChange={(next) => { setItems(next); setError('') }}
            error={itemsFieldError}
            disabled={saving}
            showTotal={false}
          />
        </FormField>
        )}

        <FormField label="Observação (opcional)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Detalhes da proposta" />
        </FormField>

        <div className="flex items-center justify-between border-t border-surface-800 pt-3">
          {isProcess ? (
            <span className="text-xs text-surface-500" data-testid="deal-modal-process-note">
              {`Registro de processo — sem valor nem produtos.`}
            </span>
          ) : (
          <span className="text-sm font-semibold text-surface-100">
            Total: <span className="tabular-nums">{formatBRL(total)}</span>
          </span>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-800 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-500 text-surface-950 disabled:opacity-60 transition-all"
            >
              {saving ? 'Salvando...' : editDeal ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
