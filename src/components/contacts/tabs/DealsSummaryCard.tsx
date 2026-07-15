import { useState, useEffect, useCallback } from 'react'
import { Briefcase } from 'lucide-react'
import { dealsApi } from '@/services/api'
import { connectSocket } from '@/services/socket'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { formatBRL } from '@/utils/money'
import type { Deal } from '@/types'

/** Resumo dos negócios do contato (mostrado na Visão Geral). Detalhe fica na aba "Negócios". */
export function DealsSummaryCard({ contactId }: { contactId: string }) {
  const { vocab } = useTenantVocab()
  const [deals, setDeals] = useState<Deal[] | null>(null)

  const load = useCallback(() => {
    dealsApi
      .list(contactId)
      .then((r) => setDeals(Array.isArray(r.data) ? r.data : []))
      .catch(() => setDeals([]))
  }, [contactId])

  useEffect(() => {
    load()
  }, [load])

  // Realtime: recarrega quando um negócio deste contato muda em qualquer lugar (socket `deal:changed`).
  useEffect(() => {
    const socket = connectSocket()
    const onDealChanged = (p: { contactId?: string }) => {
      if (p?.contactId === contactId) load()
    }
    socket.on('deal:changed', onDealChanged)
    return () => {
      socket.off('deal:changed', onDealChanged)
    }
  }, [contactId, load])

  const list = deals ?? []
  const count = list.length
  const total = list.reduce((s, d) => s + d.amountCents, 0)
  const wonTotal = list.filter((d) => d.status === 'won').reduce((s, d) => s + d.amountCents, 0)
  const openCount = list.filter((d) => d.status === 'open').length

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Briefcase className="w-4 h-4 text-surface-400" />
        <h4 className="text-sm font-semibold text-surface-100">{vocab.deals}</h4>
      </div>
      {deals === null ? (
        <p className="text-xs text-surface-600">Carregando…</p>
      ) : count === 0 ? (
        <p className="text-xs text-surface-500">
          Nenhum {vocab.deal.toLowerCase()} ainda — adicione na aba {vocab.deals}.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-surface-600">Total</p>
            <p className="text-sm font-semibold text-surface-100 tabular-nums">{formatBRL(total)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-surface-600">Ganho</p>
            <p className="text-sm font-semibold text-emerald-300 tabular-nums">{formatBRL(wonTotal)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-surface-600">Em aberto</p>
            <p className="text-sm font-semibold text-surface-100 tabular-nums">
              {openCount} de {count}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
