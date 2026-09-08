import { useState, useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { dealsApi } from '@/services/api'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { useDealPanel } from '@/contexts/DealPanelContext'
import { useToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/lib/utils'
import { pipelineKindOf } from '@/lib/pipelineKinds'
import { getActivePipelines } from '@/lib/utils'
import { PipelineConflictModal, type ConflictChoice } from '@/components/deals/PipelineConflictModal'
import { CloseDealReasonModal, type CloseDealReasonInput } from '@/components/deals/CloseDealReasonModal'
import { NewDealDialog } from '@/components/deals/NewDealDialog'
import type { Deal, Pipeline, PipelineStage } from '@/types'

/** O que "Adicionar ao funil" precisa saber, de qualquer superfície (conversa · ficha · tabela). */
export interface AddToPipelineTarget {
  contactId: string
  contactName: string
  pipeline: Pipeline
  /** Conversa de origem — o registro nasce ligado a ela (`originConversationId`, §4.7 passo 1). */
  conversationId?: string | null
}

interface ConflictState {
  target: AddToPipelineTarget
  openDealId: string
  existing: Deal | null
}

/** Forma do 409 de `POST /deals` (backend F9-877). */
function readConflict(e: unknown): { openDealId: string; pipelineId?: string } | null {
  const err = e as { response?: { status?: number; data?: { code?: string; openDealId?: string; pipelineId?: string } } }
  if (err?.response?.status !== 409) return null
  const body = err.response?.data
  if (body?.code === 'open_exists' && typeof body.openDealId === 'string') return { openDealId: body.openDealId, pipelineId: body.pipelineId }
  return null
}

/**
 * Fluxo "Adicionar ao funil" (F9 · SCRUM-874/875/877/879, pranchetas 3–4),
 * compartilhado pelas três superfícies. Regras:
 *   * funil de **processo** → cria o registro na hora (`POST /deals` com
 *     `originConversationId` quando vem da conversa) — sem "Novo negócio";
 *   * funil de **venda** → abre o `DealModal` (valor/itens opcionais);
 *   * `409 open_exists` (I1) → modal de conflito com três saídas: abrir o
 *     existente · mover para a 1ª etapa · fechar como Cancelado/Perdido com
 *     motivo e abrir um novo. Nada acontece em silêncio.
 *   * sucesso → toast com "Ver no board"; o chip do cabeçalho/painéis atualiza
 *     pelo socket `deal:changed` (backend publica `deal.created`), sem reload.
 *
 * Devolve `requestAdd` e `dialogs` — o chamador renderiza `dialogs` uma vez.
 */
export function useAddToPipeline(opts: { onCreated?: (deal: Deal) => void } = {}) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { pipelines } = useCRMConfig()
  const { openDeal } = useDealPanel()
  const [conflict, setConflict] = useState<ConflictState | null>(null)
  const [closeTarget, setCloseTarget] = useState<{ target: AddToPipelineTarget; existing: Deal; stage: PipelineStage } | null>(null)
  const [salesTarget, setSalesTarget] = useState<AddToPipelineTarget | null>(null)
  const [busy, setBusy] = useState(false)
  const { onCreated } = opts

  // D2 (SCRUM-935): o board mora em /pipelines/:id agora — link direto em vez
  // do antigo /contacts?pipeline= (que ainda funciona, mas só redireciona pra cá).
  const boardHref = (pipelineId: string) => `/pipelines/${pipelineId}`

  const announce = useCallback((deal: Deal, target: AddToPipelineTarget) => {
    const stage = target.pipeline.stages.find((s) => s.id === deal.stageId)
    toast(
      `${target.contactName} entrou em ${target.pipeline.name}${stage ? ` · ${stage.label}` : ''}.`,
      'success',
      { label: 'Ver no board', onClick: () => navigate(boardHref(target.pipeline.id)) },
    )
    onCreated?.(deal)
  }, [toast, navigate, onCreated])

  const createRecord = useCallback((target: AddToPipelineTarget) => dealsApi.create({
    contactId: target.contactId,
    title: target.contactName,
    pipelineId: target.pipeline.id,
    ...(target.conversationId ? { originConversationId: target.conversationId } : {}),
  }), [])

  /** Abre o modal de conflito e busca o registro existente para o resumo. */
  const openConflict = useCallback(async (target: AddToPipelineTarget, openDealId: string) => {
    setConflict({ target, openDealId, existing: null })
    try {
      const res = await dealsApi.get(openDealId)
      setConflict((prev) => (prev && prev.openDealId === openDealId ? { ...prev, existing: res.data } : prev))
    } catch {
      // Sem detalhe, as saídas continuam válidas — o modal só perde o resumo.
      setConflict((prev) => (prev && prev.openDealId === openDealId ? { ...prev, existing: { id: openDealId } as Deal } : prev))
    }
  }, [])

  /**
   * Segunda porta do "Adicionar ao funil ▾": abre o diálogo em vez de criar.
   *
   * O clique num funil continua criando em UM clique — numa clínica que põe
   * dezenas de pessoas por dia em "Confirmação de consulta", trocar isso por
   * um formulário seria piora. Mas quem precisa de título próprio, escopo,
   * dono ou previsão não tinha onde preencher: em processo o registro nascia
   * com o nome do contato como título e nada mais. Esta porta dá o formulário
   * a quem quer, sem tirar a velocidade de quem não quer.
   */
  const requestAddDetailed = useCallback((target: Omit<AddToPipelineTarget, 'pipeline'> & { pipeline?: Pipeline }) => {
    const fallback = target.pipeline ?? getActivePipelines(pipelines)[0]
    if (!fallback) { toast('Nenhum funil disponível.', 'error'); return }
    setSalesTarget({ ...target, pipeline: fallback })
  }, [pipelines, toast])

  const requestAdd = useCallback(async (target: AddToPipelineTarget) => {
    if (pipelineKindOf(target.pipeline) === 'sales') {
      // C2 (SCRUM-933): em funil com multiplicidade (C1 · SCRUM-932) o backend
      // NÃO devolve mais 409 — o segundo negócio nasceria em silêncio. O 409
      // era o que fazia o operador parar e decidir; sem ele, a pergunta passa
      // a ser nossa: outro negócio, ou é o mesmo que já está aberto? Só
      // perguntamos quando existe negócio aberto AQUI — o primeiro de todos
      // segue em um clique, como sempre foi.
      if (target.pipeline.allowMultipleOpen) {
        try {
          const all = (await dealsApi.list(target.contactId)).data
          const existing = (Array.isArray(all) ? all : []).find(
            (d) => d.status === 'open' && d.pipelineId === target.pipeline.id,
          )
          if (existing) {
            setConflict({ target, openDealId: existing.id, existing })
            return
          }
        } catch {
          // Sem a lista, seguir para o formulário é o comportamento antigo —
          // pior que perguntar, melhor que travar a criação por um GET.
        }
      }
      setSalesTarget(target)
      return
    }
    setBusy(true)
    try {
      const res = await createRecord(target)
      announce(res.data, target)
    } catch (e: unknown) {
      const c = readConflict(e)
      if (c) await openConflict(target, c.openDealId)
      else toast(getApiErrorMessage(e, `Não foi possível adicionar ao funil.`), 'error')
    } finally {
      setBusy(false)
    }
  }, [createRecord, announce, openConflict, toast])

  const handleChoice = useCallback(async (choice: ConflictChoice) => {
    if (!conflict) return
    const { target, existing } = conflict
    if (!existing) return
    const stages = target.pipeline.stages.slice().sort((a, b) => a.order - b.order)
    if (choice === 'create_another') {
      // O funil permite N abertos: nada a fechar nem mover — segue para a
      // criação normal. Em venda é o "Novo negócio" de 2 passos (A3), que é
      // onde o operador dá título e valor ao segundo negócio; sem isso, dois
      // negócios do mesmo contato nasceriam com o mesmo nome.
      setConflict(null)
      if (pipelineKindOf(target.pipeline) === 'sales') { setSalesTarget(target); return }
      setBusy(true)
      try {
        const res = await createRecord(target)
        announce(res.data, target)
      } catch (e: unknown) {
        toast(getApiErrorMessage(e, 'Não foi possível abrir outro registro.'), 'error')
      } finally {
        setBusy(false)
      }
      return
    }
    if (choice === 'open_existing') {
      setConflict(null)
      // B2 (SCRUM-928, F-FUNIL-14): abre A FICHA do registro existente, não
      // mais o board inteiro — "abrir o negócio existente" agora abre o
      // negócio, ponto.
      openDeal(existing.id)
      return
    }
    if (choice === 'move_to_first') {
      const first = stages.find((s) => !s.isWon && !s.isLost)
      if (!first) return
      setBusy(true)
      try {
        await dealsApi.moveStage(existing.id, first.id)
        setConflict(null)
        toast(`${target.contactName} voltou para ${first.label} em ${target.pipeline.name}.`, 'success', { label: 'Ver no board', onClick: () => navigate(boardHref(target.pipeline.id)) })
        onCreated?.(existing)
      } catch (e: unknown) {
        toast(getApiErrorMessage(e, 'Não foi possível mover o registro.'), 'error')
      } finally {
        setBusy(false)
      }
      return
    }
    // close_and_new → pede motivo (catálogo do funil) antes de fechar e recriar
    const lost = stages.find((s) => s.isLost) ?? null
    if (!lost) { toast('Este funil não tem etapa de cancelamento configurada.', 'error'); return }
    setConflict(null)
    setCloseTarget({ target, existing, stage: lost })
  }, [conflict, navigate, toast, onCreated, openDeal, createRecord, announce])

  const handleCloseAndNew = useCallback(async (input: CloseDealReasonInput) => {
    if (!closeTarget) return
    const { target, existing } = closeTarget
    await dealsApi.setStatus(existing.id, { status: input.outcome, closeReason: input.reason, closeNote: input.note })
    // O modal de motivo fecha sozinho ao resolver; a criação do novo vem em seguida.
    try {
      const res = await createRecord(target)
      announce(res.data, target)
    } catch (e: unknown) {
      toast(getApiErrorMessage(e, 'Registro anterior fechado, mas não foi possível abrir o novo.'), 'error')
    }
  }, [closeTarget, createRecord, announce, toast])

  const dialogs: ReactNode = (
    <>
      <PipelineConflictModal
        key={conflict?.openDealId ?? 'none'}
        open={!!conflict}
        onClose={() => setConflict(null)}
        contactName={conflict?.target.contactName ?? ''}
        pipeline={conflict?.target.pipeline ?? null}
        existing={conflict?.existing ?? null}
        busy={busy}
        onChoose={handleChoice}
      />
      <CloseDealReasonModal
        open={!!closeTarget}
        onClose={() => setCloseTarget(null)}
        deal={closeTarget?.existing ?? null}
        stage={closeTarget?.stage ?? null}
        pipeline={closeTarget?.target.pipeline ?? null}
        onConfirm={handleCloseAndNew}
      />
      {/* A3 (SCRUM-925): em funil de VENDA o gesto abre o "Novo negócio" de 2
          passos — mesma superfície de criação em todo o produto. Antes era o
          `DealModal`, que é o formulário de EDIÇÃO e não tem campo de valor. */}
      {salesTarget && (
        <NewDealDialog
          open
          contactId={salesTarget.contactId}
          contactName={salesTarget.contactName}
          pipelines={pipelines.length > 0 ? pipelines : [salesTarget.pipeline]}
          initialPipelineId={salesTarget.pipeline.id}
          originConversationId={salesTarget.conversationId ?? null}
          onClose={() => setSalesTarget(null)}
          onCreated={(deal) => {
            const t = salesTarget
            setSalesTarget(null)
            // O negócio criado volta INTEIRO do POST — o chamador recebe o
            // registro real (antes ia um esqueleto com `id: ''`, que impedia
            // qualquer leitura otimista de valor/etapa).
            announce(deal, t)
          }}
          onConflict={(info) => {
            const t = salesTarget
            setSalesTarget(null)
            void openConflict(t, info.openDealId)
          }}
        />
      )}
    </>
  )

  /**
   * A3 (SCRUM-925): o board cria negócio SEM passar por `requestAdd` — o
   * contato só é escolhido dentro do diálogo. Expor o conflito deixa esse
   * caminho reusar o mesmo modal de três saídas, em vez de nascer uma segunda
   * implementação (ou, pior, um erro cru).
   */
  const reportConflict = useCallback(
    (target: AddToPipelineTarget, openDealId: string) => { void openConflict(target, openDealId) },
    [openConflict],
  )

  return { requestAdd, requestAddDetailed, dialogs, busy, reportConflict }
}
