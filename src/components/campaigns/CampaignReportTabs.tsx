// T2 (release 2026-09-29) — abas "Destinatários" e "Respostas" do relatório
// de campanha, sobre `GET /campaigns/:id/recipients` e `analytics.replies`.
import { useEffect, useState } from 'react'
import { MessageCircle, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useEstadoNaUrl, lerUmDe, lerPaginaUrl, escreverPaginaUrl } from '@/hooks/useEstadoNaUrl'
import { campaignsApi } from '@/services/api'
import type {
  CampaignExcludedRow, CampaignFailureReason, CampaignRecipientRow, CampaignRecipientStatus, CampaignReply,
} from '@/types'

type Filtro = 'all' | CampaignRecipientStatus | 'excluded'

const FILTROS: Array<{ value: Filtro; label: string }> = [
  { value: 'all',       label: 'Todos' },
  { value: 'delivered', label: 'Entregues' },
  { value: 'read',      label: 'Lidas' },
  { value: 'failed',    label: 'Falhas' },
  { value: 'pending',   label: 'Pendentes' },
  { value: 'excluded',  label: 'Excluídos' },
]
const lerFiltro = lerUmDe(['all', 'pending', 'sent', 'delivered', 'read', 'failed', 'cancelled', 'excluded'] as const, 'all')

const STATUS_LABEL: Record<CampaignRecipientStatus, string> = {
  pending: 'Pendente', sent: 'Enviada', delivered: 'Entregue', read: 'Lida', failed: 'Falhou', cancelled: 'Cancelada',
}
const STATUS_COLOR: Record<CampaignRecipientStatus, string> = {
  pending: 'text-surface-400', sent: 'text-surface-300', delivered: 'text-[var(--color-accent-cyan)]',
  read: 'text-[var(--color-accent-amber)]', failed: 'text-danger', cancelled: 'text-surface-500',
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

const POR_PAGINA = 50

export function RecipientsTab({ campaignId, failures }: { campaignId: string; failures: CampaignFailureReason[] }) {
  const [filtro, setFiltro] = useEstadoNaUrl<Filtro>('destinatarios', { padrao: 'all', ler: lerFiltro, resetar: ['destPagina'] })
  const [pagina, setPagina] = useEstadoNaUrl<number>('destPagina', { padrao: 1, ler: lerPaginaUrl, escrever: escreverPaginaUrl })
  const [rows, setRows] = useState<Array<CampaignRecipientRow | CampaignExcludedRow>>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const motivo = new Map(failures.map((f) => [f.code, f.reason]))

  useEffect(() => {
    let vivo = true
    setLoading(true)
    setErro(false)
    campaignsApi.getRecipients(campaignId, filtro === 'all' ? undefined : filtro, pagina, POR_PAGINA)
      .then((r) => { if (vivo) { setRows(r.data.data ?? []); setTotal(r.data.total ?? 0) } })
      .catch(() => { if (vivo) { setRows([]); setTotal(0); setErro(true) } })
      .finally(() => { if (vivo) setLoading(false) })
    return () => { vivo = false }
  }, [campaignId, filtro, pagina])

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar destinatários">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFiltro(f.value)}
            aria-pressed={filtro === f.value}
            className={cn(
              'px-2.5 py-1 rounded-sm text-2xs font-medium border transition-colors',
              filtro === f.value ? 'bg-surface-800 border-surface-600 text-surface-100' : 'border-surface-700 text-surface-400 hover:text-surface-200',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtro === 'excluded' && (
        <p className="text-2xs text-surface-500">
          Contatos do público que ficam fora do envio (número inválido ou saíram de marketing). A lista mostra a situação
          atual de cada contato; não entram na base de nenhum percentual.
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-xs text-surface-500"><Spinner className="w-4 h-4" /> Carregando…</div>
      ) : erro ? (
        <p className="text-xs text-danger py-6 text-center">Não foi possível carregar os destinatários.</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum destinatário neste filtro" />
      ) : (
        <div className="border border-surface-700 rounded-lg divide-y divide-surface-700 overflow-hidden">
          {rows.map((r) => 'reason' in r ? (
            <div key={r.contactId} className="flex items-center gap-3 px-3 py-2">
              <p className="flex-1 min-w-0 text-xs text-surface-200 truncate">{r.contactName ?? '—'}</p>
              <span className="text-2xs text-surface-400 flex-shrink-0">
                {r.reason === 'invalid_number' ? 'Número inválido' : 'Saiu de marketing'}{r.since ? ` · desde ${fmt(r.since)}` : ''}
              </span>
            </div>
          ) : (
            <div key={r.id} className="flex items-center gap-3 px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-surface-200 truncate">{r.contactName ?? '—'}</p>
                {r.status === 'failed' && r.errorCode && (
                  <p className="text-3xs text-surface-500 truncate" title={`Código ${r.errorCode}`}>{motivo.get(r.errorCode) ?? `Código ${r.errorCode}`}</p>
                )}
              </div>
              {/* R3: resposta prova entrega — em `sent` com resposta, "Respondeu". */}
              {r.status === 'sent' && r.replyText
                ? <span className={cn('text-2xs font-semibold flex-shrink-0', STATUS_COLOR.delivered)}>Respondeu</span>
                : <span className={cn('text-2xs font-semibold flex-shrink-0', STATUS_COLOR[r.status])}>{STATUS_LABEL[r.status]}</span>}
              <span className="text-3xs text-surface-500 w-24 text-right flex-shrink-0">
                {fmt(r.readAt ?? r.deliveredAt ?? r.failedAt ?? r.sentAt)}
              </span>
            </div>
          ))}
        </div>
      )}

      {paginas > 1 && (
        <div className="flex items-center justify-between text-2xs text-surface-400">
          <span>{total} destinatários</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)} className="px-2 py-1 rounded-sm border border-surface-700 disabled:opacity-40">Anterior</button>
            <span>{pagina} de {paginas}</span>
            <button type="button" disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)} className="px-2 py-1 rounded-sm border border-surface-700 disabled:opacity-40">Próxima</button>
          </div>
        </div>
      )}
    </div>
  )
}

export function RepliesTab({ replies }: { replies: CampaignReply[] }) {
  if (replies.length === 0) {
    return <EmptyState icon={MessageCircle} title="Ninguém respondeu ainda" hint="As respostas aparecem aqui assim que chegam." />
  }
  return (
    <div className="space-y-2">
      {replies.length >= 100 && <p className="text-2xs text-surface-500">Mostrando as 100 respostas mais recentes.</p>}
      <div className="border border-surface-700 rounded-lg divide-y divide-surface-700 overflow-hidden">
        {replies.map((r, i) => (
          <div key={`${r.contactId}-${i}`} className="px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-surface-200 truncate">{r.name ?? '—'}</p>
              <span className="text-3xs text-surface-500 flex-shrink-0">{fmt(r.at)}</span>
            </div>
            {r.text && <p className="text-2xs text-surface-400 mt-0.5 line-clamp-2">{r.text}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
