import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { campaignReportApi } from '@/services/campaignsV2Api'
import { withFallback } from '@/services/withFallback'
import { PendingDataCard } from './PendingDataCard'
import type { CampaignRecipient, CampaignRecipientStatus, CampaignRecipientsResponse } from '@/types/campaignsV2'

const VAZIO: CampaignRecipientsResponse = { data: [], total: 0, page: 1, limit: 25 }
const LIMITE = 25

type FiltroStatus = 'todos' | CampaignRecipientStatus

// Só os valores que `CampaignRecipientStatus` realmente tem. Não existe
// `replied` no enum da BE.1 (responder é `repliedAt`, não um status), então
// não há filtro "Responderam" aqui — oferecê-lo exigiria ou um cast para
// um valor que a API rejeita, ou filtrar no cliente uma lista paginada, que
// daria o resultado da página e não o do disparo. Um parâmetro `repliedOnly`
// na BE.1 resolve, e está registrado como candidato de Onda 2.
const OPCOES: { value: FiltroStatus; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'delivered', label: 'Entregues' },
  { value: 'read', label: 'Leram' },
  { value: 'failed', label: 'Falharam' },
]

const ROTULO_STATUS: Record<string, string> = {
  pending: 'Pendente',
  sent: 'Enviada',
  delivered: 'Entregue',
  read: 'Lida',
  failed: 'Falhou',
  cancelled: 'Cancelada',
}

interface ContactsTabProps {
  campaignId: string
  hasRecipientData: boolean
  /** Filtro inicial vindo da tabela de falhas ("Ver contatos" numa linha). */
  initialFailureCode?: string
  initialStatus?: FiltroStatus
}

/**
 * Lista de destinatários, paginada pela BE.1.
 *
 * **Não vem de `campaignsApi.getConversations`.** Aquele cliente
 * (`services/api.ts:1605`) aponta para `GET /campaigns/:id/conversations`, que
 * **não existe** no backend — o único `:id/conversations` do repositório é o de
 * contatos. O relatório antigo engolia o erro num `catch` vazio, e por isso
 * ninguém notou. Está registrado como achado no corpo do PR.
 */
export function ContactsTab({ campaignId, hasRecipientData, initialFailureCode, initialStatus }: ContactsTabProps) {
  const [status, setStatus] = useState<FiltroStatus>(initialStatus ?? (initialFailureCode ? 'failed' : 'todos'))
  const [page, setPage] = useState(1)
  const [resposta, setResposta] = useState<CampaignRecipientsResponse>(VAZIO)
  // Identifica a página pedida. `carregando` é DERIVADO da comparação com a
  // última carga liquidada, em vez de escrito no corpo do efeito: um
  // `setCarregando(true)` síncrono ali custa um render extra e é o que a regra
  // `react-hooks/set-state-in-effect` aponta.
  const chave = `${campaignId}#${status}#${page}`
  const [liquidado, setLiquidado] = useState<string | null>(null)
  const carregando = hasRecipientData && liquidado !== chave

  useEffect(() => {
    if (!hasRecipientData) return
    let cancelado = false

    withFallback(
      () =>
        campaignReportApi
          .getRecipients(campaignId, {
            page,
            limit: LIMITE,
            ...(status !== 'todos' ? { status: status as CampaignRecipientStatus } : {}),
          })
          .then((r) => r.data),
      VAZIO,
    )
      .then((r) => {
        if (cancelado) return
        setResposta(r.data)
        setLiquidado(chave)
      })
      .catch(() => {
        // `withFallback` já absorve o 404 de "rota ainda não existe"; o que
        // chega aqui é falha real. Marcar como liquidada mesmo assim, senão a
        // lista fica girando para sempre — os dados anteriores continuam de pé.
        if (!cancelado) setLiquidado(chave)
      })

    return () => {
      cancelado = true
    }
  }, [campaignId, status, page, hasRecipientData, chave])

  if (!hasRecipientData) {
    return <PendingDataCard what="A lista de contatos deste disparo" />
  }

  const totalPaginas = Math.max(1, Math.ceil(resposta.total / LIMITE))
  // O filtro por código de falha é aplicado no cliente: o contrato de
  // `getRecipients` tem `status`, não `errorCode`. Filtrar aqui vale para a
  // página carregada; refinar isso exige um parâmetro novo na BE.1 e está
  // registrado como candidato de Onda 2.
  const linhas = initialFailureCode
    ? resposta.data.filter((r) => r.errorCode === initialFailureCode)
    : resposta.data

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SegmentedControl<FiltroStatus>
          label="Filtrar contatos por situação"
          value={status}
          onChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
          options={OPCOES}
        />
        <span className="text-xs text-surface-400">
          {resposta.total.toLocaleString('pt-BR')} {resposta.total === 1 ? 'contato' : 'contatos'}
        </span>
      </div>

      <Card noPadding className="overflow-hidden">
        {carregando ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : linhas.length === 0 ? (
          <div className="py-8">
            <EmptyState icon={Users} title="Nenhum contato nesta seleção" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">Contatos do disparo</caption>
            <thead>
              <tr className="text-left text-xs text-surface-400 border-b border-surface-700">
                <th scope="col" className="px-4 py-2.5 font-medium">Contato</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Situação</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Resposta</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((r) => (
                <Linha key={r.id} recipient={r} />
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-xs text-surface-400">
            {page} de {totalPaginas}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= totalPaginas} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </Button>
        </div>
      )}
    </div>
  )
}

function Linha({ recipient }: { recipient: CampaignRecipient }) {
  return (
    <tr className="border-b border-surface-700/60 last:border-0">
      <td className="px-4 py-2.5 text-surface-100">{recipient.contactName}</td>
      <td className="px-4 py-2.5 text-surface-300">
        {ROTULO_STATUS[recipient.status] ?? recipient.status}
        {recipient.errorCode && <span className="text-surface-500"> · {recipient.errorCode}</span>}
      </td>
      <td className="px-4 py-2.5 text-surface-300 max-w-[40ch] truncate">{recipient.replyText ?? '—'}</td>
    </tr>
  )
}
