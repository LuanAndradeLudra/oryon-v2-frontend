// ─── Operar um disparo: o que Agenda e Board fazem igual ───────────────────
// Extraído do `AgendaShell` quando o Board (D1b/SCRUM-1019) apareceu como
// segundo consumidor. Nada aqui é da agenda: é a superfície de OPERAÇÃO de uma
// campanha — a ponte da edição local, o ciclo de vida, as duas confirmações, o
// "Enviar agora" e o nome da linha. (O aviso de janela é o `WindowNotice`,
// ao lado, porque é componente puro e não precisa do hook.)
//
// O motivo de extrair em vez de duplicar: esta ponte já teve DOIS defeitos —
// o congelamento permanente (preferir sempre a cópia local) e um
// `serverCaughtUp` que comparava `status`. Em duas cópias, o terceiro defeito
// se conserta num lugar e continua vivo na tela ao lado.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import { campaignsApi } from '@/services/api'
import { showToast } from '@/hooks/useToast'
import { ConfirmModal } from '@/components/ui/Modal'
import { useCampaignLifecycle, type CampaignLifecycle } from './agenda/useCampaignLifecycle'
import type { Campaign } from '@/types'

/**
 * Idade máxima da cópia local de um cartão: um pouco mais que o poll ativo
 * (20 s), o bastante para cobrir o vão entre o clique e a leitura seguinte.
 * É a rede para um backend sem `updatedAt`; com ele a ponte solta antes.
 */
const LOCAL_EDIT_TTL_MS = 30_000

interface LocalEdit { campaign: Campaign; at: number }

/**
 * A resposta do servidor já alcançou a edição local? Só o carimbo responde.
 * `updatedAt` vem no fio (do `BaseEntity` do backend) mas NÃO está no tipo
 * congelado — daí a leitura defensiva. Sem os dois carimbos a resposta é NÃO e
 * quem solta a ponte é o TTL.
 *
 * Comparar `status` seria tentador e está errado: ele diverge nas DUAS direções
 * — servidor que ainda não soube da pausa (segurar) e servidor que já passou à
 * frente (soltar). O mesmo sinal para as duas não decide nada; foi o teste que
 * provou isso, quebrando a ponte logo no primeiro poll.
 */
function serverCaughtUp(fromServer: Campaign, edit: LocalEdit): boolean {
  const stampOf = (c: Campaign) => {
    const raw = (c as { updatedAt?: unknown }).updatedAt
    const t = typeof raw === 'string' ? Date.parse(raw) : NaN
    return Number.isNaN(t) ? null : t
  }
  const servidor = stampOf(fromServer)
  const local = stampOf(edit.campaign)
  return servidor !== null && local !== null && servidor >= local
}

export interface CampaignOperations {
  /** As campanhas do servidor com a edição local por cima, enquanto ela vale. */
  merged: Campaign[]
  lifecycle: CampaignLifecycle
  /** Rótulo da linha de WhatsApp; `undefined` quando não resolve. */
  lineNameOf: (c: Campaign) => string | undefined
  sendingNowId: string | null
  requestCancel: (c: Campaign) => void
  requestDelete: (c: Campaign) => void
  sendNow: (c: Campaign) => void
  /**
   * Os dois `ConfirmModal`, SEPARADOS de propósito. Vinham num nó só, e o
   * Board renderizava os dois sem ter gatilho para nenhum — dois modais
   * montados e inalcançáveis. Separando, cada tela monta o que ela realmente
   * alcança, e "esqueci de ligar o gatilho" vira uma variável não usada em vez
   * de UI morta que ninguém vê.
   */
  cancelConfirmation: ReactNode
  deleteConfirmation: ReactNode
}

