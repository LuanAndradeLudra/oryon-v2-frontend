import { useState, useEffect, useCallback } from 'react'
import { Briefcase, Plus } from 'lucide-react'
import { dealsApi } from '@/services/api'
import { DealModal } from '@/components/contacts/DealModal'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { formatBRL } from '@/utils/money'
import { cn } from '@/lib/utils'
import type { Deal } from '@/types'

const STATUS_META: Record<Deal['status'], { label: string; cls: string }> = {
  open: { label: 'Aberto', cls: 'text-amber-300 bg-amber-500/10 border-amber-500/25' },
  won: { label: 'Ganho', cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25' },
  lost: { label: 'Perdido', cls: 'text-red-300 bg-red-500/10 border-red-500/25' },
}

/**
 * Seção "Negócios" no painel do contato dentro de Conversas — gestão inline
 * (ver/criar/editar/ganhar/perder sem sair do atendimento), reusando o DealModal
 * da Fase 1.5. Ao salvar, dispara `oryon:activity-invalidate` para a
 * "HISTÓRICO DA CONVERSA" recarregar e mostrar o evento de negócio recém-criado.
 */
export function ContactPanelDeals({
  contactId,
  conversationId,
}: {
  contactId: string
  conversationId: string
}) {
  const { vocab } = useTenantVocab()
  const [deals, setDeals] = useState<Deal[] | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editDeal, setEditDeal] = useState<Deal | null>(null)

  const load = useCallback(() => {
    dealsApi
      .list(contactId)
      .then((r) => setDeals(Array.isArray(r.data) ? r.data : []))
      .catch(() => setDeals([]))
  }, [contactId])

  useEffect(() => {
    load()
  }, [load])

  const list = deals ?? []
  const count = list.length
  const openCents = list.filter((d) => d.status === 'open').reduce((s, d) => s + d.amountCents, 0)
  const wonCents = list.filter((d) => d.status === 'won').reduce((s, d) => s + d.amountCents, 0)

  const handleSaved = () => {
    setModalOpen(false)
    setEditDeal(null)
    load()
    // Recarrega a "HISTÓRICO DA CONVERSA" para o evento de negócio aparecer na hora.
    window.dispatchEvent(
      new CustomEvent('oryon:activity-invalidate', { detail: { conversationId } }),
    )
  }

  return (
    <div className="px-4 py-3 border-b border-surface-800">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-surface-500 uppercase tracking-wide font-semibold flex items-center gap-1.5">
          <Briefcase className="w-3 h-3" /> {vocab.deals}
        </p>
        <button
          onClick={() => {
            setEditDeal(null)
            setModalOpen(true)
          }}
          className="flex items-center gap-1 text-[10px] text-brand-400 hover:text-brand-300 font-medium transition-colors"
        >
          <Plus className="w-3 h-3" /> Novo
        </button>
      </div>

      {deals === null ? (
        <p className="text-xs text-surface-600">Carregando…</p>
      ) : count === 0 ? (
        <p className="text-xs text-surface-600">
          Nenhum {vocab.deal.toLowerCase()} ainda — clique em "Novo" para criar.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="bg-surface-800/60 border border-surface-700/50 rounded-lg px-2.5 py-1.5">
              <p className="text-[9px] text-surface-500 uppercase tracking-wide">Em aberto</p>
              <p className="text-sm font-semibold text-surface-100 tabular-nums">{formatBRL(openCents)}</p>
            </div>
            <div className="bg-surface-800/60 border border-surface-700/50 rounded-lg px-2.5 py-1.5">
              <p className="text-[9px] text-surface-500 uppercase tracking-wide">Ganho</p>
              <p className="text-sm font-semibold text-emerald-300 tabular-nums">{formatBRL(wonCents)}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {list.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  setEditDeal(d)
                  setModalOpen(true)
                }}
                className="w-full flex items-center gap-2.5 bg-surface-800/40 hover:bg-surface-800 border border-surface-700/40 rounded-lg px-2.5 py-2 text-left transition-colors"
              >
                <Briefcase className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-surface-200 truncate">{d.title}</p>
                  <span
                    className={cn(
                      'inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full border',
                      STATUS_META[d.status].cls,
                    )}
                  >
                    {STATUS_META[d.status].label}
                  </span>
                </div>
                <span className="text-xs text-surface-200 tabular-nums flex-shrink-0">
                  {formatBRL(d.amountCents)}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <DealModal
        open={modalOpen}
        contactId={contactId}
        editDeal={editDeal}
        onClose={() => {
          setModalOpen(false)
          setEditDeal(null)
        }}
        onSaved={handleSaved}
      />
    </div>
  )
}