export function useCampaignOperations(
  campaigns: Campaign[],
  refresh: () => void,
): CampaignOperations {
  const { numbers } = useWorkspaceNumber()

  const [cancelTarget, setCancelTarget] = useState<Campaign | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null)
  const [sendingNowId, setSendingNowId] = useState<string | null>(null)
  const [localEdits, setLocalEdits] = useState<Map<string, LocalEdit>>(new Map())

  // Resposta de pause/resume/cancel chega antes do próximo poll — aplicar
  // localmente evita a tela "voltar" por até 20 s depois de um clique.
  //
  // É uma PONTE de UM intervalo, e expira: preferir sempre a cópia local
  // congelaria o cartão pelo resto da sessão — pausar, o disparo terminar no
  // servidor (`sent`, 100/100) e o cartão seguir oferecendo "Retomar" com a
  // barra travada em 40/100, sem refresh que resolva. Solta por idade e assim
  // que o servidor traz registro pelo menos tão novo quanto ela.
  const merged = useMemo(
    () => campaigns.map((c) => localEdits.get(c.id)?.campaign ?? c),
    [campaigns, localEdits],
  )

  const applyLocal = useCallback((updated: Campaign) => {
    setLocalEdits((prev) => new Map(prev).set(updated.id, { campaign: updated, at: Date.now() }))
  }, [])

  // A cada chegada do poll, joga fora o que a resposta do servidor já alcançou.
  useEffect(() => {
    setLocalEdits((prev) => {
      if (prev.size === 0) return prev
      const next = new Map(prev)
      const agora = Date.now()
      for (const c of campaigns) {
        const edit = next.get(c.id)
        if (!edit) continue
        if (agora - edit.at > LOCAL_EDIT_TTL_MS || serverCaughtUp(c, edit)) next.delete(c.id)
      }
      return next.size === prev.size ? prev : next
    })
  }, [campaigns])

  const lifecycle = useCampaignLifecycle(applyLocal)

  const lineNameOf = useCallback(
    (c: Campaign) => {
      const line = numbers.find((n) => n.id === c.whatsappNumberId)
      return line ? (line.label || line.displayPhoneNumber) : undefined
    },
    [numbers],
  )

  // "Enviar agora" dispara mensagem de verdade: erro invisível aqui é o pior
  // dos quatro, porque a tela não muda de expressão e convida ao segundo
  // clique. (Os três do ciclo de vida já avisam por conta própria.)
  const sendNow = useCallback(async (c: Campaign) => {
    setSendingNowId(c.id)
    try {
      const res = await campaignsApi.send(c.id)
      applyLocal(res.data)
    } catch {
      showToast(`Não deu para enviar "${c.name}" agora. Nenhuma mensagem saiu.`, 'error')
    } finally {
      setSendingNowId(null)
    }
  }, [applyLocal])

  const confirmCancel = useCallback(async () => {
    if (!cancelTarget) return
    await lifecycle.run('cancel', cancelTarget.id)
    setCancelTarget(null)
  }, [cancelTarget, lifecycle])

  // `ConfirmModal` tipa `onConfirm` como `() => void` e DESCARTA a promessa:
  // sem o catch, o modal ficaria aberto sem explicação nenhuma.
  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await campaignsApi.delete(deleteTarget.id)
      refresh()
    } catch {
      showToast(`Não deu para excluir "${deleteTarget.name}". O rascunho continua aí.`, 'error')
    } finally {
      setDeleteTarget(null)
    }
  }, [deleteTarget, refresh])

  const cancelConfirmation = (
    <ConfirmModal
      open={cancelTarget !== null}
      onClose={() => setCancelTarget(null)}
      onConfirm={confirmCancel}
      title="Cancelar disparo"
      description={`"${cancelTarget?.name ?? ''}" para de enviar e não pode ser retomado. Os contatos que ainda não receberam não vão receber.`}
      confirmLabel="Cancelar disparo"
      danger
      loading={lifecycle.busy === cancelTarget?.id}
    />
  )

  const deleteConfirmation = (
    <ConfirmModal
      open={deleteTarget !== null}
      onClose={() => setDeleteTarget(null)}
      onConfirm={confirmDelete}
      title="Excluir rascunho"
      description={`"${deleteTarget?.name ?? ''}" será apagado. Não dá para desfazer.`}
      confirmLabel="Excluir"
      danger
    />
  )

  return {
    merged,
    lifecycle,
    lineNameOf,
    sendingNowId,
    requestCancel: setCancelTarget,
    requestDelete: setDeleteTarget,
    sendNow,
    cancelConfirmation,
    deleteConfirmation,
  }
}
